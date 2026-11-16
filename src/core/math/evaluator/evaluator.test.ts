import { describe, expect, it } from 'vitest';
import {
  decimalFromDisplayValue,
  evaluateMath,
  evaluateToString,
  evaluateWithContext,
  toNumber
} from './evaluator';
import { complex, complexMagnitude, complexMultiply } from './complex';
import {
  decimalDegreesToDms,
  dmsToDecimalDegrees,
  formatDms
} from './dms';
import { decimal, numericMath } from './value';

describe('MathPro X typed decimal and complex values', () => {
  it('keeps decimal calculations at high precision', () => {
    const result = evaluateToString('1/3+1/3+1/3');
    expect(result).toBe('1');
    expect(numericMath.equal(decimalFromDisplayValue(evaluateMath('0.1+0.2').value), decimal('0.3'))).toBe(true);
  });

  it('evaluates complex arithmetic and exposes real and imaginary components', () => {
    const result = evaluateMath('(3+2i)*(1-i)');
    expect(result.formatted).toBe('5 − 1i');
    expect(evaluateToString('real((3+2i)*(1-i))')).toBe('5');
    expect(evaluateToString('imaginary((3+2i)*(1-i))')).toBe('-1');
    expect(evaluateToString('abs(3+4i)')).toBe('5');
  });

  it('supports complex square roots and powers of negative values', () => {
    expect(evaluateToString('sqrt(-4)')).toBe('0 + 2i');
    expect(evaluateToString('(-8)^(1/3)')).toContain('2');
    expect(evaluateToString('conjugate(3+2i)')).toBe('3 − 2i');
  });

  it('implements complex helpers without losing decimal scalar precision', () => {
    const value = complexMultiply(complex('1.25', '2.5'), complex('2', '-1'));
    expect(value.real.toString()).toBe('5');
    expect(value.imaginary.toString()).toBe('3.75');
    expect(complexMagnitude(complex(3, 4)).toString()).toBe('5');
  });
});

describe('MathPro X DMS conversions', () => {
  it('converts degrees, minutes and seconds to decimal degrees', () => {
    const value = dmsToDecimalDegrees('30', '15', '20');
    expect(Number(value.toString())).toBeCloseTo(30.255555555555556, 12);
  });

  it('formats decimal degrees into a normalized DMS value', () => {
    const formatted = formatDms('30.255555555555556', 2);
    expect(formatted).toBe('30° 15′ 20.00″');
    const parts = decimalDegreesToDms('-12.5', 1);
    expect(parts.degrees).toBe('-12');
    expect(parts.minutes).toBe('30');
  });

  it('parses a DMS literal in the expression AST and evaluates it as degrees', () => {
    const value = evaluateMath('30°15′20″');
    expect(value.formatted).toBe('30° 15′ 20.00″');
    expect(Number(decimalFromDisplayValue(value.value).toString())).toBeCloseTo(30.255555555555556, 12);
    expect(Number(evaluateToString('30°15′20″+0.5'))).toBeCloseTo(30.755555555555556, 12);
  });

  it('rejects invalid DMS minute and second fields', () => {
    expect(() => dmsToDecimalDegrees(10, 60, 0)).toThrow(/minutes/i);
    expect(() => dmsToDecimalDegrees(10, 0, 60)).toThrow(/seconds/i);
  });
});

describe('MathPro X AST evaluator arithmetic and calculator rules', () => {
  it('evaluates arithmetic precedence and configurable implicit multiplication', () => {
    expect(evaluateToString('2+3*4')).toBe('14');
    expect(Number(evaluateToString('1/2π'))).toBeCloseTo(Math.PI / 2, 12);
    expect(Number(evaluateToString('1/2π', { implicitMultiplicationPriority: 'higher-than-division' })))
      .toBeCloseTo(1 / (2 * Math.PI), 12);
    expect(evaluateToString('2(3+4)')).toBe('14');
  });

  it('supports relative and literal percentage modes', () => {
    expect(evaluateToString('100+20%')).toBe('120');
    expect(evaluateToString('100-20%')).toBe('80');
    expect(evaluateToString('100+20%', { percentageMode: 'literal' })).toBe('100.2');
    expect(evaluateToString('20%')).toBe('0.2');
    expect(evaluateToString('100*20%')).toBe('20');
  });

  it('repairs missing parentheses and tolerates trailing plus or minus', () => {
    expect(evaluateToString('3+2)5')).toBe('25');
    expect(evaluateToString('3+4+')).toBe('7');
    expect(evaluateToString('3+4-')).toBe('7');
  });

  it('respects degree, radian and gradian trigonometry', () => {
    expect(Number(evaluateToString('sin(30)', { angleMode: 'DEG' }))).toBeCloseTo(0.5, 12);
    expect(Number(evaluateToString('sin(pi/2)', { angleMode: 'RAD' }))).toBeCloseTo(1, 12);
    expect(Number(evaluateToString('sin(100)', { angleMode: 'GRAD' }))).toBeCloseTo(1, 12);
    expect(evaluateToString('asin(0.5)', { angleMode: 'DEG' })).toBe('30');
  });

  it('supports factorial, combinations, permutations, modulo and logarithms', () => {
    expect(evaluateToString('5!')).toBe('120');
    expect(evaluateToString('10 nCr 3')).toBe('120');
    expect(evaluateToString('10 nPr 3')).toBe('720');
    expect(evaluateToString('17 mod 5')).toBe('2');
    expect(evaluateToString('log(1000)')).toBe('3');
    expect(evaluateToString('ln(e)')).toBe('1');
    expect(evaluateToString('logBase(8,2)')).toBe('3');
  });

  it('supports custom variables, Ans and PreAns', () => {
    expect(evaluateToString('a*x+Ans+PreAns', {
      variables: { a: 3, x: 4 },
      ans: 5,
      preAns: 6
    })).toBe('23');
    expect(evaluateToString('userVariable+2', { variables: { userVariable: '3.5' } })).toBe('5.5');
  });

  it('supports Boolean comparisons and short-circuit logical operations', () => {
    expect(evaluateToString('2<3')).toBe('true');
    expect(evaluateToString('2>=3')).toBe('false');
    expect(evaluateToString('2<3 and 4>1')).toBe('true');
    expect(evaluateToString('2>3 or 4>1')).toBe('true');
    expect(evaluateToString('2>3 xor 4>1')).toBe('true');
  });

  it('evaluates finite summations and products with scoped index variables', () => {
    expect(evaluateToString('Σ(i,1,5,i)')).toBe('15');
    expect(evaluateToString('Π(i,1,4,i)')).toBe('24');
    expect(evaluateToString('sum(1,2,3,4)')).toBe('10');
    expect(evaluateToString('product(2,3,4)')).toBe('24');
  });

  it('evaluates numerical derivative, definite integral and limit', () => {
    expect(Number(evaluateToString('derivative(x^2,x,3'))).toBeCloseTo(6, 8);
    expect(Number(evaluateToString('d/dx(x^3,2'))).toBeCloseTo(12, 7);
    expect(Number(evaluateToString('integral(x^2,x,0,1,200'))).toBeCloseTo(1 / 3, 10);
    expect(Number(evaluateToString('limit((x^2-1)/(x-1),x,1'))).toBeCloseTo(2, 8);
  });

  it('constructs matrices and evaluates matrix functions and products', () => {
    expect(evaluateToString('det([[1,2],[3,4]])')).toBe('-2');
    const inverse = evaluateMath('inverse([[1,2],[3,4]])').value;
    expect(inverse.kind).toBe('matrix');
    expect(evaluateToString('transpose([[1,2],[3,4]])')).toBe('[[1, 3], [2, 4]]');
    expect(evaluateToString('[[1,2],[3,4]]*[[2,0],[1,2]]')).toBe('[[4, 4], [10, 8]]');
  });

  it('rejects unknown identifiers and invalid numeric operations clearly', () => {
    expect(() => evaluateMath('unlistedVariable+1')).toThrow(/Unknown variable/i);
    expect(() => evaluateMath('1/0')).toThrow(/Division by zero/i);
    expect(() => evaluateMath('5.5!')).toThrow(/integer/i);
  });

  it('supports finite random functions with an injectable random source', () => {
    expect(evaluateToString('random()', { random: () => 0.25 })).toBe('0.25');
    expect(evaluateToString('ranInt(3,7)', { random: () => 0.99 })).toBe('7');
  });

  it('supports the public evaluation helpers', () => {
    const result = evaluateWithContext('2*x+1', { x: 4 });
    expect(result.formatted).toBe('9');
    expect(toNumber(result.value)).toBe(9);
  });
});
