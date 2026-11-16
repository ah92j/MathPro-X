import { describe, expect, it } from 'vitest';
import { formatEngineering, formatFixed, formatNumber, formatScientific } from './number-format';

describe('MathPro X number formatting', () => {
  it('formats fixed decimal places and grouping', () => {
    expect(formatFixed('1234567.5', 2, { grouping: true })).toBe('1,234,567.50');
    expect(formatFixed('-12.345', 2)).toBe('-12.35');
  });

  it('formats significant digits in scientific notation', () => {
    expect(formatScientific('12345', 4)).toBe('1.235e+4');
    expect(formatScientific('0.0012345', 3)).toBe('1.23e-3');
  });

  it('uses engineering exponents divisible by three', () => {
    expect(formatEngineering('12345', 4)).toBe('12.35e+3');
    expect(formatEngineering('0.00001234', 4)).toBe('12.34e-6');
  });

  it('supports localized decimal separators and grouping', () => {
    expect(formatNumber('12345.5', {
      notation: 'FIX',
      digits: 1,
      grouping: true,
      decimalSeparator: ',',
      groupSeparator: '.'
    })).toBe('12.345,5');
  });

  it('formats integer values in binary, octal and hexadecimal', () => {
    expect(formatNumber('255', { radix: 2 })).toBe('11111111');
    expect(formatNumber('255', { radix: 8, radixPrefix: true })).toBe('0o377');
    expect(formatNumber('255', { radix: 16, grouping: true })).toBe('FF');
    expect(() => formatNumber('10.5', { radix: 2 })).toThrow(/integer/i);
  });

  it('rejects invalid precision and separator combinations', () => {
    expect(() => formatNumber('1', { digits: 101 })).toThrow(/0 to 100/i);
    expect(() => formatNumber('1.5', {
      notation: 'FIX',
      digits: 1,
      grouping: true,
      decimalSeparator: '.',
      groupSeparator: '.'
    })).toThrow(/different/i);
  });
});