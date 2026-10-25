import {
  equals,
  money,
  round,
  type AllowanceCharge,
  type Document,
  type Rule,
} from '@pint-ae/core';

/** All allowances/charges in the document, with a path to each. */
function allAllowanceCharges(doc: Document): { ac: AllowanceCharge; path: string }[] {
  const result: { ac: AllowanceCharge; path: string }[] = [];
  doc.allowanceCharges.forEach((ac, i) => result.push({ ac, path: `allowanceCharges[${i}]` }));
  doc.lines.forEach((line, li) =>
    line.allowanceCharges.forEach((ac, ai) =>
      result.push({ ac, path: `lines[${li}].allowanceCharges[${ai}]` }),
    ),
  );
  return result;
}

/** amount == round(baseAmount × percent / 100), checked only when both exist. */
function amountMatchesPercentage(ac: AllowanceCharge): boolean {
  if (ac.baseAmount === undefined || ac.percent === undefined) return true;
  const expected = round(money(ac.baseAmount).times(money(ac.percent)).dividedBy(100));
  return equals(ac.amount, expected);
}

/**
 * ibr-131-ae — Allowance amount (IBT-092, IBT-136) must equal
 * base amount × percentage / 100, when base amount and percentage exist.
 */
export const ibr131ae: Rule<Document> = {
  id: 'ibr-131-ae',
  severity: 'fatal',
  text: 'Allowance amount (IBT-092, IBT-136) must equal base amount (IBT-093, IBT-137) * percentage (IBT-094, IBT-138) /100 if base amount and percentage exists.',
  check(doc) {
    return allAllowanceCharges(doc)
      .filter(({ ac }) => !ac.isCharge && !amountMatchesPercentage(ac))
      .map(({ path }) => ({ path: `${path}.amount` }));
  },
};

/**
 * ibr-146-ae — Charge amount (IBT-099, IBT-141) must equal
 * base amount × percentage / 100, when base amount and percentage exist.
 */
export const ibr146ae: Rule<Document> = {
  id: 'ibr-146-ae',
  severity: 'fatal',
  text: 'Charge amount (IBT-099, IBT-141) must equal base amount (IBT-100, IBT-142) * percentage (IBT-101, IBT-143) /100 if base amount and percentage exists.',
  check(doc) {
    return allAllowanceCharges(doc)
      .filter(({ ac }) => ac.isCharge && !amountMatchesPercentage(ac))
      .map(({ path }) => ({ path: `${path}.amount` }));
  },
};
