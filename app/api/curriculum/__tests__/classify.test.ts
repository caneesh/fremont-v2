import { describe, it, expect } from 'vitest';
import { POST } from '../classify/route';
import { NextRequest } from 'next/server';

// Helper to create mock requests
function createMockRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/curriculum/classify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('Classify API Route', () => {
  describe('classify action', () => {
    it('should classify content as Foundation 1', async () => {
      const request = createMockRequest({
        action: 'classify',
        difficulty: {
          conceptualLoad: 'novice',
          reasoningDepth: 'novice',
          transferDistance: 'novice',
          representationSwitching: 'novice',
          misconceptionRisk: 'novice',
        },
        characteristics: {
          requiresFBD: true,
          isIntuitionBased: true,
          hasNonObviousInteraction: false,
          reasoningSteps: 2,
          mathLevel: 'arithmetic',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('level');
      expect(data.data).toHaveProperty('confidence');
      expect(data.data).toHaveProperty('reasons');
    });

    it('should classify content as Foundation 2', async () => {
      const request = createMockRequest({
        action: 'classify',
        difficulty: {
          conceptualLoad: 'proficient',
          reasoningDepth: 'proficient',
          transferDistance: 'proficient',
          representationSwitching: 'novice',
          misconceptionRisk: 'proficient',
        },
        characteristics: {
          requiresFBD: true,
          isIntuitionBased: false,
          hasNonObviousInteraction: true,
          reasoningSteps: 4,
          mathLevel: 'algebra',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.level).toBe('foundation2');
    });

    it('should return 400 if difficulty is missing', async () => {
      const request = createMockRequest({
        action: 'classify',
        characteristics: { requiresFBD: true },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 if characteristics is missing', async () => {
      const request = createMockRequest({
        action: 'classify',
        difficulty: { conceptualLoad: 'novice' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('create-classification action', () => {
    it('should create Foundation classification object', async () => {
      const request = createMockRequest({
        action: 'create-classification',
        level: 'foundation1',
        targetSkills: ['fbd_identification', 'force_pairing'],
        prerequisites: ['basic_forces'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('level', 'foundation1');
      expect(data.data).toHaveProperty('targetSkills');
      expect(data.data).toHaveProperty('prerequisites');
    });

    it('should create classification with empty arrays as defaults', async () => {
      const request = createMockRequest({
        action: 'create-classification',
        level: 'foundation2',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 if level is missing', async () => {
      const request = createMockRequest({
        action: 'create-classification',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('check-transition action', () => {
    it('should check transition eligibility', async () => {
      const request = createMockRequest({
        action: 'check-transition',
        currentLevel: 'foundation1',
        stats: {
          questionsCompleted: 15,
          averageScore: 0.85,
          skillsCovered: ['f1_qualitative_reasoning', 'f1_representation', 'f1_cause_effect'],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('eligible');
      expect(data.data).toHaveProperty('missingRequirements');
    });

    it('should return 400 if currentLevel is missing', async () => {
      const request = createMockRequest({
        action: 'check-transition',
        stats: { questionsCompleted: 10 },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 if stats is missing', async () => {
      const request = createMockRequest({
        action: 'check-transition',
        currentLevel: 'foundation1',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('get-skills action', () => {
    it('should get skills for foundation level', async () => {
      const request = createMockRequest({
        action: 'get-skills',
        level: 'foundation1',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      if (data.data.length > 0) {
        expect(data.data[0]).toHaveProperty('id');
        expect(data.data[0]).toHaveProperty('description');
      }
    });

    it('should return 400 if level is missing', async () => {
      const request = createMockRequest({
        action: 'get-skills',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('get-criteria action', () => {
    it('should get criteria for foundation1', async () => {
      const request = createMockRequest({
        action: 'get-criteria',
        level: 'foundation1',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should get criteria for foundation2', async () => {
      const request = createMockRequest({
        action: 'get-criteria',
        level: 'foundation2',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('validate-difficulty action', () => {
    it('should validate difficulty for foundation level', async () => {
      const request = createMockRequest({
        action: 'validate-difficulty',
        difficulty: {
          conceptualLoad: 'novice',
          reasoningDepth: 'novice',
          transferDistance: 'novice',
          representationSwitching: 'novice',
          misconceptionRisk: 'novice',
        },
        level: 'foundation1',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('valid');
    });

    it('should return 400 if difficulty is missing', async () => {
      const request = createMockRequest({
        action: 'validate-difficulty',
        level: 'foundation1',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 if level is missing', async () => {
      const request = createMockRequest({
        action: 'validate-difficulty',
        difficulty: { conceptualLoad: 'novice' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('unknown action', () => {
    it('should return 400 for unknown action', async () => {
      const request = createMockRequest({
        action: 'unknown-action',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unknown action');
    });
  });
});
