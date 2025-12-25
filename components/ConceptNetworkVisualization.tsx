'use client'

import { useState, useEffect, useRef } from 'react'
import type { ConceptNode, ConceptEdge, ConceptNetworkResponse } from '@/types/conceptNetwork'

interface NodePosition {
  id: string
  x: number
  y: number
  vx: number
  vy: number
}

const CATEGORY_COLORS: Record<string, string> = {
  mechanics: '#3B82F6',
  thermodynamics: '#EF4444',
  electromagnetism: '#F59E0B',
  optics: '#10B981',
  'modern-physics': '#8B5CF6',
  waves: '#06B6D4',
}

export default function ConceptNetworkVisualization() {
  const [networkData, setNetworkData] = useState<ConceptNetworkResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map())
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const animationFrameRef = useRef<number>()
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    loadNetwork()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadNetwork = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch static concept network (instant, no cost!)
      const response = await fetch('/api/concept-network')
      if (!response.ok) {
        throw new Error('Failed to load concept network')
      }

      const data = await response.json()
      setNetworkData(data)
      initializePositions(data.network.nodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network')
    } finally {
      setIsLoading(false)
    }
  }

  const initializePositions = (nodes: ConceptNode[]) => {
    const positions = new Map<string, NodePosition>()
    const centerX = 400
    const centerY = 300
    const radius = 200

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI
      positions.set(node.id, {
        id: node.id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      })
    })

    setNodePositions(positions)
    startSimulation()
  }

  const startSimulation = () => {
    const simulate = () => {
      if (!networkData) return

      setNodePositions((prevPositions) => {
        const newPositions = new Map(prevPositions)
        const nodes = networkData.network.nodes
        const edges = networkData.network.edges

        // Apply forces
        nodes.forEach((node) => {
          const pos = newPositions.get(node.id)
          if (!pos) return

          let fx = 0
          let fy = 0

          // Repulsion between all nodes
          nodes.forEach((otherNode) => {
            if (node.id === otherNode.id) return
            const otherPos = newPositions.get(otherNode.id)
            if (!otherPos) return

            const dx = pos.x - otherPos.x
            const dy = pos.y - otherPos.y
            const distSq = dx * dx + dy * dy
            const dist = Math.sqrt(distSq)

            if (dist > 0) {
              const repulsion = 3000 / distSq
              fx += (dx / dist) * repulsion
              fy += (dy / dist) * repulsion
            }
          })

          // Attraction along edges
          edges.forEach((edge) => {
            if (edge.source === node.id || edge.target === node.id) {
              const otherId = edge.source === node.id ? edge.target : edge.source
              const otherPos = newPositions.get(otherId)
              if (!otherPos) return

              const dx = otherPos.x - pos.x
              const dy = otherPos.y - pos.y
              const dist = Math.sqrt(dx * dx + dy * dy)

              if (dist > 0) {
                const attraction = dist * 0.01 * edge.strength
                fx += (dx / dist) * attraction
                fy += (dy / dist) * attraction
              }
            }
          })

          // Center gravity
          const centerX = 400
          const centerY = 300
          const dx = centerX - pos.x
          const dy = centerY - pos.y
          fx += dx * 0.001
          fy += dy * 0.001

          // Update velocity and position
          pos.vx = (pos.vx + fx) * 0.85 // Damping
          pos.vy = (pos.vy + fy) * 0.85
          pos.x += pos.vx
          pos.y += pos.vy

          newPositions.set(node.id, pos)
        })

        return newPositions
      })

      animationFrameRef.current = requestAnimationFrame(simulate)
    }

    // Run simulation for 3 seconds
    simulate()
    setTimeout(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const getFilteredNodes = () => {
    if (!networkData) return []
    if (!selectedCategory) return networkData.network.nodes
    return networkData.network.nodes.filter(n => n.category === selectedCategory)
  }

  const getFilteredEdges = () => {
    if (!networkData) return []
    const filteredNodeIds = new Set(getFilteredNodes().map(n => n.id))
    return networkData.network.edges.filter(
      e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Loading concept network...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadNetwork}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!networkData) return null

  const filteredNodes = getFilteredNodes()
  const filteredEdges = getFilteredEdges()

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-gray-900">
              Physics Concept Network
            </h2>
            <button
              onClick={() => {
                localStorage.removeItem('concept-network-cache')
                localStorage.removeItem('concept-network-cache-timestamp')
                loadNetwork()
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300"
            >
              Refresh Network
            </button>
          </div>
          <p className="text-gray-600">
            Explore how IIT-JEE Physics concepts interconnect and build on each other
          </p>
        </div>

        {/* Category Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            All Topics ({networkData.network.nodes.length})
          </button>
          {networkData.categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
              style={
                selectedCategory === category.id
                  ? { backgroundColor: category.color }
                  : {}
              }
            >
              {category.name} ({category.conceptCount})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visualization */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg border-2 border-gray-300 overflow-hidden">
              <svg
                ref={svgRef}
                width="800"
                height="600"
                className="w-full"
                viewBox="0 0 800 600"
              >
                {/* Edges */}
                <g>
                  {filteredEdges.map((edge, index) => {
                    const sourcePos = nodePositions.get(edge.source)
                    const targetPos = nodePositions.get(edge.target)
                    if (!sourcePos || !targetPos) return null

                    const isHighlighted =
                      hoveredNode === edge.source || hoveredNode === edge.target

                    return (
                      <line
                        key={`${edge.source}-${edge.target}-${index}`}
                        x1={sourcePos.x}
                        y1={sourcePos.y}
                        x2={targetPos.x}
                        y2={targetPos.y}
                        stroke={isHighlighted ? '#3B82F6' : '#D1D5DB'}
                        strokeWidth={isHighlighted ? 2 : 1}
                        strokeOpacity={edge.strength}
                        markerEnd={edge.relationship === 'prerequisite' ? 'url(#arrowhead)' : undefined}
                      />
                    )
                  })}
                </g>

                {/* Arrow marker for prerequisite edges */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#D1D5DB" />
                  </marker>
                </defs>

                {/* Nodes */}
                <g>
                  {filteredNodes.map((node) => {
                    const pos = nodePositions.get(node.id)
                    if (!pos) return null

                    const isHovered = hoveredNode === node.id
                    const isSelected = selectedNode?.id === node.id
                    const nodeColor = CATEGORY_COLORS[node.category] || '#6B7280'

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer"
                      >
                        <circle
                          r={isHovered || isSelected ? 12 : 8}
                          fill={nodeColor}
                          stroke="white"
                          strokeWidth={isHovered || isSelected ? 3 : 2}
                          className="transition-all"
                        />
                        {(isHovered || isSelected) && (
                          <text
                            y={-18}
                            textAnchor="middle"
                            className="text-xs font-semibold fill-gray-900 pointer-events-none"
                            style={{ fontSize: '10px' }}
                          >
                            {node.name}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Legend</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-gray-400"></div>
                  <span className="text-gray-700">Related</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-gray-400"></div>
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <polygon points="0 4, 12 4, 6 10" fill="#9CA3AF" />
                  </svg>
                  <span className="text-gray-700">Prerequisite</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="lg:col-span-1">
            {selectedNode ? (
              <div className="bg-white border-2 border-gray-300 rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedNode.name}
                  </h3>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[selectedNode.category] }}
                    >
                      {selectedNode.category}
                    </span>
                    <span
                      className={`ml-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedNode.difficulty === 'basic'
                          ? 'bg-green-100 text-green-800'
                          : selectedNode.difficulty === 'intermediate'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedNode.difficulty}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700">{selectedNode.description}</p>

                  {selectedNode.prerequisites.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Prerequisites:</h4>
                      <ul className="space-y-1">
                        {selectedNode.prerequisites.map((prereqId) => {
                          const prereq = networkData.network.nodes.find(n => n.id === prereqId)
                          return prereq ? (
                            <li
                              key={prereqId}
                              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                              onClick={() => setSelectedNode(prereq)}
                            >
                              → {prereq.name}
                            </li>
                          ) : null
                        })}
                      </ul>
                    </div>
                  )}

                  {networkData.network.edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .filter(e => e.relationship !== 'prerequisite' || e.target === selectedNode.id)
                    .length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Connections:</h4>
                      <ul className="space-y-1">
                        {networkData.network.edges
                          .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                          .map((edge, idx) => {
                            const otherId = edge.source === selectedNode.id ? edge.target : edge.source
                            const otherNode = networkData.network.nodes.find(n => n.id === otherId)
                            if (!otherNode) return null

                            return (
                              <li key={idx} className="text-xs text-gray-600">
                                <span className="font-medium">{edge.relationship}:</span>{' '}
                                <span
                                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                                  onClick={() => setSelectedNode(otherNode)}
                                >
                                  {otherNode.name}
                                </span>
                              </li>
                            )
                          })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-600">
                  Click on a concept to see details and connections
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
