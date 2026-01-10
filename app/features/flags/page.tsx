'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { FEATURE_REGISTRY, getEffectiveFlagValues } from '@/lib/featureRegistry'
import PageHeader from '@/components/PageHeader'
import MobileNav from '@/components/MobileNav'

type FlagSource = 'hardcoded' | 'env' | 'default'

interface FlagInfo {
  name: string
  value: boolean
  source: FlagSource
  envVar?: string
  description: string
  affectedFeatures: string[]
}

export default function FeatureFlagsPage() {
  const [filterEnabled, setFilterEnabled] = useState<boolean | 'all'>('all')
  const [filterSource, setFilterSource] = useState<FlagSource | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Build comprehensive flag information
  const flagInfos = useMemo(() => {
    const effectiveFlags = getEffectiveFlagValues()

    // Map of flag descriptions (extracted from featureFlags.ts comments)
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

      return {
        name: flag.name,
        value: flag.value,
        source: flag.source,
        envVar: flag.envVar,
        description: flagDescriptions[flag.name] || 'No description available',
        affectedFeatures,
      }
    })

    return infos
  }, [])

  const filteredFlags = useMemo(() => {
    return flagInfos.filter(flag => {
      if (filterEnabled !== 'all' && flag.value !== filterEnabled) return false
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
  }, [flagInfos, filterEnabled, filterSource, searchQuery])

  const stats = useMemo(() => ({
    total: flagInfos.length,
    enabled: flagInfos.filter(f => f.value).length,
    disabled: flagInfos.filter(f => !f.value).length,
    hardcoded: flagInfos.filter(f => f.source === 'hardcoded').length,
    envConfigured: flagInfos.filter(f => f.source === 'env').length,
  }), [flagInfos])

  const sourceColors: Record<FlagSource, { bg: string; text: string; label: string }> = {
    hardcoded: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Hardcoded' },
    env: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Environment' },
    default: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', label: 'Default' },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-dark-app dark:to-dark-card">
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <PageHeader />
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 border-l-4 border-purple-500 dark:border-purple-400 mb-4 border-r border-t border-b border-transparent dark:border-r-dark-border dark:border-t-dark-border dark:border-b-dark-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                  Feature Flags Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
                  View effective flag values and understand why features are enabled or hidden.
                </p>
              </div>
              <Link
                href="/features"
                className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Feature Explorer
              </Link>
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
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.hardcoded}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Hardcoded</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.envConfigured}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">From Env</p>
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
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-placeholder focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
            </div>
          </div>
        </div>

        {/* Flags List */}
        <div className="space-y-4">
          {filteredFlags.map(flag => {
            const sourceConfig = sourceColors[flag.source]

            return (
              <div
                key={flag.name}
                className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-5 border border-transparent dark:border-dark-border"
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
                    </div>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                      {flag.description}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    flag.value
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {flag.value ? 'ON' : 'OFF'}
                  </div>
                </div>

                {/* Env Var Info */}
                {flag.envVar && (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">Environment Variable:</p>
                    <code className="text-sm font-mono text-gray-800 dark:text-dark-text-secondary">
                      {flag.envVar}={flag.value ? 'true' : 'false'}
                    </code>
                    {flag.source === 'default' && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Using default value. Set the env var to override.
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
                      This flag is hardcoded in lib/featureFlags.ts and cannot be changed via environment variables.
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
                            flag.value
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    {!flag.value && flag.affectedFeatures.length > 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        These features are hidden because this flag is OFF.
                      </p>
                    )}
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
              }}
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* How to Configure */}
        <div className="mt-8 bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-6 border border-transparent dark:border-dark-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">How to Configure Feature Flags</h3>
          <div className="space-y-4 text-sm text-gray-600 dark:text-dark-text-secondary">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-dark-text-primary mb-1">Environment Variables (Recommended)</h4>
              <p>Add to <code className="px-1 py-0.5 bg-gray-100 dark:bg-dark-card-soft rounded">.env.local</code> for local development or configure in Vercel dashboard for production:</p>
              <pre className="mt-2 p-3 bg-gray-800 dark:bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
{`# Enable a feature
NEXT_PUBLIC_FEATURE_BOUNDARY_CASE=true

# Disable a feature
NEXT_PUBLIC_FEATURE_SKIP_COMMIT=false`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 dark:text-dark-text-primary mb-1">Hardcoded Flags</h4>
              <p>Some flags are hardcoded in <code className="px-1 py-0.5 bg-gray-100 dark:bg-dark-card-soft rounded">lib/featureFlags.ts</code> and require code changes to modify. These are typically flags that are disabled due to bugs or incomplete implementations.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
