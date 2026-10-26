# pint-ae

[![CI](https://github.com/FarshadAbolfathi/pint-ae/actions/workflows/ci.yml/badge.svg)](https://github.com/FarshadAbolfathi/pint-ae/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A590%25-brightgreen)](https://github.com/FarshadAbolfathi/pint-ae/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![npm](https://img.shields.io/badge/npm-not%20published%20yet-lightgrey)](#roadmap)

An open-source **TypeScript SDK and CLI for building and validating UAE
e-invoices** under the **PINT AE** specification (the United Arab Emirates
profile of Peppol PINT, using UBL 2.1 XML).

> **Status: not certified.** This project is for **preparation and validation
> only**. It does **not** transmit invoices to the FTA or to an Accredited
> Service Provider (ASP), and it is not an official OpenPeppol or UAE Ministry
> of Finance product. Always confirm compliance with your ASP and the official
> specification before relying on it.

Every validation rule is traceable to the official OpenPeppol PINT AE Billing
Schematron (v1.0.3). No tax rule, code or cardinality in this repository is
invented — see [`spec/SOURCES.md`](./spec/SOURCES.md).

## 30-second quick start

```sh
pnpm add @pint-ae/ae   # once published; see the roadmap
```

```ts
import { PintAE } from '@pint-ae/ae';

const result = PintAE.invoice()
  .withMeta({ id: 'INV-2025-001', issueDate: '2025-01-30', dueDate: '2025-02-06' })
  .seller({
    name: 'Supplier Legal Name',
    vatIdentifier: '100000000000003', // UAE TRN (ibr-132-ae)
    endpoint: { id: '1357902468', schemeId: '0235' },
    address: { street: 'Street Name', city: 'Dubai', countrySubentity: 'DXB', country: 'AE' },
  })
  .buyer({
    name: 'Buyer Legal Name',
    vatIdentifier: '134567890123003',
    address: { city: 'Abu Dhabi', countrySubentity: 'AUH', country: 'AE' },
  })
  .addLine({
    quantity: 100,
    unitCode: 'H87', // UNECE Rec 20 unit code
    price: 10,
    item: { name: 'Widget', taxCategory: { id: 'S', percent: 5 } }, // 5% standard rate
  })
  .build();

if (!result.ok) {
  console.error(result.report.errors);
} else {
  const xml = PintAE.toXml(result.document); // UBL 2.1 XML string
  const report = PintAE.validate(xml); // validate a document or an XML string
  console.log(xml);
  console.log(report.valid); // true
}
```

The builder computes line net amounts, the VAT breakdown and the document
totals for you, so the result already satisfies the PINT calculation rules.
Every amount is handled with exact decimal arithmetic — never floating point.

## Features

- **Typed domain model** for invoices and credit notes (parties, addresses, tax
  registration, lines, allowances/charges, VAT breakdown, totals, payment
  means), validated with [zod](https://zod.dev).
- **Fluent builder** that derives amounts and totals and returns a typed result.
- **UBL 2.1 serialisation** to PINT AE XML.
- **Validation engine** returning structured results —
  `{ ruleId, severity, path, message }` — with each rule traceable to its
  official Schematron assertion.
- **UAE specifics**: TRN/TIN format validation and the official VAT category
  code list.
- **Exact money**: decimal arithmetic with half-up rounding matching the spec.
- **Monorepo** designed for a generic PINT core with pluggable country profiles.

### Implemented rules

| Rule         | What it checks                                                       |
| ------------ | -------------------------------------------------------------------- |
| `ibr-132-ae` | VAT identifier (TRN) format: 15 digits, starts `1`, ends `03`        |
| `ibr-128-ae` | For an `AE` address, the subdivision is a valid emirate code         |
| `ibr-147-ae` | Line net amount = qty × (price / base) + charges − allowances        |
| `ibr-131-ae` | Allowance amount = base × percentage / 100                           |
| `ibr-146-ae` | Charge amount = base × percentage / 100                              |
| `ibr-120-ae` | A zero-rated VAT breakdown has rate 0                                |
| `ibr-co-10`  | Sum of line net amounts = Σ line net amounts                         |
| `ibr-co-11`  | Document allowance total = Σ document-level allowances               |
| `ibr-co-12`  | Document charge total = Σ document-level charges                     |
| `ibr-co-13`  | Total without VAT = Σ lines − document allowances + document charges |
| `ibr-co-14`  | Total VAT = Σ VAT breakdown tax amounts                              |
| `ibr-co-15`  | Total with VAT = total without VAT + total VAT                       |
| `ibr-co-16`  | Amount due = total with VAT − prepaid + rounding                     |

## Packages

| Package                            | Description                                                      |
| ---------------------------------- | ---------------------------------------------------------------- |
| [`@pint-ae/core`](./packages/core) | Generic PINT model, money utilities, validation engine, adapters |
| [`@pint-ae/ae`](./packages/ae)     | UAE profile: TRN, VAT categories, rules, builder, UBL output     |
| [`pint-ae`](./packages/cli) (CLI)  | Command line tool: `validate` and `build`                        |

## CLI

```sh
# Validate a UBL XML invoice against the PINT AE rules
pint-ae validate invoice.xml           # pretty report; exit 1 if invalid
pint-ae validate invoice.xml --json    # machine-readable report

# Build a UBL XML invoice from a JSON description
pint-ae build invoice.json             # XML to stdout
pint-ae build invoice.json -o out.xml  # write to a file
pint-ae build invoice.json --json      # the built document as JSON
```

Exit codes: `0` valid/success, `1` invalid document, `2` usage or I/O error —
suitable for use in CI pipelines.

## Development

Requires Node.js ≥ 20 and pnpm.

```sh
pnpm install
pnpm test        # run the test suite
pnpm build       # build all packages
pnpm lint        # ESLint
pnpm typecheck   # tsc project references
```

See [`docs/architecture.md`](./docs/architecture.md) for the package layout and
data flow, and [`docs/adr/`](./docs/adr) for the architecture decision records.

## Roadmap

- **M1 — Foundation (done):** monorepo, typed model, money/rounding, validation
  engine, first PINT AE rules, builder, UBL serialisation, docs, CI.
- **M2 — Parsing (done):** parse UBL XML into the typed model
  (`PintAE.validate(xml)`, `PintAE.fromXml(xml)`); golden-file tests against the
  official sample invoices. _Remaining:_ complete PINT AE rule coverage and a
  cross-check against the official Schematron.
- **M3 — CLI (done):** `pint-ae validate <file>` and `pint-ae build <json>` with
  JSON and pretty output and non-zero exit codes on errors.
- **M4 — Playground:** a React + Vite web page (GitHub Pages) to paste or upload
  XML and see the validation result.
- **M5 — ASP adapters:** the adapter interface with a mock adapter and an
  example integration.
- **M6 — Second country profile:** prove the generic core with another PINT
  jurisdiction.

Publishing to npm (via Changesets) is not enabled yet.

## License

[MIT](./LICENSE) © Farshad Abolfathi
