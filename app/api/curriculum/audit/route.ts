import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  auditContentPack,
  auditConceptCard,
  auditSocraticTree,
  generateQualityChecklist,
} from '@/lib/curriculum/curriculumAudit';
import type { ContentPack, ConceptCard, SocraticTree } from '@/types/atomicLearning';

/**
 * POST /api/curriculum/audit
 * Curriculum content audit APIs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'audit-pack': {
        // Audit a content pack (by concept ID or provided content)
        const { concept, contentPack } = body;

        let pack: ContentPack;

        if (contentPack) {
          // Use provided content pack
          pack = contentPack;
        } else if (concept) {
          // Load content pack from file
          const conceptFileMap: Record<string, string> = {
            newtons_third_law: 'newtonsThirdLaw.json',
            n3l: 'newtonsThirdLaw.json',
          };

          const fileName = conceptFileMap[concept.toLowerCase()];
          if (!fileName) {
            return NextResponse.json(
              { error: `Content pack not found for concept: ${concept}` },
              { status: 404 }
            );
          }

          const filePath = path.join(process.cwd(), 'data', 'curriculum', fileName);
          const fileContent = await readFile(filePath, 'utf-8');
          pack = JSON.parse(fileContent);
        } else {
          return NextResponse.json(
            { error: 'Must provide either concept or contentPack' },
            { status: 400 }
          );
        }

        const result = auditContentPack(pack);

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case 'audit-concept-card': {
        // Audit a single concept card
        const { conceptCard } = body;

        if (!conceptCard) {
          return NextResponse.json(
            { error: 'Missing required field: conceptCard' },
            { status: 400 }
          );
        }

        const risks = auditConceptCard(conceptCard as ConceptCard);

        return NextResponse.json({
          success: true,
          data: { risks },
        });
      }

      case 'audit-socratic-tree': {
        // Audit a single Socratic tree
        const { socraticTree } = body;

        if (!socraticTree) {
          return NextResponse.json(
            { error: 'Missing required field: socraticTree' },
            { status: 400 }
          );
        }

        const risks = auditSocraticTree(socraticTree as SocraticTree);

        return NextResponse.json({
          success: true,
          data: { risks },
        });
      }

      case 'quality-checklist': {
        // Generate quality checklist for a content pack
        const { concept, contentPack } = body;

        let pack: ContentPack;

        if (contentPack) {
          pack = contentPack;
        } else if (concept) {
          const conceptFileMap: Record<string, string> = {
            newtons_third_law: 'newtonsThirdLaw.json',
            n3l: 'newtonsThirdLaw.json',
          };

          const fileName = conceptFileMap[concept.toLowerCase()];
          if (!fileName) {
            return NextResponse.json(
              { error: `Content pack not found for concept: ${concept}` },
              { status: 404 }
            );
          }

          const filePath = path.join(process.cwd(), 'data', 'curriculum', fileName);
          const fileContent = await readFile(filePath, 'utf-8');
          pack = JSON.parse(fileContent);
        } else {
          return NextResponse.json(
            { error: 'Must provide either concept or contentPack' },
            { status: 400 }
          );
        }

        const checklist = generateQualityChecklist(pack);

        // Calculate summary
        const passed = checklist.filter((c) => c.passed).length;
        const failed = checklist.filter((c) => !c.passed).length;

        return NextResponse.json({
          success: true,
          data: {
            checklist,
            summary: {
              total: checklist.length,
              passed,
              failed,
              passRate: (passed / checklist.length) * 100,
            },
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in audit API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
