export type SupportedBase = 2 | 8 | 10 | 16;

export interface BaseConversionOptions {
  readonly maxFractionDigits?: number;
}

export interface BaseConversionResult {
  readonly input: string;
  readonly from: SupportedBase;
  readonly binary: string;
  readonly octal: string;
  readonly decimal: string;
  readonly hexadecimal: string;
  readonly isExact: boolean;
}

interface RationalValue {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

const DIGITS = '0123456789ABCDEF';
const PREFIXES: Record<SupportedBase, string> = {
  2: '0b',
  8: '0o',
  10: '0d',
  16: '0x'
};

function gcdBigInt(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function digitValue(character: string): number {
  const code = character.toUpperCase().charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 70) return code - 55;
  return -1;
}

function parseDigits(value: string, base: SupportedBase): bigint {
  if (!value) return 0n;
  let total = 0n;
  const radix = BigInt(base);
  for (const character of value) {
    const digit = digitValue(character);
    if (digit < 0 || digit >= base) {
      throw new Error('The digit "' + character + '" is not valid in base ' + base + '.');
    }
    total = total * radix + BigInt(digit);
  }
  return total;
}

function parseRational(source: string, base: SupportedBase): RationalValue {
  let input = source.trim().replaceAll('_', '').replace(/\s+/g, '');
  if (!input) throw new Error('Enter a number to convert.');
  if (input.length > 2048) throw new Error('The input is too long (maximum 2048 characters).');

  let negative = false;
  if (input.startsWith('-') || input.startsWith('+')) {
    negative = input.startsWith('-');
    input = input.slice(1);
  }

  const lower = input.toLowerCase();
  const expectedPrefix = PREFIXES[base];
  if (lower.startsWith(expectedPrefix)) input = input.slice(2);
  else if (/^0[bodx]/i.test(input)) {
    throw new Error('The number prefix does not match the selected source base.');
  }

  if ((input.match(/[.,]/g) ?? []).length > 1 || (input.includes('.') && input.includes(','))) {
    throw new Error('Use one decimal separator only.');
  }
  input = input.replace(',', '.');
  const parts = input.split('.');
  const whole = parts[0] ?? '';
  const fractional = parts[1] ?? '';
  if (!whole && !fractional) throw new Error('Enter at least one digit.');
  if (fractional.length > 1024) throw new Error('The fractional part is too long.');

  const radix = BigInt(base);
  const fractionalDenominator = radix ** BigInt(fractional.length);
  const numerator = parseDigits(whole || '0', base) * fractionalDenominator +
    parseDigits(fractional, base);
  const signedNumerator = negative ? -numerator : numerator;
  if (signedNumerator === 0n) return { numerator: 0n, denominator: 1n };

  const divisor = gcdBigInt(signedNumerator, fractionalDenominator);
  return {
    numerator: signedNumerator / divisor,
    denominator: fractionalDenominator / divisor
  };
}

function integerToBase(value: bigint, base: SupportedBase): string {
  if (value === 0n) return '0';
  const radix = BigInt(base);
  let current = value < 0n ? -value : value;
  let output = '';
  while (current > 0n) {
    const digit = Number(current % radix);
    output = DIGITS[digit] + output;
    current /= radix;
  }
  return output;
}

function rationalToBase(
  value: RationalValue,
  base: SupportedBase,
  maxFractionDigits: number
): { text: string; exact: boolean } {
  const negative = value.numerator < 0n;
  const absoluteNumerator = negative ? -value.numerator : value.numerator;
  const integerPart = absoluteNumerator / value.denominator;
  let remainder = absoluteNumerator % value.denominator;
  const sign = negative && absoluteNumerator !== 0n ? '-' : '';
  const integerText = integerToBase(integerPart, base);

  if (remainder === 0n) return { text: sign + integerText, exact: true };

  const digits: string[] = [];
  const remainderPositions = new Map<bigint, number>();
  const radix = BigInt(base);
  let repeatingAt: number | undefined;

  while (remainder !== 0n && digits.length < maxFractionDigits) {
    const previousPosition = remainderPositions.get(remainder);
    if (previousPosition !== undefined) {
      repeatingAt = previousPosition;
      break;
    }
    remainderPositions.set(remainder, digits.length);
    remainder *= radix;
    const digit = Number(remainder / value.denominator);
    digits.push(DIGITS[digit]);
    remainder %= value.denominator;
  }

  if (remainder === 0n) {
    return { text: sign + integerText + '.' + digits.join(''), exact: true };
  }

  if (repeatingAt !== undefined) {
    const nonRepeating = digits.slice(0, repeatingAt).join('');
    const repeating = digits.slice(repeatingAt).join('');
    return {
      text: sign + integerText + '.' + nonRepeating + '(' + repeating + ')',
      exact: true
    };
  }

  return {
    text: sign + integerText + '.' + digits.join('') + '…',
    exact: false
  };
}

function validateBase(base: number): asserts base is SupportedBase {
  if (base !== 2 && base !== 8 && base !== 10 && base !== 16) {
    throw new Error('Supported bases are 2, 8, 10 and 16.');
  }
}

export function convertBase(
  input: string,
  from: SupportedBase,
  options: BaseConversionOptions = {}
): BaseConversionResult {
  validateBase(from);
  const maxFractionDigits = options.maxFractionDigits ?? 48;
  if (!Number.isInteger(maxFractionDigits) || maxFractionDigits < 1 || maxFractionDigits > 256) {
    throw new Error('Maximum fractional digits must be an integer from 1 to 256.');
  }

  const value = parseRational(input, from);
  const binary = rationalToBase(value, 2, maxFractionDigits);
  const octal = rationalToBase(value, 8, maxFractionDigits);
  const decimal = rationalToBase(value, 10, maxFractionDigits);
  const hexadecimal = rationalToBase(value, 16, maxFractionDigits);

  return {
    input: input.trim(),
    from,
    binary: binary.text,
    octal: octal.text,
    decimal: decimal.text,
    hexadecimal: hexadecimal.text,
    isExact: binary.exact && octal.exact && decimal.exact && hexadecimal.exact
  };
}

export function parseBaseValue(input: string, base: SupportedBase): string {
  validateBase(base);
  const value = parseRational(input, base);
  if (value.denominator !== 1n) {
    throw new Error('This operation requires an integer value.');
  }
  return value.numerator.toString(10);
}