# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Build with tsup (ESM + CJS + DTS → dist/)
npm run test           # Run all tests (vitest run)
npm run test:watch     # Run tests in watch mode
npx vitest run test/drift-detector.test.ts  # Run a single test file
npm run lint           # Type-check only (tsc --noEmit)
```

## Rules

- TypeScript strict mode, no `any`
- Zero extra dependencies — only ajv, ajv-formats, js-yaml
- Never crash the host app — all errors in middleware/reporters must be caught silently
- All tests must pass and build must succeed before committing

## Architecture

ContractLens is Express middleware that validates API responses against an OpenAPI spec at runtime.

**Request flow:** Express request → handler sends `res.json()` → middleware intercepts → loads/caches OpenAPI spec → `detectDrift()` compares response body against spec schema → reporters emit results.

**Two validation approaches exist:**
- `drift-detector.ts` — custom tree-walking comparator (used by the middleware). Walks response objects recursively against the spec schema, detecting extra fields, missing required fields, type mismatches, and enum violations.
- `validator.ts` — AJV-based JSON Schema validation (exported but not used by middleware). Uses `ajv` + `ajv-formats` for strict JSON Schema validation.

**Key modules:**
- `src/core/spec-loader.ts` — Parses OpenAPI specs via js-yaml with custom local `$ref` resolver, caches by path. Builds a `Map<"METHOD /path", RouteSchema>` lookup.
- `src/core/drift-detector.ts` — The core diffing engine. `detectDrift()` is the main entry point.
- `src/middleware/express.ts` — The `contractlens()` factory. In `warn`/`log` mode, validation runs async via `process.nextTick` (non-blocking). In `strict` mode, validation runs before sending the response and returns 500 on drift.
- `src/reporters/` — `ConsoleReporter` and `WebhookReporter` implement the `Reporter` interface.
- `src/core/types.ts` — All shared types. `ParsedSpec.routes` uses `Map<string, RouteSchema>` keyed as `"METHOD /path"`.

## Implementation Order

See CLAUDE_CODE_PROMPT.md
