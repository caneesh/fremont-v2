/**
 * Simulation Service
 * Physics calculations and parameter extraction for What-If simulations
 */

import type {
  SimulationType,
  ProjectileParams,
  ProjectileResults,
  InclineParams,
  InclineResults,
  ExtractedParams,
} from '@/types/simulation'
import type { ScaffoldData } from '@/types/scaffold'

const GRAVITY = 9.8 // m/s²

/**
 * Detect simulation type from problem text and domain
 */
export function detectSimulationType(data: ScaffoldData): SimulationType {
  const problemLower = data.problem.toLowerCase()
  const subdomainLower = data.subdomain?.toLowerCase() || ''

  // Projectile motion keywords
  const projectileKeywords = [
    'projectile', 'launched', 'thrown', 'fired', 'trajectory',
    'range', 'maximum height', 'angle of projection', 'horizontal',
    'ball thrown', 'stone thrown', 'object launched'
  ]

  // Incline plane keywords
  const inclineKeywords = [
    'incline', 'inclined plane', 'slope', 'ramp', 'wedge',
    'block on', 'sliding down', 'friction', 'coefficient of friction',
    'angle of inclination', 'rough surface'
  ]

  // Check for projectile motion
  if (
    subdomainLower.includes('projectile') ||
    projectileKeywords.some(kw => problemLower.includes(kw))
  ) {
    return 'projectile'
  }

  // Check for incline plane
  if (
    subdomainLower.includes('incline') ||
    subdomainLower.includes('friction') ||
    inclineKeywords.some(kw => problemLower.includes(kw))
  ) {
    return 'incline'
  }

  return 'unsupported'
}

/**
 * Extract numerical parameters from problem text
 */
export function extractParameters(data: ScaffoldData): ExtractedParams {
  const type = detectSimulationType(data)
  const problemText = data.problem

  // Common regex patterns for extracting values
  const patterns = {
    velocity: /(\d+(?:\.\d+)?)\s*(?:m\/s|ms⁻¹|meters?\s*per\s*second)/gi,
    angle: /(\d+(?:\.\d+)?)\s*(?:°|degrees?|deg)/gi,
    mass: /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)/gi,
    height: /(?:height|h)\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)\s*(?:m|meters?)/gi,
    length: /(?:length|l|distance)\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)\s*(?:m|meters?)/gi,
    friction: /(?:coefficient\s*(?:of\s*)?friction|μ|mu)\s*(?:=|is)?\s*(\d+(?:\.\d+)?)/gi,
    gravity: /g\s*=\s*(\d+(?:\.\d+)?)/gi,
  }

  const extractFirst = (pattern: RegExp, text: string): number | undefined => {
    const match = pattern.exec(text)
    return match ? parseFloat(match[1]) : undefined
  }

  const extractAll = (pattern: RegExp, text: string): number[] => {
    const matches: number[] = []
    let match
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(text)) !== null) {
      matches.push(parseFloat(match[1]))
    }
    return matches
  }

  const params: Partial<ProjectileParams & InclineParams> = {
    gravity: extractFirst(patterns.gravity, problemText) || GRAVITY,
  }

  if (type === 'projectile') {
    const velocities = extractAll(patterns.velocity, problemText)
    const angles = extractAll(patterns.angle, problemText)
    const heights = extractAll(patterns.height, problemText)

    params.initialVelocity = velocities[0] || 20
    params.launchAngle = angles[0] || 45
    params.initialHeight = heights[0] || 0
  }

  if (type === 'incline') {
    const masses = extractAll(patterns.mass, problemText)
    const angles = extractAll(patterns.angle, problemText)
    const frictions = extractAll(patterns.friction, problemText)
    const lengths = extractAll(patterns.length, problemText)
    const velocities = extractAll(patterns.velocity, problemText)

    params.mass = masses[0] || 5
    params.angle = angles[0] || 30
    params.frictionCoeff = frictions[0] || 0.2
    params.inclineLength = lengths[0] || 10
    params.initialVelocity = velocities[0] || 0
  }

  return { type, params }
}

/**
 * Calculate projectile motion trajectory and results
 */
export function calculateProjectile(params: ProjectileParams): ProjectileResults {
  const { initialVelocity, launchAngle, initialHeight, gravity } = params
  const angleRad = (launchAngle * Math.PI) / 180

  const v0x = initialVelocity * Math.cos(angleRad)
  const v0y = initialVelocity * Math.sin(angleRad)

  // Time of flight (using quadratic formula for y = 0)
  // y = h0 + v0y*t - 0.5*g*t^2 = 0
  const discriminant = v0y * v0y + 2 * gravity * initialHeight
  const timeOfFlight = (v0y + Math.sqrt(discriminant)) / gravity

  // Maximum height
  const maxHeight = initialHeight + (v0y * v0y) / (2 * gravity)

  // Range
  const range = v0x * timeOfFlight

  // Final velocity
  const vfx = v0x
  const vfy = -Math.sqrt(v0y * v0y + 2 * gravity * initialHeight)
  const finalVelocity = Math.sqrt(vfx * vfx + vfy * vfy)

  // Generate trajectory points
  const trajectory: ProjectileResults['trajectory'] = []
  const numPoints = 100
  const dt = timeOfFlight / numPoints

  for (let i = 0; i <= numPoints; i++) {
    const t = i * dt
    const x = v0x * t
    const y = initialHeight + v0y * t - 0.5 * gravity * t * t
    if (y >= 0) {
      trajectory.push({ x, y, t })
    }
  }

  return {
    maxHeight,
    range,
    timeOfFlight,
    finalVelocity,
    trajectory,
  }
}

/**
 * Calculate inclined plane motion and results
 */
export function calculateIncline(params: InclineParams): InclineResults {
  const { mass, angle, frictionCoeff, initialVelocity, inclineLength, gravity } = params
  const angleRad = (angle * Math.PI) / 180

  // Forces
  const weight = mass * gravity
  const normalForce = weight * Math.cos(angleRad)
  const gravityComponent = weight * Math.sin(angleRad)
  const maxStaticFriction = frictionCoeff * normalForce

  // Determine if it slides
  const willSlide = gravityComponent > maxStaticFriction || initialVelocity !== 0

  // Kinetic friction (same as static for simplicity)
  const frictionForce = willSlide ? frictionCoeff * normalForce : gravityComponent

  // Net force and acceleration (down the slope is positive)
  let netForce: number
  let acceleration: number

  if (initialVelocity > 0) {
    // Moving up the incline - friction acts downward
    netForce = -gravityComponent - frictionForce
    acceleration = netForce / mass
  } else if (initialVelocity < 0 || willSlide) {
    // Moving down or starting to slide - friction acts upward
    netForce = gravityComponent - frictionForce
    acceleration = netForce / mass
  } else {
    // Not moving and won't slide
    netForce = 0
    acceleration = 0
  }

  // Time to stop (if decelerating)
  let timeToStop: number | undefined
  if (initialVelocity !== 0 && acceleration * initialVelocity < 0) {
    timeToStop = Math.abs(initialVelocity / acceleration)
  }

  // Generate trajectory
  const trajectory: InclineResults['trajectory'] = []
  const totalTime = timeToStop || 3 // 3 seconds default
  const numPoints = 100
  const dt = totalTime / numPoints

  let x = 0 // position along incline
  let v = initialVelocity

  for (let i = 0; i <= numPoints; i++) {
    const t = i * dt

    // Stop if reached end of incline or stopped
    if (x >= inclineLength || (v <= 0 && initialVelocity >= 0 && acceleration <= 0)) {
      break
    }

    const xDisplay = x * Math.cos(angleRad)
    const yDisplay = x * Math.sin(angleRad)

    trajectory.push({ x: xDisplay, y: yDisplay, t, v })

    // Update position and velocity
    v += acceleration * dt
    x += v * dt + 0.5 * acceleration * dt * dt

    if (x < 0) x = 0 // Can't go past starting point
  }

  return {
    acceleration: Math.abs(acceleration),
    normalForce,
    frictionForce: Math.abs(frictionForce),
    netForce: Math.abs(netForce),
    willSlide,
    timeToStop,
    finalVelocity: v,
    trajectory,
  }
}

/**
 * Default parameters for simulations
 */
export const defaultProjectileParams: ProjectileParams = {
  initialVelocity: 20,
  launchAngle: 45,
  initialHeight: 0,
  gravity: GRAVITY,
}

export const defaultInclineParams: InclineParams = {
  mass: 5,
  angle: 30,
  frictionCoeff: 0.2,
  initialVelocity: 0,
  inclineLength: 10,
  gravity: GRAVITY,
}
