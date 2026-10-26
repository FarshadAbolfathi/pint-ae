import { ValidationReport } from '@pint-ae/core';
import { describe, expect, it, vi } from 'vitest';
import { run, type Deps } from './run.js';

function makeDeps(overrides: Partial<Deps> = {}): { deps: Deps; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const deps: Deps = {
    readFile: vi.fn(() => '<xml/>'),
    writeFile: vi.fn(),
    stdout: (s) => void out.push(s),
    stderr: (s) => void err.push(s),
    validateXml: vi.fn(async () => new ValidationReport([])),
    buildFromJson: vi.fn(() => ({
      ok: true,
      document: { kind: 'invoice' } as never,
      report: new ValidationReport([]),
    })),
    toXml: vi.fn(() => '<Invoice/>'),
    formatReport: (r) => (r.valid ? 'ok' : 'bad'),
    ...overrides,
  };
  return { deps, out, err };
}

const invalidReport = new ValidationReport([
  { ruleId: 'ibr-co-16', severity: 'fatal', path: 'totals.payableAmount', message: 'wrong' },
]);

describe('run: help & version', () => {
  it('prints help with no command', async () => {
    const { deps, out } = makeDeps();
    expect(await run([], deps)).toBe(0);
    expect(out.join()).toContain('Usage:');
  });

  it('prints version', async () => {
    const { deps, out } = makeDeps();
    expect(await run(['version'], deps)).toBe(0);
    expect(out.join()).toContain('pint-ae');
  });

  it('errors on an unknown command', async () => {
    const { deps, err } = makeDeps();
    expect(await run(['frobnicate'], deps)).toBe(2);
    expect(err.join()).toContain('Unknown command');
  });
});

describe('run: validate', () => {
  it('returns 0 and prints a report for a valid file (full mode by default)', async () => {
    const validateXml = vi.fn(async () => new ValidationReport([]));
    const { deps, out } = makeDeps({ validateXml });
    expect(await run(['validate', 'inv.xml'], deps)).toBe(0);
    expect(out.join()).toContain('ok');
    expect(validateXml).toHaveBeenCalledWith('<xml/>', 'full');
  });

  it('passes fast mode with --fast', async () => {
    const validateXml = vi.fn(async () => new ValidationReport([]));
    const { deps } = makeDeps({ validateXml });
    await run(['validate', 'inv.xml', '--fast'], deps);
    expect(validateXml).toHaveBeenCalledWith('<xml/>', 'fast');
  });

  it('returns 1 for an invalid document', async () => {
    const { deps } = makeDeps({ validateXml: async () => invalidReport });
    expect(await run(['validate', 'inv.xml'], deps)).toBe(1);
  });

  it('emits JSON with --json', async () => {
    const { deps, out } = makeDeps();
    await run(['validate', 'inv.xml', '--json'], deps);
    expect(out.join()).toContain('"valid": true');
  });

  it('returns 2 when the file is missing', async () => {
    const { deps, err } = makeDeps();
    expect(await run(['validate'], deps)).toBe(2);
    expect(err.join()).toContain('Missing');
  });

  it('returns 2 on an I/O error', async () => {
    const { deps, err } = makeDeps({
      readFile: () => {
        throw new Error('ENOENT');
      },
    });
    expect(await run(['validate', 'nope.xml'], deps)).toBe(2);
    expect(err.join()).toContain('Cannot read');
  });
});

describe('run: build', () => {
  it('prints XML to stdout by default', async () => {
    const { deps, out } = makeDeps({ readFile: () => '{}' });
    expect(await run(['build', 'in.json'], deps)).toBe(0);
    expect(out.join()).toContain('<Invoice/>');
  });

  it('writes to a file with -o', async () => {
    const write = vi.fn();
    const { deps, out } = makeDeps({ readFile: () => '{}', writeFile: write });
    expect(await run(['build', 'in.json', '-o', 'out.xml'], deps)).toBe(0);
    expect(write).toHaveBeenCalledWith('out.xml', '<Invoice/>');
    expect(out.join()).toContain('Wrote out.xml');
  });

  it('emits the document as JSON with --json', async () => {
    const { deps, out } = makeDeps({ readFile: () => '{}' });
    await run(['build', 'in.json', '--json'], deps);
    expect(out.join()).toContain('"kind": "invoice"');
  });

  it('returns 1 for an invalid build', async () => {
    const { deps, err } = makeDeps({
      readFile: () => '{}',
      buildFromJson: () => ({ ok: false, document: null, report: invalidReport }),
    });
    expect(await run(['build', 'in.json'], deps)).toBe(1);
    expect(err.join()).toContain('invalid');
  });

  it('returns 2 on invalid JSON', async () => {
    const { deps, err } = makeDeps({ readFile: () => 'not json' });
    expect(await run(['build', 'in.json'], deps)).toBe(2);
    expect(err.join()).toContain('Cannot read/parse');
  });

  it('returns 2 when the file is missing', async () => {
    const { deps } = makeDeps();
    expect(await run(['build'], deps)).toBe(2);
  });
});
