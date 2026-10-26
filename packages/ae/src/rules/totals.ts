import { equals, money, round, sum, type Document, type Rule } from '@pint-ae/core';

/**
 * ibr-co-10 — Sum of Invoice line net amount (IBT-106) = Σ Invoice line net
 * amount (IBT-131).
 */
export const ibrCo10: Rule<Document> = {
  id: 'ibr-co-10',
  severity: 'fatal',
  text: 'Sum of Invoice line net amount (ibt-106) = Σ Invoice line net amount (ibt-131).',
  check(doc) {
    const expected = round(sum(doc.lines.map((l) => l.lineExtensionAmount)));
    return equals(doc.totals.lineExtensionAmount, expected)
      ? []
      : [{ path: 'totals.lineExtensionAmount' }];
  },
};

/**
 * ibr-co-11 — Sum of allowances on document level (IBT-107) = Σ document-level
 * allowance amount (IBT-092). The total may be omitted only when there are no
 * document-level allowances.
 */
export const ibrCo11: Rule<Document> = {
  id: 'ibr-co-11',
  severity: 'fatal',
  text: 'Sum of allowances on document level (ibt-107) = Σ Document level allowance amount (ibt-092).',
  check(doc) {
    const allowances = doc.allowanceCharges.filter((ac) => !ac.isCharge);
    const { allowanceTotalAmount } = doc.totals;
    if (allowanceTotalAmount === undefined) {
      return allowances.length === 0 ? [] : [{ path: 'totals.allowanceTotalAmount' }];
    }
    const expected = round(sum(allowances.map((ac) => ac.amount)));
    return equals(allowanceTotalAmount, expected) ? [] : [{ path: 'totals.allowanceTotalAmount' }];
  },
};

/**
 * ibr-co-12 — Sum of charges on document level (IBT-108) = Σ document-level
 * charge amount (IBT-099). The total may be omitted only when there are no
 * document-level charges.
 */
export const ibrCo12: Rule<Document> = {
  id: 'ibr-co-12',
  severity: 'fatal',
  text: 'Sum of charges on document level (ibt-108) = Σ Document level charge amount (ibt-099).',
  check(doc) {
    const charges = doc.allowanceCharges.filter((ac) => ac.isCharge);
    const { chargeTotalAmount } = doc.totals;
    if (chargeTotalAmount === undefined) {
      return charges.length === 0 ? [] : [{ path: 'totals.chargeTotalAmount' }];
    }
    const expected = round(sum(charges.map((ac) => ac.amount)));
    return equals(chargeTotalAmount, expected) ? [] : [{ path: 'totals.chargeTotalAmount' }];
  },
};

/**
 * ibr-co-13 — Invoice total amount without Tax (IBT-109) = Σ line net amount
 * (IBT-106) − allowances on document level (IBT-107) + charges on document
 * level (IBT-108).
 */
export const ibrCo13: Rule<Document> = {
  id: 'ibr-co-13',
  severity: 'fatal',
  text: 'Invoice total amount without Tax (ibt-109) = Σ Invoice line net amount (ibt-131) - Sum of allowances on document level (ibt-107) + Sum of charges on document level (ibt-108).',
  check(doc) {
    const { lineExtensionAmount, allowanceTotalAmount, chargeTotalAmount, taxExclusiveAmount } =
      doc.totals;
    const expected = round(
      money(lineExtensionAmount)
        .minus(money(allowanceTotalAmount ?? '0'))
        .plus(money(chargeTotalAmount ?? '0')),
    );
    return equals(taxExclusiveAmount, expected) ? [] : [{ path: 'totals.taxExclusiveAmount' }];
  },
};

/**
 * ibr-co-15 — Invoice total amount with Tax (IBT-112) = Invoice total amount
 * without Tax (IBT-109) + Invoice total Tax amount (IBT-110).
 */
export const ibrCo15: Rule<Document> = {
  id: 'ibr-co-15',
  severity: 'fatal',
  text: 'Invoice total amount with Tax (ibt-112) = Invoice total amount without Tax (ibt-109) + Invoice total Tax amount (ibt-110).',
  check(doc) {
    const expected = round(
      money(doc.totals.taxExclusiveAmount).plus(money(doc.taxTotal.taxAmount)),
    );
    return equals(doc.totals.taxInclusiveAmount, expected)
      ? []
      : [{ path: 'totals.taxInclusiveAmount' }];
  },
};

/**
 * ibr-co-16 — Amount due for payment (IBT-115) = Invoice total amount with Tax
 * (IBT-112) − Paid amount (IBT-113) + Rounding amount (IBT-114).
 */
export const ibrCo16: Rule<Document> = {
  id: 'ibr-co-16',
  severity: 'fatal',
  text: 'Amount due for payment (ibt-115) = Invoice total amount with Tax (ibt-112) - Paid amount (ibt-113) + Rounding amount (ibt-114).',
  check(doc) {
    const { taxInclusiveAmount, prepaidAmount, payableRoundingAmount, payableAmount } = doc.totals;
    const expected = round(
      money(taxInclusiveAmount)
        .minus(money(prepaidAmount ?? '0'))
        .plus(money(payableRoundingAmount ?? '0')),
    );
    return equals(payableAmount, expected) ? [] : [{ path: 'totals.payableAmount' }];
  },
};

/**
 * ibr-co-14 — Invoice total VAT amount (IBT-110) = Σ VAT category tax amount
 * (IBT-117) across the VAT breakdown.
 */
export const ibrCo14: Rule<Document> = {
  id: 'ibr-co-14',
  severity: 'fatal',
  text: 'Invoice total Tax amount (ibt-110) = Σ Tax category tax amount (ibt-117).',
  check(doc) {
    if (doc.taxTotal.subtotals.length === 0) return [];
    const expected = round(sum(doc.taxTotal.subtotals.map((s) => s.taxAmount)));
    return equals(doc.taxTotal.taxAmount, expected) ? [] : [{ path: 'taxTotal.taxAmount' }];
  },
};
