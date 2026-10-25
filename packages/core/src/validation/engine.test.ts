import { describe, expect, it } from 'vitest';
import { assert, runRules, type Rule } from './engine.js';

interface Subject {
  total: number;
}

const mustBePositive: Rule<Subject> = {
  id: 'test-001',
  severity: 'fatal',
  text: 'Total must be positive.',
  check: (s) => assert(s.total > 0, 'total'),
};

const warnIfLarge: Rule<Subject> = {
  id: 'test-002',
  severity: 'warning',
  text: 'Total is unusually large.',
  check: (s) => (s.total > 1000 ? [{ path: 'total', message: 'Over 1000.' }] : []),
};

describe('validation engine', () => {
  it('reports no messages and is valid when all rules pass', () => {
    const report = runRules({ total: 10 }, [mustBePositive, warnIfLarge]);
    expect(report.valid).toBe(true);
    expect(report.messages).toHaveLength(0);
  });

  it('uses the rule text as the default message', () => {
    const report = runRules({ total: 0 }, [mustBePositive]);
    expect(report.valid).toBe(false);
    expect(report.errors).toEqual([
      { ruleId: 'test-001', severity: 'fatal', path: 'total', message: 'Total must be positive.' },
    ]);
  });

  it('separates fatal errors from warnings', () => {
    const report = runRules({ total: 5000 }, [mustBePositive, warnIfLarge]);
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]!.message).toBe('Over 1000.');
  });

  it('is invalid when any fatal rule fails, even with warnings present', () => {
    const report = runRules({ total: -1 }, [mustBePositive, warnIfLarge]);
    expect(report.valid).toBe(false);
    expect(report.toJSON()).toEqual({
      valid: false,
      messages: [
        {
          ruleId: 'test-001',
          severity: 'fatal',
          path: 'total',
          message: 'Total must be positive.',
        },
      ],
    });
  });
});
