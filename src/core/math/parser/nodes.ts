export interface SourcePosition {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface SourceSpan {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

interface BaseNode {
  readonly span: SourceSpan;
}

export type UnaryOperator = '+' | '-' | 'not' | 'sqrt' | 'cbrt' | 'nthRoot';
export type BinaryOperator =
  | '+' | '-' | '*' | '/' | '^' | 'mod' | 'nCr' | 'nPr'
  | '=' | '==' | '!=' | '<' | '<=' | '>' | '>='
  | 'and' | 'or' | 'xor' | ':';

export type PercentageMode = 'relative' | 'literal';

export interface NumberLiteralNode extends BaseNode {
  readonly type: 'NumberLiteral';
  readonly value: string;
  readonly radix: 2 | 8 | 10 | 16;
}

export interface IdentifierNode extends BaseNode {
  readonly type: 'Identifier';
  readonly name: string;
}

export interface SexagesimalLiteralNode extends BaseNode {
  readonly type: 'SexagesimalLiteral';
  readonly degrees: string;
  readonly minutes: string;
  readonly seconds: string;
}

export interface UnaryExpressionNode extends BaseNode {
  readonly type: 'UnaryExpression';
  readonly operator: UnaryOperator;
  readonly argument: ExpressionNode;
}

export interface BinaryExpressionNode extends BaseNode {
  readonly type: 'BinaryExpression';
  readonly operator: BinaryOperator;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
  readonly implicit: boolean;
}

export interface PostfixExpressionNode extends BaseNode {
  readonly type: 'PostfixExpression';
  readonly operator: '!' | '%';
  readonly argument: ExpressionNode;
  readonly percentageMode?: PercentageMode;
}

export interface CallExpressionNode extends BaseNode {
  readonly type: 'CallExpression';
  readonly callee: IdentifierNode;
  readonly arguments: readonly ExpressionNode[];
  readonly implicit: boolean;
}

export interface GroupExpressionNode extends BaseNode {
  readonly type: 'GroupExpression';
  readonly expression: ExpressionNode;
}

export interface ArrayExpressionNode extends BaseNode {
  readonly type: 'ArrayExpression';
  readonly rows: readonly (readonly ExpressionNode[])[];
}

export interface AbsoluteExpressionNode extends BaseNode {
  readonly type: 'AbsoluteExpression';
  readonly expression: ExpressionNode;
}

export type ExpressionNode =
  | NumberLiteralNode
  | IdentifierNode
  | SexagesimalLiteralNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | PostfixExpressionNode
  | CallExpressionNode
  | GroupExpressionNode
  | ArrayExpressionNode
  | AbsoluteExpressionNode;

export type DiagnosticCode =
  | 'TRAILING_OPERATOR_REMOVED'
  | 'OPEN_PARENTHESIS_INSERTED'
  | 'CLOSE_PARENTHESIS_INSERTED';

export interface ParserDiagnostic {
  readonly code: DiagnosticCode;
  readonly message: string;
  readonly span: SourceSpan;
}

export interface ParseResult {
  readonly ast: ExpressionNode;
  readonly diagnostics: readonly ParserDiagnostic[];
}
