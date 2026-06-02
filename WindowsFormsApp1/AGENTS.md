# Fusion OS Coding Agent Guide

## Language
- UI text must be clean English unless a specific screen intentionally uses Chinese.
- Never ship mojibake, placeholder copy, or debug-like strings in visible UI.

## Product Direction
- Fusion OS should feel like a premium spatial operating system shell.
- Avoid generic dashboards, admin panels, monitor mockups, and implementation/debug wording in the product UI.
- Keep the visual identity centered on deep navy glass, cyan, ice blue, electric blue, indigo, violet, and soft magenta.

## Boot Screen
- The boot screen is the browser viewport itself: no centered 16:9 panel, no monitor frame, no black border.
- The Fusion Core should read as a thick luminous plasma ribbon with embedded filament detail, not a wire bundle, particle cloud, or flat ribbon loop demo.
- Keep visible boot copy limited to `FUSION OS`, `Initializing Fusion OS`, `Loading core modules...`, and progress.
- Keep bloom controlled; local white-blue highlights are acceptable, but large white overexposure is not.

## Home Shell
- Home should read as an OS shell, not a dashboard.
- Preserve the sidebar, central workspace, right widgets, and dock structure.
- App cards should feel like an OS launcher: compact, glassy, scannable, and status-oriented.
- Widgets should show user-facing system state, not build/runtime/debug internals.

## Validation
- Run `npx tsc --noEmit` after TypeScript changes.
- Run `npm run build` after production-facing frontend changes.
- Verify local preview in the in-app browser when visual layout changes.
- Check browser console errors before calling the work complete.
