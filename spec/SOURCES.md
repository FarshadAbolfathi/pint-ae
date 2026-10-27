# Specification sources

All business rules, code lists and element mappings in this repository derive
from the official OpenPeppol **PINT AE** specification. This file records the
provenance of every artifact under `spec/` so that each implemented rule can be
traced back to an authoritative source.

> **Do not hand-edit the downloaded artifacts.** They are kept verbatim so they
> can be re-verified against the upstream source by checksum. If upstream
> publishes a new version, download it into a new version-stamped folder and add
> a new row below rather than overwriting.

## PINT AE Billing — v1.0.3

- **Specification:** Peppol International (PINT) model for Billing — United Arab
  Emirates (PINT AE Billing)
- **Version:** 1.0.3
- **Release date (upstream):** 2026-03-26
- **Publisher:** OpenPeppol AISBL
- **Landing page:** https://docs.peppol.eu/poac/ae/v1.0.3/pint-ae/
- **Downloaded bundle:** https://docs.peppol.eu/poac/ae/v1.0.3/pint-ae/resources.zip
- **Downloaded on:** 2026-10-26
- **Local path:** `spec/pint-ae-billing/`

### Bundle integrity

| File                                                          | SHA-256                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `resources.zip`                                               | `47756033c9b70be166973ff97298a948e5fe2434d063a5ce781127e727c29258` |
| `trn-invoice/schematron/PINT-jurisdiction-aligned-rules.sch`  | `3acd2ea7004cbb0ee2753b3613d1af013556ca48c944dd7ec4b7a83563fe9234` |
| `trn-invoice/schematron/PINT-UBL-validation-preprocessed.sch` | `6f623915f7651eba55a931c267b4fee614882575a7d061b0492a21ba13cd4697` |
| `trn-invoice/codelist/Aligned-TaxCategoryCodes.gc`            | `09cbd1130d6f62538ab8bb31e47166e75fedf79d5bbfe5f54ef9643345f88c6d` |

Re-verify any file with, for example:

```sh
shasum -a 256 spec/pint-ae-billing/resources.zip
```

### What the bundle contains

```
spec/pint-ae-billing/
  common/docs/            bis.pdf, compliance.pdf, specialized-release-notes.pdf
  trn-invoice/
    schematron/           PINT-jurisdiction-aligned-rules.sch  (the AE "ibr-*-ae" rules)
                          PINT-UBL-validation-preprocessed.sch (PINT core "ibr-*" / "ibr-co-*" rules)
                          *.xslt                               (compiled Schematron)
    codelist/*.gc         genericode code lists (VAT categories, ISO 4217, UNECE Rec 20, ...)
    example/*.xml         official golden sample invoices
  trn-creditnote/         same layout for credit notes
```

## Rule families and where they live

| Prefix       | Origin                                                                 | Example                              |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------ |
| `ibr-NNN-ae` | UAE jurisdiction-aligned rules (`PINT-jurisdiction-aligned-rules.sch`) | `ibr-132-ae` (TRN format)            |
| `ibr-NNN`    | PINT core rules (`PINT-UBL-validation-preprocessed.sch`)               | `ibr-012` (sum of line nets present) |
| `ibr-co-NN`  | PINT core calculation rules                                            | `ibr-co-10` (sum of line nets)       |
| `ibr-cl-NN`  | PINT core code-list rules                                              | —                                    |
| `ibr-sr-NN`  | PINT core semantic-requirement rules                                   | —                                    |

Every validation rule implemented in `packages/ae` cites its official rule ID in
code and carries the assertion's human-readable message from the Schematron.

## Notes / discrepancies observed

- **VAT category code `N`:** `Aligned-TaxCategoryCodes.gc` stores the identifier
  for "Standard rate additional VAT" using a Greek capital Nu glyph (`Ν`,
  U+039D), but every Schematron assertion tests against the ASCII letter `N`
  (U+004E). We treat ASCII `N` as canonical, matching the rules that are
  actually enforced. See `packages/ae/src/vat.ts`.

## TODO(spec)

- UAE Ministry of Finance / FTA primary legislation URLs for the TRN format and
  the mandate timeline are not yet linked here. The go-live dates cited in the
  README (Phase 1 ≥ AED 50M: 1 Jan 2027; Phase 2: 1 Jul 2027; Phase 3
  government: 1 Oct 2027) come from advisory sources citing Ministerial
  Decisions 243/244 of 2025 and Ministerial Resolution 66 of 2026; verify them
  against the MoF primary publication at <https://mof.gov.ae>. The TRN format in
  use is the one enforced by `ibr-132-ae`.
