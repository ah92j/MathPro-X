import { describe, expect, it } from 'vitest';
import {
  continuedFraction, differentiate, divisors, evaluateExpression, evaluateRaw,
  gcd, integrateSymbolic, isPrime, linearRegression, lcm, primeFactors,
  rationalApproximation, solveEquation, statistics
} from './engine';

describe('MathPro X calculator engine — equals and expression parsing', () => {
  it('evaluates operator precedence correctly', () => expect(evaluateExpression('2+3*4')).toBe('14'));
  it('evaluates parentheses and decimal arithmetic', () => expect(evaluateExpression('(12.5-2.5)*3')).toBe('30'));
  it('evaluates fractions without losing precision', () => expect(Number(evaluateExpression('1/2+1/3'))).toBeCloseTo(5/6, 14));
  it('evaluates powers, roots and factorial', () => {
    expect(evaluateExpression('2^8')).toBe('256');
    expect(evaluateExpression('sqrt(81)')).toBe('9');
    expect(evaluateExpression('5!')).toBe('120');
  });
  it('interprets postfix percentage as a percentage', () => expect(evaluateExpression('25%')).toBe('0.25'));
  it('supports pi and implicit multiplication', () => expect(Number(evaluateExpression('2π'))).toBeCloseTo(2*Math.PI, 14));
  it('supports degree, radian and gradian trigonometry', () => {
    expect(Number(evaluateExpression('sin(30)','DEG'))).toBeCloseTo(0.5, 10);
    expect(Number(evaluateExpression('sin(pi/2)','RAD'))).toBeCloseTo(1, 10);
    expect(Number(evaluateExpression('sin(100)','GRAD'))).toBeCloseTo(1, 10);
  });
  it('auto-closes one unfinished function parenthesis when equals is pressed', () => {
    expect(Number(evaluateExpression('sin(30','DEG'))).toBeCloseTo(0.5, 10);
  });
  it('uses Ans from the previous calculation', () => {
    const previous=evaluateRaw('6*7');
    expect(evaluateExpression('Ans+1','DEG',previous)).toBe('43');
  });
  it('evaluates complex expressions', () => {
    expect(evaluateExpression('(3+2i)*(1-i)')).toContain('5');
  });
  it('reports incomplete expressions instead of silently returning an empty result', () => {
    expect(()=>evaluateExpression('2+')).toThrow(/incomplete operator/i);
  });
  it('rejects unsupported names and non-math expressions', () => {
    expect(()=>evaluateExpression('unknown(2)')).toThrow();
    expect(()=>evaluateExpression('x=2')).toThrow();
  });
});

describe('MathPro X symbolic, number and statistics tools', () => {
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
