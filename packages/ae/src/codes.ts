/**
 * UAE-specific code lists used by the rule set.
 *
 * Source: OpenPeppol PINT AE Billing v1.0.3 Schematron (see `spec/SOURCES.md`).
 */

/**
 * Country subdivision (emirate) codes accepted when the country is `AE`, per
 * rule `ibr-128-ae`: AUH, DXB, SHJ, UAQ, FUJ, AJM, RAK.
 */
export const EMIRATE_SUBDIVISION_CODES: ReadonlySet<string> = new Set([
  'AUH', // Abu Dhabi
  'DXB', // Dubai
  'SHJ', // Sharjah
  'UAQ', // Umm Al Quwain
  'FUJ', // Fujairah
  'AJM', // Ajman
  'RAK', // Ras Al Khaimah
]);

/** Whether a country subdivision code is a valid UAE emirate code. */
export function isEmirateSubdivision(code: string): boolean {
  return EMIRATE_SUBDIVISION_CODES.has(code);
}
