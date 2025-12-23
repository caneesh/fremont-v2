import type { MicroCurriculum } from '@/types/conceptMastery'

/**
 * Mock repair curricula for weak concepts
 * Each curriculum includes:
 * - Concept clarification
 * - Diagnostic question
 * - Two practice problems with scaffolding
 */

export const MOCK_CURRICULA: Record<string, MicroCurriculum> = {
  'kinematics-1d': {
    conceptClarification: `1D kinematics describes motion along a straight line. The key equations relate position ($x$), velocity ($v$), acceleration ($a$), and time ($t$):

**Key Equations:**
- $v = v_0 + at$ (velocity with constant acceleration)
- $x = x_0 + v_0t + \\frac{1}{2}at^2$ (position with constant acceleration)
- $v^2 = v_0^2 + 2a(x - x_0)$ (velocity-position relation)

**Common Mistakes:**
- Forgetting to account for initial velocity or position
- Using wrong sign for acceleration (especially gravity)
- Mixing up $v$ and $a$ in equations`,
    diagnosticQuestion: 'A car accelerates from rest at $2 \\text{ m/s}^2$ for 5 seconds. What is its final velocity?',
    diagnosticAnswer: 'Using $v = v_0 + at$: Since the car starts from rest, $v_0 = 0$. Therefore, $v = 0 + (2)(5) = 10 \\text{ m/s}$.',
    practiceProblems: [
      {
        problemText: 'A ball is thrown upward with initial velocity $20 \\text{ m/s}$. How high does it go? (Use $g = 10 \\text{ m/s}^2$)',
        difficulty: 'easy',
        hints: [
          'At maximum height, the velocity is zero: $v = 0$',
          'Use the equation $v^2 = v_0^2 + 2a(x - x_0)$',
          'Acceleration is $-g$ (negative because gravity opposes motion)',
        ],
        solution: 'At maximum height, $v = 0$. Using $v^2 = v_0^2 + 2a(h - 0)$: $0 = (20)^2 + 2(-10)h \\Rightarrow 0 = 400 - 20h \\Rightarrow h = 20 \\text{ m}$',
      },
      {
        problemText: 'A train moving at $30 \\text{ m/s}$ brakes with deceleration $5 \\text{ m/s}^2$. How far does it travel before stopping?',
        difficulty: 'medium',
        hints: [
          'Final velocity is zero when the train stops',
          'Deceleration means $a = -5 \\text{ m/s}^2$',
          'Use $v^2 = v_0^2 + 2a(x - x_0)$',
        ],
        solution: 'Using $v^2 = v_0^2 + 2a \\Delta x$: $0 = (30)^2 + 2(-5)\\Delta x \\Rightarrow 0 = 900 - 10\\Delta x \\Rightarrow \\Delta x = 90 \\text{ m}$',
      },
    ],
  },

  'newtons-laws': {
    conceptClarification: `Newton's laws form the foundation of classical mechanics:

**First Law (Inertia):** An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by a net force.

**Second Law:** $\\vec{F}_{net} = m\\vec{a}$. The net force on an object equals its mass times acceleration.

**Third Law:** For every action, there is an equal and opposite reaction: $\\vec{F}_{AB} = -\\vec{F}_{BA}$.

**Common Mistakes:**
- Forgetting to find NET force (sum of all forces)
- Confusing mass with weight ($W = mg$)
- Not using correct sign convention for forces`,
    diagnosticQuestion: 'A $5 \\text{ kg}$ block is pushed with a force of $20 \\text{ N}$. If friction is $5 \\text{ N}$, what is the acceleration?',
    diagnosticAnswer: 'Net force: $F_{net} = 20 - 5 = 15 \\text{ N}$. Using $F = ma$: $15 = 5a \\Rightarrow a = 3 \\text{ m/s}^2$.',
    practiceProblems: [
      {
        problemText: 'A $10 \\text{ kg}$ object hangs from a rope. What is the tension in the rope? (Use $g = 10 \\text{ m/s}^2$)',
        difficulty: 'easy',
        hints: [
          'Draw a free-body diagram: tension up, weight down',
          'Object is at rest, so net force is zero',
          'Weight = $mg$',
        ],
        solution: 'Weight: $W = mg = 10 \\times 10 = 100 \\text{ N}$ downward. Since object is at rest: $T - W = 0 \\Rightarrow T = 100 \\text{ N}$.',
      },
      {
        problemText: 'Two blocks ($2 \\text{ kg}$ and $3 \\text{ kg}$) are connected by a string. A $10 \\text{ N}$ force pulls the $2 \\text{ kg}$ block. Find the acceleration of the system.',
        difficulty: 'medium',
        hints: [
          'Treat both blocks as a single system',
          'Total mass = $2 + 3 = 5 \\text{ kg}$',
          'Net force on system = applied force',
        ],
        solution: 'Total mass: $m_{total} = 2 + 3 = 5 \\text{ kg}$. Using $F = ma$: $10 = 5a \\Rightarrow a = 2 \\text{ m/s}^2$.',
      },
    ],
  },

  'work-energy': {
    conceptClarification: `The work-energy theorem states that the net work done on an object equals its change in kinetic energy:

$$W_{net} = \\Delta KE = \\frac{1}{2}mv_f^2 - \\frac{1}{2}mv_i^2$$

**Key Concepts:**
- Work: $W = Fd\\cos\\theta$ (force × displacement × cosine of angle)
- Kinetic Energy: $KE = \\frac{1}{2}mv^2$
- Potential Energy: $PE = mgh$ (gravitational)

**Conservation of Energy:** In absence of friction, $KE_i + PE_i = KE_f + PE_f$

**Common Mistakes:**
- Forgetting the angle in $W = Fd\\cos\\theta$
- Not using squared velocity in kinetic energy
- Ignoring energy lost to friction`,
    diagnosticQuestion: 'A $2 \\text{ kg}$ block slides down a frictionless incline from height $5 \\text{ m}$. What is its speed at the bottom?',
    diagnosticAnswer: 'Using conservation of energy: $mgh = \\frac{1}{2}mv^2 \\Rightarrow gh = \\frac{1}{2}v^2 \\Rightarrow v = \\sqrt{2gh} = \\sqrt{2 \\times 10 \\times 5} = 10 \\text{ m/s}$.',
    practiceProblems: [
      {
        problemText: 'How much work is done by a $50 \\text{ N}$ force pushing a box $3 \\text{ m}$ horizontally?',
        difficulty: 'easy',
        hints: [
          'Force and displacement are in the same direction',
          'Use $W = Fd\\cos\\theta$ with $\\theta = 0°$',
          '$\\cos 0° = 1$',
        ],
        solution: 'Work: $W = Fd\\cos\\theta = 50 \\times 3 \\times \\cos 0° = 50 \\times 3 \\times 1 = 150 \\text{ J}$.',
      },
      {
        problemText: 'A $1 \\text{ kg}$ ball is thrown upward with initial speed $15 \\text{ m/s}$. What is its kinetic energy at half the maximum height?',
        difficulty: 'medium',
        hints: [
          'Find maximum height first using energy conservation',
          'At max height: all KE converts to PE',
          'At half max height: use energy conservation again',
        ],
        solution: 'Max height: $\\frac{1}{2}mv_0^2 = mgh_{max} \\Rightarrow h_{max} = \\frac{v_0^2}{2g} = \\frac{225}{20} = 11.25 \\text{ m}$. At $h = 5.625 \\text{ m}$: $\\frac{1}{2}mv_0^2 = \\frac{1}{2}mv^2 + mgh \\Rightarrow KE = \\frac{1}{2}(1)(225) - (1)(10)(5.625) = 112.5 - 56.25 = 56.25 \\text{ J}$.',
      },
    ],
  },

  'electrostatics': {
    conceptClarification: `Electrostatics deals with electric charges at rest and the forces between them.

**Coulomb's Law:** The force between two point charges is:
$$F = k\\frac{|q_1 q_2|}{r^2}$$
where $k = 9 \\times 10^9 \\text{ N·m}^2/\\text{C}^2$.

**Electric Field:** The field created by charge $Q$ at distance $r$:
$$E = k\\frac{|Q|}{r^2}$$

Force on charge $q$ in field $E$: $F = qE$

**Common Mistakes:**
- Forgetting to square the distance
- Wrong sign for force direction (like charges repel, unlike attract)
- Not converting units (cm to m, μC to C)`,
    diagnosticQuestion: 'Two charges, $+3 \\mu\\text{C}$ and $-3 \\mu\\text{C}$, are $2 \\text{ m}$ apart. What is the magnitude of force between them?',
    diagnosticAnswer: "Using Coulomb's law: $F = k\\frac{|q_1 q_2|}{r^2} = (9 \\times 10^9)\\frac{(3 \\times 10^{-6})(3 \\times 10^{-6})}{2^2} = (9 \\times 10^9)\\frac{9 \\times 10^{-12}}{4} = 0.02025 \\text{ N} \\approx 0.02 \\text{ N}$.",
    practiceProblems: [
      {
        problemText: 'What is the electric field at a distance of $3 \\text{ m}$ from a $+5 \\mu\\text{C}$ charge?',
        difficulty: 'easy',
        hints: [
          'Use $E = k\\frac{|Q|}{r^2}$',
          'Convert $\\mu\\text{C}$ to $\\text{C}$: $1 \\mu\\text{C} = 10^{-6} \\text{ C}$',
          '$k = 9 \\times 10^9 \\text{ N·m}^2/\\text{C}^2$',
        ],
        solution: '$E = k\\frac{|Q|}{r^2} = (9 \\times 10^9)\\frac{5 \\times 10^{-6}}{3^2} = (9 \\times 10^9)\\frac{5 \\times 10^{-6}}{9} = 5000 \\text{ N/C} = 5 \\times 10^3 \\text{ N/C}$.',
      },
      {
        problemText: 'A $-2 \\mu\\text{C}$ charge experiences a force of $0.01 \\text{ N}$ in an electric field. What is the field strength?',
        difficulty: 'medium',
        hints: [
          'Use $F = qE$, so $E = \\frac{F}{q}$',
          'Convert $\\mu\\text{C}$ to $\\text{C}$',
          'Field strength is magnitude only',
        ],
        solution: '$E = \\frac{F}{|q|} = \\frac{0.01}{2 \\times 10^{-6}} = 5000 \\text{ N/C} = 5 \\times 10^3 \\text{ N/C}$.',
      },
    ],
  },

  'circular-motion': {
    conceptClarification: `Circular motion requires a centripetal (center-seeking) force to keep the object moving in a circle.

**Centripetal Acceleration:**
$$a_c = \\frac{v^2}{r} = \\omega^2 r$$

**Centripetal Force:**
$$F_c = m a_c = \\frac{mv^2}{r}$$

**Angular velocity:** $\\omega = \\frac{v}{r} = \\frac{2\\pi}{T}$ where $T$ is the period.

**Common Mistakes:**
- Thinking there's an outward "centrifugal force" (this is fictitious!)
- Forgetting that velocity is tangent to the circle
- Confusing $v$ (linear speed) with $\\omega$ (angular speed)`,
    diagnosticQuestion: 'A $2 \\text{ kg}$ ball swings in a horizontal circle of radius $1 \\text{ m}$ at $5 \\text{ m/s}$. What is the centripetal force?',
    diagnosticAnswer: 'Using $F_c = \\frac{mv^2}{r}$: $F_c = \\frac{(2)(5)^2}{1} = \\frac{2 \\times 25}{1} = 50 \\text{ N}$.',
    practiceProblems: [
      {
        problemText: 'A car goes around a curve of radius $50 \\text{ m}$ at $20 \\text{ m/s}$. What is its centripetal acceleration?',
        difficulty: 'easy',
        hints: [
          'Use $a_c = \\frac{v^2}{r}$',
          'No need for mass in this calculation',
        ],
        solution: '$a_c = \\frac{v^2}{r} = \\frac{(20)^2}{50} = \\frac{400}{50} = 8 \\text{ m/s}^2$.',
      },
      {
        problemText: 'A $0.5 \\text{ kg}$ object rotates on a $2 \\text{ m}$ string, making 3 revolutions per second. Find the tension in the string.',
        difficulty: 'medium',
        hints: [
          'First find angular velocity: $\\omega = 2\\pi f$ where $f = 3 \\text{ Hz}$',
          'Then find linear speed: $v = \\omega r$',
          'Tension provides centripetal force: $T = \\frac{mv^2}{r}$',
        ],
        solution: '$\\omega = 2\\pi f = 2\\pi(3) = 6\\pi \\text{ rad/s}$. $v = \\omega r = 6\\pi \\times 2 = 12\\pi \\text{ m/s}$. $T = \\frac{mv^2}{r} = \\frac{0.5 \\times (12\\pi)^2}{2} = \\frac{0.5 \\times 144\\pi^2}{2} = 36\\pi^2 \\approx 355 \\text{ N}$.',
      },
    ],
  },
}
