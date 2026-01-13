import { describe, it, expect } from 'vitest';
import { POST } from '../audit/route';
import { NextRequest } from 'next/server';

// Helper to create mock requests
function createMockRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/curriculum/audit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('Audit API Route', () => {
  describe('audit-pack action', () => {
    it('should return 400 if neither concept nor contentPack provided', async () => {
      const request = createMockRequest({
        action: 'audit-pack',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 404 for unknown concept', async () => {
      const request = createMockRequest({
        action: 'audit-pack',
        concept: 'unknown_concept',
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });

  describe('audit-concept-card action', () => {
    it('should return 400 if conceptCard is missing', async () => {
      const request = createMockRequest({
        action: 'audit-concept-card',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('audit-socratic-tree action', () => {
    it('should return 400 if socraticTree is missing', async () => {
      const request = createMockRequest({
        action: 'audit-socratic-tree',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('quality-checklist action', () => {
    it('should return 400 if neither concept nor contentPack provided', async () => {
      const request = createMockRequest({
        action: 'quality-checklist',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 404 for unknown concept', async () => {
      const request = createMockRequest({
        action: 'quality-checklist',
        concept: 'unknown_concept',
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
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
