# Makeup Geometry Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct portrait-to-overlay alignment and provide realistic, configurable eyeliner, eyebrow, and lash rendering.

**Architecture:** A pure `makeupGeometry` module owns image-fit transforms and makeup shape generation. `MakeupPortrait` only converts generated shapes into SVG elements, while `FusionStyleStudio` owns user controls and `styleStorage` preserves backward compatibility.

**Tech Stack:** React 19, TypeScript, SVG, MediaPipe landmarks, Node test runner, Vite.

---

### Task 1: Lock Down Geometry Behavior

**Files:**
- Create: `Frontend/src/style/makeupGeometry.ts`
- Create: `Frontend/tests/makeupGeometry.test.ts`
- Modify: `Frontend/tsconfig.feature-tests.json`
- Modify: `Frontend/package.json`

- [ ] Write tests asserting that a 900x923 image rendered into a 300x640 cover-fit container has a negative horizontal offset and maps the visible right eye near its displayed pixel location.
- [ ] Write tests asserting that image-left and image-right eye wings extend away from the face center and use the same lift direction.
- [ ] Write tests asserting brow transformations remain inside a bounded eye-to-brow range.
- [ ] Write tests asserting lash strokes start on the eyelid, end above it, and vary by style.
- [ ] Run `npm run test:features` and confirm the new tests fail because the geometry module does not exist.

### Task 2: Implement The Pure Geometry Engine

**Files:**
- Create: `Frontend/src/style/makeupGeometry.ts`
- Test: `Frontend/tests/makeupGeometry.test.ts`

- [ ] Implement `computeCoverTransform`, `mapPoint`, and `mapPoints`.
- [ ] Implement tangent-aware upper-lid offsets that always choose the image-up normal.
- [ ] Implement liner-band and independent wing polygons for all liner styles.
- [ ] Implement bounded brow-region shaping and brow hair strokes.
- [ ] Implement natural, doll, cat-eye, and wispy lash curves.
- [ ] Run the focused test suite and confirm all geometry tests pass.

### Task 3: Extend Makeup State Safely

**Files:**
- Modify: `Frontend/src/style/styleTypes.ts`
- Modify: `Frontend/src/style/styleCatalog.ts`
- Modify: `Frontend/src/style/styleStorage.ts`
- Modify: `Frontend/tests/styleEngine.test.ts`

- [ ] Add failing persistence tests for missing new fields and legacy `bold` eyeliner values.
- [ ] Add `BrowStyle` and `LashStyle`, extend `EyelinerStyle`, and add bounded shape-control fields.
- [ ] Add natural default values to `createDefaultLook`.
- [ ] Normalize all new properties and map legacy `bold` to `smoky`.
- [ ] Run tests and confirm persistence compatibility passes.

### Task 4: Rebuild Portrait Rendering

**Files:**
- Modify: `Frontend/src/components/style/MakeupPortrait.tsx`

- [ ] Replace direct `x * width` mapping with the cover-fit transform using image natural dimensions.
- [ ] Replace closed eye splines with geometry-engine liner polygons and separate wing polygons.
- [ ] Render brows with transformed regions plus subtle hair strokes.
- [ ] Render lashes as curved strokes instead of vertical spikes or filled bands.
- [ ] Keep eyeshadow, lips, blush, contour, and highlight mapped through the same corrected transform.
- [ ] Run TypeScript and feature tests.

### Task 5: Add Contextual Makeup Controls

**Files:**
- Modify: `Frontend/src/components/FusionStyleStudio.tsx`
- Modify: `Frontend/src/style/styleText.ts`
- Modify: `Frontend/src/styles/fusionStyleStudio.css`

- [ ] Add six eyeliner choices and thickness, tail-length, and angle controls.
- [ ] Add five brow choices and thickness controls.
- [ ] Add four lash choices and length and curl controls.
- [ ] Keep controls inside the current inspector and preserve the surrounding studio layout.
- [ ] Add translations for every visible source key in all supported languages.

### Task 6: Verify Production Behavior

**Files:**
- Modify only files needed for defects found during verification.

- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run test:features`.
- [ ] Run `npm run build`.
- [ ] Reload `http://127.0.0.1:4173/` in the in-app browser.
- [ ] Inspect all three built-in face models and representative eye, brow, and lash styles.
- [ ] Confirm overlays remain aligned in the constrained browser viewport.
- [ ] Confirm browser console error count is zero.
