import { z } from 'zod';
import { countryCode } from './common.js';

/** A postal address (UBL `cac:PostalAddress`). */
export const postalAddressSchema = z.object({
  /** IBT-035 / IBT-050: street name. */
  street: z.string().min(1).optional(),
  /** IBT-036 / IBT-051: additional street name. */
  additionalStreet: z.string().min(1).optional(),
  /** IBT-037 / IBT-052: city. */
  city: z.string().min(1).optional(),
  /** IBT-038 / IBT-053: postal zone / PO box. */
  postalZone: z.string().min(1).optional(),
  /** IBT-039 / IBT-054: country subdivision (e.g. emirate code `DXB`). */
  countrySubentity: z.string().min(1).optional(),
  /** IBT-040 / IBT-055: country code (mandatory in UBL). */
  country: countryCode,
});

export type PostalAddress = z.infer<typeof postalAddressSchema>;
