import { z } from 'zod';
import { amount } from './common.js';

/** Document monetary totals (UBL `cac:LegalMonetaryTotal`, IBG-22). */
export const monetaryTotalsSchema = z.object({
  /** IBT-106: sum of invoice line net amounts. */
  lineExtensionAmount: amount,
  /** IBT-109: invoice total amount without VAT. */
  taxExclusiveAmount: amount,
  /** IBT-112: invoice total amount with VAT. */
  taxInclusiveAmount: amount,
  /** IBT-107: sum of document-level allowances. */
  allowanceTotalAmount: amount.optional(),
  /** IBT-108: sum of document-level charges. */
  chargeTotalAmount: amount.optional(),
  /** IBT-113: amount already paid. */
  prepaidAmount: amount.optional(),
  /** IBT-114: rounding amount. */
  payableRoundingAmount: amount.optional(),
  /** IBT-115: amount due for payment. */
  payableAmount: amount,
});

export type MonetaryTotals = z.infer<typeof monetaryTotalsSchema>;
