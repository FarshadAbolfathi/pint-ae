import { z } from 'zod';

/** Payment means (UBL `cac:PaymentMeans`, IBG-16). */
export const paymentMeansSchema = z.object({
  /** IBT-081: payment means type code (UNCL4461, e.g. `30` credit transfer, `55` debit card). */
  code: z.string().min(1),
  /** Human-readable name for the payment means. */
  name: z.string().min(1).optional(),
  /** IBT-083: remittance information / payment reference. */
  remittanceInformation: z.string().min(1).optional(),
  /** IBT-084: payment account identifier (IBAN or local account number). */
  payeeAccountId: z.string().min(1).optional(),
  /** IBT-085: payee account name. */
  payeeAccountName: z.string().min(1).optional(),
});

export type PaymentMeans = z.infer<typeof paymentMeansSchema>;
