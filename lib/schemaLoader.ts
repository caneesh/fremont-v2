/**
 * Schema Loader with Version Handling
 *
 * Handles schema evolution, validation, and migrations
 */

import fs from 'fs';
import path from 'path';

// Types
interface SchemaRegistry {
  currentVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  versions: Record<string, VersionInfo>;
  migrationPaths: Record<string, string>;
  fieldDeprecations: Record<string, FieldDeprecation>;
}

interface VersionInfo {
  releaseDate: string;
  status: 'current' | 'supported' | 'deprecated' | 'unsupported';
  schemaFile: string;
  changelog: string;
}

interface FieldDeprecation {
  deprecatedIn: string;
  removedIn?: string;
  replacement?: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  migratedData?: unknown;
}

interface ValidationError {
  path: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  path: string;
  message: string;
  type: 'deprecation' | 'migration-available' | 'version-mismatch';
}

// Schema paths
const SCHEMA_DIR = path.join(process.cwd(), 'data/schemas');
const REGISTRY_PATH = path.join(SCHEMA_DIR, 'schema-registry.json');

/**
 * Load the schema registry
 */
export function loadRegistry(): SchemaRegistry {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get schema for a specific version
 */
export function getSchema(version: string): object | null {
  const registry = loadRegistry();
  const versionInfo = registry.versions[version];

  if (!versionInfo) {
    return null;
  }

  const schemaPath = path.join(SCHEMA_DIR, versionInfo.schemaFile);
  const content = fs.readFileSync(schemaPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get the current (latest) schema version
 */
export function getCurrentVersion(): string {
  return loadRegistry().currentVersion;
}

/**
 * Check if a version is supported
 */
export function isVersionSupported(version: string): boolean {
  const registry = loadRegistry();
  return registry.supportedVersions.includes(version);
}

/**
 * Check if a version is deprecated
 */
export function isVersionDeprecated(version: string): boolean {
  const registry = loadRegistry();
  return registry.deprecatedVersions.includes(version);
}

/**
 * Validate a question document
 */
export function validateQuestion(data: unknown): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Check if data is an object
  if (!data || typeof data !== 'object') {
    result.valid = false;
    result.errors.push({
      path: '',
      message: 'Data must be an object',
      code: 'INVALID_TYPE'
    });
    return result;
  }

  const doc = data as Record<string, unknown>;

  // Check schema version
  const version = doc.schemaVersion as string;
  if (!version) {
    result.valid = false;
    result.errors.push({
      path: 'schemaVersion',
      message: 'Missing schemaVersion field',
      code: 'MISSING_VERSION'
    });
    return result;
  }

  const registry = loadRegistry();

  // Check if version is supported
  if (!isVersionSupported(version)) {
    if (registry.migrationPaths[version]) {
      result.warnings.push({
        path: 'schemaVersion',
        message: `Version ${version} is outdated. Migration available to ${registry.migrationPaths[version]}`,
        type: 'migration-available'
      });
    } else {
      result.valid = false;
      result.errors.push({
        path: 'schemaVersion',
        message: `Unsupported schema version: ${version}`,
        code: 'UNSUPPORTED_VERSION'
      });
      return result;
    }
  }

  // Check for deprecated version
  if (isVersionDeprecated(version)) {
    result.warnings.push({
      path: 'schemaVersion',
      message: `Version ${version} is deprecated. Consider migrating to ${registry.currentVersion}`,
      type: 'deprecation'
    });
  }

  // Check for deprecated fields
  for (const [fieldPath, deprecation] of Object.entries(registry.fieldDeprecations)) {
    if (hasField(doc, fieldPath)) {
      result.warnings.push({
        path: fieldPath,
        message: deprecation.message,
        type: 'deprecation'
      });
    }
  }

  return result;
}

/**
 * Check if object has a nested field
 */
function hasField(obj: Record<string, unknown>, path: string): boolean {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Migrate a document to a newer version
 */
export async function migrateQuestion(
  data: Record<string, unknown>,
  targetVersion?: string
): Promise<{ data: Record<string, unknown>; fromVersion: string; toVersion: string }> {
  const registry = loadRegistry();
  const fromVersion = data.schemaVersion as string;
  const toVersion = targetVersion || registry.currentVersion;

  if (fromVersion === toVersion) {
    return { data, fromVersion, toVersion };
  }

  // Load migration function
  const migrationKey = `${fromVersion}->${toVersion}`;
  const migration = migrations[migrationKey];

  if (!migration) {
    throw new Error(`No migration path from ${fromVersion} to ${toVersion}`);
  }

  const migratedData = await migration(data);
  migratedData.schemaVersion = toVersion;

  return { data: migratedData, fromVersion, toVersion };
}

// Migration functions registry
type MigrationFn = (data: Record<string, unknown>) => Promise<Record<string, unknown>>;

const migrations: Record<string, MigrationFn> = {
  // Example migration from v1 to v2 (when needed)
  // 'question.v1->question.v2': async (data) => {
  //   const migrated = { ...data };
  //
  //   // Rename field
  //   if (migrated.classification?.topicTags) {
  //     migrated.classification.topics = migrated.classification.topicTags;
  //     delete migrated.classification.topicTags;
  //   }
  //
  //   return migrated;
  // }
};

/**
 * Register a new migration
 */
export function registerMigration(fromVersion: string, toVersion: string, fn: MigrationFn): void {
  migrations[`${fromVersion}->${toVersion}`] = fn;
}

/**
 * Add a field deprecation warning
 */
export function deprecateField(
  fieldPath: string,
  deprecatedIn: string,
  message: string,
  replacement?: string
): void {
  const registry = loadRegistry();

  registry.fieldDeprecations[fieldPath] = {
    deprecatedIn,
    replacement,
    message
  };

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

/**
 * Upgrade schema version
 */
export function addSchemaVersion(
  version: string,
  schemaFile: string,
  changelog: string,
  status: 'current' | 'supported' = 'current'
): void {
  const registry = loadRegistry();

  // Move current to supported
  if (status === 'current') {
    const oldCurrent = registry.currentVersion;
    if (registry.versions[oldCurrent]) {
      registry.versions[oldCurrent].status = 'supported';
    }
    registry.currentVersion = version;
  }

  registry.versions[version] = {
    releaseDate: new Date().toISOString().split('T')[0],
    status,
    schemaFile,
    changelog
  };

  registry.supportedVersions.push(version);

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}
