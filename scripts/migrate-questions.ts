/**
 * Question Migration CLI Tool
 *
 * Usage:
 *   npx ts-node scripts/migrate-questions.ts --from v1 --to v2 --input data/questions.json
 *   npx ts-node scripts/migrate-questions.ts --check data/questions.json
 *   npx ts-node scripts/migrate-questions.ts --batch data/questions/ --to v2
 */

import fs from 'fs';
import path from 'path';
import { loadRegistry, validateQuestion, getCurrentVersion } from '../lib/schemaLoader';

// Parse command line args
const args = process.argv.slice(2);
const flags: Record<string, string> = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    flags[key] = args[i + 1] || 'true';
    i++;
  }
}

async function main() {
  console.log('Question Schema Migration Tool');
  console.log('==============================\n');

  if (flags.help) {
    printHelp();
    return;
  }

  if (flags.check) {
    await checkFile(flags.check);
    return;
  }

  if (flags.batch) {
    await batchMigrate(flags.batch, flags.to || getCurrentVersion());
    return;
  }

  if (flags.input) {
    await migrateFile(flags.input, flags.from, flags.to || getCurrentVersion());
    return;
  }

  printHelp();
}

function printHelp() {
  console.log(`
Commands:
  --check <file>              Check schema version and validate
  --input <file> --to <ver>   Migrate single file to version
  --batch <dir> --to <ver>    Migrate all JSON files in directory
  --help                      Show this help

Examples:
  npx ts-node scripts/migrate-questions.ts --check data/questions/sample.json
  npx ts-node scripts/migrate-questions.ts --input data/q.json --to question.v2
  npx ts-node scripts/migrate-questions.ts --batch data/questions/ --to question.v2
`);
}

async function checkFile(filePath: string) {
  console.log(`Checking: ${filePath}\n`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Handle array of questions or single question
  const questions = Array.isArray(data) ? data : data.questions ? data.questions : [data];

  console.log(`Found ${questions.length} question(s)\n`);

  const versionCounts: Record<string, number> = {};
  let validCount = 0;
  let invalidCount = 0;

  for (const q of questions) {
    const version = q.schemaVersion || 'unknown';
    versionCounts[version] = (versionCounts[version] || 0) + 1;

    const result = validateQuestion(q);
    if (result.valid) {
      validCount++;
    } else {
      invalidCount++;
      console.log(`❌ Question ${q.questionId || 'unknown'}:`);
      result.errors.forEach(e => console.log(`   - ${e.message}`));
    }

    if (result.warnings.length > 0) {
      console.log(`⚠️  Question ${q.questionId || 'unknown'} warnings:`);
      result.warnings.forEach(w => console.log(`   - ${w.message}`));
    }
  }

  console.log('\nSummary:');
  console.log('--------');
  console.log('Versions found:');
  Object.entries(versionCounts).forEach(([v, count]) => {
    console.log(`  ${v}: ${count}`);
  });
  console.log(`\nValid: ${validCount}, Invalid: ${invalidCount}`);

  const registry = loadRegistry();
  console.log(`\nCurrent schema version: ${registry.currentVersion}`);
}

async function migrateFile(filePath: string, fromVersion: string | undefined, toVersion: string) {
  console.log(`Migrating: ${filePath}`);
  console.log(`Target version: ${toVersion}\n`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  const questions = Array.isArray(data) ? data : data.questions ? data.questions : [data];

  const migrated: unknown[] = [];
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const q of questions) {
    const currentVersion = q.schemaVersion;

    if (currentVersion === toVersion) {
      console.log(`⏭️  ${q.questionId}: Already at ${toVersion}`);
      migrated.push(q);
      skipCount++;
      continue;
    }

    try {
      // Import migration dynamically based on versions
      const migrationPath = `../data/schemas/migrations/${currentVersion.replace('question.', '')}-to-${toVersion.replace('question.', '')}`;

      // For now, just update version (placeholder)
      const migratedQ = { ...q, schemaVersion: toVersion };
      migrated.push(migratedQ);
      console.log(`✅ ${q.questionId}: ${currentVersion} → ${toVersion}`);
      successCount++;
    } catch (err) {
      console.log(`❌ ${q.questionId}: Migration failed - ${err}`);
      migrated.push(q); // Keep original on error
      errorCount++;
    }
  }

  // Write output
  const outputPath = filePath.replace('.json', `.${toVersion}.json`);
  const output = Array.isArray(data)
    ? migrated
    : data.questions
    ? { ...data, questions: migrated }
    : migrated[0];

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\nMigration complete:`);
  console.log(`  Migrated: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`\nOutput: ${outputPath}`);
}

async function batchMigrate(dirPath: string, toVersion: string) {
  console.log(`Batch migrating: ${dirPath}`);
  console.log(`Target version: ${toVersion}\n`);

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} JSON file(s)\n`);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    await migrateFile(filePath, undefined, toVersion);
    console.log('');
  }
}

main().catch(console.error);
