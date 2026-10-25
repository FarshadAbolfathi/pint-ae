# Contributing to pint-ae

Thanks for your interest in contributing! This project aims for high code
quality, full traceability of tax rules, and a clean history.

## Ground rule: never invent tax rules

Every business rule, code list value and element mapping **must** come from an
official source — the OpenPeppol PINT AE specification, the UBL 2.1 schemas, the
PINT AE Schematron and code lists, or UAE Ministry of Finance / FTA
documentation. Record the source (URL, version, download date, checksum) in
[`spec/SOURCES.md`](./spec/SOURCES.md).

If you cannot find an authoritative source for something, **do not guess**. Open
an issue, or leave a clearly marked `TODO(spec)` comment, and say so in your PR.

Each validation rule must:

1. cite its official rule ID (e.g. `ibr-132-ae`) in code,
2. carry the assertion text from the Schematron as its message, and
3. have at least one **passing** and one **failing** test.

## Getting started

```sh
pnpm install
pnpm test
pnpm build
```

Node.js ≥ 20 and pnpm are required (enable pnpm with `corepack enable`).

## Before you open a PR

Run the full check locally — CI runs the same on Node 20 and 22:

```sh
pnpm lint
pnpm typecheck
pnpm test:coverage   # coverage must stay ≥ 90% for core and ae
pnpm build
```

Then:

- Add a changeset if your change is user-facing: `pnpm changeset`.
- Update docs (README / `docs/`) if behaviour or the public API changed.
- Fill in the PR template, including the spec traceability section.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` a new feature
- `fix:` a bug fix
- `test:` adding or fixing tests
- `docs:` documentation only
- `chore:` tooling, config, housekeeping
- `refactor:` behaviour-preserving code change

Scope by package where helpful, e.g. `feat(ae): add ibr-co-14 rule`.

## Code style

ESLint + Prettier enforce style; run `pnpm format` and `pnpm lint:fix`. TypeScript
is strict. Keep public APIs documented with TSDoc comments.

## Code of conduct

By participating you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).
