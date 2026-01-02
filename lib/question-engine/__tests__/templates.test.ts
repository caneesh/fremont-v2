/**
 * Unit tests for Question Engine Templates
 *
 * Tests all 27 physics templates across 6 topics:
 * - Mechanics (9 templates)
 * - Thermodynamics (4 templates)
 * - Electromagnetism (6 templates)
 * - Optics (3 templates)
 * - Waves (2 templates)
 * - Modern Physics (3 templates)
 */

import { describe, it, expect } from 'vitest'
import {
  // Mechanics templates
  TEMPLATE_INCLINE_FRICTIONLESS,
  TEMPLATE_INCLINE_WITH_FRICTION,
  TEMPLATE_NEWTON_2D_BLOCK,
  TEMPLATE_PROJECTILE_MOTION,
  TEMPLATE_CIRCULAR_MOTION,
  TEMPLATE_WORK_ENERGY,
  TEMPLATE_MOMENTUM_COLLISION,
  TEMPLATE_PULLEY_SYSTEM,
  TEMPLATE_SHM,
  // Thermodynamics templates
  TEMPLATE_IDEAL_GAS,
  TEMPLATE_FIRST_LAW,
  TEMPLATE_HEAT_ENGINE,
  TEMPLATE_CALORIMETRY,
  // Electromagnetism templates
  TEMPLATE_COULOMB_FIELD,
  TEMPLATE_GAUSS_LAW,
  TEMPLATE_CAPACITORS,
  TEMPLATE_DC_CIRCUITS,
  TEMPLATE_MAGNETIC_FORCE,
  TEMPLATE_EM_INDUCTION,
  // Optics templates
  TEMPLATE_MIRRORS,
  TEMPLATE_LENSES,
  TEMPLATE_INTERFERENCE,
  // Waves templates
  TEMPLATE_STANDING_WAVES,
  TEMPLATE_DOPPLER,
  // Modern physics templates
  TEMPLATE_PHOTOELECTRIC,
  TEMPLATE_BOHR_MODEL,
  TEMPLATE_NUCLEAR_DECAY,
  // Registry and helpers
  TEMPLATE_REGISTRY,
  getTemplate,
  findBestTemplate,
  getAllTemplateIds,
} from '../templates'
import { PatternTemplateSchema } from '../schemas'

// =============================================================================
// Helper function for common template tests
// =============================================================================

function testTemplateStructure(
  template: typeof TEMPLATE_INCLINE_FRICTIONLESS,
  expectedId: string,
  expectedTopic: string,
  expectedStepCount: number
) {
  describe(expectedId, () => {
    it('has valid structure according to schema', () => {
      const result = PatternTemplateSchema.safeParse(template)
      expect(result.success).toBe(true)
    })

    it('has correct templateId', () => {
      expect(template.templateId).toBe(expectedId)
    })

    it('has correct topic', () => {
      expect(template.topic).toBe(expectedTopic)
    })

    it(`has exactly ${expectedStepCount} steps`, () => {
      expect(template.stepBlueprints).toHaveLength(expectedStepCount)
    })

    it('has unique step IDs', () => {
      const ids = template.stepBlueprints.map(s => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('has rules set to no add/remove/reorder', () => {
      expect(template.rules).toBe('no add/remove/reorder')
    })

    it('has non-empty description', () => {
      expect(template.description.length).toBeGreaterThan(0)
    })

    it('has at least 3 allowed variables', () => {
      expect(template.allowedVariables.length).toBeGreaterThanOrEqual(3)
    })

    it('all step blueprints have required fields', () => {
      for (const step of template.stepBlueprints) {
        expect(step.id).toBeDefined()
        expect(step.type).toBeDefined()
        expect(step.requiredFields.length).toBeGreaterThan(0)
        expect(step.description).toBeDefined()
      }
    })
  })
}

// =============================================================================
// Mechanics Templates (9 templates)
// =============================================================================

describe('Mechanics Templates', () => {
  testTemplateStructure(
    TEMPLATE_INCLINE_FRICTIONLESS,
    'mechanics/incline_frictionless',
    'mechanics',
    5
  )

  testTemplateStructure(
    TEMPLATE_INCLINE_WITH_FRICTION,
    'mechanics/incline_with_friction',
    'mechanics',
    7
  )

  testTemplateStructure(
    TEMPLATE_NEWTON_2D_BLOCK,
    'mechanics/newton_2d_block',
    'mechanics',
    8
  )

  testTemplateStructure(
    TEMPLATE_PROJECTILE_MOTION,
    'mechanics/projectile_motion',
    'mechanics',
    6
  )

  testTemplateStructure(
    TEMPLATE_CIRCULAR_MOTION,
    'mechanics/circular_motion',
    'mechanics',
    6
  )

  testTemplateStructure(
    TEMPLATE_WORK_ENERGY,
    'mechanics/work_energy',
    'mechanics',
    7
  )

  testTemplateStructure(
    TEMPLATE_MOMENTUM_COLLISION,
    'mechanics/momentum_collision',
    'mechanics',
    7
  )

  testTemplateStructure(
    TEMPLATE_PULLEY_SYSTEM,
    'mechanics/pulley_system',
    'mechanics',
    7
  )

  testTemplateStructure(
    TEMPLATE_SHM,
    'mechanics/simple_harmonic_motion',
    'mechanics',
    7
  )

  // Mechanics-specific tests
  describe('Mechanics-specific validations', () => {
    it('incline frictionless starts with diagram step', () => {
      expect(TEMPLATE_INCLINE_FRICTIONLESS.stepBlueprints[0].type).toBe('diagram')
    })

    it('incline with friction includes friction variables', () => {
      expect(TEMPLATE_INCLINE_WITH_FRICTION.allowedVariables).toContain('coefficient_kinetic')
      expect(TEMPLATE_INCLINE_WITH_FRICTION.allowedVariables).toContain('friction_force')
    })

    it('newton 2d includes x and y equations', () => {
      const stepIds = TEMPLATE_NEWTON_2D_BLOCK.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('x-equation'))).toBe(true)
      expect(stepIds.some(id => id.includes('y-equation'))).toBe(true)
    })

    it('projectile motion includes decomposition step', () => {
      const stepIds = TEMPLATE_PROJECTILE_MOTION.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('decompose'))).toBe(true)
    })

    it('circular motion includes centripetal equation', () => {
      const stepIds = TEMPLATE_CIRCULAR_MOTION.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('centripetal'))).toBe(true)
    })

    it('work energy includes conservation step', () => {
      const stepIds = TEMPLATE_WORK_ENERGY.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('conservation'))).toBe(true)
    })

    it('momentum collision includes type identification', () => {
      expect(TEMPLATE_MOMENTUM_COLLISION.stepBlueprints[0].type).toBe('mcq')
    })

    it('pulley system has two FBD steps', () => {
      const diagramSteps = TEMPLATE_PULLEY_SYSTEM.stepBlueprints.filter(s => s.type === 'diagram')
      expect(diagramSteps.length).toBe(2)
    })

    it('SHM includes angular frequency step', () => {
      const stepIds = TEMPLATE_SHM.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('angular-frequency'))).toBe(true)
    })
  })
})

// =============================================================================
// Thermodynamics Templates (4 templates)
// =============================================================================

describe('Thermodynamics Templates', () => {
  testTemplateStructure(
    TEMPLATE_IDEAL_GAS,
    'thermodynamics/ideal_gas',
    'thermodynamics',
    6
  )

  testTemplateStructure(
    TEMPLATE_FIRST_LAW,
    'thermodynamics/first_law',
    'thermodynamics',
    6
  )

  testTemplateStructure(
    TEMPLATE_HEAT_ENGINE,
    'thermodynamics/heat_engine',
    'thermodynamics',
    7
  )

  testTemplateStructure(
    TEMPLATE_CALORIMETRY,
    'thermodynamics/calorimetry',
    'thermodynamics',
    6
  )

  // Thermodynamics-specific tests
  describe('Thermodynamics-specific validations', () => {
    it('ideal gas includes process identification', () => {
      expect(TEMPLATE_IDEAL_GAS.stepBlueprints[1].type).toBe('mcq')
    })

    it('first law has process type as first step', () => {
      expect(TEMPLATE_FIRST_LAW.stepBlueprints[0].type).toBe('mcq')
    })

    it('heat engine includes Carnot efficiency step', () => {
      const stepIds = TEMPLATE_HEAT_ENGINE.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('carnot'))).toBe(true)
    })

    it('calorimetry includes phase check step', () => {
      const stepIds = TEMPLATE_CALORIMETRY.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('phase'))).toBe(true)
    })

    it('heat engine includes energy flow diagram', () => {
      const diagramSteps = TEMPLATE_HEAT_ENGINE.stepBlueprints.filter(s => s.type === 'diagram')
      expect(diagramSteps.length).toBeGreaterThanOrEqual(1)
    })
  })
})

// =============================================================================
// Electromagnetism Templates (6 templates)
// =============================================================================

describe('Electromagnetism Templates', () => {
  testTemplateStructure(
    TEMPLATE_COULOMB_FIELD,
    'electromagnetism/coulomb_field',
    'electromagnetism',
    6
  )

  testTemplateStructure(
    TEMPLATE_GAUSS_LAW,
    'electromagnetism/gauss_law',
    'electromagnetism',
    7
  )

  testTemplateStructure(
    TEMPLATE_CAPACITORS,
    'electromagnetism/capacitors',
    'electromagnetism',
    7
  )

  testTemplateStructure(
    TEMPLATE_DC_CIRCUITS,
    'electromagnetism/dc_circuits',
    'electromagnetism',
    7
  )

  testTemplateStructure(
    TEMPLATE_MAGNETIC_FORCE,
    'electromagnetism/magnetic_force',
    'electromagnetism',
    7
  )

  testTemplateStructure(
    TEMPLATE_EM_INDUCTION,
    'electromagnetism/em_induction',
    'electromagnetism',
    7
  )

  // Electromagnetism-specific tests
  describe('Electromagnetism-specific validations', () => {
    it('coulomb field includes superposition step', () => {
      const stepIds = TEMPLATE_COULOMB_FIELD.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('superposition'))).toBe(true)
    })

    it('gauss law includes gaussian surface step', () => {
      const stepIds = TEMPLATE_GAUSS_LAW.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('gaussian'))).toBe(true)
    })

    it('gauss law has symmetry identification as MCQ', () => {
      expect(TEMPLATE_GAUSS_LAW.stepBlueprints[0].type).toBe('mcq')
    })

    it('capacitors includes combination step', () => {
      const stepIds = TEMPLATE_CAPACITORS.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('combination'))).toBe(true)
    })

    it('dc circuits includes KCL and KVL steps', () => {
      const stepIds = TEMPLATE_DC_CIRCUITS.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('kcl'))).toBe(true)
      expect(stepIds.some(id => id.includes('kvl'))).toBe(true)
    })

    it('magnetic force includes direction step', () => {
      const stepIds = TEMPLATE_MAGNETIC_FORCE.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('direction'))).toBe(true)
    })

    it('em induction includes Lenz law step', () => {
      const stepIds = TEMPLATE_EM_INDUCTION.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('lenz'))).toBe(true)
    })
  })
})

// =============================================================================
// Optics Templates (3 templates)
// =============================================================================

describe('Optics Templates', () => {
  testTemplateStructure(
    TEMPLATE_MIRRORS,
    'optics/mirrors',
    'optics',
    7
  )

  testTemplateStructure(
    TEMPLATE_LENSES,
    'optics/lenses',
    'optics',
    7
  )

  testTemplateStructure(
    TEMPLATE_INTERFERENCE,
    'optics/interference',
    'optics',
    7
  )

  // Optics-specific tests
  describe('Optics-specific validations', () => {
    it('mirrors includes sign convention step', () => {
      const stepIds = TEMPLATE_MIRRORS.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('sign'))).toBe(true)
    })

    it('mirrors includes ray diagram step', () => {
      const diagramSteps = TEMPLATE_MIRRORS.stepBlueprints.filter(s => s.type === 'diagram')
      expect(diagramSteps.length).toBeGreaterThanOrEqual(1)
    })

    it('lenses includes magnification step', () => {
      const stepIds = TEMPLATE_LENSES.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('magnification'))).toBe(true)
    })

    it('lenses includes characterization step', () => {
      const stepIds = TEMPLATE_LENSES.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('characterize'))).toBe(true)
    })

    it('interference includes path difference step', () => {
      const stepIds = TEMPLATE_INTERFERENCE.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('path'))).toBe(true)
    })

    it('interference includes constructive/destructive conditions', () => {
      const stepIds = TEMPLATE_INTERFERENCE.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('constructive'))).toBe(true)
      expect(stepIds.some(id => id.includes('destructive'))).toBe(true)
    })
  })
})

// =============================================================================
// Waves Templates (2 templates)
// =============================================================================

describe('Waves Templates', () => {
  testTemplateStructure(
    TEMPLATE_STANDING_WAVES,
    'waves/standing_waves',
    'waves',
    7
  )

  testTemplateStructure(
    TEMPLATE_DOPPLER,
    'waves/doppler',
    'waves',
    7
  )

  // Waves-specific tests
  describe('Waves-specific validations', () => {
    it('standing waves includes boundary conditions', () => {
      expect(TEMPLATE_STANDING_WAVES.stepBlueprints[0].type).toBe('mcq')
    })

    it('standing waves includes diagram step', () => {
      const diagramSteps = TEMPLATE_STANDING_WAVES.stepBlueprints.filter(s => s.type === 'diagram')
      expect(diagramSteps.length).toBeGreaterThanOrEqual(1)
    })

    it('standing waves includes wavelength-length relation', () => {
      const stepIds = TEMPLATE_STANDING_WAVES.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('wavelength'))).toBe(true)
    })

    it('doppler includes approach/recede identification', () => {
      const stepIds = TEMPLATE_DOPPLER.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('approach'))).toBe(true)
    })

    it('doppler includes sign convention step', () => {
      const stepIds = TEMPLATE_DOPPLER.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('sign'))).toBe(true)
    })

    it('doppler includes formula step', () => {
      const stepIds = TEMPLATE_DOPPLER.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('formula'))).toBe(true)
    })
  })
})

// =============================================================================
// Modern Physics Templates (3 templates)
// =============================================================================

describe('Modern Physics Templates', () => {
  testTemplateStructure(
    TEMPLATE_PHOTOELECTRIC,
    'modern/photoelectric',
    'modern',
    7
  )

  testTemplateStructure(
    TEMPLATE_BOHR_MODEL,
    'modern/bohr_model',
    'modern',
    7
  )

  testTemplateStructure(
    TEMPLATE_NUCLEAR_DECAY,
    'modern/nuclear_decay',
    'modern',
    7
  )

  // Modern physics-specific tests
  describe('Modern physics-specific validations', () => {
    it('photoelectric includes emission check', () => {
      const stepIds = TEMPLATE_PHOTOELECTRIC.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('emission'))).toBe(true)
    })

    it('photoelectric includes Einstein equation', () => {
      const stepIds = TEMPLATE_PHOTOELECTRIC.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('einstein'))).toBe(true)
    })

    it('photoelectric includes stopping potential', () => {
      const stepIds = TEMPLATE_PHOTOELECTRIC.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('stopping'))).toBe(true)
    })

    it('bohr model includes energy levels', () => {
      const stepIds = TEMPLATE_BOHR_MODEL.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('energy'))).toBe(true)
    })

    it('bohr model includes spectral series identification', () => {
      const stepIds = TEMPLATE_BOHR_MODEL.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('series'))).toBe(true)
    })

    it('nuclear decay includes decay type identification', () => {
      expect(TEMPLATE_NUCLEAR_DECAY.stepBlueprints[0].type).toBe('mcq')
    })

    it('nuclear decay includes half-life relation', () => {
      const stepIds = TEMPLATE_NUCLEAR_DECAY.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('half-life'))).toBe(true)
    })

    it('nuclear decay includes decay law', () => {
      const stepIds = TEMPLATE_NUCLEAR_DECAY.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('decay-law'))).toBe(true)
    })
  })
})

// =============================================================================
// TEMPLATE_REGISTRY Tests
// =============================================================================

describe('TEMPLATE_REGISTRY', () => {
  it('contains all 27 templates', () => {
    expect(Object.keys(TEMPLATE_REGISTRY)).toHaveLength(27)
  })

  it('has correct keys matching templateIds', () => {
    for (const [key, template] of Object.entries(TEMPLATE_REGISTRY)) {
      expect(key).toBe(template.templateId)
    }
  })

  it('all templates have valid schema', () => {
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      const result = PatternTemplateSchema.safeParse(template)
      expect(result.success).toBe(true)
    }
  })

  it('contains correct number of templates per topic', () => {
    const byTopic: Record<string, number> = {}
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      byTopic[template.topic] = (byTopic[template.topic] || 0) + 1
    }
    expect(byTopic['mechanics']).toBe(9)
    expect(byTopic['thermodynamics']).toBe(4)
    expect(byTopic['electromagnetism']).toBe(6)
    expect(byTopic['optics']).toBe(3)
    expect(byTopic['waves']).toBe(2)
    expect(byTopic['modern']).toBe(3)
  })
})

// =============================================================================
// getTemplate Tests
// =============================================================================

describe('getTemplate', () => {
  it('returns template for valid ID', () => {
    const template = getTemplate('mechanics/incline_frictionless')
    expect(template).not.toBeNull()
    expect(template?.templateId).toBe('mechanics/incline_frictionless')
  })

  it('returns null for invalid ID', () => {
    const template = getTemplate('nonexistent/template')
    expect(template).toBeNull()
  })

  it('returns null for empty string', () => {
    const template = getTemplate('')
    expect(template).toBeNull()
  })

  it('returns correct template for each registered ID', () => {
    const ids = getAllTemplateIds()
    for (const id of ids) {
      const template = getTemplate(id)
      expect(template).not.toBeNull()
      expect(template?.templateId).toBe(id)
    }
  })

  it('returns templates for all topics', () => {
    expect(getTemplate('thermodynamics/ideal_gas')).not.toBeNull()
    expect(getTemplate('electromagnetism/dc_circuits')).not.toBeNull()
    expect(getTemplate('optics/lenses')).not.toBeNull()
    expect(getTemplate('waves/doppler')).not.toBeNull()
    expect(getTemplate('modern/photoelectric')).not.toBeNull()
  })
})

// =============================================================================
// findBestTemplate Tests
// =============================================================================

describe('findBestTemplate', () => {
  describe('Mechanics templates', () => {
    it('finds frictionless incline template', () => {
      const template = findBestTemplate('mechanics', 'inclined_plane')
      expect(template).not.toBeNull()
      expect(template?.topic).toBe('mechanics')
    })

    it('finds friction template for friction subtopic', () => {
      const template = findBestTemplate('mechanics', 'inclined_plane_friction')
      expect(template?.templateId).toBe('mechanics/incline_with_friction')
    })

    it('finds projectile template', () => {
      const template = findBestTemplate('mechanics', 'projectile')
      expect(template?.templateId).toBe('mechanics/projectile_motion')
    })

    it('finds circular motion template', () => {
      const template = findBestTemplate('mechanics', 'circular_motion')
      expect(template?.templateId).toBe('mechanics/circular_motion')
    })

    it('finds work energy template', () => {
      const template = findBestTemplate('mechanics', 'work_energy')
      expect(template?.templateId).toBe('mechanics/work_energy')
    })

    it('finds momentum collision template', () => {
      const template = findBestTemplate('mechanics', 'momentum_collision')
      expect(template?.templateId).toBe('mechanics/momentum_collision')
    })

    it('finds pulley template', () => {
      const template = findBestTemplate('mechanics', 'pulley')
      expect(template?.templateId).toBe('mechanics/pulley_system')
    })

    it('finds SHM template', () => {
      const template = findBestTemplate('mechanics', 'simple_harmonic_motion')
      expect(template?.templateId).toBe('mechanics/simple_harmonic_motion')
    })
  })

  describe('Thermodynamics templates', () => {
    it('finds ideal gas template', () => {
      const template = findBestTemplate('thermodynamics', 'ideal_gas')
      expect(template?.templateId).toBe('thermodynamics/ideal_gas')
    })

    it('finds first law template', () => {
      const template = findBestTemplate('thermodynamics', 'first_law')
      expect(template?.templateId).toBe('thermodynamics/first_law')
    })

    it('finds heat engine template', () => {
      const template = findBestTemplate('thermodynamics', 'heat_engine')
      expect(template?.templateId).toBe('thermodynamics/heat_engine')
    })

    it('finds calorimetry template', () => {
      const template = findBestTemplate('thermodynamics', 'calorimetry')
      expect(template?.templateId).toBe('thermodynamics/calorimetry')
    })
  })

  describe('Electromagnetism templates', () => {
    it('finds coulomb field template', () => {
      const template = findBestTemplate('electromagnetism', 'coulomb_field')
      expect(template?.templateId).toBe('electromagnetism/coulomb_field')
    })

    it('finds gauss law template', () => {
      const template = findBestTemplate('electromagnetism', 'gauss_law')
      expect(template?.templateId).toBe('electromagnetism/gauss_law')
    })

    it('finds capacitors template', () => {
      const template = findBestTemplate('electromagnetism', 'capacitors')
      expect(template?.templateId).toBe('electromagnetism/capacitors')
    })

    it('finds dc circuits template', () => {
      const template = findBestTemplate('electromagnetism', 'dc_circuits')
      expect(template?.templateId).toBe('electromagnetism/dc_circuits')
    })

    it('finds magnetic force template', () => {
      const template = findBestTemplate('electromagnetism', 'magnetic_force')
      expect(template?.templateId).toBe('electromagnetism/magnetic_force')
    })

    it('finds em induction template', () => {
      const template = findBestTemplate('electromagnetism', 'em_induction')
      expect(template?.templateId).toBe('electromagnetism/em_induction')
    })
  })

  describe('Optics templates', () => {
    it('finds mirrors template', () => {
      const template = findBestTemplate('optics', 'mirrors')
      expect(template?.templateId).toBe('optics/mirrors')
    })

    it('finds lenses template', () => {
      const template = findBestTemplate('optics', 'lenses')
      expect(template?.templateId).toBe('optics/lenses')
    })

    it('finds interference template', () => {
      const template = findBestTemplate('optics', 'interference')
      expect(template?.templateId).toBe('optics/interference')
    })
  })

  describe('Waves templates', () => {
    it('finds standing waves template', () => {
      const template = findBestTemplate('waves', 'standing_waves')
      expect(template?.templateId).toBe('waves/standing_waves')
    })

    it('finds doppler template', () => {
      const template = findBestTemplate('waves', 'doppler')
      expect(template?.templateId).toBe('waves/doppler')
    })
  })

  describe('Modern physics templates', () => {
    it('finds photoelectric template', () => {
      const template = findBestTemplate('modern', 'photoelectric')
      expect(template?.templateId).toBe('modern/photoelectric')
    })

    it('finds bohr model template', () => {
      const template = findBestTemplate('modern', 'bohr_model')
      expect(template?.templateId).toBe('modern/bohr_model')
    })

    it('finds nuclear decay template', () => {
      const template = findBestTemplate('modern', 'nuclear_decay')
      expect(template?.templateId).toBe('modern/nuclear_decay')
    })
  })

  describe('Fallback behavior', () => {
    it('returns null for unregistered topic', () => {
      const template = findBestTemplate('quantum_gravity', 'string_theory')
      expect(template).toBeNull()
    })

    it('returns a template for unknown subtopic within known topic', () => {
      const template = findBestTemplate('mechanics', 'unknown_subtopic')
      expect(template).not.toBeNull()
      expect(template?.topic).toBe('mechanics')
    })
  })
})

// =============================================================================
// getAllTemplateIds Tests
// =============================================================================

describe('getAllTemplateIds', () => {
  it('returns array of strings', () => {
    const ids = getAllTemplateIds()
    expect(Array.isArray(ids)).toBe(true)
    expect(ids.every(id => typeof id === 'string')).toBe(true)
  })

  it('returns exactly 27 IDs', () => {
    const ids = getAllTemplateIds()
    expect(ids).toHaveLength(27)
  })

  it('all IDs are valid template IDs', () => {
    const ids = getAllTemplateIds()
    for (const id of ids) {
      expect(getTemplate(id)).not.toBeNull()
    }
  })

  it('includes all mechanics templates', () => {
    const ids = getAllTemplateIds()
    expect(ids).toContain('mechanics/incline_frictionless')
    expect(ids).toContain('mechanics/incline_with_friction')
    expect(ids).toContain('mechanics/newton_2d_block')
    expect(ids).toContain('mechanics/projectile_motion')
    expect(ids).toContain('mechanics/circular_motion')
    expect(ids).toContain('mechanics/work_energy')
    expect(ids).toContain('mechanics/momentum_collision')
    expect(ids).toContain('mechanics/pulley_system')
    expect(ids).toContain('mechanics/simple_harmonic_motion')
  })

  it('includes all thermodynamics templates', () => {
    const ids = getAllTemplateIds()
    expect(ids).toContain('thermodynamics/ideal_gas')
    expect(ids).toContain('thermodynamics/first_law')
    expect(ids).toContain('thermodynamics/heat_engine')
    expect(ids).toContain('thermodynamics/calorimetry')
  })

  it('includes all electromagnetism templates', () => {
    const ids = getAllTemplateIds()
    expect(ids).toContain('electromagnetism/coulomb_field')
    expect(ids).toContain('electromagnetism/gauss_law')
    expect(ids).toContain('electromagnetism/capacitors')
    expect(ids).toContain('electromagnetism/dc_circuits')
    expect(ids).toContain('electromagnetism/magnetic_force')
    expect(ids).toContain('electromagnetism/em_induction')
  })

  it('includes all optics templates', () => {
    const ids = getAllTemplateIds()
    expect(ids).toContain('optics/mirrors')
    expect(ids).toContain('optics/lenses')
    expect(ids).toContain('optics/interference')
  })

  it('includes all waves templates', () => {
    const ids = getAllTemplateIds()
    expect(ids).toContain('waves/standing_waves')
    expect(ids).toContain('waves/doppler')
  })

  it('includes all modern physics templates', () => {
    const ids = getAllTemplateIds()
    expect(ids).toContain('modern/photoelectric')
    expect(ids).toContain('modern/bohr_model')
    expect(ids).toContain('modern/nuclear_decay')
  })
})

// =============================================================================
// Template Content Quality Tests
// =============================================================================

describe('Template Content Quality', () => {
  it('all step blueprints have descriptions', () => {
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      for (const step of template.stepBlueprints) {
        expect(step.description).toBeDefined()
        expect(step.description.length).toBeGreaterThan(0)
      }
    }
  })

  it('all templates have at least 3 allowed variables', () => {
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      expect(template.allowedVariables.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('all templates have descriptions', () => {
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      expect(template.description).toBeDefined()
      expect(template.description.length).toBeGreaterThan(0)
    }
  })

  it('step requiredFields arrays are non-empty', () => {
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      for (const step of template.stepBlueprints) {
        expect(step.requiredFields.length).toBeGreaterThan(0)
      }
    }
  })

  it('all templates end with a sanity check step', () => {
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      const lastStep = template.stepBlueprints.at(-1)
      expect(lastStep?.id).toContain('sanity')
    }
  })

  it('equation steps require expected field', () => {
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      for (const step of template.stepBlueprints) {
        if (step.type === 'equation') {
          expect(step.requiredFields).toContain('expected')
        }
      }
    }
  })

  it('all templates have valid step types', () => {
    const validTypes = ['mcq', 'fill', 'short', 'equation', 'diagram']
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      for (const step of template.stepBlueprints) {
        expect(validTypes).toContain(step.type)
      }
    }
  })
})
