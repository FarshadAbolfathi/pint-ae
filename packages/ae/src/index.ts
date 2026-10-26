/**
 * `@pint-ae/ae` — the UAE profile for Peppol PINT: TRN validation, VAT
 * categories, the PINT AE business-rule set, a fluent builder and UBL 2.1
 * serialisation and parsing.
 */
import type { Document, ValidationReport } from '@pint-ae/core';
import { creditNote, invoice } from './builder.js';
import { AE_RULES, validateDocument } from './rules/index.js';
import { fromXml, parseDocument } from './xml/fromXml.js';
import { toXml } from './xml/toXml.js';

// Re-export the generic core API so `@pint-ae/ae` is a complete entry point
// (consumers do not need to also depend on `@pint-ae/core` for its types).
export * from '@pint-ae/core';
export * from './trn.js';
export * from './vat.js';
export * from './codes.js';
export * from './calc.js';
export * from './builder.js';
export * from './json.js';
export * from './report-format.js';
export * from './rules/index.js';
export { toXml } from './xml/toXml.js';
export { fromXml, parseDocument, XmlParseError } from './xml/fromXml.js';

/**
 * Validate a document, given either the typed model or a UBL XML string. When a
 * string is supplied it is parsed first; if it does not satisfy the schema the
 * returned report carries the `schema` errors (the rule set is not run).
 */
function validate(input: Document | string): ValidationReport {
  if (typeof input === 'string') {
    const { document, report } = parseDocument(input);
    return document === null ? report : validateDocument(document);
  }
  return validateDocument(input);
}

/**
 * The high-level entry point.
 *
 * ```ts
 * const result = PintAE.invoice()
 *   .withMeta({ id: 'INV-1', issueDate: '2025-01-30' })
 *   .seller({ ... })
 *   .buyer({ ... })
 *   .addLine({ ... })
 *   .build();
 *
 * if (result.ok) {
 *   const xml = PintAE.toXml(result.document);
 *   const report = PintAE.validate(xml); // or PintAE.validate(result.document)
 * }
 * ```
 */
export const PintAE = {
  /** Start building a tax invoice. */
  invoice,
  /** Start building a credit note. */
  creditNote,
  /** Serialise a typed document to PINT AE UBL 2.1 XML. */
  toXml,
  /** Parse PINT AE UBL 2.1 XML into the typed model. */
  fromXml,
  /** Validate a typed document or a UBL XML string against the PINT AE rules. */
  validate,
  /** The implemented PINT AE rule set. */
  rules: AE_RULES,
} as const;
