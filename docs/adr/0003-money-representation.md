# ADR 0003: Money as exact decimals (decimal.js), never floating point

- Status: accepted
- Date: 2026-10-26

## Context

Invoice arithmetic must be exact. IEEE-754 binary floating point cannot
represent most decimal fractions, so `0.1 + 0.2 === 0.30000000000000004`.
Accumulated over line nets, VAT breakdowns and totals, this corrupts amounts and
would make documents fail the PINT calculation rules (`ibr-co-10`, `ibr-co-13`,
`ibr-co-15`, `ibr-co-16`, `ibr-147-ae`). UBL also allows unit prices with more
than two decimal places (IBT-146), while monetary totals are constrained to two.

The PINT Schematron computes with the XPath `round()` function, which rounds
half **away from zero** (half-up for the non-negative amounts we deal with). Our
rounding must match, or recomputed totals will disagree with the spec at the
half-cent boundary.

## Decision

Use [`decimal.js`](https://mikemcl.github.io/decimal.js/) for all monetary
arithmetic, via a configured clone:

- `rounding: ROUND_HALF_UP` to match the Schematron's `round()`.
- `precision: 34` significant digits — far beyond any monetary need.

In the typed model, amounts are stored as **canonical decimal strings** (not JS
`number`s) so they round-trip exactly through JSON and XML. The builder accepts
`number | string` for ergonomics and normalises immediately. A single
`money.ts` module centralises construction, summation, rounding, tolerant
("slack") comparison and fixed-decimal formatting for serialisation.

## Alternatives considered

- **Integer minor units (fils):** zero-dependency and exact, but awkward when
  unit prices need more than two decimals and when mixing scales (price base
  quantities, percentages); every operation must track its scale manually.
- **`big.js`:** smaller, but fewer features (configuration, formatting) than
  `decimal.js`; the size difference is negligible for this use case.
- **Native `BigInt`:** no fractional support without a manual fixed-point layer,
  reinventing a decimal library.

## Consequences

- Amounts are exact and reproducible; generated documents pass the calculation
  rules by construction.
- One small, well-established dependency in `core`.
- Callers must not do `number` math on amounts; the `money.ts` helpers and the
  string-typed model make the correct path the easy one.
