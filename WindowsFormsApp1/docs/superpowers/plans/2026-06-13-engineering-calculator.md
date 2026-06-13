# Engineering Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested Engineering Math Lab extension to Toolbox while preserving the quick calculator.

**Architecture:** Pure TypeScript math modules provide deterministic algorithms and explicit validation. A focused React component presents eight math workspaces and connects them to Fusion OS i18n as a new Toolbox entry, leaving the quick calculator and unrelated tools intact.

**Tech Stack:** React 19, TypeScript 6, Node test runner, CSS, existing Fusion OS i18n and settings contexts.

---

### Task 1: Math Core Contract

**Files:**
- Create: `Frontend/tests/engineeringMath.test.ts`
- Modify: `Frontend/tsconfig.feature-tests.json`
- Modify: `Frontend/package.json`

- [ ] Write tests for scientific expressions, numerical calculus, matrices,
  discrete mathematics, graph theory, boolean algebra, descriptive statistics,
  regression, and distributions.
- [ ] Run `npm run test:features` and verify the new module imports fail.

### Task 2: Scientific Expressions And Calculus

**Files:**
- Create: `Frontend/src/math/expression.ts`
- Create: `Frontend/src/math/calculus.ts`
- Create: `Frontend/src/math/index.ts`

- [ ] Implement a tokenizer and recursive-descent parser without `eval`.
- [ ] Add degree/radian functions, constants, factorial, powers, and variables.
- [ ] Implement central-difference derivatives, Simpson integration, and hybrid
  Newton/bisection root solving.
- [ ] Run feature tests and verify this domain passes.

### Task 3: Linear Algebra

**Files:**
- Create: `Frontend/src/math/linearAlgebra.ts`

- [ ] Implement matrix parsing and dimension validation.
- [ ] Implement transpose, addition, multiplication, determinant, inverse, RREF,
  and square-system solving with pivoting.
- [ ] Run feature tests and verify matrix cases pass.

### Task 4: Discrete Mathematics And Statistics

**Files:**
- Create: `Frontend/src/math/discreteMath.ts`
- Create: `Frontend/src/math/statistics.ts`

- [ ] Implement integer validation, GCD, LCM, permutations, combinations,
  primality, factorization, modular exponentiation, and base conversion.
- [ ] Implement descriptive statistics, quartiles, regression, binomial
  probability, normal PDF/CDF, and z-scores.
- [ ] Run all feature tests.

### Task 5: Graph Theory And Boolean Algebra

**Files:**
- Create: `Frontend/src/math/graphTheory.ts`
- Create: `Frontend/src/math/booleanAlgebra.ts`

- [ ] Implement graph parsing, components, BFS, Dijkstra, topological sorting,
  and Kruskal minimum spanning trees.
- [ ] Implement boolean parsing, truth tables, canonical forms, and
  Quine-McCluskey minimization.
- [ ] Run all feature tests.

### Task 6: Engineering Calculator UI And i18n

**Files:**
- Create: `Frontend/src/components/toolbox/EngineeringMathLab.tsx`
- Create: `Frontend/src/math/engineeringMathText.ts`
- Create: `Frontend/src/styles/engineeringCalculator.css`
- Modify: `Frontend/src/components/FusionToolbox.tsx`
- Modify: `Frontend/src/i18n/I18nContext.tsx`
- Modify: `Frontend/src/main.tsx`

- [ ] Build six responsive calculator modes with localized labels and errors.
- [ ] Add calculation history, example loading, angle mode, copy-ready results,
  and accessible controls.
- [ ] Register Engineering Math as a separate Toolbox extension beside Calculator.

### Task 7: Verification

**Files:**
- Modify: generated `dist/**`

- [ ] Run `npm run test:features`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Build `WindowsFormsApp1.csproj` with MSBuild.
- [ ] Verify desktop and narrow layouts in the in-app browser.
- [ ] Confirm the browser console has no errors.
