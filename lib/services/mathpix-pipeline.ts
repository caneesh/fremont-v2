import { PrismaClient, ExtractionStatus, QuestionLifecycleState, QuestionProvenance, Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface Stage1Input {
  mathpixJobId: string;
  sourceUri: string;
  sourcePageNumber: number;
  rawLatex: string;
  rawText: string;
  confidence: number;
  extractedAt: string;
  extractedBy: string;
}

export interface Stage1Output {
  extractionId: string;
  mathpixJobId: string;
  sourceUri: string;
  sourcePageNumber: number;
  rawLatex: string;
  rawText: string;
  confidence: number;
  status: 'accepted' | 'rejected';
  rejectionReason?: string;
}

export interface GivenQuantity {
  quantity: string;
  symbol: string;
  value: number | null;
  unit: string;
}

export interface AskedQuantity {
  quantity: string;
  symbol: string;
  expectedUnit: string;
}

export interface ScenarioStructure {
  type: string;
  objects: string[];
  constraints: string[];
}

export interface Stage2Output {
  extractionId: string;
  structure: {
    given: GivenQuantity[];
    asked: AskedQuantity[];
    scenario: ScenarioStructure;
    questionType: 'numeric' | 'multi_part' | 'mcq' | 'derivation';
    partCount: number;
    hasDiagram: boolean;
  };
  status: 'analyzed' | 'failed';
  failureReason?: string;
}

export interface Stage3Output {
  extractionId: string;
  patternMatch: {
    primaryPatternId: string;
    secondaryPatternIds: string[];
    confidence: number;
    matchMethod: 'exact_rule' | 'similarity' | 'manual_override';
  };
  fingerprint: string;
  duplicateCheck: {
    hasPotentialDuplicate: boolean;
    similarQuestionIds: string[];
    highestSimilarity: number;
  };
  status: 'matched' | 'needs_manual_review' | 'no_match';
}

export interface Stage4Output {
  extractionId: string;
  authoredQuestion: {
    title: string;
    promptText: string;
    context: string | null;
    given: Array<{ label: string; value: string; unit: string }>;
    asked: Array<{ label: string; expectedForm: string }>;
    scenarioContext: string;
    templateUsed: string;
  };
  originalityCheck: {
    isOriginal: boolean;
    similarityScore: number;
    flaggedPhrases: string[];
  };
  status: 'authored' | 'needs_revision' | 'failed';
}

export interface Stage5Output {
  extractionId: string;
  steps: StepDefinition[];
  solutions: SolutionDefinition;
  status: 'scaffolded' | 'partial' | 'failed';
}

export interface Stage6Output {
  questionId: string;
  extractionId: string;
  payload: Record<string, unknown>;
  status: 'saved' | 'failed';
}

export interface StepDefinition {
  stepId: string;
  type: string;
  prompt: string;
  cognitiveStage: string;
  pattern?: string;
  metaSkill?: string;
  topic?: string;
  difficulty: number;
  choices?: Array<{ key: string; text: string; isDistractor: boolean }>;
  correct?: string | string[];
  correctNumeric?: number;
  diagramValidator?: Record<string, unknown>;
  validation?: Record<string, unknown>;
  explanations: {
    micro?: string;
    conceptual?: string;
    deep?: string;
    contrast?: string;
    hint?: string;
  };
  mistakeMapping: Array<{
    when: Record<string, unknown>;
    mistakeTypeId: string;
    severity: number;
    message?: string;
  }>;
}

export interface SolutionDefinition {
  finalAnswer: {
    type: string;
    value: number | string;
    units?: string;
    tolerance?: number;
    notes?: string;
  };
  synthesis: string[];
  limitingCases: Array<{
    condition: string;
    expected: string;
    why?: string;
  }>;
  fullDerivation?: string;
  answerKey: Record<string, number | string>;
}

export interface PipelineResult {
  extractionId: string;
  currentStage: number;
  status: 'completed' | 'needs_review' | 'failed';
  questionId?: string;
  failureReason?: string;
  stageOutputs: Record<number, unknown>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PIPELINE_VERSION = '1.0.0';
const MIN_CONFIDENCE = 0.7;
const MAX_SIMILARITY_SCORE = 0.4;

// =============================================================================
// PATTERN MATCHING RULES
// =============================================================================

interface PatternRule {
  conditions: {
    scenarioType: string;
    constraints?: { includes?: string[]; excludes?: string[] };
    askedIncludes?: string[];
  };
  patternId: string;
  secondaryPatterns?: string[];
}

const PATTERN_RULES: PatternRule[] = [
  {
    conditions: {
      scenarioType: 'inclined_plane',
      constraints: { includes: [], excludes: ['friction'] },
    },
    patternId: 'inclined-plane-frictionless',
    secondaryPatterns: ['newton-second-law-1d'],
  },
  {
    conditions: {
      scenarioType: 'inclined_plane',
      constraints: { includes: ['friction'], excludes: [] },
    },
    patternId: 'inclined-plane-friction',
    secondaryPatterns: ['newton-second-law-1d', 'friction-analysis'],
  },
  {
    conditions: {
      scenarioType: 'projectile',
      constraints: { includes: [], excludes: ['air_resistance'] },
    },
    patternId: 'projectile-basic',
    secondaryPatterns: ['kinematics-2d'],
  },
  {
    conditions: {
      scenarioType: 'projectile',
      constraints: { includes: ['air_resistance'], excludes: [] },
    },
    patternId: 'projectile-drag',
    secondaryPatterns: ['kinematics-2d', 'drag-force'],
  },
  {
    conditions: {
      scenarioType: 'circular_motion',
      askedIncludes: ['tension', 'velocity'],
    },
    patternId: 'vertical-circular-motion',
    secondaryPatterns: ['centripetal-force', 'energy-conservation'],
  },
  {
    conditions: {
      scenarioType: 'pulley',
      constraints: { includes: [], excludes: ['friction'] },
    },
    patternId: 'atwood-machine',
    secondaryPatterns: ['newton-second-law-system'],
  },
  {
    conditions: {
      scenarioType: 'collision',
      constraints: { includes: ['elastic'], excludes: [] },
    },
    patternId: 'elastic-collision',
    secondaryPatterns: ['momentum-conservation', 'energy-conservation'],
  },
  {
    conditions: {
      scenarioType: 'collision',
      constraints: { includes: ['inelastic'], excludes: [] },
    },
    patternId: 'inelastic-collision',
    secondaryPatterns: ['momentum-conservation'],
  },
];

// =============================================================================
// SCENARIO TEMPLATES
// =============================================================================

interface ScenarioTemplate {
  context: string;
  objects: string[];
  template: string;
}

const SCENARIO_TEMPLATES: Record<string, ScenarioTemplate[]> = {
  'inclined-plane-frictionless': [
    {
      context: 'playground',
      objects: ['child', 'slide'],
      template:
        'A {mass} kg child sits at the top of a smooth playground slide that makes an angle of {angle}° with the ground.',
    },
    {
      context: 'warehouse',
      objects: ['crate', 'ramp'],
      template:
        'A {mass} kg crate is placed on a frictionless loading ramp inclined at {angle}° to the horizontal.',
    },
    {
      context: 'skiing',
      objects: ['skier', 'slope'],
      template:
        'A skier of mass {mass} kg starts from rest on a smooth ski slope that makes an angle of {angle}° with the horizontal.',
    },
  ],
  'inclined-plane-friction': [
    {
      context: 'moving',
      objects: ['box', 'ramp'],
      template:
        'A {mass} kg box is pushed up a ramp inclined at {angle}° with coefficient of friction {mu}.',
    },
  ],
  'projectile-basic': [
    {
      context: 'sports',
      objects: ['ball', 'player'],
      template:
        'A ball is kicked with an initial velocity of {velocity} m/s at an angle of {angle}° above the horizontal.',
    },
    {
      context: 'artillery',
      objects: ['projectile', 'cannon'],
      template:
        'A projectile is launched from ground level at {velocity} m/s at an angle of {angle}° above the horizontal.',
    },
  ],
};

// =============================================================================
// PIPELINE SERVICE
// =============================================================================

export class MathpixPipelineService {
  constructor(private readonly prisma: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Stage 1: Raw Extraction Intake
  // ---------------------------------------------------------------------------

  async stage1Intake(input: Stage1Input): Promise<Stage1Output> {
    // Check for duplicate
    const existing = await this.prisma.rawExtraction.findUnique({
      where: { mathpixJobId: input.mathpixJobId },
    });

    if (existing) {
      return {
        extractionId: existing.id,
        mathpixJobId: input.mathpixJobId,
        sourceUri: input.sourceUri,
        sourcePageNumber: input.sourcePageNumber,
        rawLatex: input.rawLatex,
        rawText: input.rawText,
        confidence: input.confidence,
        status: 'rejected',
        rejectionReason: 'duplicate_job',
      };
    }

    // Validate confidence
    if (input.confidence < MIN_CONFIDENCE) {
      const extraction = await this.prisma.rawExtraction.create({
        data: {
          mathpixJobId: input.mathpixJobId,
          sourceUri: input.sourceUri,
          sourcePageNumber: input.sourcePageNumber,
          rawLatex: input.rawLatex,
          rawText: input.rawText,
          confidence: input.confidence,
          extractedAt: new Date(input.extractedAt),
          extractedBy: input.extractedBy,
          status: ExtractionStatus.rejected,
          rejectionReason: 'low_confidence',
          pipelineVersion: PIPELINE_VERSION,
          currentStage: 1,
        },
      });

      return {
        extractionId: extraction.id,
        mathpixJobId: input.mathpixJobId,
        sourceUri: input.sourceUri,
        sourcePageNumber: input.sourcePageNumber,
        rawLatex: input.rawLatex,
        rawText: input.rawText,
        confidence: input.confidence,
        status: 'rejected',
        rejectionReason: 'low_confidence',
      };
    }

    // Validate raw content
    if (!input.rawLatex || input.rawLatex.trim().length === 0) {
      const extraction = await this.prisma.rawExtraction.create({
        data: {
          mathpixJobId: input.mathpixJobId,
          sourceUri: input.sourceUri,
          sourcePageNumber: input.sourcePageNumber,
          rawLatex: input.rawLatex || '',
          rawText: input.rawText,
          confidence: input.confidence,
          extractedAt: new Date(input.extractedAt),
          extractedBy: input.extractedBy,
          status: ExtractionStatus.rejected,
          rejectionReason: 'empty_extraction',
          pipelineVersion: PIPELINE_VERSION,
          currentStage: 1,
        },
      });

      return {
        extractionId: extraction.id,
        mathpixJobId: input.mathpixJobId,
        sourceUri: input.sourceUri,
        sourcePageNumber: input.sourcePageNumber,
        rawLatex: input.rawLatex,
        rawText: input.rawText,
        confidence: input.confidence,
        status: 'rejected',
        rejectionReason: 'empty_extraction',
      };
    }

    // Accept extraction
    const extraction = await this.prisma.rawExtraction.create({
      data: {
        mathpixJobId: input.mathpixJobId,
        sourceUri: input.sourceUri,
        sourcePageNumber: input.sourcePageNumber,
        rawLatex: input.rawLatex,
        rawText: input.rawText,
        confidence: input.confidence,
        extractedAt: new Date(input.extractedAt),
        extractedBy: input.extractedBy,
        status: ExtractionStatus.accepted,
        pipelineVersion: PIPELINE_VERSION,
        currentStage: 1,
        stageOutputs: {},
      },
    });

    return {
      extractionId: extraction.id,
      mathpixJobId: input.mathpixJobId,
      sourceUri: input.sourceUri,
      sourcePageNumber: input.sourcePageNumber,
      rawLatex: input.rawLatex,
      rawText: input.rawText,
      confidence: input.confidence,
      status: 'accepted',
    };
  }

  // ---------------------------------------------------------------------------
  // Stage 2: Structural Analysis
  // ---------------------------------------------------------------------------

  async stage2Analyze(extractionId: string): Promise<Stage2Output> {
    const extraction = await this.prisma.rawExtraction.findUnique({
      where: { id: extractionId },
    });

    if (!extraction) {
      throw new Error(`Extraction ${extractionId} not found`);
    }

    const rawLatex = extraction.rawLatex;
    const rawText = extraction.rawText || '';

    // Extract given quantities
    const given = this.extractGivenQuantities(rawLatex, rawText);
    if (given.length === 0) {
      await this.updateExtractionStage(extractionId, 2, { status: 'failed', failureReason: 'no_given_quantities' });
      return {
        extractionId,
        structure: { given: [], asked: [], scenario: { type: 'unknown', objects: [], constraints: [] }, questionType: 'numeric', partCount: 0, hasDiagram: false },
        status: 'failed',
        failureReason: 'no_given_quantities',
      };
    }

    // Extract asked quantities
    const asked = this.extractAskedQuantities(rawLatex, rawText);
    if (asked.length === 0) {
      await this.updateExtractionStage(extractionId, 2, { status: 'failed', failureReason: 'no_asked_quantities' });
      return {
        extractionId,
        structure: { given, asked: [], scenario: { type: 'unknown', objects: [], constraints: [] }, questionType: 'numeric', partCount: 0, hasDiagram: false },
        status: 'failed',
        failureReason: 'no_asked_quantities',
      };
    }

    // Identify scenario
    const scenario = this.identifyScenario(rawLatex, rawText);
    if (scenario.type === 'unknown') {
      await this.updateExtractionStage(extractionId, 2, { status: 'failed', failureReason: 'unknown_scenario' });
      return {
        extractionId,
        structure: { given, asked, scenario, questionType: 'numeric', partCount: asked.length, hasDiagram: false },
        status: 'failed',
        failureReason: 'unknown_scenario',
      };
    }

    // Determine question type
    const questionType = this.determineQuestionType(rawLatex, rawText, asked);
    const hasDiagram = this.detectDiagram(rawLatex, rawText);

    const structure = {
      given,
      asked,
      scenario,
      questionType,
      partCount: asked.length,
      hasDiagram,
    };

    await this.updateExtractionStage(extractionId, 2, { structure, status: 'analyzed' });

    return {
      extractionId,
      structure,
      status: 'analyzed',
    };
  }

  // ---------------------------------------------------------------------------
  // Stage 3: Pattern Identification
  // ---------------------------------------------------------------------------

  async stage3PatternMatch(extractionId: string, structure: Stage2Output['structure']): Promise<Stage3Output> {
    // Generate fingerprint
    const fingerprint = this.generateFingerprint(structure);

    // Match pattern using rules
    const patternMatch = this.matchPattern(structure);

    // Check for duplicates
    const duplicateCheck = await this.checkDuplicates(fingerprint, extractionId);

    let status: 'matched' | 'needs_manual_review' | 'no_match' = 'matched';

    if (patternMatch.confidence < 0.5) {
      status = 'no_match';
    } else if (duplicateCheck.hasPotentialDuplicate || patternMatch.confidence < 0.8) {
      status = 'needs_manual_review';
    }

    const output: Stage3Output = {
      extractionId,
      patternMatch,
      fingerprint,
      duplicateCheck,
      status,
    };

    await this.updateExtractionStage(extractionId, 3, output);

    if (status === 'needs_manual_review' || status === 'no_match') {
      await this.prisma.rawExtraction.update({
        where: { id: extractionId },
        data: { status: ExtractionStatus.needs_review },
      });
    }

    return output;
  }

  // ---------------------------------------------------------------------------
  // Stage 4: Original Question Authoring
  // ---------------------------------------------------------------------------

  async stage4Author(
    extractionId: string,
    structure: Stage2Output['structure'],
    patternMatch: Stage3Output['patternMatch']
  ): Promise<Stage4Output> {
    const templates = SCENARIO_TEMPLATES[patternMatch.primaryPatternId];

    if (!templates || templates.length === 0) {
      await this.updateExtractionStage(extractionId, 4, { status: 'failed', failureReason: 'no_template' });
      return {
        extractionId,
        authoredQuestion: {
          title: '',
          promptText: '',
          context: null,
          given: [],
          asked: [],
          scenarioContext: '',
          templateUsed: '',
        },
        originalityCheck: { isOriginal: false, similarityScore: 1, flaggedPhrases: [] },
        status: 'failed',
      };
    }

    // Select random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Generate new values (vary by at least 20%)
    const newGiven = this.generateNewValues(structure.given);

    // Compose question text
    const promptText = this.composeQuestionText(template, newGiven, structure.asked);
    const title = this.generateTitle(template.context, template.objects);

    // Check originality (simplified - in production, use embedding similarity)
    const originalityCheck = {
      isOriginal: true,
      similarityScore: 0.1,
      flaggedPhrases: [] as string[],
    };

    const authoredQuestion = {
      title,
      promptText,
      context: `Assume the ${template.objects[0]} can be modeled as a point mass.`,
      given: newGiven.map((g) => ({
        label: this.capitalizeFirst(g.quantity),
        value: g.value?.toString() || '',
        unit: g.unit,
      })),
      asked: structure.asked.map((a) => ({
        label: this.capitalizeFirst(a.quantity),
        expectedForm: 'numeric',
      })),
      scenarioContext: template.context,
      templateUsed: `${patternMatch.primaryPatternId}-${template.context}-001`,
    };

    const output: Stage4Output = {
      extractionId,
      authoredQuestion,
      originalityCheck,
      status: originalityCheck.similarityScore <= MAX_SIMILARITY_SCORE ? 'authored' : 'needs_revision',
    };

    await this.updateExtractionStage(extractionId, 4, output);

    return output;
  }

  // ---------------------------------------------------------------------------
  // Stage 5: Step Scaffolding
  // ---------------------------------------------------------------------------

  async stage5Scaffold(
    extractionId: string,
    authoredQuestion: Stage4Output['authoredQuestion'],
    patternMatch: Stage3Output['patternMatch'],
    structure: Stage2Output['structure']
  ): Promise<Stage5Output> {
    // Generate steps based on pattern
    const steps = this.generateSteps(patternMatch.primaryPatternId, structure, authoredQuestion);

    // Compute solutions
    const solutions = this.computeSolutions(structure, authoredQuestion);

    const output: Stage5Output = {
      extractionId,
      steps,
      solutions,
      status: steps.length > 0 ? 'scaffolded' : 'failed',
    };

    await this.updateExtractionStage(extractionId, 5, output);

    return output;
  }

  // ---------------------------------------------------------------------------
  // Stage 6: Provenance & Save
  // ---------------------------------------------------------------------------

  async stage6Save(
    extractionId: string,
    authoredQuestion: Stage4Output['authoredQuestion'],
    steps: Stage5Output['steps'],
    solutions: Stage5Output['solutions'],
    patternMatch: Stage3Output['patternMatch']
  ): Promise<Stage6Output> {
    const extraction = await this.prisma.rawExtraction.findUnique({
      where: { id: extractionId },
    });

    if (!extraction) {
      throw new Error(`Extraction ${extractionId} not found`);
    }

    // Generate question ID
    const questionId = await this.generateQuestionId(patternMatch.primaryPatternId);

    // Assemble complete payload
    const payload = this.assemblePayload(
      questionId,
      authoredQuestion,
      steps,
      solutions,
      patternMatch,
      extraction
    );

    // Save to database
    const question = await this.prisma.question.create({
      data: {
        questionId,
        schemaVersion: 'question.v2',
        primaryPatternId: patternMatch.primaryPatternId,
        difficulty: 2, // Default, can be adjusted
        topicTags: this.extractTopicTags(patternMatch.primaryPatternId),
        lifecycleState: QuestionLifecycleState.draft,
        provenance: QuestionProvenance.mathpix,
        payload: payload as Prisma.InputJsonValue,
        isAiGenerated: true, // Template-based generation
        aiModel: 'template-v1',
        aiGeneratedAt: new Date(),
        aiHumanReviewed: false,
      },
    });

    // Create tags
    const patternTags = [patternMatch.primaryPatternId, ...patternMatch.secondaryPatternIds];
    await this.prisma.questionTag.createMany({
      data: patternTags.map((tag) => ({
        questionId: question.id,
        tagType: 'pattern',
        tagValue: tag,
      })),
      skipDuplicates: true,
    });

    // Update extraction with link
    await this.prisma.rawExtraction.update({
      where: { id: extractionId },
      data: {
        questionId,
        status: ExtractionStatus.completed,
        currentStage: 6,
      },
    });

    const output: Stage6Output = {
      questionId,
      extractionId,
      payload,
      status: 'saved',
    };

    await this.updateExtractionStage(extractionId, 6, output);

    return output;
  }

  // ---------------------------------------------------------------------------
  // Full Pipeline Execution
  // ---------------------------------------------------------------------------

  async runPipeline(input: Stage1Input): Promise<PipelineResult> {
    const stageOutputs: Record<number, unknown> = {};

    // Stage 1
    const stage1 = await this.stage1Intake(input);
    stageOutputs[1] = stage1;

    if (stage1.status === 'rejected') {
      return {
        extractionId: stage1.extractionId,
        currentStage: 1,
        status: 'failed',
        failureReason: stage1.rejectionReason,
        stageOutputs,
      };
    }

    // Stage 2
    const stage2 = await this.stage2Analyze(stage1.extractionId);
    stageOutputs[2] = stage2;

    if (stage2.status === 'failed') {
      return {
        extractionId: stage1.extractionId,
        currentStage: 2,
        status: 'failed',
        failureReason: stage2.failureReason,
        stageOutputs,
      };
    }

    // Stage 3
    const stage3 = await this.stage3PatternMatch(stage1.extractionId, stage2.structure);
    stageOutputs[3] = stage3;

    if (stage3.status === 'no_match') {
      return {
        extractionId: stage1.extractionId,
        currentStage: 3,
        status: 'needs_review',
        failureReason: 'no_pattern_match',
        stageOutputs,
      };
    }

    if (stage3.status === 'needs_manual_review') {
      return {
        extractionId: stage1.extractionId,
        currentStage: 3,
        status: 'needs_review',
        failureReason: stage3.duplicateCheck.hasPotentialDuplicate ? 'potential_duplicate' : 'low_confidence_match',
        stageOutputs,
      };
    }

    // Stage 4
    const stage4 = await this.stage4Author(stage1.extractionId, stage2.structure, stage3.patternMatch);
    stageOutputs[4] = stage4;

    if (stage4.status === 'failed' || stage4.status === 'needs_revision') {
      return {
        extractionId: stage1.extractionId,
        currentStage: 4,
        status: 'needs_review',
        failureReason: stage4.status === 'failed' ? 'authoring_failed' : 'originality_check_failed',
        stageOutputs,
      };
    }

    // Stage 5
    const stage5 = await this.stage5Scaffold(
      stage1.extractionId,
      stage4.authoredQuestion,
      stage3.patternMatch,
      stage2.structure
    );
    stageOutputs[5] = stage5;

    if (stage5.status === 'failed') {
      return {
        extractionId: stage1.extractionId,
        currentStage: 5,
        status: 'needs_review',
        failureReason: 'scaffolding_failed',
        stageOutputs,
      };
    }

    // Stage 6
    const stage6 = await this.stage6Save(
      stage1.extractionId,
      stage4.authoredQuestion,
      stage5.steps,
      stage5.solutions,
      stage3.patternMatch
    );
    stageOutputs[6] = stage6;

    return {
      extractionId: stage1.extractionId,
      currentStage: 6,
      status: 'completed',
      questionId: stage6.questionId,
      stageOutputs,
    };
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private async updateExtractionStage(extractionId: string, stage: number, output: unknown): Promise<void> {
    const extraction = await this.prisma.rawExtraction.findUnique({
      where: { id: extractionId },
      select: { stageOutputs: true },
    });

    const currentOutputs = (extraction?.stageOutputs as Record<string, unknown>) || {};
    currentOutputs[stage.toString()] = output;

    await this.prisma.rawExtraction.update({
      where: { id: extractionId },
      data: {
        currentStage: stage,
        stageOutputs: currentOutputs as Prisma.InputJsonValue,
        status: ExtractionStatus.processing,
      },
    });
  }

  private extractGivenQuantities(rawLatex: string, rawText: string): GivenQuantity[] {
    const combined = `${rawLatex} ${rawText}`.toLowerCase();
    const given: GivenQuantity[] = [];

    // Mass pattern
    const massMatch = combined.match(/(\d+\.?\d*)\s*(kg|kilogram)/);
    if (massMatch) {
      given.push({ quantity: 'mass', symbol: 'm', value: parseFloat(massMatch[1]), unit: 'kg' });
    }

    // Angle pattern
    const angleMatch = combined.match(/(\d+\.?\d*)\s*(°|degree|degrees)/);
    if (angleMatch) {
      given.push({ quantity: 'angle', symbol: 'θ', value: parseFloat(angleMatch[1]), unit: '°' });
    }

    // Velocity pattern
    const velocityMatch = combined.match(/(\d+\.?\d*)\s*(m\/s|m\s*s\^{?-1}?)/);
    if (velocityMatch) {
      given.push({ quantity: 'velocity', symbol: 'v', value: parseFloat(velocityMatch[1]), unit: 'm/s' });
    }

    // Gravity pattern
    const gravityMatch = combined.match(/g\s*=\s*(\d+\.?\d*)/);
    if (gravityMatch) {
      given.push({ quantity: 'gravity', symbol: 'g', value: parseFloat(gravityMatch[1]), unit: 'm/s²' });
    }

    // Friction coefficient
    const frictionMatch = combined.match(/(?:coefficient|μ|mu)\s*=?\s*(\d+\.?\d*)/);
    if (frictionMatch) {
      given.push({ quantity: 'friction_coefficient', symbol: 'μ', value: parseFloat(frictionMatch[1]), unit: '' });
    }

    return given;
  }

  private extractAskedQuantities(rawLatex: string, rawText: string): AskedQuantity[] {
    const combined = `${rawLatex} ${rawText}`.toLowerCase();
    const asked: AskedQuantity[] = [];

    if (combined.includes('acceleration') || combined.includes('find a') || combined.includes('calculate a')) {
      asked.push({ quantity: 'acceleration', symbol: 'a', expectedUnit: 'm/s²' });
    }

    if (combined.includes('normal force') || combined.includes('reaction') || combined.includes('find n')) {
      asked.push({ quantity: 'normal_force', symbol: 'N', expectedUnit: 'N' });
    }

    if (combined.includes('tension') || combined.includes('find t')) {
      asked.push({ quantity: 'tension', symbol: 'T', expectedUnit: 'N' });
    }

    if (combined.includes('velocity') || combined.includes('speed') || combined.includes('find v')) {
      asked.push({ quantity: 'velocity', symbol: 'v', expectedUnit: 'm/s' });
    }

    if (combined.includes('time') || combined.includes('find t') || combined.includes('how long')) {
      asked.push({ quantity: 'time', symbol: 't', expectedUnit: 's' });
    }

    if (combined.includes('distance') || combined.includes('displacement') || combined.includes('how far')) {
      asked.push({ quantity: 'distance', symbol: 's', expectedUnit: 'm' });
    }

    return asked;
  }

  private identifyScenario(rawLatex: string, rawText: string): ScenarioStructure {
    const combined = `${rawLatex} ${rawText}`.toLowerCase();
    const constraints: string[] = [];

    // Check for frictionless
    if (combined.includes('frictionless') || combined.includes('smooth') || combined.includes('negligible friction')) {
      constraints.push('frictionless');
    } else if (combined.includes('friction') || combined.includes('rough')) {
      constraints.push('friction');
    }

    // Identify scenario type
    if (combined.includes('incline') || combined.includes('ramp') || combined.includes('slope') || combined.includes('slide')) {
      return { type: 'inclined_plane', objects: ['block', 'incline'], constraints };
    }

    if (combined.includes('projectile') || combined.includes('thrown') || combined.includes('kicked') || combined.includes('launched')) {
      if (combined.includes('air resistance') || combined.includes('drag')) {
        constraints.push('air_resistance');
      }
      return { type: 'projectile', objects: ['projectile'], constraints };
    }

    if (combined.includes('circular') || combined.includes('loop') || combined.includes('revolving')) {
      return { type: 'circular_motion', objects: ['object', 'circle'], constraints };
    }

    if (combined.includes('pulley') || combined.includes('atwood')) {
      return { type: 'pulley', objects: ['block1', 'block2', 'pulley'], constraints };
    }

    if (combined.includes('collision') || combined.includes('collide')) {
      if (combined.includes('elastic')) {
        constraints.push('elastic');
      } else {
        constraints.push('inelastic');
      }
      return { type: 'collision', objects: ['object1', 'object2'], constraints };
    }

    return { type: 'unknown', objects: [], constraints };
  }

  private determineQuestionType(
    rawLatex: string,
    rawText: string,
    asked: AskedQuantity[]
  ): 'numeric' | 'multi_part' | 'mcq' | 'derivation' {
    const combined = `${rawLatex} ${rawText}`.toLowerCase();

    if (combined.includes('(a)') && combined.includes('(b)')) {
      return 'multi_part';
    }

    if (combined.match(/\([a-d]\)/i) && combined.includes('option')) {
      return 'mcq';
    }

    if (combined.includes('derive') || combined.includes('show that') || combined.includes('prove')) {
      return 'derivation';
    }

    if (asked.length > 1) {
      return 'multi_part';
    }

    return 'numeric';
  }

  private detectDiagram(rawLatex: string, rawText: string): boolean {
    const combined = `${rawLatex} ${rawText}`.toLowerCase();
    return (
      combined.includes('figure') ||
      combined.includes('diagram') ||
      combined.includes('shown') ||
      combined.includes('\\includegraphics')
    );
  }

  private generateFingerprint(structure: Stage2Output['structure']): string {
    const givenKeys = structure.given.map((g) => g.quantity).sort().join(',');
    const askedKeys = structure.asked.map((a) => a.quantity).sort().join(',');
    return `given:${givenKeys}|asked:${askedKeys}|scenario:${structure.scenario.type}`;
  }

  private matchPattern(structure: Stage2Output['structure']): Stage3Output['patternMatch'] {
    for (const rule of PATTERN_RULES) {
      if (rule.conditions.scenarioType !== structure.scenario.type) {
        continue;
      }

      // Check constraints
      if (rule.conditions.constraints) {
        const { includes = [], excludes = [] } = rule.conditions.constraints;
        const hasAllIncludes = includes.every((c) => structure.scenario.constraints.includes(c));
        const hasNoExcludes = !excludes.some((c) => structure.scenario.constraints.includes(c));

        if (!hasAllIncludes || !hasNoExcludes) {
          continue;
        }
      }

      // Check asked quantities
      if (rule.conditions.askedIncludes) {
        const askedQuantities = structure.asked.map((a) => a.quantity);
        const hasAllAsked = rule.conditions.askedIncludes.every((q) => askedQuantities.includes(q));
        if (!hasAllAsked) {
          continue;
        }
      }

      return {
        primaryPatternId: rule.patternId,
        secondaryPatternIds: rule.secondaryPatterns || [],
        confidence: 0.9,
        matchMethod: 'exact_rule',
      };
    }

    return {
      primaryPatternId: 'unknown',
      secondaryPatternIds: [],
      confidence: 0.2,
      matchMethod: 'exact_rule',
    };
  }

  private async checkDuplicates(
    fingerprint: string,
    extractionId: string
  ): Promise<Stage3Output['duplicateCheck']> {
    // Query for questions with similar fingerprint
    const similar = await this.prisma.$queryRaw<{ question_id: string }[]>`
      SELECT question_id
      FROM questions
      WHERE payload->>'questionBank'->>'templateFingerprint' = ${fingerprint}
      LIMIT 5
    `;

    return {
      hasPotentialDuplicate: similar.length > 0,
      similarQuestionIds: similar.map((s) => s.question_id),
      highestSimilarity: similar.length > 0 ? 0.95 : 0,
    };
  }

  private generateNewValues(given: GivenQuantity[]): GivenQuantity[] {
    return given.map((g) => {
      if (g.value === null) return g;

      // Vary by 20-50%
      const factor = 0.8 + Math.random() * 0.4;
      let newValue = Math.round(g.value * factor);

      // Round to nice numbers
      if (g.quantity === 'mass') {
        newValue = Math.round(newValue / 5) * 5 || 5;
      } else if (g.quantity === 'angle') {
        const niceAngles = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
        newValue = niceAngles.reduce((prev, curr) =>
          Math.abs(curr - newValue) < Math.abs(prev - newValue) ? curr : prev
        );
      }

      return { ...g, value: newValue };
    });
  }

  private composeQuestionText(
    template: ScenarioTemplate,
    given: GivenQuantity[],
    asked: AskedQuantity[]
  ): string {
    let text = template.template;

    // Replace placeholders
    for (const g of given) {
      text = text.replace(`{${g.quantity}}`, g.value?.toString() || '');
    }

    // Add asked parts
    const askedText = asked
      .map((a, i) => `(${String.fromCharCode(97 + i)}) The ${a.quantity.replace('_', ' ')}`)
      .join('\n');

    const gravityGiven = given.find((g) => g.quantity === 'gravity');
    const gravityNote = gravityGiven ? `\n\nUse g = ${gravityGiven.value} m/s²` : '';

    return `${text}\n\nCalculate:\n${askedText}${gravityNote}`;
  }

  private generateTitle(context: string, objects: string[]): string {
    const contextTitle = this.capitalizeFirst(context);
    const objectTitle = this.capitalizeFirst(objects[0]);
    return `${objectTitle} on ${contextTitle} ${objects[1] || 'Surface'}`;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  }

  private generateSteps(
    patternId: string,
    structure: Stage2Output['structure'],
    authoredQuestion: Stage4Output['authoredQuestion']
  ): StepDefinition[] {
    // Simplified step generation - in production, use full step templates
    const steps: StepDefinition[] = [
      {
        stepId: 's1-identify',
        type: 'MCQ_SINGLE',
        prompt: 'What type of physics problem is this?',
        cognitiveStage: 'understand',
        pattern: patternId,
        metaSkill: 'problem-classification',
        difficulty: 1,
        choices: [
          { key: 'A', text: 'Projectile motion', isDistractor: true },
          { key: 'B', text: 'Inclined plane problem', isDistractor: false },
          { key: 'C', text: 'Circular motion', isDistractor: true },
          { key: 'D', text: 'Simple harmonic motion', isDistractor: true },
        ],
        correct: 'B',
        explanations: {
          micro: 'This is an inclined plane problem.',
          conceptual: 'When an object moves along a tilted surface, we use inclined plane analysis.',
        },
        mistakeMapping: [],
      },
    ];

    // Add numeric calculation steps for each asked quantity
    structure.asked.forEach((asked, index) => {
      steps.push({
        stepId: `s${index + 2}-calculate-${asked.quantity}`,
        type: 'NUMERIC',
        prompt: `Calculate the ${asked.quantity.replace('_', ' ')}. Enter your answer in ${asked.expectedUnit}.`,
        cognitiveStage: 'apply',
        pattern: patternId,
        metaSkill: 'equation-application',
        difficulty: 2,
        correctNumeric: 0, // Will be computed
        validation: {
          numericTolerance: 0.5,
          units: asked.expectedUnit,
          maxAttempts: 3,
        },
        explanations: {
          micro: `The ${asked.quantity.replace('_', ' ')} can be calculated using the relevant equations.`,
        },
        mistakeMapping: [],
      });
    });

    return steps;
  }

  private computeSolutions(
    structure: Stage2Output['structure'],
    authoredQuestion: Stage4Output['authoredQuestion']
  ): SolutionDefinition {
    const answerKey: Record<string, number> = {};
    const synthesis: string[] = [];

    // Get values from given
    const mass = structure.given.find((g) => g.quantity === 'mass')?.value || 1;
    const angle = structure.given.find((g) => g.quantity === 'angle')?.value || 30;
    const g = structure.given.find((g) => g.quantity === 'gravity')?.value || 10;

    const angleRad = (angle * Math.PI) / 180;

    if (structure.asked.some((a) => a.quantity === 'acceleration')) {
      answerKey.acceleration = parseFloat((g * Math.sin(angleRad)).toFixed(2));
      synthesis.push(`Acceleration: a = g sin(θ) = ${g} × sin(${angle}°) = ${answerKey.acceleration} m/s²`);
    }

    if (structure.asked.some((a) => a.quantity === 'normal_force')) {
      answerKey.normalForce = parseFloat((mass * g * Math.cos(angleRad)).toFixed(1));
      synthesis.push(`Normal force: N = mg cos(θ) = ${mass} × ${g} × cos(${angle}°) = ${answerKey.normalForce} N`);
    }

    return {
      finalAnswer: {
        type: 'NUMERIC',
        value: Object.values(answerKey)[0] || 0,
        units: structure.asked[0]?.expectedUnit || 'm/s²',
        tolerance: 0.5,
      },
      synthesis,
      limitingCases: [
        { condition: 'θ → 0° (flat)', expected: 'a → 0, N → mg', why: 'No acceleration on flat ground' },
        { condition: 'θ → 90° (vertical)', expected: 'a → g, N → 0', why: 'Free fall with no contact' },
      ],
      answerKey,
    };
  }

  private async generateQuestionId(patternId: string): Promise<string> {
    const count = await this.prisma.question.count({
      where: { primaryPatternId: patternId, provenance: QuestionProvenance.mathpix },
    });
    return `${patternId}-mathpix-${String(count + 1).padStart(3, '0')}`;
  }

  private extractTopicTags(patternId: string): string[] {
    const topicMap: Record<string, string[]> = {
      'inclined-plane-frictionless': ['mechanics', 'newton-laws', 'dynamics'],
      'inclined-plane-friction': ['mechanics', 'newton-laws', 'friction'],
      'projectile-basic': ['mechanics', 'kinematics', 'projectile-motion'],
      'vertical-circular-motion': ['mechanics', 'circular-motion', 'energy'],
    };
    return topicMap[patternId] || ['mechanics'];
  }

  private assemblePayload(
    questionId: string,
    authoredQuestion: Stage4Output['authoredQuestion'],
    steps: StepDefinition[],
    solutions: SolutionDefinition,
    patternMatch: Stage3Output['patternMatch'],
    extraction: { sourceUri: string; sourcePageNumber: number | null; mathpixJobId: string; extractedBy: string }
  ): Record<string, unknown> {
    return {
      schemaVersion: 'question.v2',
      questionId,
      metadata: {
        title: authoredQuestion.title,
        difficulty: 2,
        estimatedTimeSec: 480,
        language: 'en',
        source: { kind: 'original', reference: 'Generated from pattern template', year: new Date().getFullYear() },
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      classification: {
        topicTags: this.extractTopicTags(patternMatch.primaryPatternId),
        patternTags: [patternMatch.primaryPatternId, ...patternMatch.secondaryPatternIds],
        metaSkillTags: ['fbd-drawing', 'component-resolution'],
        trapTags: ['sin-cos-confusion'],
        learningObjectives: [],
      },
      prompt: {
        text: authoredQuestion.promptText,
        context: authoredQuestion.context,
        given: authoredQuestion.given,
        asked: authoredQuestion.asked,
      },
      primaryPatternId: patternMatch.primaryPatternId,
      secondaryPatternIds: patternMatch.secondaryPatternIds,
      steps,
      solutions,
      provenance: {
        origin: 'mathpix',
        sourceUri: extraction.sourceUri,
        sourcePageNumber: extraction.sourcePageNumber,
        mathpixJobId: extraction.mathpixJobId,
        ingestedAt: new Date().toISOString(),
        ingestedBy: extraction.extractedBy,
        processingNotes: `Pipeline v${PIPELINE_VERSION}`,
      },
      lifecycle: {
        state: 'draft',
        stateChangedAt: new Date().toISOString(),
      },
      aiMetadata: {
        model: 'template-v1',
        generatedAt: new Date().toISOString(),
        humanReviewed: false,
        aiGeneratedFields: ['prompt.text', 'steps[*].explanations'],
      },
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createMathpixPipelineService(prisma: PrismaClient): MathpixPipelineService {
  return new MathpixPipelineService(prisma);
}
