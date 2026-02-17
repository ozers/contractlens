<div align="center">

# 🔍 ContractLens

**Catch API breaking changes before your users do.**

Lightweight runtime API contract validation for Node.js.
Like Pact, but you add it in one line.

[![npm](https://img.shields.io/npm/v/contractlens)](https://www.npmjs.com/package/contractlens)
[![CI](https://github.com/ozers/contractlens/actions/workflows/ci.yml/badge.svg)](https://github.com/ozers/contractlens/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

[Quick Start](#quick-start) · [Features](#features) · [Modes](#modes) · [Pact vs ContractLens](#pact-vs-contractlens)

</div>

---

## The Problem

You have microservices. They talk to each other via APIs. One team changes a response field. The other team's service breaks. Nobody knew until production was on fire.

**Pact** solves this but needs a broker, consumer tests, provider tests, and weeks of setup. **express-openapi-validator** validates requests within a single service, not the contract between services.

**ContractLens** sits in your Express app, watches every response, and tells you the moment your API drifts from its OpenAPI spec.

## Quick Start

```bash
npm install contractlens
```

```typescript
import express from 'express';
import { contractlens } from 'contractlens';

const app = express();

// One line. That's it.
app.use(contractlens({ spec: './openapi.yaml' }));

app.get('/users/:id', (req, res) => {
  res.json({ id: 1, name: 'Özer', role: 'backend' });
});

app.listen(3000);
```

If `/users/:id` response doesn't match your OpenAPI spec:

```
⚠️  ContractLens Drift Detected
├─ GET /users/123 → 200
├─ 🔴 Missing field: "email" (required in spec)
├─ ⚠️  Extra field: "role" (not in spec)
└─ Summary: 1 breaking, 1 warning
```

## Features

- 🔴 **Missing field detection** — Spec says `email` is required, response doesn't have it? Breaking.
- ⚠️ **Extra field detection** — Response has `cache_key` not in spec? Warning.
- 🔴 **Type mismatch** — Spec says `id: integer`, response has `"123"`? Breaking.
- 🔴 **Enum violation** — Spec says `status: active|inactive`, response has `"deleted"`? Breaking.
- 📡 **Webhook alerts** — Send drift reports to Slack, PagerDuty, or any URL.
- ⚡ **Production sampling** — Validate 1% of requests, not all. Zero perf impact.
- 🎯 **Express middleware** — Drop it in, it works. No config files, no brokers, no setup.

## Modes

```typescript
// Development: log warnings to console
app.use(contractlens({ spec: './openapi.yaml', mode: 'warn' }));

// CI/Staging: throw error on drift (fail fast)
app.use(contractlens({ spec: './openapi.yaml', mode: 'strict' }));

// Production: sample 1% of requests, alert via webhook
app.use(contractlens({
  spec: './openapi.yaml',
  mode: 'log',
  sampleRate: 0.01,
  reporters: ['webhook'],
  webhookUrl: 'https://hooks.slack.com/services/...'
}));
```

## What It Catches

| Drift Type | Example | Severity |
|---|---|---|
| Missing required field | Spec requires `email`, response doesn't have it | 🔴 Breaking |
| Extra field | Response has `cache_key`, spec doesn't define it | ⚠️ Warning |
| Type mismatch | Spec says `age: integer`, response returns `"25"` | 🔴 Breaking |
| Enum violation | Spec says `status: active\|inactive`, response has `"deleted"` | 🔴 Breaking |

## Configuration

```typescript
contractlens({
  // Required: path to OpenAPI spec or inline object
  spec: './openapi.yaml',

  // 'warn' (default) | 'strict' | 'log'
  mode: 'warn',

  // Fraction of requests to validate (0.0 - 1.0)
  sampleRate: 1.0,

  // Reporter types
  reporters: ['console', 'webhook'],

  // Webhook URL for drift alerts
  webhookUrl: 'https://...',

  // Paths to skip validation
  exclude: ['/health', '/metrics'],
});
```

## Pact vs ContractLens

| | Pact | ContractLens |
|---|---|---|
| **Setup time** | Hours (broker, consumer/provider tests) | 1 minute (one middleware line) |
| **Approach** | Consumer-driven contracts | Spec-driven runtime validation |
| **Where it runs** | CI/CD pipeline | Runtime (dev/staging/prod) |
| **Catches drift in** | Next CI run | Next request |
| **Learning curve** | Steep | Near zero |
| **Dependencies** | Pact broker, language-specific libs | Just your OpenAPI spec |
| **Best for** | Large teams, complex contract workflows | Teams who already have OpenAPI specs |

ContractLens doesn't replace Pact — it complements it. Use Pact for formal contract workflows, use ContractLens for instant runtime drift detection.

## How It Works

```
Request → Your Handler → Response
                            ↓
                      ContractLens
                      ├─ Load OpenAPI spec (cached)
                      ├─ Match route + status code
                      ├─ Validate response against schema
                      ├─ Detect drift (extra/missing/type/enum)
                      └─ Report via console/webhook
```

ContractLens intercepts `res.json()` **after** the response is sent (non-blocking in `warn`/`log` mode), so it adds zero latency to your API responses.

## Requirements

- Node.js >= 18
- Express >= 4.0
- An OpenAPI 3.0.x or 3.1.x specification

## Contributing

Contributions are welcome! Please check out the [issues](https://github.com/ozers/contractlens/issues) page.

```bash
git clone https://github.com/ozers/contractlens.git
cd contractlens
npm install
npm run test
npm run build
```

## License

[MIT](LICENSE)

---

<div align="center">

Built by [Ozer](https://github.com/ozers) — a backend engineer who learned the hard way that a "harmless" field rename can take down three microservices on a Friday afternoon.

</div>