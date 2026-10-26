import type { Document, Rule } from '@pint-ae/core';

/** Allowed invoice type codes (UNTDID 1001) per `ibr-cl-01`. */
export const INVOICE_TYPE_CODES: ReadonlySet<string> = new Set(['380', '480']);
/** Allowed credit note type codes (UNTDID 1001) per `ibr-cl-01`. */
export const CREDIT_NOTE_TYPE_CODES: ReadonlySet<string> = new Set(['81', '381']);

/**
 * ibr-cl-01 — The document type code (IBT-003) MUST be coded by the invoice and
 * credit note related code lists of UNTDID 1001: invoices use `380`/`480`,
 * credit notes use `81`/`381`.
 */
export const ibrCl01: Rule<Document> = {
  id: 'ibr-cl-01',
  severity: 'fatal',
  text: 'The document type code (ibt-003) MUST be coded by the invoice and credit note related code lists of UNTDID 1001.',
  check(doc) {
    if (doc.kind === 'creditNote') {
      return CREDIT_NOTE_TYPE_CODES.has(doc.creditNoteTypeCode)
        ? []
        : [{ path: 'creditNoteTypeCode' }];
    }
    return INVOICE_TYPE_CODES.has(doc.invoiceTypeCode) ? [] : [{ path: 'invoiceTypeCode' }];
  },
};
