import type { Decimal } from 'decimal.js';
import { decimal, type NumericInput } from '../evaluator/value';
import type { SupportedBase } from '../numeric/base-conversion';

export type NumberNotation = 'NORM' | 'FIX' | 'SCI' | 'ENG';

export interface NumberFormatOptions {
  readonly notation?: NumberNotation;
  readonly digits?: number;
  readonly grouping?: boolean;
  readonly groupSeparator?: string;
  readonly decimalSeparator?: '.' | ',';
  readonly trimTrailingZeros?: boolean;
  readonly radix?: SupportedBase;
  readonly radixPrefix?: boolean;
}

function validateDigits(digits: number): void {
  if (!Number.isInteger(digits) || digits < 0 || digits > 100) {
    throw new Error('Digits must be an integer from 0 to 100.');
  }
}

function trimFractionZeros(value: string): string {
  const exponentIndex = value.search(/[eE]/);
  const mantissa = exponentIndex >= 0 ? value.slice(0, exponentIndex) : value;
  const exponent = exponentIndex >= 0 ? value.slice(exponentIndex) : '';
  if (!mantissa.includes('.')) return value;
  const trimmed = mantissa.replace(/0+$/, '').replace(/\.$/, '');
  return trimmed + exponent;
}

function groupIntegerPart(value: string, separator: string, size: number): string {
  const sign = value.startsWith('-') ? '-' : '';
  const digits = sign ? value.slice(1) : value;
  const chunks: string[] = [];
  for (let end = digits.length; end > 0; end -= size) {
    chunks.unshift(digits.slice(Math.max(0, end - size), end));
  }
  return sign + chunks.join(separator);
}

function groupMantissa(value: string, options: NumberFormatOptions): string {
  const decimalSeparator = options.decimalSeparator ?? '.';
  const groupSeparator = options.groupSeparator ?? (decimalSeparator === '.' ? ',' : '.');
  if (decimalSeparator === groupSeparator) {
    throw new Error('Decimal and grouping separators must be different.');
  }

  const exponentIndex = value.search(/[eE]/);
  let mantissa = exponentIndex >= 0 ? value.slice(0, exponentIndex) : value;
  const exponent = exponentIndex >= 0 ? value.slice(exponentIndex) : '';
  if (options.trimTrailingZeros !== false) mantissa = trimFractionZeros(mantissa);

  const parts = mantissa.split('.');
  let integer = parts[0] ?? '';
  const fraction = parts[1];
  if (options.grouping) integer = groupIntegerPart(integer, groupSeparator, 3);
  const formattedMantissa = fraction === undefined
    ? integer
    : integer + decimalSeparator + fraction;
  return formattedMantissa + exponent;
}

function decimalNotation(value: Decimal, notation: NumberNotation, digits: number): string {
  if (value.isZero()) {
    return notation === 'FIX' && digits > 0 ? '0.' + '0'.repeat(digits) : '0';
  }

  switch (notation) {
    case 'FIX':
      return value.toFixed(digits);
    case 'SCI':
      return value.toExponential(Math.max(0, digits - 1));
    case 'ENG': {
      const exponentText = value.abs().toExponential(0);
      const exponentMatch = /e([+-]?\d+)$/i.exec(exponentText);
      const exponent = exponentMatch ? Number(exponentMatch[1]) : 0;
      const engineeringExponent = Math.floor(exponent / 3) * 3;
      const scale = decimal(10).pow(engineeringExponent);
      const mantissa = value.div(scale);
      const integerDigits = Math.max(1, mantissa.abs().e + 1);
      const fractionalDigits = Math.max(0, digits - integerDigits);
      return mantissa.toFixed(fractionalDigits) + 'e' +
        (engineeringExponent >= 0 ? '+' : '') + String(engineeringExponent);
    }
    case 'NORM':
    default:
      return value.toSignificantDigits(Math.max(1, digits)).toString();
  }
}

function radixGrouping(value: string, separator: string, size: number): string {
  const chunks: string[] = [];
  for (let end = value.length; end > 0; end -= size) {
    chunks.unshift(value.slice(Math.max(0, end - size), end));
  }
  return chunks.join(separator);
}

function formatRadix(value: Decimal, base: SupportedBase, options: NumberFormatOptions): string {
  if (!value.isInteger()) {
    throw new Error('Binary, octal and hexadecimal display currently require an integer value.');
  }
  const integer = BigInt(value.toFixed(0));
  const negative = integer < 0n;
  const absolute = negative ? -integer : integer;
  const raw = absolute.toString(base).toUpperCase();
  const groupSize = base === 2 ? 4 : base === 8 ? 3 : base === 10 ? 3 : 4;
  const groupSeparator = options.groupSeparator ?? ' ';
  const grouped = options.grouping ? radixGrouping(raw, groupSeparator, groupSize) : raw;
  const prefix = options.radixPrefix
    ? ({ 2: '0b', 8: '0o', 10: '0d', 16: '0x' } as const)[base]
    : '';
  return (negative ? '-' : '') + prefix + grouped;
}

export function formatNumber(
  input: NumericInput | Decimal,
  options: NumberFormatOptions = {}
): string {
  const notation = options.notation ?? 'NORM';
  const digits = options.digits ?? 10;
  validateDigits(digits);
  const value = decimal(input as NumericInput);
  if (!value.isFinite()) return value.toString();

  const radix = options.radix ?? 10;
  if (radix !== 10) return formatRadix(value, radix, options);

  const raw = decimalNotation(value, notation, digits);
  return groupMantissa(raw, options);
}

export function formatFixed(
  input: NumericInput | Decimal,
  decimalPlaces = 2,
  options: Omit<NumberFormatOptions, 'notation' | 'digits'> = {}
): string {
  return formatNumber(input, { ...options, notation: 'FIX', digits: decimalPlaces });
}

export function formatScientific(
  input: NumericInput | Decimal,
  significantDigits = 6,
  options: Omit<NumberFormatOptions, 'notation' | 'digits'> = {}
): string {
  return formatNumber(input, { ...options, notation: 'SCI', digits: significantDigits });
}

export function formatEngineering(
  input: NumericInput | Decimal,
  significantDigits = 6,
  options: Omit<NumberFormatOptions, 'notation' | 'digits'> = {}
): string {
  return formatNumber(input, { ...options, notation: 'ENG', digits: significantDigits });
}