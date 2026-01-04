'use client';

import type { RubricResult, RubricDimension } from '@/lib/core/entities/interview-session';
import type { Grade } from '@/lib/core/policies/rubric-engine';

// =============================================================================
// TYPES
// =============================================================================

export interface RubricResultsProps {
  result: RubricResult;
  grade: Grade;
  summary: {
    totalSteps: number;
    stepsCompleted: number;
    correctOnFirstTry: number;
    totalHintsUsed: number;
    totalTimeSeconds: number;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

const DIMENSION_LABELS: Record<RubricDimension, string> = {
  correctness: 'Correctness',
  approach_clarity: 'Approach Clarity',
  invariant_identification: 'Invariant Identification',
  complexity_analysis: 'Complexity Analysis',
  time_efficiency: 'Time Efficiency',
  hint_independence: 'Hint Independence',
};

const DIMENSION_ICONS: Record<RubricDimension, string> = {
  correctness: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  approach_clarity: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  invariant_identification: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  complexity_analysis: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  time_efficiency: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  hint_independence: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
};

function getGradeColor(grade: Grade): string {
  if (grade.startsWith('A')) return 'text-green-600 dark:text-green-400';
  if (grade.startsWith('B')) return 'text-blue-600 dark:text-blue-400';
  if (grade.startsWith('C')) return 'text-yellow-600 dark:text-yellow-400';
  if (grade === 'D') return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RubricResults({ result, grade, summary }: RubricResultsProps) {
  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      {/* Header with Grade */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Interview Results
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your performance breakdown
          </p>
        </div>
        <div className="text-center">
          <div
            className={`text-5xl font-bold ${getGradeColor(grade)}`}
          >
            {grade}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {result.percentageScore}%
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.stepsCompleted}/{summary.totalSteps}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Steps Completed
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.correctOnFirstTry}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            First Try Correct
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.totalHintsUsed}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Hints Used
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatTime(summary.totalTimeSeconds)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Time Taken
          </div>
        </div>
      </div>

      {/* Overall Feedback */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {result.overallFeedback}
        </p>
      </div>

      {/* Dimension Scores */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Score Breakdown
        </h3>
        <div className="space-y-3">
          {result.scores.map((score) => (
            <div key={score.dimension} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-500 dark:text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={DIMENSION_ICONS[score.dimension]}
                    />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {DIMENSION_LABELS[score.dimension]}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {score.score}/{score.maxScore}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full transition-all ${getScoreColor(score.score)}`}
                    style={{ width: `${score.score}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {score.feedback}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths and Improvements */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/30">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200">
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            Strengths
          </h4>
          {result.strengths.length > 0 ? (
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
              {result.strengths.map((strength, i) => (
                <li key={i}>• {strength}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-700 dark:text-green-300">
              Keep practicing to develop strengths!
            </p>
          )}
        </div>

        {/* Improvements */}
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/30">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-200">
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Areas to Improve
          </h4>
          {result.improvements.length > 0 ? (
            <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
              {result.improvements.map((improvement, i) => (
                <li key={i}>• {improvement}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Excellent work across all areas!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
