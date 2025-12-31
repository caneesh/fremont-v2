import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

const ajv = new Ajv({
  allErrors: true,
  verbose: true
});
addFormats(ajv);

// Load schema
const schemaPath = path.join(__dirname, '../data/schemas/question.v1.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

// Load sample document
const samplePath = path.join(__dirname, '../data/schemas/sample-question.json');
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

console.log('='.repeat(60));
console.log('Schema Validation Report');
console.log('='.repeat(60));

// Compile schema
let validate;
try {
  validate = ajv.compile(schema);
  console.log('✅ Schema is valid JSON Schema 2020-12\n');
} catch (err: any) {
  console.log('❌ Schema compilation error:\n');
  console.log(err.message);
  process.exit(1);
}

// Validate sample document
const valid = validate(sample);

if (valid) {
  console.log('✅ Sample document is valid against schema\n');
} else {
  console.log('❌ Sample document validation errors:\n');
  validate.errors?.forEach((err, i) => {
    console.log(`${i + 1}. Path: ${err.instancePath}`);
    console.log(`   Keyword: ${err.keyword}`);
    console.log(`   Message: ${err.message}`);
    console.log(`   Params: ${JSON.stringify(err.params)}`);
    console.log('');
  });
}

// Summary
console.log('='.repeat(60));
console.log('Summary');
console.log('='.repeat(60));
console.log(`Schema: ${valid ? 'VALID' : 'HAS ISSUES'}`);
console.log(`Errors: ${validate.errors?.length || 0}`);
