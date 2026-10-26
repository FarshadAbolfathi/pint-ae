import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PintAE } from '../index.js';

const sampleDir = fileURLToPath(
  new URL('../../../../spec/pint-ae-billing/trn-invoice/example/', import.meta.url),
);
const sample = (name: string) => readFileSync(`${sampleDir}${name}`, 'utf8');

describe('Schematron full-mode validation', () => {
  it('passes a valid official sample with no fatal errors', async () => {
    const report = await PintAE.validate(sample('Standard tax invoice.xml'));
    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it('flags an invalid currency code that native-only (fast) mode misses', async () => {
    const xml = sample('Standard tax invoice.xml').replace(
      /<cbc:DocumentCurrencyCode>AED<\/cbc:DocumentCurrencyCode>/,
      '<cbc:DocumentCurrencyCode>XYZ</cbc:DocumentCurrencyCode>',
    );
    const full = await PintAE.validate(xml, { mode: 'full' });
    expect(full.valid).toBe(false);
    expect(full.errors.length).toBeGreaterThan(0);
  });

  it('reports the official rule ids in the message shape', async () => {
    const xml = sample('Standard tax invoice.xml').replace(
      /<cbc:PayableAmount currencyID="AED">[^<]*<\/cbc:PayableAmount>/,
      '<cbc:PayableAmount currencyID="AED">999999.00</cbc:PayableAmount>',
    );
    const report = await PintAE.validate(xml);
    const co16 = report.errors.find((m) => m.ruleId === 'ibr-co-16');
    expect(co16).toBeDefined();
    expect(co16?.severity).toBe('fatal');
    expect(co16?.message).toContain('Amount due for payment');
  });
});
