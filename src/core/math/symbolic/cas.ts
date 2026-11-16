import {
  expressionText,
  normalizeSymbolicInput,
  symbolicEngine,
  validateSymbolicVariable,
  type SymbolicDictionary,
  type SymbolicSolutionSet
} from './nerdamer-adapter';

export type SymbolicOperation = 'simplify' | 'expand' | 'factor';

export interface SymbolicResult {
  readonly operation: SymbolicOperation;
  readonly input: string;
  readonly output: string;
}

export interface EquationSolution {
  readonly variable: string;
  readonly roots: readonly string[];
  readonly unresolved?: string;
  readonly classification: 'symbolic' | 'mixed' | 'numeric' | 'none';
}

export interface SystemSolution {
  readonly variables: readonly string[];
  readonly assignments: readonly Readonly<Record<string, string>>[];
  readonly raw: string;
  readonly methodNote: string;
}

function residualExpression(equation: string): string {
  const input = normalizeSymbolicInput(equation);
  const equalsAt = input.indexOf('=');
  if (equalsAt < 0) return input;
  if (input.indexOf('=', equalsAt + 1) >= 0) {
    throw new Error('An equation must contain only one equals sign.');
  }
  const left = input.slice(0, equalsAt).trim();
  const right = input.slice(equalsAt + 1).trim();
  if (!left || !right) throw new Error('Enter both sides of the equation.');
  return '(' + left + ')-(' + right + ')';
}

export function simplifySymbolic(source: string): SymbolicResult {
  const input = normalizeSymbolicInput(source);
  return { operation: 'simplify', input, output: expressionText(symbolicEngine.simplify(input)) };
}

export function expandSymbolic(source: string): SymbolicResult {
  const input = normalizeSymbolicInput(source);
  return { operation: 'expand', input, output: expressionText(symbolicEngine(input).expand()) };
}

export function factorSymbolic(source: string): SymbolicResult {
  const input = normalizeSymbolicInput(source);
  return { operation: 'factor', input, output: expressionText(symbolicEngine.factor(input)) };
}

export function transformSymbolic(source: string, operation: SymbolicOperation): SymbolicResult {
  switch (operation) {
    case 'simplify': return simplifySymbolic(source);
    case 'expand': return expandSymbolic(source);
    case 'factor': return factorSymbolic(source);
  }
}

export function differentiateSymbolic(source: string, variable = 'x', order = 1): string {
  const input = normalizeSymbolicInput(source);
  const symbol = validateSymbolicVariable(variable);
  if (!Number.isInteger(order) || order < 1 || order > 20) {
    throw new Error('Derivative order must be an integer from 1 to 20.');
  }
  return expressionText(symbolicEngine(input).diff(symbol, order));
}

export function integrateSymbolic(source: string, variable = 'x'): string {
  const input = normalizeSymbolicInput(source);
  const symbol = validateSymbolicVariable(variable);
  return expressionText(symbolicEngine(input).integrate(symbol));
}

export function solveSymbolicEquation(equation: string, variable = 'x'): EquationSolution {
  const symbol = validateSymbolicVariable(variable);
  const residual = residualExpression(equation);
  const result = symbolicEngine.solve(residual, symbol) as SymbolicSolutionSet;
  const roots = (result.elements ?? []).map((root) =>
    expressionText(root as { text(options?: { sort?: boolean }): string })
  );
  const unresolvedText = result.unsolved ? expressionText(result.unsolved) : undefined;
  const solutionType = (result as unknown as { solutionsType?: string }).solutionsType;
  const classification =
    solutionType === 'numeric' || solutionType === 'mixed' || solutionType === 'symbolic'
      ? solutionType
      : roots.length > 0 ? 'symbolic' : 'none';

  return {
    variable: symbol,
    roots,
    ...(unresolvedText ? { unresolved: unresolvedText } : {}),
    classification
  };
}

function isDictionary(value: unknown): value is SymbolicDictionary {
  return typeof value === 'object' && value !== null &&
    typeof (value as SymbolicDictionary).keys === 'function' &&
    typeof (value as SymbolicDictionary).get === 'function';
}

export function solveSymbolicSystem(
  equations: readonly string[],
  variables: readonly string[] = []
): SystemSolution {
  if (equations.length < 1 || equations.length > 12) {
    throw new Error('Enter between 1 and 12 equations.');
  }

  const normalizedEquations = equations.map((equation) => {
    const input = normalizeSymbolicInput(equation);
    if (!input.includes('=')) return input;
    const count = (input.match(/=/g) ?? []).length;
    if (count !== 1) throw new Error('Each equation must contain exactly one equals sign.');
    const parts = input.split('=');
    if (!parts[0].trim() || !parts[1].trim()) throw new Error('Enter both sides of every equation.');
    return input;
  });

  const symbols = variables.map(validateSymbolicVariable);
  if (symbols.length > 12 || new Set(symbols).size !== symbols.length) {
    throw new Error('Provide up to 12 unique variable names.');
  }

  const result = symbolicEngine.solveSystem(normalizedEquations, symbols.length ? symbols : undefined);
  const assignments: Record<string, string>[] = [];

  for (const entry of result.elements ?? []) {
    if (!isDictionary(entry)) continue;
    const assignment: Record<string, string> = {};
    for (const name of entry.keys()) {
      const value = entry.get(name);
      if (value) assignment[name] = expressionText(value);
    }
    assignments.push(assignment);
  }

  return {
    variables: symbols,
    assignments,
    raw: result.text(),
    methodNote: 'Linear and polynomial systems may be solved symbolically. Nonlinear numerical fallback is heuristic and may not find every solution.'
  };
}