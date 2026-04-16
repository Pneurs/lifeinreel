

The user can't tap filter options in the FilterStrip on the post-record preview. Let me analyze the code to find the issue.

Looking at `src/pages/Record.tsx`:
- The preview screen renders a `<video controls>` with `flex-1` taking most space
- Below it is the FilterStrip
- The whole thing is inside `absolute inset-0` container
- BUT — the bottom controls (`pb-12 px-6 z-10`) are also `absolute bottom-0 left-0 right-0` — these overlap the FilterStrip!

The bottom controls section contains the Save/Retake buttons positioned absolutely at the bottom with `pb-12`. The FilterStrip is inside the flex column of the preview area, so it sits at the bottom of that column — exactly where the absolute bottom controls overlay it. The bottom controls have `z-10` while the FilterStrip's container doesn't have an explicit z-index, so the controls intercept all taps on the filter buttons.

Also the `<video controls>` shows native controls which can also cover the strip on some browsers.

**Fix plan:**

1. **Restructure the preview layout** in `src/pages/Record.tsx` so the FilterStrip sits ABOVE the bottom action buttons (Retake/Save), not underneath them. Specifically:
   - Move the FilterStrip out of the absolute video container and place it inside the bottom controls area, positioned above the Retake/Save row when `hasRecorded` is true.
   - OR add bottom padding to the preview flex container equal to the bottom controls height, and bump the FilterStrip's z-index to `z-20` so it sits above the action row but doesn't visually collide.

   Cleanest approach: render the FilterStrip inside the bottom controls block (above the Retake/Save row) so they're naturally stacked and tappable.

2. **Remove `controls` from the preview `<video>`** — the native control bar overlaps the bottom of the video and can intercept touches near the FilterStrip. The clip is short (2s) and auto-loops; native controls aren't needed.

3. **Ensure the preview video container leaves room** — change the preview video to not consume `flex-1` all the way to the bottom; cap its height so the FilterStrip + action buttons have dedicated tappable space.

### Files to change

- **`src/pages/Record.tsx`** — restructure the `hasRecorded && previewUrl` block: keep the preview header + video in the upper area, move the FilterStrip into the bottom controls section (rendered above the Retake/Save row only when `hasRecorded`), remove `controls` from the preview video, and add appropriate bottom padding to avoid overlap.

No other files need changes. FilterStrip itself is fine — its buttons already have `type="button"` and proper handlers.

