export interface VariationRequest {
  problemText: string
  coreConcept?: string
}

export interface ProblemVariation {
  problemStatement: string
  whyDifferent: string // Brief explanation of what changed
}

export interface VariationResponse {
  variations: ProblemVariation[]
}
