import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOTSTACK_ENV = Deno.env.get("SHOTSTACK_ENV") || "stage";
const SHOTSTACK_BASE = `https://api.shotstack.io/${SHOTSTACK_ENV}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");
    if (!SHOTSTACK_API_KEY) throw new Error("SHOTSTACK_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate user
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      clipUrls,
      clipDayNumbers,
      title,
      journeyId,
      duration,
      clipCount,
      soundtrackUrl,
    } = await req.json();

    if (!clipUrls || !Array.isArray(clipUrls) || clipUrls.length === 0) {
      return new Response(JSON.stringify({ error: "No clips provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Shotstack timeline
    const CLIP_DURATION = 2;
    const OUTPUT_SIZE = { width: 720, height: 1280 };
    const totalDuration = clipUrls.length * CLIP_DURATION;

    const videoClips = clipUrls.map((url: string, i: number) => ({
      asset: { type: "video", src: url, volume: soundtrackUrl ? 0 : 1 },
      start: i * CLIP_DURATION,
      length: CLIP_DURATION,
    }));

    // Build overlay track for day labels using SVG-as-image overlay.
    // Shotstack rejects data: URIs, so we upload each unique badge SVG to the
    // public `compilations` bucket and reference it by https URL.
    // Render badge as a tight SVG. Output frame is 720x1280; we want the
    // pill to be ~28% of the frame width with text that fills the pill.
    const buildBadgeSvg = (dayNum: number): string => {
      const text = `Day ${dayNum}`;
      // Use a viewBox sized to the actual content so text fills the pill.
      const fontSize = 80;
      const charW = fontSize * 0.45; // Caveat is narrow
      const padX = 28;
      const padY = 10;
      const textW = Math.round(text.length * charW);
      const width = textW + padX * 2;
      const height = fontSize + padY * 2;
      const rx = height / 2;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&amp;display=swap');
      .t { font-family: 'Caveat', 'Comic Sans MS', cursive; font-weight: 700; font-size: ${fontSize}px; fill: #ffffff; }
    </style>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" rx="${rx}" ry="${rx}" fill="#e67e22"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="t">${text}</text>
</svg>`;
    };

    // Upload unique badges to storage and cache their public URLs by day number
    const badgeUrlByDay = new Map<number, string>();
    if (clipDayNumbers && Array.isArray(clipDayNumbers)) {
      const uniqueDays = Array.from(
        new Set(
          clipDayNumbers.filter((d: number | null): d is number => d != null),
        ),
      );
      await Promise.all(uniqueDays.map(async (dayNum) => {
        const svg = buildBadgeSvg(dayNum);
        const path = `badges/day-${dayNum}-${user.id}-${Date.now()}.svg`;
        const { error: upErr } = await supabase.storage
          .from("compilations")
          .upload(path, new Blob([svg], { type: "image/svg+xml" }), {
            contentType: "image/svg+xml",
            upsert: true,
          });
        if (upErr) {
          console.error(`[compile-video] Badge upload failed for day ${dayNum}:`, upErr);
          return;
        }
        const { data: pub } = supabase.storage
          .from("compilations")
          .getPublicUrl(path);
        if (pub?.publicUrl) badgeUrlByDay.set(dayNum, pub.publicUrl);
      }));
    }

    const overlayClips: any[] = [];
    if (clipDayNumbers && Array.isArray(clipDayNumbers)) {
      clipDayNumbers.forEach((dayNum: number | null, i: number) => {
        if (dayNum != null) {
          const src = badgeUrlByDay.get(dayNum);
          if (!src) return;
          overlayClips.push({
            asset: {
              type: "image",
              src,
            },
            start: i * CLIP_DURATION,
            length: CLIP_DURATION,
            position: "bottom",
            offset: { y: 0.2 },
            fit: "none",
            scale: 1,
          });
        }
      });
    }

    // Overlay track must come BEFORE video track so it renders on top
    const tracks: any[] = [];
    if (overlayClips.length > 0) {
      tracks.push({ clips: overlayClips });
    }
    tracks.push({ clips: videoClips });

    const timeline: any = { tracks };

    // Add soundtrack if provided
    // Use audio track clips for looping support (repeats when video > track length)
    // Shotstack's soundtrack property doesn't loop, so we manually tile audio clips
    if (soundtrackUrl && typeof soundtrackUrl === "string") {
      const estimatedTrackLength = 90; // seconds - safe default for most tracks
      const audioClips: any[] = [];
      let audioStart = 0;

      while (audioStart < totalDuration) {
        const remaining = totalDuration - audioStart;
        const isLast = remaining <= estimatedTrackLength;
        audioClips.push({
          asset: {
            type: "audio",
            src: soundtrackUrl,
            volume: 1,
            ...(isLast ? { effect: "fadeOut" } : {}),
          },
          start: audioStart,
          length: Math.min(estimatedTrackLength, remaining),
        });
        audioStart += estimatedTrackLength;
      }

      // Add audio track at the bottom (plays behind video)
      tracks.push({ clips: audioClips });

      console.log(
        `[compile-video] Adding soundtrack with looping: ${soundtrackUrl}, video duration: ${totalDuration}s, audio segments: ${audioClips.length}`,
      );
    }

    const renderBody = {
      timeline,
      output: {
        format: "mp4",
        size: OUTPUT_SIZE,
        fps: 30,
      },
    };

    console.log(
      `[compile-video] Submitting ${clipUrls.length} clips to Shotstack (${SHOTSTACK_ENV})`,
    );

    // Create job record
    const { data: job, error: dbError } = await supabase
      .from("compilation_jobs")
      .insert({
        user_id: user.id,
        status: "processing",
        clip_urls: clipUrls,
        clip_day_numbers: clipDayNumbers || [],
        title: title || "Compilation",
        journey_id: journeyId || null,
        clip_count: clipCount || clipUrls.length,
        duration: duration || clipUrls.length * CLIP_DURATION,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[compile-video] DB error:", dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Process in background
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          const renderRes = await fetch(`${SHOTSTACK_BASE}/render`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": SHOTSTACK_API_KEY,
            },
            body: JSON.stringify(renderBody),
          });

          const renderData = await renderRes.json();

          if (!renderRes.ok) {
            console.error(
              "[compile-video] Shotstack error:",
              JSON.stringify(renderData),
            );
            await supabase
              .from("compilation_jobs")
              .update({
                status: "failed",
                error_message: `Shotstack API error: ${
                  renderData?.response?.message || renderRes.statusText
                }`,
              })
              .eq("id", job.id);
            return;
          }

          const renderId = renderData?.response?.id;
          console.log(`[compile-video] Render submitted: ${renderId}`);

          await supabase
            .from("compilation_jobs")
            .update({ render_id: renderId })
            .eq("id", job.id);
        } catch (err) {
          console.error("[compile-video] Background error:", err);
          await supabase
            .from("compilation_jobs")
            .update({
              status: "failed",
              error_message: err instanceof Error
                ? err.message
                : "Unknown error",
            })
            .eq("id", job.id);
        }
      })(),
    );

    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: "processing",
        message: "Compilation started in the cloud!",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[compile-video] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Compilation failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
