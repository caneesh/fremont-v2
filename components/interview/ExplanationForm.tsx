'use client';

import { useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface ExplanationFormData {
  approach: string;
  invariant: string;
  complexity: string;
}

export interface ExplanationFormProps {
  requirements: {
    approachRequired: boolean;
    invariantRequired: boolean;
    complexityRequired: boolean;
  };
  initialData?: Partial<ExplanationFormData>;
  onSubmit: (data: ExplanationFormData) => void;
  onSkip?: () => void;
  disabled?: boolean;
  validationErrors?: string[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ExplanationForm({
  requirements,
  initialData,
  onSubmit,
  onSkip,
  disabled = false,
  validationErrors = [],
}: ExplanationFormProps) {
  const [data, setData] = useState<ExplanationFormData>({
    approach: initialData?.approach || '',
    invariant: initialData?.invariant || '',
    complexity: initialData?.complexity || '',
  });

  const [touched, setTouched] = useState({
    approach: false,
    invariant: false,
    complexity: false,
  });

  const handleChange = (field: keyof ExplanationFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: keyof ExplanationFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ approach: true, invariant: true, complexity: true });
    onSubmit(data);
  };

  const getFieldError = (field: keyof ExplanationFormData): string | null => {
    if (!touched[field]) return null;

    const minLength = field === 'complexity' ? 5 : 10;
    const isRequired =
      field === 'approach'
        ? requirements.approachRequired
        : field === 'invariant'
        ? requirements.invariantRequired
        : requirements.complexityRequired;

    if (isRequired && data[field].trim().length < minLength) {
      return `Please provide at least ${minLength} characters`;
    }

    return null;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Explain Your Solution
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/50">
          <ul className="list-inside list-disc text-sm text-red-600 dark:text-red-400">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Approach Field */}
      <div>
        <label
          htmlFor="approach"
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Approach{' '}
          {requirements.approachRequired && (
            <span className="text-red-500">*</span>
          )}
        </label>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Describe the method or strategy you used to solve this problem.
        </p>
        <textarea
          id="approach"
          value={data.approach}
          onChange={(e) => handleChange('approach', e.target.value)}
          onBlur={() => handleBlur('approach')}
          disabled={disabled}
          rows={3}
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            getFieldError('approach')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
          } bg-white dark:bg-gray-700 dark:text-white`}
          placeholder="I approached this problem by first identifying..."
        />
        {getFieldError('approach') && (
          <p className="mt-1 text-xs text-red-500">{getFieldError('approach')}</p>
        )}
      </div>

      {/* Invariant Field */}
      <div>
        <label
          htmlFor="invariant"
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Physical Invariant / Key Principle{' '}
          {requirements.invariantRequired && (
            <span className="text-red-500">*</span>
          )}
        </label>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          What physical law or conserved quantity is central to this problem?
        </p>
        <textarea
          id="invariant"
          value={data.invariant}
          onChange={(e) => handleChange('invariant', e.target.value)}
          onBlur={() => handleBlur('invariant')}
          disabled={disabled}
          rows={2}
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            getFieldError('invariant')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
          } bg-white dark:bg-gray-700 dark:text-white`}
          placeholder="The key principle here is conservation of..."
        />
        {getFieldError('invariant') && (
          <p className="mt-1 text-xs text-red-500">
            {getFieldError('invariant')}
          </p>
        )}
      </div>

      {/* Complexity Field */}
      <div>
        <label
          htmlFor="complexity"
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Complexity Analysis{' '}
          {requirements.complexityRequired && (
            <span className="text-red-500">*</span>
          )}
        </label>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Describe the computational complexity or difficulty of your solution.
        </p>
        <input
          id="complexity"
          type="text"
          value={data.complexity}
          onChange={(e) => handleChange('complexity', e.target.value)}
          onBlur={() => handleBlur('complexity')}
          disabled={disabled}
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            getFieldError('complexity')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
          } bg-white dark:bg-gray-700 dark:text-white`}
          placeholder="O(n) time, O(1) space"
        />
        {getFieldError('complexity') && (
          <p className="mt-1 text-xs text-red-500">
            {getFieldError('complexity')}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Skip
          </button>
        )}
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Submit Explanation
        </button>
      </div>
    </form>
  );
}
