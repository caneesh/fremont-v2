/**
 * Outline Scaffold Prompt (Phase A)
 *
 * Fast generation (~10-20s) of step list with minimal info.
 * Max tokens: 1500-2500 (kept small for speed)
 */

export const OUTLINE_SYSTEM_PROMPT = `You are an expert IIT-JEE Physics teacher. Generate a COMPACT scaffold outline.

CRITICAL CONSTRAINTS:
- Output ONLY valid JSON, no other text
- Keep responses SHORT - this is an outline, not full content
- Each step goal/task must be 1 sentence max
- Total response must fit in ~1800 tokens

OUTPUT FORMAT:
{
  "tags": {
    "domain": "string",
    "subdomain": "string",
    "patterns": ["string"],
    "difficulty": "basic|intermediate|advanced"
  },
  "concepts": [{"id": "kebab-case", "name": "Display Name"}],
  "steps": [
    {
      "step_id": "s1",
      "title": "Short Title",
      "goal": "One sentence goal.",
      "minimal_task": "Quick question to check understanding?",
      "step_type": "diagram|concept|equation|compute|check",
      "requires_fbd": true/false
    }
  ],
  "pattern_options": [
    {
      "id": "kebab-case-id",
      "name": "Pattern Name",
      "description": "One sentence description",
      "triggers": ["keyword1", "keyword2"]
    }
  ],
  "primary_pattern_id": "kebab-case-id",
  "estimated_time_mins": 15
}`

export function buildOutlinePrompt(problem: string, density: number = 3): string {
  const stepCount = density <= 2 ? '5-7' : density >= 4 ? '3-4' : '4-6'

  return `PROBLEM:
${problem}

TASK: Create a scaffold OUTLINE with ${stepCount} logical steps.

RULES:
1. step_id must be stable strings: "s1", "s2", "s3", etc.
2. step_type must be one of: diagram, concept, equation, compute, check
3. Set requires_fbd=true ONLY for diagram steps involving force analysis
4. Keep ALL text concise - goal and minimal_task are ONE sentence each
5. patterns should identify problem patterns (e.g., "inclined-plane", "pulley-system")
6. concepts should list 3-5 key physics concepts needed

STEP TYPES GUIDE:
- "diagram": Setting up FBD, coordinate system, geometry
- "concept": Applying physics laws, identifying principles
- "equation": Setting up equations, applying formulas
- "compute": Algebraic manipulation, solving
- "check": Sanity check, verification, limiting cases

SCENARIO DETECTION (for diagram steps):
- "wedge" or "block-on-wedge": Block on accelerating wedge, wedge problems
- "incline": Simple inclined plane with fixed surface
- "pulley": Pulley systems with ropes/strings
- "hanging": Objects suspended from ceiling/support
- "rotating": Rotating reference frames, circular motion
- "horizontal": Block on flat surface

PATTERN OPTIONS (for pattern recognition training):
Generate 4-6 pattern_options that include:
1. The CORRECT primary pattern (set as primary_pattern_id)
2. 3-5 plausible DISTRACTOR patterns from similar physics domains

Common physics patterns to choose from:
- conservation-of-momentum: Collisions, explosions, recoil
- conservation-of-energy: Height changes, springs, no friction
- work-energy-theorem: Force over distance, friction present
- newton-laws: Force analysis, acceleration, equilibrium
- kinematics: Motion with constant acceleration
- projectile-motion: 2D motion under gravity
- circular-motion: Rotation, centripetal force
- simple-harmonic-motion: Oscillations, springs, pendulums
- impulse-momentum: Quick impacts, force-time graphs
- rotational-dynamics: Torque, moment of inertia
- friction-analysis: Static/kinetic friction, rough surfaces
- pulley-systems: Tension, connected masses
- inclined-plane: Blocks on slopes

Each pattern needs: id (kebab-case), name (display), description (1 sentence), triggers (2-3 keywords students look for)

Output ONLY the JSON, nothing else.`
}

/**
 * Max tokens for outline generation
 * Slightly higher to accommodate pattern options
 */
export const OUTLINE_MAX_TOKENS = 2500
