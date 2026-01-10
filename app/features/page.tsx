'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FEATURE_REGISTRY,
  CATEGORY_LABELS,
  STATUS_CONFIG,
  isFeatureActive,
  type FeatureCategory,
  type FeatureStatus,
  type FeatureDefinition,
} from '@/lib/featureRegistry'
import PageHeader from '@/components/PageHeader'
import MobileNav from '@/components/MobileNav'

export default function FeatureExplorerPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus | 'all'>('all')
  const [showRouteOnly, setShowRouteOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFeatures = useMemo(() => {
    return FEATURE_REGISTRY.filter(feature => {
      if (selectedCategory !== 'all' && feature.category !== selectedCategory) return false
      if (selectedStatus !== 'all' && feature.status !== selectedStatus) return false
      if (showRouteOnly && !feature.hasRoute) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          feature.name.toLowerCase().includes(query) ||
          feature.description.toLowerCase().includes(query) ||
          feature.id.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [selectedCategory, selectedStatus, showRouteOnly, searchQuery])

  const categories = Object.keys(CATEGORY_LABELS) as FeatureCategory[]
  const statuses = Object.keys(STATUS_CONFIG) as FeatureStatus[]

  const stats = useMemo(() => ({
    total: FEATURE_REGISTRY.length,
    implemented: FEATURE_REGISTRY.filter(f => f.status === 'IMPLEMENTED').length,
    partial: FEATURE_REGISTRY.filter(f => f.status === 'PARTIAL').length,
    disabled: FEATURE_REGISTRY.filter(f => f.status === 'DISABLED').length,
    withRoutes: FEATURE_REGISTRY.filter(f => f.hasRoute).length,
  }), [])

  const handleFeatureClick = (feature: FeatureDefinition) => {
    if (feature.hasRoute && feature.route && isFeatureActive(feature)) {
      router.push(feature.route)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <PageHeader />
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 border-l-4 border-blue-500 dark:border-accent mb-4 border-r border-t border-b border-transparent dark:border-r-dark-border dark:border-t-dark-border dark:border-b-dark-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                  Feature Explorer
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
                  Browse all features in PhysiScaffold with their implementation status and documentation links.
                </p>
              </div>
              <Link
                href="/features/flags"
                className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                View Feature Flags
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Total Features</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.implemented}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Implemented</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.partial}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Partial</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.disabled}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Disabled</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-4 border border-transparent dark:border-dark-border">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.withRoutes}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">With Routes</p>
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
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-placeholder focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              {/* Category Filter */}
              <div className="w-full md:w-48">
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as FeatureCategory | 'all')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-40">
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as FeatureStatus | 'all')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary"
                >
                  <option value="all">All Statuses</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                  ))}
                </select>
              </div>

              {/* Route Only Toggle */}
              <div className="flex items-end">
                <button
                  onClick={() => setShowRouteOnly(!showRouteOnly)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showRouteOnly
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                  }`}
                >
                  Routes Only
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeatures.map(feature => {
            const statusConfig = STATUS_CONFIG[feature.status]
            const active = isFeatureActive(feature)
            const clickable = feature.hasRoute && feature.route && active

            return (
              <div
                key={feature.id}
                onClick={() => clickable && handleFeatureClick(feature)}
                className={`bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-5 border border-transparent dark:border-dark-border transition-all ${
                  clickable
                    ? 'cursor-pointer hover:shadow-lg dark:hover:shadow-dark-lg hover:border-accent dark:hover:border-accent'
                    : 'opacity-80'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-lg font-semibold ${
                        clickable ? 'text-gray-900 dark:text-dark-text-primary' : 'text-gray-600 dark:text-dark-text-secondary'
                      }`}>
                        {feature.name}
                      </h3>
                      {feature.isNew && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
                          NEW
                        </span>
                      )}
                      {feature.isBeta && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded-full">
                          BETA
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4 line-clamp-2">
                  {feature.description}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-muted rounded">
                    {CATEGORY_LABELS[feature.category]}
                  </span>
                  <div className="flex items-center gap-2">
                    {feature.hasRoute && feature.route && (
                      <span className="text-gray-500 dark:text-dark-text-muted font-mono">
                        {feature.route}
                      </span>
                    )}
                    {!feature.hasRoute && (
                      <span className="text-gray-400 dark:text-dark-text-placeholder italic">
                        embedded
                      </span>
                    )}
                  </div>
                </div>

                {/* Feature Flags */}
                {feature.requiredFlags.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">Required Flags:</p>
                    <div className="flex flex-wrap gap-1">
                      {feature.requiredFlags.map(flag => (
                        <span
                          key={flag}
                          className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs rounded font-mono"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
                  {feature.docsPath ? (
                    <Link
                      href={feature.docsPath}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-accent hover:underline"
                    >
                      View Docs
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-dark-text-placeholder">No docs</span>
                  )}
                  {clickable && (
                    <span className="text-xs text-accent font-medium">
                      Open Feature →
                    </span>
                  )}
                  {!active && feature.hasRoute && (
                    <span className="text-xs text-gray-400 dark:text-dark-text-placeholder italic">
                      (inactive)
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredFeatures.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md border border-transparent dark:border-dark-border">
            <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-dark-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">No features found</h3>
            <p className="text-gray-500 dark:text-dark-text-muted mb-4">Try adjusting your filters</p>
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSelectedStatus('all')
                setShowRouteOnly(false)
                setSearchQuery('')
              }}
              className="text-accent hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-white dark:bg-dark-card rounded-lg shadow-md dark:shadow-dark-md p-6 border border-transparent dark:border-dark-border">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary mb-3">Status Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            {statuses.map(status => {
              const config = STATUS_CONFIG[status]
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
