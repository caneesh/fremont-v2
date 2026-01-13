import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { ContentPack } from '@/types/atomicLearning';

/**
 * GET /api/curriculum/content-pack
 * Fetch a content pack by concept node
 *
 * Query params:
 * - concept: The concept node ID (e.g., "newtons_third_law")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const concept = searchParams.get('concept');

    if (!concept) {
      return NextResponse.json(
        { error: 'Missing required parameter: concept' },
        { status: 400 }
      );
    }

    // Map concept to file path
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

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const contentPack: ContentPack = JSON.parse(fileContent);

      return NextResponse.json({
        success: true,
        data: contentPack,
      });
    } catch {
      return NextResponse.json(
        { error: `Failed to load content pack: ${concept}` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching content pack:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/curriculum/content-pack/list
 * List all available content packs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'list') {
      // Return list of available content packs
      const available = [
        {
          id: 'newtons_third_law',
          name: "Newton's Third Law",
          grade: 'class9',
          module: 'laws_of_motion',
        },
      ];

      return NextResponse.json({
        success: true,
        data: available,
      });
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in content pack action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
