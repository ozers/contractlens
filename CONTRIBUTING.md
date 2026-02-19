# Contributing to ContractLens

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/ozers/contractlens.git
cd contractlens
npm install
```

## Commands

```bash
npm run build        # Build (ESM + CJS + DTS)
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Type-check (tsc --noEmit)
```

## Making Changes

1. Fork the repo and create a branch from `main`.
2. Make your changes. Follow the existing code style.
3. Ensure `npm run lint` and `npm run test` both pass.
4. Ensure `npm run build` succeeds.
5. Open a pull request.

## Guidelines

- **TypeScript strict** — no `any` types.
- **Zero extra dependencies** — only `ajv`, `ajv-formats`, and `swagger-parser` are allowed as runtime deps.
- **Never crash the host app** — all errors must be caught gracefully.
- Keep PRs focused. One feature or fix per PR.

## Reporting Issues

Use [GitHub Issues](https://github.com/ozers/contractlens/issues) to report bugs or request features. Include reproduction steps when reporting bugs.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
