import { equals, type Document, type Rule } from '@pint-ae/core';
import { lineNetAmount } from '../calc.js';

/**
 * ibr-147-ae — Invoice line net amount (IBT-131) MUST equal
 * quantity × (item net price / base quantity) + Σ line charges − Σ line allowances.
 */
export const ibr147ae: Rule<Document> = {
  id: 'ibr-147-ae',
  severity: 'fatal',
  text: 'Invoice line net amount (IBT-131) MUST equal (Invoiced quantity (IBT-129) * (Item net price (IBT-146)/item price base quantity (IBT-149)) + Sum of invoice line charge amount (IBT-141) - sum of invoice line allowance amount (IBT-136).',
  check(doc) {
    return doc.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => {
        const expected = lineNetAmount({
          quantity: line.quantity,
          priceAmount: line.price.priceAmount,
          baseQuantity: line.price.baseQuantity,
          allowanceCharges: line.allowanceCharges.map((a) => ({
            isCharge: a.isCharge,
            amount: a.amount,
          })),
        });
        return !equals(line.lineExtensionAmount, expected);
      })
      .map(({ index }) => ({ path: `lines[${index}].lineExtensionAmount` }));
  },
};
