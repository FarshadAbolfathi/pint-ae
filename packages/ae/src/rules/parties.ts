import type { Document, Party, Rule } from '@pint-ae/core';
import { isEmirateSubdivision } from '../codes.js';

/**
 * ibr-128-ae — When the country code (IBT-040, IBT-055, …) is `AE`, the country
 * subdivision (IBT-039, IBT-054, …) must be one of the seven emirate codes
 * (AUH, DXB, SHJ, UAQ, FUJ, AJM, RAK).
 */
export const ibr128ae: Rule<Document> = {
  id: 'ibr-128-ae',
  severity: 'fatal',
  text: 'When Country code (IBT-040, IBT-055, IBT-069, IBT-080) is AE, then country subdivision (IBT-039, IBT-054, IBT-068, IBT-079) should be one among one of these (AUH, DXB, SHJ, UAQ, FUJ, AJM, RAK).',
  check(doc) {
    const parties: [string, Party][] = [
      ['seller', doc.seller],
      ['buyer', doc.buyer],
    ];
    return parties
      .filter(([, party]) => party.address.country === 'AE')
      .filter(
        ([, party]) =>
          party.address.countrySubentity === undefined ||
          !isEmirateSubdivision(party.address.countrySubentity),
      )
      .map(([role]) => ({ path: `${role}.address.countrySubentity` }));
  },
};
