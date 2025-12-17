export interface DialogueLine {
  speaker: 'Alex' | 'Prof'
  text: string
}

export interface FeynmanScript {
  title: string
  dialogue: DialogueLine[]
  concept: string
  analogy?: string
}

export interface FeynmanRequest {
  concept: string
  context: string
  stepTitle?: string
  problemStatement?: string
}

export interface AudioSegment {
  speaker: 'Alex' | 'Prof'
  text: string
  audioUrl?: string
  duration?: number
}
