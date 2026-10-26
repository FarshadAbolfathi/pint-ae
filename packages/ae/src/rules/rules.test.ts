import type { Document, Invoice } from '@pint-ae/core';
import { describe, expect, it } from 'vitest';
import { creditNote, invoice } from '../builder.js';
import { ibr131ae, ibr146ae } from './allowances.js';
import { ibrCl01 } from './document.js';
import { ibr125ae, ibr147ae } from './lines.js';
import { ibr128ae } from './parties.js';
import { AE_RULES, validateDocument } from './index.js';
import { ibrCo10, ibrCo11, ibrCo12, ibrCo13, ibrCo14, ibrCo15, ibrCo16 } from './totals.js';
import { ibr132ae } from './trn.js';
import { ibr120ae, ibr121ae } from './vat-rules.js';

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
      item: { name: 'Item', description: 'Item', taxCategory: { id: 'S', percent: 5 } },
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
      item: { name: 'Item', description: 'Item', taxCategory: { id: 'S', percent: 5 } },
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

describe('ibr-co-11/12 (document allowance & charge totals)', () => {
  it('pass when the totals match the document allowances/charges', () => {
    const doc = invoiceWithAllowanceCharge();
    expect(ibrCo11.check(doc)).toEqual([]);
    expect(ibrCo12.check(doc)).toEqual([]);
  });

  it('pass when there are no document allowances/charges and no totals', () => {
    const doc = validInvoice();
    expect(ibrCo11.check(doc)).toEqual([]);
    expect(ibrCo12.check(doc)).toEqual([]);
  });

  it('ibr-co-11 fails when the allowance total is wrong', () => {
    const doc = clone(invoiceWithAllowanceCharge());
    doc.totals.allowanceTotalAmount = '999';
    expect(ibrCo11.check(doc)).toEqual([{ path: 'totals.allowanceTotalAmount' }]);
  });

  it('ibr-co-11 fails when allowances exist but the total is omitted', () => {
    const doc = clone(invoiceWithAllowanceCharge());
    delete doc.totals.allowanceTotalAmount;
    expect(ibrCo11.check(doc)).toEqual([{ path: 'totals.allowanceTotalAmount' }]);
  });

  it('ibr-co-12 fails when the charge total is wrong', () => {
    const doc = clone(invoiceWithAllowanceCharge());
    doc.totals.chargeTotalAmount = '999';
    expect(ibrCo12.check(doc)).toEqual([{ path: 'totals.chargeTotalAmount' }]);
  });

  it('ibr-co-12 fails when charges exist but the total is omitted', () => {
    const doc = clone(invoiceWithAllowanceCharge());
    delete doc.totals.chargeTotalAmount;
    expect(ibrCo12.check(doc)).toEqual([{ path: 'totals.chargeTotalAmount' }]);
  });
});

describe('ibr-co-14 (total VAT = sum of breakdown tax amounts)', () => {
  it('passes for a consistent document', () => {
    expect(ibrCo14.check(validInvoice())).toEqual([]);
  });

  it('fails when the total VAT disagrees with the breakdown', () => {
    const doc = clone(validInvoice());
    doc.taxTotal.taxAmount = '999';
    expect(ibrCo14.check(doc)).toEqual([{ path: 'taxTotal.taxAmount' }]);
  });
});

describe('ibr-120-ae (zero-rated breakdown rate)', () => {
  function zeroRatedInvoice(): Invoice {
    return invoice()
      .withMeta({ id: 'INV-Z', issueDate: '2025-01-30' })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 10,
        unitCode: 'H87',
        price: 5,
        item: { name: 'Export', description: 'Export', taxCategory: { id: 'Z', percent: 0 } },
      })
      .buildOrThrow();
  }

  it('passes when the zero-rated breakdown rate is 0', () => {
    expect(ibr120ae.check(zeroRatedInvoice())).toEqual([]);
  });

  it('fails when a zero-rated breakdown has a non-zero rate', () => {
    const doc = clone(zeroRatedInvoice());
    doc.taxTotal.subtotals[0]!.category.percent = '5';
    expect(ibr120ae.check(doc)).toEqual([{ path: 'taxTotal.subtotals[0].category.percent' }]);
  });
});

describe('ibr-128-ae (UAE emirate subdivision)', () => {
  it('passes for valid emirate codes', () => {
    expect(ibr128ae.check(validInvoice())).toEqual([]);
  });

  it('fails when an AE address has a non-emirate subdivision', () => {
    const doc = clone(validInvoice());
    doc.buyer.address.countrySubentity = 'XYZ';
    expect(ibr128ae.check(doc)).toEqual([{ path: 'buyer.address.countrySubentity' }]);
  });

  it('fails when an AE address is missing the subdivision', () => {
    const doc = clone(validInvoice());
    delete doc.seller.address.countrySubentity;
    expect(ibr128ae.check(doc)).toEqual([{ path: 'seller.address.countrySubentity' }]);
  });

  it('ignores non-AE addresses', () => {
    const doc = clone(validInvoice());
    doc.seller.address.country = 'SA';
    delete doc.seller.address.countrySubentity;
    expect(ibr128ae.check(doc)).toEqual([]);
  });
});

describe('ibr-125-ae (item description required)', () => {
  it('passes when every line has a description', () => {
    expect(ibr125ae.check(validInvoice())).toEqual([]);
  });

  it('fails when a line is missing its item description', () => {
    const doc = clone(validInvoice());
    delete doc.lines[0]!.item.description;
    expect(ibr125ae.check(doc)).toEqual([{ path: 'lines[0].item.description' }]);
  });
});

describe('ibr-121-ae (exempt breakdown has no rate)', () => {
  function exemptInvoice(): Invoice {
    return invoice()
      .withMeta({ id: 'INV-E', issueDate: '2025-01-30' })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 1,
        unitCode: 'H87',
        price: 100,
        item: { name: 'Exempt item', description: 'Exempt item', taxCategory: { id: 'E' } },
      })
      .buildOrThrow();
  }

  it('passes when an exempt breakdown carries no rate', () => {
    const doc = exemptInvoice();
    expect(doc.taxTotal.subtotals[0]?.category.percent).toBeUndefined();
    expect(ibr121ae.check(doc)).toEqual([]);
  });

  it('fails when an exempt breakdown carries a rate', () => {
    const doc = clone(exemptInvoice());
    doc.taxTotal.subtotals[0]!.category.percent = '0';
    expect(ibr121ae.check(doc)).toEqual([{ path: 'taxTotal.subtotals[0].category.percent' }]);
  });
});

describe('ibr-cl-01 (document type code)', () => {
  it('passes for the default invoice and credit note type codes', () => {
    expect(ibrCl01.check(validInvoice())).toEqual([]);
  });

  it('fails for an invoice type code outside UNTDID 1001', () => {
    const doc = clone(validInvoice());
    (doc as { invoiceTypeCode: string }).invoiceTypeCode = '999';
    expect(ibrCl01.check(doc)).toEqual([{ path: 'invoiceTypeCode' }]);
  });

  it('checks credit note type codes against the credit note list', () => {
    const cn = creditNote()
      .withMeta({ id: 'CN-1', issueDate: '2025-02-01' })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 1,
        unitCode: 'H87',
        price: 10,
        item: { name: 'Item', description: 'Item', taxCategory: { id: 'S', percent: 5 } },
      })
      .buildOrThrow();
    expect(ibrCl01.check(cn)).toEqual([]);
    (cn as { creditNoteTypeCode: string }).creditNoteTypeCode = '380';
    expect(ibrCl01.check(cn)).toEqual([{ path: 'creditNoteTypeCode' }]);
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
      expect(rule.id).toMatch(/^(ibr-|aligned-ibrp-)/);
      expect(rule.text.length).toBeGreaterThan(0);
    }
  });
});
