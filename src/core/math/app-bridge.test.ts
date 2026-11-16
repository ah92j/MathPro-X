import { describe, expect, it } from 'vitest';
import {
  convertBase,
  differentiate,
  evaluateRaw,
  formatResult,
  integrateSymbolic,
  solveEquation
} from './app-bridge';

describe('MathPro X React calculator bridge', () => {
  it('routes normal calculator expressions through the typed AST evaluator', () => {
    const result = evaluateRaw('2+3*4');
    expect(formatResult(result)).toBe('14');
  });

  it('preserves angle mode for the main calculator', () => {
    expect(formatResult(evaluateRaw('sin(30)', 'DEG'))).toBe('0.5');
    expect(Number(formatResult(evaluateRaw('sin(pi/2)', 'RAD')))).toBeCloseTo(1, 12);
    expect(Number(formatResult(evaluateRaw('sin(100)', 'GRAD')))).toBeCloseTo(1, 12);
  });

  it('preserves Ans between calculations', () => {
    const previous = evaluateRaw('6*7');
    expect(formatResult(evaluateRaw('Ans+1', 'DEG', previous))).toBe('43');
  });

  it('formats complex, DMS and matrix results for the calculator display', () => {
    expect(formatResult(evaluateRaw('(3+2i)*(1-i'))).toBe('5 − 1i');
    expect(formatResult(evaluateRaw('30°15′20″'))).toBe('30° 15′ 20.00″');
    expect(formatResult(evaluateRaw('[[1,2],[3,4]]'))).toBe('[[1, 2], [3, 4]]');
  });

  it('uses the symbolic CAS for equation solving', () => {
    const roots = solveEquation('x^2-5*x+6=0', 'x');
    expect(roots).toHaveLength(2);
    expect(roots.join(',')).toContain('2');
    expect(roots.join(',')).toContain('3');
  });

  it('uses symbolic calculus functions exposed to the UI', () => {
    expect(differentiate('x^3+2*x', 'x')).toContain('3*x^2');
    expect(integrateSymbolic('2*x', 'x')).toContain('x^2');
  });

  it('exposes exact base conversion, including fractional values', () => {
    const result = convertBase('0.5', 10);
    expect(result.binary).toBe('0.1');
    expect(result.hexadecimal).toBe('0.8');
    expect(result.isExact).toBe(true);
  });

  it('rejects invalid Ans values and bad expressions cleanly', () => {
    expect(() => evaluateRaw('Ans+1', 'DEG', { unsupported: true })).toThrow(/answer must be/i);
    expect(() => evaluateRaw('unknownVariable+1')).toThrow(/unknown variable/i);
  });
});