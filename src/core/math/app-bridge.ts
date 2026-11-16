import {
  decimal,
  evaluateMath,
  isComplexValue,
  isDecimalValue,
  isMatrixValue,
  isSexagesimalValue,
  valueToDisplayString,
  type AngleMode,
  type MathValue,
  type NumericInput
} from './evaluator';
import {
  differentiateSymbolic,
  integrateSymbolic as integrateSymbolicCas,
  solveSymbolicEquation
} from './symbolic/cas';
import {
  convertBase as convertBaseExact,
  type BaseConversionResult,
  type SupportedBase
} from './numeric/base-conversion';

export type { AngleMode, BaseConversionResult, SupportedBase };

function toMathValue(value: unknown): MathValue {
  if (typeof value === 'boolean' || isDecimalValue(value)) return value;
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint') {
    return decimal(value as NumericInput);
  }
  if (isComplexValue(value as MathValue) ||
      isMatrixValue(value as MathValue) ||
      isSexagesimalValue(value as MathValue)) {
    return value as MathValue;
  }
  throw new TypeError('The calculator answer must be a numeric, complex, matrix, DMS, or Boolean value.');
}

/**
 * Compatibility adapter used by the existing React calculator.
 * The calculation itself is performed by the typed AST evaluator.
 */
export function evaluateRaw(
  source: string,
  angle: AngleMode = 'DEG',
  ans: unknown = 0
): MathValue {
  return evaluateMath(source, {
    angleMode: angle,
    ans: toMathValue(ans)
  }).value;
}

export function formatResult(value: unknown): string {
  return valueToDisplayString(toMathValue(value));
}

export function differentiate(source: string, variable = 'x'): string {
  return differentiateSymbolic(source, variable);
}

export function integrateSymbolic(source: string, variable = 'x'): string {
  return integrateSymbolicCas(source, variable);
}

export function solveEquation(source: string, variable = 'x'): string[] {
  const solution = solveSymbolicEquation(source, variable);
  if (solution.roots.length > 0) return [...solution.roots];
  if (solution.unresolved) {
    return ['No supported closed-form root was returned: ' + solution.unresolved];
  }
  return ['No supported closed-form root was returned.'];
}

export function convertBase(
  input: string,
  from: SupportedBase
): BaseConversionResult {
  return convertBaseExact(input, from);
}