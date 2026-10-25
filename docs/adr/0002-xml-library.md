# ADR 0002: XML handling with xmlbuilder2 (build) and fast-xml-parser (parse)

- Status: accepted
- Date: 2026-10-26

## Context

PINT AE invoices are **UBL 2.1** XML with multiple namespaces (`cac`, `cbc` and
the document default namespace) and a strict element order defined by the UBL
XSDs. Milestone 1 needs to **produce** this XML; Milestone 2 needs to **parse**
external XML back into the typed model. We want well-maintained, dependency-light
libraries and no native build step.

## Decision

- **Building:** use [`xmlbuilder2`](https://oliverlr.github.io/xmlbuilder2/). It
  produces correctly-namespaced output, preserves child order (which UBL
  requires), handles attributes and mixed content (e.g. `currencyID` on amounts),
  and serialises deterministically — important for golden-file tests.
- **Parsing (Milestone 2):** use
  [`fast-xml-parser`](https://github.com/NaturalIntelligence/fast-xml-parser). It
  is fast, pure-JS, actively maintained, and configurable for attribute handling
  and namespace prefixes.

We deliberately do **not** validate against the UBL XSD or run the official
Schematron XSLT at runtime in M1; rule checking is done against the typed model.
Running the official Schematron over generated XML is a Milestone 2 cross-check.

## Alternatives considered

- **`fast-xml-parser` for building too:** its builder is serviceable but less
  ergonomic for namespaced, ordered UBL construction than `xmlbuilder2`.
- **`libxmljs` / native libxml2:** real XSD/Schematron validation, but a native
  dependency complicates installs and CI across Node versions and platforms.
- **`@xmldom/xmldom` + manual DOM:** more boilerplate and easier to get the
  element order wrong.

## Consequences

- Two small, focused dependencies, each best-in-class for its direction.
- No native modules; installs and CI stay simple on Node 20 and 22.
- XSD/Schematron conformance is a separate, explicit milestone rather than an
  implicit runtime cost.
