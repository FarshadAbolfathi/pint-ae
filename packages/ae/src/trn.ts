/**
 * UAE Tax Registration Number (TRN) / VAT identifier validation.
 *
 * Rule `ibr-132-ae` (PINT AE Billing v1.0.3): the VAT identifier
 * [IBT-031, IBT-048, IBT-063, BTAE-14] "should be TRN [VAT registration number]
 * and must be 15 alphanumeric digits, starting with 1, ending with 03".
 *
 * Rule `ibr-148-ae`: the Seller TIN (IBT-032) under a non-VAT scheme "must be
 * 10 numeric digits and should be of the format 1XXXXXXXXXX".
 *
 * See `spec/SOURCES.md`.
 */

/** The official TRN format per `ibr-132-ae`: 15 digits, starts `1`, ends `03`. */
export const TRN_PATTERN = /^1\d{12}03$/;

/** The official TIN format per `ibr-148-ae`: 10 digits, starts `1`. */
export const TIN_PATTERN = /^1\d{9}$/;

/**
 * Whether a value is a validly-formatted UAE TRN (VAT identifier) per
 * `ibr-132-ae`. This checks format only; it does not verify registration with
 * the FTA.
 */
export function isValidTrn(value: string): boolean {
  return TRN_PATTERN.test(value);
}

/** Whether a value is a validly-formatted UAE TIN per `ibr-148-ae`. */
export function isValidTin(value: string): boolean {
  return TIN_PATTERN.test(value);
}
