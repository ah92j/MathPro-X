import nerdamer from 'nerdamer';

export interface SymbolicExpression {
  text(options?: { sort?: boolean }): string;
  diff(variable?: string, order?: number): SymbolicExpression;
  integrate(variable?: string): SymbolicExpression;
  simplify(): SymbolicExpression;
  expand(): SymbolicExpression;
  factor(): SymbolicExpression;
  isPolynomialLike(): boolean;
  variables(names?: string[]): string[];
  coeffs(...variables: string[]): {
    toArray(): SymbolicExpression[];
    coefficients?: Record<string, SymbolicExpression>;
  };
}

export interface SymbolicVector {
  readonly elements: readonly SymbolicEntity[];
  text(): string;
  count?(): number;
}

export interface SymbolicDictionary {
  keys(): string[];
  get(key: string): SymbolicExpression | undefined;
  text(): string;
}

export type SymbolicEntity = SymbolicExpression | SymbolicDictionary;

export interface SymbolicSolutionSet extends SymbolicVector {
  readonly unsolved?: SymbolicExpression;
  readonly solutions?: readonly SymbolicExpression[];
  generate?(options: { indices?: readonly [number, number] }): SymbolicExpression;
}

export interface NerdamerFacade {
  (input: string): SymbolicExpression;
  simplify(input: string): SymbolicExpression;
  expand(input: string | SymbolicExpression): SymbolicExpression;
  factor(input: string): SymbolicExpression;
  solve(input: string, variable?: string): SymbolicSolutionSet;
  solveSystem(equations: readonly string[], variables?: readonly string[]): SymbolicVector;
  coeffs(input: string | SymbolicExpression, variable?: string): SymbolicVector;
  deg(input: string | SymbolicExpression, variable?: string): SymbolicExpression;
}

export const symbolicEngine = nerdamer as unknown as NerdamerFacade;

export function normalizeSymbolicInput(source: string): string {
  const input = source
    .trim()
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replace(/[−–—]/g, '-')
    .replaceAll('π', 'pi')
    .replaceAll('√', 'sqrt')
    .replace(/\*\*/g, '^')
    .replace(/\s+/g, ' ');

  if (!input) throw new Error('Enter a symbolic mathematical expression.');
  if (input.length > 4096) throw new Error('The symbolic expression is too long (maximum 4096 characters).');
  if (/[;{}'"\\]/.test(input)) throw new Error('The expression contains unsupported characters.');
  if (!/^[A-Za-z0-9_+\-*/^().,[\]<>!=% π√×÷\s]+$/.test(input)) {
    throw new Error('The expression contains unsupported characters.');
  }
  return input;
}

export function validateSymbolicVariable(variable: string): string {
  const name = variable.trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new Error('Use a valid variable name, such as x or theta.');
  }
  return name;
}

export function expressionText(entity: { text(options?: { sort?: boolean }): string }): string {
  const output = entity.text({ sort: true }).trim();
  if (!output) throw new Error('The symbolic engine returned an empty result.');
  return output;
}