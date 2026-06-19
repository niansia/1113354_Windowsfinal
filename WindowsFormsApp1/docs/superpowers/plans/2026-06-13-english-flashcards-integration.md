# English Flashcards Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `1113354_TSV` WinForms project to Fusion OS as the host-launched application `英文單字卡`.

**Architecture:** Keep the imported program as an independent .NET Framework executable under `IntegratedApps/EnglishFlashcards`. Register it in the React application catalog, route its launch message through the WinForms host, and use the existing source-as-key Fusion OS translation dictionary.

**Tech Stack:** C# WinForms/.NET Framework 4.7.2, React 19, TypeScript, Node test runner, MSBuild

---

### Task 1: Specify the application catalog contract

**Files:**
- Modify: `Frontend/tests/appCatalog.test.ts`

- [ ] Add a test asserting that `flashcards` exists in App Center, is named `英文單字卡`, uses host launch mode, and has complete translations.
- [ ] Run `npm run test:features` from `Frontend` and verify the new assertion fails because `flashcards` is not registered.

### Task 2: Register the Fusion OS application

**Files:**
- Modify: `Frontend/src/types.ts`
- Modify: `Frontend/src/data/fusionApps.ts`
- Modify: `Frontend/src/i18n/strings.ts`
- Modify: `Frontend/src/components/FusionAppCenter.tsx`
- Modify: `Frontend/src/components/SpatialHomeStage.tsx`

- [ ] Add the `flashcards` application id.
- [ ] Add a host-launched catalog card with the canonical title `英文單字卡`.
- [ ] Add Simplified Chinese, English, Japanese, and Korean catalog translations.
- [ ] Assign a book-style Lucide icon in both Fusion application surfaces.
- [ ] Run `npm run test:features` and verify the catalog test passes.

### Task 3: Import and build the WinForms project

**Files:**
- Create: `IntegratedApps/EnglishFlashcards/EnglishFlashcards.csproj`
- Create: `IntegratedApps/EnglishFlashcards/Form1.cs`
- Create: `IntegratedApps/EnglishFlashcards/Form1.Designer.cs`
- Create: `IntegratedApps/EnglishFlashcards/Program.cs`
- Create: `IntegratedApps/EnglishFlashcards/App.config`
- Create: `IntegratedApps/EnglishFlashcards/Properties/*`
- Modify: `WindowsFormsApp1.csproj`

- [ ] Copy the upstream project source without its Git metadata, build output, screenshots, or repository documentation.
- [ ] Rename only the project and assembly output to `EnglishFlashcards`; retain the application’s internal UI and behavior.
- [ ] Reference the project from the existing `IntegratedAppProject` build item.
- [ ] Build the imported project and verify `EnglishFlashcards.exe` is produced.

### Task 4: Route Fusion OS launches

**Files:**
- Modify: `Form1.cs`

- [ ] Route the `flashcards` launch message to a new `LaunchEnglishFlashcards` method.
- [ ] Add the native desktop/start-menu entry and localized native host labels.
- [ ] Launch `IntegratedApps/EnglishFlashcards` through `LaunchIntegratedExeApp`.
- [ ] Verify the main solution builds and the executable starts.

### Task 5: Verify the complete integration

**Files:**
- Generated: `Frontend/dist/*`

- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run test:features`.
- [ ] Run `npm run build`.
- [ ] Build the main C# project.
- [ ] Open the local Fusion OS preview in the in-app browser, inspect App Center in multiple languages, launch `英文單字卡`, and check the browser console.
