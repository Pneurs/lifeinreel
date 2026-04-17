

## Goal
Make the "Day X" badge actually appear in compiled videos, positioned at 20% above the bottom edge, with a rounded pill background, centered text, and a handwritten font.

## Why it keeps failing
The current Shotstack overlay uses an HTML asset with a custom `@font-face` and full-frame layout. Multiple things are likely going wrong at once:
1. Shotstack's `html` asset rendering can ignore `position: "center"` combined with full-frame `width/height` (likely why "no badge appears at all").
2. Custom Google `.ttf`/`.woff2` URLs are inconsistent inside Shotstack's headless renderer — the font silently falls back, and if the rest of the layout fails too, nothing renders.
3. The `timeline.fonts` array expects a specific format Shotstack accepts; an unsupported URL silently drops the asset.

## New approach (compiled only — keep saved clips clean)

Switch from a custom HTML asset to Shotstack's **native `title` asset**, which is the supported, documented way to put text on a clip. It is far more reliable and supports a curated set of fonts, sizes, backgrounds, and offsets.

### Edge function changes — `supabase/functions/compile-video/index.ts`

1. Replace the `html` overlay with a `title` asset:
   ```
   asset: {
     type: "title",
     text: `Day ${dayNum}`,
     style: "chunk",          // pill-shaped chunk style with background
     color: "#ffffff",
     background: "#e67e22",   // orange pill
     size: "medium",
     font: "Permanent Marker" // handwritten-style font supported by Shotstack natively
   }
   ```
   `style: "chunk"` natively renders rounded pill text — no CSS, no font URLs, no clipping.

2. Position it 20% above the bottom:
   ```
   position: "bottom",
   offset: { y: 0.2 }
   ```
   In Shotstack, `offset.y: 0.2` with `position: "bottom"` moves the asset up 20% of the frame height — exactly what was requested.

3. Remove the `timeline.fonts` block and the `DAY_BADGE_FONT_URL` constant — no longer needed since "chunk" + a built-in Shotstack font handles everything.

4. Keep one overlay clip per video clip aligned by `start` / `length` (unchanged).

### No client changes
- `clipDayNumbers` is already sent correctly from `Compile.tsx`.
- Per-journey `showDayNumbers` toggle keeps working as-is.
- Saved clips on disk stay untouched (per "Compiled only" choice).

### Verification path
After the edge function deploys:
1. Run a small compilation (2–3 clips) from a journey that has `showDayNumbers = true`.
2. Confirm the orange pill badge appears centered horizontally, ~20% above the bottom, with handwritten "Day N" text on every clip.
3. If the chosen handwritten font ever falls back, swap to another Shotstack-supported handwritten font (e.g. `"Caveat Brush"`, `"Shadows Into Light"`) — single-line change.

### Files touched
- `supabase/functions/compile-video/index.ts` (only file edited; redeployed automatically)

