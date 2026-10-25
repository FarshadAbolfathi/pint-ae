import type { Document, Party, Rule } from '@pint-ae/core';
import { isValidTrn } from '../trn.js';

/**
 * ibr-132-ae — VAT identifier [IBT-031, IBT-048, IBT-063, BTAE-14] should be a
 * TRN: 15 digits, starting with 1, ending with 03.
 */
export const ibr132ae: Rule<Document> = {
  id: 'ibr-132-ae',
  severity: 'fatal',
  text: 'VAT identifier [IBT-031, IBT-048, IBT-063, BTAE-14] should be TRN [VAT registration number] and must be 15 alphanumeric digits, starting with 1, ending with 03.',
  check(doc) {
    const parties: [string, Party][] = [
      ['seller', doc.seller],
      ['buyer', doc.buyer],
    ];
    return parties
      .filter(([, party]) => party.vatIdentifier !== undefined)
      .filter(([, party]) => !isValidTrn(party.vatIdentifier as string))
      .map(([role]) => ({ path: `${role}.vatIdentifier` }));
  },
};
