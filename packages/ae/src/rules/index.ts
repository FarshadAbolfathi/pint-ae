import { runRules, type Document, type Rule, type ValidationReport } from '@pint-ae/core';
import { ibr131ae, ibr146ae } from './allowances.js';
import { ibr147ae } from './lines.js';
import { ibrCo10, ibrCo13, ibrCo15, ibrCo16 } from './totals.js';
import { ibr132ae } from './trn.js';

/**
 * The PINT AE business rules implemented so far (Milestone 1). Each rule cites
 * its official identifier from the PINT AE Billing v1.0.3 Schematron
 * (see `spec/SOURCES.md`). More rules are added in later milestones.
 */
export const AE_RULES: readonly Rule<Document>[] = [
  ibr132ae,
  ibr147ae,
  ibr131ae,
  ibr146ae,
  ibrCo10,
  ibrCo13,
  ibrCo15,
  ibrCo16,
];

/** Validate a typed document against the PINT AE rule set. */
export function validateDocument(doc: Document): ValidationReport {
  return runRules(doc, AE_RULES);
}

export { ibr131ae, ibr132ae, ibr146ae, ibr147ae, ibrCo10, ibrCo13, ibrCo15, ibrCo16 };
