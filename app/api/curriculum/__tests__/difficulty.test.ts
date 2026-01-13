import { describe, it, expect } from 'vitest';
import { POST } from '../difficulty/route';
import { NextRequest } from 'next/server';

// Helper to create mock requests
function createMockRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/curriculum/difficulty', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('Difficulty API Route', () => {
  describe('create-scores action', () => {
    it('should create difficulty scores from dimensions', async () => {
      const request = createMockRequest({
        action: 'create-scores',
        dimensions: {
          conceptualLoad: { level: 'proficient', rationale: 'Multiple concepts' },
          reasoningDepth: { level: 'proficient', rationale: 'Multi-step reasoning' },
          transferDistance: { level: 'novice', rationale: 'Direct application' },
          representationSwitching: { level: 'novice', rationale: 'Single representation' },
          misconceptionRisk: { level: 'proficient', rationale: 'Common misconception' },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('conceptualLoad');
      expect(data.data).toHaveProperty('reasoningDepth');
      expect(data.data).toHaveProperty('composite');
      expect(data.data.composite).toHaveProperty('overall');
    });

    it('should use defaults for missing dimensions', async () => {
      const request = createMockRequest({
        action: 'create-scores',
        dimensions: {
          conceptualLoad: { level: 'advanced' },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('composite');
    });

    it('should return 400 if dimensions is missing', async () => {
      const request = createMockRequest({
        action: 'create-scores',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('match-profile action', () => {
    it('should match content difficulty to student profile', async () => {
      const request = createMockRequest({
        action: 'match-profile',
        difficulty: {
          conceptualLoad: 'proficient',
          reasoningDepth: 'proficient',
          transferDistance: 'novice',
          representationSwitching: 'novice',
          misconceptionRisk: 'proficient',
        },
        profile: {
          foundationLevel: 'foundation1',
          conceptualStrength: 'proficient',
          reasoningStrength: 'proficient',
          transferStrength: 'novice',
          toleratesAmbiguity: true,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('match');
      expect(data.data).toHaveProperty('reasons');
    });

    it('should return 400 if difficulty is missing', async () => {
      const request = createMockRequest({
        action: 'match-profile',
        profile: { foundationLevel: 'foundation1' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 if profile is missing', async () => {
      const request = createMockRequest({
        action: 'match-profile',
        difficulty: { conceptualLoad: 'proficient' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('get-profile action', () => {
    it('should get human-readable difficulty profile', async () => {
      const request = createMockRequest({
        action: 'get-profile',
        difficulty: {
          conceptualLoad: 'advanced',
          reasoningDepth: 'proficient',
          transferDistance: 'advanced',
          representationSwitching: 'proficient',
          misconceptionRisk: 'novice',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('profile');
      expect(typeof data.data.profile).toBe('string');
    });

    it('should return 400 if difficulty is missing', async () => {
      const request = createMockRequest({
        action: 'get-profile',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('suggest-prerequisites action', () => {
    it('should suggest prerequisites based on difficulty', async () => {
      const request = createMockRequest({
        action: 'suggest-prerequisites',
        difficulty: {
          conceptualLoad: 'expert',
          reasoningDepth: 'advanced',
          transferDistance: 'advanced',
          representationSwitching: 'proficient',
          misconceptionRisk: 'advanced',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('suggestions');
      expect(Array.isArray(data.data.suggestions)).toBe(true);
    });

    it('should return 400 if difficulty is missing', async () => {
      const request = createMockRequest({
        action: 'suggest-prerequisites',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('get-rubrics action', () => {
    it('should return all difficulty rubrics', async () => {
      const request = createMockRequest({
        action: 'get-rubrics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('rubrics');
      expect(data.data).toHaveProperty('levels');
    });
  });

  describe('convert action', () => {
    it('should convert score to level', async () => {
      const request = createMockRequest({
        action: 'convert',
        score: 3,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('level');
    });

    it('should convert level to score', async () => {
      const request = createMockRequest({
        action: 'convert',
        level: 'advanced',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('score');
    });

    it('should return 400 if neither score nor level provided', async () => {
      const request = createMockRequest({
        action: 'convert',
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
