/**
 * `@pint-ae/ae` — the UAE profile for Peppol PINT: TRN validation, VAT
 * categories, the PINT AE business-rule set, a fluent builder, UBL 2.1
 * serialisation/parsing, and official-Schematron validation.
 */
import type { Document, ValidationMessage, ValidationReport as Report } from '@pint-ae/core';
import { ValidationReport } from '@pint-ae/core';
import { creditNote, invoice } from './builder.js';
import { AE_RULES, validateDocument } from './rules/index.js';
import { nodeSefLoader } from './schematron/node-loader.js';
import { runSchematron, type SchematronKind, type SefLoader } from './schematron/validate.js';
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
export { fromXml, parseDocument, detectDocumentKind, XmlParseError } from './xml/fromXml.js';
export {
  runSchematron,
  type SchematronKind,
  type SefName,
  type SefLoader,
} from './schematron/validate.js';
export { nodeSefLoader } from './schematron/node-loader.js';
export { parseSvrl } from './schematron/svrl.js';

/** Validation modes. `full` runs the official Schematron plus the native rules;
 * `fast` runs only the native TypeScript rules. */
export type ValidationMode = 'full' | 'fast';

export interface ValidateOptions {
  /** Defaults to `full`. */
  mode?: ValidationMode;
  /** How to load the compiled SEF files. Defaults to the Node loader; browser
   * hosts pass their own (e.g. fetching the bundled assets). */
  loadSef?: SefLoader;
}

/** Merge native and Schematron messages, preferring the Schematron entry for
 * any rule id both report (the Schematron carries the authoritative location). */
function merge(schematron: ValidationMessage[], native: ValidationMessage[]): ValidationMessage[] {
  const schematronIds = new Set(schematron.map((m) => m.ruleId));
  return [...schematron, ...native.filter((m) => !schematronIds.has(m.ruleId))];
}

/**
 * Validate a document — a typed model or a UBL XML string — against the PINT AE
 * rules. In `full` mode (the default) it runs the official Schematron and the
 * native rules; in `fast` mode only the native rules. A typed-model input is
 * serialised to XML for the Schematron pass.
 */
async function validate(input: Document | string, options: ValidateOptions = {}): Promise<Report> {
  const mode = options.mode ?? 'full';

  let doc: Document | null;
  let xml: string;
  let kind: SchematronKind;
  let schemaMessages: ValidationMessage[] = [];

  if (typeof input === 'string') {
    const parsed = parseDocument(input);
    doc = parsed.document;
    kind = parsed.kind;
    xml = input;
    if (doc === null) schemaMessages = [...parsed.report.messages];
  } else {
    doc = input;
    kind = input.kind;
    xml = toXml(input);
  }

  const native = doc !== null ? [...validateDocument(doc).messages] : [];

  if (mode === 'fast') {
    return new ValidationReport([...schemaMessages, ...native]);
  }

  const loadSef = options.loadSef ?? nodeSefLoader;
  const schematron = await runSchematron(xml, kind, loadSef);
  return new ValidationReport([...schemaMessages, ...merge(schematron, native)]);
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
 *   const report = await PintAE.validate(xml); // full mode (Schematron + native)
 *   const fast = await PintAE.validate(xml, { mode: 'fast' }); // native only
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
  /** Validate a document or XML string (async; `full` mode by default). */
  validate,
  /** Validate a typed document with the native rules only (synchronous). */
  validateFast: (doc: Document): Report => validateDocument(doc),
  /** The implemented native PINT AE rule set. */
  rules: AE_RULES,
} as const;
