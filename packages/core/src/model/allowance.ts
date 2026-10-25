import { z } from 'zod';
import { amount, percent } from './common.js';
import { taxCategorySchema } from './tax.js';

/**
 * An allowance (discount) or charge (UBL `cac:AllowanceCharge`). The same shape
 * is used at document level (IBG-20 / IBG-21) and on a line
 * (IBG-27 / IBG-28); `isCharge` distinguishes the two directions.
 */
export const allowanceChargeSchema = z.object({
  /** `true` = charge (adds), `false` = allowance/discount (subtracts). */
  isCharge: z.boolean(),
  /** IBT-092 / IBT-099 / IBT-136 / IBT-141: the allowance or charge amount. */
  amount: amount,
  /** IBT-093 / IBT-100 / IBT-137 / IBT-142: base amount the percentage applies to. */
  baseAmount: amount.optional(),
  /** IBT-094 / IBT-101 / IBT-138 / IBT-143: percentage applied to the base amount. */
  percent: percent.optional(),
  /** IBT-098 / IBT-105 / IBT-140 / IBT-145: reason code. */
  reasonCode: z.string().min(1).optional(),
  /** IBT-097 / IBT-104 / IBT-139 / IBT-144: reason text. */
  reason: z.string().min(1).optional(),
  /** Document-level allowances/charges carry a VAT category (IBT-095 etc.). */
  taxCategory: taxCategorySchema.optional(),
});

export type AllowanceCharge = z.infer<typeof allowanceChargeSchema>;
