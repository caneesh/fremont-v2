import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../rag/route';
import { NextRequest } from 'next/server';

// Helper to create mock requests
function createMockRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/curriculum/rag', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('RAG API Route', () => {
  describe('decide-embedding action', () => {
    it('should decide embedding for valid content', async () => {
      const request = createMockRequest({
        action: 'decide-embedding',
        content: 'Newton\'s Third Law states that for every action, there is an equal and opposite reaction.',
        contentType: 'authoritative_fact',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('embed');
      expect(data.data).toHaveProperty('reason');
    });

    it('should return 400 if content is missing', async () => {
      const request = createMockRequest({
        action: 'decide-embedding',
        contentType: 'authoritative_fact',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('content');
    });

    it('should return 400 if contentType is missing', async () => {
      const request = createMockRequest({
        action: 'decide-embedding',
        content: 'Some content',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('contentType');
    });
  });

  describe('build-context action', () => {
    it('should build retrieval context', async () => {
      const request = createMockRequest({
        action: 'build-context',
        content: 'Newton\'s Third Law explanation',
        metadata: {
          contentType: 'authoritative_fact',
          retrievalTags: ['physics', 'mechanics', 'newton'],
          embeddable: true,
          priority: 10,
          exclusions: [],
          uncertainty: { confident: true },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should return 400 if content is missing', async () => {
      const request = createMockRequest({
        action: 'build-context',
        metadata: { contentType: 'authoritative_fact' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('get-fallback action', () => {
    it('should return fallback for failure type', async () => {
      const request = createMockRequest({
        action: 'get-fallback',
        failureType: 'no_results',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should return 400 if failureType is missing', async () => {
      const request = createMockRequest({
        action: 'get-fallback',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('create-metadata action', () => {
    it('should create RAG metadata', async () => {
      const request = createMockRequest({
        action: 'create-metadata',
        contentType: 'authoritative_fact',
        retrievalTags: ['physics', 'mechanics'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('contentType', 'authoritative_fact');
    });

    it('should return 400 if contentType is missing', async () => {
      const request = createMockRequest({
        action: 'create-metadata',
        retrievalTags: ['physics'],
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('validate action', () => {
    it('should validate content for ingestion', async () => {
      const request = createMockRequest({
        action: 'validate',
        content: 'This is valid content for ingestion testing.',
        metadata: {
          contentType: 'authoritative_fact',
          retrievalTags: ['physics'],
          embeddable: true,
          priority: 10,
          exclusions: [],
          uncertainty: { confident: true },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('valid');
    });

    it('should return 400 if content is missing', async () => {
      const request = createMockRequest({
        action: 'validate',
        metadata: { contentType: 'authoritative_fact' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('get-rules action', () => {
    it('should return all rules when no contentType provided', async () => {
      const request = createMockRequest({
        action: 'get-rules',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should return specific rules for contentType', async () => {
      const request = createMockRequest({
        action: 'get-rules',
        contentType: 'authoritative_fact',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for unknown contentType', async () => {
      const request = createMockRequest({
        action: 'get-rules',
        contentType: 'unknown_type',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('batch-validate action', () => {
    it('should validate multiple items', async () => {
      const request = createMockRequest({
        action: 'batch-validate',
        items: [
          {
            content: 'First content item for validation.',
            metadata: {
              contentType: 'authoritative_fact',
              retrievalTags: ['physics'],
              embeddable: true,
              priority: 10,
              exclusions: [],
              uncertainty: { confident: true },
            },
          },
          {
            content: 'Second content item for validation.',
            metadata: {
              contentType: 'misconception_trap',
              retrievalTags: ['physics'],
              embeddable: true,
              priority: 5,
              exclusions: [],
              uncertainty: { confident: true },
            },
          },
        ],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(2);
      expect(data.data.summary).toHaveProperty('total', 2);
    });

    it('should return 400 if items is not an array', async () => {
      const request = createMockRequest({
        action: 'batch-validate',
        items: 'not an array',
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
