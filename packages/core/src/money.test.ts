import { describe, expect, it } from 'vitest';
import { equals, money, round, sum, toAmountString, withinSlack } from './money.js';

describe('money', () => {
  it('adds amounts exactly (no binary floating point drift)', () => {
    // 0.1 + 0.2 === 0.30000000000000004 in IEEE 754; must be exactly 0.3 here.
    expect(sum(['0.1', '0.2']).toString()).toBe('0.3');
  });

  it('sums an empty list to zero', () => {
    expect(sum([]).toString()).toBe('0');
  });

  it('rounds half-up to 2 decimal places by default', () => {
    expect(round('1.005').toString()).toBe('1.01');
    expect(round('2.344').toString()).toBe('2.34');
    expect(round('2.345').toString()).toBe('2.35');
  });

  it('rounds to a requested number of decimal places', () => {
    expect(round('1.23456', 4).toString()).toBe('1.2346');
  });

  it('compares amounts for equality after rounding', () => {
    expect(equals('1050', '1050.004')).toBe(true);
    expect(equals('1050', '1050.02')).toBe(false);
  });

  it('accepts amounts within a rounding slack', () => {
    expect(withinSlack('1000.00', '1000.02')).toBe(true);
    expect(withinSlack('1000.00', '1000.03')).toBe(false);
    expect(withinSlack('1000.00', '999.98', '0.02')).toBe(true);
  });

  it('formats a fixed-decimal string for serialisation', () => {
    expect(toAmountString('1050')).toBe('1050.00');
    expect(toAmountString('1050.5')).toBe('1050.50');
    expect(toAmountString(5, 0)).toBe('5');
  });

  it('builds from number, string and decimal inputs', () => {
    expect(money(10).plus(money('2.5')).toString()).toBe('12.5');
    expect(money(money('3')).toString()).toBe('3');
  });
});
