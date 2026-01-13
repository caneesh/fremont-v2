import { NextRequest, NextResponse } from 'next/server';
import {
  decideEmbedding,
  buildRetrievalContext,
  getFailureFallback,
  createRAGMetadata,
  validateForIngestion,
  CONTENT_TYPE_RULES,
} from '@/lib/curriculum/ragIngestion';
import type { RAGContentType } from '@/types/atomicLearning';

/**
 * POST /api/curriculum/rag
 * RAG ingestion and annotation APIs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'decide-embedding': {
        // Decide if content should be embedded
        const { content, contentType, context } = body;

        if (!content || !contentType) {
          return NextResponse.json(
            { error: 'Missing required fields: content, contentType' },
            { status: 400 }
          );
        }

        const decision = decideEmbedding(
          content,
          contentType as RAGContentType,
          context
        );

        return NextResponse.json({
          success: true,
          data: decision,
        });
      }

      case 'build-context': {
        // Build retrieval context for content
        const { content, metadata } = body;

        if (!content || !metadata) {
          return NextResponse.json(
            { error: 'Missing required fields: content, metadata' },
            { status: 400 }
          );
        }

        const context = buildRetrievalContext(content, metadata);

        return NextResponse.json({
          success: true,
          data: context,
        });
      }

      case 'get-fallback': {
        // Get failure fallback for a given failure type
        const { failureType } = body;

        if (!failureType) {
          return NextResponse.json(
            { error: 'Missing required field: failureType' },
            { status: 400 }
          );
        }

        const fallback = getFailureFallback(failureType);

        return NextResponse.json({
          success: true,
          data: fallback,
        });
      }

      case 'create-metadata': {
        // Create RAG metadata
        const { contentType, retrievalTags, options } = body;

        if (!contentType) {
          return NextResponse.json(
            { error: 'Missing required field: contentType' },
            { status: 400 }
          );
        }

        const metadata = createRAGMetadata(
          contentType as RAGContentType,
          retrievalTags || [],
          options
        );

        return NextResponse.json({
          success: true,
          data: metadata,
        });
      }

      case 'validate': {
        // Validate content for ingestion
        const { content, metadata } = body;

        if (!content || !metadata) {
          return NextResponse.json(
            { error: 'Missing required fields: content, metadata' },
            { status: 400 }
          );
        }

        const result = validateForIngestion(content, metadata);

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case 'get-rules': {
        // Get content type rules
        const { contentType } = body;

        if (contentType) {
          const rule = CONTENT_TYPE_RULES[contentType as RAGContentType];
          if (!rule) {
            return NextResponse.json(
              { error: `Unknown content type: ${contentType}` },
              { status: 400 }
            );
          }
          return NextResponse.json({
            success: true,
            data: rule,
          });
        }

        // Return all rules
        return NextResponse.json({
          success: true,
          data: CONTENT_TYPE_RULES,
        });
      }

      case 'batch-validate': {
        // Validate multiple content items
        const { items } = body;

        if (!items || !Array.isArray(items)) {
          return NextResponse.json(
            { error: 'Missing required field: items (array)' },
            { status: 400 }
          );
        }

        const results = items.map((item: { content: string; metadata: unknown }) => {
          const validation = validateForIngestion(
            item.content,
            item.metadata as Parameters<typeof validateForIngestion>[1]
          );
          return {
            content: item.content.substring(0, 50) + '...',
            ...validation,
          };
        });

        const summary = {
          total: results.length,
          valid: results.filter((r) => r.valid).length,
          invalid: results.filter((r) => !r.valid).length,
          withWarnings: results.filter((r) => r.warnings.length > 0).length,
        };

        return NextResponse.json({
          success: true,
          data: { results, summary },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in RAG API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
