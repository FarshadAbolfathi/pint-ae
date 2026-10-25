import { z } from 'zod';
import { Money } from '../money.js';

/**
 * A monetary amount in the typed model. Stored as a canonical decimal *string*
 * (never a JS number) so that amounts round-trip exactly. The builder accepts a
 * number or string for ergonomics and normalises here.
 */
export const amount = z
  .union([z.number(), z.string(), z.instanceof(Money)])
  .transform((value, ctx): string => {
    try {
      return new Money(value as never).toString();
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid amount: ${String(value)}` });
      return z.NEVER;
    }
  });

/** Input accepted for an amount before normalisation. */
export type AmountInput = number | string;

/** A generic non-monetary decimal (percentage, quantity) stored as a string. */
function decimalString(label: string) {
  return z.union([z.number(), z.string()]).transform((value, ctx): string => {
    try {
      return new Money(value).toString();
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid ${label}: ${String(value)}` });
      return z.NEVER;
    }
  });
}

/** A percentage (e.g. VAT rate) stored as a decimal string. */
export const percent = decimalString('percent');

/** A quantity stored as a decimal string. */
export const quantity = decimalString('quantity');

/** ISO 8601 calendar date, `YYYY-MM-DD`. */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/** ISO 4217 three-letter currency code. */
export const currencyCode = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Currency code must be a 3-letter ISO 4217 code');

/** ISO 3166-1 alpha-2 country code. */
export const countryCode = z
  .string()
  .regex(/^[A-Z]{2}$/, 'Country code must be a 2-letter ISO 3166-1 alpha-2 code');
