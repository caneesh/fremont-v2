import type { WarningBeacon } from '@/types/scaffold'

export interface MisconceptionFlag {
  id: string
  title: string
  question: string
  tags: string[]
  triggers: RegExp[]
}

const MISCONCEPTION_FLAGS: MisconceptionFlag[] = [
  {
    id: 'centripetal-force-extra',
    title: 'Centripetal force as a separate force',
    question: 'In circular motion, is "centripetal force" a separate force, or the net inward effect of real forces? List the real forces acting.',
    tags: ['centripetal', 'circular', 'force', 'frame'],
    triggers: [
      /centripetal\s+force/i,
      /new\s+force/i,
      /extra\s+force/i,
    ],
  },
  {
    id: 'normal-force-equals-weight',
    title: 'Normal force always equals weight',
    question: 'Does the normal force always equal weight? Which forces act perpendicular to the surface in this specific setup?',
    tags: ['normal', 'contact', 'incline', 'force'],
    triggers: [
      /normal\s+force\s*(=|equals)\s*mg/i,
      /n\s*(=|equals)\s*mg/i,
    ],
  },
  {
    id: 'energy-conservation-with-friction',
    title: 'Energy conservation with non-conservative forces',
    question: 'If friction or drag is present, what term accounts for the energy lost or gained? How would you write the energy balance then?',
    tags: ['energy', 'friction', 'work', 'dissipation'],
    triggers: [
      /conservation\s+of\s+energy/i,
      /energy\s+is\s+conserved/i,
    ],
  },
  {
    id: 'constant-acceleration-assumption',
    title: 'Assuming constant acceleration without justification',
    question: 'What in the problem guarantees constant acceleration? If acceleration changes, which principle would you use instead?',
    tags: ['kinematics', 'acceleration', 'motion'],
    triggers: [
      /suvat/i,
      /constant\s+acceleration/i,
      /u\s*v\s*t/i,
    ],
  },
]

interface MisconceptionDetectionInput {
  answer: string
  warningBeacon?: WarningBeacon
}

export function detectMisconceptionFlag({
  answer,
  warningBeacon,
}: MisconceptionDetectionInput): MisconceptionFlag | null {
  const trimmed = answer.trim()
  if (!trimmed) return null

  const matches = MISCONCEPTION_FLAGS.filter(flag =>
    flag.triggers.some(trigger => trigger.test(trimmed))
  )

  if (matches.length === 0) return null

  if (warningBeacon?.tag) {
    const tagged = matches.find(flag => flag.tags.includes(warningBeacon.tag))
    if (tagged) return tagged
  }

  return matches[0]
}
