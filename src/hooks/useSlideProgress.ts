import { useState, useEffect } from 'react';

export const useSlideProgress = (
  isActive: boolean,
  durationSeconds: number,
  dependencies: any[] = [] // Dependencies that should reset the progress
) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setProgress(0); // Reset progress if not active
      return;
    }

    // Reset progress to 0 when the effect re-runs due to dependency changes
    // This ensures the progress bar restarts for a new slide or if settings change
    setProgress(0); 
    const startTime = Date.now();
    // Use a default of 10 seconds if durationSeconds is not provided or is 0
    const slideDurationMs = (durationSeconds || 10) * 1000; 
    let animationFrameId: number;

    const updateProgress = () => {
      const elapsedTime = Date.now() - startTime;
      const currentProgress = Math.min(100, (elapsedTime / slideDurationMs) * 100);
      setProgress(currentProgress);

      if (elapsedTime < slideDurationMs) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [isActive, durationSeconds, ...dependencies]); // Spread all dependencies here

  return progress;
};
