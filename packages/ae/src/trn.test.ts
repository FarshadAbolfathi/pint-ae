import { describe, expect, it } from 'vitest';
import { isValidTin, isValidTrn } from './trn.js';

describe('TRN validation (ibr-132-ae)', () => {
  it('accepts a well-formed TRN (15 digits, starts 1, ends 03)', () => {
    expect(isValidTrn('100000000000003')).toBe(true);
    expect(isValidTrn('135790246801003')).toBe(true);
  });

  it('rejects TRNs with the wrong length', () => {
    expect(isValidTrn('10000000003')).toBe(false);
    expect(isValidTrn('1000000000000003')).toBe(false);
  });

  it('rejects TRNs that do not start with 1 or end with 03', () => {
    expect(isValidTrn('200000000000003')).toBe(false);
    expect(isValidTrn('100000000000004')).toBe(false);
  });

  it('rejects non-numeric TRNs', () => {
    expect(isValidTrn('1000000000000A3')).toBe(false);
  });
});

describe('TIN validation (ibr-148-ae)', () => {
  it('accepts a 10-digit TIN starting with 1', () => {
    expect(isValidTin('1000000000')).toBe(true);
  });

  it('rejects TINs of the wrong length or prefix', () => {
    expect(isValidTin('100000000')).toBe(false);
    expect(isValidTin('2000000000')).toBe(false);
  });
});
