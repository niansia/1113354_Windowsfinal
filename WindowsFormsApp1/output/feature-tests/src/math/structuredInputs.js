"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertMathToken = exports.graphRowsToGraph = exports.seriesRowsToNumbers = exports.matrixGridToNumbers = exports.resizeMatrixGrid = void 0;
const boundedSize = (value) => {
    if (!Number.isInteger(value) || value < 1 || value > 10)
        throw new Error('INVALID_GRID_SIZE');
    return value;
};
const resizeMatrixGrid = (grid, rows, columns) => {
    const nextRows = boundedSize(rows);
    const nextColumns = boundedSize(columns);
    return Array.from({ length: nextRows }, (_, rowIndex) => Array.from({ length: nextColumns }, (_, columnIndex) => grid[rowIndex]?.[columnIndex] ?? ''));
};
exports.resizeMatrixGrid = resizeMatrixGrid;
const matrixGridToNumbers = (grid) => {
    if (grid.length === 0 || grid[0].length === 0)
        throw new Error('INVALID_MATRIX');
    const columns = grid[0].length;
    if (grid.some((row) => row.length !== columns))
        throw new Error('INVALID_MATRIX');
    return grid.map((row) => row.map((cell) => {
        if (!cell.trim())
            return 0;
        const value = Number(cell);
        if (!Number.isFinite(value))
            throw new Error('INVALID_MATRIX');
        return value;
    }));
};
exports.matrixGridToNumbers = matrixGridToNumbers;
const seriesRowsToNumbers = (rows) => {
    const values = rows
        .map((value) => value.trim())
        .filter(Boolean)
        .map(Number);
    if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
        throw new Error('INVALID_NUMBER_LIST');
    }
    return values;
};
exports.seriesRowsToNumbers = seriesRowsToNumbers;
const graphRowsToGraph = (rows, directed) => {
    const populated = rows.filter((row) => row.from.trim() || row.to.trim() || row.weight.trim());
    const edges = populated.map((row) => {
        const from = row.from.trim();
        const to = row.to.trim();
        if (!from || !to)
            throw new Error('INVALID_GRAPH');
        const weight = row.weight.trim() ? Number(row.weight) : 1;
        if (!Number.isFinite(weight))
            throw new Error('INVALID_GRAPH');
        return { from, to, weight };
    });
    if (edges.length === 0)
        throw new Error('INVALID_GRAPH');
    return { directed, edges };
};
exports.graphRowsToGraph = graphRowsToGraph;
const insertMathToken = (source, selectionStart, selectionEnd, token, caretOffset = token.length) => {
    const start = Math.max(0, Math.min(selectionStart, source.length));
    const end = Math.max(start, Math.min(selectionEnd, source.length));
    const selected = source.slice(start, end);
    const closesGroup = token.endsWith('(');
    const insertion = closesGroup ? `${token}${selected})` : token;
    return {
        value: `${source.slice(0, start)}${insertion}${source.slice(end)}`,
        caret: start + Math.max(0, Math.min(caretOffset, insertion.length))
    };
};
exports.insertMathToken = insertMathToken;
