/**
 * Native code-list and format rules. The code lists are generated from the
 * vendored genericode (`.gc`) files (see `scripts/build-codelists.mjs`) and
 * never hand-typed. These give the `fast` (native) path coverage of the most
 * common invalid documents, matching the official Schematron rule ids.
 */
import {
  PEPPOL_BILLING_PROFILE_ID,
  PEPPOL_SELFBILLING_PROFILE_ID,
  PINT_AE_BILLING_CUSTOMIZATION_ID,
  PINT_AE_SELFBILLING_CUSTOMIZATION_ID,
  type Document,
  type Rule,
} from '@pint-ae/core';
import currencyCodes from '../codelists/generated/currency.js';
import countryCodes from '../codelists/generated/country.js';
import unitCodes from '../codelists/generated/unit.js';

const currencySet = new Set(currencyCodes);
const countrySet = new Set(countryCodes);
const unitSet = new Set(unitCodes);

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** True for a `YYYY-MM-DD` string that is also a real calendar date. */
export function isStrictDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const max = month === 2 && !isLeap ? 28 : DAYS_IN_MONTH[month - 1]!;
  return day <= max;
}

/** ibr-cl-04 — Invoice currency code (IBT-005) must be a valid ISO 4217 code. */
export const ibrCl04: Rule<Document> = {
  id: 'ibr-cl-04',
  severity: 'fatal',
  text: 'Invoice currency code (ibt-005) MUST be coded using ISO code list 4217 alpha-3.',
  check(doc) {
    const failures = [];
    if (!currencySet.has(doc.documentCurrencyCode)) failures.push({ path: 'documentCurrencyCode' });
    if (doc.taxCurrencyCode !== undefined && !currencySet.has(doc.taxCurrencyCode))
      failures.push({ path: 'taxCurrencyCode' });
    return failures;
  },
};

/** ibr-cl-14 — Country codes (IBT-040, IBT-055, …) must be ISO 3166-1 codes. */
export const ibrCl14: Rule<Document> = {
  id: 'ibr-cl-14',
  severity: 'fatal',
  text: 'Country codes in an invoice (ibt-040, ibt-055, ibt-069, ibt-080, ibt-175) MUST be coded using ISO code list 3166-1.',
  check(doc) {
    return (
      [
        ['seller', doc.seller.address.country],
        ['buyer', doc.buyer.address.country],
      ] as const
    )
      .filter(([, code]) => !countrySet.has(code))
      .map(([role]) => ({ path: `${role}.address.country` }));
  },
};

/** ibr-cl-23 — Unit codes (IBT-130, IBT-150) must be UN/ECE Rec 20/21 codes. */
export const ibrCl23: Rule<Document> = {
  id: 'ibr-cl-23',
  severity: 'fatal',
  text: 'Unit code (ibt-130, ibt-150) MUST be coded according to the UN/ECE Recommendation 20 with Rec 21.',
  check(doc) {
    return doc.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => !unitSet.has(line.unitCode))
      .map(({ index }) => ({ path: `lines[${index}].unitCode` }));
  },
};

/** ibr-073 — Dates (IBT-002, IBT-009, …) must be a valid `YYYY-MM-DD` date. */
export const ibr073: Rule<Document> = {
  id: 'ibr-073',
  severity: 'fatal',
  text: 'A date MUST be formatted YYYY-MM-DD and be a valid calendar date (ibt-002, ibt-007, ibt-009, ...).',
  check(doc) {
    const dates: [string, string | undefined][] = [
      ['issueDate', doc.issueDate],
      ['dueDate', doc.dueDate],
    ];
    return dates
      .filter(([, value]) => value !== undefined && !isStrictDate(value))
      .map(([path]) => ({ path }));
  },
};

/** aligned-ibrp-001-ae — CustomizationID (IBT-024) must be the PINT AE id. */
export const alignedIbrp001ae: Rule<Document> = {
  id: 'aligned-ibrp-001-ae',
  severity: 'fatal',
  text: "Specification identifier (ibt-024) MUST start with the value 'urn:peppol:pint:billing-1@ae-1' or 'urn:peppol:pint:selfbilling-1@ae-1'.",
  check(doc) {
    const ok =
      doc.customizationId.startsWith(PINT_AE_BILLING_CUSTOMIZATION_ID) ||
      doc.customizationId.startsWith(PINT_AE_SELFBILLING_CUSTOMIZATION_ID);
    return ok ? [] : [{ path: 'customizationId' }];
  },
};

/** aligned-ibrp-002-ae — ProfileID (IBT-023) must be the Peppol billing id. */
export const alignedIbrp002ae: Rule<Document> = {
  id: 'aligned-ibrp-002-ae',
  severity: 'fatal',
  text: "Business process (ibt-023) MUST be in the format 'urn:peppol:bis:billing' or 'urn:peppol:bis:selfbilling'.",
  check(doc) {
    const ok =
      doc.profileId === PEPPOL_BILLING_PROFILE_ID ||
      doc.profileId === PEPPOL_SELFBILLING_PROFILE_ID;
    return ok ? [] : [{ path: 'profileId' }];
  },
};
