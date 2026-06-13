# Engineering Calculator Design

## Goal

Add a dedicated Engineering Math Lab extension beside the existing Toolbox
calculator. The original calculator remains available for quick arithmetic, while
the extension provides enough space for structured engineering workflows.

## Scope

The extension provides seven domain workspaces plus a scientific expression console:

1. Basic: keyboard and button expression entry, history, parentheses, percentage.
2. Scientific: powers, roots, logarithms, trigonometric and hyperbolic functions,
   constants, factorials, and degree/radian selection.
3. Calculus: function evaluation, numerical first derivative, definite integral,
   and numerical root solving.
4. Linear algebra: matrix addition and multiplication, transpose, determinant,
   inverse, RREF, and solving square linear systems.
5. Discrete mathematics: GCD, LCM, permutations, combinations, primality,
   factorization, modular exponentiation, and base conversion.
6. Probability and statistics: descriptive statistics, quartiles, sample and
   population variance, linear regression, binomial probability, normal PDF/CDF,
   and z-scores.
7. Graph theory: graph parsing, degree summaries, connected components, breadth-
   first traversal, weighted shortest paths, topological sorting, and minimum
   spanning trees.
8. Boolean algebra: boolean expression parsing, truth tables, canonical SOP/POS,
   and Quine-McCluskey minimization for small variable sets.

Symbolic integration, arbitrary-precision arithmetic, graphing, and computer
algebra simplification are outside this iteration. Calculus operations clearly
identify themselves as numerical approximations.

## Architecture

Pure TypeScript modules under `Frontend/src/math` own tokenization, expression
evaluation, calculus, matrix, discrete, graph, boolean, and statistics algorithms.
They contain no React or browser dependencies and are covered by Node tests.

`EngineeringMathLab.tsx` owns presentation state and delegates all calculations to
those modules. The existing `FusionToolbox` keeps its basic calculator unchanged
and adds Engineering Math as a separate tool entry. Calculator translations live
in a dedicated source-key dictionary merged by the existing i18n provider.

## Error Handling

Math modules throw short typed errors for invalid syntax, domain errors, singular
matrices, dimension mismatches, and invalid probability parameters. The UI catches
them and shows a localized result card without breaking the toolbox.

Inputs accept ordinary keyboard notation such as `sin(30)`, `x^3 - 2*x`, and
matrix rows such as `1, 2; 3, 4`. Results are rounded only for display; calculations
retain JavaScript double precision.

## Validation

- Node feature tests cover each math domain and important error paths.
- `npx tsc --noEmit` validates the React integration.
- `npm run build` validates production bundling.
- MSBuild validates the WinForms host and embedded frontend.
- The in-app browser verifies desktop and narrow layouts plus console errors.
