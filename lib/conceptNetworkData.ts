import type { ConceptNetworkResponse } from '@/types/conceptNetwork'

// Static concept network - avoids expensive API calls and JSON parsing errors
export const CONCEPT_NETWORK_DATA: ConceptNetworkResponse = {
  network: {
    nodes: [
      // Mechanics - Basic
      { id: 'kinematics-1d', name: '1D Kinematics', category: 'mechanics', description: 'Motion in one dimension', difficulty: 'basic', prerequisites: [] },
      { id: 'vectors', name: 'Vectors', category: 'mechanics', description: 'Vector operations and components', difficulty: 'basic', prerequisites: [] },
      { id: 'newtons-laws', name: "Newton's Laws", category: 'mechanics', description: 'Three fundamental laws of motion', difficulty: 'basic', prerequisites: ['kinematics-1d'] },
      { id: 'kinematics-2d', name: '2D Kinematics', category: 'mechanics', description: 'Projectile and circular motion', difficulty: 'intermediate', prerequisites: ['kinematics-1d', 'vectors'] },

      // Mechanics - Intermediate
      { id: 'work-energy', name: 'Work-Energy Theorem', category: 'mechanics', description: 'Relationship between work and kinetic energy', difficulty: 'intermediate', prerequisites: ['newtons-laws'] },
      { id: 'momentum', name: 'Momentum & Impulse', category: 'mechanics', description: 'Conservation of momentum and collisions', difficulty: 'intermediate', prerequisites: ['newtons-laws'] },
      { id: 'friction', name: 'Friction', category: 'mechanics', description: 'Static and kinetic friction forces', difficulty: 'intermediate', prerequisites: ['newtons-laws'] },
      { id: 'circular-motion', name: 'Circular Motion', category: 'mechanics', description: 'Centripetal force and acceleration', difficulty: 'intermediate', prerequisites: ['kinematics-2d'] },

      // Mechanics - Advanced
      { id: 'rotation', name: 'Rotational Motion', category: 'mechanics', description: 'Torque angular momentum moment of inertia', difficulty: 'advanced', prerequisites: ['circular-motion', 'work-energy'] },
      { id: 'gravitation', name: 'Gravitation', category: 'mechanics', description: 'Universal gravitation and orbital mechanics', difficulty: 'advanced', prerequisites: ['circular-motion'] },
      { id: 'shm', name: 'Simple Harmonic Motion', category: 'mechanics', description: 'Oscillations springs and pendulums', difficulty: 'advanced', prerequisites: ['work-energy'] },

      // Thermodynamics
      { id: 'temperature', name: 'Temperature & Heat', category: 'thermodynamics', description: 'Thermal energy and temperature scales', difficulty: 'basic', prerequisites: [] },
      { id: 'kinetic-theory', name: 'Kinetic Theory', category: 'thermodynamics', description: 'Molecular interpretation of temperature', difficulty: 'intermediate', prerequisites: ['temperature'] },
      { id: 'first-law', name: 'First Law of Thermodynamics', category: 'thermodynamics', description: 'Energy conservation in thermal systems', difficulty: 'intermediate', prerequisites: ['work-energy', 'temperature'] },
      { id: 'second-law', name: 'Second Law of Thermodynamics', category: 'thermodynamics', description: 'Entropy and heat engines', difficulty: 'advanced', prerequisites: ['first-law'] },

      // Electromagnetism - Basic
      { id: 'electrostatics', name: 'Electrostatics', category: 'electromagnetism', description: 'Coulombs law and electric fields', difficulty: 'basic', prerequisites: ['vectors'] },
      { id: 'electric-potential', name: 'Electric Potential', category: 'electromagnetism', description: 'Voltage and potential energy', difficulty: 'intermediate', prerequisites: ['electrostatics', 'work-energy'] },
      { id: 'capacitance', name: 'Capacitance', category: 'electromagnetism', description: 'Capacitors and energy storage', difficulty: 'intermediate', prerequisites: ['electric-potential'] },
      { id: 'current', name: 'Current Electricity', category: 'electromagnetism', description: 'Ohms law and circuits', difficulty: 'intermediate', prerequisites: ['electric-potential'] },

      // Electromagnetism - Advanced
      { id: 'magnetism', name: 'Magnetism', category: 'electromagnetism', description: 'Magnetic fields and forces', difficulty: 'intermediate', prerequisites: ['current'] },
      { id: 'induction', name: 'Electromagnetic Induction', category: 'electromagnetism', description: 'Faradays law and Lenzs law', difficulty: 'advanced', prerequisites: ['magnetism'] },
      { id: 'ac-circuits', name: 'AC Circuits', category: 'electromagnetism', description: 'Alternating current and impedance', difficulty: 'advanced', prerequisites: ['induction', 'current'] },

      // Waves & Optics
      { id: 'wave-motion', name: 'Wave Motion', category: 'waves', description: 'Mechanical waves and properties', difficulty: 'intermediate', prerequisites: ['shm'] },
      { id: 'sound', name: 'Sound Waves', category: 'waves', description: 'Acoustic phenomena and Doppler effect', difficulty: 'intermediate', prerequisites: ['wave-motion'] },
      { id: 'em-waves', name: 'EM Waves', category: 'waves', description: 'Electromagnetic radiation spectrum', difficulty: 'advanced', prerequisites: ['wave-motion', 'induction'] },
      { id: 'reflection-refraction', name: 'Reflection & Refraction', category: 'optics', description: 'Light behavior at interfaces', difficulty: 'intermediate', prerequisites: ['em-waves'] },
      { id: 'interference', name: 'Interference', category: 'optics', description: 'Wave superposition and Youngs experiment', difficulty: 'advanced', prerequisites: ['wave-motion', 'reflection-refraction'] },
      { id: 'diffraction', name: 'Diffraction', category: 'optics', description: 'Wave bending and single-slit patterns', difficulty: 'advanced', prerequisites: ['interference'] },

      // Modern Physics
      { id: 'photoelectric', name: 'Photoelectric Effect', category: 'modern-physics', description: 'Photon nature of light', difficulty: 'intermediate', prerequisites: ['em-waves', 'work-energy'] },
      { id: 'atomic-structure', name: 'Atomic Structure', category: 'modern-physics', description: 'Bohr model and energy levels', difficulty: 'advanced', prerequisites: ['photoelectric', 'electrostatics'] },
    ],
    edges: [
      // Prerequisites
      { source: 'kinematics-1d', target: 'newtons-laws', relationship: 'prerequisite', strength: 0.9 },
      { source: 'kinematics-1d', target: 'kinematics-2d', relationship: 'prerequisite', strength: 0.9 },
      { source: 'vectors', target: 'kinematics-2d', relationship: 'prerequisite', strength: 0.8 },
      { source: 'newtons-laws', target: 'work-energy', relationship: 'prerequisite', strength: 0.9 },
      { source: 'newtons-laws', target: 'momentum', relationship: 'prerequisite', strength: 0.9 },
      { source: 'newtons-laws', target: 'friction', relationship: 'prerequisite', strength: 0.8 },
      { source: 'kinematics-2d', target: 'circular-motion', relationship: 'prerequisite', strength: 0.9 },
      { source: 'circular-motion', target: 'rotation', relationship: 'builds-on', strength: 0.9 },
      { source: 'work-energy', target: 'rotation', relationship: 'applies-to', strength: 0.7 },
      { source: 'circular-motion', target: 'gravitation', relationship: 'applies-to', strength: 0.8 },
      { source: 'work-energy', target: 'shm', relationship: 'prerequisite', strength: 0.8 },

      // Thermodynamics
      { source: 'temperature', target: 'kinetic-theory', relationship: 'prerequisite', strength: 0.9 },
      { source: 'work-energy', target: 'first-law', relationship: 'related', strength: 0.8 },
      { source: 'temperature', target: 'first-law', relationship: 'prerequisite', strength: 0.7 },
      { source: 'first-law', target: 'second-law', relationship: 'builds-on', strength: 0.9 },

      // Electromagnetism
      { source: 'vectors', target: 'electrostatics', relationship: 'prerequisite', strength: 0.8 },
      { source: 'electrostatics', target: 'electric-potential', relationship: 'builds-on', strength: 0.9 },
      { source: 'work-energy', target: 'electric-potential', relationship: 'related', strength: 0.7 },
      { source: 'electric-potential', target: 'capacitance', relationship: 'prerequisite', strength: 0.9 },
      { source: 'electric-potential', target: 'current', relationship: 'prerequisite', strength: 0.9 },
      { source: 'current', target: 'magnetism', relationship: 'prerequisite', strength: 0.9 },
      { source: 'magnetism', target: 'induction', relationship: 'prerequisite', strength: 0.9 },
      { source: 'induction', target: 'ac-circuits', relationship: 'prerequisite', strength: 0.8 },
      { source: 'current', target: 'ac-circuits', relationship: 'prerequisite', strength: 0.7 },

      // Waves
      { source: 'shm', target: 'wave-motion', relationship: 'builds-on', strength: 0.8 },
      { source: 'wave-motion', target: 'sound', relationship: 'applies-to', strength: 0.8 },
      { source: 'wave-motion', target: 'em-waves', relationship: 'related', strength: 0.7 },
      { source: 'induction', target: 'em-waves', relationship: 'related', strength: 0.6 },
      { source: 'em-waves', target: 'reflection-refraction', relationship: 'prerequisite', strength: 0.8 },
      { source: 'wave-motion', target: 'reflection-refraction', relationship: 'applies-to', strength: 0.7 },
      { source: 'wave-motion', target: 'interference', relationship: 'prerequisite', strength: 0.8 },
      { source: 'reflection-refraction', target: 'interference', relationship: 'prerequisite', strength: 0.6 },
      { source: 'interference', target: 'diffraction', relationship: 'related', strength: 0.8 },

      // Modern Physics
      { source: 'em-waves', target: 'photoelectric', relationship: 'prerequisite', strength: 0.8 },
      { source: 'work-energy', target: 'photoelectric', relationship: 'applies-to', strength: 0.7 },
      { source: 'photoelectric', target: 'atomic-structure', relationship: 'prerequisite', strength: 0.8 },
      { source: 'electrostatics', target: 'atomic-structure', relationship: 'applies-to', strength: 0.7 },
    ],
  },
  categories: [
    { id: 'mechanics', name: 'Mechanics', color: '#3B82F6', conceptCount: 11 },
    { id: 'thermodynamics', name: 'Thermodynamics', color: '#EF4444', conceptCount: 4 },
    { id: 'electromagnetism', name: 'Electromagnetism', color: '#F59E0B', conceptCount: 7 },
    { id: 'waves', name: 'Waves', color: '#06B6D4', conceptCount: 3 },
    { id: 'optics', name: 'Optics', color: '#10B981', conceptCount: 3 },
    { id: 'modern-physics', name: 'Modern Physics', color: '#8B5CF6', conceptCount: 2 },
  ],
}
