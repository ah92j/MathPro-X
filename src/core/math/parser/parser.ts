import {
  type AbsoluteExpressionNode,
  type ArrayExpressionNode,
  type BinaryExpressionNode,
  type BinaryOperator,
  type CallExpressionNode,
  type ExpressionNode,
  type GroupExpressionNode,
  type IdentifierNode,
  type NumberLiteralNode,
  type ParseResult,
  type ParserDiagnostic,
  type PercentageMode,
  type PostfixExpressionNode,
  type SourcePosition,
  type SourceSpan,
  type UnaryExpressionNode,
  type SexagesimalLiteralNode
} from './nodes';
import {
  tokenize,
  type Token,
  type TokenizerOptions
} from './tokenizer';

export type ImplicitMultiplicationPriority = 'same-as-explicit' | 'higher-than-division';

export interface ParserOptions extends TokenizerOptions {
  readonly implicitMultiplicationPriority?: ImplicitMultiplicationPriority;
  readonly percentageMode?: PercentageMode;
  readonly autoCloseParentheses?: boolean;
  readonly autoOpenParentheses?: boolean;
  readonly trailingOperatorTolerance?: boolean;
}

export const DEFAULT_PARSER_OPTIONS: Required<ParserOptions> = {
  decimalSeparator: '.',
  argumentSeparator: ',',
  implicitMultiplicationPriority: 'same-as-explicit',
  percentageMode: 'relative',
  autoCloseParentheses: true,
  autoOpenParentheses: true,
  trailingOperatorTolerance: true
};

export class MathParserError extends Error {
  readonly span: SourceSpan;
  readonly expected: readonly string[];

  constructor(message: string, span: SourceSpan, expected: readonly string[] = []) {
    const location = span.start;
    super(message + ' at line ' + location.line + ', column ' + location.column + '.');
    this.name = 'MathParserError';
    this.span = span;
    this.expected = expected;
  }
}

const CALLABLE_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'asin', 'acos', 'atan', 'acot', 'asec', 'acsc',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'sqrt', 'cbrt', 'nthRoot', 'abs', 'floor', 'ceil', 'round', 'trunc', 'sign',
  'exp', 'log', 'log10', 'ln', 'logBase', 'factorial',
  'nCr', 'nPr', 'gcd', 'lcm', 'mod', 'min', 'max', 'sum', 'product',
  'mean', 'median', 'mode', 'variance', 'stddev', 'hypot', 'pow',
  'derivative', 'integral', 'limit', 'det', 'inverse', 'transpose',
  'conjugate', 'real', 'imaginary', 'argument', 'vector', 'matrix',
  'normal', 'binomial', 'poisson', 'uniform', 'random', 'ranInt'
]);

const PREFIX_BINDING_POWER = 29;
const POSTFIX_BINDING_POWER = 40;
const POWER_BINDING_POWER = 30;
const ADDITIVE_BINDING_POWER = 10;
const MULTIPLICATIVE_BINDING_POWER = 20;
const COMPARISON_BINDING_POWER = 5;
const LOGICAL_AND_BINDING_POWER = 4;
const LOGICAL_OR_BINDING_POWER = 3;

function mergeSpans(first: SourceSpan, last: SourceSpan): SourceSpan {
  return { start: first.start, end: last.end };
}

function emptySpan(position: SourcePosition): SourceSpan {
  return { start: position, end: position };
}

function isPrimaryStart(token: Token): boolean {
  return token.kind === 'number' ||
    token.kind === 'identifier' ||
    token.kind === 'leftParen' ||
    token.kind === 'leftBracket' ||
    (token.kind === 'operator' && ['sqrt', 'cbrt', 'nthRoot'].includes(token.value ?? ''));
}

function isExpressionEnd(node: ExpressionNode): boolean {
  return node.type === 'NumberLiteral' ||
    node.type === 'Identifier' ||
    node.type === 'SexagesimalLiteral' ||
    node.type === 'GroupExpression' ||
    node.type === 'ArrayExpression' ||
    node.type === 'AbsoluteExpression' ||
    node.type === 'CallExpression' ||
    node.type === 'PostfixExpression' ||
    node.type === 'UnaryExpression' ||
    node.type === 'BinaryExpression';
}

function numberRadix(token: Token): 2 | 8 | 10 | 16 {
  return token.radix ?? 10;
}

function createSyntheticToken(kind: 'leftParen' | 'rightParen', position: SourcePosition): Token {
  const lexeme = kind === 'leftParen' ? '(' : ')';
  const span = emptySpan(position);
  return { kind, lexeme, value: lexeme, span, synthetic: true };
}

class Parser {
  private readonly tokens: Token[];
  private readonly options: Required<ParserOptions>;
  private readonly diagnostics: ParserDiagnostic[] = [];
  private current = 0;

  constructor(tokens: Token[], options: Required<ParserOptions>) {
    this.options = options;
    this.tokens = this.repairTokens(tokens);
  }

  parse(): ParseResult {
    if (this.peek().kind === 'eof') {
      throw new MathParserError('An expression is required', this.peek().span);
    }
    const ast = this.parseExpression(0);
    if (!this.check('eof')) {
      const token = this.peek();
      throw new MathParserError(
        'Unexpected token "' + token.lexeme + '" after the expression',
        token.span,
        ['end of expression']
      );
    }
    return { ast, diagnostics: [...this.diagnostics] };
  }

  private repairTokens(sourceTokens: Token[]): Token[] {
    const body = sourceTokens.filter(token => token.kind !== 'eof');
    const eof = sourceTokens[sourceTokens.length - 1];
    const anchor = body[0]?.span.start ?? eof.span.start;

    if (this.options.trailingOperatorTolerance) {
      while (body.length > 0) {
        const last = body[body.length - 1];
        if (last.kind !== 'operator' || (last.value !== '+' && last.value !== '-')) break;
        body.pop();
        this.diagnostics.push({
          code: 'TRAILING_OPERATOR_REMOVED',
          message: 'Ignored a trailing ' + last.value + ' operator.',
          span: last.span
        });
      }
    }

    if (this.options.autoOpenParentheses) {
      let depth = 0;
      let unmatchedClosings = 0;
      for (const token of body) {
        if (token.kind === 'leftParen') depth += 1;
        if (token.kind === 'rightParen') {
          if (depth === 0) unmatchedClosings += 1;
          else depth -= 1;
        }
      }
      for (let index = 0; index < unmatchedClosings; index += 1) {
        body.unshift(createSyntheticToken('leftParen', anchor));
        this.diagnostics.push({
          code: 'OPEN_PARENTHESIS_INSERTED',
          message: 'Inserted an opening parenthesis at the start of the expression.',
          span: emptySpan(anchor)
        });
      }
    }

    if (this.options.autoCloseParentheses) {
      let depth = 0;
      for (const token of body) {
        if (token.kind === 'leftParen') depth += 1;
        if (token.kind === 'rightParen') depth = Math.max(0, depth - 1);
      }
      for (let index = 0; index < depth; index += 1) {
        body.push(createSyntheticToken('rightParen', eof.span.start));
        this.diagnostics.push({
          code: 'CLOSE_PARENTHESIS_INSERTED',
          message: 'Inserted a closing parenthesis at the end of the expression.',
          span: emptySpan(eof.span.start)
        });
      }
    }

    body.push(eof);
    return body;
  }

  private parseExpression(minimumBindingPower: number): ExpressionNode {
    let left = this.parsePrefix();

    while (true) {
      const token = this.peek();

      if (left.type === 'NumberLiteral' && token.kind === 'identifier' && token.value === 'deg') {
        this.advance();
        let minutes = '0';
        let seconds = '0';
        let endSpan = token.span;

        if (this.peek().kind === 'number' && this.lookAhead(1).kind === 'identifier' &&
            this.lookAhead(1).value === 'arcmin') {
          const minuteToken = this.advance();
          const minuteUnit = this.advance();
          minutes = minuteToken.value ?? minuteToken.lexeme;
          endSpan = minuteUnit.span;

          if (this.peek().kind === 'number' && this.lookAhead(1).kind === 'identifier' &&
              this.lookAhead(1).value === 'arcsec') {
            const secondToken = this.advance();
            const secondUnit = this.advance();
            seconds = secondToken.value ?? secondToken.lexeme;
            endSpan = secondUnit.span;
          }
        }

        const dms: SexagesimalLiteralNode = {
          type: 'SexagesimalLiteral',
          degrees: left.value,
          minutes,
          seconds,
          span: mergeSpans(left.span, endSpan)
        };
        left = dms;
        continue;
      }

      if (token.kind === 'operator' && (token.value === '!' || token.value === '%')) {
        if (POSTFIX_BINDING_POWER < minimumBindingPower) break;
        this.advance();
        const postfix: PostfixExpressionNode = {
          type: 'PostfixExpression',
          operator: token.value,
          argument: left,
          percentageMode: token.value === '%' ? this.options.percentageMode : undefined,
          span: mergeSpans(left.span, token.span)
        };
        left = postfix;
        continue;
      }

      const infix = this.getInfixBindingPower(token);
      if (infix) {
        if (infix.left < minimumBindingPower) break;
        this.advance();
        const right = this.parseExpression(infix.right);
        const binary: BinaryExpressionNode = {
          type: 'BinaryExpression',
          operator: infix.operator,
          left,
          right,
          implicit: false,
          span: mergeSpans(left.span, right.span)
        };
        left = binary;
        continue;
      }

      if (isPrimaryStart(token) && isExpressionEnd(left)) {
        const bindingPower = this.options.implicitMultiplicationPriority === 'higher-than-division'
          ? MULTIPLICATIVE_BINDING_POWER + 5
          : MULTIPLICATIVE_BINDING_POWER;
        if (bindingPower < minimumBindingPower) break;

        const right = this.parseExpression(bindingPower + 1);
        const binary: BinaryExpressionNode = {
          type: 'BinaryExpression',
          operator: '*',
          left,
          right,
          implicit: true,
          span: mergeSpans(left.span, right.span)
        };
        left = binary;
        continue;
      }

      break;
    }

    return left;
  }

  private parsePrefix(): ExpressionNode {
    const token = this.advance();

    if (token.kind === 'number') {
      const literal: NumberLiteralNode = {
        type: 'NumberLiteral',
        value: token.value ?? token.lexeme,
        radix: numberRadix(token),
        span: token.span
      };
      return literal;
    }

    if (token.kind === 'identifier') {
      const identifier: IdentifierNode = {
        type: 'Identifier',
        name: token.value ?? token.lexeme,
        span: token.span
      };

      if (this.match('leftParen')) return this.parseCall(identifier, false);

      if (CALLABLE_FUNCTIONS.has(identifier.name) && isPrimaryStart(this.peek())) {
        const argument = this.parseExpression(this.getFunctionArgumentBindingPower());
        const call: CallExpressionNode = {
          type: 'CallExpression',
          callee: identifier,
          arguments: [argument],
          implicit: true,
          span: mergeSpans(identifier.span, argument.span)
        };
        return call;
      }

      return identifier;
    }

    if (token.kind === 'operator') {
      const operator = token.value ?? token.lexeme;
      if (operator === '+' || operator === '-') {
        const argument = this.parseExpression(PREFIX_BINDING_POWER);
        const unary: UnaryExpressionNode = {
          type: 'UnaryExpression',
          operator,
          argument,
          span: mergeSpans(token.span, argument.span)
        };
        return unary;
      }
      if (operator === 'not') {
        const argument = this.parseExpression(PREFIX_BINDING_POWER);
        const unary: UnaryExpressionNode = {
          type: 'UnaryExpression',
          operator: 'not',
          argument,
          span: mergeSpans(token.span, argument.span)
        };
        return unary;
      }
      if (operator === 'sqrt' || operator === 'cbrt' || operator === 'nthRoot') {
        const argument = this.parseExpression(PREFIX_BINDING_POWER);
        const unary: UnaryExpressionNode = {
          type: 'UnaryExpression',
          operator,
          argument,
          span: mergeSpans(token.span, argument.span)
        };
        return unary;
      }
    }

    if (token.kind === 'leftParen') {
      const expression = this.parseExpression(0);
      const closing = this.expect('rightParen', 'Expected ")" to close this group');
      const group: GroupExpressionNode = {
        type: 'GroupExpression',
        expression,
        span: mergeSpans(token.span, closing.span)
      };
      return group;
    }

    if (token.kind === 'leftBracket') return this.parseArray(token);

    if (token.kind === 'bar') {
      const expression = this.parseExpression(0);
      const closing = this.expect('bar', 'Expected "|" to close the absolute-value expression');
      const absolute: AbsoluteExpressionNode = {
        type: 'AbsoluteExpression',
        expression,
        span: mergeSpans(token.span, closing.span)
      };
      return absolute;
    }

    throw new MathParserError(
      'Expected a number, variable, function, or opening bracket',
      token.span,
      ['number', 'identifier', '(', '[']
    );
  }

  private parseCall(callee: IdentifierNode, implicit: boolean): CallExpressionNode {
    const args: ExpressionNode[] = [];
    if (!this.check('rightParen')) {
      do {
        args.push(this.parseExpression(0));
      } while (this.match('comma') || this.match('semicolon'));
    }
    const closing = this.expect('rightParen', 'Expected ")" after function arguments');
    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      implicit,
      span: mergeSpans(callee.span, closing.span)
    };
  }

  private parseArray(opening: Token): ArrayExpressionNode {
    const rows: ExpressionNode[][] = [[]];
    if (this.check('rightBracket')) {
      const closing = this.advance();
      return { type: 'ArrayExpression', rows: [], span: mergeSpans(opening.span, closing.span) };
    }

    while (!this.check('eof') && !this.check('rightBracket')) {
      rows[rows.length - 1].push(this.parseExpression(0));
      if (this.match('comma')) continue;
      if (this.match('semicolon')) {
        rows.push([]);
        continue;
      }
      if (!this.check('rightBracket')) {
        throw new MathParserError(
          'Expected a comma, semicolon, or closing bracket in the array',
          this.peek().span,
          [',', ';', ']']
        );
      }
    }

    const closing = this.expect('rightBracket', 'Expected "]" to close the array');
    let normalizedRows: (readonly ExpressionNode[])[] = rows;

    if (rows.length === 1 && rows[0].length > 0 &&
        rows[0].every(entry => entry.type === 'ArrayExpression')) {
      normalizedRows = (rows[0] as ArrayExpressionNode[]).flatMap(entry => entry.rows);
    }

    if (normalizedRows.some(row => row.length === 0)) {
      throw new MathParserError('Matrix rows cannot be empty', closing.span);
    }
    const width = normalizedRows[0]?.length ?? 0;
    if (normalizedRows.some(row => row.length !== width)) {
      throw new MathParserError('All matrix rows must have the same number of entries', opening.span);
    }

    return {
      type: 'ArrayExpression',
      rows: normalizedRows,
      span: mergeSpans(opening.span, closing.span)
    };
  }

  private getFunctionArgumentBindingPower(): number {
    return this.options.implicitMultiplicationPriority === 'higher-than-division'
      ? MULTIPLICATIVE_BINDING_POWER + 5
      : MULTIPLICATIVE_BINDING_POWER;
  }

  private getInfixBindingPower(token: Token):
    | { readonly operator: BinaryOperator; readonly left: number; readonly right: number }
    | undefined {
    if (token.kind !== 'operator') return undefined;
    const operator = token.value ?? token.lexeme;

    if (operator === 'or') return { operator: 'or', left: LOGICAL_OR_BINDING_POWER, right: LOGICAL_OR_BINDING_POWER + 1 };
    if (operator === 'xor') return { operator: 'xor', left: LOGICAL_OR_BINDING_POWER + 1, right: LOGICAL_OR_BINDING_POWER + 2 };
    if (operator === 'and') return { operator: 'and', left: LOGICAL_AND_BINDING_POWER, right: LOGICAL_AND_BINDING_POWER + 1 };
    if (['=', '==', '!=', '<', '<=', '>', '>='].includes(operator)) {
      return { operator: operator as BinaryOperator, left: COMPARISON_BINDING_POWER, right: COMPARISON_BINDING_POWER + 1 };
    }
    if (operator === ':') return { operator: ':', left: 7, right: 8 };
    if (operator === '+' || operator === '-') {
      return { operator, left: ADDITIVE_BINDING_POWER, right: ADDITIVE_BINDING_POWER + 1 };
    }
    if (operator === '*' || operator === '/' || operator === 'mod') {
      return { operator, left: MULTIPLICATIVE_BINDING_POWER, right: MULTIPLICATIVE_BINDING_POWER + 1 };
    }
    if (operator === 'nCr' || operator === 'nPr') {
      return { operator, left: MULTIPLICATIVE_BINDING_POWER - 2, right: MULTIPLICATIVE_BINDING_POWER - 1 };
    }
    if (operator === '^') {
      return { operator: '^', left: POWER_BINDING_POWER, right: POWER_BINDING_POWER };
    }
    return undefined;
  }

  private expect(kind: Token['kind'], message: string): Token {
    if (this.check(kind)) return this.advance();
    throw new MathParserError(message, this.peek().span, [kind]);
  }

  private match(kind: Token['kind']): boolean {
    if (!this.check(kind)) return false;
    this.advance();
    return true;
  }

  private check(kind: Token['kind']): boolean {
    return this.peek().kind === kind;
  }

  private peek(): Token {
    return this.tokens[this.current] ?? this.tokens[this.tokens.length - 1];
  }

  private lookAhead(distance: number): Token {
    return this.tokens[this.current + distance] ?? this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const token = this.peek();
    if (token.kind !== 'eof') this.current += 1;
    return token;
  }
}

export function parse(source: string, options: ParserOptions = {}): ParseResult {
  const mergedOptions: Required<ParserOptions> = { ...DEFAULT_PARSER_OPTIONS, ...options };
  const tokens = tokenize(source, mergedOptions);
  return new Parser(tokens, mergedOptions).parse();
}

export function parseExpression(source: string, options: ParserOptions = {}): ExpressionNode {
  return parse(source, options).ast;
}
