import { PrismaClient, QuestionLifecycleState, QuestionProvenance } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

// =============================================================================
// TYPES
// =============================================================================

interface MigrationConfig {
  sourceDir: string;
  batchSize: number;
  dryRun: boolean;
}

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

interface V1Payload {
  schemaVersion: string;
  questionId: string;
  metadata: {
    title: string;
    difficulty: number;
    estimatedTimeSec: number;
    language?: string;
    source?: {
      kind?: string;
      reference?: string;
      year?: number;
    };
    version?: number;
    createdAt?: string;
    updatedAt?: string;
  };
  classification: {
    topicTags: string[];
    patternTags: string[];
    metaSkillTags?: string[];
    trapTags?: string[];
    learningObjectives?: string[];
  };
  prompt: Record<string, unknown>;
  primaryPatternId?: string;
  steps: Array<{
    stepId: string;
    type: string;
    prompt: string;
    pattern?: string;
    metaSkill?: string;
    cognitiveStage?: string;
    [key: string]: unknown;
  }>;
  solutions: Record<string, unknown>;
  authoring?: {
    reviewStatus?: string;
    canonicalPatterns?: string[];
    notes?: string;
  };
  provenance?: {
    origin?: string;
    [key: string]: unknown;
  };
  aiMetadata?: {
    model?: string;
    generatedAt?: string;
    [key: string]: unknown;
  };
  relatedQuestions?: {
    sameDifficulty?: string[];
    harder?: string[];
    easier?: string[];
    samePattern?: string[];
  };
  [key: string]: unknown;
}

// =============================================================================
// DERIVATION FUNCTIONS
// =============================================================================

function derivePrimaryPatternId(payload: V1Payload): string | null {
  // Priority 1: Explicit primaryPatternId
  if (payload.primaryPatternId && payload.primaryPatternId.length > 0) {
    return payload.primaryPatternId;
  }

  // Priority 2: First pattern tag
  if (payload.classification.patternTags?.[0]) {
    return payload.classification.patternTags[0];
  }

  // Priority 3: Canonical patterns from authoring
  if (payload.authoring?.canonicalPatterns?.[0]) {
    return payload.authoring.canonicalPatterns[0];
  }

  // Priority 4: First step's pattern
  if (payload.steps?.[0]?.pattern) {
    return payload.steps[0].pattern;
  }

  return null;
}

function deriveLifecycleState(payload: V1Payload): QuestionLifecycleState {
  if (payload.authoring?.reviewStatus) {
    switch (payload.authoring.reviewStatus) {
      case 'draft':
        return QuestionLifecycleState.draft;
      case 'review':
        return QuestionLifecycleState.review;
      case 'approved':
        return QuestionLifecycleState.approved;
      default:
        return QuestionLifecycleState.draft;
    }
  }

  // Original content assumed approved
  if (payload.metadata.source?.kind === 'original') {
    return QuestionLifecycleState.approved;
  }

  return QuestionLifecycleState.draft;
}

function deriveProvenance(payload: V1Payload): QuestionProvenance {
  if (payload.provenance?.origin) {
    switch (payload.provenance.origin) {
      case 'mathpix':
        return QuestionProvenance.mathpix;
      case 'ai_generated':
      case 'ai-generated':
        return QuestionProvenance.ai_generated;
      case 'manual':
        return QuestionProvenance.manual;
      case 'imported':
        return QuestionProvenance.imported;
      case 'hybrid':
        return QuestionProvenance.hybrid;
      default:
        return QuestionProvenance.manual;
    }
  }

  if (payload.metadata.source?.kind) {
    switch (payload.metadata.source.kind) {
      case 'original':
        return QuestionProvenance.manual;
      case 'jee':
      case 'neet':
      case 'cbse':
      case 'ncert':
      case 'book':
      case 'other':
        return QuestionProvenance.imported;
      default:
        return QuestionProvenance.manual;
    }
  }

  return QuestionProvenance.manual;
}

function deriveIsAiGenerated(payload: V1Payload): boolean {
  if (payload.aiMetadata) {
    return true;
  }

  if (payload.provenance?.origin === 'ai_generated' || payload.provenance?.origin === 'ai-generated') {
    return true;
  }

  if (payload.metadata.source?.reference?.toLowerCase().includes('ai')) {
    return true;
  }

  return false;
}

function deriveCognitiveStage(step: V1Payload['steps'][0]): string {
  if (step.cognitiveStage) {
    return step.cognitiveStage;
  }

  switch (step.type) {
    case 'INFO':
      return 'recall';
    case 'MCQ_SINGLE':
      return step.metaSkill === 'problem-classification' ? 'understand' : 'apply';
    case 'MCQ_MULTI':
      return 'apply';
    case 'FILL_BLANK':
      return 'recall';
    case 'NUMERIC':
      return 'apply';
    case 'SHORT_TEXT':
      return 'understand';
    case 'DERIVATION':
      return 'analyze';
    case 'DIAGRAM_FBD':
      return 'apply';
    case 'CHECKPOINT':
      return 'evaluate';
    default:
      return 'apply';
  }
}

// =============================================================================
// PAYLOAD UPGRADE
// =============================================================================

function upgradePayloadToV2(v1Payload: V1Payload): Record<string, unknown> {
  const v2Payload = { ...v1Payload } as Record<string, unknown>;

  // Update schema version
  v2Payload.schemaVersion = 'question.v2';

  // Add secondaryPatternIds if missing
  if (!v2Payload.secondaryPatternIds) {
    const patternTags = (v1Payload.classification.patternTags || []).slice(1);
    v2Payload.secondaryPatternIds = patternTags;
  }

  // Add provenance if missing
  if (!v2Payload.provenance) {
    v2Payload.provenance = {
      origin: deriveProvenance(v1Payload).replace('_', '-'),
      ingestedAt: new Date().toISOString(),
      ingestedBy: 'migration:v1-to-v2',
    };
  }

  // Add lifecycle if missing
  if (!v2Payload.lifecycle) {
    v2Payload.lifecycle = {
      state: deriveLifecycleState(v1Payload),
      stateChangedAt: new Date().toISOString(),
    };
  }

  // Add cognitiveStage to steps if missing
  const steps = v2Payload.steps as V1Payload['steps'];
  if (steps) {
    v2Payload.steps = steps.map((step) => ({
      ...step,
      cognitiveStage: step.cognitiveStage || deriveCognitiveStage(step),
    }));
  }

  return v2Payload;
}

// =============================================================================
// MIGRATION SERVICE
// =============================================================================

export class MigrationService {
  private prisma: PrismaClient;
  private ajv: Ajv;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
  }

  async migrate(config: MigrationConfig): Promise<MigrationResult> {
    const result: MigrationResult = {
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // Get all JSON files
    const files = this.getJsonFiles(config.sourceDir);
    result.total = files.length;

    console.log(`Found ${files.length} JSON files to migrate`);

    // Process in batches
    const batches = this.splitIntoBatches(files, config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} files)`);

      const batchResult = await this.processBatch(batch, config.dryRun);

      result.migrated += batchResult.migrated;
      result.skipped += batchResult.skipped;
      result.failed += batchResult.failed;
      result.errors.push(...batchResult.errors);
    }

    return result;
  }

  private getJsonFiles(dir: string): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.getJsonFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    files: string[],
    dryRun: boolean
  ): Promise<Omit<MigrationResult, 'total'>> {
    const result = {
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ file: string; error: string }>,
    };

    for (const file of files) {
      try {
        const fileResult = await this.migrateFile(file, dryRun);

        if (fileResult.status === 'migrated') {
          result.migrated++;
        } else if (fileResult.status === 'skipped') {
          result.skipped++;
        } else {
          result.failed++;
          result.errors.push({ file, error: fileResult.error || 'Unknown error' });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          file,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  private async migrateFile(
    filePath: string,
    dryRun: boolean
  ): Promise<{ status: 'migrated' | 'skipped' | 'failed'; error?: string }> {
    // Read file
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse JSON
    let v1Payload: V1Payload;
    try {
      v1Payload = JSON.parse(content);
    } catch {
      return { status: 'failed', error: 'Invalid JSON' };
    }

    // Validate required fields
    if (!v1Payload.questionId) {
      return { status: 'failed', error: 'Missing questionId' };
    }

    // Check for duplicate
    const existing = await this.prisma.question.findUnique({
      where: { questionId: v1Payload.questionId },
    });

    if (existing) {
      return { status: 'skipped', error: 'Duplicate questionId' };
    }

    // Derive fields
    const primaryPatternId = derivePrimaryPatternId(v1Payload);
    const lifecycleState = deriveLifecycleState(v1Payload);
    const provenance = deriveProvenance(v1Payload);
    const isAiGenerated = deriveIsAiGenerated(v1Payload);

    // Upgrade payload
    const v2Payload = upgradePayloadToV2(v1Payload);

    // Extract timestamps
    const createdAt = v1Payload.metadata.createdAt
      ? new Date(v1Payload.metadata.createdAt)
      : fs.statSync(filePath).mtime;

    if (dryRun) {
      console.log(`[DRY RUN] Would migrate: ${v1Payload.questionId}`);
      return { status: 'migrated' };
    }

    // Insert into database
    const question = await this.prisma.question.create({
      data: {
        questionId: v1Payload.questionId,
        schemaVersion: 'question.v2',
        primaryPatternId,
        difficulty: v1Payload.metadata.difficulty || 3,
        topicTags: v1Payload.classification.topicTags || [],
        lifecycleState,
        provenance,
        payload: v2Payload,
        isAiGenerated,
        aiModel: v1Payload.aiMetadata?.model || null,
        aiGeneratedAt: v1Payload.aiMetadata?.generatedAt
          ? new Date(v1Payload.aiMetadata.generatedAt)
          : null,
        aiHumanReviewed: false,
        createdAt,
      },
    });

    // Insert tags
    const tags: Array<{ questionId: string; tagType: string; tagValue: string }> = [];

    for (const tag of v1Payload.classification.patternTags || []) {
      tags.push({ questionId: question.id, tagType: 'pattern', tagValue: tag });
    }

    for (const tag of v1Payload.classification.topicTags || []) {
      tags.push({ questionId: question.id, tagType: 'topic', tagValue: tag });
    }

    for (const tag of v1Payload.classification.metaSkillTags || []) {
      tags.push({ questionId: question.id, tagType: 'meta_skill', tagValue: tag });
    }

    for (const tag of v1Payload.classification.trapTags || []) {
      tags.push({ questionId: question.id, tagType: 'trap', tagValue: tag });
    }

    if (tags.length > 0) {
      await this.prisma.questionTag.createMany({
        data: tags,
        skipDuplicates: true,
      });
    }

    return { status: 'migrated' };
  }

  async resolveEdges(): Promise<{ resolved: number; orphaned: number }> {
    let resolved = 0;
    let orphaned = 0;

    // Get all questions with relatedQuestions in payload
    const questions = await this.prisma.question.findMany({
      select: {
        id: true,
        questionId: true,
        payload: true,
      },
    });

    for (const question of questions) {
      const payload = question.payload as { relatedQuestions?: V1Payload['relatedQuestions'] };
      const relatedQuestions = payload.relatedQuestions;

      if (!relatedQuestions) continue;

      // Process sameDifficulty edges
      for (const targetId of relatedQuestions.sameDifficulty || []) {
        const target = await this.prisma.question.findUnique({
          where: { questionId: targetId },
          select: { id: true },
        });

        if (target) {
          await this.prisma.questionEdge.upsert({
            where: {
              fromQuestionId_toQuestionId_edgeType: {
                fromQuestionId: question.id,
                toQuestionId: target.id,
                edgeType: 'same_difficulty',
              },
            },
            create: {
              fromQuestionId: question.id,
              toQuestionId: target.id,
              edgeType: 'same_difficulty',
            },
            update: {},
          });
          resolved++;
        } else {
          orphaned++;
        }
      }

      // Process harder edges
      for (const targetId of relatedQuestions.harder || []) {
        const target = await this.prisma.question.findUnique({
          where: { questionId: targetId },
          select: { id: true },
        });

        if (target) {
          await this.prisma.questionEdge.upsert({
            where: {
              fromQuestionId_toQuestionId_edgeType: {
                fromQuestionId: question.id,
                toQuestionId: target.id,
                edgeType: 'harder',
              },
            },
            create: {
              fromQuestionId: question.id,
              toQuestionId: target.id,
              edgeType: 'harder',
            },
            update: {},
          });
          resolved++;
        } else {
          orphaned++;
        }
      }

      // Process easier edges
      for (const targetId of relatedQuestions.easier || []) {
        const target = await this.prisma.question.findUnique({
          where: { questionId: targetId },
          select: { id: true },
        });

        if (target) {
          await this.prisma.questionEdge.upsert({
            where: {
              fromQuestionId_toQuestionId_edgeType: {
                fromQuestionId: question.id,
                toQuestionId: target.id,
                edgeType: 'easier',
              },
            },
            create: {
              fromQuestionId: question.id,
              toQuestionId: target.id,
              edgeType: 'easier',
            },
            update: {},
          });
          resolved++;
        } else {
          orphaned++;
        }
      }
    }

    return { resolved, orphaned };
  }

  async populateRegistries(): Promise<{ patterns: number; topics: number }> {
    // Populate patterns
    const patternResult = await this.prisma.$executeRaw`
      INSERT INTO patterns (id, pattern_id, label, question_count, is_active, created_at, updated_at)
      SELECT
        gen_random_uuid()::text,
        primary_pattern_id,
        INITCAP(REPLACE(primary_pattern_id, '-', ' ')),
        COUNT(*),
        true,
        NOW(),
        NOW()
      FROM questions
      WHERE primary_pattern_id IS NOT NULL
      GROUP BY primary_pattern_id
      ON CONFLICT (pattern_id) DO UPDATE SET
        question_count = EXCLUDED.question_count,
        updated_at = NOW()
    `;

    // Populate topics
    const topicResult = await this.prisma.$executeRaw`
      INSERT INTO topics (id, topic_id, label, question_count, is_active, created_at, updated_at)
      SELECT
        gen_random_uuid()::text,
        tag,
        INITCAP(REPLACE(tag, '-', ' ')),
        COUNT(*),
        true,
        NOW(),
        NOW()
      FROM (
        SELECT UNNEST(topic_tags) as tag FROM questions
      ) t
      GROUP BY tag
      ON CONFLICT (topic_id) DO UPDATE SET
        question_count = EXCLUDED.question_count,
        updated_at = NOW()
    `;

    return {
      patterns: Number(patternResult),
      topics: Number(topicResult),
    };
  }
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sourceDir = args.find((a) => a.startsWith('--source='))?.split('=')[1] || './data/questions';
  const batchSize = parseInt(args.find((a) => a.startsWith('--batch='))?.split('=')[1] || '50', 10);

  console.log('='.repeat(60));
  console.log('JSON to Postgres Migration');
  console.log('='.repeat(60));
  console.log(`Source directory: ${sourceDir}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('='.repeat(60));

  const prisma = new PrismaClient();
  const migrationService = new MigrationService(prisma);

  try {
    // Run migration
    console.log('\nPhase 1: Migrating questions...');
    const result = await migrationService.migrate({
      sourceDir,
      batchSize,
      dryRun,
    });

    console.log('\nMigration Results:');
    console.log(`  Total files: ${result.total}`);
    console.log(`  Migrated: ${result.migrated}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log(`  Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      for (const error of result.errors.slice(0, 10)) {
        console.log(`  ${error.file}: ${error.error}`);
      }
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more`);
      }
    }

    if (!dryRun && result.migrated > 0) {
      // Resolve edges
      console.log('\nPhase 2: Resolving edges...');
      const edgeResult = await migrationService.resolveEdges();
      console.log(`  Resolved: ${edgeResult.resolved}`);
      console.log(`  Orphaned: ${edgeResult.orphaned}`);

      // Populate registries
      console.log('\nPhase 3: Populating registries...');
      const registryResult = await migrationService.populateRegistries();
      console.log(`  Patterns: ${registryResult.patterns}`);
      console.log(`  Topics: ${registryResult.topics}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration complete!');
    console.log('='.repeat(60));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
