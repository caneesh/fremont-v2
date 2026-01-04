'use client';

import { useEffect, useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface InterviewTimerProps {
  startedAt: number;
  timeLimitSeconds: number;
  onTimeUp?: () => void;
  onTick?: (remaining: number) => void;
  paused?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function InterviewTimer({
  startedAt,
  timeLimitSeconds,
  onTimeUp,
  onTick,
  paused = false,
}: InterviewTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(timeLimitSeconds);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  const calculateRemaining = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, timeLimitSeconds - elapsed);
  }, [startedAt, timeLimitSeconds]);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);

      // Update warning states
      setIsWarning(remaining <= 300 && remaining > 60); // 5 min warning
      setIsCritical(remaining <= 60); // 1 min critical

      // Notify parent
      onTick?.(remaining);

      // Handle time up
      if (remaining === 0) {
        clearInterval(interval);
        onTimeUp?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, calculateRemaining, onTick, onTimeUp]);

  // Format time
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Calculate progress
  const progress = (remainingSeconds / timeLimitSeconds) * 100;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-4 py-2 ${
        isCritical
          ? 'animate-pulse bg-red-100 dark:bg-red-900/50'
          : isWarning
          ? 'bg-yellow-100 dark:bg-yellow-900/50'
          : 'bg-gray-100 dark:bg-gray-800'
      }`}
    >
      {/* Timer Icon */}
      <svg
        className={`h-5 w-5 ${
          isCritical
            ? 'text-red-600 dark:text-red-400'
            : isWarning
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-gray-600 dark:text-gray-400'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Time Display */}
      <div className="flex flex-col">
        <span
          className={`text-lg font-mono font-bold ${
            isCritical
              ? 'text-red-600 dark:text-red-400'
              : isWarning
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {formatted}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          remaining
        </span>
      </div>

      {/* Progress Bar */}
      <div className="ml-2 h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full transition-all duration-1000 ${
            isCritical
              ? 'bg-red-500'
              : isWarning
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Paused Indicator */}
      {paused && (
        <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          PAUSED
        </span>
      )}
    </div>
  );
}
