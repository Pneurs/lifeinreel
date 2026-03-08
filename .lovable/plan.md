

## Plan: Fix retake button

**Problem:** The `retake` function does not reset `isProcessing` to `false`. If a user taps retake while the speed-up canvas re-encoding is in progress (or if it left `isProcessing` stuck), the UI shows the "Speeding up your clip..." spinner permanently, making it appear the retake button doesn't work.

### Changes

**`src/hooks/useVideoRecording.ts`** — `retake` function (line 337-366):
- Add `setIsProcessing(false)` to the state reset block (after line 351)
- This ensures the processing overlay is dismissed when the user retakes

This is a one-line fix that clears the processing state during retake, allowing the camera to re-initialize and display properly.

