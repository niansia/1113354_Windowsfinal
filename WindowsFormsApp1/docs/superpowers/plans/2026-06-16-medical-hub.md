# Fusion Medical Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully interactive medical learning and health-prep app to Fusion OS.

**Architecture:** Keep the app as a React overlay launched from App Center. Put medical domain rules in `src/medical`, translations in `medicalText.ts`, visual implementation in `FusionMedicalHub.tsx`, and styles in `fusionMedicalHub.css`.

**Tech Stack:** React, TypeScript, framer-motion, lucide-react, CSS gradients, Node test runner.

---

### Task 1: Domain Tests

**Files:**
- Create: `Frontend/tests/medicalHub.test.ts`
- Create later: `Frontend/src/medical/medicalTypes.ts`
- Create later: `Frontend/src/medical/medicalCatalog.ts`
- Create later: `Frontend/src/medical/medicalVitals.ts`
- Create later: `Frontend/src/medical/medicalImaging.ts`

- [ ] Write tests for course catalog filtering, vital-sign evaluation, imaging preparation, and the no-image-background rule.
- [ ] Run `npm run test:features -- --test-name-pattern="medical"` and confirm it fails because modules are missing.

### Task 2: Domain Implementation

**Files:**
- Create: `Frontend/src/medical/medicalTypes.ts`
- Create: `Frontend/src/medical/medicalCatalog.ts`
- Create: `Frontend/src/medical/medicalVitals.ts`
- Create: `Frontend/src/medical/medicalImaging.ts`
- Create: `Frontend/src/medical/medicalText.ts`

- [ ] Implement conservative educational data and rules.
- [ ] Add full zh-CN, en, ja, ko translations for visible app strings.
- [ ] Re-run focused medical tests and make them pass.

### Task 3: Overlay UI

**Files:**
- Create: `Frontend/src/components/FusionMedicalHub.tsx`
- Create: `Frontend/src/styles/fusionMedicalHub.css`

- [ ] Build the app shell, course navigator, vital-sign organizer, imaging guide, visit checklist, source panel, and responsive layout.
- [ ] Use CSS gradients and DOM layers only for the medical visual background.

### Task 4: Fusion OS Integration

**Files:**
- Modify: `Frontend/src/types.ts`
- Modify: `Frontend/src/data/fusionApps.ts`
- Modify: `Frontend/src/i18n/I18nContext.tsx`
- Modify: `Frontend/src/i18n/featureTranslations.ts`
- Modify: `Frontend/src/components/SpatialHomeStage.tsx`
- Modify: `Frontend/src/main.tsx`
- Modify: `Frontend/package.json`
- Modify: `Frontend/tsconfig.feature-tests.json`
- Modify: `Frontend/tests/appCatalog.test.ts`

- [ ] Register `medical` as an App Center overlay.
- [ ] Add entry translations and overlay wiring tests.
- [ ] Import the medical CSS and translation bundle.

### Task 5: Verification

**Commands:**
- `npx tsc --noEmit`
- `npm run test:features`
- `npm run build`
- `git diff --check`

- [ ] Launch local Vite preview in the in-app browser.
- [ ] Verify App Center launch, language/date sync, medical interactions, responsive layout, and console logs.
- [ ] Update `design-qa.md` with `final result: passed`.

