import { describe, expect, it } from 'vitest';
import {
  isVatCategoryCode,
  isZeroRateCategory,
  UAE_STANDARD_VAT_RATE,
  VAT_CATEGORY_CODES,
} from './vat.js';

describe('VAT categories', () => {
  it('recognises the official UAE category codes', () => {
    for (const code of Object.keys(VAT_CATEGORY_CODES)) {
      expect(isVatCategoryCode(code)).toBe(true);
    }
    expect(isVatCategoryCode('S')).toBe(true);
    expect(isVatCategoryCode('N')).toBe(true);
  });

  it('rejects unknown category codes', () => {
    expect(isVatCategoryCode('X')).toBe(false);
    expect(isVatCategoryCode('')).toBe(false);
  });

  it('exposes the UAE standard rate', () => {
    expect(UAE_STANDARD_VAT_RATE).toBe(5);
  });

  it('classifies zero-rate categories', () => {
    expect(isZeroRateCategory('Z')).toBe(true);
    expect(isZeroRateCategory('E')).toBe(true);
    expect(isZeroRateCategory('O')).toBe(true);
    expect(isZeroRateCategory('AE')).toBe(true);
    expect(isZeroRateCategory('S')).toBe(false);
  });
});
