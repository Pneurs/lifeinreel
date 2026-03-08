

## Plan: Capture 5 seconds, speed up to ~2 seconds

**What changes:** Users will record up to 5 seconds of video. After recording, the video is sped up (2.5x) client-side to produce a ~2 second clip before saving.

### Approach

Use the browser's `<canvas>` + `MediaRecorder` to re-encode the recorded video at 2.5x speed before uploading. This keeps the fast-forward processing entirely client-side with no new dependencies.

### Changes

**1. `src/hooks/useVideoRecording.ts`**
- Change `maxDuration` default from `2` to `5`, `minDuration` from `1` to `2`
- After recording stops (`onstop` handler), add a speed-up processing step:
  - Create an off-screen `<video>` element with the raw blob
  - Set `playbackRate = 2.5`
  - Render each frame to a `<canvas>` using `requestAnimationFrame`
  - Capture the canvas stream with `MediaRecorder` to produce the sped-up blob
  - The audio will be discarded during speed-up (sped-up audio sounds unnatural)
- Add a new `isProcessing` state so the UI can show a processing indicator
- The final saved `duration` in the DB will be the actual sped-up duration (~2s)

**2. `src/pages/Record.tsx`**
- Update the hook call: `maxDuration: 5, minDuration: 2`
- Show a processing spinner between recording stop and preview ready (when `isProcessing` is true)
- Update helper text to say "Hold to record (5s max, will be sped up)"
- Progress bar labels update to reflect new min/max

### Technical detail: Speed-up via canvas re-encoding

```text
Raw 5s blob → <video playbackRate=2.5> → canvas drawImage per frame → MediaRecorder → 2s blob
```

- Video element plays at 2.5x into a canvas
- Canvas stream is captured by a new MediaRecorder
- Result: ~2 second video-only clip (no audio, since 2.5x audio is garbled)
- Falls back gracefully: if processing fails, saves the original blob at normal speed

