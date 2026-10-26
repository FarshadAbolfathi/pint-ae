import { runRules, type Document, type Rule, type ValidationReport } from '@pint-ae/core';
import { ibr131ae, ibr146ae } from './allowances.js';
import { ibrCl01 } from './document.js';
import { ibr125ae, ibr147ae } from './lines.js';
import { ibr128ae } from './parties.js';
import { ibrCo10, ibrCo11, ibrCo12, ibrCo13, ibrCo14, ibrCo15, ibrCo16 } from './totals.js';
import { ibr132ae } from './trn.js';
import { ibr120ae, ibr121ae } from './vat-rules.js';

/**
 * The implemented PINT AE business rules. Each rule cites its official
 * identifier from the PINT AE Billing v1.0.3 Schematron (see `spec/SOURCES.md`)
 * and carries the assertion text. Coverage grows over successive milestones.
 */
export const AE_RULES: readonly Rule<Document>[] = [
  ibrCl01,
  ibr132ae,
  ibr128ae,
  ibr125ae,
  ibr147ae,
  ibr131ae,
  ibr146ae,
  ibr120ae,
  ibr121ae,
  ibrCo10,
  ibrCo11,
  ibrCo12,
  ibrCo13,
  ibrCo14,
  ibrCo15,
  ibrCo16,
];

/** Validate a typed document against the PINT AE rule set. */
export function validateDocument(doc: Document): ValidationReport {
  return runRules(doc, AE_RULES);
}

export {
  ibrCl01,
  ibr120ae,
  ibr121ae,
  ibr125ae,
  ibr128ae,
  ibr131ae,
  ibr132ae,
  ibr146ae,
  ibr147ae,
  ibrCo10,
  ibrCo11,
  ibrCo12,
  ibrCo13,
  ibrCo14,
  ibrCo15,
  ibrCo16,
};
