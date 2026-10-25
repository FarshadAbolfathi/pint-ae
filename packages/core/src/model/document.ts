import { z } from 'zod';
import { allowanceChargeSchema } from './allowance.js';
import { currencyCode, isoDate } from './common.js';
import { invoiceLineSchema } from './line.js';
import { partySchema } from './party.js';
import { paymentMeansSchema } from './payment.js';
import { taxTotalSchema } from './tax.js';
import { monetaryTotalsSchema } from './totals.js';

/** The default PINT AE Billing customization identifier (IBT-024). */
export const PINT_AE_CUSTOMIZATION_ID = 'urn:peppol:pint:billing-1@ae-1';
/** The default Peppol billing profile identifier (IBT-023). */
export const PEPPOL_BILLING_PROFILE_ID = 'urn:peppol:bis:billing';

/** Fields shared by invoices and credit notes. */
const documentBase = {
  /** IBT-024: customization identifier. */
  customizationId: z.string().min(1).default(PINT_AE_CUSTOMIZATION_ID),
  /** IBT-023: business process / profile identifier. */
  profileId: z.string().min(1).default(PEPPOL_BILLING_PROFILE_ID),
  /** UAE profile execution identifier (8-bit transaction-type flags). */
  profileExecutionId: z.string().min(1).optional(),
  /** IBT-001: document number. */
  id: z.string().min(1),
  /** BTAE-07: document UUID. */
  uuid: z.string().min(1).optional(),
  /** IBT-002: issue date. */
  issueDate: isoDate,
  /** IBT-009: payment due date. */
  dueDate: isoDate.optional(),
  /** IBT-005: document currency. */
  documentCurrencyCode: currencyCode.default('AED'),
  /** IBT-006: tax accounting currency. */
  taxCurrencyCode: currencyCode.optional(),
  /** IBT-022: document-level note. */
  note: z.string().min(1).optional(),
  /** IBT-010: buyer reference. */
  buyerReference: z.string().min(1).optional(),
  seller: partySchema,
  buyer: partySchema,
  paymentMeans: z.array(paymentMeansSchema).default([]),
  /** IBG-20 / IBG-21: document-level allowances and charges. */
  allowanceCharges: z.array(allowanceChargeSchema).default([]),
  lines: z.array(invoiceLineSchema).min(1),
  taxTotal: taxTotalSchema,
  totals: monetaryTotalsSchema,
};

/** A UAE PINT AE tax invoice. */
export const invoiceSchema = z.object({
  kind: z.literal('invoice').default('invoice'),
  /** IBT-003: invoice type code (UNCL1001, default `380`). */
  invoiceTypeCode: z.string().min(1).default('380'),
  ...documentBase,
});

export type Invoice = z.infer<typeof invoiceSchema>;

/** A UAE PINT AE tax credit note. */
export const creditNoteSchema = z.object({
  kind: z.literal('creditNote').default('creditNote'),
  /** IBT-003: credit note type code (UNCL1001, default `381`). */
  creditNoteTypeCode: z.string().min(1).default('381'),
  ...documentBase,
});

export type CreditNote = z.infer<typeof creditNoteSchema>;

/** Either document kind. */
export type Document = Invoice | CreditNote;
