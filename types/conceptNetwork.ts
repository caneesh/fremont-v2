export interface ConceptNode {
  id: string
  name: string
  category: 'mechanics' | 'thermodynamics' | 'electromagnetism' | 'optics' | 'modern-physics' | 'waves'
  description: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
  prerequisites: string[] // IDs of prerequisite concepts
}

export interface ConceptEdge {
  source: string // concept ID
  target: string // concept ID
  relationship: 'prerequisite' | 'related' | 'builds-on' | 'applies-to'
  strength: number // 0-1, how strong the connection is
  description?: string // Optional: why these concepts are connected
}

export interface ConceptNetwork {
  nodes: ConceptNode[]
  edges: ConceptEdge[]
}

export interface ConceptNetworkResponse {
  network: ConceptNetwork
  categories: {
    id: string
    name: string
    color: string
    conceptCount: number
  }[]
}
