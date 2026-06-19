# Fusion Power Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a localized Fusion OS power menu whose safe lifecycle actions control only the current WinForms application.

**Architecture:** A pure TypeScript power-action module defines the menu contract and host message mapping. `SpatialHomeStage` renders and coordinates the menu, lock flow, and simulated sleep surface, while `Form1` handles shutdown and restart messages on the host UI thread.

**Tech Stack:** React 19, TypeScript 6, CSS, WebView2, WinForms .NET Framework 4.7.2, Node test runner, Vite.

---

### Task 1: Power Action Contract

**Files:**
- Create: `Frontend/src/system/powerActions.ts`
- Modify: `Frontend/tsconfig.feature-tests.json`
- Modify: `Frontend/package.json`
- Create: `Frontend/tests/powerActions.test.ts`

- [ ] **Step 1: Write the failing action-contract test**

```ts
assert.deepEqual(POWER_ACTIONS.map((item) => item.id), ['lock', 'sleep', 'shutdown', 'restart']);
assert.deepEqual(toHostSystemAction('shutdown'), {
  type: 'FUSION_SYSTEM_ACTION',
  data: { action: 'shutdown' }
});
assert.equal(toHostSystemAction('lock'), null);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:features`

Expected: TypeScript compilation fails because
`../src/system/powerActions.js` does not exist.

- [ ] **Step 3: Implement the minimal contract**

```ts
export type PowerAction = 'lock' | 'sleep' | 'shutdown' | 'restart';

export const POWER_ACTIONS = [
  { id: 'lock', label: '鎖定' },
  { id: 'sleep', label: '睡眠' },
  { id: 'shutdown', label: '關機' },
  { id: 'restart', label: '重新啟動' }
] as const;

export const toHostSystemAction = (action: PowerAction) =>
  action === 'shutdown' || action === 'restart'
    ? { type: 'FUSION_SYSTEM_ACTION', data: { action } }
    : null;
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm run test:features`

Expected: All feature tests pass.

### Task 2: Localization Coverage

**Files:**
- Modify: `Frontend/src/i18n/strings.ts`
- Modify: `Frontend/tests/settingsI18n.test.ts`

- [ ] **Step 1: Add failing translation assertions**

```ts
assert.equal(render('鎖定', 'en'), 'Lock');
assert.equal(render('睡眠', 'ja'), 'スリープ');
assert.equal(render('關機', 'ko'), '종료');
assert.equal(render('重新啟動', 'zh-CN'), '重新启动');
```

- [ ] **Step 2: Run the i18n tests and verify RED**

Run: `npm run test:pet`

Expected: The new labels fall back to Traditional Chinese.

- [ ] **Step 3: Add complete translation entries**

Add entries for `電源選項`, `鎖定`, `睡眠`, `關機`, `重新啟動`,
`Fusion OS 正在睡眠`, and `按任意鍵或點一下以喚醒` in all supported
languages.

- [ ] **Step 4: Run the i18n tests and verify GREEN**

Run: `npm run test:pet`

Expected: All settings and pet tests pass.

### Task 3: Home Power Menu And Sleep Surface

**Files:**
- Modify: `Frontend/src/components/SpatialHomeStage.tsx`
- Modify: `Frontend/src/styles/spatialHome.css`

- [ ] **Step 1: Add menu state and action routing**

Use `Power`, `Lock`, `Moon`, `PowerCircle`, and `RotateCcw` icons. Read
`signOut` from `useAccount()`. For `lock`, close the menu and call `signOut()`;
for `sleep`, show the sleep surface; for host-backed actions, call
`sendMessageToHost(message.type, message.data)`.

- [ ] **Step 2: Add dismissal and wake behavior**

Close the menu on outside pointer input and Escape. Wake the sleep surface on
pointer down or key down while keeping the current account authenticated.

- [ ] **Step 3: Render the dock control and menu**

Render the button outside the scrollable app rail so it remains visible. Anchor
the menu above the button and provide `role="menu"` and localized accessible
labels.

- [ ] **Step 4: Render the localized sleep surface**

Render the current time and date with:

```tsx
formatFusionTime(now, lang, settings.timezone, settings.clock24)
formatFusionDate(now, lang, settings.timezone)
```

- [ ] **Step 5: Style the new surfaces**

Use compact navy glass, cyan focus states, violet/magenta edge light, clear
danger emphasis for Shut down, responsive positioning, and reduced-motion
compatibility.

### Task 4: WinForms Lifecycle Bridge

**Files:**
- Modify: `Form1.cs`

- [ ] **Step 1: Parse the new host message**

In `CarouselWebView_WebMessageReceived`, detect
`fusion_system_action` before app launching and dispatch to
`HandleFusionSystemAction`.

- [ ] **Step 2: Implement shutdown**

Marshal to the UI thread when necessary and call `Application.Exit()` so the
current WinForms process and its child windows close normally.

- [ ] **Step 3: Implement restart**

Resolve `Application.ExecutablePath`, start a new process with
`UseShellExecute = true`, then call `Application.Exit()`.

- [ ] **Step 4: Handle failures**

Catch process errors, write them to `Debug`, and show
`"Unable to complete the power action."` without invoking Windows power APIs.

### Task 5: Verification

**Files:**
- Verify: `Frontend/src/components/SpatialHomeStage.tsx`
- Verify: `Frontend/src/styles/spatialHome.css`
- Verify: `Form1.cs`

- [ ] **Step 1: Run all frontend tests**

Run: `npm run test:pet && npm run test:features`

Expected: All tests pass.

- [ ] **Step 2: Run TypeScript and production build**

Run: `npx tsc --noEmit`

Expected: Exit code 0.

Run: `npm run build`

Expected: Vite production build succeeds.

- [ ] **Step 3: Build WinForms**

Run the available MSBuild command for `WindowsFormsApp1.csproj`.

Expected: Build succeeds with no new errors.

- [ ] **Step 4: Verify in the in-app browser**

Open the local Vite preview, confirm the menu placement and all four actions,
switch languages and clock settings, wake from Sleep, exercise Lock, and check
the browser console for errors.
