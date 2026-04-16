import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOTSTACK_ENV = Deno.env.get('SHOTSTACK_ENV') || 'stage';
const SHOTSTACK_BASE = `https://api.shotstack.io/${SHOTSTACK_ENV}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOTSTACK_API_KEY = Deno.env.get('SHOTSTACK_API_KEY');
    if (!SHOTSTACK_API_KEY) throw new Error('SHOTSTACK_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate user
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clipUrls, clipDayNumbers, title, journeyId, duration, clipCount, soundtrackUrl } = await req.json();

    if (!clipUrls || !Array.isArray(clipUrls) || clipUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'No clips provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build Shotstack timeline
    const CLIP_DURATION = 2;
    const totalDuration = clipUrls.length * CLIP_DURATION;

    const videoClips = clipUrls.map((url: string, i: number) => ({
      asset: { type: 'video', src: url, volume: soundtrackUrl ? 0 : 1 },
      start: i * CLIP_DURATION,
      length: CLIP_DURATION,
    }));

    // Build overlay track for day labels
    const overlayClips: any[] = [];
    if (clipDayNumbers && Array.isArray(clipDayNumbers)) {
      clipDayNumbers.forEach((dayNum: number | null, i: number) => {
        if (dayNum != null) {
          overlayClips.push({
            asset: {
              type: 'title',
              text: `Day ${dayNum}`,
              style: 'chunk',
              size: 'small',
              color: '#ffffff',
              background: '#e67e22',
              position: 'bottom',
              offset: { y: 0.05 },
            },
            start: i * CLIP_DURATION,
            length: CLIP_DURATION,
          });
        }
      });
    }

    const tracks: any[] = [];
    if (overlayClips.length > 0) {
      tracks.push({ clips: overlayClips });
    }
    tracks.push({ clips: videoClips });

    const timeline: any = { tracks };

    // Add soundtrack if provided — use soundtrack with fadeOut
    // Shotstack's soundtrack automatically trims to video length
    // For looping: we repeat the audio asset on a dedicated audio track
    if (soundtrackUrl && typeof soundtrackUrl === 'string') {
      // Get the track duration from the request (or estimate from metadata)
      // We'll use the soundtrack property for simple cases and an audio track for looping
      const musicDurationSec = duration || totalDuration;
      
      // Build repeating audio clips to cover the full video duration
      // Each audio clip plays the full track, positioned sequentially
      // We estimate a reasonable track length (90s default) and repeat as needed
      const estimatedTrackLength = 90; // seconds - safe default
      const audioClips: any[] = [];
      let audioStart = 0;
      
      while (audioStart < totalDuration) {
        const remaining = totalDuration - audioStart;
        audioClips.push({
          asset: { type: 'audio', src: soundtrackUrl, volume: 1 },
          start: audioStart,
          length: Math.min(estimatedTrackLength, remaining),
        });
        audioStart += estimatedTrackLength;
      }
      
      // Add audio track at the bottom (plays behind everything)
      tracks.push({ clips: audioClips });
      
      // Also add fadeOut effect via soundtrack for clean ending
      timeline.soundtrack = {
        src: soundtrackUrl,
        effect: 'fadeOut',
      };
      
      console.log(`[compile-video] Adding soundtrack with looping: ${soundtrackUrl}, video duration: ${totalDuration}s`);
    }

    const renderBody = {
      timeline,
      output: {
        format: 'mp4',
        size: { width: 720, height: 1280 },
        fps: 30,
      },
    };

    console.log(`[compile-video] Submitting ${clipUrls.length} clips to Shotstack (${SHOTSTACK_ENV})`);

    // Create job record
    const { data: job, error: dbError } = await supabase
      .from('compilation_jobs')
      .insert({
        user_id: user.id,
        status: 'processing',
        clip_urls: clipUrls,
        clip_day_numbers: clipDayNumbers || [],
        title: title || 'Compilation',
        journey_id: journeyId || null,
        clip_count: clipCount || clipUrls.length,
        duration: duration || clipUrls.length * CLIP_DURATION,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[compile-video] DB error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Process in background
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          const renderRes = await fetch(`${SHOTSTACK_BASE}/render`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': SHOTSTACK_API_KEY,
            },
            body: JSON.stringify(renderBody),
          });

          const renderData = await renderRes.json();

          if (!renderRes.ok) {
            console.error('[compile-video] Shotstack error:', JSON.stringify(renderData));
            await supabase
              .from('compilation_jobs')
              .update({ status: 'failed', error_message: `Shotstack API error: ${renderData?.response?.message || renderRes.statusText}` })
              .eq('id', job.id);
            return;
          }

          const renderId = renderData?.response?.id;
          console.log(`[compile-video] Render submitted: ${renderId}`);

          await supabase
            .from('compilation_jobs')
            .update({ render_id: renderId })
            .eq('id', job.id);
        } catch (err) {
          console.error('[compile-video] Background error:', err);
          await supabase
            .from('compilation_jobs')
            .update({ status: 'failed', error_message: err instanceof Error ? err.message : 'Unknown error' })
            .eq('id', job.id);
        }
      })()
    );

    return new Response(JSON.stringify({
      jobId: job.id,
      status: 'processing',
      message: 'Compilation started in the cloud!',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[compile-video] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Compilation failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
