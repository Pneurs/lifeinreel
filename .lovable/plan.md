

# Day Number Badge Feature

## Overview
Add a "Day X" badge to video clips that shows how many days into the journey the video was captured. The day number will be calculated from the journey's creation date, and multiple videos on the same day will show the same day number. The badge will use a handwritten-style font for a personal, emotional feel.

## How It Works

The day number is calculated by comparing the video's capture date to the journey's start date:
- **Day 1**: First day of the journey (the day the journey was created)
- **Day 3**: If user skips a day and records on the third day since starting
- **Same day videos**: All videos recorded on the same calendar day show the same day number

## Visual Design

**On Thumbnails:**
- Large, centered "Day X" text in handwritten font
- White text with subtle shadow for readability over videos
- Positioned prominently as the main visual element

**On Fullscreen Video Preview:**
- Smaller "Day X" badge in the top-left corner
- Semi-transparent background for visibility
- Same handwritten font style

---

## Technical Details

### 1. Add Handwritten Font

Import a handwritten-style Google Font (Caveat) in `src/index.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap");
```

Add the font to `tailwind.config.ts`:

```typescript
fontFamily: {
  // ... existing fonts
  handwritten: ['Caveat', 'cursive']
}
```

### 2. Create Day Number Utility Function

Create a helper function in `src/lib/utils.ts` to calculate the day number:

```typescript
import { differenceInCalendarDays, parseISO } from 'date-fns';

export function calculateDayNumber(capturedAt: string, journeyCreatedAt: string): number {
  const captureDate = parseISO(capturedAt);
  const journeyStartDate = parseISO(journeyCreatedAt);
  return differenceInCalendarDays(captureDate, journeyStartDate) + 1;
}
```

### 3. Update VideoClip Type

Extend the `VideoClip` interface in `src/types/journey.ts` to include an optional `dayNumber` field:

```typescript
export interface VideoClip {
  // ... existing fields
  dayNumber?: number; // Calculated from journey start date
}
```

### 4. Update ClipThumbnail Component

Modify `src/components/journey/ClipThumbnail.tsx`:
- Accept optional `dayNumber` prop
- Display centered "Day X" badge with handwritten font
- Style: white text, large size, text shadow for visibility

```tsx
interface ClipThumbnailProps {
  // ... existing props
  dayNumber?: number;
}

// In the component:
{dayNumber && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <span className="font-handwritten text-2xl text-white drop-shadow-lg">
      Day {dayNumber}
    </span>
  </div>
)}
```

### 5. Update ClipPreviewDialog Component

Modify `src/components/journey/ClipPreviewDialog.tsx`:
- Accept optional `dayNumber` prop
- Display smaller "Day X" badge in top-left corner

```tsx
interface ClipPreviewDialogProps {
  // ... existing props
  dayNumber?: number;
}

// In the component (top-left corner):
{dayNumber && (
  <div className="absolute top-4 left-4 z-20">
    <span className="font-handwritten text-lg text-white bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm">
      Day {dayNumber}
    </span>
  </div>
)}
```

### 6. Update JourneyDetail Page

Modify `src/pages/JourneyDetail.tsx` to calculate and pass day numbers:
- Pass the journey's `createdAt` date for calculations
- Compute `dayNumber` for each clip when rendering
- Pass `dayNumber` to both `ClipThumbnail` and `ClipPreviewDialog`

```tsx
// Calculate day number for a clip
const getDayNumber = (capturedAt: string) => {
  return calculateDayNumber(capturedAt, journey.createdAt);
};

// When rendering thumbnails:
<ClipThumbnail 
  clip={clip} 
  dayNumber={getDayNumber(clip.capturedAt)}
  // ... other props
/>

// For the preview dialog:
<ClipPreviewDialog
  clip={previewClip}
  dayNumber={previewClip ? getDayNumber(previewClip.capturedAt) : undefined}
  // ... other props
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add Caveat font import |
| `tailwind.config.ts` | Add `handwritten` font family |
| `src/lib/utils.ts` | Add `calculateDayNumber` helper function |
| `src/types/journey.ts` | Add optional `dayNumber` to VideoClip type |
| `src/components/journey/ClipThumbnail.tsx` | Add `dayNumber` prop and centered badge UI |
| `src/components/journey/ClipPreviewDialog.tsx` | Add `dayNumber` prop and top-left corner badge |
| `src/pages/JourneyDetail.tsx` | Calculate and pass day numbers to components |

