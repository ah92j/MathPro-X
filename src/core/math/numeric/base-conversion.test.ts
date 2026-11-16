import { describe, expect, it } from 'vitest';
import { convertBase, parseBaseValue } from './base-conversion';

describe('MathPro X base conversion', () => {
  it('converts integer values between binary, octal, decimal and hexadecimal', () => {
    const result = convertBase('255', 10);
    expect(result.binary).toBe('11111111');
    expect(result.octal).toBe('377');
    expect(result.decimal).toBe('255');
    expect(result.hexadecimal).toBe('FF');
  });

  it('accepts source prefixes and signed inputs', () => {
    expect(convertBase('0xFF', 16).decimal).toBe('255');
    expect(convertBase('-0b1010', 2).decimal).toBe('-10');
    expect(convertBase('+17', 8).decimal).toBe('15');
  });

  it('converts finite fractions exactly where the target radix permits it', () => {
    const result = convertBase('0.5', 10);
    expect(result.binary).toBe('0.1');
    expect(result.octal).toBe('0.4');
    expect(result.decimal).toBe('0.5');
    expect(result.hexadecimal).toBe('0.8');
    expect(result.isExact).toBe(true);
  });

  it('marks repeating expansions and exposes their repeating cycle', () => {
    const result = convertBase('0.1', 10);
    expect(result.decimal).toBe('0.1');
    expect(result.binary).toContain('(');
    expect(result.hexadecimal).toContain('(');
  });

  it('rejects invalid digits, prefixes and non-integer integer conversions', () => {
    expect(() => convertBase('102', 2)).toThrow(/not valid/i);
    expect(() => convertBase('0x10', 8)).toThrow(/prefix/i);
    expect(() => parseBaseValue('1.5', 10)).toThrow(/integer/i);
  });

  it('enforces output precision boundaries', () => {
    expect(() => convertBase('1.5', 10, { maxFractionDigits: 0 })).toThrow(/1 to 256/i);
  });
});