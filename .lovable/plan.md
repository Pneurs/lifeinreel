
# Video Marking & Compilation Feature

## Overview
This feature adds a sophisticated clip marking system where users can tag videos as "Best of Day", "Best of Week", and "Best of Month" (with multiple tags per clip). Users can then compile videos with flexible filtering options, preview selected clips before compilation, and see estimated output duration.

## How It Works

### Marking System
- Each video can have multiple "best of" tags simultaneously (Day + Week + Month)
- Tags are visually indicated with colored badges on thumbnails
- Quick-toggle buttons in the video preview dialog for marking

### Compilation Flow
1. User opens Compile page from Reels or Journey
2. Selects compilation type and filters (date range, journey, tag type)
3. Sees all matching clips with checkboxes and total duration estimate
4. Can manually deselect unwanted clips
5. Initiates compilation (future: server-side FFmpeg processing)

### Duration Estimation
- Sum of all selected clip durations shown in real-time
- Updates as user toggles clip selection

---

## Visual Design

### Clip Badges (on thumbnails)
- Small colored dots/icons indicating marking status:
  - Day: Calendar icon (blue)
  - Week: 7-day icon (green)  
  - Month: Star icon (gold)
- Multiple badges can appear together

### Video Preview Actions
- Three toggle buttons below video: "Best Day" / "Best Week" / "Best Month"
- Active state shows filled icon with primary color

### Compile Page
- Filter bar at top: Journey selector, Date range picker, Tag filter (All/Day/Week/Month)
- Grid of clip thumbnails with selection checkboxes
- Duration counter at bottom: "23 clips selected • 42 seconds"
- "Compile Video" button

---

## Database Changes

Add three new boolean columns to `video_clips` table:

```sql
ALTER TABLE public.video_clips 
ADD COLUMN is_best_of_day boolean NOT NULL DEFAULT false,
ADD COLUMN is_best_of_week boolean NOT NULL DEFAULT false,
ADD COLUMN is_best_of_month boolean NOT NULL DEFAULT false;
```

---

## Technical Details

### 1. Update Database Schema

Add migration to create new marking columns on `video_clips`:

```sql
ALTER TABLE public.video_clips 
ADD COLUMN is_best_of_day boolean NOT NULL DEFAULT false,
ADD COLUMN is_best_of_week boolean NOT NULL DEFAULT false,
ADD COLUMN is_best_of_month boolean NOT NULL DEFAULT false;
```

### 2. Update VideoClip Type

Extend `src/types/journey.ts`:

```typescript
export interface VideoClip {
  // ... existing fields
  isBestOfDay: boolean;
  isBestOfWeek: boolean;
  isBestOfMonth: boolean;
}
```

### 3. Update useJourneyClips Hook

Modify `src/hooks/useJourneys.ts`:
- Map new columns from database response
- Add toggle functions for each marking type: `toggleBestOfDay`, `toggleBestOfWeek`, `toggleBestOfMonth`

### 4. Update ClipThumbnail Component

Modify `src/components/journey/ClipThumbnail.tsx`:
- Accept `isBestOfDay`, `isBestOfWeek`, `isBestOfMonth` props
- Display small colored badge indicators in corner when marked
- Use compact icons: Calendar (day), CalendarDays (week), Star (month)

### 5. Update ClipPreviewDialog Component

Modify `src/components/journey/ClipPreviewDialog.tsx`:
- Add three marking toggle buttons in bottom action bar
- Each button shows current state and allows toggle
- Use distinct colors: blue (day), green (week), gold (month)

### 6. Create New Compile Page

Create `src/pages/Compile.tsx`:
- Journey selector dropdown
- Date range picker (react-day-picker already installed)
- Tag filter tabs: All / Best of Day / Best of Week / Best of Month
- Custom date range option
- Grid of selectable clip thumbnails with checkboxes
- Real-time duration calculator
- "Compile Video" action button

### 7. Create useCompileClips Hook

Create `src/hooks/useCompileClips.ts`:
- Fetch clips based on filters (journey, date range, marking type)
- Track selected clip IDs
- Calculate total duration
- Handle select/deselect operations

### 8. Create SelectableClipThumbnail Component

Create `src/components/compile/SelectableClipThumbnail.tsx`:
- Extends ClipThumbnail with selection checkbox overlay
- Shows checkmark when selected
- Lightweight for performance (lazy load videos)

### 9. Add Route

Update `src/App.tsx`:
- Add `/compile` route

### 10. Navigation

Update bottom nav or add compile button in Reels/Journey pages to access compilation feature.

---

## Performance Considerations

**Regarding showing all videos with thumbnails:**

The app will NOT become heavy because:

1. **Lazy Loading**: Video thumbnails use `<video>` elements but don't load full videos - only the first frame poster
2. **Virtualization (optional)**: For very large clip collections (100+), we can implement virtual scrolling using a lightweight library
3. **Image-based Thumbnails**: The database already has `thumbnail_url` field - we'll use static images instead of video elements in the grid view
4. **Pagination**: For extremely large collections, we can paginate results (50 clips per page)

For most users with under 100 clips per month, the grid will render smoothly without any special optimizations.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Compile.tsx` | Main compilation page with filters and clip grid |
| `src/hooks/useCompileClips.ts` | Data fetching and selection management |
| `src/components/compile/SelectableClipThumbnail.tsx` | Thumbnail with checkbox overlay |
| `src/components/compile/CompileFilters.tsx` | Filter bar with journey/date/tag selectors |
| `src/components/compile/DurationCounter.tsx` | Bottom bar showing selected count and duration |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/journey.ts` | Add three new boolean fields to VideoClip |
| `src/hooks/useJourneys.ts` | Map new fields, add toggle functions |
| `src/components/journey/ClipThumbnail.tsx` | Add marking badge indicators |
| `src/components/journey/ClipPreviewDialog.tsx` | Add three marking toggle buttons |
| `src/pages/JourneyDetail.tsx` | Pass new marking props and callbacks |
| `src/App.tsx` | Add /compile route |
| `src/pages/Reels.tsx` | Add "Create New" button linking to Compile page |

---

## User Flow Summary

```text
1. Record clips daily → appear in Journey timeline
2. Open clip → mark as Best of Day/Week/Month (can have multiple)
3. Go to Reels → tap "Create Compilation"
4. Select filters:
   - Journey: Baby Emma
   - Tags: Best of Week
   - Date: Dec 2025 - Feb 2026
5. See matching clips with checkboxes (all selected by default)
6. See "12 clips • 24 seconds" at bottom
7. Untick any unwanted clips → duration updates
8. Tap "Compile Video" → video generated
```
