import { all, create } from 'mathjs';
import type { Decimal } from 'decimal.js';

export const numericMath = create(all, {
  number: 'BigNumber',
  precision: 100,
  relTol: 1e-90,
  absTol: 1e-95,
  predictable: false
});

export type DecimalValue = Decimal;

export interface ComplexValue {
  readonly kind: 'complex';
  readonly real: DecimalValue;
  readonly imaginary: DecimalValue;
}

export interface SexagesimalValue {
  readonly kind: 'sexagesimal';
  readonly totalDegrees: DecimalValue;
  readonly degrees: string;
  readonly minutes: string;
  readonly seconds: string;
}

export interface MatrixValue {
  readonly kind: 'matrix';
  readonly rows: readonly (readonly MathValue[])[];
}

export type MathValue = DecimalValue | ComplexValue | SexagesimalValue | MatrixValue | boolean;
export type NumericInput = DecimalValue | number | string | bigint;

export function decimal(value: NumericInput): DecimalValue {
  if (isDecimalValue(value)) return value;
  return numericMath.bignumber(value.toString()) as DecimalValue;
}

export function isDecimalValue(value: unknown): value is DecimalValue {
  return typeof value === 'object' &&
    value !== null &&
    (value as { isBigNumber?: boolean }).isBigNumber === true;
}

export function isComplexValue(value: MathValue): value is ComplexValue {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'complex';
}

export function isSexagesimalValue(value: MathValue): value is SexagesimalValue {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'sexagesimal';
}

export function isMatrixValue(value: MathValue): value is MatrixValue {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'matrix';
}

export function isRealValue(value: MathValue): value is DecimalValue | SexagesimalValue {
  return isDecimalValue(value) || isSexagesimalValue(value);
}

export function asDecimal(value: MathValue | NumericInput): DecimalValue {
  if (isDecimalValue(value)) return value;
  if (typeof value === 'object' && value !== null && 'kind' in value &&
      (value as { kind?: string }).kind === 'sexagesimal') {
    return (value as SexagesimalValue).totalDegrees;
  }
  if (typeof value === 'boolean') return decimal(value ? 1 : 0);
  if (typeof value === 'object') {
    throw new TypeError('A complex number or matrix cannot be used as a real scalar.');
  }
  return decimal(value as NumericInput);
}

export function addDecimal(left: NumericInput, right: NumericInput): DecimalValue {
  return numericMath.add(decimal(left), decimal(right)) as DecimalValue;
}

export function subtractDecimal(left: NumericInput, right: NumericInput): DecimalValue {
  return numericMath.subtract(decimal(left), decimal(right)) as DecimalValue;
}

export function multiplyDecimal(left: NumericInput, right: NumericInput): DecimalValue {
  return numericMath.multiply(decimal(left), decimal(right)) as DecimalValue;
}

export function divideDecimal(left: NumericInput, right: NumericInput): DecimalValue {
  if (numericMath.equal(decimal(right), 0)) throw new RangeError('Division by zero is undefined.');
  return numericMath.divide(decimal(left), decimal(right)) as DecimalValue;
}

export function powerDecimal(base: NumericInput, exponent: NumericInput): DecimalValue {
  return numericMath.pow(decimal(base), decimal(exponent)) as DecimalValue;
}

export function squareRootDecimal(value: NumericInput): DecimalValue {
  if (numericMath.smaller(decimal(value), 0)) throw new RangeError('A negative real number has no real square root.');
  return numericMath.sqrt(decimal(value)) as DecimalValue;
}

export function compareDecimal(left: NumericInput, right: NumericInput): -1 | 0 | 1 {
  const comparison = numericMath.compare(decimal(left), decimal(right));
  return comparison < 0 ? -1 : comparison > 0 ? 1 : 0;
}

export function toFiniteNumber(value: NumericInput): number {
  const result = Number(decimal(value).toString());
  if (!Number.isFinite(result)) throw new RangeError('The value is outside the supported finite numeric range.');
  return result;
}

export function decimalString(value: NumericInput, precision = 100): string {
  let normalized = decimal(value);
  const nearestInteger = numericMath.round(normalized) as DecimalValue;
  const roundingError = numericMath.abs(numericMath.subtract(normalized, nearestInteger));
  if (numericMath.smaller(roundingError, decimal('1e-80'))) normalized = nearestInteger;

  return numericMath.format(normalized, {
    precision,
    lowerExp: -12,
    upperExp: 100,
    notation: 'auto'
  });
}

export function integerBigInt(value: MathValue, label = 'value'): bigint {
  const scalar = asDecimal(value);
  const text = scalar.toFixed(0);
  if (!/^-?\d+$/u.test(text) || !numericMath.equal(scalar, numericMath.bignumber(text))) {
    throw new RangeError(label + ' must be an integer.');
  }
  return BigInt(text);
}

export function factorialBigInt(value: bigint): bigint {
  if (value < 0n) throw new RangeError('Factorial is defined here only for non-negative integers.');
  if (value > 10000n) throw new RangeError('Factorial input exceeds the supported limit of 10000.');
  let result = 1n;
  for (let factor = 2n; factor <= value; factor += 1n) result *= factor;
  return result;
}

export function gcdBigInt(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function lcmBigInt(left: bigint, right: bigint): bigint {
  if (left === 0n || right === 0n) return 0n;
  const result = (left / gcdBigInt(left, right)) * right;
  return result < 0n ? -result : result;
}

export function isTruthy(value: MathValue): boolean {
  if (typeof value === 'boolean') return value;
  if (isComplexValue(value)) {
    return !numericMath.equal(value.real, 0) || !numericMath.equal(value.imaginary, 0);
  }
  if (isMatrixValue(value)) return value.rows.length > 0;
  return !numericMath.equal(asDecimal(value), 0);
}

export function valueToString(value: MathValue): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (isComplexValue(value)) {
    const realPart = decimalString(value.real);
    const imaginaryMagnitude = decimalString(numericMath.abs(value.imaginary) as DecimalValue);
    const sign = numericMath.smaller(value.imaginary, 0) ? '-' : '+';
    return realPart + sign + imaginaryMagnitude + 'i';
  }
  if (isSexagesimalValue(value)) return value.degrees + '°' + value.minutes + '′' + value.seconds + '″';
  if (isMatrixValue(value)) {
    return '[' + value.rows.map(row => '[' + row.map(valueToString).join(', ') + ']').join(', ') + ']';
  }
  return decimalString(value);
}
