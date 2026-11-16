import { describe, expect, it } from 'vitest';
import {
  differentiateSymbolic,
  expandSymbolic,
  factorSymbolic,
  integrateSymbolic,
  simplifySymbolic,
  solveSymbolicEquation,
  solveSymbolicSystem
} from './cas';
import {
  getPolynomialRepresentation,
  orderPolynomial,
  polynomialCoefficient
} from './polynomial';

describe('MathPro X symbolic CAS', () => {
  it('simplifies rational expressions and standard trigonometric identities', () => {
    expect(simplifySymbolic('(x^2-1)/(x-1)').output).toContain('x');
    expect(simplifySymbolic('sin(x)^2+cos(x)^2').output).toBe('1');
  });

  it('expands and factors polynomial expressions', () => {
    expect(expandSymbolic('(x+1)^3').output).toContain('x^3');
    expect(factorSymbolic('x^2+5*x+6').output).toContain('(x+2)');
    expect(factorSymbolic('x^2+5*x+6').output).toContain('(x+3)');
  });

  it('differentiates and integrates with a selected variable', () => {
    expect(differentiateSymbolic('x^3+2*x')).toContain('3*x^2');
    expect(differentiateSymbolic('x^3', 'x', 2)).toContain('6*x');
    expect(integrateSymbolic('2*x', 'x')).toContain('x^2');
  });

  it('solves univariate equations and returns roots as symbolic strings', () => {
    const solution = solveSymbolicEquation('x^2-5*x+6=0', 'x');
    expect(solution.variable).toBe('x');
    expect(solution.roots).toHaveLength(2);
    expect(solution.roots.join(',')).toMatch(/2/);
    expect(solution.roots.join(',')).toMatch(/3/);
  });

  it('solves a linear system and exposes its variable assignments', () => {
    const solution = solveSymbolicSystem(['x+y=5', 'x-y=1'], ['x', 'y']);
    expect(solution.assignments).toHaveLength(1);
    expect(solution.assignments[0].x).toBe('3');
    expect(solution.assignments[0].y).toBe('2');
  });

  it('extracts polynomial degree and ascending coefficients', () => {
    const polynomial = getPolynomialRepresentation('x^3-2*x+5', 'x');
    expect(polynomial.degree).toBe(3);
    expect(polynomial.coefficientsAscending).toEqual(['5', '-2', '0', '1']);
    expect(polynomialCoefficient('3*x^2+2*x+1', 'x', 2)).toBe('3');
    expect(orderPolynomial('(x+1)^2', 'x')).toContain('x^2');
  });

  it('rejects invalid symbolic variables and non-polynomial coefficient requests', () => {
    expect(() => differentiateSymbolic('x^2', 'x;alert')).toThrow(/variable/i);
    expect(() => getPolynomialRepresentation('sin(x)', 'x')).toThrow(/polynomial/i);
  });

  it('rejects oversized or unsafe symbolic input', () => {
    expect(() => simplifySymbolic('x+1;notAllowed')).toThrow(/unsupported/i);
    expect(() => simplifySymbolic('x'.repeat(4097))).toThrow(/too long/i);
  });
});