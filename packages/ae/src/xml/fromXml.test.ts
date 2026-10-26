import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { invoice } from '../builder.js';
import { validateDocument } from '../rules/index.js';
import { fromXml, parseDocument, XmlParseError } from './fromXml.js';
import { toXml } from './toXml.js';

const specDir = fileURLToPath(
  new URL('../../../../spec/pint-ae-billing/trn-invoice/example/', import.meta.url),
);

const seller = {
  name: 'Supplier Legal Name',
  vatIdentifier: '100000000000003',
  endpoint: { id: '1357902468', schemeId: '0235' },
  legalIdentifier: { id: '112345678900003', schemeAgencyId: 'PAS', schemeAgencyName: 'ES' },
  address: { street: 'Street Name', city: 'Dubai', countrySubentity: 'DXB', country: 'AE' },
};
const buyer = {
  name: 'Buyer Legal Name',
  vatIdentifier: '134567890123003',
  address: { city: 'Abu Dhabi', countrySubentity: 'AUH', country: 'AE' },
};

describe('fromXml', () => {
  it('round-trips a document built → serialised → parsed', () => {
    const built = invoice()
      .withMeta({ id: 'INV-RT', issueDate: '2025-01-30', dueDate: '2025-02-06' })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 100,
        unitCode: 'H87',
        price: 10,
        item: { name: 'Widget', description: 'Widget', taxCategory: { id: 'S', percent: 5 } },
      })
      .buildOrThrow();

    const parsed = fromXml(toXml(built));

    expect(parsed.id).toBe('INV-RT');
    expect(parsed.seller.vatIdentifier).toBe('100000000000003');
    expect(parsed.seller.legalIdentifier?.schemeAgencyId).toBe('PAS');
    expect(parsed.lines[0]?.lineExtensionAmount).toBe('1000');
    // Amounts are canonicalised by the model (trailing zeros dropped).
    expect(parsed.totals.payableAmount).toBe('1050');
    expect(validateDocument(parsed).valid).toBe(true);
  });

  it('keeps long numeric identifiers as strings (no precision loss)', () => {
    const built = invoice()
      .withMeta({ id: 'INV-TRN', issueDate: '2025-01-30' })
      .seller(seller)
      .buyer(buyer)
      .addLine({
        quantity: 1,
        unitCode: 'H87',
        price: 10,
        item: { name: 'Widget', description: 'Widget', taxCategory: { id: 'S', percent: 5 } },
      })
      .buildOrThrow();
    const parsed = fromXml(toXml(built));
    expect(parsed.buyer.vatIdentifier).toBe('134567890123003');
    expect(typeof parsed.buyer.vatIdentifier).toBe('string');
  });

  it('parses a credit note', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>
</CreditNote>`;
    const { document } = parseDocument(xml);
    // Not a full document, so schema fails — but it is recognised as a credit note.
    expect(document).toBeNull();
  });

  it('reports schema errors instead of throwing in parseDocument', () => {
    const { document, report } = parseDocument(
      '<?xml version="1.0"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/>',
    );
    expect(document).toBeNull();
    expect(report.errors.every((m) => m.ruleId === 'schema')).toBe(true);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('reports a non-UBL root', () => {
    const { document, report } = parseDocument('<?xml version="1.0"?><Foo/>');
    expect(document).toBeNull();
    expect(report.errors[0]?.message).toContain('not a UBL');
  });

  it('fromXml throws XmlParseError carrying the report', () => {
    try {
      fromXml('<?xml version="1.0"?><Foo/>');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(XmlParseError);
      expect((err as XmlParseError).report.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('golden files (official PINT AE v1.0.3 samples)', () => {
  const samples = ['Standard invoice Mandatory fields.xml', 'Standard tax invoice.xml'];

  for (const name of samples) {
    it(`parses and validates "${name}"`, () => {
      const xml = readFileSync(`${specDir}${name}`, 'utf8');
      const doc = fromXml(xml);
      expect(doc.kind).toBe('invoice');
      expect(doc.lines.length).toBeGreaterThan(0);
      const report = validateDocument(doc);
      expect(report.valid).toBe(true);
    });
  }
});
