import type { SourcePosition, SourceSpan } from './nodes';

export type TokenKind =
  | 'number' | 'identifier' | 'operator'
  | 'leftParen' | 'rightParen'
  | 'leftBracket' | 'rightBracket'
  | 'comma' | 'semicolon' | 'bar' | 'eof';

export interface Token {
  readonly kind: TokenKind;
  readonly lexeme: string;
  readonly value?: string;
  readonly radix?: 2 | 8 | 10 | 16;
  readonly span: SourceSpan;
  readonly synthetic?: boolean;
}

export interface TokenizerOptions {
  readonly decimalSeparator?: '.' | ',';
  readonly argumentSeparator?: ',' | ';';
}

export class TokenizerError extends Error {
  readonly position: SourcePosition;

  constructor(message: string, position: SourcePosition) {
    super(message + ' at line ' + position.line + ', column ' + position.column + '.');
    this.name = 'TokenizerError';
    this.position = position;
  }
}

const WORD_OPERATORS = new Set(['mod', 'nCr', 'nPr', 'and', 'or', 'xor']);
const WORD_ALIASES: Readonly<Record<string, string>> = {
  ans: 'ans',
  preans: 'preAns',
  pi: 'pi',
  tau: 'tau',
  infinity: 'Infinity',
  inf: 'Infinity',
  ln: 'ln',
  log: 'log',
  log10: 'log10',
  ncr: 'nCr',
  npr: 'nPr',
  mod: 'mod',
  and: 'and',
  or: 'or',
  xor: 'xor',
  not: 'not',
  sigma: 'sum',
  product: 'product',
  limit: 'limit',
  lim: 'limit',
  integral: 'integral',
  derivative: 'derivative',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  cot: 'cot',
  sec: 'sec',
  csc: 'csc',
  asin: 'asin',
  acos: 'acos',
  atan: 'atan',
  acot: 'acot',
  asec: 'asec',
  acsc: 'acsc',
  sinh: 'sinh',
  cosh: 'cosh',
  tanh: 'tanh',
  asinh: 'asinh',
  acosh: 'acosh',
  atanh: 'atanh',
  sqrt: 'sqrt',
  cbrt: 'cbrt',
  nthroot: 'nthRoot',
  abs: 'abs',
  floor: 'floor',
  ceil: 'ceil',
  round: 'round',
  trunc: 'trunc',
  sign: 'sign',
  exp: 'exp',
  log10: 'log10',
  logbase: 'logBase',
  factorial: 'factorial',
  gcd: 'gcd',
  lcm: 'lcm',
  min: 'min',
  max: 'max',
  mean: 'mean',
  median: 'median',
  mode: 'mode',
  variance: 'variance',
  stddev: 'stddev',
  hypot: 'hypot',
  pow: 'pow',
  det: 'det',
  inverse: 'inverse',
  transpose: 'transpose',
  conjugate: 'conjugate',
  real: 'real',
  re: 'real',
  imaginary: 'imaginary',
  imag: 'imaginary',
  im: 'imaginary',
  argument: 'argument',
  vector: 'vector',
  matrix: 'matrix',
  normal: 'normal',
  binomial: 'binomial',
  poisson: 'poisson',
  uniform: 'uniform',
  random: 'random',
  randint: 'ranInt'
};

const SYMBOL_ALIASES: Readonly<Record<string, string>> = {
  'π': 'pi',
  'τ': 'tau',
  '∞': 'Infinity',
  'Σ': 'sum',
  '∑': 'sum',
  'Π': 'product',
  '∏': 'product',
  '∫': 'integral',
  'θ': 'theta',
  'α': 'alpha',
  'β': 'beta',
  'γ': 'gamma',
  'Δ': 'delta',
  '°': 'deg',
  '′': 'arcmin',
  "'": 'arcmin',
  '″': 'arcsec',
  '"': 'arcsec'
};

const OPERATOR_ALIASES: Readonly<Record<string, string>> = {
  '×': '*',
  '·': '*',
  '⋅': '*',
  '÷': '/',
  '−': '-',
  '–': '-',
  '—': '-',
  '≤': '<=',
  '≥': '>=',
  '≠': '!=',
  '≈': '==',
  '√': 'sqrt',
  '∛': 'cbrt',
  '∣': '|'
};

function isIdentifierStart(value: string): boolean {
  return value === '_' || /\p{L}/u.test(value);
}

function isIdentifierPart(value: string): boolean {
  return value === '_' || /\p{L}|\p{N}/u.test(value);
}

function isDigit(value: string): boolean {
  return value >= '0' && value <= '9';
}

function makePosition(offset: number, line: number, column: number): SourcePosition {
  return { offset, line, column };
}

export function tokenize(source: string, options: TokenizerOptions = {}): Token[] {
  const decimalSeparator = options.decimalSeparator ?? '.';
  const argumentSeparator = options.argumentSeparator ?? (decimalSeparator === ',' ? ';' : ',');
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  const position = (): SourcePosition => makePosition(offset, line, column);
  const spanFrom = (start: SourcePosition): SourceSpan => ({ start, end: position() });
  const peek = (distance = 0): string => source[offset + distance] ?? '';
  const advance = (): string => {
    const value = source[offset] ?? '';
    offset += 1;
    if (value === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return value;
  };
  const emit = (
    kind: TokenKind,
    lexeme: string,
    value: string | undefined,
    start: SourcePosition,
    radix?: 2 | 8 | 10 | 16
  ): void => {
    tokens.push({ kind, lexeme, value, radix, span: spanFrom(start) });
  };

  while (offset < source.length) {
    const current = peek();

    if (/\s/u.test(current)) {
      advance();
      continue;
    }

    const start = position();

    if (source.startsWith('³√', offset)) {
      advance();
      advance();
      emit('operator', '³√', 'cbrt', start);
      continue;
    }
    if (source.startsWith('ⁿ√', offset)) {
      advance();
      advance();
      emit('operator', 'ⁿ√', 'nthRoot', start);
      continue;
    }

    if (isDigit(current) || (current === decimalSeparator && isDigit(peek(1)))) {
      let radix: 2 | 8 | 10 | 16 = 10;
      let lexeme = '';

      if (current === '0' && /[xXbBoO]/u.test(peek(1))) {
        const prefix = peek(1).toLowerCase();
        radix = prefix === 'x' ? 16 : prefix === 'b' ? 2 : 8;
        lexeme += advance() + advance();
        const digitPattern = radix === 16 ? /[0-9a-fA-F_]/u : radix === 8 ? /[0-7_]/u : /[01_]/u;
        let previousUnderscore = false;
        let digits = 0;
        while (digitPattern.test(peek())) {
          const value = advance();
          if (value === '_' && (previousUnderscore || digits === 0)) {
            throw new TokenizerError('Invalid numeric digit separator', position());
          }
          previousUnderscore = value === '_';
          if (value !== '_') digits += 1;
          lexeme += value;
        }
        if (digits === 0 || previousUnderscore) {
          throw new TokenizerError('Expected digits after the base prefix', start);
        }
        emit('number', lexeme, lexeme.replaceAll('_', ''), start, radix);
        continue;
      }

      let seenDecimal = false;
      let previousUnderscore = false;
      while (isDigit(peek()) || peek() === '_' || (!seenDecimal && peek() === decimalSeparator)) {
        const value = advance();
        if (value === '_') {
          if (previousUnderscore || lexeme.length === 0 || !isDigit(peek(0))) {
            throw new TokenizerError('Invalid numeric digit separator', position());
          }
          previousUnderscore = true;
          lexeme += value;
          continue;
        }
        if (value === decimalSeparator) {
          if (previousUnderscore) throw new TokenizerError('A separator cannot precede a decimal point', position());
          seenDecimal = true;
          previousUnderscore = false;
          lexeme += value;
          continue;
        }
        previousUnderscore = false;
        lexeme += value;
      }

      if (previousUnderscore) throw new TokenizerError('A number cannot end with a digit separator', position());

      if ((peek() === 'e' || peek() === 'E') &&
          (isDigit(peek(1)) || ((peek(1) === '+' || peek(1) === '-') && isDigit(peek(2))))) {
        lexeme += advance();
        if (peek() === '+' || peek() === '-') lexeme += advance();
        while (isDigit(peek()) || peek() === '_') lexeme += advance();
      }

      const normalized = lexeme.replaceAll('_', '').replace(decimalSeparator, '.');
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(normalized)) {
        throw new TokenizerError('Invalid numeric literal', start);
      }
      emit('number', lexeme, normalized, start, 10);
      continue;
    }

    if (source.startsWith('d/dx', offset) || source.startsWith('d/dt', offset) ||
        source.startsWith('d/dy', offset) || source.startsWith('d/dz', offset)) {
      const match = /^d\/d([xyzt])/u.exec(source.slice(offset));
      if (match) {
        for (let index = 0; index < match[0].length; index += 1) advance();
        emit('identifier', match[0], 'derivative', start);
        continue;
      }
    }

    if (SYMBOL_ALIASES[current] !== undefined) {
      advance();
      const value = SYMBOL_ALIASES[current];
      if (value === '|' ) emit('bar', current, value, start);
      else emit('identifier', current, value, start);
      continue;
    }

    if (current === '√' || current === '∛') {
      advance();
      emit('operator', current, OPERATOR_ALIASES[current], start);
      continue;
    }

    if (isIdentifierStart(current)) {
      let lexeme = advance();
      while (isIdentifierPart(peek())) lexeme += advance();
      const lowered = lexeme.toLowerCase();
      const value = WORD_ALIASES[lowered] ?? lexeme;
      if (WORD_OPERATORS.has(value)) emit('operator', lexeme, value, start);
      else if (value === 'not') emit('operator', lexeme, 'not', start);
      else emit('identifier', lexeme, value, start);
      continue;
    }

    const twoCharacterOperator = source.slice(offset, offset + 2);
    const operatorValue = twoCharacterOperator === '**' ? '^' :
      twoCharacterOperator === '&&' ? 'and' :
      twoCharacterOperator === '||' ? 'or' :
      ['<=', '>=', '!=', '=='].includes(twoCharacterOperator) ? twoCharacterOperator : undefined;

    if (operatorValue !== undefined) {
      advance();
      advance();
      emit('operator', twoCharacterOperator, operatorValue, start);
      continue;
    }

    const aliasedOperator = OPERATOR_ALIASES[current];
    if (aliasedOperator !== undefined) {
      advance();
      if (aliasedOperator === '|') emit('bar', current, aliasedOperator, start);
      else emit('operator', current, aliasedOperator, start);
      continue;
    }

    if (current === argumentSeparator) {
      advance();
      emit(current === ',' ? 'comma' : 'semicolon', current, current, start);
      continue;
    }

    if ('+-*/^%!<>:='.includes(current)) {
      advance();
      emit('operator', current, current, start);
      continue;
    }

    if (current === '(') {
      advance();
      emit('leftParen', current, current, start);
      continue;
    }
    if (current === ')') {
      advance();
      emit('rightParen', current, current, start);
      continue;
    }
    if (current === '[') {
      advance();
      emit('leftBracket', current, current, start);
      continue;
    }
    if (current === ']') {
      advance();
      emit('rightBracket', current, current, start);
      continue;
    }
    if (current === ';' && argumentSeparator !== ';') {
      advance();
      emit('semicolon', current, current, start);
      continue;
    }
    if (current === '|') {
      advance();
      emit('bar', current, current, start);
      continue;
    }

    throw new TokenizerError('Unexpected character "' + current + '"', start);
  }

  const end = position();
  tokens.push({ kind: 'eof', lexeme: '', value: undefined, span: { start: end, end } });
  return tokens;
}
