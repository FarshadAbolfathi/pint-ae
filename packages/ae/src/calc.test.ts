import { describe, expect, it } from 'vitest';
import { buildTaxSubtotals, computeTotals, lineNetAmount } from './calc.js';

describe('lineNetAmount (ibr-147-ae)', () => {
  it('computes quantity × unit price', () => {
    expect(
      lineNetAmount({
        quantity: '100',
        priceAmount: '10',
        baseQuantity: '1',
        allowanceCharges: [],
      }),
    ).toBe('1000');
  });

  it('respects the price base quantity', () => {
    expect(
      lineNetAmount({ quantity: '10', priceAmount: '12', baseQuantity: '4', allowanceCharges: [] }),
    ).toBe('30');
  });

  it('adds charges and subtracts allowances, rounded to 2dp', () => {
    expect(
      lineNetAmount({
        quantity: '3',
        priceAmount: '9.99',
        baseQuantity: '1',
        allowanceCharges: [
          { isCharge: true, amount: '1.005' },
          { isCharge: false, amount: '0.50' },
        ],
      }),
    ).toBe('30.48'); // 29.97 + 1.005 - 0.50 = 30.475 -> 30.48
  });
});

describe('buildTaxSubtotals', () => {
  it('groups by category and rate and computes tax', () => {
    const subtotals = buildTaxSubtotals([
      { net: '1000', categoryId: 'S', percent: '5' },
      { net: '500', categoryId: 'S', percent: '5' },
      { net: '200', categoryId: 'Z', percent: '0' },
    ]);
    expect(subtotals).toEqual([
      { taxableAmount: '1500', taxAmount: '75', category: { id: 'S', percent: '5' } },
      { taxableAmount: '200', taxAmount: '0', category: { id: 'Z', percent: '0' } },
    ]);
  });

  it('omits the rate and charges no tax when the category has no percent', () => {
    const [subtotal] = buildTaxSubtotals([{ net: '100', categoryId: 'E' }]);
    expect(subtotal).toEqual({
      taxableAmount: '100',
      taxAmount: '0',
      category: { id: 'E' },
    });
  });
});

describe('computeTotals (ibr-co-10/13/15/16)', () => {
  it('derives totals without document allowances/charges', () => {
    expect(
      computeTotals({
        lineNets: ['1000'],
        documentAllowances: [],
        documentCharges: [],
        totalTax: '50',
      }),
    ).toEqual({
      lineExtensionAmount: '1000',
      taxExclusiveAmount: '1000',
      taxInclusiveAmount: '1050',
      payableAmount: '1050',
    });
  });

  it('applies document allowances, charges, prepaid and rounding', () => {
    expect(
      computeTotals({
        lineNets: ['1000', '500'],
        documentAllowances: ['100'],
        documentCharges: ['50'],
        totalTax: '72.5',
        prepaidAmount: '200',
        payableRoundingAmount: '0.5',
      }),
    ).toEqual({
      lineExtensionAmount: '1500',
      allowanceTotalAmount: '100',
      chargeTotalAmount: '50',
      taxExclusiveAmount: '1450', // 1500 - 100 + 50
      taxInclusiveAmount: '1522.5', // 1450 + 72.5
      payableAmount: '1323', // 1522.5 - 200 + 0.5
    });
  });
});
