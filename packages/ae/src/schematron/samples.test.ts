import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PintAE } from '../index.js';

const specRoot = fileURLToPath(new URL('../../../../spec/pint-ae-billing/', import.meta.url));

function samples(transaction: 'trn-invoice' | 'trn-creditnote'): string[] {
  const dir = `${specRoot}${transaction}/example/`;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.xml'))
    .map((f) => `${dir}${f}`);
}

const invoiceSamples = samples('trn-invoice');
const creditNoteSamples = samples('trn-creditnote');

describe('official samples validate cleanly (full mode)', () => {
  for (const file of [...invoiceSamples, ...creditNoteSamples]) {
    const name = file.split('/').slice(-2).join('/');
    it(`${name} has no fatal errors`, async () => {
      const report = await PintAE.validate(readFileSync(file, 'utf8'), { mode: 'full' });
      expect(report.errors.map((m) => `${m.ruleId} ${m.path}`)).toEqual([]);
    });
  }
});

describe('official invoice samples validate cleanly (fast mode)', () => {
  for (const file of invoiceSamples) {
    const name = file.split('/').slice(-1)[0];
    it(`${name} has no native fatal errors`, async () => {
      const report = await PintAE.validate(readFileSync(file, 'utf8'), { mode: 'fast' });
      expect(report.errors.map((m) => m.ruleId)).toEqual([]);
    });
  }
});
