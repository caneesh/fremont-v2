/**
 * Migration: question.v1 → question.v2
 *
 * Example migration showing how to handle schema evolution
 *
 * Changes in v2:
 * 1. Rename: classification.topicTags → classification.topics
 * 2. Rename: classification.patternTags → classification.patterns
 * 3. Add: metadata.schema (new required field)
 * 4. Restructure: prerequisites (flatten concept prerequisites)
 */

export interface MigrationResult {
  success: boolean;
  data: Record<string, unknown>;
  changes: string[];
  warnings: string[];
}

export async function migrateV1ToV2(
  data: Record<string, unknown>
): Promise<MigrationResult> {
  const changes: string[] = [];
  const warnings: string[] = [];

  // Deep clone to avoid mutating original
  const migrated = JSON.parse(JSON.stringify(data));

  // 1. Update schema version
  migrated.schemaVersion = 'question.v2';
  changes.push('Updated schemaVersion to question.v2');

  // 2. Rename topicTags → topics
  if (migrated.classification?.topicTags) {
    migrated.classification.topics = migrated.classification.topicTags;
    delete migrated.classification.topicTags;
    changes.push('Renamed classification.topicTags → classification.topics');
  }

  // 3. Rename patternTags → patterns
  if (migrated.classification?.patternTags) {
    migrated.classification.patterns = migrated.classification.patternTags;
    delete migrated.classification.patternTags;
    changes.push('Renamed classification.patternTags → classification.patterns');
  }

  // 4. Add metadata.schema if missing
  if (!migrated.metadata?.schema) {
    migrated.metadata = migrated.metadata || {};
    migrated.metadata.schema = {
      version: 'question.v2',
      migratedFrom: 'question.v1',
      migratedAt: new Date().toISOString()
    };
    changes.push('Added metadata.schema');
  }

  // 5. Flatten prerequisites.concepts if needed
  if (migrated.prerequisites?.concepts) {
    const concepts = migrated.prerequisites.concepts;
    if (concepts.length > 0 && typeof concepts[0] === 'object') {
      // Already in new format, extract just IDs for backward compat field
      migrated.prerequisites.conceptIds = concepts.map(
        (c: { conceptId: string }) => c.conceptId
      );
      changes.push('Added flattened prerequisites.conceptIds');
    }
  }

  // 6. Warn about deprecated fields that still exist
  if (migrated.questionBank?.prerequisiteConceptIds) {
    warnings.push(
      'questionBank.prerequisiteConceptIds is deprecated in v2. ' +
      'Use prerequisites.concepts instead.'
    );
  }

  return {
    success: true,
    data: migrated,
    changes,
    warnings
  };
}

/**
 * Validate that migration was successful
 */
export function validateV2(data: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields exist
  if (data.schemaVersion !== 'question.v2') {
    errors.push('schemaVersion must be question.v2');
  }

  const classification = data.classification as Record<string, unknown> | undefined;
  if (!classification?.topics) {
    errors.push('classification.topics is required in v2');
  }

  if (!classification?.patterns) {
    errors.push('classification.patterns is required in v2');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Rollback migration (v2 → v1)
 */
export async function rollbackV2ToV1(
  data: Record<string, unknown>
): Promise<MigrationResult> {
  const changes: string[] = [];
  const warnings: string[] = [];

  const migrated = JSON.parse(JSON.stringify(data));

  // Reverse the changes
  migrated.schemaVersion = 'question.v1';

  if (migrated.classification?.topics) {
    migrated.classification.topicTags = migrated.classification.topics;
    delete migrated.classification.topics;
    changes.push('Renamed classification.topics → classification.topicTags');
  }

  if (migrated.classification?.patterns) {
    migrated.classification.patternTags = migrated.classification.patterns;
    delete migrated.classification.patterns;
    changes.push('Renamed classification.patterns → classification.patternTags');
  }

  // Remove v2-only fields
  if (migrated.metadata?.schema) {
    delete migrated.metadata.schema;
    changes.push('Removed metadata.schema');
  }

  return {
    success: true,
    data: migrated,
    changes,
    warnings
  };
}
