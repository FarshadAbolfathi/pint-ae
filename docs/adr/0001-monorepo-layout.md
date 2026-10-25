# ADR 0001: pnpm-workspace monorepo with a generic core and country profiles

- Status: accepted
- Date: 2026-10-26

## Context

The long-term goal is a generic Peppol PINT implementation with multiple country
profiles (AE first, then SG, MY, JP, AU, EU). The UAE profile must ship now
without baking UAE assumptions into shared code, and a CLI and (later) a web
playground consume the same logic.

## Decision

Use a **pnpm-workspace monorepo** with these packages:

- `@pint-ae/core` — generic PINT model, money/rounding, validation engine, ASP
  adapter interface. No country-specific logic.
- `@pint-ae/ae` — the UAE profile (rules, code lists, TRN, builder, UBL output),
  depending on `core`.
- `pint-ae` — the CLI, depending on `ae`.
- `apps/playground` — the web app (later milestone).

Shared TypeScript configuration lives in `tsconfig.base.json`; packages use
TypeScript **project references** for incremental, dependency-ordered builds.
Each package is built with **tsup** (ESM + CJS + type declarations). Versioning
and releases are managed with **Changesets**.

## Consequences

- A new country profile is a new package depending on `core`, with no changes to
  shared code — the architecture is proven in Milestone 6.
- One install, one test run, one CI pipeline across all packages.
- Project references keep type-checking fast and enforce the dependency
  direction (profiles may depend on core, never the reverse).
- Slightly more configuration up front (per-package `tsconfig`, `tsup`) than a
  single package would need.
