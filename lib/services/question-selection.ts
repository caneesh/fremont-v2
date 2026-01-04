import { PrismaClient, QuestionLifecycleState, QuestionProvenance, EdgeType, AIFeatureType } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface SelectionRequest {
  userId: string;
  currentQuestionId: string;
  requestType: 'same_difficulty' | 'harder';
  currentPatternId: string;
  currentDifficulty: number;
}

export interface SelectionResult {
  questionId: string;
  source: 'curated_edge' | 'pool_query' | 'ai_generated';
  isNewAiQuestion: boolean;
}

export interface AIGenerationResult {
  success: boolean;
  questionPayload?: Record<string, unknown>;
  model?: string;
  promptTemplateId?: string;
  promptTemplateVersion?: number;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  estimatedCost?: number;
  error?: string;
}

export type AIQuestionGenerator = (params: {
  patternId: string;
  targetDifficulty: number;
  sourceQuestionPayload: Record<string, unknown>;
  userId: string;
}) => Promise<AIGenerationResult>;

// =============================================================================
// CONSTANTS
// =============================================================================

const SELECTION_CONSTANTS = {
  MAX_AI_QUESTIONS_PER_USER_PER_DAY: 5,
  MAX_AI_QUESTIONS_PER_PATTERN_PER_DAY: 2,
  MAX_DIFFICULTY: 5,
  MIN_DIFFICULTY: 1,
  DIFFICULTY_INCREMENT: 1,
} as const;

// =============================================================================
// QUESTION SELECTION SERVICE
// =============================================================================

export class QuestionSelectionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiGenerator: AIQuestionGenerator
  ) {}

  async selectNextQuestion(request: SelectionRequest): Promise<SelectionResult | null> {
    // Step 1: Compute target difficulty
    const targetDifficulty = this.computeTargetDifficulty(request);
    const edgeType = request.requestType === 'same_difficulty'
      ? EdgeType.same_difficulty
      : EdgeType.harder;

    // Step 2: Get user's attempted question IDs
    const attemptedIds = await this.getAttemptedQuestionIds(request.userId);

    // Step 3: Try curated edges first
    const curatedQuestion = await this.queryCuratedEdge(
      request.currentQuestionId,
      edgeType,
      attemptedIds
    );
    if (curatedQuestion) {
      return {
        questionId: curatedQuestion,
        source: 'curated_edge',
        isNewAiQuestion: false,
      };
    }

    // Step 4: Try pool query (same pattern, target difficulty)
    const poolQuestion = await this.queryPool(
      request.currentPatternId,
      targetDifficulty,
      request.currentQuestionId,
      attemptedIds
    );
    if (poolQuestion) {
      return {
        questionId: poolQuestion,
        source: 'pool_query',
        isNewAiQuestion: false,
      };
    }

    // Step 5: Expand pool query for harder requests
    if (request.requestType === 'harder') {
      const expandedPoolQuestion = await this.queryExpandedPool(
        request.currentPatternId,
        request.currentDifficulty,
        request.currentQuestionId,
        attemptedIds
      );
      if (expandedPoolQuestion) {
        return {
          questionId: expandedPoolQuestion,
          source: 'pool_query',
          isNewAiQuestion: false,
        };
      }
    }

    // Step 6: Try related patterns
    const relatedPatternQuestion = await this.queryRelatedPatterns(
      request.currentQuestionId,
      targetDifficulty,
      attemptedIds
    );
    if (relatedPatternQuestion) {
      return {
        questionId: relatedPatternQuestion,
        source: 'pool_query',
        isNewAiQuestion: false,
      };
    }

    // Step 7: Check AI quotas
    const quotaCheck = await this.checkAIQuotas(request.userId, request.currentPatternId);
    if (!quotaCheck.allowed) {
      return null;
    }

    // Step 8: Check for reusable AI questions
    const reusableAiQuestion = await this.queryReusableAIQuestion(
      request.currentPatternId,
      targetDifficulty,
      request.currentQuestionId,
      attemptedIds
    );
    if (reusableAiQuestion) {
      await this.incrementAIQuota(request.userId, 0, 0);
      return {
        questionId: reusableAiQuestion,
        source: 'ai_generated',
        isNewAiQuestion: false,
      };
    }

    // Step 9: Generate new AI question
    return this.generateAndSaveAIQuestion(request, targetDifficulty);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private computeTargetDifficulty(request: SelectionRequest): number {
    if (request.requestType === 'same_difficulty') {
      return request.currentDifficulty;
    }
    return Math.min(
      request.currentDifficulty + SELECTION_CONSTANTS.DIFFICULTY_INCREMENT,
      SELECTION_CONSTANTS.MAX_DIFFICULTY
    );
  }

  private async getAttemptedQuestionIds(userId: string): Promise<string[]> {
    const attempts = await this.prisma.userQuestionHistory.findMany({
      where: { userId },
      select: { questionId: true },
    });
    return attempts.map((a) => a.questionId);
  }

  private async queryCuratedEdge(
    currentQuestionId: string,
    edgeType: EdgeType,
    attemptedIds: string[]
  ): Promise<string | null> {
    const result = await this.prisma.$queryRaw<{ question_id: string }[]>`
      SELECT q.question_id
      FROM question_edges qe
      INNER JOIN questions q ON q.id = qe.to_question_id
      WHERE qe.from_question_id = (
        SELECT id FROM questions WHERE question_id = ${currentQuestionId}
      )
        AND qe.edge_type = ${edgeType}::"EdgeType"
        AND q.lifecycle_state = 'approved'::"QuestionLifecycleState"
        AND q.question_id NOT IN (${attemptedIds.length > 0 ? attemptedIds : ['__none__']})
      ORDER BY qe.weight DESC, RANDOM()
      LIMIT 1
    `;
    return result[0]?.question_id ?? null;
  }

  private async queryPool(
    patternId: string,
    targetDifficulty: number,
    currentQuestionId: string,
    attemptedIds: string[]
  ): Promise<string | null> {
    const excludeIds = [...attemptedIds, currentQuestionId];

    const result = await this.prisma.question.findFirst({
      where: {
        primaryPatternId: patternId,
        difficulty: targetDifficulty,
        lifecycleState: QuestionLifecycleState.approved,
        questionId: { notIn: excludeIds },
      },
      orderBy: [
        { provenance: 'asc' }, // human-authored first (manual < ai_generated alphabetically)
        { createdAt: 'desc' },
      ],
      select: { questionId: true },
    });
    return result?.questionId ?? null;
  }

  private async queryExpandedPool(
    patternId: string,
    currentDifficulty: number,
    currentQuestionId: string,
    attemptedIds: string[]
  ): Promise<string | null> {
    const excludeIds = [...attemptedIds, currentQuestionId];

    const result = await this.prisma.question.findFirst({
      where: {
        primaryPatternId: patternId,
        difficulty: { gt: currentDifficulty },
        lifecycleState: QuestionLifecycleState.approved,
        questionId: { notIn: excludeIds },
      },
      orderBy: [
        { difficulty: 'asc' },
        { provenance: 'asc' },
        { createdAt: 'desc' },
      ],
      select: { questionId: true },
    });
    return result?.questionId ?? null;
  }

  private async queryRelatedPatterns(
    currentQuestionId: string,
    targetDifficulty: number,
    attemptedIds: string[]
  ): Promise<string | null> {
    const result = await this.prisma.$queryRaw<{ question_id: string }[]>`
      SELECT q.question_id
      FROM questions q
      INNER JOIN question_tags qt ON qt.question_id = q.id
      WHERE qt.tag_type = 'pattern'
        AND qt.tag_value IN (
          SELECT qt2.tag_value
          FROM question_tags qt2
          INNER JOIN questions q2 ON q2.id = qt2.question_id
          WHERE q2.question_id = ${currentQuestionId}
            AND qt2.tag_type = 'pattern'
        )
        AND q.difficulty = ${targetDifficulty}
        AND q.lifecycle_state = 'approved'::"QuestionLifecycleState"
        AND q.question_id != ${currentQuestionId}
        AND q.question_id NOT IN (${attemptedIds.length > 0 ? attemptedIds : ['__none__']})
      ORDER BY
        CASE WHEN q.provenance = 'ai_generated' THEN 1 ELSE 0 END,
        RANDOM()
      LIMIT 1
    `;
    return result[0]?.question_id ?? null;
  }

  private async checkAIQuotas(
    userId: string,
    patternId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check global AI quota
    const userQuota = await this.prisma.userAiQuota.aggregate({
      where: {
        userId,
        featureType: AIFeatureType.question_generation,
        quotaDate: today,
      },
      _sum: { usedCount: true },
    });

    const userAiCount = userQuota._sum.usedCount ?? 0;
    if (userAiCount >= SELECTION_CONSTANTS.MAX_AI_QUESTIONS_PER_USER_PER_DAY) {
      return { allowed: false, reason: 'daily_user_limit' };
    }

    // Check per-pattern AI quota
    const patternCount = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM questions q
      INNER JOIN user_question_history uqh ON uqh.question_id = q.question_id
      WHERE uqh.user_id = ${userId}
        AND q.provenance = 'ai_generated'::"QuestionProvenance"
        AND q.primary_pattern_id = ${patternId}
        AND DATE(uqh.started_at) = CURRENT_DATE
    `;

    const patternAiCount = Number(patternCount[0]?.count ?? 0);
    if (patternAiCount >= SELECTION_CONSTANTS.MAX_AI_QUESTIONS_PER_PATTERN_PER_DAY) {
      return { allowed: false, reason: 'daily_pattern_limit' };
    }

    return { allowed: true };
  }

  private async queryReusableAIQuestion(
    patternId: string,
    targetDifficulty: number,
    currentQuestionId: string,
    attemptedIds: string[]
  ): Promise<string | null> {
    const excludeIds = [...attemptedIds, currentQuestionId];

    const result = await this.prisma.question.findFirst({
      where: {
        primaryPatternId: patternId,
        difficulty: targetDifficulty,
        provenance: QuestionProvenance.ai_generated,
        lifecycleState: { in: [QuestionLifecycleState.approved, QuestionLifecycleState.draft] },
        questionId: { notIn: excludeIds },
      },
      orderBy: [
        { lifecycleState: 'asc' }, // approved before draft
        { createdAt: 'desc' },
      ],
      select: { questionId: true },
    });
    return result?.questionId ?? null;
  }

  private async generateAndSaveAIQuestion(
    request: SelectionRequest,
    targetDifficulty: number
  ): Promise<SelectionResult | null> {
    // Load source question
    const sourceQuestion = await this.prisma.question.findUnique({
      where: { questionId: request.currentQuestionId },
      select: { payload: true, topicTags: true },
    });

    if (!sourceQuestion) {
      return null;
    }

    // Generate via AI
    const aiResult = await this.aiGenerator({
      patternId: request.currentPatternId,
      targetDifficulty,
      sourceQuestionPayload: sourceQuestion.payload as Record<string, unknown>,
      userId: request.userId,
    });

    if (!aiResult.success || !aiResult.questionPayload) {
      // Log failed generation
      await this.prisma.aiGenerationLog.create({
        data: {
          userId: request.userId,
          featureType: AIFeatureType.question_generation,
          questionId: request.currentQuestionId,
          model: aiResult.model ?? 'unknown',
          inputTokens: aiResult.inputTokens ?? 0,
          outputTokens: aiResult.outputTokens ?? 0,
          latencyMs: aiResult.latencyMs ?? 0,
          estimatedCostUsd: aiResult.estimatedCost ?? 0,
          success: false,
          errorMessage: aiResult.error,
        },
      });
      return null;
    }

    // Generate new question ID
    const newQuestionId = this.generateQuestionId(request.currentPatternId);

    // Save AI question to database
    const newQuestion = await this.prisma.question.create({
      data: {
        questionId: newQuestionId,
        schemaVersion: 'question.v2',
        primaryPatternId: request.currentPatternId,
        difficulty: targetDifficulty,
        topicTags: sourceQuestion.topicTags,
        lifecycleState: QuestionLifecycleState.draft,
        provenance: QuestionProvenance.ai_generated,
        payload: aiResult.questionPayload,
        isAiGenerated: true,
        aiModel: aiResult.model,
        aiGeneratedAt: new Date(),
        aiHumanReviewed: false,
      },
    });

    // Insert tags from payload
    const payload = aiResult.questionPayload as { classification?: { patternTags?: string[] } };
    const patternTags = payload.classification?.patternTags ?? [];

    if (patternTags.length > 0) {
      await this.prisma.questionTag.createMany({
        data: patternTags.map((tag) => ({
          questionId: newQuestion.id,
          tagType: 'pattern',
          tagValue: tag,
        })),
        skipDuplicates: true,
      });
    }

    // Log successful generation
    await this.prisma.aiGenerationLog.create({
      data: {
        userId: request.userId,
        featureType: AIFeatureType.question_generation,
        questionId: newQuestionId,
        model: aiResult.model ?? 'unknown',
        promptTemplateId: aiResult.promptTemplateId,
        promptTemplateVer: aiResult.promptTemplateVersion,
        inputTokens: aiResult.inputTokens ?? 0,
        outputTokens: aiResult.outputTokens ?? 0,
        latencyMs: aiResult.latencyMs ?? 0,
        estimatedCostUsd: aiResult.estimatedCost ?? 0,
        success: true,
      },
    });

    // Increment quota
    await this.incrementAIQuota(
      request.userId,
      (aiResult.inputTokens ?? 0) + (aiResult.outputTokens ?? 0),
      aiResult.estimatedCost ?? 0
    );

    return {
      questionId: newQuestionId,
      source: 'ai_generated',
      isNewAiQuestion: true,
    };
  }

  private async incrementAIQuota(
    userId: string,
    tokensUsed: number,
    estimatedCost: number
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.userAiQuota.upsert({
      where: {
        userId_featureType_quotaDate: {
          userId,
          featureType: AIFeatureType.question_generation,
          quotaDate: today,
        },
      },
      create: {
        userId,
        featureType: AIFeatureType.question_generation,
        quotaDate: today,
        usedCount: 1,
        maxAllowed: SELECTION_CONSTANTS.MAX_AI_QUESTIONS_PER_USER_PER_DAY,
        tokensUsed,
        estimatedCostUsd: estimatedCost,
        lastUsedAt: new Date(),
      },
      update: {
        usedCount: { increment: 1 },
        tokensUsed: { increment: tokensUsed },
        estimatedCostUsd: { increment: estimatedCost },
        lastUsedAt: new Date(),
      },
    });
  }

  private generateQuestionId(patternId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${patternId}-ai-${timestamp}-${random}`;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createQuestionSelectionService(
  prisma: PrismaClient,
  aiGenerator: AIQuestionGenerator
): QuestionSelectionService {
  return new QuestionSelectionService(prisma, aiGenerator);
}
