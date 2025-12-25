'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { CONCEPT_NETWORK_DATA } from '@/lib/conceptNetworkData'
import { conceptMasteryService } from '@/lib/conceptMasteryService'
import type { ConceptMasteryData, MasteryLevel } from '@/types/conceptMastery'
import type { ConceptNode as NetworkConceptNode } from '@/types/conceptNetwork'

interface ConceptMapVisualizationProps {
  studentId?: string
  onNodeClick?: (conceptId: string, masteryData: ConceptMasteryData | null) => void
}

// Mastery-based node colors
const MASTERY_COLORS = {
  high: '#10B981',    // Green
  medium: '#F59E0B',  // Yellow
  low: '#EF4444',     // Red
  none: '#9CA3AF',    // Gray
}

// Category colors for edges
const CATEGORY_COLORS: Record<string, string> = {
  mechanics: '#3B82F6',
  thermodynamics: '#EF4444',
  electromagnetism: '#F59E0B',
  optics: '#10B981',
  'modern-physics': '#8B5CF6',
  waves: '#06B6D4',
}

export default function ConceptMapVisualization({
  studentId,
  onNodeClick,
}: ConceptMapVisualizationProps) {
  const [masteryData, setMasteryData] = useState<Record<string, ConceptMasteryData>>({})
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Get student ID from localStorage if not provided
  const effectiveStudentId =
    studentId || (typeof window !== 'undefined' && localStorage.getItem('physiscaffold_user')) || 'anonymous'

  // Load mastery data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = conceptMasteryService.getAllMasteryData(effectiveStudentId)
      setMasteryData(data)
    }
  }, [effectiveStudentId])

  // Get mastery level for a concept
  const getMasteryLevel = useCallback(
    (conceptId: string): MasteryLevel => {
      const data = masteryData[conceptId]
      if (!data || data.attempts.length === 0) return 'none'
      return conceptMasteryService.getMasteryLevel(data.masteryScore)
    },
    [masteryData]
  )

  // Get mastery score for a concept
  const getMasteryScore = useCallback(
    (conceptId: string): number => {
      const data = masteryData[conceptId]
      return data?.masteryScore || 0
    },
    [masteryData]
  )

  // Create React Flow nodes from concept network
  const nodes: Node[] = useMemo(() => {
    return CONCEPT_NETWORK_DATA.network.nodes.map((concept, index) => {
      const masteryLevel = getMasteryLevel(concept.id)
      const masteryScore = getMasteryScore(concept.id)
      const isSelected = selectedNode === concept.id
      const isCategoryFiltered = selectedCategory && concept.category !== selectedCategory

      // Simple hierarchical layout
      const row = Math.floor(index / 6)
      const col = index % 6
      const x = col * 250
      const y = row * 150

      return {
        id: concept.id,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="flex flex-col items-center gap-1 p-2">
              <div className="font-semibold text-sm text-center">{concept.name}</div>
              {masteryData[concept.id] && (
                <div className="text-xs text-gray-600">
                  {Math.round(masteryScore * 100)}%
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: MASTERY_COLORS[masteryLevel],
          color: masteryLevel === 'none' ? '#374151' : '#ffffff',
          border: isSelected ? '3px solid #1F2937' : '2px solid #ffffff',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          opacity: isCategoryFiltered ? 0.2 : 1,
          minWidth: '120px',
        },
      }
    })
  }, [masteryData, getMasteryLevel, getMasteryScore, selectedNode, selectedCategory])

  // Create React Flow edges from concept network
  const edges: Edge[] = useMemo(() => {
    return CONCEPT_NETWORK_DATA.network.edges.map((edge, index) => {
      // Get category of source node for edge color
      const sourceNode = CONCEPT_NETWORK_DATA.network.nodes.find((n) => n.id === edge.source)
      const edgeColor = sourceNode ? CATEGORY_COLORS[sourceNode.category] : '#9CA3AF'

      return {
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: edge.relationship === 'prerequisite',
        style: {
          stroke: edgeColor,
          strokeWidth: 2,
          opacity: 0.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
      }
    })
  }, [])

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes)
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges)

  // Update nodes when mastery data changes
  useEffect(() => {
    setNodes(nodes)
  }, [nodes, setNodes])

  // Update edges when needed
  useEffect(() => {
    setEdges(edges)
  }, [edges, setEdges])

  // Handle node click
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id)
      const data = masteryData[node.id] || null
      onNodeClick?.(node.id, data)
    },
    [masteryData, onNodeClick]
  )

  // Category filter handler
  const handleCategoryFilter = (categoryId: string | null) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId)
  }

  // Get statistics
  const stats = useMemo(() => {
    return conceptMasteryService.getStatistics(effectiveStudentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStudentId])

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const masteryLevel = getMasteryLevel(node.id)
            return MASTERY_COLORS[masteryLevel]
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        {/* Legend Panel */}
        <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Mastery Level</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: MASTERY_COLORS.high }}></div>
              <span className="text-xs text-gray-700">High (≥75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: MASTERY_COLORS.medium }}></div>
              <span className="text-xs text-gray-700">Medium (40-75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: MASTERY_COLORS.low }}></div>
              <span className="text-xs text-gray-700">Low (&lt;40%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: MASTERY_COLORS.none }}></div>
              <span className="text-xs text-gray-700">No Data</span>
            </div>
          </div>
        </Panel>

        {/* Stats Panel */}
        {stats.totalConcepts > 0 && (
          <Panel position="top-left" className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <h3 className="font-semibold text-sm mb-3 text-gray-900">Your Progress</h3>
            <div className="space-y-2 text-xs text-gray-700">
              <div>Concepts Practiced: {stats.totalConcepts}</div>
              <div className="text-green-600 font-medium">Strong: {stats.strongConcepts}</div>
              <div className="text-yellow-600 font-medium">Medium: {stats.mediumConcepts}</div>
              <div className="text-red-600 font-medium">Weak: {stats.weakConcepts}</div>
              <div className="pt-2 border-t border-gray-200">
                Average Mastery: {Math.round(stats.avgMastery * 100)}%
              </div>
            </div>
          </Panel>
        )}

        {/* Category Filter Panel */}
        <Panel position="bottom-left" className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            {CONCEPT_NETWORK_DATA.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryFilter(category.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'ring-2 ring-gray-900 scale-105'
                    : 'hover:scale-105'
                }`}
                style={{
                  background: selectedCategory === category.id ? category.color : `${category.color}40`,
                  color: selectedCategory === category.id ? '#ffffff' : category.color,
                }}
              >
                {category.name} ({category.conceptCount})
              </button>
            ))}
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        </Panel>
      </ReactFlow>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900">
              {CONCEPT_NETWORK_DATA.network.nodes.find((n) => n.id === selectedNode)?.name}
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            {CONCEPT_NETWORK_DATA.network.nodes.find((n) => n.id === selectedNode)?.description}
          </p>
          {masteryData[selectedNode] ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Mastery:</span>{' '}
                {Math.round(masteryData[selectedNode].masteryScore * 100)}%
              </div>
              <div>
                <span className="font-medium">Attempts:</span>{' '}
                {masteryData[selectedNode].attempts.length}
              </div>
              <div>
                <span className="font-medium">Last Practiced:</span>{' '}
                {new Date(masteryData[selectedNode].lastUpdated).toLocaleDateString()}
              </div>
              {getMasteryLevel(selectedNode) === 'low' && (
                <button className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
                  Start Repair Mode
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No practice data yet. Solve problems to build mastery!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
