import type { Document, Invoice } from '@pint-ae/core';
import { describe, expect, it } from 'vitest';
import { invoice } from '../builder.js';
import { ibr131ae, ibr146ae } from './allowances.js';
import { ibr147ae } from './lines.js';
import { AE_RULES, validateDocument } from './index.js';
import { ibrCo10, ibrCo13, ibrCo15, ibrCo16 } from './totals.js';
import { ibr132ae } from './trn.js';

const seller = {
  name: 'Supplier Legal Name',
  vatIdentifier: '100000000000003',
  address: { country: 'AE' },
};
const buyer = {
  name: 'Buyer Legal Name',
  vatIdentifier: '134567890123003',
  address: { country: 'AE' },
};

/** A fully-consistent invoice (totals computed by the builder). */
function validInvoice(): Invoice {
  return invoice()
    .withMeta({ id: 'INV-1', issueDate: '2025-01-30' })
    .seller(seller)
    .buyer(buyer)
    .addLine({
      quantity: 100,
      unitCode: 'H87',
      price: { amount: 10 },
      item: { name: 'Item', taxCategory: { id: 'S', percent: 5 } },
    })
    .buildOrThrow();
}

/** An invoice carrying a document-level allowance and charge. */
function invoiceWithAllowanceCharge(): Invoice {
  return invoice()
    .withMeta({ id: 'INV-2', issueDate: '2025-01-30' })
    .seller(seller)
    .buyer(buyer)
    .addLine({
      quantity: 100,
      unitCode: 'H87',
      price: { amount: 10 },
      item: { name: 'Item', taxCategory: { id: 'S', percent: 5 } },
    })
    .addAllowanceCharge({
      isCharge: false,
      amount: 10,
      baseAmount: 100,
      percent: 10,
      taxCategory: { id: 'S', percent: 5 },
    })
    .addAllowanceCharge({
      isCharge: true,
      amount: 20,
      baseAmount: 100,
      percent: 20,
      taxCategory: { id: 'S', percent: 5 },
    })
    .buildOrThrow();
}

const clone = (doc: Document): Document => structuredClone(doc);

describe('ibr-132-ae (TRN format)', () => {
  it('passes for valid seller and buyer TRNs', () => {
    expect(ibr132ae.check(validInvoice())).toEqual([]);
  });

  it('fails and locates each invalid TRN', () => {
    const doc = clone(validInvoice());
    doc.seller.vatIdentifier = '200000000000003';
    expect(ibr132ae.check(doc)).toEqual([{ path: 'seller.vatIdentifier' }]);
  });

  it('skips parties without a VAT identifier', () => {
    const doc = clone(validInvoice());
    delete doc.seller.vatIdentifier;
    delete doc.buyer.vatIdentifier;
    expect(ibr132ae.check(doc)).toEqual([]);
  });
});

describe('ibr-147-ae (line net amount)', () => {
  it('passes when the line net matches the computed amount', () => {
    expect(ibr147ae.check(validInvoice())).toEqual([]);
  });

  it('fails when the stated line net is wrong', () => {
    const doc = clone(validInvoice());
    doc.lines[0]!.lineExtensionAmount = '999';
    expect(ibr147ae.check(doc)).toEqual([{ path: 'lines[0].lineExtensionAmount' }]);
  });
});

describe('ibr-131-ae / ibr-146-ae (allowance & charge percentage)', () => {
  it('pass when amount = base × percent / 100', () => {
    const doc = invoiceWithAllowanceCharge();
    expect(ibr131ae.check(doc)).toEqual([]);
    expect(ibr146ae.check(doc)).toEqual([]);
  });

  it('ibr-131-ae fails when an allowance amount is inconsistent', () => {
    const doc = clone(invoiceWithAllowanceCharge());
    doc.allowanceCharges[0]!.amount = '5';
    expect(ibr131ae.check(doc)).toEqual([{ path: 'allowanceCharges[0].amount' }]);
  });

  it('ibr-146-ae fails when a charge amount is inconsistent', () => {
    const doc = clone(invoiceWithAllowanceCharge());
    doc.allowanceCharges[1]!.amount = '5';
    expect(ibr146ae.check(doc)).toEqual([{ path: 'allowanceCharges[1].amount' }]);
  });

  it('skips allowances without both base amount and percent', () => {
    const doc = clone(validInvoice());
    doc.allowanceCharges.push({
      isCharge: false,
      amount: '10',
      taxScheme: 'VAT',
    } as never);
    expect(ibr131ae.check(doc)).toEqual([]);
  });
});

describe('ibr-co-10/13/15/16 (document totals)', () => {
  it('pass for a consistent document', () => {
    const doc = validInvoice();
    for (const rule of [ibrCo10, ibrCo13, ibrCo15, ibrCo16]) {
      expect(rule.check(doc)).toEqual([]);
    }
  });

  it('ibr-co-10 fails when the line-extension sum is wrong', () => {
    const doc = clone(validInvoice());
    doc.totals.lineExtensionAmount = '900';
    expect(ibrCo10.check(doc)).toEqual([{ path: 'totals.lineExtensionAmount' }]);
  });

  it('ibr-co-13 fails when the tax-exclusive total is wrong', () => {
    const doc = clone(validInvoice());
    doc.totals.taxExclusiveAmount = '900';
    expect(ibrCo13.check(doc)).toEqual([{ path: 'totals.taxExclusiveAmount' }]);
  });

  it('ibr-co-15 fails when the tax-inclusive total is wrong', () => {
    const doc = clone(validInvoice());
    doc.totals.taxInclusiveAmount = '999';
    expect(ibrCo15.check(doc)).toEqual([{ path: 'totals.taxInclusiveAmount' }]);
  });

  it('ibr-co-16 fails when the payable amount is wrong', () => {
    const doc = clone(validInvoice());
    doc.totals.payableAmount = '999';
    expect(ibrCo16.check(doc)).toEqual([{ path: 'totals.payableAmount' }]);
  });
});

describe('validateDocument / AE_RULES', () => {
  it('reports a fully valid invoice as valid', () => {
    const report = validateDocument(validInvoice());
    expect(report.valid).toBe(true);
    expect(report.messages).toEqual([]);
  });

  it('collects errors with rule ids and official text', () => {
    const doc = clone(validInvoice());
    doc.totals.payableAmount = '1';
    const report = validateDocument(doc);
    expect(report.valid).toBe(false);
    const co16 = report.errors.find((m) => m.ruleId === 'ibr-co-16');
    expect(co16?.message).toContain('Amount due for payment');
  });

  it('exposes every rule with a non-empty id and text', () => {
    for (const rule of AE_RULES) {
      expect(rule.id).toMatch(/^ibr-/);
      expect(rule.text.length).toBeGreaterThan(0);
    }
  });
});
