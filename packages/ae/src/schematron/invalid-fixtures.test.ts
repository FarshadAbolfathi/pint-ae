import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PintAE } from '../index.js';

const dir = fileURLToPath(new URL('../../../../test/fixtures/invalid/', import.meta.url));
const expected = JSON.parse(readFileSync(`${dir}expected.json`, 'utf8')) as Record<
  string,
  string[]
>;

describe('invalid fixtures (mutated official samples)', () => {
  for (const [file, expectedIds] of Object.entries(expected)) {
    it(`${file} is invalid and reports ${expectedIds.join(', ')}`, async () => {
      const xml = readFileSync(`${dir}${file}`, 'utf8');
      const report = await PintAE.validate(xml);
      expect(report.valid).toBe(false);
      const ids = new Set(report.errors.map((m) => m.ruleId));
      for (const id of expectedIds) {
        expect(ids.has(id), `${file} should report ${id}`).toBe(true);
      }
    });
  }
});
