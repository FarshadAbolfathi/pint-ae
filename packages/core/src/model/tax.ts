import { z } from 'zod';
import { amount, percent } from './common.js';

/**
 * A VAT category (UBL `cac:TaxCategory` / `cac:ClassifiedTaxCategory`).
 * `id` is a UNCL5305 category code; the UAE-aligned subset is validated in
 * `@pint-ae/ae`.
 */
export const taxCategorySchema = z.object({
  /** IBT-118 / IBT-151 / IBT-095: category code (e.g. `S`, `Z`, `E`, `O`, `AE`, `N`). */
  id: z.string().min(1),
  /** IBT-119 / IBT-152: category rate as a percentage (e.g. `5`). */
  percent: percent.optional(),
  /** IBT-121 / IBT-172: exemption reason code. */
  exemptionReasonCode: z.string().min(1).optional(),
  /** IBT-120 / IBT-173: exemption reason text. */
  exemptionReason: z.string().min(1).optional(),
  /** Tax scheme identifier; defaults to `VAT`. */
  taxScheme: z.string().min(1).default('VAT'),
});

export type TaxCategory = z.infer<typeof taxCategorySchema>;

/** A VAT breakdown line (UBL `cac:TaxSubtotal`, IBG-23). */
export const taxSubtotalSchema = z.object({
  /** IBT-116: taxable amount for this category/rate. */
  taxableAmount: amount,
  /** IBT-117: tax amount for this category/rate. */
  taxAmount: amount,
  category: taxCategorySchema,
});

export type TaxSubtotal = z.infer<typeof taxSubtotalSchema>;

/** The document-level tax total (UBL `cac:TaxTotal`). */
export const taxTotalSchema = z.object({
  /** IBT-110: total VAT amount for the document. */
  taxAmount: amount,
  /** Whether tax is included in the line amounts (UBL `cbc:TaxIncludedIndicator`). */
  taxIncluded: z.boolean().default(false),
  subtotals: z.array(taxSubtotalSchema),
});

export type TaxTotal = z.infer<typeof taxTotalSchema>;
