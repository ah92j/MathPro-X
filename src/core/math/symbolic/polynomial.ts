import {
  expressionText,
  normalizeSymbolicInput,
  symbolicEngine,
  validateSymbolicVariable
} from './nerdamer-adapter';

export interface PolynomialRepresentation {
  readonly variable: string;
  readonly degree: number;
  readonly coefficientsAscending: readonly string[];
  readonly expanded: string;
  readonly ordered: string;
}

export function getPolynomialRepresentation(
  source: string,
  variable = 'x'
): PolynomialRepresentation {
  const input = normalizeSymbolicInput(source);
  const symbol = validateSymbolicVariable(variable);
  const expression = symbolicEngine(input).expand();

  if (!expression.isPolynomialLike()) {
    throw new Error('The expression is not a polynomial with non-negative integer powers.');
  }

  const degreeText = expressionText(symbolicEngine.deg(expression, symbol));
  const degree = Number(degreeText);
  if (!Number.isSafeInteger(degree) || degree < 0 || degree > 512) {
    throw new Error('Polynomial degree must be between 0 and 512.');
  }

  const coefficientVector = symbolicEngine.coeffs(expression, symbol);
  const coefficients = (coefficientVector.elements ?? []).map((entry) =>
    expressionText(entry as { text(options?: { sort?: boolean }): string })
  );

  if (coefficients.length > degree + 1) coefficients.length = degree + 1;
  while (coefficients.length < degree + 1) coefficients.push('0');

  return {
    variable: symbol,
    degree,
    coefficientsAscending: coefficients,
    expanded: expressionText(expression),
    ordered: expressionText(expression)
  };
}

export function orderPolynomial(source: string, variable = 'x'): string {
  return getPolynomialRepresentation(source, variable).ordered;
}

export function polynomialCoefficient(source: string, variable: string, power: number): string {
  if (!Number.isInteger(power) || power < 0 || power > 512) {
    throw new Error('Coefficient power must be an integer from 0 to 512.');
  }
  const polynomial = getPolynomialRepresentation(source, variable);
  return polynomial.coefficientsAscending[power] ?? '0';
}