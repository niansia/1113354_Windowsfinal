export type AngleMode = 'deg' | 'rad';

export interface ExpressionOptions {
  angleMode?: AngleMode;
  variables?: Record<string, number>;
}

type TokenType = 'number' | 'identifier' | 'operator' | 'eof';

interface Token {
  type: TokenType;
  value: string;
}

const factorial = (value: number): number => {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error('FACTORIAL_DOMAIN');
  }
  let result = 1;
  for (let index = 2; index <= value; index += 1) result *= index;
  return result;
};

const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const current = source[index];
    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    const number = source.slice(index).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      tokens.push({ type: 'number', value: number[0] });
      index += number[0].length;
      continue;
    }

    const identifier = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) {
      tokens.push({ type: 'identifier', value: identifier[0] });
      index += identifier[0].length;
      continue;
    }

    if ('+-*/%^!(),'.includes(current)) {
      tokens.push({ type: 'operator', value: current });
      index += 1;
      continue;
    }

    throw new Error('INVALID_TOKEN');
  }

  tokens.push({ type: 'eof', value: '' });
  return tokens;
};

class ExpressionParser {
  private index = 0;
  private readonly angleMode: AngleMode;
  private readonly variables: Record<string, number>;

  constructor(private readonly tokens: Token[], options: ExpressionOptions) {
    this.angleMode = options.angleMode ?? 'rad';
    this.variables = Object.fromEntries(
      Object.entries(options.variables ?? {}).map(([name, value]) => [name.toLowerCase(), value])
    );
  }

  parse(): number {
    const result = this.parseAdditive();
    if (this.peek().type !== 'eof') throw new Error('UNEXPECTED_TOKEN');
    if (!Number.isFinite(result)) throw new Error('NON_FINITE_RESULT');
    return result;
  }

  private peek(): Token {
    return this.tokens[this.index];
  }

  private consume(value?: string): Token {
    const token = this.tokens[this.index];
    if (value !== undefined && token.value !== value) throw new Error('EXPECTED_TOKEN');
    this.index += 1;
    return token;
  }

  private match(value: string): boolean {
    if (this.peek().value !== value) return false;
    this.index += 1;
    return true;
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative();
    while (this.peek().value === '+' || this.peek().value === '-') {
      const operator = this.consume().value;
      const right = this.parseMultiplicative();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary();
    while (['*', '/', '%'].includes(this.peek().value)) {
      const operator = this.consume().value;
      const right = this.parseUnary();
      if ((operator === '/' || operator === '%') && right === 0) throw new Error('DIVIDE_BY_ZERO');
      if (operator === '*') value *= right;
      else if (operator === '/') value /= right;
      else value %= right;
    }
    return value;
  }

  private parseUnary(): number {
    if (this.match('+')) return this.parseUnary();
    if (this.match('-')) return -this.parseUnary();
    return this.parsePower();
  }

  private parsePower(): number {
    let value = this.parsePostfix();
    if (this.match('^')) value **= this.parseUnary();
    return value;
  }

  private parsePostfix(): number {
    let value = this.parsePrimary();
    while (this.match('!')) value = factorial(value);
    return value;
  }

  private parsePrimary(): number {
    const token = this.peek();
    if (token.type === 'number') {
      this.consume();
      return Number(token.value);
    }

    if (this.match('(')) {
      const value = this.parseAdditive();
      this.consume(')');
      return value;
    }

    if (token.type !== 'identifier') throw new Error('EXPECTED_VALUE');
    const name = this.consume().value.toLowerCase();

    if (this.match('(')) {
      const args: number[] = [];
      if (!this.match(')')) {
        do {
          args.push(this.parseAdditive());
        } while (this.match(','));
        this.consume(')');
      }
      return this.callFunction(name, args);
    }

    if (name === 'pi') return Math.PI;
    if (name === 'e') return Math.E;
    if (name === 'tau') return Math.PI * 2;
    if (Object.prototype.hasOwnProperty.call(this.variables, name)) return this.variables[name];
    throw new Error('UNKNOWN_IDENTIFIER');
  }

  private callFunction(name: string, args: number[]): number {
    const unary = (callback: (value: number) => number) => {
      if (args.length !== 1) throw new Error('ARGUMENT_COUNT');
      return callback(args[0]);
    };
    const toRadians = (value: number) => this.angleMode === 'deg' ? value * Math.PI / 180 : value;
    const fromRadians = (value: number) => this.angleMode === 'deg' ? value * 180 / Math.PI : value;

    switch (name) {
      case 'sin': return unary((value) => Math.sin(toRadians(value)));
      case 'cos': return unary((value) => Math.cos(toRadians(value)));
      case 'tan': return unary((value) => Math.tan(toRadians(value)));
      case 'asin': return unary((value) => fromRadians(Math.asin(value)));
      case 'acos': return unary((value) => fromRadians(Math.acos(value)));
      case 'atan': return unary((value) => fromRadians(Math.atan(value)));
      case 'sinh': return unary(Math.sinh);
      case 'cosh': return unary(Math.cosh);
      case 'tanh': return unary(Math.tanh);
      case 'sqrt': return unary((value) => {
        if (value < 0) throw new Error('DOMAIN_ERROR');
        return Math.sqrt(value);
      });
      case 'cbrt': return unary(Math.cbrt);
      case 'abs': return unary(Math.abs);
      case 'exp': return unary(Math.exp);
      case 'ln': return unary((value) => {
        if (value <= 0) throw new Error('DOMAIN_ERROR');
        return Math.log(value);
      });
      case 'log':
      case 'log10': return unary((value) => {
        if (value <= 0) throw new Error('DOMAIN_ERROR');
        return Math.log10(value);
      });
      case 'floor': return unary(Math.floor);
      case 'ceil': return unary(Math.ceil);
      case 'round': return unary(Math.round);
      case 'sign': return unary(Math.sign);
      case 'fact': return unary(factorial);
      case 'min':
        if (args.length === 0) throw new Error('ARGUMENT_COUNT');
        return Math.min(...args);
      case 'max':
        if (args.length === 0) throw new Error('ARGUMENT_COUNT');
        return Math.max(...args);
      case 'pow':
        if (args.length !== 2) throw new Error('ARGUMENT_COUNT');
        return args[0] ** args[1];
      case 'root':
        if (args.length !== 2 || args[1] === 0) throw new Error('ARGUMENT_COUNT');
        return args[0] ** (1 / args[1]);
      default:
        throw new Error('UNKNOWN_FUNCTION');
    }
  }
}

export const evaluateExpression = (source: string, options: ExpressionOptions = {}): number => {
  if (!source.trim()) throw new Error('EMPTY_EXPRESSION');
  return new ExpressionParser(tokenize(source), options).parse();
};
