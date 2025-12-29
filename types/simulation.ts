/**
 * What-If Simulation Types
 * Lightweight physics simulations for building intuition after solving problems
 */

export type SimulationType = 'projectile' | 'incline' | 'unsupported'

/**
 * Parameters for projectile motion simulation
 */
export interface ProjectileParams {
  initialVelocity: number      // m/s
  launchAngle: number          // degrees
  initialHeight: number        // m
  gravity: number              // m/s² (default 9.8)
}

/**
 * Results for projectile motion
 */
export interface ProjectileResults {
  maxHeight: number            // m
  range: number                // m
  timeOfFlight: number         // s
  finalVelocity: number        // m/s
  trajectory: { x: number; y: number; t: number }[]
}

/**
 * Parameters for inclined plane simulation
 */
export interface InclineParams {
  mass: number                 // kg
  angle: number                // degrees
  frictionCoeff: number        // dimensionless (0 to 1)
  initialVelocity: number      // m/s (positive = up the incline)
  inclineLength: number        // m
  gravity: number              // m/s² (default 9.8)
}

/**
 * Results for inclined plane
 */
export interface InclineResults {
  acceleration: number         // m/s²
  normalForce: number          // N
  frictionForce: number        // N
  netForce: number             // N
  willSlide: boolean
  timeToStop?: number          // s (if decelerating)
  finalVelocity?: number       // m/s (after given time)
  trajectory: { x: number; y: number; t: number; v: number }[]
}

/**
 * Common simulation state
 */
export interface SimulationState {
  isPlaying: boolean
  currentTime: number
  playbackSpeed: number
}

/**
 * Extracted parameters from scaffold
 */
export interface ExtractedParams {
  type: SimulationType
  params: Partial<ProjectileParams & InclineParams>
  studentAnswer?: {
    value: number
    unit: string
    isCorrect: boolean
  }
}
