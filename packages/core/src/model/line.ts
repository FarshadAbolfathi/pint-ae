import { z } from 'zod';
import { allowanceChargeSchema } from './allowance.js';
import { amount, quantity } from './common.js';
import { taxCategorySchema } from './tax.js';

/** The item on an invoice line (UBL `cac:Item`). */
export const itemSchema = z.object({
  /** IBT-153: item name. */
  name: z.string().min(1),
  /** IBT-154: item description. */
  description: z.string().min(1).optional(),
  /** IBT-151: the VAT category that classifies this item. */
  taxCategory: taxCategorySchema,
});

export type Item = z.infer<typeof itemSchema>;

/** The unit price of an invoice line (UBL `cac:Price`). */
export const priceSchema = z.object({
  /** IBT-146: item net price. */
  priceAmount: amount,
  /** IBT-149: base quantity the price applies to (defaults to 1). */
  baseQuantity: quantity.default('1'),
});

export type Price = z.infer<typeof priceSchema>;

/** An invoice (or credit note) line (UBL `cac:InvoiceLine`, IBG-25). */
export const invoiceLineSchema = z.object({
  /** IBT-126: line identifier. */
  id: z.string().min(1),
  /** IBT-129: invoiced/credited quantity. */
  quantity: quantity,
  /** IBT-130: unit of measure code (UNECE Rec 20, e.g. `H87`). */
  unitCode: z.string().min(1),
  /** IBT-131: invoice line net amount. */
  lineExtensionAmount: amount,
  /** IBT-127: free-form line note. */
  note: z.string().min(1).optional(),
  item: itemSchema,
  price: priceSchema,
  /** IBG-27 / IBG-28: line-level allowances and charges. */
  allowanceCharges: z.array(allowanceChargeSchema).default([]),
});

export type InvoiceLine = z.infer<typeof invoiceLineSchema>;
