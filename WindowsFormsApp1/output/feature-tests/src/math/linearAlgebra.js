"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMatrix = exports.solveLinearSystem = exports.inverse = exports.determinant = exports.reducedRowEchelon = exports.matrixMultiply = exports.matrixAdd = exports.transpose = exports.parseMatrix = void 0;
const clean = (value) => Math.abs(value) < 1e-12 ? 0 : value;
const validateMatrix = (matrix, allowEmpty = false) => {
    if ((!allowEmpty && matrix.length === 0) || matrix.some((row) => row.length === 0)) {
        throw new Error('EMPTY_MATRIX');
    }
    const columns = matrix[0]?.length ?? 0;
    if (matrix.some((row) => row.length !== columns || row.some((value) => !Number.isFinite(value)))) {
        throw new Error('INVALID_MATRIX');
    }
    return { rows: matrix.length, columns };
};
const parseMatrix = (source) => {
    const rows = source
        .trim()
        .split(/[;\n]+/)
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => row.split(/[\s,]+/).filter(Boolean).map(Number));
    validateMatrix(rows);
    return rows;
};
exports.parseMatrix = parseMatrix;
const transpose = (matrix) => {
    const { rows, columns } = validateMatrix(matrix);
    return Array.from({ length: columns }, (_, column) => Array.from({ length: rows }, (_, row) => matrix[row][column]));
};
exports.transpose = transpose;
const matrixAdd = (left, right) => {
    const a = validateMatrix(left);
    const b = validateMatrix(right);
    if (a.rows !== b.rows || a.columns !== b.columns)
        throw new Error('DIMENSION_MISMATCH');
    return left.map((row, rowIndex) => row.map((value, columnIndex) => value + right[rowIndex][columnIndex]));
};
exports.matrixAdd = matrixAdd;
const matrixMultiply = (left, right) => {
    const a = validateMatrix(left);
    const b = validateMatrix(right);
    if (a.columns !== b.rows)
        throw new Error('DIMENSION_MISMATCH');
    return Array.from({ length: a.rows }, (_, row) => Array.from({ length: b.columns }, (_, column) => left[row].reduce((sum, value, index) => sum + value * right[index][column], 0)));
};
exports.matrixMultiply = matrixMultiply;
const reducedRowEchelon = (matrix) => {
    const { rows, columns } = validateMatrix(matrix);
    const result = matrix.map((row) => [...row]);
    let pivotRow = 0;
    for (let column = 0; column < columns && pivotRow < rows; column += 1) {
        let bestRow = pivotRow;
        for (let row = pivotRow + 1; row < rows; row += 1) {
            if (Math.abs(result[row][column]) > Math.abs(result[bestRow][column]))
                bestRow = row;
        }
        if (Math.abs(result[bestRow][column]) < 1e-12)
            continue;
        [result[pivotRow], result[bestRow]] = [result[bestRow], result[pivotRow]];
        const pivot = result[pivotRow][column];
        result[pivotRow] = result[pivotRow].map((value) => value / pivot);
        for (let row = 0; row < rows; row += 1) {
            if (row === pivotRow)
                continue;
            const factor = result[row][column];
            if (Math.abs(factor) < 1e-12)
                continue;
            result[row] = result[row].map((value, index) => value - factor * result[pivotRow][index]);
        }
        pivotRow += 1;
    }
    return result.map((row) => row.map(clean));
};
exports.reducedRowEchelon = reducedRowEchelon;
const determinant = (matrix) => {
    const { rows, columns } = validateMatrix(matrix);
    if (rows !== columns)
        throw new Error('SQUARE_MATRIX_REQUIRED');
    const work = matrix.map((row) => [...row]);
    let result = 1;
    for (let column = 0; column < columns; column += 1) {
        let pivot = column;
        for (let row = column + 1; row < rows; row += 1) {
            if (Math.abs(work[row][column]) > Math.abs(work[pivot][column]))
                pivot = row;
        }
        if (Math.abs(work[pivot][column]) < 1e-12)
            return 0;
        if (pivot !== column) {
            [work[pivot], work[column]] = [work[column], work[pivot]];
            result *= -1;
        }
        const pivotValue = work[column][column];
        result *= pivotValue;
        for (let row = column + 1; row < rows; row += 1) {
            const factor = work[row][column] / pivotValue;
            for (let next = column + 1; next < columns; next += 1) {
                work[row][next] -= factor * work[column][next];
            }
        }
    }
    return clean(result);
};
exports.determinant = determinant;
const inverse = (matrix) => {
    const { rows, columns } = validateMatrix(matrix);
    if (rows !== columns)
        throw new Error('SQUARE_MATRIX_REQUIRED');
    const augmented = matrix.map((row, rowIndex) => [
        ...row,
        ...Array.from({ length: rows }, (_, column) => rowIndex === column ? 1 : 0)
    ]);
    const reduced = (0, exports.reducedRowEchelon)(augmented);
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            const expected = row === column ? 1 : 0;
            if (Math.abs(reduced[row][column] - expected) > 1e-8)
                throw new Error('SINGULAR_MATRIX');
        }
    }
    return reduced.map((row) => row.slice(columns).map(clean));
};
exports.inverse = inverse;
const solveLinearSystem = (coefficients, constants) => {
    const { rows, columns } = validateMatrix(coefficients);
    if (rows !== columns || constants.length !== rows || constants.some((value) => !Number.isFinite(value))) {
        throw new Error('DIMENSION_MISMATCH');
    }
    const reduced = (0, exports.reducedRowEchelon)(coefficients.map((row, index) => [...row, constants[index]]));
    for (let row = 0; row < rows; row += 1) {
        if (Math.abs(reduced[row][row] - 1) > 1e-8)
            throw new Error('SINGULAR_MATRIX');
    }
    return reduced.map((row) => clean(row[columns]));
};
exports.solveLinearSystem = solveLinearSystem;
const formatMatrix = (matrix, precision = 6) => matrix
    .map((row) => row.map((value) => Number(value.toPrecision(precision))).join('\t'))
    .join('\n');
exports.formatMatrix = formatMatrix;
