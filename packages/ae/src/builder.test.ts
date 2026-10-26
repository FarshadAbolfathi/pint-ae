import { describe, expect, it } from 'vitest';
import { creditNote, invoice } from './builder.js';

const seller = {
  name: 'Supplier Legal Name',
  vatIdentifier: '100000000000003',
  address: { countrySubentity: 'DXB', country: 'AE' },
};
const buyer = {
  name: 'Buyer Legal Name',
  vatIdentifier: '134567890123003',
  address: { countrySubentity: 'DXB', country: 'AE' },
};

describe('DocumentBuilder', () => {
  it('builds a valid invoice and computes totals', () => {
    const result = invoice()
      .withMeta({ id: 'INV-1', issueDate: '2025-01-30' })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 100,
        unitCode: 'H87',
        price: { amount: 10 },
        item: { name: 'Item', taxCategory: { id: 'S', percent: 5 } },
      })
      .build();

    expect(result.ok).toBe(true);
    expect(result.document?.totals.lineExtensionAmount).toBe('1000');
    expect(result.document?.totals.taxInclusiveAmount).toBe('1050');
    expect(result.document?.taxTotal.taxAmount).toBe('50');
    expect(result.document?.lines[0]?.id).toBe('1');
  });

  it('accepts a bare number as the unit price', () => {
    const inv = invoice()
      .withMeta({ id: 'INV-1', issueDate: '2025-01-30' })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 2,
        unitCode: 'H87',
        price: 25,
        item: { name: 'Item', taxCategory: { id: 'Z', percent: 0 } },
      })
      .buildOrThrow();

    expect(inv.lines[0]?.lineExtensionAmount).toBe('50');
    expect(inv.taxTotal.taxAmount).toBe('0');
  });

  it('returns a schema report (not a throw) for invalid input', () => {
    const result = invoice()
      // missing id and issueDate
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 1,
        unitCode: 'H87',
        price: 10,
        item: { name: 'Item', taxCategory: { id: 'S', percent: 5 } },
      })
      .build();

    expect(result.ok).toBe(false);
    expect(result.document).toBeNull();
    expect(result.report.errors.some((m) => m.ruleId === 'schema')).toBe(true);
  });

  it('buildOrThrow throws with rule details for an invalid document', () => {
    const builder = invoice()
      .withMeta({ id: 'INV-1', issueDate: '2025-01-30' })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 1,
        unitCode: 'H87',
        price: 10,
        // Overriding the net with a wrong value trips ibr-147-ae.
        lineExtensionAmount: 999,
        item: { name: 'Item', taxCategory: { id: 'S', percent: 5 } },
      });
    expect(() => builder.buildOrThrow()).toThrow(/ibr-147-ae/);
  });

  it('builds a credit note with the default type code', () => {
    const cn = creditNote()
      .withMeta({ id: 'CN-1', issueDate: '2025-02-01' })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 1,
        unitCode: 'H87',
        price: 10,
        item: { name: 'Item', taxCategory: { id: 'S', percent: 5 } },
      })
      .buildOrThrow();

    expect(cn.kind).toBe('creditNote');
    expect(cn.creditNoteTypeCode).toBe('381');
  });

  it('applies prepaid and rounding amounts to the payable total', () => {
    const inv = invoice()
      .withMeta({
        id: 'INV-1',
        issueDate: '2025-01-30',
        prepaidAmount: 50,
        payableRoundingAmount: 0.5,
      })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 100,
        unitCode: 'H87',
        price: 10,
        item: { name: 'Item', taxCategory: { id: 'S', percent: 5 } },
      })
      .buildOrThrow();

    // 1050 - 50 + 0.5
    expect(inv.totals.payableAmount).toBe('1000.5');
  });
});
