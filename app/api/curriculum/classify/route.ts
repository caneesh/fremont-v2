import { NextRequest, NextResponse } from 'next/server';
import {
  classifyContent,
  createFoundationClassification,
  checkTransitionEligibility,
  getSkillsForFoundation,
  getSkillDescription,
  FOUNDATION_1_CRITERIA,
  FOUNDATION_2_CRITERIA,
} from '@/lib/curriculum/foundationClassification';
import {
  createDifficultyScores,
  validateDifficultyForFoundation,
} from '@/lib/curriculum/difficultyTaxonomy';
import type { DifficultyLevel, FoundationLevel } from '@/types/atomicLearning';

/**
 * POST /api/curriculum/classify
 * Classify content for Foundation 1/2 levels
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'classify': {
        // Classify content based on characteristics
        const { difficulty, characteristics } = body;

        if (!difficulty || !characteristics) {
          return NextResponse.json(
            { error: 'Missing required fields: difficulty, characteristics' },
            { status: 400 }
          );
        }

        const difficultyScores = createDifficultyScores(
          { level: difficulty.conceptualLoad as DifficultyLevel, rationale: '' },
          { level: difficulty.reasoningDepth as DifficultyLevel, rationale: '' },
          { level: difficulty.transferDistance as DifficultyLevel, rationale: '' },
          { level: difficulty.representationSwitching as DifficultyLevel, rationale: '' },
          { level: difficulty.misconceptionRisk as DifficultyLevel, rationale: '' }
        );

        const result = classifyContent(difficultyScores, {
          requiresFBD: characteristics.requiresFBD ?? false,
          isIntuitionBased: characteristics.isIntuitionBased ?? true,
          hasNonObviousInteraction: characteristics.hasNonObviousInteraction ?? false,
          reasoningSteps: characteristics.reasoningSteps ?? 2,
          mathLevel: characteristics.mathLevel ?? 'arithmetic',
        });

        return NextResponse.json({
          success: true,
          data: {
            level: result.level,
            confidence: result.confidence,
            reasons: result.reasons,
            violations: result.violations,
          },
        });
      }

      case 'create-classification': {
        // Create a Foundation classification object
        const { level, targetSkills, prerequisites } = body;

        if (!level) {
          return NextResponse.json(
            { error: 'Missing required field: level' },
            { status: 400 }
          );
        }

        const classification = createFoundationClassification(
          level as FoundationLevel,
          targetSkills || [],
          prerequisites || []
        );

        return NextResponse.json({
          success: true,
          data: classification,
        });
      }

      case 'check-transition': {
        // Check if student is eligible to transition to next level
        const { currentLevel, stats } = body;

        if (!currentLevel || !stats) {
          return NextResponse.json(
            { error: 'Missing required fields: currentLevel, stats' },
            { status: 400 }
          );
        }

        const result = checkTransitionEligibility(
          currentLevel as FoundationLevel,
          {
            questionsCompleted: stats.questionsCompleted ?? 0,
            averageScore: stats.averageScore ?? 0,
            skillsCovered: stats.skillsCovered ?? [],
          }
        );

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case 'get-skills': {
        // Get skills for a foundation level
        const { level } = body;

        if (!level) {
          return NextResponse.json(
            { error: 'Missing required field: level' },
            { status: 400 }
          );
        }

        const skills = getSkillsForFoundation(level as FoundationLevel);
        const skillsWithDescriptions = skills.map((skillId) => ({
          id: skillId,
          description: getSkillDescription(skillId),
        }));

        return NextResponse.json({
          success: true,
          data: skillsWithDescriptions,
        });
      }

      case 'get-criteria': {
        // Get criteria for a foundation level
        const { level } = body;

        const criteria = level === 'foundation1'
          ? FOUNDATION_1_CRITERIA
          : FOUNDATION_2_CRITERIA;

        return NextResponse.json({
          success: true,
          data: criteria,
        });
      }

      case 'validate-difficulty': {
        // Validate difficulty scores against foundation constraints
        const { difficulty, level } = body;

        if (!difficulty || !level) {
          return NextResponse.json(
            { error: 'Missing required fields: difficulty, level' },
            { status: 400 }
          );
        }

        const difficultyScores = createDifficultyScores(
          { level: difficulty.conceptualLoad as DifficultyLevel, rationale: '' },
          { level: difficulty.reasoningDepth as DifficultyLevel, rationale: '' },
          { level: difficulty.transferDistance as DifficultyLevel, rationale: '' },
          { level: difficulty.representationSwitching as DifficultyLevel, rationale: '' },
          { level: difficulty.misconceptionRisk as DifficultyLevel, rationale: '' }
        );

        const result = validateDifficultyForFoundation(
          difficultyScores,
          level as FoundationLevel
        );

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in classification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
