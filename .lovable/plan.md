

## Add Background Music to Compilations

### Approach: Pre-built Music Library

Store 5-10 royalty-free tracks in a `music` storage bucket. Users pick a track (or "No music") before compiling. Shotstack handles the audio mixing server-side.

### What You Need To Do

Provide 5-10 royalty-free MP3 files (30-120s each). Good free sources:
- **Pixabay Music** (pixabay.com/music) — free, no attribution
- **Uppbeat** (uppbeat.io) — free tier available
- Name them descriptively: `upbeat-happy.mp3`, `calm-reflective.mp3`, etc.

### Implementation Steps

**1. Storage bucket + music metadata table**
- Create a `music` public storage bucket
- Create a `music_tracks` table (id, name, mood, file_url, duration) — seeded with track metadata
- Upload the MP3s you provide to the bucket

**2. Music picker UI on Compile page**
- Add a horizontal scrollable row of track cards below the filters
- Each card shows: name, mood tag, duration, play/preview button
- Tapping selects the track (highlight border); tap again to deselect
- "No music" option selected by default
- Small inline audio player for 10s preview

**3. Pass music URL to Shotstack**
- Update `compile-video` edge function to accept `soundtrackUrl` parameter
- Add Shotstack `soundtrack` property to the render body:
  ```json
  {
    "timeline": { "soundtrack": { "src": "<music_url>", "effect": "fadeOut" } }
  }
  ```
- Music auto-fades at the end of the compilation

**4. Update compile flow**
- `useCloudCompilation` hook passes selected track URL
- `Compile.tsx` manages selected track state

### Technical Details

- Shotstack's `soundtrack` property handles mixing — no extra processing needed
- `fadeOut` effect ensures clean ending regardless of track/video length mismatch
- Tracks stored publicly so Shotstack can fetch them directly
- No database migration needed for `compilation_jobs` — the music URL is only used at render time

