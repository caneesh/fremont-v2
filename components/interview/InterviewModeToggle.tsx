'use client';

import { useState } from 'react';

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

export interface InterviewModeToggleProps {
  initialConfig?: Partial<InterviewModeConfig>;
  onConfigChange: (config: InterviewModeConfig) => void;
  disabled?: boolean;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: InterviewModeConfig = {
  enabled: false,
  timerEnabled: true,
  timeLimitMinutes: 30,
  hintsHidden: true,
  explanationsRequired: true,
};

// =============================================================================
// COMPONENT
// =============================================================================

export function InterviewModeToggle({
  initialConfig,
  onConfigChange,
  disabled = false,
}: InterviewModeToggleProps) {
  const [config, setConfig] = useState<InterviewModeConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [showSettings, setShowSettings] = useState(false);

  const handleToggle = () => {
    const newConfig = { ...config, enabled: !config.enabled };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleSettingChange = <K extends keyof InterviewModeConfig>(
    key: K,
    value: InterviewModeConfig[K]
  ) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <svg
              className="h-5 w-5 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Interview Mode
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Simulate real interview conditions
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.enabled
              ? 'bg-blue-600'
              : 'bg-gray-200 dark:bg-gray-600'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          role="switch"
          aria-checked={config.enabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Settings Panel */}
      {config.enabled && (
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex w-full items-center justify-between text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <span>Settings</span>
            <svg
              className={`h-4 w-4 transform transition-transform ${
                showSettings ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showSettings && (
            <div className="mt-4 space-y-4">
              {/* Timer Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Timer Enabled
                </label>
                <button
                  onClick={() =>
                    handleSettingChange('timerEnabled', !config.timerEnabled)
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    config.timerEnabled
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={config.timerEnabled}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      config.timerEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Time Limit */}
              {config.timerEnabled && (
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Time Limit
                  </label>
                  <select
                    value={config.timeLimitMinutes}
                    onChange={(e) =>
                      handleSettingChange(
                        'timeLimitMinutes',
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              )}

              {/* Hints Hidden */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Hide Hints
                </label>
                <button
                  onClick={() =>
                    handleSettingChange('hintsHidden', !config.hintsHidden)
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    config.hintsHidden
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={config.hintsHidden}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      config.hintsHidden ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Explanations Required */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Require Explanations
                </label>
                <button
                  onClick={() =>
                    handleSettingChange(
                      'explanationsRequired',
                      !config.explanationsRequired
                    )
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    config.explanationsRequired
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={config.explanationsRequired}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      config.explanationsRequired
                        ? 'translate-x-5'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interview Mode Active Indicator */}
      {config.enabled && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            {config.timerEnabled
              ? `${config.timeLimitMinutes} min`
              : 'No timer'}{' '}
            | {config.hintsHidden ? 'No hints' : 'Hints available'} |{' '}
            {config.explanationsRequired
              ? 'Explanations required'
              : 'Explanations optional'}
          </span>
        </div>
      )}
    </div>
  );
}
