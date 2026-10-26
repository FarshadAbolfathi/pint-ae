import { ValidationReport } from '@pint-ae/core';
import { describe, expect, it } from 'vitest';
import { buildFromJson } from './json.js';
import { formatReport } from './report-format.js';
import { validateDocument } from './rules/index.js';

const validInput = {
  kind: 'invoice',
  meta: { id: 'INV-1', issueDate: '2025-01-30' },
  seller: {
    name: 'Supplier',
    vatIdentifier: '100000000000003',
    address: { countrySubentity: 'DXB', country: 'AE' },
  },
  buyer: {
    name: 'Buyer',
    vatIdentifier: '134567890123003',
    address: { countrySubentity: 'AUH', country: 'AE' },
  },
  lines: [
    {
      quantity: 100,
      unitCode: 'H87',
      price: 10,
      item: { name: 'Widget', taxCategory: { id: 'S', percent: 5 } },
    },
  ],
};

describe('buildFromJson', () => {
  it('builds a valid invoice from JSON', () => {
    const result = buildFromJson(validInput);
    expect(result.ok).toBe(true);
    expect(result.document?.totals.taxInclusiveAmount).toBe('1050');
  });

  it('defaults to an invoice when kind is omitted', () => {
    const result = buildFromJson({ ...validInput, kind: undefined });
    expect(result.ok).toBe(true);
    expect(result.document?.kind).toBe('invoice');
  });

  it('builds a credit note', () => {
    const result = buildFromJson({ ...validInput, kind: 'creditNote' });
    expect(result.ok).toBe(true);
    expect(result.document?.kind).toBe('creditNote');
  });

  it('reports a schema error for a wrong top-level shape', () => {
    const result = buildFromJson({ lines: 'not-an-array' });
    expect(result.ok).toBe(false);
    expect(result.document).toBeNull();
    expect(result.report.errors.some((m) => m.ruleId === 'schema')).toBe(true);
  });

  it('surfaces model validation errors from the builder', () => {
    const result = buildFromJson({ ...validInput, meta: { issueDate: '2025-01-30' } }); // no id
    expect(result.ok).toBe(false);
  });

  it('applies document allowances/charges and payment means from JSON', () => {
    const result = buildFromJson({
      ...validInput,
      allowanceCharges: [
        {
          isCharge: false,
          amount: 10,
          baseAmount: 100,
          percent: 10,
          taxCategory: { id: 'S', percent: 5 },
        },
      ],
      paymentMeans: [{ code: '30', name: 'Credit transfer' }],
    });
    expect(result.ok).toBe(true);
    expect(result.document?.allowanceCharges).toHaveLength(1);
    expect(result.document?.paymentMeans[0]?.code).toBe('30');
  });
});

describe('formatReport', () => {
  it('reports a clean document', () => {
    const report = validateDocument(buildFromJson(validInput).document!);
    expect(formatReport(report)).toContain('✓ Valid');
  });

  it('lists errors with rule id and path', () => {
    const doc = structuredClone(buildFromJson(validInput).document!);
    doc.totals.payableAmount = '1';
    const text = formatReport(validateDocument(doc));
    expect(text).toContain('ibr-co-16');
    expect(text).toContain('Invalid:');
  });

  it('renders warnings distinctly and reports a valid-with-warnings summary', () => {
    const report = new ValidationReport([
      { ruleId: 'demo-001', severity: 'warning', path: 'note', message: 'Consider adding a note.' },
    ]);
    const text = formatReport(report);
    expect(text).toContain('! [demo-001]');
    expect(text).toContain('Valid with 1 warning(s).');
  });
});
