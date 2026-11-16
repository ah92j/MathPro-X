import { describe, expect, it } from 'vitest';
import type {
  BinaryExpressionNode,
  CallExpressionNode,
  PostfixExpressionNode,
  UnaryExpressionNode
} from './nodes';
import { parse, parseExpression } from './parser';
import { tokenize, TokenizerError } from './tokenizer';

function asBinary(node: ReturnType<typeof parseExpression>): BinaryExpressionNode {
  expect(node.type).toBe('BinaryExpression');
  return node as BinaryExpressionNode;
}

describe('MathPro X expression tokenizer', () => {
  it('recognizes decimal, scientific-notation and based integer literals', () => {
    const tokens = tokenize('12.50 + 2.5e-3 + 0xFF + 0b1010');
    expect(tokens.filter(token => token.kind === 'number').map(token => token.value))
      .toEqual(['12.50', '2.5e-3', '0xFF', '0b1010']);
    expect(tokens.filter(token => token.kind === 'number').map(token => token.radix))
      .toEqual([10, 10, 16, 2]);
  });

  it('normalizes calculator symbols and word aliases', () => {
    const tokens = tokenize('Ans + π × √9 + nCr + Σ(1,2) + Sin(30) + LOGBASE(2,8)');
    expect(tokens.map(token => token.value).filter(Boolean)).toContain('ans');
    expect(tokens.map(token => token.value).filter(Boolean)).toContain('pi');
    expect(tokens.map(token => token.value).filter(Boolean)).toContain('*');
    expect(tokens.map(token => token.value).filter(Boolean)).toContain('sqrt');
    expect(tokens.map(token => token.value).filter(Boolean)).toContain('nCr');
    expect(tokens.map(token => token.value).filter(Boolean)).toContain('sum');
    expect(tokens.map(token => token.value).filter(Boolean)).toContain('sin');
    expect(tokens.map(token => token.value).filter(Boolean)).toContain('logBase');
  });

  it('reports invalid characters and malformed numeric separators', () => {
    expect(() => tokenize('2 @ 3')).toThrow(TokenizerError);
    expect(() => tokenize('1__2')).toThrow(TokenizerError);
    expect(() => tokenize('12_')).toThrow(TokenizerError);
  });

  it('supports comma decimal notation with semicolon argument separators', () => {
    const tokens = tokenize('max(1,25; 2,50)', {
      decimalSeparator: ',',
      argumentSeparator: ';'
    });
    expect(tokens.filter(token => token.kind === 'number').map(token => token.value))
      .toEqual(['1.25', '2.50']);
    expect(tokens.filter(token => token.kind === 'semicolon')).toHaveLength(1);
  });
});

describe('MathPro X Pratt parser', () => {
  it('parses arithmetic precedence and right-associative powers', () => {
    const tree = asBinary(parseExpression('2+3*4'));
    expect(tree.operator).toBe('+');
    expect(asBinary(tree.right).operator).toBe('*');

    const powers = asBinary(parseExpression('2^3^2'));
    expect(powers.operator).toBe('^');
    expect(asBinary(powers.right).operator).toBe('^');
  });

  it('parses unary signs below exponentiation', () => {
    const tree = parseExpression('-2^2');
    expect(tree.type).toBe('UnaryExpression');
    expect((tree as UnaryExpressionNode).operator).toBe('-');
    expect((tree as UnaryExpressionNode).argument.type).toBe('BinaryExpression');
  });

  it('supports implicit multiplication and both 1/2π interpretations', () => {
    const standard = asBinary(parseExpression('1/2π'));
    expect(standard.operator).toBe('*');
    expect(standard.implicit).toBe(true);
    expect(asBinary(standard.left).operator).toBe('/');

    const higher = asBinary(parseExpression('1/2π', {
      implicitMultiplicationPriority: 'higher-than-division'
    }));
    expect(higher.operator).toBe('/');
    expect(asBinary(higher.right).operator).toBe('*');

    const variableProduct = asBinary(parseExpression('3x'));
    expect(variableProduct.operator).toBe('*');
    expect(variableProduct.implicit).toBe(true);
  });

  it('parses functions, nested calls and symbolic operators as function calls', () => {
    const tree = parseExpression('logBase(2, sqrt(81)) + Σ(i,1,n,i)');
    const root = asBinary(tree);
    expect(root.operator).toBe('+');
    expect(root.left.type).toBe('CallExpression');
    expect((root.left as CallExpressionNode).callee.name).toBe('logBase');
    expect(root.right.type).toBe('CallExpression');
    expect((root.right as CallExpressionNode).callee.name).toBe('sum');

    const noParentheses = parseExpression('sqrt 81');
    expect(noParentheses.type).toBe('CallExpression');
    expect((noParentheses as CallExpressionNode).implicit).toBe(true);
  });

  it('preserves percentage mode in the AST for the evaluator', () => {
    const relative = asBinary(parseExpression('100+20%', { percentageMode: 'relative' }));
    const literal = asBinary(parseExpression('100+20%', { percentageMode: 'literal' }));
    expect(relative.right.type).toBe('PostfixExpression');
    expect((relative.right as PostfixExpressionNode).percentageMode).toBe('relative');
    expect((literal.right as PostfixExpressionNode).percentageMode).toBe('literal');
  });

  it('supports factorial, modulo, combinations and comparisons', () => {
    const factorial = parseExpression('5!');
    expect(factorial.type).toBe('PostfixExpression');
    expect(asBinary(parseExpression('17 mod 5')).operator).toBe('mod');
    expect(asBinary(parseExpression('10 nCr 3')).operator).toBe('nCr');
    expect(asBinary(parseExpression('x<=4')).operator).toBe('<=');

    const moduloCall = parseExpression('mod(17,5)');
    expect(moduloCall.type).toBe('CallExpression');
    expect((moduloCall as CallExpressionNode).callee.name).toBe('mod');

    const combinationCall = parseExpression('nCr(10,3)');
    expect(combinationCall.type).toBe('CallExpression');
    expect((combinationCall as CallExpressionNode).callee.name).toBe('nCr');
  });

  it('supports square roots, cube roots, nth roots and absolute-value bars', () => {
    expect((parseExpression('√9') as UnaryExpressionNode).operator).toBe('sqrt');
    expect((parseExpression('³√27') as UnaryExpressionNode).operator).toBe('cbrt');
    expect((parseExpression('ⁿ√81') as UnaryExpressionNode).operator).toBe('nthRoot');
    expect(parseExpression('|x+1|').type).toBe('AbsoluteExpression');
  });

  it('parses degree-minute-second literals as a dedicated AST node', () => {
    const angle = parseExpression('30°15′20″');
    expect(angle.type).toBe('SexagesimalLiteral');
    if (angle.type !== 'SexagesimalLiteral') throw new Error('Expected a sexagesimal literal.');
    expect(angle.degrees).toBe('30');
    expect(angle.minutes).toBe('15');
    expect(angle.seconds).toBe('20');

    const degreesOnly = parseExpression('45°');
    expect(degreesOnly.type).toBe('SexagesimalLiteral');
  });

  it('parses rectangular matrix literals and rejects ragged matrices', () => {
    const matrix = parseExpression('[[1,2],[3,4]]');
    expect(matrix.type).toBe('ArrayExpression');
    expect((matrix as { rows: readonly (readonly unknown[])[] }).rows).toHaveLength(2);
    expect(() => parseExpression('[1,2;3]')).toThrow(/same number of entries/i);
  });

  it('repairs a missing opening parenthesis such as 3+2)5', () => {
    const result = parse('3+2)5');
    expect(result.diagnostics.some(item => item.code === 'OPEN_PARENTHESIS_INSERTED')).toBe(true);
    const tree = asBinary(result.ast);
    expect(tree.implicit).toBe(true);
    expect(tree.left.type).toBe('GroupExpression');
  });

  it('auto-closes unfinished parentheses and records the repair', () => {
    const result = parse('(3+2');
    expect(result.diagnostics.some(item => item.code === 'CLOSE_PARENTHESIS_INSERTED')).toBe(true);
    expect(result.ast.type).toBe('GroupExpression');
  });

  it('ignores trailing plus and minus operators when enabled', () => {
    const result = parse('3+4+');
    expect(result.ast.type).toBe('BinaryExpression');
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].code).toBe('TRAILING_OPERATOR_REMOVED');
    expect(() => parse('3+4+', { trailingOperatorTolerance: false })).toThrow();
  });

  it('keeps source spans and reports useful syntax errors', () => {
    const result = parse('2*(3+4)');
    expect(result.ast.span.start.offset).toBe(0);
    expect(result.ast.span.end.offset).toBe(7);
    expect(() => parse('2+*3')).toThrow(/Expected a number/i);
  });
});
