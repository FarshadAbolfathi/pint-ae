import type { Document } from '@pint-ae/core';
import { describe, expect, it } from 'vitest';
import { invoice } from '../builder.js';
import { validateDocument } from '../rules/index.js';
import { PintAE } from '../index.js';
import { toXml } from '../xml/toXml.js';

const seller = {
  name: 'Supplier Legal Name',
  vatIdentifier: '100000000000003',
  endpoint: { id: '1357902468', schemeId: '0235' },
  address: { street: 'Street', city: 'Dubai', countrySubentity: 'DXB', country: 'AE' },
};
const buyer = {
  name: 'Buyer Legal Name',
  vatIdentifier: '134567890123003',
  address: { street: 'Street', city: 'Abu Dhabi', countrySubentity: 'AUH', country: 'AE' },
};

function baseInvoice(): Document {
  return invoice()
    .withMeta({ id: 'INV-1', issueDate: '2025-01-30', dueDate: '2025-02-06' })
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

function withCategory(id: string, percent?: number): Document {
  const b = invoice()
    .withMeta({ id: 'INV-1', issueDate: '2025-01-30', dueDate: '2025-02-06' })
    .seller(seller)
    .buyer(buyer)
    .addLine({
      quantity: 10,
      unitCode: 'H87',
      price: 5,
      item: {
        name: 'Item',
        description: 'Item',
        taxCategory: percent === undefined ? { id } : { id, percent },
      },
    });
  return b.buildOrThrow();
}

function withAllowanceCharge(isCharge: boolean): Document {
  return invoice()
    .withMeta({ id: 'INV-1', issueDate: '2025-01-30', dueDate: '2025-02-06' })
    .seller(seller)
    .buyer(buyer)
    .addLine({
      quantity: 100,
      unitCode: 'H87',
      price: 10,
      item: { name: 'Widget', description: 'Widget', taxCategory: { id: 'S', percent: 5 } },
    })
    .addAllowanceCharge({
      isCharge,
      amount: 10,
      baseAmount: 100,
      percent: 10,
      taxCategory: { id: 'S', percent: 5 },
    })
    .buildOrThrow();
}

/** Each native rule with a document and a mutation that should trip it. */
const cases: { ruleId: string; base?: () => Document; mutate: (doc: Document) => void }[] = [
  {
    ruleId: 'ibr-cl-01',
    mutate: (d) => void ((d as { invoiceTypeCode: string }).invoiceTypeCode = '999'),
  },
  { ruleId: 'ibr-132-ae', mutate: (d) => void (d.seller.vatIdentifier = '999999999999999') },
  { ruleId: 'ibr-128-ae', mutate: (d) => void (d.buyer.address.countrySubentity = 'ZZZ') },
  { ruleId: 'ibr-125-ae', mutate: (d) => void delete d.lines[0]!.item.description },
  { ruleId: 'ibr-147-ae', mutate: (d) => void (d.lines[0]!.lineExtensionAmount = '1') },
  {
    ruleId: 'ibr-131-ae',
    base: () => withAllowanceCharge(false),
    mutate: (d) => void (d.allowanceCharges[0]!.amount = '5'),
  },
  {
    ruleId: 'ibr-146-ae',
    base: () => withAllowanceCharge(true),
    mutate: (d) => void (d.allowanceCharges[0]!.amount = '5'),
  },
  {
    ruleId: 'ibr-120-ae',
    base: () => withCategory('Z', 0),
    mutate: (d) => void (d.taxTotal.subtotals[0]!.category.percent = '5'),
  },
  {
    ruleId: 'ibr-121-ae',
    base: () => withCategory('E'),
    mutate: (d) => void (d.taxTotal.subtotals[0]!.category.percent = '0'),
  },
  {
    ruleId: 'ibr-co-11',
    base: () => withAllowanceCharge(false),
    mutate: (d) => void (d.totals.allowanceTotalAmount = '1'),
  },
  {
    ruleId: 'ibr-co-12',
    base: () => withAllowanceCharge(true),
    mutate: (d) => void (d.totals.chargeTotalAmount = '1'),
  },
  { ruleId: 'ibr-co-10', mutate: (d) => void (d.totals.lineExtensionAmount = '1') },
  { ruleId: 'ibr-co-13', mutate: (d) => void (d.totals.taxExclusiveAmount = '1') },
  { ruleId: 'ibr-co-15', mutate: (d) => void (d.totals.taxInclusiveAmount = '1') },
  { ruleId: 'ibr-co-16', mutate: (d) => void (d.totals.payableAmount = '1') },
  { ruleId: 'ibr-co-14', mutate: (d) => void (d.taxTotal.taxAmount = '1') },
];

describe('native rules cross-check against the official Schematron', () => {
  for (const { ruleId, base, mutate } of cases) {
    it(`${ruleId}: both native and Schematron flag it`, async () => {
      const doc = structuredClone((base ?? baseInvoice)());
      mutate(doc);
      const xml = toXml(doc);

      const native = validateDocument(doc);
      const full = await PintAE.validate(xml, { mode: 'full' });

      expect(native.errors.map((m) => m.ruleId)).toContain(ruleId);
      expect(full.errors.map((m) => m.ruleId)).toContain(ruleId);
    });
  }
});
