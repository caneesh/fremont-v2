'use client';

import { useState, useCallback, useEffect } from 'react';
import type { InterviewConfig } from '@/lib/interview';

// =============================================================================
// TYPES
// =============================================================================

export interface InterviewModeConfig {
  enabled: boolean;
  timerEnabled: boolean;
  timeLimitMinutes: number;
  hintsHidden: boolean;
  explanationsRequired: boolean;
}

export interface UseInterviewModeReturn {
  config: InterviewModeConfig;
  isEnabled: boolean;
  updateConfig: (updates: Partial<InterviewModeConfig>) => void;
  toggleEnabled: () => void;
  reset: () => void;
  toInterviewConfig: () => Partial<InterviewConfig>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'interview_mode_config';

const DEFAULT_CONFIG: InterviewModeConfig = {
  enabled: false,
  timerEnabled: true,
  timeLimitMinutes: 30,
  hintsHidden: true,
  explanationsRequired: true,
};

// =============================================================================
// HELPERS
// =============================================================================

function loadConfig(): InterviewModeConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }

  return DEFAULT_CONFIG;
}

function saveConfig(config: InterviewModeConfig): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useInterviewMode(): UseInterviewModeReturn {
  const [config, setConfig] = useState<InterviewModeConfig>(DEFAULT_CONFIG);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    setConfig(loadConfig());
    setIsHydrated(true);
  }, []);

  // Save to localStorage when config changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveConfig(config);
    }
  }, [config, isHydrated]);

  const updateConfig = useCallback((updates: Partial<InterviewModeConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleEnabled = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const reset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  // Convert to core InterviewConfig format
  const toInterviewConfig = useCallback((): Partial<InterviewConfig> => {
    return {
      timerEnabled: config.timerEnabled,
      timeLimitSeconds: config.timeLimitMinutes * 60,
      hintsHidden: config.hintsHidden,
      explanationsRequired: config.explanationsRequired,
      rubricScoringEnabled: true,
    };
  }, [config]);

  return {
    config,
    isEnabled: config.enabled,
    updateConfig,
    toggleEnabled,
    reset,
    toInterviewConfig,
  };
}

export { DEFAULT_CONFIG as DEFAULT_INTERVIEW_CONFIG };
