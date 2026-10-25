/**
 * UAE VAT category codes and rate handling.
 *
 * Source: OpenPeppol PINT AE Billing v1.0.3,
 * `trn-invoice/codelist/Aligned-TaxCategoryCodes.gc` (see `spec/SOURCES.md`).
 *
 * Note: the genericode file stores the "Standard rate additional VAT" code
 * using a Greek capital Nu glyph (U+039D), but every Schematron assertion tests
 * against the ASCII letter `N` (U+004E). We treat ASCII `N` as canonical.
 */

/** The UAE-aligned VAT category codes (UNCL5305 subset). */
export const VAT_CATEGORY_CODES = {
  /** Standard rate (5%). */
  S: 'Standard rate',
  /** Exempt from tax. */
  E: 'Exempt from tax',
  /** Services outside scope of tax / not subject to tax. */
  O: 'Services outside scope of tax / Not subject to tax',
  /** VAT reverse charge. */
  AE: 'VAT Reverse Charge',
  /** Zero rated. */
  Z: 'Zero rated',
  /** Standard rate additional VAT. */
  N: 'Standard rate additional VAT',
} as const;

/** A UAE VAT category code. */
export type VatCategoryCode = keyof typeof VAT_CATEGORY_CODES;

/** Whether a string is a recognised UAE VAT category code. */
export function isVatCategoryCode(code: string): code is VatCategoryCode {
  return Object.prototype.hasOwnProperty.call(VAT_CATEGORY_CODES, code);
}

/** The UAE standard VAT rate, as a percentage. */
export const UAE_STANDARD_VAT_RATE = 5;

/**
 * Categories whose VAT rate must be zero. `ibr-120-ae` requires the rate of a
 * Zero-rated breakdown to equal 0; exempt, out-of-scope and reverse-charge
 * supplies carry no positive VAT rate either.
 */
export const ZERO_RATE_CATEGORIES: ReadonlySet<VatCategoryCode> = new Set<VatCategoryCode>([
  'Z',
  'E',
  'O',
  'AE',
]);

/** Whether a category is expected to carry a zero VAT rate. */
export function isZeroRateCategory(code: VatCategoryCode): boolean {
  return ZERO_RATE_CATEGORIES.has(code);
}
