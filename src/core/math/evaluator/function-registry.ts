import {
  decimal,
  decimalString,
  factorialBigInt,
  gcdBigInt,
  integerBigInt,
  isComplexValue,
  isMatrixValue,
  numericMath,
  type ComplexValue,
  type DecimalValue,
  type MathValue
} from './value';
import {
  complex,
  complexArgument,
  complexConjugate,
  complexDivide,
  complexExponential,
  complexMagnitude,
  complexLogarithm,
  complexMultiply,
  complexPower,
  complexSine,
  complexCosine,
  complexSquareRoot,
  complexTangent,
  complexSubtract
} from './complex';

export type AngleMode = 'DEG' | 'RAD' | 'GRAD';

export interface EvaluationContext {
  readonly angleMode: AngleMode;
  readonly variables: Readonly<Record<string, MathValue>>;
  readonly ans: MathValue;
  readonly preAns: MathValue;
  readonly random: () => number;
  readonly maxIterations: number;
}

export interface MathFunctionDefinition {
  readonly minArgs: number;
  readonly maxArgs: number;
  readonly evaluate: (args: readonly MathValue[], context: EvaluationContext) => MathValue;
}

export class MathFunctionError extends Error {
  readonly functionName: string;

  constructor(functionName: string, message: string) {
    super(functionName + ': ' + message);
    this.name = 'MathFunctionError';
    this.functionName = functionName;
  }
}

const PI = decimal('3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679');
const TWO_PI = numericMath.multiply(PI, 2) as DecimalValue;

function real(value: MathValue, functionName: string, index: number): DecimalValue {
  if (typeof value === 'boolean' || isComplexValue(value) || isMatrixValue(value)) {
    throw new MathFunctionError(functionName, 'argument ' + (index + 1) + ' must be a real scalar.');
  }
  if ('kind' in value && value.kind === 'sexagesimal') return value.totalDegrees;
  return value;
}

function complexArg(value: MathValue): ComplexValue {
  if (isComplexValue(value)) return value;
  if (typeof value === 'boolean' || isMatrixValue(value)) {
    throw new TypeError('A scalar value is required.');
  }
  if ('kind' in value && value.kind === 'sexagesimal') return complex(value.totalDegrees, 0);
  return complex(value, 0);
}

function assertArgumentCount(
  name: string,
  args: readonly MathValue[],
  min: number,
  max: number
): void {
  if (args.length < min || args.length > max) {
    const expected = min === max ? String(min) : min + ' to ' + max;
    throw new MathFunctionError(name, 'expected ' + expected + ' argument(s), received ' + args.length + '.');
  }
}

function radians(value: DecimalValue, mode: AngleMode): DecimalValue {
  if (mode === 'DEG') return numericMath.divide(numericMath.multiply(value, PI), 180) as DecimalValue;
  if (mode === 'GRAD') return numericMath.divide(numericMath.multiply(value, PI), 200) as DecimalValue;
  return value;
}

function fromRadians(value: DecimalValue, mode: AngleMode): DecimalValue {
  if (mode === 'DEG') return numericMath.divide(numericMath.multiply(value, 180), PI) as DecimalValue;
  if (mode === 'GRAD') return numericMath.divide(numericMath.multiply(value, 200), PI) as DecimalValue;
  return value;
}

function decimalResult(value: unknown): DecimalValue {
  return value as DecimalValue;
}

function factorial(value: MathValue, name: string): DecimalValue {
  const integer = integerBigInt(value, name + ' input');
  return decimal(factorialBigInt(integer).toString());
}

function permutation(nValue: MathValue, rValue: MathValue, name: string): DecimalValue {
  const n = integerBigInt(nValue, name + ' n');
  const r = integerBigInt(rValue, name + ' r');
  if (n < 0n || r < 0n || r > n || n > 10000n) {
    throw new MathFunctionError(name, 'requires integers with 0 ≤ r ≤ n ≤ 10000.');
  }
  let result = 1n;
  for (let index = 0n; index < r; index += 1n) result *= n - index;
  return decimal(result.toString());
}

function combination(nValue: MathValue, rValue: MathValue, name: string): DecimalValue {
  const n = integerBigInt(nValue, name + ' n');
  const r = integerBigInt(rValue, name + ' r');
  if (n < 0n || r < 0n || r > n || n > 10000n) {
    throw new MathFunctionError(name, 'requires integers with 0 ≤ r ≤ n ≤ 10000.');
  }
  const reduced = r > n - r ? n - r : r;
  let numerator = 1n;
  let denominator = 1n;
  for (let index = 1n; index <= reduced; index += 1n) {
    numerator *= n - reduced + index;
    denominator *= index;
  }
  return decimal((numerator / denominator).toString());
}

function gcd(left: MathValue, right: MathValue, name: string): DecimalValue {
  return decimal(gcdBigInt(integerBigInt(left, name), integerBigInt(right, name)).toString());
}

function lcm(left: MathValue, right: MathValue, name: string): DecimalValue {
  const a = integerBigInt(left, name);
  const b = integerBigInt(right, name);
  if (a === 0n || b === 0n) return decimal(0);
  return decimal(((a / gcdBigInt(a, b)) * b < 0n
    ? -((a / gcdBigInt(a, b)) * b)
    : (a / gcdBigInt(a, b)) * b).toString());
}

function matrixFrom(value: MathValue, name: string): readonly (readonly MathValue[])[] {
  if (!isMatrixValue(value)) throw new MathFunctionError(name, 'argument must be a matrix literal.');
  return value.rows;
}

function squareMatrix(rows: readonly (readonly MathValue[])[], name: string): void {
  if (rows.length === 0 || rows.some(row => row.length !== rows.length)) {
    throw new MathFunctionError(name, 'requires a non-empty square matrix.');
  }
  for (const row of rows) {
    for (const entry of row) real(entry, name, 0);
  }
}

function determinant(rows: readonly (readonly MathValue[])[], name: string): DecimalValue {
  squareMatrix(rows, name);
  const matrix = rows.map(row => row.map(value => real(value, name, 0)));
  const size = matrix.length;
  let determinantValue = decimal(1);
  let sign = 1;

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (numericMath.larger(
        numericMath.abs(matrix[row][column]),
        numericMath.abs(matrix[pivot][column])
      )) pivot = row;
    }
    if (numericMath.equal(matrix[pivot][column], 0)) return decimal(0);
    if (pivot !== column) {
      [matrix[pivot], matrix[column]] = [matrix[column], matrix[pivot]];
      sign *= -1;
    }

    const pivotValue = matrix[column][column];
    determinantValue = decimalResult(numericMath.multiply(determinantValue, pivotValue));
    for (let row = column + 1; row < size; row += 1) {
      const factor = numericMath.divide(matrix[row][column], pivotValue);
      for (let index = column + 1; index < size; index += 1) {
        matrix[row][index] = decimalResult(numericMath.subtract(
          matrix[row][index],
          numericMath.multiply(factor, matrix[column][index])
        ));
      }
    }
  }

  return sign < 0 ? decimalResult(numericMath.unaryMinus(determinantValue)) : determinantValue;
}

function inverse(rows: readonly (readonly MathValue[])[], name: string): MathValue {
  squareMatrix(rows, name);
  const size = rows.length;
  const matrix = rows.map((row, rowIndex) => [
    ...row.map(value => real(value, name, 0)),
    ...Array.from({ length: size }, (_, columnIndex) => decimal(rowIndex === columnIndex ? 1 : 0))
  ]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (numericMath.larger(
        numericMath.abs(matrix[row][column]),
        numericMath.abs(matrix[pivot][column])
      )) pivot = row;
    }
    if (numericMath.equal(matrix[pivot][column], 0)) {
      throw new MathFunctionError(name, 'matrix is singular and has no inverse.');
    }
    [matrix[pivot], matrix[column]] = [matrix[column], matrix[pivot]];

    const pivotValue = matrix[column][column];
    matrix[column] = matrix[column].map(value =>
      decimalResult(numericMath.divide(value, pivotValue))
    );

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = matrix[row][column];
      matrix[row] = matrix[row].map((value, index) =>
        decimalResult(numericMath.subtract(value, numericMath.multiply(factor, matrix[column][index])))
      );
    }
  }

  return {
    kind: 'matrix',
    rows: matrix.map(row => row.slice(size))
  };
}

function transpose(rows: readonly (readonly MathValue[])[]): MathValue {
  const width = rows[0]?.length ?? 0;
  if (rows.length === 0 || rows.some(row => row.length !== width)) {
    throw new MathFunctionError('transpose', 'requires a non-empty rectangular matrix.');
  }
  return {
    kind: 'matrix',
    rows: Array.from({ length: width }, (_, column) => rows.map(row => row[column]))
  };
}

function normalDensity(args: readonly MathValue[]): MathValue {
  const x = real(args[0], 'normal', 0);
  const mean = real(args[1], 'normal', 1);
  const standardDeviation = real(args[2], 'normal', 2);
  if (!numericMath.larger(standardDeviation, 0)) {
    throw new MathFunctionError('normal', 'standard deviation must be positive.');
  }
  const z = numericMath.divide(numericMath.subtract(x, mean), standardDeviation);
  const exponent = numericMath.unaryMinus(numericMath.divide(numericMath.multiply(z, z), 2));
  const denominator = numericMath.multiply(standardDeviation, numericMath.sqrt(numericMath.multiply(TWO_PI, 1)));
  return decimalResult(numericMath.divide(numericMath.exp(exponent), denominator));
}

function binomialProbability(args: readonly MathValue[]): MathValue {
  const k = args[0];
  const n = args[1];
  const probability = real(args[2], 'binomial', 2);
  if (numericMath.smaller(probability, 0) || numericMath.larger(probability, 1)) {
    throw new MathFunctionError('binomial', 'probability must be between 0 and 1.');
  }
  const successes = integerBigInt(k, 'binomial successes');
  const trials = integerBigInt(n, 'binomial trials');
  if (trials < 0n || successes < 0n || successes > trials || trials > 10000n) {
    throw new MathFunctionError('binomial', 'requires 0 ≤ k ≤ n ≤ 10000.');
  }
  const failures = trials - successes;
  const first = numericMath.pow(probability, decimal(successes.toString()));
  const second = numericMath.pow(
    numericMath.subtract(1, probability),
    decimal(failures.toString())
  );
  return decimalResult(numericMath.multiply(
    combination(decimal(trials.toString()), decimal(successes.toString()), 'binomial'),
    numericMath.multiply(first, second)
  ));
}

function poissonProbability(args: readonly MathValue[]): MathValue {
  const events = integerBigInt(args[0], 'poisson k');
  const rate = real(args[1], 'poisson', 1);
  if (events < 0n || events > 10000n || !numericMath.larger(rate, 0)) {
    throw new MathFunctionError('poisson', 'requires k ≥ 0 and rate λ > 0.');
  }
  const numerator = numericMath.multiply(
    numericMath.pow(rate, decimal(events.toString())),
    numericMath.exp(numericMath.unaryMinus(rate))
  );
  return decimalResult(numericMath.divide(numerator, decimal(factorialBigInt(events).toString())));
}

function definition(
  minArgs: number,
  maxArgs: number,
  evaluate: MathFunctionDefinition['evaluate']
): MathFunctionDefinition {
  return { minArgs, maxArgs, evaluate };
}

function realUnary(
  operation: (value: DecimalValue) => unknown,
  name: string
): MathFunctionDefinition {
  return definition(1, 1, args => {
    if (isComplexValue(args[0])) {
      if (name === 'abs') return complexMagnitude(args[0]);
      if (name === 'sqrt') return complexSquareRoot(args[0]);
      if (name === 'exp') return complexExponential(args[0]);
      if (name === 'ln' || name === 'log') return complexLogarithm(args[0]);
      if (name === 'sin') return complexSine(args[0]);
      if (name === 'cos') return complexCosine(args[0]);
      if (name === 'tan') return complexTangent(args[0]);
      throw new MathFunctionError(name, 'does not accept complex arguments.');
    }
    return decimalResult(operation(real(args[0], name, 0)));
  });
}

function trigonometric(
  name: string,
  operation: (radiansValue: DecimalValue) => unknown
): MathFunctionDefinition {
  return definition(1, 1, (args, context) => {
    if (isComplexValue(args[0])) {
      const factor = context.angleMode === 'DEG'
        ? decimalResult(numericMath.divide(PI, 180))
        : context.angleMode === 'GRAD'
          ? decimalResult(numericMath.divide(PI, 200))
          : decimal(1);
      const input = context.angleMode === 'RAD'
        ? args[0]
        : {
            kind: 'complex' as const,
            real: decimalResult(numericMath.multiply(args[0].real, factor)),
            imaginary: decimalResult(numericMath.multiply(args[0].imaginary, factor))
          };
      if (name === 'sin') return complexSine(input);
      if (name === 'cos') return complexCosine(input);
      return complexTangent(input);
    }
    return decimalResult(operation(radians(real(args[0], name, 0), context.angleMode)));
  });
}

function inverseTrigonometric(
  name: string,
  operation: (value: DecimalValue) => unknown
): MathFunctionDefinition {
  return definition(1, 1, (args, context) => {
    if (isComplexValue(args[0])) {
      throw new MathFunctionError(name, 'complex inverse trigonometry is not supported by this function.');
    }
    const result = decimalResult(operation(real(args[0], name, 0)));
    return fromRadians(result, context.angleMode);
  });
}

const FUNCTIONS: Readonly<Record<string, MathFunctionDefinition>> = {
  sin: trigonometric('sin', value => numericMath.sin(value)),
  cos: trigonometric('cos', value => numericMath.cos(value)),
  tan: trigonometric('tan', value => numericMath.tan(value)),
  cot: definition(1, 1, (args, context) => {
    const angle = radians(real(args[0], 'cot', 0), context.angleMode);
    const tangent = numericMath.tan(angle);
    if (numericMath.equal(tangent, 0)) throw new MathFunctionError('cot', 'undefined at this angle.');
    return decimalResult(numericMath.divide(1, tangent));
  }),
  sec: definition(1, 1, (args, context) => {
    const cosine = numericMath.cos(radians(real(args[0], 'sec', 0), context.angleMode));
    if (numericMath.equal(cosine, 0)) throw new MathFunctionError('sec', 'undefined at this angle.');
    return decimalResult(numericMath.divide(1, cosine));
  }),
  csc: definition(1, 1, (args, context) => {
    const sine = numericMath.sin(radians(real(args[0], 'csc', 0), context.angleMode));
    if (numericMath.equal(sine, 0)) throw new MathFunctionError('csc', 'undefined at this angle.');
    return decimalResult(numericMath.divide(1, sine));
  }),
  asin: inverseTrigonometric('asin', value => numericMath.asin(value)),
  acos: inverseTrigonometric('acos', value => numericMath.acos(value)),
  atan: inverseTrigonometric('atan', value => numericMath.atan(value)),
  acot: inverseTrigonometric('acot', value => numericMath.atan(numericMath.divide(1, value))),
  asec: inverseTrigonometric('asec', value => numericMath.acos(numericMath.divide(1, value))),
  acsc: inverseTrigonometric('acsc', value => numericMath.asin(numericMath.divide(1, value))),
  sinh: realUnary(value => numericMath.sinh(value), 'sinh'),
  cosh: realUnary(value => numericMath.cosh(value), 'cosh'),
  tanh: realUnary(value => numericMath.tanh(value), 'tanh'),
  asinh: realUnary(value => numericMath.asinh(value), 'asinh'),
  acosh: realUnary(value => numericMath.acosh(value), 'acosh'),
  atanh: realUnary(value => numericMath.atanh(value), 'atanh'),
  sqrt: definition(1, 1, args => {
    if (isComplexValue(args[0])) return complexSquareRoot(args[0]);
    const value = real(args[0], 'sqrt', 0);
    if (numericMath.smaller(value, 0)) {
      return complex(0, decimalResult(numericMath.sqrt(numericMath.abs(value))));
    }
    return decimalResult(numericMath.sqrt(value));
  }),
  cbrt: realUnary(value => numericMath.cbrt(value), 'cbrt'),
  abs: realUnary(value => numericMath.abs(value), 'abs'),
  floor: realUnary(value => numericMath.floor(value), 'floor'),
  ceil: realUnary(value => numericMath.ceil(value), 'ceil'),
  round: realUnary(value => numericMath.round(value), 'round'),
  trunc: realUnary(value => numericMath.fix(value), 'trunc'),
  sign: realUnary(value => numericMath.sign(value), 'sign'),
  exp: realUnary(value => numericMath.exp(value), 'exp'),
  ln: realUnary(value => numericMath.log(value), 'ln'),
  log: realUnary(value => numericMath.log10(value), 'log'),
  log10: realUnary(value => numericMath.log10(value), 'log10'),
  logBase: definition(2, 2, args => {
    const value = real(args[0], 'logBase', 0);
    const base = real(args[1], 'logBase', 1);
    if (!numericMath.larger(value, 0) || !numericMath.larger(base, 0) || numericMath.equal(base, 1)) {
      throw new MathFunctionError('logBase', 'requires x > 0, base > 0, and base ≠ 1.');
    }
    return decimalResult(numericMath.divide(numericMath.log(value), numericMath.log(base)));
  }),
  nthRoot: definition(2, 2, args => {
    const degree = real(args[0], 'nthRoot', 0);
    const radicand = real(args[1], 'nthRoot', 1);
    if (numericMath.equal(degree, 0)) throw new MathFunctionError('nthRoot', 'root degree cannot be zero.');
    if (numericMath.smaller(radicand, 0)) {
      if (!numericMath.equal(numericMath.mod(degree, 2), 1)) {
        throw new MathFunctionError('nthRoot', 'an even real root of a negative number is not real.');
      }
      return decimalResult(numericMath.unaryMinus(numericMath.pow(numericMath.abs(radicand), numericMath.divide(1, degree))));
    }
    return decimalResult(numericMath.pow(radicand, numericMath.divide(1, degree)));
  }),
  factorial: definition(1, 1, args => factorial(args[0], 'factorial')),
  nCr: definition(2, 2, args => combination(args[0], args[1], 'nCr')),
  nPr: definition(2, 2, args => permutation(args[0], args[1], 'nPr')),
  gcd: definition(2, 2, args => gcd(args[0], args[1], 'gcd')),
  lcm: definition(2, 2, args => lcm(args[0], args[1], 'lcm')),
  mod: definition(2, 2, args => {
    const divisor = real(args[1], 'mod', 1);
    if (numericMath.equal(divisor, 0)) throw new MathFunctionError('mod', 'modulo by zero is undefined.');
    return decimalResult(numericMath.mod(real(args[0], 'mod', 0), divisor));
  }),
  pow: definition(2, 2, args => {
    if (isComplexValue(args[0]) || isComplexValue(args[1])) {
      return complexPower(complexArg(args[0]), complexArg(args[1]));
    }
    const base = real(args[0], 'pow', 0);
    const exponent = real(args[1], 'pow', 1);
    if (numericMath.smaller(base, 0) && !numericMath.equal(exponent, numericMath.floor(exponent))) {
      return complexPower(complex(base, 0), complex(exponent, 0));
    }
    return decimalResult(numericMath.pow(base, exponent));
  }),
  hypot: definition(2, 2, args => decimalResult(numericMath.hypot(
    real(args[0], 'hypot', 0),
    real(args[1], 'hypot', 1)
  ))),
  min: definition(1, 1000, args => {
    const values = args.map(value => real(value, 'min', 0));
    return values.slice(1).reduce<DecimalValue>(
      (minimum, value) => numericMath.smaller(value, minimum) ? value : minimum,
      values[0]
    );
  }),
  max: definition(1, 1000, args => {
    const values = args.map(value => real(value, 'max', 0));
    return values.slice(1).reduce<DecimalValue>(
      (maximum, value) => numericMath.larger(value, maximum) ? value : maximum,
      values[0]
    );
  }),
  mean: definition(1, 1000, args => {
    const values = args.map(value => real(value, 'mean', 0));
    const total = values.reduce<DecimalValue>((sum, value) => numericMath.add(sum, value), decimal(0));
    return decimalResult(numericMath.divide(total, args.length));
  }),
  median: definition(1, 1000, args => {
    const values = args.map(value => real(value, 'median', 0)).sort((a, b) => numericMath.compare(a, b));
    const middle = Math.floor(values.length / 2);
    return values.length % 2 === 0
      ? decimalResult(numericMath.divide(numericMath.add(values[middle - 1], values[middle]), 2))
      : values[middle];
  }),
  mode: definition(1, 1000, args => {
    const counts = new Map<string, { value: DecimalValue; count: number }>();
    for (const argument of args) {
      const value = real(argument, 'mode', 0);
      const key = value.toString();
      const entry = counts.get(key);
      counts.set(key, { value, count: (entry?.count ?? 0) + 1 });
    }
    return [...counts.values()].sort((left, right) => right.count - left.count)[0].value;
  }),
  variance: definition(1, 1000, args => {
    const values = args.map(value => real(value, 'variance', 0));
    const total = values.reduce<DecimalValue>((sum, value) => numericMath.add(sum, value), decimal(0));
    const average = decimalResult(numericMath.divide(total, values.length));
    const squared = values.reduce<DecimalValue>((sum, value) => {
      const difference = numericMath.subtract(value, average);
      return numericMath.add(sum, numericMath.multiply(difference, difference));
    }, decimal(0));
    return decimalResult(numericMath.divide(squared, values.length));
  }),
  stddev: definition(1, 1000, args => {
    const values = args.map(value => real(value, 'stddev', 0));
    const total = values.reduce<DecimalValue>((sum, value) => numericMath.add(sum, value), decimal(0));
    const average = decimalResult(numericMath.divide(total, values.length));
    const squared = values.reduce<DecimalValue>((sum, value) => {
      const difference = numericMath.subtract(value, average);
      return numericMath.add(sum, numericMath.multiply(difference, difference));
    }, decimal(0));
    return decimalResult(numericMath.sqrt(numericMath.divide(squared, values.length)));
  }),
  sum: definition(1, 1000, args => {
    const total = args.map(value => real(value, 'sum', 0))
      .reduce<DecimalValue>((sum, value) => numericMath.add(sum, value), decimal(0));
    return total;
  }),
  product: definition(1, 1000, args => {
    const total = args.map(value => real(value, 'product', 0))
      .reduce<DecimalValue>((product, value) => numericMath.multiply(product, value), decimal(1));
    return total;
  }),
  real: definition(1, 1, args => isComplexValue(args[0]) ? args[0].real : real(args[0], 'real', 0)),
  imaginary: definition(1, 1, args => isComplexValue(args[0]) ? args[0].imaginary : decimal(0)),
  conjugate: definition(1, 1, args => isComplexValue(args[0]) ? complexConjugate(args[0]) : complex(real(args[0], 'conjugate', 0), 0)),
  argument: definition(1, 1, args => isComplexValue(args[0])
    ? complexArgument(args[0])
    : numericMath.smaller(real(args[0], 'argument', 0), 0) ? PI : decimal(0)),
  normal: definition(3, 3, args => normalDensity(args)),
  binomial: definition(3, 3, args => binomialProbability(args)),
  poisson: definition(2, 2, args => poissonProbability(args)),
  uniform: definition(3, 3, args => {
    const x = real(args[0], 'uniform', 0);
    const low = real(args[1], 'uniform', 1);
    const high = real(args[2], 'uniform', 2);
    if (!numericMath.larger(high, low)) throw new MathFunctionError('uniform', 'upper bound must exceed lower bound.');
    return numericMath.smaller(x, low) || numericMath.larger(x, high)
      ? decimal(0)
      : decimalResult(numericMath.divide(1, numericMath.subtract(high, low)));
  }),
  random: definition(0, 0, (_args, context) => decimal(context.random())),
  ranInt: definition(2, 2, (args, context) => {
    const minimum = integerBigInt(args[0], 'ranInt minimum');
    const maximum = integerBigInt(args[1], 'ranInt maximum');
    if (minimum > maximum) throw new MathFunctionError('ranInt', 'minimum must not exceed maximum.');
    const range = maximum - minimum + 1n;
    if (range > BigInt(Number.MAX_SAFE_INTEGER)) throw new MathFunctionError('ranInt', 'range is too large.');
    return decimal((minimum + BigInt(Math.floor(context.random() * Number(range)))).toString());
  }),
  det: definition(1, 1, args => determinant(matrixFrom(args[0], 'det'), 'det')),
  inverse: definition(1, 1, args => inverse(matrixFrom(args[0], 'inverse'), 'inverse')),
  transpose: definition(1, 1, args => transpose(matrixFrom(args[0], 'transpose'))),
  matrix: definition(1, 1, args => {
    if (!isMatrixValue(args[0])) throw new MathFunctionError('matrix', 'pass a matrix literal such as [[1,2],[3,4]].');
    return args[0];
  }),
  vector: definition(1, 1000, args => ({ kind: 'matrix', rows: [args] }))
};

export function getMathFunction(name: string): MathFunctionDefinition | undefined {
  return FUNCTIONS[name] ?? FUNCTIONS[name.toLowerCase()];
}

export function invokeMathFunction(
  name: string,
  args: readonly MathValue[],
  context: EvaluationContext
): MathValue {
  const callable = getMathFunction(name);
  if (!callable) throw new MathFunctionError(name, 'is not registered.');
  assertArgumentCount(name, args, callable.minArgs, callable.maxArgs);
  return callable.evaluate(args, context);
}

export function listMathFunctions(): readonly string[] {
  return Object.keys(FUNCTIONS).sort();
}
