import { money, type Document, type Rule } from '@pint-ae/core';

/**
 * ibr-120-ae — In a VAT breakdown (IBG-23) where the VAT category code is
 * 'Zero Rated' (Z), the VAT category rate (IBT-119) shall equal 0.
 */
export const ibr120ae: Rule<Document> = {
  id: 'ibr-120-ae',
  severity: 'fatal',
  text: "In a VAT breakdown (IBG-23) where VAT category code (IBT-118) is 'Zero Rated', VAT category Rate (IBT-119) shall equal to 0.",
  check(doc) {
    return doc.taxTotal.subtotals
      .map((s, index) => ({ s, index }))
      .filter(({ s }) => s.category.id === 'Z')
      .filter(({ s }) => s.category.percent === undefined || !money(s.category.percent).isZero())
      .map(({ index }) => ({ path: `taxTotal.subtotals[${index}].category.percent` }));
  },
};

/**
 * ibr-121-ae — In a VAT breakdown (IBG-23) where the VAT category code is
 * 'Exempt from VAT' (E), the VAT category rate (IBT-119) shall not be provided.
 */
export const ibr121ae: Rule<Document> = {
  id: 'ibr-121-ae',
  severity: 'fatal',
  text: "In a VAT breakdown (IBG-23) where VAT category code (IBT-118) is 'Exempt from VAT', VAT category Rate (IBT-119) shall not be provided.",
  check(doc) {
    return doc.taxTotal.subtotals
      .map((s, index) => ({ s, index }))
      .filter(({ s }) => s.category.id === 'E' && s.category.percent !== undefined)
      .map(({ index }) => ({ path: `taxTotal.subtotals[${index}].category.percent` }));
  },
};
