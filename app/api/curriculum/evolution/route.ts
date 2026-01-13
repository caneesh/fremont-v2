import { NextRequest, NextResponse } from 'next/server';
import {
  getEvolutionMap,
  EVOLUTION_MAPS,
  GRADE_ORDER,
  getGradeIndex,
  getNextGrade,
  generatePayoffTags,
  getCrossLevelPrerequisites,
  analyzeEvolution,
  checkLevelReadiness,
} from '@/lib/curriculum/conceptEvolution';
import type { GradeLevel } from '@/lib/curriculum/conceptEvolution';

/**
 * GET /api/curriculum/evolution
 * Get evolution map for a concept family
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conceptFamily = searchParams.get('concept');

    if (!conceptFamily) {
      // Return list of available evolution maps
      const available = Object.entries(EVOLUTION_MAPS).map(([key, map]) => ({
        id: key,
        conceptFamily: map.conceptFamily,
        stages: map.stages.length,
        themes: map.themes,
      }));

      return NextResponse.json({
        success: true,
        data: {
          available,
          gradeOrder: GRADE_ORDER,
        },
      });
    }

    const map = getEvolutionMap(conceptFamily);

    if (!map) {
      return NextResponse.json(
        { error: `Evolution map not found for concept: ${conceptFamily}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: map,
    });
  } catch (error) {
    console.error('Error fetching evolution map:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/curriculum/evolution
 * Evolution analysis and readiness checking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'analyze': {
        // Analyze an evolution map
        const { conceptFamily } = body;

        if (!conceptFamily) {
          return NextResponse.json(
            { error: 'Missing required field: conceptFamily' },
            { status: 400 }
          );
        }

        const map = getEvolutionMap(conceptFamily);

        if (!map) {
          return NextResponse.json(
            { error: `Evolution map not found for concept: ${conceptFamily}` },
            { status: 404 }
          );
        }

        const analysis = analyzeEvolution(map);

        return NextResponse.json({
          success: true,
          data: analysis,
        });
      }

      case 'check-readiness': {
        // Check if student is ready for a grade level
        const { conceptFamily, targetLevel, studentProgress } = body;

        if (!conceptFamily || !targetLevel || !studentProgress) {
          return NextResponse.json(
            { error: 'Missing required fields: conceptFamily, targetLevel, studentProgress' },
            { status: 400 }
          );
        }

        const map = getEvolutionMap(conceptFamily);

        if (!map) {
          return NextResponse.json(
            { error: `Evolution map not found for concept: ${conceptFamily}` },
            { status: 404 }
          );
        }

        const result = checkLevelReadiness(
          {
            masteredConcepts: studentProgress.masteredConcepts || [],
            resolvedMisconceptions: studentProgress.resolvedMisconceptions || [],
            completedArchetypes: studentProgress.completedArchetypes || [],
          },
          targetLevel as GradeLevel,
          map
        );

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case 'get-payoffs': {
        // Get payoff tags for a concept at a grade level
        const { conceptFamily, currentLevel, conceptNode } = body;

        if (!conceptFamily || !currentLevel) {
          return NextResponse.json(
            { error: 'Missing required fields: conceptFamily, currentLevel' },
            { status: 400 }
          );
        }

        const map = getEvolutionMap(conceptFamily);

        if (!map) {
          return NextResponse.json(
            { error: `Evolution map not found for concept: ${conceptFamily}` },
            { status: 404 }
          );
        }

        const payoffs = generatePayoffTags(
          currentLevel as GradeLevel,
          conceptNode || conceptFamily,
          map
        );

        return NextResponse.json({
          success: true,
          data: { payoffs },
        });
      }

      case 'get-prerequisites': {
        // Get cross-level prerequisites
        const { conceptFamily } = body;

        if (!conceptFamily) {
          return NextResponse.json(
            { error: 'Missing required field: conceptFamily' },
            { status: 400 }
          );
        }

        const map = getEvolutionMap(conceptFamily);

        if (!map) {
          return NextResponse.json(
            { error: `Evolution map not found for concept: ${conceptFamily}` },
            { status: 404 }
          );
        }

        const prerequisites = getCrossLevelPrerequisites(map);

        return NextResponse.json({
          success: true,
          data: { prerequisites },
        });
      }

      case 'get-stage': {
        // Get a specific stage from an evolution map
        const { conceptFamily, level } = body;

        if (!conceptFamily || !level) {
          return NextResponse.json(
            { error: 'Missing required fields: conceptFamily, level' },
            { status: 400 }
          );
        }

        const map = getEvolutionMap(conceptFamily);

        if (!map) {
          return NextResponse.json(
            { error: `Evolution map not found for concept: ${conceptFamily}` },
            { status: 404 }
          );
        }

        const stage = map.stages.find((s) => s.level === level);

        if (!stage) {
          return NextResponse.json(
            { error: `Stage not found for level: ${level}` },
            { status: 404 }
          );
        }

        const gradeIndex = getGradeIndex(level as GradeLevel);
        const nextGrade = getNextGrade(level as GradeLevel);

        return NextResponse.json({
          success: true,
          data: {
            stage,
            gradeIndex,
            nextGrade,
            isLastStage: nextGrade === null,
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
    console.error('Error in evolution API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
