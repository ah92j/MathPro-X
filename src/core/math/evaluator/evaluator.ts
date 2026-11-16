import {
  type ExpressionNode,
  type BinaryExpressionNode,
  type CallExpressionNode,
  type PostfixExpressionNode,
  type UnaryExpressionNode,
  type ParserOptions
} from '../parser';
import { parse } from '../parser';
import {
  decimal,
  decimalString,
  factorialBigInt,
  integerBigInt,
  isComplexValue,
  isDecimalValue,
  isMatrixValue,
  isSexagesimalValue,
  numericMath,
  type ComplexValue,
  type DecimalValue,
  type MathValue,
  type NumericInput,
  type SexagesimalValue
} from './value';
import {
  complex,
  complexAdd,
  complexConjugate,
  complexDivide,
  complexMagnitude,
  complexMultiply,
  complexPower,
  complexSquareRoot,
  complexSubtract
} from './complex';
import {
  createSexagesimalValue,
  sexagesimalToDecimal
} from './dms';
import {
  invokeMathFunction,
  type AngleMode,
  type EvaluationContext
} from './function-registry';

export interface MathEvaluatorOptions extends ParserOptions {
  readonly angleMode?: AngleMode;
  readonly variables?: Readonly<Record<string, MathValue | NumericInput>>;
  readonly ans?: MathValue | NumericInput;
  readonly preAns?: MathValue | NumericInput;
  readonly random?: () => number;
  readonly maxIterations?: number;
  readonly precision?: number;
}

export interface MathEvaluationResult {
  readonly value: MathValue;
  readonly diagnostics: ReturnType<typeof parse>['diagnostics'];
  readonly formatted: string;
}

export class MathEvaluationError extends Error {
  readonly span?: ExpressionNode['span'];
  readonly causeValue?: unknown;

  constructor(message: string, span?: ExpressionNode['span'], causeValue?: unknown) {
    super(message);
    this.name = 'MathEvaluationError';
    this.span = span;
    this.causeValue = causeValue;
  }
}

const PI = decimal('3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679');
const E = decimal('2.7182818284590452353602874713526624977572470936999595749669676277240766303535475945713821785251664274');

function toMathValue(value: MathValue | NumericInput): MathValue {
  if (typeof value === 'boolean' || isDecimalValue(value)) return value as MathValue;
  if (typeof value === 'object' && value !== null && 'kind' in value) {
    const kind = (value as { kind?: string }).kind;
    if (kind === 'complex' || kind === 'matrix' || kind === 'sexagesimal') return value as MathValue;
  }
  return decimal(value as NumericInput);
}

function initialContext(options: MathEvaluatorOptions): EvaluationContext {
  const variables: Record<string, MathValue> = {};
  for (const [name, value] of Object.entries(options.variables ?? {})) {
    variables[name] = toMathValue(value);
  }
  const ans = toMathValue(options.ans ?? 0);
  const preAns = toMathValue(options.preAns ?? 0);

  return {
    angleMode: options.angleMode ?? 'DEG',
    variables,
    ans,
    preAns,
    random: options.random ?? Math.random,
    maxIterations: options.maxIterations ?? 20000
  };
}

function real(value: MathValue, label: string): DecimalValue {
  if (typeof value === 'boolean' || isComplexValue(value) || isMatrixValue(value)) {
    throw new MathEvaluationError(label + ' requires a real scalar.');
  }
  return isSexagesimalValue(value) ? sexagesimalToDecimal(value) : value;
}

function truthy(value: MathValue): boolean {
  if (typeof value === 'boolean') return value;
  if (isComplexValue(value)) {
    return !numericMath.equal(value.real, 0) || !numericMath.equal(value.imaginary, 0);
  }
  if (isMatrixValue(value)) return value.rows.length > 0;
  return !numericMath.equal(real(value, 'Boolean conversion'), 0);
}

function equalValues(left: MathValue, right: MathValue): boolean {
  if (typeof left === 'boolean' || typeof right === 'boolean') return left === right;
  if (isComplexValue(left) || isComplexValue(right)) {
    const a = isComplexValue(left) ? left : complex(real(left, 'comparison'), 0);
    const b = isComplexValue(right) ? right : complex(real(right, 'comparison'), 0);
    return numericMath.equal(a.real, b.real) && numericMath.equal(a.imaginary, b.imaginary);
  }
  if (isMatrixValue(left) || isMatrixValue(right)) {
    if (!isMatrixValue(left) || !isMatrixValue(right) ||
        left.rows.length !== right.rows.length) return false;
    return left.rows.every((row, rowIndex) =>
      row.length === right.rows[rowIndex].length &&
      row.every((value, columnIndex) => equalValues(value, right.rows[rowIndex][columnIndex]))
    );
  }
  return numericMath.equal(real(left, 'comparison'), real(right, 'comparison'));
}

function isNegative(value: DecimalValue): boolean {
  return numericMath.smaller(value, 0);
}

function matrixShape(matrix: MathValue, label: string): { rows: number; columns: number } {
  if (!isMatrixValue(matrix)) throw new MathEvaluationError(label + ' requires a matrix.');
  const rows = matrix.rows.length;
  const columns = matrix.rows[0]?.length ?? 0;
  if (rows === 0 || columns === 0 || matrix.rows.some(row => row.length !== columns)) {
    throw new MathEvaluationError(label + ' requires a non-empty rectangular matrix.');
  }
  return { rows, columns };
}

function applyScalarBinary(
  operator: BinaryExpressionNode['operator'],
  left: MathValue,
  right: MathValue,
  context: EvaluationContext,
  span: ExpressionNode['span']
): MathValue {
  if (operator === '=' || operator === '==') return equalValues(left, right);
  if (operator === '!=') return !equalValues(left, right);

  if (operator === 'and') return truthy(left) && truthy(right);
  if (operator === 'or') return truthy(left) || truthy(right);
  if (operator === 'xor') return truthy(left) !== truthy(right);

  if (operator === '<' || operator === '<=' || operator === '>' || operator === '>=') {
    if (isComplexValue(left) || isComplexValue(right) || isMatrixValue(left) || isMatrixValue(right)) {
      throw new MathEvaluationError('Ordering comparisons require real scalar values.', span);
    }
    const comparison = numericMath.compare(real(left, 'comparison'), real(right, 'comparison'));
    if (operator === '<') return comparison < 0;
    if (operator === '<=') return comparison <= 0;
    if (operator === '>') return comparison > 0;
    return comparison >= 0;
  }

  if (isMatrixValue(left) || isMatrixValue(right)) {
    return applyMatrixBinary(operator, left, right, context, span);
  }

  if (isComplexValue(left) || isComplexValue(right)) {
    const a = isComplexValue(left) ? left : complex(real(left, 'complex operation'), 0);
    const b = isComplexValue(right) ? right : complex(real(right, 'complex operation'), 0);
    if (operator === '+') return complexAdd(a, b);
    if (operator === '-') return complexSubtract(a, b);
    if (operator === '*') return complexMultiply(a, b);
    if (operator === '/') return complexDivide(a, b);
    if (operator === '^') return complexPower(a, b);
    throw new MathEvaluationError('Operator "' + operator + '" is not defined for complex values.', span);
  }

  const a = real(left, 'arithmetic');
  const b = real(right, 'arithmetic');
  switch (operator) {
    case '+': return numericMath.add(a, b) as DecimalValue;
    case '-': return numericMath.subtract(a, b) as DecimalValue;
    case '*': return numericMath.multiply(a, b) as DecimalValue;
    case '/':
      if (numericMath.equal(b, 0)) throw new MathEvaluationError('Division by zero is undefined.', span);
      return numericMath.divide(a, b) as DecimalValue;
    case '^':
      if (isNegative(a) && !numericMath.equal(b, numericMath.floor(b))) {
        return complexPower(complex(a, 0), complex(b, 0));
      }
      return numericMath.pow(a, b) as DecimalValue;
    case 'mod':
      if (numericMath.equal(b, 0)) throw new MathEvaluationError('Modulo by zero is undefined.', span);
      return numericMath.mod(a, b) as DecimalValue;
    case 'nCr':
      return invokeMathFunction('nCr', [a, b], context);
    case 'nPr':
      return invokeMathFunction('nPr', [a, b], context);
    case ':':
      if (numericMath.equal(b, 0)) throw new MathEvaluationError('A ratio cannot have a zero denominator.', span);
      return numericMath.divide(a, b) as DecimalValue;
    default:
      throw new MathEvaluationError('Unsupported binary operator: ' + operator, span);
  }
}

function applyMatrixBinary(
  operator: BinaryExpressionNode['operator'],
  left: MathValue,
  right: MathValue,
  context: EvaluationContext,
  span: ExpressionNode['span']
): MathValue {
  const leftIsMatrix = isMatrixValue(left);
  const rightIsMatrix = isMatrixValue(right);
  if (operator === '+' || operator === '-') {
    if (!leftIsMatrix || !rightIsMatrix) {
      throw new MathEvaluationError('Matrix addition and subtraction require two matrices.', span);
    }
    const leftShape = matrixShape(left, 'Matrix operation');
    const rightShape = matrixShape(right, 'Matrix operation');
    if (leftShape.rows !== rightShape.rows || leftShape.columns !== rightShape.columns) {
      throw new MathEvaluationError('Matrix dimensions must match for addition or subtraction.', span);
    }
    return {
      kind: 'matrix',
      rows: left.rows.map((row, rowIndex) =>
        row.map((value, columnIndex) =>
          applyScalarBinary(operator, value, right.rows[rowIndex][columnIndex], context, span)
        )
      )
    };
  }

  if (operator === '*') {
    if (leftIsMatrix && rightIsMatrix) {
      const leftShape = matrixShape(left, 'Matrix multiplication');
      const rightShape = matrixShape(right, 'Matrix multiplication');
      if (leftShape.columns !== rightShape.rows) {
        throw new MathEvaluationError('Matrix dimensions are incompatible for multiplication.', span);
      }
      return {
        kind: 'matrix',
        rows: Array.from({ length: leftShape.rows }, (_, rowIndex) =>
          Array.from({ length: rightShape.columns }, (_, columnIndex) => {
            let total: MathValue = decimal(0);
            for (let index = 0; index < leftShape.columns; index += 1) {
              const product = applyScalarBinary(
                '*',
                left.rows[rowIndex][index],
                right.rows[index][columnIndex],
                context,
                span
              );
              total = applyScalarBinary('+', total, product, context, span);
            }
            return total;
          })
        )
      };
    }
    const matrix = (leftIsMatrix ? left : right) as Extract<MathValue, { kind: 'matrix' }>;
    const scalar = leftIsMatrix ? right : left;
    if (isMatrixValue(scalar) || typeof scalar === 'boolean') {
      throw new MathEvaluationError('Matrix scaling requires a scalar value.', span);
    }
    return {
      kind: 'matrix',
      rows: matrix.rows.map(row => row.map(value => applyScalarBinary('*', value, scalar, context, span)))
    };
  }

  if (operator === '/') {
    if (!leftIsMatrix || rightIsMatrix || typeof right === 'boolean') {
      throw new MathEvaluationError('Matrix division is supported only by a scalar divisor.', span);
    }
    return {
      kind: 'matrix',
      rows: left.rows.map(row => row.map(value => applyScalarBinary('/', value, right, context, span)))
    };
  }

  throw new MathEvaluationError('Operator "' + operator + '" is not supported for matrices.', span);
}

function negate(value: MathValue, span: ExpressionNode['span']): MathValue {
  if (typeof value === 'boolean') throw new MathEvaluationError('A Boolean value cannot be negated numerically.', span);
  if (isComplexValue(value)) {
    return complex(
      numericMath.unaryMinus(value.real) as DecimalValue,
      numericMath.unaryMinus(value.imaginary) as DecimalValue
    );
  }
  if (isMatrixValue(value)) {
    return {
      kind: 'matrix',
      rows: value.rows.map(row => row.map(entry => negate(entry, span)))
    };
  }
  if (isSexagesimalValue(value)) return numericMath.unaryMinus(value.totalDegrees) as DecimalValue;
  return numericMath.unaryMinus(value) as DecimalValue;
}

function evaluatePercentage(node: PostfixExpressionNode, context: EvaluationContext): MathValue {
  if (node.operator === '!') {
    const value = integerBigInt(evaluateNode(node.argument, context), 'factorial input');
    return decimal(factorialBigInt(value).toString());
  }
  const value = evaluateNode(node.argument, context);
  if (isComplexValue(value) || isMatrixValue(value) || typeof value === 'boolean') {
    throw new MathEvaluationError('Percentage requires a real scalar.', node.span);
  }
  return numericMath.divide(real(value, 'percentage'), 100) as DecimalValue;
}

function evaluateBinary(node: BinaryExpressionNode, context: EvaluationContext): MathValue {
  const left = evaluateNode(node.left, context);

  if ((node.operator === '+' || node.operator === '-') &&
      node.right.type === 'PostfixExpression' &&
      node.right.operator === '%' &&
      node.right.percentageMode === 'relative') {
    const percentage = evaluatePercentage(node.right, context);
    const adjustment = applyScalarBinary('*', left, percentage, context, node.span);
    return applyScalarBinary(node.operator, left, adjustment, context, node.span);
  }

  if (node.operator === 'and' && !truthy(left)) return false;
  if (node.operator === 'or' && truthy(left)) return true;

  const right = evaluateNode(node.right, context);
  return applyScalarBinary(node.operator, left, right, context, node.span);
}

function evaluateUnary(node: UnaryExpressionNode, context: EvaluationContext): MathValue {
  const argument = evaluateNode(node.argument, context);
  switch (node.operator) {
    case '+': return argument;
    case '-': return negate(argument, node.span);
    case 'not': return !truthy(argument);
    case 'sqrt': return invokeMathFunction('sqrt', [argument], context);
    case 'cbrt': return invokeMathFunction('cbrt', [argument], context);
    case 'nthRoot':
      throw new MathEvaluationError('Use nthRoot(degree, value) to specify the root degree.', node.span);
  }
}

function withVariable(
  context: EvaluationContext,
  variable: string,
  value: MathValue
): EvaluationContext {
  return {
    ...context,
    variables: { ...context.variables, [variable]: value }
  };
}

function numericFunctionAt(
  expression: ExpressionNode,
  variable: string,
  x: DecimalValue,
  context: EvaluationContext
): DecimalValue {
  const result = evaluateNode(expression, withVariable(context, variable, x));
  if (isComplexValue(result) || isMatrixValue(result) || typeof result === 'boolean') {
    throw new MathEvaluationError('Numeric calculus currently requires a real-valued expression.', expression.span);
  }
  return real(result, 'numeric calculus');
}

function evaluateDerivative(node: CallExpressionNode, context: EvaluationContext): MathValue {
  if (node.arguments.length < 2 || node.arguments.length > 3) {
    throw new MathEvaluationError('derivative expects (expression, value) or (expression, variable, value).', node.span);
  }
  let variable = 'x';
  let pointNode: ExpressionNode;
  if (node.arguments.length === 3) {
    const variableNode = node.arguments[1];
    if (variableNode.type !== 'Identifier') {
      throw new MathEvaluationError('The derivative variable must be an identifier.', variableNode.span);
    }
    variable = variableNode.name;
    pointNode = node.arguments[2];
  } else {
    pointNode = node.arguments[1];
  }

  const point = real(evaluateNode(pointNode, context), 'derivative point');
  const scale = numericMath.max(1, numericMath.abs(point));
  const step = numericMath.multiply(scale, decimal('1e-20')) as DecimalValue;
  const before = numericMath.subtract(point, step) as DecimalValue;
  const after = numericMath.add(point, step) as DecimalValue;
  const leftValue = numericFunctionAt(node.arguments[0], variable, before, context);
  const rightValue = numericFunctionAt(node.arguments[0], variable, after, context);
  return numericMath.divide(
    numericMath.subtract(rightValue, leftValue),
    numericMath.multiply(step, 2)
  ) as DecimalValue;
}

function evaluateIntegral(node: CallExpressionNode, context: EvaluationContext): MathValue {
  if (node.arguments.length < 4 || node.arguments.length > 5) {
    throw new MathEvaluationError('integral expects (expression, variable, lower, upper[, steps]).', node.span);
  }
  const variableNode = node.arguments[1];
  if (variableNode.type !== 'Identifier') {
    throw new MathEvaluationError('The integration variable must be an identifier.', variableNode.span);
  }
  const variable = variableNode.name;
  const lower = real(evaluateNode(node.arguments[2], context), 'integral lower bound');
  const upper = real(evaluateNode(node.arguments[3], context), 'integral upper bound');
  const requestedSteps = node.arguments[4]
    ? Number(real(evaluateNode(node.arguments[4], context), 'integral steps').toString())
    : 1000;
  if (!Number.isInteger(requestedSteps) || requestedSteps < 2 || requestedSteps > context.maxIterations) {
    throw new MathEvaluationError('Integral steps must be an integer between 2 and ' + context.maxIterations + '.', node.span);
  }
  const steps = requestedSteps % 2 === 0 ? requestedSteps : requestedSteps + 1;
  const stepSize = numericMath.divide(numericMath.subtract(upper, lower), steps);
  let total = numericFunctionAt(node.arguments[0], variable, lower, context);
  total = numericMath.add(total, numericFunctionAt(node.arguments[0], variable, upper, context)) as DecimalValue;

  for (let index = 1; index < steps; index += 1) {
    const x = numericMath.add(lower, numericMath.multiply(stepSize, index)) as DecimalValue;
    const weight = index % 2 === 0 ? 2 : 4;
    total = numericMath.add(
      total,
      numericMath.multiply(numericFunctionAt(node.arguments[0], variable, x, context), weight)
    ) as DecimalValue;
  }
  return numericMath.divide(numericMath.multiply(total, stepSize), 3) as DecimalValue;
}

function evaluateLimit(node: CallExpressionNode, context: EvaluationContext): MathValue {
  if (node.arguments.length < 3 || node.arguments.length > 4) {
    throw new MathEvaluationError('limit expects (expression, variable, point[, direction]).', node.span);
  }
  const variableNode = node.arguments[1];
  if (variableNode.type !== 'Identifier') {
    throw new MathEvaluationError('The limit variable must be an identifier.', variableNode.span);
  }
  const variable = variableNode.name;
  const point = real(evaluateNode(node.arguments[2], context), 'limit point');
  const direction = node.arguments[3]
    ? Number(real(evaluateNode(node.arguments[3], context), 'limit direction').toString())
    : 0;
  if (direction !== -1 && direction !== 0 && direction !== 1) {
    throw new MathEvaluationError('Limit direction must be -1, 0, or 1.', node.span);
  }

  let last: DecimalValue | undefined;
  for (let exponent = 2; exponent <= 14; exponent += 2) {
    const step = decimal('1e-' + exponent);
    const left = numericMath.subtract(point, step) as DecimalValue;
    const right = numericMath.add(point, step) as DecimalValue;
    if (direction <= 0) {
      try {
        last = numericFunctionAt(node.arguments[0], variable, direction === -1 ? left : left, context);
      } catch {
        if (direction === -1) throw new MathEvaluationError('The left-hand limit could not be evaluated.', node.span);
      }
    }
    if (direction >= 0) {
      try {
        const rightValue = numericFunctionAt(node.arguments[0], variable, right, context);
        if (last && direction === 0) {
          const average = numericMath.divide(numericMath.add(last, rightValue), 2) as DecimalValue;
          last = average;
        } else {
          last = rightValue;
        }
      } catch {
        if (direction === 1) throw new MathEvaluationError('The right-hand limit could not be evaluated.', node.span);
      }
    }
  }
  if (!last) throw new MathEvaluationError('The limit could not be estimated from nearby values.', node.span);
  return last;
}

function evaluateSummation(
  node: CallExpressionNode,
  context: EvaluationContext,
  product: boolean
): MathValue | undefined {
  if (node.arguments.length !== 4 || node.arguments[0].type !== 'Identifier') return undefined;
  const variable = node.arguments[0].name;
  const start = integerBigInt(evaluateNode(node.arguments[1], context), 'summation start');
  const end = integerBigInt(evaluateNode(node.arguments[2], context), 'summation end');
  const count = end >= start ? end - start + 1n : start - end + 1n;
  if (count > BigInt(context.maxIterations)) {
    throw new MathEvaluationError('Summation exceeds the configured iteration limit.', node.span);
  }

  let result: MathValue = decimal(product ? 1 : 0);
  const direction = end >= start ? 1n : -1n;
  for (let index = start; direction > 0n ? index <= end : index >= end; index += direction) {
    const scoped = withVariable(context, variable, decimal(index.toString()));
    const term = evaluateNode(node.arguments[3], scoped);
    result = applyScalarBinary(product ? '*' : '+', result, term, scoped, node.span);
  }
  return result;
}

function evaluateCall(node: CallExpressionNode, context: EvaluationContext): MathValue {
  const name = node.callee.name;

  if (name === 'derivative') return evaluateDerivative(node, context);
  if (name === 'integral') return evaluateIntegral(node, context);
  if (name === 'limit') return evaluateLimit(node, context);
  if (name === 'sum' || name === 'product') {
    const loopResult = evaluateSummation(node, context, name === 'product');
    if (loopResult !== undefined) return loopResult;
  }

  const args = node.arguments.map(argument => evaluateNode(argument, context));
  return invokeMathFunction(name, args, context);
}

function evaluateNode(node: ExpressionNode, context: EvaluationContext): MathValue {
  try {
    switch (node.type) {
      case 'NumberLiteral':
        if (node.radix === 10) return decimal(node.value);
        return decimal(BigInt(node.value).toString());
      case 'Identifier': {
        const name = node.name;
        if (name === 'pi') return PI;
        if (name === 'tau') return numericMath.multiply(PI, 2) as DecimalValue;
        if (name === 'e') return E;
        if (name === 'Infinity') return decimal('1e100000');
        if (name === 'NaN') return decimal('NaN');
        if (name === 'i') return complex(0, 1);
        if (name === 'ans') return context.ans;
        if (name === 'preAns') return context.preAns;
        const variableValue = context.variables[name] ?? context.variables[name.toLowerCase()];
        if (variableValue !== undefined) return variableValue;
        throw new MathEvaluationError('Unknown variable: ' + name, node.span);
      }
      case 'SexagesimalLiteral':
        return createSexagesimalValue(node.degrees, node.minutes, node.seconds);
      case 'UnaryExpression':
        return evaluateUnary(node, context);
      case 'BinaryExpression':
        return evaluateBinary(node, context);
      case 'PostfixExpression':
        return evaluatePercentage(node, context);
      case 'CallExpression':
        return evaluateCall(node, context);
      case 'GroupExpression':
        return evaluateNode(node.expression, context);
      case 'AbsoluteExpression': {
        const value = evaluateNode(node.expression, context);
        if (isComplexValue(value)) return complexMagnitude(value);
        if (isMatrixValue(value) || typeof value === 'boolean') {
          throw new MathEvaluationError('Absolute value requires a scalar.', node.span);
        }
        return numericMath.abs(real(value, 'absolute value')) as DecimalValue;
      }
      case 'ArrayExpression':
        return {
          kind: 'matrix',
          rows: node.rows.map(row => row.map(entry => evaluateNode(entry, context)))
        };
    }
  } catch (error) {
    if (error instanceof MathEvaluationError) {
      if (error.span) throw error;
      throw new MathEvaluationError(error.message, node.span, error);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new MathEvaluationError(message, node.span, error);
  }
}

export function evaluateAst(
  ast: ExpressionNode,
  options: MathEvaluatorOptions = {}
): MathValue {
  return evaluateNode(ast, initialContext(options));
}

export function evaluateMath(
  source: string,
  options: MathEvaluatorOptions = {}
): MathEvaluationResult {
  const parsed = parse(source, options);
  const value = evaluateAst(parsed.ast, options);
  return {
    value,
    diagnostics: parsed.diagnostics,
    formatted: valueToDisplayString(value, options)
  };
}

export function valueToDisplayString(
  value: MathValue,
  options: Pick<MathEvaluatorOptions, 'precision'> = {}
): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (isComplexValue(value)) {
    const realText = decimalString(value.real, options.precision ?? 100);
    const imaginary = value.imaginary;
    const negative = numericMath.smaller(imaginary, 0);
    const magnitude = decimalString(numericMath.abs(imaginary) as DecimalValue, options.precision ?? 100);
    return realText + (negative ? ' − ' : ' + ') + magnitude + 'i';
  }
  if (isSexagesimalValue(value)) {
    return value.degrees + '° ' + value.minutes + '′ ' + value.seconds + '″';
  }
  if (isMatrixValue(value)) {
    return '[' + value.rows.map(row =>
      '[' + row.map(item => valueToDisplayString(item, options)).join(', ') + ']'
    ).join(', ') + ']';
  }
  return decimalString(value, options.precision ?? 100);
}

export function evaluateToString(
  source: string,
  options: MathEvaluatorOptions = {}
): string {
  return evaluateMath(source, options).formatted;
}

export function decimalFromDisplayValue(value: MathValue): DecimalValue {
  return real(value, 'numeric value');
}

export function evaluateWithContext(
  source: string,
  variables: Readonly<Record<string, MathValue | NumericInput>>,
  options: Omit<MathEvaluatorOptions, 'variables'> = {}
): MathEvaluationResult {
  return evaluateMath(source, { ...options, variables });
}

export function isNumericValue(value: MathValue): value is DecimalValue | SexagesimalValue {
  return isDecimalValue(value) || isSexagesimalValue(value);
}

export function negateValue(value: MathValue): MathValue {
  return negate(value, {
    start: { offset: 0, line: 1, column: 1 },
    end: { offset: 0, line: 1, column: 1 }
  });
}

export function toNumber(value: MathValue): number {
  if (isComplexValue(value) || isMatrixValue(value) || typeof value === 'boolean') {
    throw new TypeError('A real scalar value is required.');
  }
  const result = Number(real(value, 'number conversion').toString());
  if (!Number.isFinite(result)) throw new RangeError('Value is not a finite JavaScript number.');
  return result;
}
