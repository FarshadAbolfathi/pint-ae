/**
 * Derivations for amounts that the PINT calculation rules verify. Keeping the
 * arithmetic here (instead of asking callers to supply every total) means the
 * documents the builder produces satisfy `ibr-co-10`, `ibr-co-13`, `ibr-co-15`,
 * `ibr-co-16` and `ibr-147-ae` by construction. All arithmetic uses the exact
 * decimal helpers from `@pint-ae/core`.
 */
import { money, round, sum, type MoneyValue } from '@pint-ae/core';

/** A line reduced to the fields needed to compute its net amount. */
export interface LineAmountInput {
  quantity: string;
  priceAmount: string;
  baseQuantity: string;
  allowanceCharges: { isCharge: boolean; amount: string }[];
}

/**
 * Invoice line net amount (IBT-131), per `ibr-147-ae`:
 * quantity × (price / base quantity) + Σ charges − Σ allowances, rounded to 2dp.
 */
export function lineNetAmount(line: LineAmountInput): string {
  const unit = money(line.priceAmount).dividedBy(money(line.baseQuantity));
  const base = money(line.quantity).times(unit);
  const charges = sum(line.allowanceCharges.filter((a) => a.isCharge).map((a) => a.amount));
  const allowances = sum(line.allowanceCharges.filter((a) => !a.isCharge).map((a) => a.amount));
  return round(base.plus(charges).minus(allowances)).toString();
}

/** A tax-bearing element contributing to the VAT breakdown. */
export interface TaxableInput {
  /** Net amount that enters the breakdown (already rounded). */
  net: string;
  categoryId: string;
  /** Category rate as a percentage; absent is treated as 0. */
  percent?: string;
}

/** One computed VAT breakdown group. */
export interface TaxSubtotalResult {
  taxableAmount: string;
  taxAmount: string;
  /** `percent` is omitted for categories that carry no rate (e.g. Exempt). */
  category: { id: string; percent?: string };
}

function groupKey(categoryId: string, percent: string | undefined): string {
  return `${categoryId}|${percent ?? ''}`;
}

/**
 * Build the VAT breakdown (IBG-23) from the taxable contributions, grouped by
 * (category, rate). Tax amount for each group is taxable × rate / 100, rounded
 * to 2dp. A contribution with no percent keeps the rate absent in the output
 * (so Exempt breakdowns carry no rate, per `ibr-121-ae`); the tax amount is
 * then zero. Document-level allowances reduce, and charges increase, their
 * group's taxable amount.
 */
export function buildTaxSubtotals(contributions: readonly TaxableInput[]): TaxSubtotalResult[] {
  const groups = new Map<
    string,
    { categoryId: string; percent: string | undefined; taxable: MoneyValue }
  >();
  for (const c of contributions) {
    const key = groupKey(c.categoryId, c.percent);
    const existing = groups.get(key);
    if (existing) {
      existing.taxable = existing.taxable.plus(money(c.net));
    } else {
      groups.set(key, { categoryId: c.categoryId, percent: c.percent, taxable: money(c.net) });
    }
  }

  return [...groups.values()].map((g) => {
    const taxableAmount = round(g.taxable);
    const taxAmount =
      g.percent === undefined
        ? round(0)
        : round(taxableAmount.times(money(g.percent)).dividedBy(100));
    return {
      taxableAmount: taxableAmount.toString(),
      taxAmount: taxAmount.toString(),
      category: { id: g.categoryId, ...(g.percent !== undefined ? { percent: g.percent } : {}) },
    };
  });
}

/** Document monetary totals (IBG-22), per `ibr-co-10/13/15/16`. */
export interface TotalsResult {
  lineExtensionAmount: string;
  taxExclusiveAmount: string;
  taxInclusiveAmount: string;
  allowanceTotalAmount?: string;
  chargeTotalAmount?: string;
  payableAmount: string;
}

export interface TotalsInput {
  lineNets: readonly string[];
  documentAllowances: readonly string[];
  documentCharges: readonly string[];
  totalTax: string;
  prepaidAmount?: string;
  payableRoundingAmount?: string;
}

/** Compute the document monetary totals from line nets, document-level
 * allowances/charges and the total VAT. */
export function computeTotals(input: TotalsInput): TotalsResult {
  const lineExtension = round(sum(input.lineNets));
  const allowanceTotal = round(sum(input.documentAllowances));
  const chargeTotal = round(sum(input.documentCharges));
  const taxExclusive = round(lineExtension.minus(allowanceTotal).plus(chargeTotal));
  const taxInclusive = round(taxExclusive.plus(money(input.totalTax)));
  const prepaid = round(money(input.prepaidAmount ?? '0'));
  const rounding = round(money(input.payableRoundingAmount ?? '0'));
  const payable = round(taxInclusive.minus(prepaid).plus(rounding));

  return {
    lineExtensionAmount: lineExtension.toString(),
    taxExclusiveAmount: taxExclusive.toString(),
    taxInclusiveAmount: taxInclusive.toString(),
    ...(input.documentAllowances.length > 0
      ? { allowanceTotalAmount: allowanceTotal.toString() }
      : {}),
    ...(input.documentCharges.length > 0 ? { chargeTotalAmount: chargeTotal.toString() } : {}),
    payableAmount: payable.toString(),
  };
}
