import { useRef, useCallback, useEffect } from 'react';

interface UseCameraZoomProps {
  stream: MediaStream | null;
  videoElement: HTMLVideoElement | null;
  enabled: boolean;
}

export const useCameraZoom = ({ stream, videoElement, enabled }: UseCameraZoomProps) => {
  const initialPinchDistance = useRef<number | null>(null);
  const currentZoom = useRef(1);
  const minZoom = useRef(1);
  const maxZoom = useRef(1);
  const zoomSupported = useRef(false);

  // Check zoom capabilities when stream changes
  useEffect(() => {
    if (!stream) {
      zoomSupported.current = false;
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      zoomSupported.current = false;
      return;
    }

    try {
      const capabilities = videoTrack.getCapabilities?.();
      if (capabilities && 'zoom' in capabilities) {
        const zoomCap = (capabilities as any).zoom;
        minZoom.current = zoomCap.min ?? 1;
        maxZoom.current = zoomCap.max ?? 1;
        zoomSupported.current = maxZoom.current > minZoom.current;

        // Read current zoom setting
        const settings = videoTrack.getSettings?.();
        if (settings && 'zoom' in settings) {
          currentZoom.current = (settings as any).zoom ?? 1;
        }
      } else {
        zoomSupported.current = false;
      }
    } catch {
      zoomSupported.current = false;
    }
  }, [stream]);

  const getDistance = (t1: Touch, t2: Touch): number => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const applyZoom = useCallback(async (level: number) => {
    if (!stream || !zoomSupported.current) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const clamped = Math.min(Math.max(level, minZoom.current), maxZoom.current);
    try {
      await videoTrack.applyConstraints({ advanced: [{ zoom: clamped } as any] });
      currentZoom.current = clamped;
    } catch (err) {
      console.warn('Failed to apply zoom:', err);
    }
  }, [stream]);

  // Attach pinch handlers to the video element
  useEffect(() => {
    const el = videoElement;
    if (!el || !enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialPinchDistance.current = getDistance(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance.current !== null) {
        // Prevent page zoom but allow our camera zoom
        e.preventDefault();

        const newDist = getDistance(e.touches[0], e.touches[1]);
        const scale = newDist / initialPinchDistance.current;

        // Map pinch scale to zoom level relative to where we started
        const newZoom = currentZoom.current * scale;
        applyZoom(newZoom);

        // Update baseline so zoom feels continuous
        initialPinchDistance.current = newDist;
      }
    };

    const handleTouchEnd = () => {
      initialPinchDistance.current = null;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [videoElement, enabled, applyZoom]);

  return { zoomSupported: zoomSupported.current };
};
