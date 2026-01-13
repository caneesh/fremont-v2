import { describe, it, expect } from 'vitest';
import { GET, POST } from '../evolution/route';
import { NextRequest } from 'next/server';

// Helper to create mock GET requests
function createMockGetRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/curriculum/evolution');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url, { method: 'GET' });
}

// Helper to create mock POST requests
function createMockPostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/curriculum/evolution', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('Evolution API Route', () => {
  describe('GET /api/curriculum/evolution', () => {
    it('should return available evolution maps when no concept specified', async () => {
      const request = createMockGetRequest();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('available');
      expect(data.data).toHaveProperty('gradeOrder');
      expect(Array.isArray(data.data.available)).toBe(true);
    });

    it('should return specific evolution map when concept is provided', async () => {
      const request = createMockGetRequest({ concept: 'newtons_laws' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('conceptFamily');
      expect(data.data).toHaveProperty('stages');
    });

    it('should return 404 for unknown concept', async () => {
      const request = createMockGetRequest({ concept: 'unknown_concept_xyz' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('POST analyze action', () => {
    it('should analyze evolution map', async () => {
      const request = createMockPostRequest({
        action: 'analyze',
        conceptFamily: 'newtons_laws',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should return 400 if conceptFamily is missing', async () => {
      const request = createMockPostRequest({
        action: 'analyze',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 404 for unknown concept family', async () => {
      const request = createMockPostRequest({
        action: 'analyze',
        conceptFamily: 'unknown_concept',
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });

  describe('POST check-readiness action', () => {
    it('should check level readiness', async () => {
      const request = createMockPostRequest({
        action: 'check-readiness',
        conceptFamily: 'newtons_laws',
        targetLevel: 'class11',
        studentProgress: {
          masteredConcepts: ['n3l_basic', 'n3l_contact_forces'],
          resolvedMisconceptions: ['horse_cart_paradox'],
          completedArchetypes: ['basic_interaction'],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('ready');
    });

    it('should return 400 if required fields are missing', async () => {
      const request = createMockPostRequest({
        action: 'check-readiness',
        conceptFamily: 'newtons_laws',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('POST get-payoffs action', () => {
    it('should get payoff tags', async () => {
      const request = createMockPostRequest({
        action: 'get-payoffs',
        conceptFamily: 'newtons_laws',
        currentLevel: 'class9',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('payoffs');
    });

    it('should return 400 if required fields are missing', async () => {
      const request = createMockPostRequest({
        action: 'get-payoffs',
        conceptFamily: 'newtons_laws',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('POST get-prerequisites action', () => {
    it('should get cross-level prerequisites', async () => {
      const request = createMockPostRequest({
        action: 'get-prerequisites',
        conceptFamily: 'newtons_laws',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('prerequisites');
    });

    it('should return 400 if conceptFamily is missing', async () => {
      const request = createMockPostRequest({
        action: 'get-prerequisites',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('POST get-stage action', () => {
    it('should get specific stage from evolution map', async () => {
      const request = createMockPostRequest({
        action: 'get-stage',
        conceptFamily: 'newtons_laws',
        level: 'class9',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('stage');
      expect(data.data).toHaveProperty('gradeIndex');
      expect(data.data).toHaveProperty('nextGrade');
    });

    it('should return 400 if required fields are missing', async () => {
      const request = createMockPostRequest({
        action: 'get-stage',
        conceptFamily: 'newtons_laws',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 404 if stage not found', async () => {
      const request = createMockPostRequest({
        action: 'get-stage',
        conceptFamily: 'newtons_laws',
        level: 'kindergarten',
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });

  describe('unknown action', () => {
    it('should return 400 for unknown action', async () => {
      const request = createMockPostRequest({
        action: 'unknown-action',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unknown action');
    });
  });
});
