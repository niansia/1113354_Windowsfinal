"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimizeBooleanExpression = exports.generateTruthTable = exports.evaluateBooleanExpression = exports.booleanVariables = void 0;
const normalizeOperator = (value) => {
    const lower = value.toLowerCase();
    if (['not', '~'].includes(lower))
        return '!';
    if (['and', '&&', '*'].includes(lower))
        return '&';
    if (['or', '||', '+'].includes(lower))
        return '|';
    if (['xor', '^'].includes(lower))
        return 'xor';
    return value;
};
const tokenizeBoolean = (source) => {
    const tokens = [];
    let index = 0;
    while (index < source.length) {
        const current = source[index];
        if (/\s/.test(current)) {
            index += 1;
            continue;
        }
        const pair = source.slice(index, index + 2);
        if (pair === '&&' || pair === '||') {
            tokens.push({ type: 'operator', value: normalizeOperator(pair) });
            index += 2;
            continue;
        }
        if ('!~&|+*^()'.includes(current)) {
            tokens.push({ type: 'operator', value: normalizeOperator(current) });
            index += 1;
            continue;
        }
        const identifier = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (identifier) {
            const value = identifier[0];
            const normalized = normalizeOperator(value);
            if (['!', '&', '|', 'xor'].includes(normalized))
                tokens.push({ type: 'operator', value: normalized });
            else if (['true', 'false'].includes(value.toLowerCase()))
                tokens.push({ type: 'constant', value: value.toLowerCase() });
            else
                tokens.push({ type: 'identifier', value });
            index += value.length;
            continue;
        }
        if (current === '0' || current === '1') {
            tokens.push({ type: 'constant', value: current });
            index += 1;
            continue;
        }
        throw new Error('INVALID_BOOLEAN_TOKEN');
    }
    tokens.push({ type: 'eof', value: '' });
    return tokens;
};
class BooleanParser {
    tokens;
    assignment;
    index = 0;
    constructor(tokens, assignment) {
        this.tokens = tokens;
        this.assignment = assignment;
    }
    parse() {
        const result = this.parseOr();
        if (this.peek().type !== 'eof')
            throw new Error('UNEXPECTED_BOOLEAN_TOKEN');
        return result;
    }
    peek() {
        return this.tokens[this.index];
    }
    match(value) {
        if (this.peek().value !== value)
            return false;
        this.index += 1;
        return true;
    }
    parseOr() {
        let value = this.parseXor();
        while (this.match('|')) {
            const right = this.parseXor();
            value = value || right;
        }
        return value;
    }
    parseXor() {
        let value = this.parseAnd();
        while (this.match('xor')) {
            const right = this.parseAnd();
            value = value !== right;
        }
        return value;
    }
    parseAnd() {
        let value = this.parseUnary();
        while (this.match('&')) {
            const right = this.parseUnary();
            value = value && right;
        }
        return value;
    }
    parseUnary() {
        if (this.match('!'))
            return !this.parseUnary();
        if (this.match('(')) {
            const value = this.parseOr();
            if (!this.match(')'))
                throw new Error('EXPECTED_BOOLEAN_PAREN');
            return value;
        }
        const token = this.peek();
        this.index += 1;
        if (token.type === 'constant')
            return token.value === '1' || token.value === 'true';
        if (token.type === 'identifier') {
            if (!Object.prototype.hasOwnProperty.call(this.assignment, token.value))
                throw new Error('MISSING_BOOLEAN_VARIABLE');
            return Boolean(this.assignment[token.value]);
        }
        throw new Error('EXPECTED_BOOLEAN_VALUE');
    }
}
const booleanVariables = (source) => [...new Set(tokenizeBoolean(source).filter((token) => token.type === 'identifier').map((token) => token.value))]
    .sort((left, right) => left.localeCompare(right));
exports.booleanVariables = booleanVariables;
const evaluateBooleanExpression = (source, assignment) => {
    if (!source.trim())
        throw new Error('EMPTY_BOOLEAN_EXPRESSION');
    return new BooleanParser(tokenizeBoolean(source), assignment).parse();
};
exports.evaluateBooleanExpression = evaluateBooleanExpression;
const generateTruthTable = (source) => {
    const variables = (0, exports.booleanVariables)(source);
    if (variables.length > 8)
        throw new Error('TOO_MANY_BOOLEAN_VARIABLES');
    const rows = Array.from({ length: 2 ** variables.length }, (_, rowIndex) => {
        const assignment = Object.fromEntries(variables.map((variable, variableIndex) => [
            variable,
            Boolean(rowIndex & (1 << (variables.length - variableIndex - 1)))
        ]));
        return { assignment, result: (0, exports.evaluateBooleanExpression)(source, assignment) };
    });
    const sopTerms = rows
        .filter((row) => row.result)
        .map((row) => variables.map((variable) => row.assignment[variable] ? variable : `!${variable}`).join(' & '));
    const posTerms = rows
        .filter((row) => !row.result)
        .map((row) => `(${variables.map((variable) => row.assignment[variable] ? `!${variable}` : variable).join(' | ')})`);
    return {
        variables,
        rows,
        canonicalSop: sopTerms.length === 0 ? '0' : sopTerms.length === rows.length ? '1' : sopTerms.join(' | '),
        canonicalPos: posTerms.length === 0 ? '1' : posTerms.length === rows.length ? '0' : posTerms.join(' & ')
    };
};
exports.generateTruthTable = generateTruthTable;
const combineImplicants = (left, right) => {
    let differences = 0;
    let pattern = '';
    for (let index = 0; index < left.pattern.length; index += 1) {
        if (left.pattern[index] === right.pattern[index])
            pattern += left.pattern[index];
        else {
            if (left.pattern[index] === '-' || right.pattern[index] === '-')
                return null;
            differences += 1;
            pattern += '-';
        }
    }
    if (differences !== 1)
        return null;
    return { pattern, covers: new Set([...left.covers, ...right.covers]) };
};
const minimizeBooleanExpression = (source) => {
    const table = (0, exports.generateTruthTable)(source);
    const minterms = table.rows.flatMap((row, index) => row.result ? [index] : []);
    if (minterms.length === 0)
        return '0';
    if (minterms.length === table.rows.length)
        return '1';
    if (table.variables.length > 6)
        throw new Error('TOO_MANY_BOOLEAN_VARIABLES');
    let current = minterms.map((value) => ({
        pattern: value.toString(2).padStart(table.variables.length, '0'),
        covers: new Set([value])
    }));
    const primes = [];
    while (current.length) {
        const used = new Set();
        const next = new Map();
        for (let left = 0; left < current.length; left += 1) {
            for (let right = left + 1; right < current.length; right += 1) {
                const combined = combineImplicants(current[left], current[right]);
                if (!combined)
                    continue;
                used.add(left);
                used.add(right);
                const existing = next.get(combined.pattern);
                if (existing)
                    combined.covers.forEach((value) => existing.covers.add(value));
                else
                    next.set(combined.pattern, combined);
            }
        }
        current.forEach((term, index) => {
            if (!used.has(index) && !primes.some((prime) => prime.pattern === term.pattern))
                primes.push(term);
        });
        current = [...next.values()];
    }
    const selected = [];
    const remaining = new Set(minterms);
    for (const minterm of minterms) {
        const covering = primes.filter((prime) => prime.covers.has(minterm));
        if (covering.length === 1 && !selected.includes(covering[0]))
            selected.push(covering[0]);
    }
    selected.forEach((prime) => prime.covers.forEach((value) => remaining.delete(value)));
    while (remaining.size) {
        const candidates = primes
            .filter((prime) => !selected.includes(prime))
            .map((prime) => ({
            prime,
            coverage: [...remaining].filter((value) => prime.covers.has(value)).length,
            literals: prime.pattern.replace(/-/g, '').length
        }))
            .filter((candidate) => candidate.coverage > 0)
            .sort((left, right) => right.coverage - left.coverage || left.literals - right.literals);
        if (!candidates.length)
            throw new Error('MINIMIZATION_FAILED');
        selected.push(candidates[0].prime);
        candidates[0].prime.covers.forEach((value) => remaining.delete(value));
    }
    return selected
        .sort((left, right) => left.pattern.localeCompare(right.pattern))
        .map((prime) => prime.pattern
        .split('')
        .flatMap((bit, index) => bit === '-' ? [] : [bit === '1' ? table.variables[index] : `!${table.variables[index]}`])
        .join(' & ') || '1')
        .join(' | ');
};
exports.minimizeBooleanExpression = minimizeBooleanExpression;
