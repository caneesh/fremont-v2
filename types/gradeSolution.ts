// Types for the Smart Solution Submission / Grade Solution API

export type GradeStatus = 'SUCCESS' | 'MINOR_SLIP' | 'CONCEPTUAL_GAP'

export type NextActionType = 'OPTIMIZE' | 'FIX_LINE' | 'REVIEW_CONCEPT'

export interface NextAction {
  type: NextActionType
  label: string
  targetStepId?: number // Optional: which step to review
  conceptId?: string // Optional: which concept to review
}

export interface GradeSolutionRequest {
  solution: string // User's solution text (LaTeX/Markdown)
  problemContext: {
    problemText: string
    domain: string
    subdomain: string
    expectedApproach?: string // Brief description of correct approach
    keyEquations?: string[] // Key equations that should appear
    concepts?: Array<{ id: string; name: string }>
  }
  submissionType: 'text' | 'handwriting'
}

export interface GradeSolutionResponse {
  status: GradeStatus
  feedback_markdown: string
  highlight_location: string | null // Quote from user's answer to highlight
  next_action: NextAction
  confidence: number // 0-1 confidence in the grading
  detailedAnalysis?: {
    physicsCorrect: boolean
    mathCorrect: boolean
    approachCorrect: boolean
    missingSteps?: string[]
    errors?: Array<{
      type: 'sign' | 'algebra' | 'units' | 'concept' | 'approach'
      description: string
      location?: string
    }>
  }
}

// Autocomplete suggestion type
export interface AutocompleteSuggestion {
  trigger: string // What the user types (e.g., "\sum")
  suggestion: string // What to suggest
  description: string // Tooltip description
  category: 'mechanics' | 'electromagnetism' | 'thermodynamics' | 'optics' | 'modern'
}

// Common physics autocomplete suggestions
export const PHYSICS_AUTOCOMPLETE: AutocompleteSuggestion[] = [
  // Mechanics
  { trigger: '\\sum F', suggestion: '\\sum \\vec{F} = m\\vec{a}', description: "Newton's Second Law", category: 'mechanics' },
  { trigger: '\\sum', suggestion: '\\sum F = ma', description: 'Sum of forces', category: 'mechanics' },
  { trigger: '\\vec{F}', suggestion: '\\vec{F} = -kx', description: "Hooke's Law", category: 'mechanics' },
  { trigger: 'KE', suggestion: 'KE = \\frac{1}{2}mv^2', description: 'Kinetic Energy', category: 'mechanics' },
  { trigger: 'PE', suggestion: 'PE = mgh', description: 'Potential Energy', category: 'mechanics' },
  { trigger: '\\omega', suggestion: '\\omega = \\frac{v}{r}', description: 'Angular velocity', category: 'mechanics' },
  { trigger: '\\tau', suggestion: '\\tau = r \\times F', description: 'Torque', category: 'mechanics' },
  { trigger: 'I =', suggestion: 'I = \\int r^2 dm', description: 'Moment of inertia', category: 'mechanics' },
  { trigger: 'L =', suggestion: 'L = I\\omega', description: 'Angular momentum', category: 'mechanics' },
  { trigger: 'centri', suggestion: 'F_c = \\frac{mv^2}{r}', description: 'Centripetal force', category: 'mechanics' },

  // Electromagnetism
  { trigger: '\\vec{E}', suggestion: '\\vec{E} = \\frac{kq}{r^2}\\hat{r}', description: 'Electric field', category: 'electromagnetism' },
  { trigger: '\\vec{B}', suggestion: '\\vec{B} = \\frac{\\mu_0 I}{2\\pi r}', description: 'Magnetic field', category: 'electromagnetism' },
  { trigger: 'Gauss', suggestion: '\\oint \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{enc}}{\\epsilon_0}', description: "Gauss's Law", category: 'electromagnetism' },
  { trigger: 'Faraday', suggestion: '\\mathcal{E} = -\\frac{d\\Phi_B}{dt}', description: "Faraday's Law", category: 'electromagnetism' },
  { trigger: 'Coulomb', suggestion: 'F = \\frac{kq_1q_2}{r^2}', description: "Coulomb's Law", category: 'electromagnetism' },

  // Thermodynamics
  { trigger: 'PV', suggestion: 'PV = nRT', description: 'Ideal gas law', category: 'thermodynamics' },
  { trigger: '\\Delta U', suggestion: '\\Delta U = Q - W', description: 'First law of thermodynamics', category: 'thermodynamics' },
  { trigger: 'entropy', suggestion: '\\Delta S = \\frac{Q}{T}', description: 'Entropy change', category: 'thermodynamics' },

  // Optics
  { trigger: 'lens', suggestion: '\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}', description: 'Lens formula', category: 'optics' },
  { trigger: 'mirror', suggestion: '\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}', description: 'Mirror formula', category: 'optics' },
  { trigger: 'snell', suggestion: 'n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2', description: "Snell's Law", category: 'optics' },

  // Modern Physics
  { trigger: 'E = mc', suggestion: 'E = mc^2', description: 'Mass-energy equivalence', category: 'modern' },
  { trigger: 'de Broglie', suggestion: '\\lambda = \\frac{h}{p}', description: 'de Broglie wavelength', category: 'modern' },
  { trigger: 'Planck', suggestion: 'E = hf', description: "Planck's equation", category: 'modern' },
]

export type SubmissionTab = 'text' | 'scan'

export type ScanState = 'idle' | 'uploading' | 'scanning' | 'transcribed' | 'grading' | 'complete'
