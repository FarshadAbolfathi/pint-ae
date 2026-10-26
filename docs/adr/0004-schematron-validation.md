# ADR 0004: Official Schematron as the source of truth, native rules for speed

- Status: accepted
- Date: 2026-10-27

## Context

The native TypeScript rule set covers only a fraction of the official PINT AE
Schematron (~16 of ~300 assertions). Hand-porting every assertion would be slow,
error-prone, and would drift from the specification over time. A reviewer can
trivially produce invalid documents (bad currency, impossible date, wrong
`CustomizationID`) that a partial native rule set reports as valid.

We need validation that is **faithful to the specification by construction**,
while keeping a fast, type-safe path for the builder and hot code.

## Decision

Validation has two modes:

- **`full` (default):** run the official PINT AE Schematron and merge its result
  with the native rules. The Schematron is the authoritative source of truth.
- **`fast`:** run only the native TypeScript rules — synchronous, dependency-free
  at runtime, used by the builder and anywhere latency matters.

The official Schematron ships as XSLT 2.0. We compile it to SaxonJS SEF with the
free `xslt3` compiler at build time (`scripts/build-sef.mjs`) and run it with
`saxon-js`, which works in both Node and the browser. The SEF files are
generated artifacts, committed for reproducible installs, and CI regenerates and
diffs them so they always match the vendored spec. SVRL output is parsed into
the existing `{ ruleId, severity, path, message }` shape.

The native rules remain valuable: they are fast, synchronous, have no runtime
dependency, give model-relative paths, and let the builder guarantee valid
output by construction. Where both flag a rule, the Schematron entry wins (it
carries the authoritative location).

## Alternatives considered

- **Hand-port all ~300 assertions to TypeScript:** large ongoing maintenance
  burden and a constant risk of diverging from the spec. Rejected as the primary
  mechanism; native rules stay as the fast complement.
- **A pure-JS XSLT engine:** no maintained XSLT 2.0/3.0 engine exists in pure JS;
  SaxonJS is the realistic option for Node + browser.

## Consequences

- `PintAE.validate` is asynchronous (SaxonJS runs async in the browser). The
  synchronous native path stays available via `validateFast` and
  `validateDocument`.
- A runtime dependency on **`saxon-js`**, which is proprietary (free to use,
  © Saxonica), not OSI open source. Our code remains MIT; consumers that use
  `full` mode pull in `saxon-js`. This trade-off is accepted for spec fidelity.
- The SEF files are large (~6–7 MB total). Node loads them from disk; the browser
  playground lazy-loads them so the initial page stays small.
