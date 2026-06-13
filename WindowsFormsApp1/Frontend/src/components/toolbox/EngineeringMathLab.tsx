import React, { useMemo, useState } from 'react';
import {
  Braces,
  ChartNoAxesCombined,
  ChartSpline,
  Copy,
  Grid3X3,
  Hash,
  Network,
  Play,
  Sigma,
  SquareFunction,
  type LucideIcon
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { formatFusionDateTime } from '../../i18n/localeFormatting';
import { useSettings } from '../../state/SettingsContext';
import {
  binomialProbability,
  booleanVariables,
  breadthFirstTraversal,
  combinations,
  connectedComponents,
  convertIntegerBase,
  definiteIntegral,
  describeSample,
  determinant,
  evaluateBooleanExpression,
  evaluateExpression,
  formatMatrix,
  generateTruthTable,
  gcd,
  graphDegrees,
  graphRowsToGraph,
  inverse,
  isPrime,
  lcm,
  linearRegression,
  matrixAdd,
  matrixGridToNumbers,
  matrixMultiply,
  minimumSpanningTree,
  minimizeBooleanExpression,
  modPow,
  normalCdf,
  normalPdf,
  numericalDerivative,
  permutations,
  primeFactorization,
  reducedRowEchelon,
  resizeMatrixGrid,
  seriesRowsToNumbers,
  shortestPath,
  solveLinearSystem,
  solveRoot,
  topologicalSort,
  transpose,
  zScore,
  type AngleMode,
  type EditableGraphRow
} from '../../math/index';
import {
  FormulaEditor,
  GraphEdgeEditor,
  MatrixEditor,
  NumberControl,
  OperationPicker,
  PairedSeriesEditor,
  SeriesEditor,
  type FormulaKey
} from './EngineeringMathInputs';

type LabMode = 'scientific' | 'calculus' | 'linear' | 'discrete' | 'statistics' | 'graph' | 'boolean';

interface ResultTable {
  headers: string[];
  rows: string[][];
}

interface LabResult {
  title: string;
  lines: string[];
  table?: ResultTable;
  raw: string;
}

interface HistoryEntry {
  id: number;
  mode: LabMode;
  title: string;
  raw: string;
  createdAt: Date;
}

const MODES: Array<{ id: LabMode; label: string; icon: LucideIcon }> = [
  { id: 'scientific', label: '科學運算', icon: SquareFunction },
  { id: 'calculus', label: '微積分', icon: ChartSpline },
  { id: 'linear', label: '線性代數', icon: Grid3X3 },
  { id: 'discrete', label: '離散數學', icon: Hash },
  { id: 'statistics', label: '機率統計', icon: ChartNoAxesCombined },
  { id: 'graph', label: '圖論', icon: Network },
  { id: 'boolean', label: '布林代數', icon: Braces }
];

const SCIENTIFIC_KEYS: FormulaKey[] = [
  { label: 'sin', token: 'sin(', caretOffset: 4 },
  { label: 'cos', token: 'cos(', caretOffset: 4 },
  { label: 'tan', token: 'tan(', caretOffset: 4 },
  { label: '√', token: 'sqrt(', caretOffset: 5 },
  { label: 'ln', token: 'ln(', caretOffset: 3 },
  { label: 'log', token: 'log(', caretOffset: 4 },
  { label: '|x|', token: 'abs(', caretOffset: 4 },
  { label: 'x²', token: '^2' },
  { label: 'xʸ', token: '^' },
  { label: 'x!', token: '!' },
  { label: 'π', token: 'pi' },
  { label: 'e', token: 'e' },
  { label: '(', token: '(' },
  { label: ')', token: ')' },
  { label: '+', token: '+' },
  { label: '−', token: '-' },
  { label: '×', token: '*' },
  { label: '÷', token: '/' }
];

const CALCULUS_KEYS: FormulaKey[] = [
  { label: 'x', token: 'x' },
  { label: 'x²', token: '^2' },
  { label: 'x³', token: '^3' },
  { label: 'sin', token: 'sin(', caretOffset: 4 },
  { label: 'cos', token: 'cos(', caretOffset: 4 },
  { label: 'eˣ', token: 'exp(', caretOffset: 4 },
  { label: 'ln', token: 'ln(', caretOffset: 3 },
  { label: '√', token: 'sqrt(', caretOffset: 5 },
  { label: 'π', token: 'pi' },
  { label: '(', token: '(' },
  { label: ')', token: ')' },
  { label: '+', token: '+' },
  { label: '−', token: '-' },
  { label: '×', token: '*' },
  { label: '÷', token: '/' }
];

const BOOLEAN_KEYS: FormulaKey[] = [
  { label: 'NOT', token: '!' },
  { label: 'AND', token: ' & ' },
  { label: 'OR', token: ' | ' },
  { label: 'XOR', token: ' xor ' },
  { label: '(', token: '(' },
  { label: ')', token: ')' },
  { label: 'A', token: 'A' },
  { label: 'B', token: 'B' },
  { label: 'C', token: 'C' },
  { label: 'D', token: 'D' }
];

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) < 1e-14) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 1e10 || absolute < 1e-7) return value.toExponential(8).replace(/\.?0+e/, 'e');
  return String(Number(value.toPrecision(12)));
};

const errorMessageKey = (error: unknown): string => {
  const code = error instanceof Error ? error.message : '';
  if (['DOMAIN_ERROR', 'FACTORIAL_DOMAIN', 'DIVIDE_BY_ZERO', 'INVALID_PROBABILITY', 'INVALID_STANDARD_DEVIATION'].includes(code)) {
    return '此運算超出定義域。';
  }
  if (code === 'DIMENSION_MISMATCH') return '矩陣維度不相容。';
  if (['SINGULAR_MATRIX', 'SQUARE_MATRIX_REQUIRED'].includes(code)) return '矩陣不可逆或方程無唯一解。';
  if (code === 'ROOT_NOT_BRACKETED') return '指定區間內找不到根。';
  if (code === 'GRAPH_HAS_CYCLE') return '圖包含循環，無法拓樸排序。';
  if (code === 'TOO_MANY_BOOLEAN_VARIABLES') return '變數過多，無法產生完整真值表。';
  return '輸入無效或格式不正確。';
};

function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="emath-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function EngineeringMathLab() {
  const { t, lang } = useI18n();
  const { settings } = useSettings();
  const [mode, setMode] = useState<LabMode>('scientific');
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');
  const [result, setResult] = useState<LabResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [scientificExpression, setScientificExpression] = useState('sin(30)^2 + cos(30)^2');
  const [calculusExpression, setCalculusExpression] = useState('x^3 - 2*x - 5');
  const [calculusOperation, setCalculusOperation] = useState('derivative');
  const [pointX, setPointX] = useState('2');
  const [lowerBound, setLowerBound] = useState('0');
  const [upperBound, setUpperBound] = useState('3');

  const [matrixA, setMatrixA] = useState<string[][]>([['1', '2'], ['3', '4']]);
  const [matrixB, setMatrixB] = useState<string[][]>([['2', '0'], ['1', '2']]);
  const [constantVector, setConstantVector] = useState<string[][]>([['11'], ['13']]);
  const [linearOperation, setLinearOperation] = useState('determinant');

  const [discreteOperation, setDiscreteOperation] = useState('gcd');
  const [discreteA, setDiscreteA] = useState('84');
  const [discreteB, setDiscreteB] = useState('30');
  const [discreteC, setDiscreteC] = useState('13');
  const [baseValue, setBaseValue] = useState('FF');
  const [fromBase, setFromBase] = useState('16');
  const [toBase, setToBase] = useState('10');

  const [statisticsOperation, setStatisticsOperation] = useState('describe');
  const [dataX, setDataX] = useState(['1', '2', '3', '4', '5']);
  const [dataY, setDataY] = useState(['2', '4', '5', '8', '10']);
  const [trialN, setTrialN] = useState('10');
  const [successK, setSuccessK] = useState('3');
  const [probabilityP, setProbabilityP] = useState('0.5');
  const [normalX, setNormalX] = useState('1.96');
  const [normalMean, setNormalMean] = useState('0');
  const [normalStdDev, setNormalStdDev] = useState('1');

  const [graphOperation, setGraphOperation] = useState('shortest');
  const [graphDirected, setGraphDirected] = useState(false);
  const [graphRows, setGraphRows] = useState<EditableGraphRow[]>([
    { id: 'edge-1', from: 'A', to: 'B', weight: '4' },
    { id: 'edge-2', from: 'A', to: 'C', weight: '1' },
    { id: 'edge-3', from: 'C', to: 'B', weight: '2' },
    { id: 'edge-4', from: 'B', to: 'D', weight: '1' },
    { id: 'edge-5', from: 'C', to: 'D', weight: '5' }
  ]);
  const [graphStart, setGraphStart] = useState('A');
  const [graphEnd, setGraphEnd] = useState('D');

  const [booleanOperation, setBooleanOperation] = useState('truth');
  const [booleanExpression, setBooleanExpression] = useState('A xor B');
  const [booleanAssignments, setBooleanAssignments] = useState<Record<string, boolean>>({ A: true, B: false });

  const activeMode = useMemo(() => MODES.find((item) => item.id === mode) ?? MODES[0], [mode]);
  const graphVertices = useMemo(() => [...new Set(
    graphRows.flatMap((row) => [row.from.trim(), row.to.trim()]).filter(Boolean)
  )].sort(), [graphRows]);
  const effectiveGraphStart = graphVertices.includes(graphStart) ? graphStart : graphVertices[0] ?? '';
  const effectiveGraphEnd = graphVertices.includes(graphEnd) ? graphEnd : graphVertices[1] ?? graphVertices[0] ?? '';
  const visibleBooleanVariables = useMemo(() => {
    try {
      return booleanVariables(booleanExpression);
    } catch {
      return [];
    }
  }, [booleanExpression]);

  const operationOptions = (values: Array<[string, string, string?]>) =>
    values.map(([value, label, formula]) => ({ value, label: t(label), formula }));

  const publish = (next: LabResult) => {
    setResult(next);
    setError('');
    setHistory((current) => [{
      id: Date.now(),
      mode,
      title: next.title,
      raw: next.raw,
      createdAt: new Date()
    }, ...current].slice(0, 8));
  };

  const updateMatrixA = (next: string[][]) => {
    setMatrixA(next);
    setConstantVector((current) => resizeMatrixGrid(current, next.length, 1));
  };

  const execute = () => {
    try {
      if (mode === 'scientific') {
        const value = evaluateExpression(scientificExpression, { angleMode });
        publish({
          title: t('科學運算'),
          lines: [`${scientificExpression} = ${formatNumber(value)}`],
          raw: formatNumber(value)
        });
        return;
      }

      if (mode === 'calculus') {
        const lower = Number(lowerBound);
        const upper = Number(upperBound);
        let title = '';
        let value = 0;
        if (calculusOperation === 'derivative') {
          title = t('一階導數');
          value = numericalDerivative(calculusExpression, Number(pointX), angleMode);
        } else if (calculusOperation === 'integral') {
          title = t('定積分');
          value = definiteIntegral(calculusExpression, lower, upper, 1200, angleMode);
        } else {
          title = t('區間求根');
          value = solveRoot(calculusExpression, lower, upper, angleMode);
        }
        publish({
          title,
          lines: [`f(x) = ${calculusExpression}`, `${title}: ${formatNumber(value)}`, t('數值近似')],
          raw: formatNumber(value)
        });
        return;
      }

      if (mode === 'linear') {
        const a = matrixGridToNumbers(matrixA);
        let title = '';
        let output: number[][] | null = null;
        let lines: string[] = [];
        if (linearOperation === 'determinant') {
          title = t('行列式');
          lines = [`det(A) = ${formatNumber(determinant(a))}`];
        } else if (linearOperation === 'inverse') {
          title = t('反矩陣');
          output = inverse(a);
        } else if (linearOperation === 'rref') {
          title = t('列簡化 RREF');
          output = reducedRowEchelon(a);
        } else if (linearOperation === 'transpose') {
          title = t('轉置');
          output = transpose(a);
        } else if (linearOperation === 'add') {
          title = t('矩陣相加');
          output = matrixAdd(a, matrixGridToNumbers(matrixB));
        } else if (linearOperation === 'multiply') {
          title = t('矩陣相乘');
          output = matrixMultiply(a, matrixGridToNumbers(matrixB));
        } else {
          title = t('解線性方程組');
          const vector = matrixGridToNumbers(constantVector).map((row) => row[0]);
          const solution = solveLinearSystem(a, vector);
          lines = solution.map((value, index) => `x${index + 1} = ${formatNumber(value)}`);
        }
        const raw = output ? formatMatrix(output) : lines.join('\n');
        publish({
          title,
          lines,
          table: output ? {
            headers: output[0].map((_, index) => `${index + 1}`),
            rows: output.map((row) => row.map(formatNumber))
          } : undefined,
          raw
        });
        return;
      }

      if (mode === 'discrete') {
        const a = Number(discreteA);
        const b = Number(discreteB);
        const c = Number(discreteC);
        let title = '';
        let raw = '';
        if (discreteOperation === 'gcd') {
          title = t('最大公因數');
          raw = String(gcd(a, b));
        } else if (discreteOperation === 'lcm') {
          title = t('最小公倍數');
          raw = String(lcm(a, b));
        } else if (discreteOperation === 'permutation') {
          title = t('排列 nPr');
          raw = String(permutations(a, b));
        } else if (discreteOperation === 'combination') {
          title = t('組合 nCr');
          raw = String(combinations(a, b));
        } else if (discreteOperation === 'factor') {
          title = t('質因數分解');
          raw = primeFactorization(a).join(' × ') || String(a);
        } else if (discreteOperation === 'prime') {
          title = t('質數判定');
          raw = t(isPrime(a) ? '是質數' : '不是質數');
        } else if (discreteOperation === 'modpow') {
          title = t('模冪運算');
          raw = String(modPow(a, b, c));
        } else {
          title = t('進位轉換');
          raw = convertIntegerBase(baseValue, Number(fromBase), Number(toBase));
        }
        publish({ title, lines: [raw], raw });
        return;
      }

      if (mode === 'statistics') {
        if (statisticsOperation === 'describe') {
          const summary = describeSample(seriesRowsToNumbers(dataX));
          const lines = [
            `${t('筆數')}: ${summary.count}`,
            `${t('總和')}: ${formatNumber(summary.sum)}`,
            `${t('平均數')}: ${formatNumber(summary.mean)}`,
            `${t('中位數')}: ${formatNumber(summary.median)}`,
            `${t('範圍')}: ${formatNumber(summary.range)}`,
            `${t('第一四分位數')}: ${formatNumber(summary.q1)}`,
            `${t('第三四分位數')}: ${formatNumber(summary.q3)}`,
            `${t('樣本變異數')}: ${formatNumber(summary.sampleVariance)}`,
            `${t('樣本標準差')}: ${formatNumber(summary.sampleStdDev)}`
          ];
          publish({ title: t('描述統計'), lines, raw: lines.join('\n') });
        } else if (statisticsOperation === 'regression') {
          const regression = linearRegression(seriesRowsToNumbers(dataX), seriesRowsToNumbers(dataY));
          const lines = [
            `${t('斜率')}: ${formatNumber(regression.slope)}`,
            `${t('截距')}: ${formatNumber(regression.intercept)}`,
            `${t('相關係數')}: ${formatNumber(regression.correlation)}`,
            `${t('決定係數')}: ${formatNumber(regression.rSquared)}`
          ];
          publish({ title: t('線性迴歸'), lines, raw: lines.join('\n') });
        } else if (statisticsOperation === 'binomial') {
          const value = binomialProbability(Number(trialN), Number(successK), Number(probabilityP));
          publish({ title: t('二項分布'), lines: [`${t('機率')}: ${formatNumber(value)}`], raw: formatNumber(value) });
        } else {
          const x = Number(normalX);
          const mean = Number(normalMean);
          const stdDev = Number(normalStdDev);
          const lines = [
            `${t('機率密度')}: ${formatNumber(normalPdf(x, mean, stdDev))}`,
            `${t('累積機率')}: ${formatNumber(normalCdf(x, mean, stdDev))}`,
            `${t('Z 分數')}: ${formatNumber(zScore(x, mean, stdDev))}`
          ];
          publish({ title: t('常態分布'), lines, raw: lines.join('\n') });
        }
        return;
      }

      if (mode === 'graph') {
        const graph = graphRowsToGraph(graphRows, graphDirected);
        if (graphOperation === 'components') {
          const components = connectedComponents(graph);
          const lines = components.map((component, index) => `${index + 1}. ${component.join(' → ')}`);
          publish({ title: t('連通分量'), lines, raw: lines.join('\n') });
        } else if (graphOperation === 'shortest') {
          const path = shortestPath(graph, effectiveGraphStart, effectiveGraphEnd);
          const lines = [`${t('距離')}: ${formatNumber(path.distance)}`, `${t('路徑')}: ${path.path.join(' → ')}`];
          publish({ title: t('最短路徑'), lines, raw: lines.join('\n') });
        } else if (graphOperation === 'bfs') {
          const order = breadthFirstTraversal(graph, effectiveGraphStart);
          publish({ title: t('廣度優先走訪'), lines: [order.join(' → ')], raw: order.join(' → ') });
        } else if (graphOperation === 'topological') {
          const order = topologicalSort(graph);
          publish({ title: t('拓樸排序'), lines: [order.join(' → ')], raw: order.join(' → ') });
        } else if (graphOperation === 'mst') {
          const tree = minimumSpanningTree(graph);
          const lines = [
            `${t('總權重')}: ${formatNumber(tree.totalWeight)}`,
            ...tree.edges.map((edge) => `${edge.from} → ${edge.to} (${formatNumber(edge.weight)})`)
          ];
          publish({ title: t('最小生成樹'), lines, raw: lines.join('\n') });
        } else {
          const degrees = graphDegrees(graph);
          const lines = Object.entries(degrees).map(([vertex, values]) =>
            graphDirected
              ? `${vertex}: in ${values.inDegree}, out ${values.outDegree}`
              : `${vertex}: ${values.degree}`
          );
          publish({ title: t('頂點度數'), lines, raw: lines.join('\n') });
        }
        return;
      }

      if (booleanOperation === 'truth') {
        const truth = generateTruthTable(booleanExpression);
        const lines = [`${t('標準積之和 SOP')}: ${truth.canonicalSop}`, `${t('標準和之積 POS')}: ${truth.canonicalPos}`];
        publish({
          title: t('真值表'),
          lines,
          table: {
            headers: [...truth.variables, t('結果')],
            rows: truth.rows.map((row) => [
              ...truth.variables.map((variable) => row.assignment[variable] ? '1' : '0'),
              row.result ? '1' : '0'
            ])
          },
          raw: lines.join('\n')
        });
      } else if (booleanOperation === 'minimize') {
        const minimized = minimizeBooleanExpression(booleanExpression);
        publish({ title: t('最小化結果'), lines: [minimized], raw: minimized });
      } else {
        const assignment = Object.fromEntries(visibleBooleanVariables.map((variable) => [
          variable,
          booleanAssignments[variable] ?? false
        ]));
        const value = evaluateBooleanExpression(booleanExpression, assignment);
        const raw = t(value ? '真' : '假');
        publish({ title: t('指定值計算'), lines: [raw], raw });
      }
    } catch (caught) {
      setResult(null);
      setError(t(errorMessageKey(caught)));
    }
  };

  const loadExample = () => {
    setError('');
    setResult(null);
    if (mode === 'scientific') setScientificExpression('sqrt(3^2 + 4^2) + log(1000)');
    else if (mode === 'calculus') {
      setCalculusExpression('sin(x)');
      setCalculusOperation('integral');
      setLowerBound('0');
      setUpperBound(String(Math.PI));
    } else if (mode === 'linear') {
      setMatrixA([['2', '1'], ['5', '7']]);
      setConstantVector([['11'], ['13']]);
      setLinearOperation('solve');
    } else if (mode === 'discrete') {
      setDiscreteOperation('modpow');
      setDiscreteA('7');
      setDiscreteB('128');
      setDiscreteC('13');
    } else if (mode === 'statistics') {
      setStatisticsOperation('regression');
      setDataX(['1', '2', '3', '4', '5']);
      setDataY(['2.1', '3.9', '6.2', '8.1', '9.8']);
    } else if (mode === 'graph') {
      setGraphOperation('shortest');
      setGraphDirected(false);
      setGraphRows([
        { id: 'example-1', from: 'A', to: 'B', weight: '4' },
        { id: 'example-2', from: 'A', to: 'C', weight: '1' },
        { id: 'example-3', from: 'C', to: 'B', weight: '2' },
        { id: 'example-4', from: 'B', to: 'D', weight: '1' }
      ]);
      setGraphStart('A');
      setGraphEnd('D');
    } else {
      setBooleanOperation('truth');
      setBooleanExpression('(A & !B) | C');
      setBooleanAssignments({ A: true, B: false, C: true });
    }
  };

  const scientificPanel = (
    <>
      <FormulaEditor
        label={t('運算式')}
        value={scientificExpression}
        onChange={setScientificExpression}
        keys={SCIENTIFIC_KEYS}
        hint={t('可直接輸入，也可使用下方按鈕建立算式。')}
      />
      <div className="emath-inline-settings">
        <span>{t('角度模式')}</span>
        <div className="emath-segment">
          <button type="button" className={angleMode === 'deg' ? 'active' : ''} onClick={() => setAngleMode('deg')}>{t('度')}</button>
          <button type="button" className={angleMode === 'rad' ? 'active' : ''} onClick={() => setAngleMode('rad')}>{t('弧度')}</button>
        </div>
      </div>
    </>
  );

  const calculusPanel = (
    <>
      <OperationPicker
        value={calculusOperation}
        onChange={setCalculusOperation}
        options={operationOptions([
          ['derivative', '一階導數', "f'(x)"],
          ['integral', '定積分', '∫ f(x) dx'],
          ['root', '區間求根', 'f(x) = 0']
        ])}
      />
      <FormulaEditor
        label={t('函數 f(x)')}
        value={calculusExpression}
        onChange={setCalculusExpression}
        keys={CALCULUS_KEYS}
        hint={t('使用 x 作為函數變數。')}
      />
      {calculusOperation === 'derivative' ? (
        <NumberControl label={t('計算位置 x')} value={pointX} onChange={setPointX} step={0.5} />
      ) : (
        <div className="emath-control-row">
          <NumberControl label={t('下限')} value={lowerBound} onChange={setLowerBound} step={0.5} />
          <NumberControl label={t('上限')} value={upperBound} onChange={setUpperBound} step={0.5} />
        </div>
      )}
    </>
  );

  const linearPanel = (
    <>
      <OperationPicker
        value={linearOperation}
        onChange={setLinearOperation}
        options={operationOptions([
          ['determinant', '行列式', 'det(A)'],
          ['inverse', '反矩陣', 'A⁻¹'],
          ['rref', '列簡化 RREF', 'rref(A)'],
          ['transpose', '轉置', 'Aᵀ'],
          ['add', '矩陣相加', 'A + B'],
          ['multiply', '矩陣相乘', 'A × B'],
          ['solve', '解線性方程組', 'Ax = b']
        ])}
      />
      <div className="emath-editor-stack">
        <MatrixEditor
          label={t('矩陣 A')}
          value={matrixA}
          onChange={updateMatrixA}
          rowsLabel={t('列')}
          columnsLabel={t('欄')}
          hint={t('空白儲存格會視為 0。')}
        />
        {(linearOperation === 'add' || linearOperation === 'multiply') && (
          <MatrixEditor
            label={t('矩陣 B')}
            value={matrixB}
            onChange={setMatrixB}
            rowsLabel={t('列')}
            columnsLabel={t('欄')}
            hint={t('依照運算調整矩陣尺寸。')}
          />
        )}
        {linearOperation === 'solve' && (
          <MatrixEditor
            label={t('常數向量 b')}
            value={constantVector}
            onChange={setConstantVector}
            rowsLabel={t('列')}
            columnsLabel={t('欄')}
            fixedColumns={1}
          />
        )}
      </div>
    </>
  );

  const discretePanel = (
    <>
      <OperationPicker
        value={discreteOperation}
        onChange={setDiscreteOperation}
        options={operationOptions([
          ['gcd', '最大公因數', 'gcd(a, b)'],
          ['lcm', '最小公倍數', 'lcm(a, b)'],
          ['permutation', '排列 nPr', 'P(n, r)'],
          ['combination', '組合 nCr', 'C(n, r)'],
          ['factor', '質因數分解', 'n = p₁p₂…'],
          ['prime', '質數判定', 'n ∈ Prime'],
          ['modpow', '模冪運算', 'aᵇ mod m'],
          ['base', '進位轉換', 'base p → q']
        ])}
      />
      {discreteOperation === 'base' ? (
        <div className="emath-formula-card">
          <strong>{baseValue || '0'}<sub>{fromBase}</sub> → ?<sub>{toBase}</sub></strong>
          <div className="emath-control-row three">
            <Field label={t('來源數值')}>
              <input value={baseValue} onChange={(event) => setBaseValue(event.target.value)} />
            </Field>
            <Field label={t('來源進位')}>
              <select value={fromBase} onChange={(event) => setFromBase(event.target.value)}>
                {[2, 8, 10, 16, 32, 36].map((base) => <option key={base} value={base}>{base}</option>)}
              </select>
            </Field>
            <Field label={t('目標進位')}>
              <select value={toBase} onChange={(event) => setToBase(event.target.value)}>
                {[2, 8, 10, 16, 32, 36].map((base) => <option key={base} value={base}>{base}</option>)}
              </select>
            </Field>
          </div>
        </div>
      ) : (
        <div className="emath-formula-card">
          <strong>
            {discreteOperation === 'permutation' && `P(${discreteA || 'n'}, ${discreteB || 'r'})`}
            {discreteOperation === 'combination' && `C(${discreteA || 'n'}, ${discreteB || 'r'})`}
            {discreteOperation === 'gcd' && `gcd(${discreteA || 'a'}, ${discreteB || 'b'})`}
            {discreteOperation === 'lcm' && `lcm(${discreteA || 'a'}, ${discreteB || 'b'})`}
            {discreteOperation === 'factor' && `${discreteA || 'n'} = ?`}
            {discreteOperation === 'prime' && `${discreteA || 'n'} ∈ Prime?`}
            {discreteOperation === 'modpow' && `${discreteA || 'a'}^${discreteB || 'b'} mod ${discreteC || 'm'}`}
          </strong>
          <div className="emath-control-row three">
            <NumberControl
              label={['permutation', 'combination'].includes(discreteOperation) ? 'n' : discreteOperation === 'modpow' ? 'a' : t('第一個值')}
              value={discreteA}
              onChange={setDiscreteA}
              min={['permutation', 'combination', 'factor', 'prime'].includes(discreteOperation) ? 0 : undefined}
            />
            {!['factor', 'prime'].includes(discreteOperation) && (
              <NumberControl
                label={['permutation', 'combination'].includes(discreteOperation) ? 'r' : discreteOperation === 'modpow' ? 'b' : t('第二個值')}
                value={discreteB}
                onChange={setDiscreteB}
                min={['permutation', 'combination', 'modpow'].includes(discreteOperation) ? 0 : undefined}
              />
            )}
            {discreteOperation === 'modpow' && (
              <NumberControl label="m" value={discreteC} onChange={setDiscreteC} min={1} />
            )}
          </div>
        </div>
      )}
    </>
  );

  const statisticsPanel = (
    <>
      <OperationPicker
        value={statisticsOperation}
        onChange={setStatisticsOperation}
        options={operationOptions([
          ['describe', '描述統計', 'x̄, s, Q₁, Q₃'],
          ['regression', '線性迴歸', 'y = ax + b'],
          ['binomial', '二項分布', 'P(X = k)'],
          ['normal', '常態分布', 'N(μ, σ²)']
        ])}
      />
      {statisticsOperation === 'describe' && (
        <SeriesEditor
          label={t('資料值')}
          values={dataX}
          onChange={setDataX}
          addLabel={t('新增資料')}
          removeLabel={t('刪除此列')}
        />
      )}
      {statisticsOperation === 'regression' && (
        <PairedSeriesEditor
          xValues={dataX}
          yValues={dataY}
          onChange={(x, y) => {
            setDataX(x);
            setDataY(y);
          }}
          addLabel={t('新增資料點')}
          removeLabel={t('刪除此列')}
        />
      )}
      {statisticsOperation === 'binomial' && (
        <div className="emath-distribution-card">
          <strong>P(X = {successK || 'k'}) where X ~ B({trialN || 'n'}, {probabilityP || 'p'})</strong>
          <div className="emath-control-row">
            <NumberControl label={t('試驗次數 n')} value={trialN} onChange={setTrialN} min={0} />
            <NumberControl label={t('成功次數 k')} value={successK} onChange={setSuccessK} min={0} max={Number(trialN) || undefined} />
          </div>
          <label className="emath-probability-control">
            <span>{t('成功機率 p')}</span>
            <div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={probabilityP}
                onChange={(event) => setProbabilityP(event.target.value)}
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={probabilityP}
                onChange={(event) => setProbabilityP(event.target.value)}
              />
            </div>
          </label>
        </div>
      )}
      {statisticsOperation === 'normal' && (
        <div className="emath-distribution-card">
          <strong>X ~ N({normalMean || 'μ'}, {normalStdDev || 'σ'}²)</strong>
          <div className="emath-control-row three">
            <NumberControl label={t('數值 x')} value={normalX} onChange={setNormalX} step={0.1} />
            <NumberControl label={t('平均數 μ')} value={normalMean} onChange={setNormalMean} step={0.1} />
            <NumberControl label={t('標準差 σ')} value={normalStdDev} onChange={setNormalStdDev} min={0.01} step={0.1} />
          </div>
        </div>
      )}
    </>
  );

  const graphPanel = (
    <>
      <OperationPicker
        value={graphOperation}
        onChange={setGraphOperation}
        options={operationOptions([
          ['components', '連通分量'],
          ['shortest', '最短路徑'],
          ['bfs', '廣度優先走訪'],
          ['topological', '拓樸排序'],
          ['mst', '最小生成樹'],
          ['degrees', '頂點度數']
        ])}
      />
      <div className="emath-inline-settings graph">
        <span>{t('圖的方向')}</span>
        <div className="emath-segment">
          <button type="button" className={!graphDirected ? 'active' : ''} onClick={() => setGraphDirected(false)}>{t('無向圖')}</button>
          <button type="button" className={graphDirected ? 'active' : ''} onClick={() => setGraphDirected(true)}>{t('有向圖')}</button>
        </div>
      </div>
      <GraphEdgeEditor
        rows={graphRows}
        onChange={setGraphRows}
        labels={{
          edge: t('邊與權重'),
          from: t('起點'),
          to: t('終點'),
          weight: t('權重'),
          add: t('新增邊'),
          remove: t('刪除此列')
        }}
      />
      {(graphOperation === 'shortest' || graphOperation === 'bfs') && (
        <div className="emath-control-row">
          <Field label={t('起始頂點')}>
            <select value={effectiveGraphStart} onChange={(event) => setGraphStart(event.target.value)}>
              {graphVertices.map((vertex) => <option key={vertex} value={vertex}>{vertex}</option>)}
            </select>
          </Field>
          {graphOperation === 'shortest' && (
            <Field label={t('終點')}>
              <select value={effectiveGraphEnd} onChange={(event) => setGraphEnd(event.target.value)}>
                {graphVertices.map((vertex) => <option key={vertex} value={vertex}>{vertex}</option>)}
              </select>
            </Field>
          )}
        </div>
      )}
    </>
  );

  const booleanPanel = (
    <>
      <OperationPicker
        value={booleanOperation}
        onChange={setBooleanOperation}
        options={operationOptions([
          ['truth', '真值表', '0 / 1'],
          ['minimize', '最小化', 'F → min(F)'],
          ['evaluate', '指定值計算', 'F(A, B, …)']
        ])}
      />
      <FormulaEditor
        label={t('布林運算式')}
        value={booleanExpression}
        onChange={setBooleanExpression}
        keys={BOOLEAN_KEYS}
        hint={t('使用按鈕組合 NOT、AND、OR 與 XOR。')}
      />
      {booleanOperation === 'evaluate' && (
        <section className="emath-variable-switches">
          <strong>{t('變數值')}</strong>
          <div>
            {visibleBooleanVariables.map((variable) => {
              const enabled = booleanAssignments[variable] ?? false;
              return (
                <button
                  key={variable}
                  type="button"
                  className={enabled ? 'active' : ''}
                  onClick={() => setBooleanAssignments((current) => ({ ...current, [variable]: !enabled }))}
                >
                  <span>{variable}</span>
                  <strong>{enabled ? '1' : '0'}</strong>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </>
  );

  const panels: Record<LabMode, React.ReactNode> = {
    scientific: scientificPanel,
    calculus: calculusPanel,
    linear: linearPanel,
    discrete: discretePanel,
    statistics: statisticsPanel,
    graph: graphPanel,
    boolean: booleanPanel
  };

  return (
    <div className="emath-lab">
      <header className="emath-hero">
        <div className="emath-hero-icon"><Sigma size={25} /></div>
        <div>
          <strong>{t('工程數學實驗室')}</strong>
          <span>{t('從科學計算到圖論的模組化工程工作台')}</span>
        </div>
      </header>

      <nav className="emath-tabs" aria-label={t('工程數學實驗室')}>
        {MODES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={t(item.label)}
              title={t(item.label)}
              className={mode === item.id ? 'active' : ''}
              onClick={() => {
                setMode(item.id);
                setError('');
                setResult(null);
              }}
            >
              <Icon size={17} />
              <span>{t(item.label)}</span>
            </button>
          );
        })}
      </nav>

      <div className="emath-workspace">
        <section className="emath-input-panel">
          <div className="emath-section-title">
            <activeMode.icon size={19} />
            <strong>{t(activeMode.label)}</strong>
          </div>
          <div className="emath-fields">{panels[mode]}</div>
          <div className="emath-actions">
            <button type="button" className="emath-example" onClick={loadExample}>{t('載入範例')}</button>
            <button type="button" className="emath-run" onClick={execute}>
              <Play size={16} fill="currentColor" />
              {t('執行計算')}
            </button>
          </div>
        </section>

        <aside className="emath-output-panel">
          <div className="emath-output-head">
            <strong>{t('結果')}</strong>
            {result && (
              <button type="button" onClick={() => navigator.clipboard?.writeText(result.raw)} title={t('複製結果')}>
                <Copy size={15} />
              </button>
            )}
          </div>
          {error ? (
            <div className="emath-error">{error}</div>
          ) : result ? (
            <div className="emath-result">
              <h3>{result.title}</h3>
              {result.lines.map((line, index) => <code key={`${line}-${index}`}>{line}</code>)}
              {result.table && (
                <div className="emath-table-wrap">
                  <table>
                    <thead><tr>{result.table.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
                    <tbody>
                      {result.table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="emath-empty">
              <Sigma size={34} />
              <strong>{t('尚無計算結果')}</strong>
              <span>{t('選擇工具並輸入參數後執行。')}</span>
            </div>
          )}

          <div className="emath-history">
            <strong>{t('最近計算')}</strong>
            {history.length === 0 ? <span>—</span> : history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setMode(entry.mode);
                  setResult({ title: entry.title, lines: entry.raw.split('\n'), raw: entry.raw });
                  setError('');
                }}
              >
                <span>{entry.title}</span>
                <small>{formatFusionDateTime(entry.createdAt, lang, settings.timezone, settings.clock24)}</small>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
