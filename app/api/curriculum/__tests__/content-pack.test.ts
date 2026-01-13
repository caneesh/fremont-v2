import { describe, it, expect } from 'vitest';
import { GET, POST } from '../content-pack/route';
import { NextRequest } from 'next/server';

// Helper to create mock GET requests
function createMockGetRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/curriculum/content-pack');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url, { method: 'GET' });
}

// Helper to create mock POST requests
function createMockPostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/curriculum/content-pack', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('Content Pack API Route', () => {
  describe('GET /api/curriculum/content-pack', () => {
    it('should return 400 if concept parameter is missing', async () => {
      const request = createMockGetRequest();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('concept');
    });

    it('should return 404 for unknown concept', async () => {
      const request = createMockGetRequest({ concept: 'unknown_concept' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    // Note: Tests for successful content pack loading would require
    // fs mocking or real file access. The library functions are tested
    // separately in lib/curriculum/__tests__/
  });

  describe('POST /api/curriculum/content-pack', () => {
    it('should list available content packs', async () => {
      const request = createMockPostRequest({ action: 'list' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0]).toHaveProperty('id');
      expect(data.data[0]).toHaveProperty('name');
      expect(data.data[0]).toHaveProperty('grade');
    });

    it('should return 400 for unknown action', async () => {
      const request = createMockPostRequest({ action: 'unknown' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unknown action');
    });
  });
});
