import type { Document, Invoice } from '@pint-ae/core';
import { describe, expect, it } from 'vitest';
import { invoice } from '../builder.js';
import {
  alignedIbrp001ae,
  alignedIbrp002ae,
  ibr073,
  ibrCl04,
  ibrCl14,
  ibrCl23,
  isStrictDate,
} from './codelist.js';

const seller = {
  name: 'Supplier',
  vatIdentifier: '100000000000003',
  address: { countrySubentity: 'DXB', country: 'AE' },
};
const buyer = {
  name: 'Buyer',
  vatIdentifier: '134567890123003',
  address: { countrySubentity: 'AUH', country: 'AE' },
};

function validInvoice(): Invoice {
  return invoice()
    .withMeta({ id: 'INV-1', issueDate: '2025-01-30' })
    .seller(seller)
    .buyer(buyer)
    .addLine({
      quantity: 100,
      unitCode: 'H87',
      price: 10,
      item: { name: 'Widget', description: 'Widget', taxCategory: { id: 'S', percent: 5 } },
    })
    .buildOrThrow();
}

const clone = (d: Document): Document => structuredClone(d);

describe('isStrictDate', () => {
  it('accepts real dates', () => {
    expect(isStrictDate('2025-01-30')).toBe(true);
    expect(isStrictDate('2024-02-29')).toBe(true); // leap year
  });
  it('rejects impossible or malformed dates', () => {
    expect(isStrictDate('2025-13-45')).toBe(false);
    expect(isStrictDate('2025-02-30')).toBe(false);
    expect(isStrictDate('2025-00-10')).toBe(false);
    expect(isStrictDate('2023-02-29')).toBe(false); // non-leap
    expect(isStrictDate('2025-1-1')).toBe(false);
    expect(isStrictDate('not-a-date')).toBe(false);
  });
});

describe('ibr-cl-04 (currency)', () => {
  it('passes for AED', () => expect(ibrCl04.check(validInvoice())).toEqual([]));
  it('fails for a non-ISO-4217 code', () => {
    const d = clone(validInvoice());
    d.documentCurrencyCode = 'XYZ';
    expect(ibrCl04.check(d)).toEqual([{ path: 'documentCurrencyCode' }]);
  });
  it('checks the tax currency too', () => {
    const d = clone(validInvoice());
    d.taxCurrencyCode = 'ZZZ';
    expect(ibrCl04.check(d)).toEqual([{ path: 'taxCurrencyCode' }]);
  });
});

describe('ibr-cl-14 (country)', () => {
  it('passes for AE', () => expect(ibrCl14.check(validInvoice())).toEqual([]));
  it('fails for an unknown country code', () => {
    const d = clone(validInvoice());
    d.buyer.address.country = 'ZZ';
    expect(ibrCl14.check(d)).toEqual([{ path: 'buyer.address.country' }]);
  });
});

describe('ibr-cl-23 (unit code)', () => {
  it('passes for H87', () => expect(ibrCl23.check(validInvoice())).toEqual([]));
  it('fails for an unknown unit code', () => {
    const d = clone(validInvoice());
    d.lines[0]!.unitCode = 'XXX';
    expect(ibrCl23.check(d)).toEqual([{ path: 'lines[0].unitCode' }]);
  });
});

describe('ibr-073 (strict date)', () => {
  it('passes for valid dates', () => expect(ibr073.check(validInvoice())).toEqual([]));
  it('fails for an impossible issue date', () => {
    const d = clone(validInvoice());
    d.issueDate = '2025-13-45';
    expect(ibr073.check(d)).toEqual([{ path: 'issueDate' }]);
  });
});

describe('aligned-ibrp-001-ae (customization id)', () => {
  it('passes for the PINT AE billing id', () =>
    expect(alignedIbrp001ae.check(validInvoice())).toEqual([]));
  it('fails for a wrong customization id', () => {
    const d = clone(validInvoice());
    d.customizationId = 'foo';
    expect(alignedIbrp001ae.check(d)).toEqual([{ path: 'customizationId' }]);
  });
});

describe('aligned-ibrp-002-ae (profile id)', () => {
  it('passes for the Peppol billing profile', () =>
    expect(alignedIbrp002ae.check(validInvoice())).toEqual([]));
  it('fails for a wrong profile id', () => {
    const d = clone(validInvoice());
    d.profileId = 'foo';
    expect(alignedIbrp002ae.check(d)).toEqual([{ path: 'profileId' }]);
  });
});
