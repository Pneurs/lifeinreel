

The user is asking whether applying filters AFTER recording (post-processing per clip) is also tricky, as an alternative to the live-preview approach I proposed.

Let me think through this:

**Post-recording filter approach:**
- User records normally (no filter pipeline during capture)
- After recording, in the preview/save step, user picks a filter
- Filter is applied to the saved clip before upload

**How to bake filter into recorded clip without FFmpeg:**
1. Load recorded blob into a `<video>` element
2. Play it through, drawing each frame to a `<canvas>` with `ctx.filter` applied
3. Use `MediaRecorder` on `canvas.captureStream()` + original audio track to record a new filtered clip
4. Replace the original blob with the filtered one before upload

This is actually **simpler and safer** than the live-preview approach because:
- Recording itself stays unchanged (no risk of breaking iOS recording reliability — which our memory says is already fragile)
- No real-time canvas pipeline during capture (saves battery/CPU during recording)
- User can preview filters and pick the best one (better UX — try before commit)
- If filter processing fails, we still have the original clip as fallback

**Trade-offs:**
- Adds ~2-4s processing time after recording (real-time playback through canvas)
- Slightly delays the save flow

**Verdict:** Post-recording is actually **less tricky** than live-preview-and-bake. Better fit for this app.

Plan should be concise — present this approach clearly.

## Apply Filters After Recording (Per Clip)

### Short Answer

**It's actually easier and safer than live filters.** Recording stays untouched (important since iOS recording is already fragile in this app), and users get to preview filters before committing.

### How It Works

1. User records normally — no changes to capture pipeline
2. In the post-record preview screen (where they currently see the 2x sped-up clip), a horizontal filter strip appears below the preview
3. Tapping a filter applies it instantly via CSS to the preview `<video>`
4. When user taps "Save", we "bake" the chosen filter into the clip before upload
5. Original clip is kept as fallback if baking fails

### Filter Baking (No FFmpeg, No Libraries)

```text
recorded blob → <video> element
            ↓ (play through once, ~2s)
       <canvas> with ctx.filter = "brightness(1.1) saturate(1.3)"
            ↓
   canvas.captureStream() + original audio track
            ↓
       MediaRecorder → filtered blob → upload
```

Adds **2-4 seconds** to the save flow (real-time playthrough). No new dependencies.

### Filters Offered

Same set as before: Normal, Bright, Warm, Cool, Vivid, Fade, B&W — all pure CSS filter strings.

### Files to Change

1. **Create `src/components/record/FilterStrip.tsx`** — horizontal scrollable filter selector with circular previews
2. **Create `src/lib/clip-filter.ts`** — `applyFilterToClip(blob, filterCss): Promise<Blob>` using the canvas pipeline above
3. **Update `src/pages/Record.tsx`** — show filter strip on the post-record preview, apply CSS to preview video, run baking before upload on save
4. **Update `src/hooks/useVideoRecording.ts`** — accept optional filter param in the save handler

### Why This Beats Live Filters

| | Live (during recording) | Post-record (this plan) |
|---|---|---|
| Recording reliability | Risk — changes capture pipeline | Untouched — zero risk |
| Battery during capture | Higher (canvas runs while recording) | Same as today |
| Try before commit | No — locked in | Yes — preview each filter |
| Implementation risk | Higher (iOS quirks) | Low |
| Save delay | None | +2-4s |

The small save delay is a fair trade for not destabilizing recording.

