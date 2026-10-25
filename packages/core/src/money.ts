/**
 * Money and rounding utilities.
 *
 * Amounts in e-invoices must never be represented with binary floating point:
 * `0.1 + 0.2 !== 0.3` would silently corrupt tax breakdowns and totals. We use
 * {@link https://mikemcl.github.io/decimal.js | decimal.js} for exact decimal
 * arithmetic. See `docs/adr/0003-money-representation.md` for the rationale.
 */
import { Decimal } from 'decimal.js';

/**
 * A decimal clone configured for invoice arithmetic:
 * - `ROUND_HALF_UP` matches the behaviour of the XPath `round()` function used
 *   throughout the PINT Schematron (e.g. `ibr-co-10`).
 * - 34 significant digits is far more than any realistic monetary value needs.
 */
export const Money = Decimal.clone({
  precision: 34,
  rounding: Decimal.ROUND_HALF_UP,
});

export type MoneyValue = InstanceType<typeof Money>;

/** Anything that can be interpreted as a monetary amount. */
export type MoneyInput = number | string | MoneyValue;

/** Create a {@link MoneyValue} from a number, string or existing decimal. */
export function money(value: MoneyInput): MoneyValue {
  return new Money(value);
}

/** Sum a list of monetary inputs. Returns 0 for an empty list. */
export function sum(values: readonly MoneyInput[]): MoneyValue {
  return values.reduce<MoneyValue>((acc, v) => acc.plus(new Money(v)), new Money(0));
}

/**
 * Round to a fixed number of decimal places (default 2, i.e. fils for AED)
 * using half-up rounding, matching the PINT Schematron calculation rules.
 */
export function round(value: MoneyInput, decimalPlaces = 2): MoneyValue {
  return new Money(value).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
}

/**
 * Compare two amounts for equality after rounding both to `decimalPlaces`.
 * Used by calculation rules where the spec compares rounded sums.
 */
export function equals(a: MoneyInput, b: MoneyInput, decimalPlaces = 2): boolean {
  return round(a, decimalPlaces).equals(round(b, decimalPlaces));
}

/**
 * Whether two amounts are within an absolute tolerance ("slack") of each other.
 * Several PINT breakdown rules allow a 0.02 rounding tolerance between a stated
 * amount and the recomputed sum (see e.g. `ibr-102-ae`'s `u:slack`).
 */
export function withinSlack(a: MoneyInput, b: MoneyInput, slack: MoneyInput = '0.02'): boolean {
  return new Money(a).minus(new Money(b)).abs().lessThanOrEqualTo(new Money(slack));
}

/**
 * Format an amount as a fixed-decimal string for UBL serialisation
 * (default 2 decimal places, e.g. `"1050.00"`).
 */
export function toAmountString(value: MoneyInput, decimalPlaces = 2): string {
  return round(value, decimalPlaces).toFixed(decimalPlaces);
}

export { Decimal };
