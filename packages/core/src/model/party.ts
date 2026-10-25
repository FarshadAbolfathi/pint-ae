import { z } from 'zod';
import { postalAddressSchema } from './address.js';

/** A Peppol electronic address / participant identifier (UBL `cbc:EndpointID`). */
export const endpointSchema = z.object({
  /** The identifier value. */
  id: z.string().min(1),
  /** The identifier scheme (e.g. `0235` for the UAE TRN scheme). */
  schemeId: z.string().min(1),
});

export type Endpoint = z.infer<typeof endpointSchema>;

/**
 * A legal registration identifier (UBL `cac:PartyLegalEntity/cbc:CompanyID`),
 * such as a UAE passport number or trade-licence number, with its scheme.
 */
export const legalIdentifierSchema = z.object({
  id: z.string().min(1),
  schemeAgencyId: z.string().min(1).optional(),
  schemeAgencyName: z.string().min(1).optional(),
});

export type LegalIdentifier = z.infer<typeof legalIdentifierSchema>;

/**
 * A party to the invoice (seller or buyer). This is the generic PINT shape;
 * UAE-specific constraints (TRN format, mandatory fields) are enforced by the
 * `@pint-ae/ae` rule set rather than by the schema.
 */
export const partySchema = z.object({
  /** IBT-027 / IBT-044: registered legal name. */
  name: z.string().min(1),
  /** IBT-028 / IBT-045: trading name, if different from the legal name. */
  tradingName: z.string().min(1).optional(),
  /** Peppol endpoint identifier. */
  endpoint: endpointSchema.optional(),
  /**
   * IBT-031 / IBT-048: VAT identifier (the UAE TRN). Held in UBL under
   * `PartyTaxScheme` with tax scheme `VAT`.
   */
  vatIdentifier: z.string().min(1).optional(),
  /**
   * IBT-032: a tax registration identifier under a non-VAT scheme
   * (e.g. a UAE TIN).
   */
  taxIdentifier: z.string().min(1).optional(),
  /** Legal registration identifier (passport / trade licence / etc.). */
  legalIdentifier: legalIdentifierSchema.optional(),
  address: postalAddressSchema,
});

export type Party = z.infer<typeof partySchema>;
