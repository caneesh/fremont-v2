'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { FEATURE_REGISTRY, getEffectiveFlagValues } from '@/lib/featureRegistry'
import PageHeader from '@/components/PageHeader'
import MobileNav from '@/components/MobileNav'

const OVERRIDE_STORAGE_KEY = 'physiscaffold_feature_overrides'

type FlagSource = 'hardcoded' | 'env' | 'default'

interface FlagInfo {
  name: string
  value: boolean
  source: FlagSource
  envVar?: string
  description: string
  affectedFeatures: string[]
  override?: boolean | null
  envMissing?: boolean
}

interface FlagOverrides {
  [key: string]: boolean
}

function getStoredOverrides(): FlagOverrides {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(OVERRIDE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setStoredOverrides(overrides: FlagOverrides): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // Ignore storage errors
  }
}

export default function DebugFeaturesPage() {
  const [overrides, setOverrides] = useState<FlagOverrides>({})
  const [filterEnabled, setFilterEnabled] = useState<boolean | 'all'>('all')
  const [filterSource, setFilterSource] = useState<FlagSource | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showOverridesOnly, setShowOverridesOnly] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load overrides from localStorage on mount
  useEffect(() => {
    setOverrides(getStoredOverrides())
    setMounted(true)
  }, [])

  // Persist overrides to localStorage
  const updateOverride = useCallback((flagName: string, value: boolean | null) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (value === null) {
        delete next[flagName]
      } else {
        next[flagName] = value
      }
      setStoredOverrides(next)
      return next
    })
  }, [])

  const clearAllOverrides = useCallback(() => {
    setOverrides({})
    setStoredOverrides({})
  }, [])

  // Build comprehensive flag information
  const flagInfos = useMemo(() => {
    const effectiveFlags = getEffectiveFlagValues()

    // Map of flag descriptions
    const flagDescriptions: Record<string, string> = {
      FBD_CANVAS: 'Interactive Free Body Diagram drawing tool (DISABLED: causes step completion issues)',
      MICRO_TASKS: 'Active learning mode with MCQ/fill-in-blank tasks',
      MISTAKE_NOTEBOOK: 'Spaced repetition review of learning gaps',
      ERROR_ANTICIPATOR: 'Warning beacons for common mistakes',
      REVEAL_RECONSTRUCT_VALIDATE: '3-stage structured learning flow for reading mode',
      CONFIDENCE_WEIGHTED_SRS: 'Spaced repetition adjusted by self-reported confidence',
      BOUNDARY_CASE_BUILDER: 'Interactive equation stress-testing with limiting cases',
      EQUATIONLESS_PATH: 'Requires verbal plan before algebra entry',
      CONCEPT_CONTRAST: 'Challenge to explain why similar concepts do not apply',
      DEV_SKIP_STEPS: 'Development mode to skip steps for testing',
      PHASED_SCAFFOLD: '3-phase scaffold generation (DISABLED: UI issues)',
      FEYNMAN_HINT_PROMPTS: 'Requires concept explanation before level 3+ hints',
      CONSTRAINT_COLLISION: 'Real-time physics law violation detection',
      PAPER_SOLUTION_UPLOAD: 'Upload handwritten solutions for OCR analysis',
      SOCRATIC_TUTOR_CHAT: 'AI professor check-in after steps',
      STUDY_PLAN_V2: 'Pattern-first learning curriculum',
      ADAPTIVE_PREFLIGHT: 'Auto-inserts checks on high-risk steps',
      WHY_THIS_STEP: 'On-demand explanation of step importance',
      STEP_HEATMAP: 'Visual confidence heatmap across steps',
      PATTERN_FIRST_MODE: 'Timed pattern identification (12s gate)',
      SKIP_COMMIT_GATE: 'Triage decision at T=25s',
      P0_DECISION_GATES: 'Requires correct micro-task completion before step submission',
      P0_REBUILD_GATES: 'Forces understanding demonstration after reveal',
      COGNITIVE_LOAD_GOVERNOR: 'Reduces UI complexity for struggling students',
      CONFIDENCE_REPAIR: 'Detects frustrating sessions and auto-recovers',
      LEARNING_INTEGRITY: 'Silent tracking of behavioral signals',
      QUESTION_ENGINE: 'Template-based question resolution',
      DASHBOARD_V3: 'New unified AppShell layout with dashboard',
      SOCRATIC_FIRST_MODE: 'Transforms step interaction to Socratic questioning',
      USE_DATABASE_QUESTIONS: 'Uses questions from PostgreSQL database',
      WARMUP_PROTOCOL: '2-5 minute micro-drills before sessions',
      PIVOT_INJECTION: 'Dynamic help questions when stuck',
      CONSTRAINT_HIGHLIGHT: 'Highlights missed constraint keywords',
      DEBUG_REFACTOR_MODE: 'Alternative debug/refactor problem modes',
    }

    const infos: FlagInfo[] = effectiveFlags.map(flag => {
      // Find features that depend on this flag
      const affectedFeatures = FEATURE_REGISTRY
        .filter(f => f.requiredFlags.includes(flag.name as keyof typeof FEATURE_FLAGS))
        .map(f => f.name)

      // Check if env var is missing (not set but could be)
      const envMissing = flag.source === 'default' && flag.envVar !== undefined

      return {
        name: flag.name,
        value: flag.value,
        source: flag.source,
        envVar: flag.envVar,
        description: flagDescriptions[flag.name] || 'No description available',
        affectedFeatures,
        override: overrides[flag.name] ?? null,
        envMissing,
      }
    })

    return infos
  }, [overrides])

  const filteredFlags = useMemo(() => {
    return flagInfos.filter(flag => {
      if (showOverridesOnly && flag.override === null) return false
      if (filterEnabled !== 'all') {
        const effectiveValue = flag.override ?? flag.value
        if (effectiveValue !== filterEnabled) return false
      }
      if (filterSource !== 'all' && flag.source !== filterSource) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          flag.name.toLowerCase().includes(query) ||
          flag.description.toLowerCase().includes(query) ||
          (flag.envVar && flag.envVar.toLowerCase().includes(query))
        )
      }
      return true
    })
  }, [flagInfos, filterEnabled, filterSource, searchQuery, showOverridesOnly])

  const stats = useMemo(() => ({
    total: flagInfos.length,
    enabled: flagInfos.filter(f => f.value).length,
    disabled: flagInfos.filter(f => !f.value).length,
    overridden: Object.keys(overrides).length,
    envMissing: flagInfos.filter(f => f.envMissing).length,
  }), [flagInfos, overrides])

  const sourceColors: Record<FlagSource, { bg: string; text: string; label: string }> = {
    hardcoded: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Hardcoded' },
    env: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Environment' },
    default: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', label: 'Default' },
  }

  // Generate env var template for missing variables
  const missingEnvTemplate = useMemo(() => {
    return flagInfos
      .filter(f => f.envMissing && f.envVar)
      .map(f => `${f.envVar}=${f.value ? 'true' : 'false'}`)
      .join('\n')
  }, [flagInfos])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-app flex items-center justify-center">
        <div className="text-gray-500 dark:text-dark-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-app">
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <PageHeader />
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 border-l-4 border-orange-500 dark:border-orange-400 mb-4 border-r border-t border-b border-transparent dark:border-r-dark-border dark:border-t-dark-border dark:border-b-dark-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                    Debug: Feature Flags
                  </h1>
                  <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-semibold">
                    DEV ONLY
                  </span>
                </div>
                <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
                  Override feature flags locally for development testing. Changes persist in localStorage.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/features"
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  Feature Explorer
                </Link>
                <Link
                  href="/features/flags"
                  className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  Flags Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Development Only</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Local overrides only affect your browser. Server-side checks still use environment variables.
                  Refresh the page after changing overrides to see effects in components that read flags at render time.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Total Flags</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.enabled}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Enabled</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.disabled}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Disabled</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.overridden}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Overridden</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.envMissing}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Missing Env</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 mb-6 border border-transparent dark:border-dark-border">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search flags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-placeholder focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-40">
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1">Status</label>
                <select
                  value={filterEnabled === 'all' ? 'all' : filterEnabled ? 'true' : 'false'}
                  onChange={(e) => setFilterEnabled(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary"
                >
                  <option value="all">All</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              {/* Source Filter */}
              <div className="w-full md:w-44">
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1">Source</label>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value as FlagSource | 'all')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary"
                >
                  <option value="all">All Sources</option>
                  <option value="hardcoded">Hardcoded</option>
                  <option value="env">Environment</option>
                  <option value="default">Default</option>
                </select>
              </div>

              {/* Overrides Only */}
              <div className="flex items-end">
                <button
                  onClick={() => setShowOverridesOnly(!showOverridesOnly)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showOverridesOnly
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                  }`}
                >
                  Overrides Only
                </button>
              </div>
            </div>

            {/* Clear Overrides */}
            {stats.overridden > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button
                  onClick={clearAllOverrides}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                >
                  Clear All Overrides ({stats.overridden})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Flags List */}
        <div className="space-y-4">
          {filteredFlags.map(flag => {
            const sourceConfig = sourceColors[flag.source]
            const hasOverride = flag.override !== null
            const effectiveValue = flag.override ?? flag.value

            return (
              <div
                key={flag.name}
                className={`bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-5 border-2 ${
                  hasOverride
                    ? 'border-orange-300 dark:border-orange-600'
                    : 'border-transparent dark:border-dark-border'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="text-lg font-semibold font-mono text-gray-900 dark:text-dark-text-primary">
                        {flag.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sourceConfig.bg} ${sourceConfig.text}`}>
                        {sourceConfig.label}
                      </span>
                      {hasOverride && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                          Overridden
                        </span>
                      )}
                      {flag.envMissing && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          Env Missing
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                      {flag.description}
                    </p>
                  </div>

                  {/* Toggle Controls */}
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      effectiveValue
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {effectiveValue ? 'ON' : 'OFF'}
                    </div>

                    {/* Override Toggle */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateOverride(flag.name, true)}
                        className={`px-3 py-1 rounded-l-lg text-xs font-medium transition-colors ${
                          flag.override === true
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200'
                        }`}
                        title="Force enable"
                      >
                        ON
                      </button>
                      <button
                        onClick={() => updateOverride(flag.name, null)}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          flag.override === null
                            ? 'bg-gray-500 text-white'
                            : 'bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200'
                        }`}
                        title="Use default"
                      >
                        Default
                      </button>
                      <button
                        onClick={() => updateOverride(flag.name, false)}
                        className={`px-3 py-1 rounded-r-lg text-xs font-medium transition-colors ${
                          flag.override === false
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200'
                        }`}
                        title="Force disable"
                      >
                        OFF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Env Var Info */}
                {flag.envVar && (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">Environment Variable:</p>
                    <code className="text-sm font-mono text-gray-800 dark:text-dark-text-secondary">
                      {flag.envVar}={flag.value ? 'true' : 'false'}
                    </code>
                    {flag.envMissing && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Not set in environment. Using default value.
                      </p>
                    )}
                    {flag.source === 'env' && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Value set via environment variable.
                      </p>
                    )}
                  </div>
                )}

                {flag.source === 'hardcoded' && (
                  <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      This flag is hardcoded and cannot be changed via env vars. Local override will work for client-side checks only.
                    </p>
                  </div>
                )}

                {/* Why Hidden */}
                {!flag.value && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                    <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Why this feature is hidden:</p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {flag.source === 'hardcoded'
                        ? 'Disabled in code due to bugs or incomplete implementation.'
                        : flag.source === 'env'
                        ? `Environment variable ${flag.envVar} is set to false.`
                        : `Using default value (off). Set ${flag.envVar}=true to enable.`
                      }
                    </p>
                  </div>
                )}

                {/* Affected Features */}
                {flag.affectedFeatures.length > 0 && (
                  <div className="pt-3 border-t border-gray-100 dark:border-dark-border">
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-2">Features requiring this flag:</p>
                    <div className="flex flex-wrap gap-2">
                      {flag.affectedFeatures.map(feature => (
                        <span
                          key={feature}
                          className={`px-2 py-1 rounded text-xs ${
                            effectiveValue
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredFlags.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md border border-transparent dark:border-dark-border">
            <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-dark-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">No flags found</h3>
            <p className="text-gray-500 dark:text-dark-text-muted mb-4">Try adjusting your filters</p>
            <button
              onClick={() => {
                setFilterEnabled('all')
                setFilterSource('all')
                setSearchQuery('')
                setShowOverridesOnly(false)
              }}
              className="text-orange-600 dark:text-orange-400 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Missing Env Vars Section */}
        {stats.envMissing > 0 && (
          <div className="mt-8 bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-6 border border-transparent dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">
              Missing Environment Variables ({stats.envMissing})
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
              These flags are using default values. Copy to <code className="px-1 py-0.5 bg-gray-100 dark:bg-dark-card-soft rounded">.env.local</code> or Vercel to explicitly configure:
            </p>
            <pre className="p-4 bg-gray-800 dark:bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
              {missingEnvTemplate || '# All environment variables are set'}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(missingEnvTemplate)}
              className="mt-3 px-4 py-2 bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors text-sm font-medium"
            >
              Copy to Clipboard
            </button>
          </div>
        )}

        {/* How localStorage Overrides Work */}
        <div className="mt-8 bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-6 border border-transparent dark:border-dark-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">How Local Overrides Work</h3>
          <div className="space-y-4 text-sm text-gray-600 dark:text-dark-text-secondary">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-dark-text-primary mb-1">Client-Side Only</h4>
              <p>Overrides are stored in your browser&apos;s localStorage and only affect client-side flag checks. Server-side rendering and API routes still use environment variables.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 dark:text-dark-text-primary mb-1">To use overrides in your code:</h4>
              <pre className="mt-2 p-3 bg-gray-800 dark:bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
{`// In a client component:
import { useFeatureOverride } from '@/lib/featureOverrides'

function MyComponent() {
  const isFlagEnabled = useFeatureOverride('MY_FLAG')
  // Returns override if set, otherwise actual flag value
}`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 dark:text-dark-text-primary mb-1">Storage Key</h4>
              <p>Overrides are stored under: <code className="px-1 py-0.5 bg-gray-100 dark:bg-dark-card-soft rounded">physiscaffold_feature_overrides</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
