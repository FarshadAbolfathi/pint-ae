/**
 * `@pint-ae/ae` — the UAE profile for Peppol PINT: TRN validation, VAT
 * categories, the PINT AE business-rule set, a fluent builder and UBL 2.1
 * serialisation.
 */
import type { Document, ValidationReport } from '@pint-ae/core';
import { creditNote, invoice } from './builder.js';
import { AE_RULES, validateDocument } from './rules/index.js';
import { toXml } from './xml/toXml.js';

export * from './trn.js';
export * from './vat.js';
export * from './calc.js';
export * from './builder.js';
export * from './rules/index.js';
export { toXml } from './xml/toXml.js';

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
 *   const report = PintAE.validate(result.document);
 * }
 * ```
 *
 * Note: validating a UBL XML *string* (parsing it back into the model first)
 * lands in Milestone 2; `validate` currently operates on the typed model.
 */
export const PintAE = {
  /** Start building a tax invoice. */
  invoice,
  /** Start building a credit note. */
  creditNote,
  /** Serialise a typed document to PINT AE UBL 2.1 XML. */
  toXml,
  /** Validate a typed document against the PINT AE rule set. */
  validate: (doc: Document): ValidationReport => validateDocument(doc),
  /** The implemented PINT AE rule set. */
  rules: AE_RULES,
} as const;
