import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Topics hierarchy
const topics = [
  // Top-level topics
  { topicId: 'mechanics', label: 'Mechanics', description: 'Study of motion and forces', level: 0, path: [] },
  { topicId: 'thermodynamics', label: 'Thermodynamics', description: 'Study of heat and energy transfer', level: 0, path: [] },
  { topicId: 'electromagnetism', label: 'Electromagnetism', description: 'Study of electric and magnetic phenomena', level: 0, path: [] },
  { topicId: 'optics', label: 'Optics', description: 'Study of light and its behavior', level: 0, path: [] },
  { topicId: 'waves', label: 'Waves', description: 'Study of wave phenomena', level: 0, path: [] },
  { topicId: 'modern', label: 'Modern Physics', description: 'Quantum mechanics, relativity, and nuclear physics', level: 0, path: [] },

  // Mechanics subtopics
  { topicId: 'mechanics/kinematics', label: 'Kinematics', description: 'Motion without considering forces', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/dynamics', label: 'Dynamics', description: 'Motion with forces (Newton\'s laws)', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/energy', label: 'Energy & Work', description: 'Work, energy, and power', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/momentum', label: 'Momentum', description: 'Linear and angular momentum', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/rotation', label: 'Rotational Motion', description: 'Circular and rotational dynamics', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/oscillations', label: 'Oscillations', description: 'Simple harmonic motion and oscillations', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },

  // Thermodynamics subtopics
  { topicId: 'thermodynamics/laws', label: 'Laws of Thermodynamics', description: 'First, second, and third laws', level: 1, path: ['thermodynamics'], parentTopicId: 'thermodynamics' },
  { topicId: 'thermodynamics/gases', label: 'Ideal Gases', description: 'Ideal gas law and kinetic theory', level: 1, path: ['thermodynamics'], parentTopicId: 'thermodynamics' },
  { topicId: 'thermodynamics/heat', label: 'Heat Transfer', description: 'Conduction, convection, radiation', level: 1, path: ['thermodynamics'], parentTopicId: 'thermodynamics' },

  // Electromagnetism subtopics
  { topicId: 'electromagnetism/electrostatics', label: 'Electrostatics', description: 'Static electric charges and fields', level: 1, path: ['electromagnetism'], parentTopicId: 'electromagnetism' },
  { topicId: 'electromagnetism/circuits', label: 'Circuits', description: 'DC and AC circuits', level: 1, path: ['electromagnetism'], parentTopicId: 'electromagnetism' },
  { topicId: 'electromagnetism/magnetism', label: 'Magnetism', description: 'Magnetic fields and forces', level: 1, path: ['electromagnetism'], parentTopicId: 'electromagnetism' },
  { topicId: 'electromagnetism/induction', label: 'Electromagnetic Induction', description: 'Faraday\'s law and inductance', level: 1, path: ['electromagnetism'], parentTopicId: 'electromagnetism' },

  // Optics subtopics
  { topicId: 'optics/geometric', label: 'Geometric Optics', description: 'Reflection and refraction', level: 1, path: ['optics'], parentTopicId: 'optics' },
  { topicId: 'optics/wave', label: 'Wave Optics', description: 'Interference and diffraction', level: 1, path: ['optics'], parentTopicId: 'optics' },

  // Waves subtopics
  { topicId: 'waves/mechanical', label: 'Mechanical Waves', description: 'Sound and other mechanical waves', level: 1, path: ['waves'], parentTopicId: 'waves' },
  { topicId: 'waves/sound', label: 'Sound', description: 'Acoustics and sound waves', level: 1, path: ['waves'], parentTopicId: 'waves' },

  // Modern physics subtopics
  { topicId: 'modern/quantum', label: 'Quantum Physics', description: 'Photoelectric effect, wave-particle duality', level: 1, path: ['modern'], parentTopicId: 'modern' },
  { topicId: 'modern/atomic', label: 'Atomic Physics', description: 'Atomic structure and spectra', level: 1, path: ['modern'], parentTopicId: 'modern' },
  { topicId: 'modern/nuclear', label: 'Nuclear Physics', description: 'Radioactivity and nuclear reactions', level: 1, path: ['modern'], parentTopicId: 'modern' },
]

// Patterns (problem types) - matching the template IDs
const patterns = [
  // Mechanics patterns
  { patternId: 'mechanics/incline_frictionless', label: 'Frictionless Inclined Plane', description: 'Block sliding on a frictionless inclined surface', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/incline_with_friction', label: 'Inclined Plane with Friction', description: 'Block on inclined surface with friction', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/newton_2d_block', label: 'Newton\'s Laws 2D Block', description: '2D force analysis on a block', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/projectile_motion', label: 'Projectile Motion', description: 'Motion of projectiles under gravity', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/circular_motion', label: 'Circular Motion', description: 'Uniform and non-uniform circular motion', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/work_energy', label: 'Work-Energy Theorem', description: 'Problems using work-energy principles', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/momentum_collision', label: 'Momentum & Collisions', description: 'Conservation of momentum in collisions', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/pulley_system', label: 'Pulley Systems', description: 'Systems with pulleys and connected masses', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/simple_harmonic_motion', label: 'Simple Harmonic Motion', description: 'Springs, pendulums, and oscillators', level: 1, path: ['mechanics'] },

  // Thermodynamics patterns
  { patternId: 'thermodynamics/ideal_gas', label: 'Ideal Gas Law', description: 'PV = nRT applications', level: 1, path: ['thermodynamics'] },
  { patternId: 'thermodynamics/first_law', label: 'First Law of Thermodynamics', description: 'Heat, work, and internal energy', level: 1, path: ['thermodynamics'] },
  { patternId: 'thermodynamics/heat_engine', label: 'Heat Engines', description: 'Carnot cycle and engine efficiency', level: 1, path: ['thermodynamics'] },
  { patternId: 'thermodynamics/calorimetry', label: 'Calorimetry', description: 'Heat transfer and specific heat', level: 1, path: ['thermodynamics'] },

  // Electromagnetism patterns
  { patternId: 'electromagnetism/coulomb_field', label: 'Coulomb\'s Law & Electric Field', description: 'Point charges and electric fields', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/gauss_law', label: 'Gauss\'s Law', description: 'Electric flux and symmetric charge distributions', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/capacitors', label: 'Capacitors', description: 'Capacitance and energy storage', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/dc_circuits', label: 'DC Circuits', description: 'Resistor networks, Kirchhoff\'s laws', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/magnetic_force', label: 'Magnetic Force', description: 'Force on charges and currents in magnetic fields', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/em_induction', label: 'Electromagnetic Induction', description: 'Faraday\'s law and Lenz\'s law', level: 1, path: ['electromagnetism'] },

  // Optics patterns
  { patternId: 'optics/mirrors', label: 'Mirrors', description: 'Plane and curved mirror problems', level: 1, path: ['optics'] },
  { patternId: 'optics/lenses', label: 'Lenses', description: 'Thin lens equation and magnification', level: 1, path: ['optics'] },
  { patternId: 'optics/interference', label: 'Interference', description: 'Double-slit and thin film interference', level: 1, path: ['optics'] },

  // Waves patterns
  { patternId: 'waves/standing_waves', label: 'Standing Waves', description: 'Resonance in strings and pipes', level: 1, path: ['waves'] },
  { patternId: 'waves/doppler', label: 'Doppler Effect', description: 'Frequency shift due to relative motion', level: 1, path: ['waves'] },

  // Modern physics patterns
  { patternId: 'modern/photoelectric', label: 'Photoelectric Effect', description: 'Light-matter interaction and work function', level: 1, path: ['modern'] },
  { patternId: 'modern/bohr_model', label: 'Bohr Model', description: 'Hydrogen atom energy levels and spectra', level: 1, path: ['modern'] },
  { patternId: 'modern/nuclear_decay', label: 'Nuclear Decay', description: 'Radioactive decay and half-life', level: 1, path: ['modern'] },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Seed topics
  console.log('📚 Seeding topics...')
  for (const topic of topics) {
    await prisma.topic.upsert({
      where: { topicId: topic.topicId },
      update: {
        label: topic.label,
        description: topic.description,
        level: topic.level,
        path: topic.path,
        parentTopicId: topic.parentTopicId,
      },
      create: topic,
    })
  }
  console.log(`   ✅ Seeded ${topics.length} topics`)

  // Seed patterns
  console.log('🧩 Seeding patterns...')
  for (const pattern of patterns) {
    await prisma.pattern.upsert({
      where: { patternId: pattern.patternId },
      update: {
        label: pattern.label,
        description: pattern.description,
        level: pattern.level,
        path: pattern.path,
      },
      create: pattern,
    })
  }
  console.log(`   ✅ Seeded ${patterns.length} patterns`)

  console.log('✨ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
