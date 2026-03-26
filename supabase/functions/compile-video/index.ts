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

    const { clipUrls, clipDayNumbers, title, journeyId, duration, clipCount } = await req.json();

    if (!clipUrls || !Array.isArray(clipUrls) || clipUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'No clips provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build Shotstack timeline
    // Each clip is ~2 seconds (standardized at recording time)
    const CLIP_DURATION = 2;

    const videoClips = clipUrls.map((url: string, i: number) => ({
      asset: { type: 'video', src: url, volume: 1 },
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
              type: 'html',
              html: `<p style="font-family:'Helvetica Neue',sans-serif;font-size:36px;font-weight:bold;color:white;background:rgba(230,126,34,0.85);padding:6px 20px;border-radius:10px;text-align:center;">Day ${dayNum}</p>`,
              width: 300,
              height: 60,
            },
            start: i * CLIP_DURATION,
            length: CLIP_DURATION,
            position: 'bottom',
            offset: { y: -0.15 },
          });
        }
      });
    }

    const tracks: any[] = [];
    if (overlayClips.length > 0) {
      tracks.push({ clips: overlayClips });
    }
    tracks.push({ clips: videoClips });

    const renderBody = {
      timeline: {
        tracks,
      },
      output: {
        format: 'mp4',
        resolution: 'hd',
        fps: 30,
      },
    };

    console.log(`[compile-video] Submitting ${clipUrls.length} clips to Shotstack (${SHOTSTACK_ENV})`);

    // Create job record first so we can return immediately
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

    // Use EdgeRuntime.waitUntil to process in background
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
