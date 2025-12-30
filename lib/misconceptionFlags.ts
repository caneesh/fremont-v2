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
      /(?=.*(friction|drag))(?=.*(energy|conservation))/i,
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
  {
    id: 'sign-convention-confusion',
    title: 'Sign convention or direction confusion',
    question: 'What direction did you choose as positive, and are all vector components consistent with that choice?',
    tags: ['sign', 'direction', 'vector'],
    triggers: [
      /sign\s+convention/i,
      /positive\s+direction/i,
      /negative\s+direction/i,
      /take\s+.*\s+as\s+positive/i,
    ],
  },
  {
    id: 'reference-frame-mixing',
    title: 'Mixing reference frames',
    question: 'Which frame are you solving in? If it is non-inertial, what additional effects or forces must be included?',
    tags: ['reference-frame', 'frame', 'non-inertial'],
    triggers: [
      /frame\s+of\s+reference/i,
      /non[-\s]?inertial/i,
      /rotating\s+frame/i,
      /accelerating\s+frame/i,
    ],
  },
  {
    id: 'missing-forces-fbd',
    title: 'Forgetting a force in the free-body diagram',
    question: 'List all external forces on the body. Are any contact forces or constraints missing?',
    tags: ['force', 'free-body', 'constraint', 'tension', 'normal', 'friction'],
    triggers: [
      /only\s+force\s+is/i,
      /forces\s+are\s+only/i,
      /no\s+other\s+force/i,
    ],
  },
  {
    id: 'momentum-conservation-conditions',
    title: 'Using momentum conservation without checking conditions',
    question: 'Is the net external impulse zero over the interval? If not, how should momentum be handled?',
    tags: ['momentum', 'impulse', 'external'],
    triggers: [
      /conservation\s+of\s+momentum/i,
      /momentum\s+is\s+conserved/i,
      /momentum\s+conserved/i,
    ],
  },
  {
    id: 'component-resolution',
    title: 'Vector component mix-up',
    question: 'Are your sine/cosine components aligned with the axes you chose?',
    tags: ['vector', 'components', 'direction'],
    triggers: [
      /resolve\s+into\s+components/i,
      /component\s+along/i,
      /sin\s*\(|cos\s*\(/i,
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
