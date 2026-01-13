import { NextRequest, NextResponse } from 'next/server';
import {
  createDifficultyScores,
  matchContentToProfile,
  getDifficultyProfile,
  suggestPrerequisites,
  scoreToLevel,
  levelToScore,
  DIFFICULTY_LEVELS,
  ALL_RUBRICS,
} from '@/lib/curriculum/difficultyTaxonomy';
import type { DifficultyLevel, FoundationLevel } from '@/types/atomicLearning';

/**
 * POST /api/curriculum/difficulty
 * Difficulty analysis and scoring APIs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create-scores': {
        // Create difficulty scores from dimensions
        const { dimensions } = body;

        if (!dimensions) {
          return NextResponse.json(
            { error: 'Missing required field: dimensions' },
            { status: 400 }
          );
        }

        const scores = createDifficultyScores(
          {
            level: dimensions.conceptualLoad?.level as DifficultyLevel || 'novice',
            rationale: dimensions.conceptualLoad?.rationale || '',
          },
          {
            level: dimensions.reasoningDepth?.level as DifficultyLevel || 'novice',
            rationale: dimensions.reasoningDepth?.rationale || '',
          },
          {
            level: dimensions.transferDistance?.level as DifficultyLevel || 'novice',
            rationale: dimensions.transferDistance?.rationale || '',
          },
          {
            level: dimensions.representationSwitching?.level as DifficultyLevel || 'novice',
            rationale: dimensions.representationSwitching?.rationale || '',
          },
          {
            level: dimensions.misconceptionRisk?.level as DifficultyLevel || 'novice',
            rationale: dimensions.misconceptionRisk?.rationale || '',
          }
        );

        return NextResponse.json({
          success: true,
          data: scores,
        });
      }

      case 'match-profile': {
        // Match content difficulty to student profile
        const { difficulty, profile } = body;

        if (!difficulty || !profile) {
          return NextResponse.json(
            { error: 'Missing required fields: difficulty, profile' },
            { status: 400 }
          );
        }

        const scores = createDifficultyScores(
          { level: difficulty.conceptualLoad as DifficultyLevel, rationale: '' },
          { level: difficulty.reasoningDepth as DifficultyLevel, rationale: '' },
          { level: difficulty.transferDistance as DifficultyLevel, rationale: '' },
          { level: difficulty.representationSwitching as DifficultyLevel, rationale: '' },
          { level: difficulty.misconceptionRisk as DifficultyLevel, rationale: '' }
        );

        const result = matchContentToProfile(scores, {
          foundationLevel: profile.foundationLevel as FoundationLevel,
          conceptualStrength: profile.conceptualStrength as DifficultyLevel,
          reasoningStrength: profile.reasoningStrength as DifficultyLevel,
          transferStrength: profile.transferStrength as DifficultyLevel,
          toleratesAmbiguity: profile.toleratesAmbiguity ?? true,
        });

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case 'get-profile': {
        // Get human-readable difficulty profile
        const { difficulty } = body;

        if (!difficulty) {
          return NextResponse.json(
            { error: 'Missing required field: difficulty' },
            { status: 400 }
          );
        }

        const scores = createDifficultyScores(
          { level: difficulty.conceptualLoad as DifficultyLevel, rationale: '' },
          { level: difficulty.reasoningDepth as DifficultyLevel, rationale: '' },
          { level: difficulty.transferDistance as DifficultyLevel, rationale: '' },
          { level: difficulty.representationSwitching as DifficultyLevel, rationale: '' },
          { level: difficulty.misconceptionRisk as DifficultyLevel, rationale: '' }
        );

        const profile = getDifficultyProfile(scores);

        return NextResponse.json({
          success: true,
          data: { profile },
        });
      }

      case 'suggest-prerequisites': {
        // Suggest prerequisites based on difficulty
        const { difficulty } = body;

        if (!difficulty) {
          return NextResponse.json(
            { error: 'Missing required field: difficulty' },
            { status: 400 }
          );
        }

        const scores = createDifficultyScores(
          { level: difficulty.conceptualLoad as DifficultyLevel, rationale: '' },
          { level: difficulty.reasoningDepth as DifficultyLevel, rationale: '' },
          { level: difficulty.transferDistance as DifficultyLevel, rationale: '' },
          { level: difficulty.representationSwitching as DifficultyLevel, rationale: '' },
          { level: difficulty.misconceptionRisk as DifficultyLevel, rationale: '' }
        );

        const suggestions = suggestPrerequisites(scores);

        return NextResponse.json({
          success: true,
          data: { suggestions },
        });
      }

      case 'get-rubrics': {
        // Get all difficulty rubrics
        return NextResponse.json({
          success: true,
          data: {
            rubrics: ALL_RUBRICS,
            levels: DIFFICULTY_LEVELS,
          },
        });
      }

      case 'convert': {
        // Convert between score and level
        const { score, level } = body;

        if (score !== undefined) {
          return NextResponse.json({
            success: true,
            data: { level: scoreToLevel(score) },
          });
        }

        if (level !== undefined) {
          return NextResponse.json({
            success: true,
            data: { score: levelToScore(level as DifficultyLevel) },
          });
        }

        return NextResponse.json(
          { error: 'Must provide either score or level' },
          { status: 400 }
        );
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in difficulty API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
