import { describe, expect, it } from 'vitest';
import { continuedFraction, differentiate, divisors, evaluateExpression, gcd, integrateSymbolic, isPrime, linearRegression, lcm, primeFactors, rationalApproximation, solveEquation, statistics } from './engine';

describe('MathPro X calculation engine', () => {
  it('evaluates basic arithmetic', () => expect(evaluateExpression('2+3*4')).toBe('14'));
  it('uses selected degree mode for trigonometry', () => expect(Number(evaluateExpression('sin(30)', 'DEG'))).toBeCloseTo(0.5, 10));
  it('differentiates a polynomial', () => expect(differentiate('x^3','x').replaceAll(' ','')).toContain('3*x^2'));
  it('integrates a polynomial symbolically', () => expect(integrateSymbolic('x^2','x')).toContain('x^3'));
  it('solves a factorable quadratic', () => expect(solveEquation('x^2-5*x+6=0','x')).toHaveLength(2));
  it('computes number theory results', () => {
    expect(gcd(84,30)).toBe(6); expect(lcm(84,30)).toBe(420); expect(isPrime(97)).toBe(true);
    expect(primeFactors(360)).toEqual([2,2,2,3,3,5]); expect(divisors(12)).toEqual([1,2,3,4,6,12]);
  });
  it('returns continued fraction and rational approximation', () => {
    expect(continuedFraction(3.25)).toEqual([3,4]); expect(rationalApproximation(0.5)).toEqual([1,2]);
  });
  it('calculates descriptive statistics', () => {
    const s=statistics([1,2,2,3]); expect(s.mean).toBe(2); expect(s.median).toBe(2); expect(s.mode).toBe(2);
  });
  it('fits a straight line', () => {
    const r=linearRegression([[1,3],[2,5],[3,7]]); expect(r.slope).toBeCloseTo(2); expect(r.intercept).toBeCloseTo(1); expect(r.r2).toBeCloseTo(1);
  });
});