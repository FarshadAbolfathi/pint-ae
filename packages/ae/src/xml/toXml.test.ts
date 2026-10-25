import { describe, expect, it } from 'vitest';
import { creditNote, invoice } from '../builder.js';
import { toXml } from './toXml.js';

const seller = {
  name: 'Supplier Legal Name',
  vatIdentifier: '100000000000003',
  endpoint: { id: '1357902468', schemeId: '0235' },
  legalIdentifier: { id: '112345678900003', schemeAgencyId: 'PAS', schemeAgencyName: 'ES' },
  address: { street: 'Street Name', city: 'City Name', countrySubentity: 'DXB', country: 'AE' },
};
const buyer = {
  name: 'Buyer Legal Name',
  vatIdentifier: '134567890123003',
  address: { city: 'City Name', countrySubentity: 'AUH', country: 'AE' },
};

function sample() {
  return invoice()
    .withMeta({
      id: 'AE001-Test',
      uuid: '4b6000ca-0128-4bdc-99a6-406f2909247f',
      issueDate: '2025-01-30',
    })
    .seller(seller)
    .buyer(buyer)
    .addPaymentMeans({ code: '55', name: 'Debit Card' })
    .addLine({
      quantity: 100,
      unitCode: 'H87',
      price: { amount: 10 },
      item: {
        name: 'Item Name',
        description: 'Item Description',
        taxCategory: { id: 'S', percent: 5 },
      },
    });
}

describe('toXml', () => {
  it('serialises a valid invoice to UBL with the PINT AE customization', () => {
    const xml = toXml(sample().buildOrThrow());
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<Invoice');
    expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
    expect(xml).toContain(
      '<cbc:CustomizationID>urn:peppol:pint:billing-1@ae-1</cbc:CustomizationID>',
    );
    expect(xml).toContain('<cbc:ID>AE001-Test</cbc:ID>');
    expect(xml).toContain('<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>');
  });

  it('emits amounts with a currencyID and two decimals', () => {
    const xml = toXml(sample().buildOrThrow());
    expect(xml).toContain('<cbc:PayableAmount currencyID="AED">1050.00</cbc:PayableAmount>');
    expect(xml).toContain('<cbc:TaxAmount currencyID="AED">50.00</cbc:TaxAmount>');
  });

  it('includes party TRNs under PartyTaxScheme', () => {
    const xml = toXml(sample().buildOrThrow());
    expect(xml).toContain('<cbc:CompanyID>100000000000003</cbc:CompanyID>');
    expect(xml).toContain('<cbc:ID>VAT</cbc:ID>');
  });

  it('serialises document allowances/charges, totals and a non-VAT tax id', () => {
    const inv = invoice()
      .withMeta({
        id: 'INV-3',
        issueDate: '2025-01-30',
        prepaidAmount: 50,
        payableRoundingAmount: 0.5,
      })
      .seller({ ...seller, taxIdentifier: '1000000000' })
      .buyer(buyer)
      .addLine({
        quantity: 100,
        unitCode: 'H87',
        price: 10,
        item: { name: 'Item', taxCategory: { id: 'S', percent: 5 } },
      })
      .addAllowanceCharge({
        isCharge: false,
        amount: 10,
        baseAmount: 100,
        percent: 10,
        reason: 'Loyalty discount',
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
    const xml = toXml(inv);
    expect(xml).toContain('<cbc:ChargeIndicator>false</cbc:ChargeIndicator>');
    expect(xml).toContain('<cbc:ChargeIndicator>true</cbc:ChargeIndicator>');
    expect(xml).toContain(
      '<cbc:AllowanceChargeReason>Loyalty discount</cbc:AllowanceChargeReason>',
    );
    expect(xml).toContain(
      '<cbc:AllowanceTotalAmount currencyID="AED">10.00</cbc:AllowanceTotalAmount>',
    );
    expect(xml).toContain('<cbc:ChargeTotalAmount currencyID="AED">20.00</cbc:ChargeTotalAmount>');
    expect(xml).toContain('<cbc:PrepaidAmount currencyID="AED">50.00</cbc:PrepaidAmount>');
    expect(xml).toContain(
      '<cbc:PayableRoundingAmount currencyID="AED">0.50</cbc:PayableRoundingAmount>',
    );
    expect(xml).toContain('<cbc:ID>TIN</cbc:ID>');
  });

  it('uses the CreditNote root and CreditedQuantity for credit notes', () => {
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
    const xml = toXml(cn);
    expect(xml).toContain('<CreditNote');
    expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2');
    expect(xml).toContain('<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>');
    expect(xml).toContain('<cbc:CreditedQuantity unitCode="H87">1</cbc:CreditedQuantity>');
  });
});
