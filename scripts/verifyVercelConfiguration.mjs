import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, resolve } from 'node:path'

// Test-only tools are supplied through npm exec's temporary cache. They are not
// application dependencies and never enter either deployed function graph.
function temporaryPackage(name) {
  const path = (process.env.PATH ?? '').split(delimiter)
    .map(directory => resolve(directory, '..', name)).find(existsSync)
  assert.ok(path, `Run: npm exec --yes --package=ajv@8.17.1 --package=ajv-formats@3.0.1 -- node scripts/verifyVercelConfiguration.mjs`)
  return createRequire(import.meta.url)(path)
}
const AjvModule = temporaryPackage('ajv')
const Ajv = AjvModule.default ?? AjvModule
const formatsModule = temporaryPackage('ajv-formats')
const addFormats = formatsModule.default ?? formatsModule
const schemaUrl = 'https://openapi.vercel.sh/vercel.json'
const response = await fetch(schemaUrl, { signal: AbortSignal.timeout(30_000) })
assert.ok(response.ok, `Vercel schema HTTP ${response.status}`)
const schemaText = await response.text()
const schema = JSON.parse(schemaText)
assert.equal(schema.$schema, 'http://json-schema.org/draft-04/schema#')
const functionSchema = Object.values(schema.properties.functions.patternProperties)[0]
assert.equal(functionSchema.properties.includeFiles.type, 'string')
assert.equal(functionSchema.properties.includeFiles.maxLength, 256)
const validator = new Ajv({ strict: false, allErrors: true })
addFormats(validator)
// The published schema labels itself draft-04 but now includes numeric
// exclusiveMinimum (modern JSON Schema). Keep every actual constraint intact;
// remove only that outdated dialect annotation for Ajv's modern compiler.
const { $schema: dialectAnnotation, ...constraints } = schema
assert.ok(dialectAnnotation)
const validate = validator.compile(constraints)
const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
assert.ok(validate(config), JSON.stringify(validate.errors, null, 2))

// Prove we reject the two actual failed configurations, using the official
// whole-project schema rather than an imitation of just the frontend checks.
const entrypoint = 'api/generate-door-visualization.ts'
for (const invalid of [['public/assets/doors/F1.webp'], 'x'.repeat(257)]) {
  const bad = structuredClone(config)
  bad.functions[entrypoint].includeFiles = invalid
  assert.equal(validate(bad), false, 'Previously rejected includeFiles must fail')
  assert.ok(validate.errors.some(error => error.instancePath === `/functions/${entrypoint.replaceAll('/', '~1')}/includeFiles`))
}
assert.equal(config.functions[entrypoint].includeFiles, undefined, 'Generation uses literal manifest reads, not directory globs')
assert.equal(config.functions['api/detect-entrance-structure.ts'].includeFiles, undefined)
console.log(JSON.stringify({ passed: true, schemaUrl, schemaSha256: createHash('sha256').update(schemaText).digest('hex'), checked: ['whole vercel.json', 'array rejected', '257-character string rejected', 'no broad asset inclusion'] }, null, 2))
