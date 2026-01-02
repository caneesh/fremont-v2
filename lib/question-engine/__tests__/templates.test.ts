/**
 * Unit tests for Question Engine Templates
 */

import { describe, it, expect } from 'vitest'
import {
  TEMPLATE_INCLINE_FRICTIONLESS,
  TEMPLATE_INCLINE_WITH_FRICTION,
  TEMPLATE_NEWTON_2D_BLOCK,
  TEMPLATE_REGISTRY,
  getTemplate,
  findBestTemplate,
  getAllTemplateIds,
} from '../templates'
import { PatternTemplateSchema } from '../schemas'

// =============================================================================
// Template Structure Tests
// =============================================================================

describe('Template Structure', () => {
  describe('TEMPLATE_INCLINE_FRICTIONLESS', () => {
    it('has valid structure according to schema', () => {
      const result = PatternTemplateSchema.safeParse(TEMPLATE_INCLINE_FRICTIONLESS)
      expect(result.success).toBe(true)
    })

    it('has correct templateId', () => {
      expect(TEMPLATE_INCLINE_FRICTIONLESS.templateId).toBe('mechanics/incline_frictionless')
    })

    it('has exactly 5 steps', () => {
      expect(TEMPLATE_INCLINE_FRICTIONLESS.stepBlueprints).toHaveLength(5)
    })

    it('has unique step IDs', () => {
      const ids = TEMPLATE_INCLINE_FRICTIONLESS.stepBlueprints.map(s => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('has rules set to no add/remove/reorder', () => {
      expect(TEMPLATE_INCLINE_FRICTIONLESS.rules).toBe('no add/remove/reorder')
    })

    it('includes diagram step first', () => {
      expect(TEMPLATE_INCLINE_FRICTIONLESS.stepBlueprints[0].type).toBe('diagram')
    })

    it('includes sanity check step last', () => {
      const lastStep = TEMPLATE_INCLINE_FRICTIONLESS.stepBlueprints.at(-1)
      expect(lastStep?.type).toBe('short')
      expect(lastStep?.id).toContain('sanity')
    })
  })

  describe('TEMPLATE_INCLINE_WITH_FRICTION', () => {
    it('has valid structure according to schema', () => {
      const result = PatternTemplateSchema.safeParse(TEMPLATE_INCLINE_WITH_FRICTION)
      expect(result.success).toBe(true)
    })

    it('has correct templateId', () => {
      expect(TEMPLATE_INCLINE_WITH_FRICTION.templateId).toBe('mechanics/incline_with_friction')
    })

    it('has exactly 7 steps', () => {
      expect(TEMPLATE_INCLINE_WITH_FRICTION.stepBlueprints).toHaveLength(7)
    })

    it('has unique step IDs', () => {
      const ids = TEMPLATE_INCLINE_WITH_FRICTION.stepBlueprints.map(s => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('includes friction-related variables', () => {
      expect(TEMPLATE_INCLINE_WITH_FRICTION.allowedVariables).toContain('coefficient_kinetic')
      expect(TEMPLATE_INCLINE_WITH_FRICTION.allowedVariables).toContain('friction_force')
    })
  })

  describe('TEMPLATE_NEWTON_2D_BLOCK', () => {
    it('has valid structure according to schema', () => {
      const result = PatternTemplateSchema.safeParse(TEMPLATE_NEWTON_2D_BLOCK)
      expect(result.success).toBe(true)
    })

    it('has correct templateId', () => {
      expect(TEMPLATE_NEWTON_2D_BLOCK.templateId).toBe('mechanics/newton_2d_block')
    })

    it('has exactly 8 steps', () => {
      expect(TEMPLATE_NEWTON_2D_BLOCK.stepBlueprints).toHaveLength(8)
    })

    it('has unique step IDs', () => {
      const ids = TEMPLATE_NEWTON_2D_BLOCK.stepBlueprints.map(s => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('includes x and y equation steps', () => {
      const stepIds = TEMPLATE_NEWTON_2D_BLOCK.stepBlueprints.map(s => s.id)
      expect(stepIds.some(id => id.includes('x-equation'))).toBe(true)
      expect(stepIds.some(id => id.includes('y-equation'))).toBe(true)
    })
  })
})

// =============================================================================
// TEMPLATE_REGISTRY Tests
// =============================================================================

describe('TEMPLATE_REGISTRY', () => {
  it('contains all three templates', () => {
    expect(Object.keys(TEMPLATE_REGISTRY)).toHaveLength(3)
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
})

// =============================================================================
// findBestTemplate Tests
// =============================================================================

describe('findBestTemplate', () => {
  it('finds exact match for topic/subtopic', () => {
    const template = findBestTemplate('mechanics', 'inclined_plane')
    expect(template).not.toBeNull()
    expect(template?.topic).toBe('mechanics')
  })

  it('finds template for topic with similar subtopic', () => {
    const template = findBestTemplate('mechanics', 'incline_plane') // slight variation
    expect(template).not.toBeNull()
    expect(template?.topic).toBe('mechanics')
  })

  it('returns mechanics template for generic mechanics subtopic', () => {
    const template = findBestTemplate('mechanics', 'some_random_subtopic')
    expect(template).not.toBeNull()
    expect(template?.topic).toBe('mechanics')
  })

  it('returns null for unregistered topic', () => {
    const template = findBestTemplate('quantum_gravity', 'string_theory')
    expect(template).toBeNull()
  })

  it('prefers friction template when subtopic mentions friction', () => {
    const template = findBestTemplate('mechanics', 'inclined_plane_friction')
    expect(template).not.toBeNull()
    expect(template?.templateId).toBe('mechanics/incline_with_friction')
  })

  it('prefers newton template for 2d/newton subtopics', () => {
    const template = findBestTemplate('mechanics', 'newton_laws_2d')
    expect(template).not.toBeNull()
    expect(template?.templateId).toBe('mechanics/newton_2d_block')
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

  it('returns exactly 3 IDs', () => {
    const ids = getAllTemplateIds()
    expect(ids).toHaveLength(3)
  })

  it('all IDs are valid template IDs', () => {
    const ids = getAllTemplateIds()
    for (const id of ids) {
      expect(getTemplate(id)).not.toBeNull()
    }
  })

  it('includes all expected template IDs', () => {
    const ids = getAllTemplateIds()
    expect(ids).toContain('mechanics/incline_frictionless')
    expect(ids).toContain('mechanics/incline_with_friction')
    expect(ids).toContain('mechanics/newton_2d_block')
  })
})

// =============================================================================
// Template Content Tests
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
})
