# Virtual Style Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Fusion OS overlay application for styling a procedural 3D mannequin with makeup, clothing, palette recommendations, local saves, and system-synchronized localization.

**Architecture:** Keep deterministic style data and recommendation logic in a framework-free `style` domain, then render it through a lazy-loaded React Three Fiber studio. The overlay owns user interaction and persistence while the 3D scene receives normalized look state as props.

**Tech Stack:** React 19, TypeScript, React Three Fiber, Drei, Three.js, Framer Motion, CSS, Node test runner, localStorage.

---

## File Map

- Create `Frontend/src/style/styleTypes.ts`: look, avatar, makeup, wardrobe, and recommendation contracts.
- Create `Frontend/src/style/styleCatalog.ts`: presets, colors, garments, and default look.
- Create `Frontend/src/style/styleEngine.ts`: immutable look updates and recommendation ranking.
- Create `Frontend/src/style/styleStorage.ts`: localStorage serialization and defensive parsing.
- Create `Frontend/src/style/styleText.ts`: all studio translations.
- Create `Frontend/src/components/style/StyleMannequin3D.tsx`: procedural model and studio scene.
- Create `Frontend/src/components/FusionStyleStudio.tsx`: overlay layout and interactions.
- Create `Frontend/src/styles/fusionStyleStudio.css`: responsive spatial styling.
- Create `Frontend/tests/styleEngine.test.ts`: domain and persistence tests.
- Modify `Frontend/tsconfig.feature-tests.json`: include the style domain and tests.
- Modify `Frontend/src/i18n/I18nContext.tsx`: merge studio translations.
- Modify `Frontend/src/types.ts`: add the `style` app id.
- Modify `Frontend/src/data/fusionApps.ts`: add the featured App Center entry.
- Modify `Frontend/src/components/SpatialHomeStage.tsx`: lazy-load and open the overlay.
- Modify `Frontend/src/main.tsx`: import the studio stylesheet.
- Modify `Frontend/tests/appCatalog.test.ts`: verify app registration and translations.

### Task 1: Lock The Style Domain Contracts

**Files:**
- Create: `Frontend/src/style/styleTypes.ts`
- Create: `Frontend/tests/styleEngine.test.ts`
- Modify: `Frontend/tsconfig.feature-tests.json`

- [ ] **Step 1: Write the failing defaults test**

```ts
test('creates a complete neutral default look', () => {
  const look = createDefaultLook();
  assert.equal(look.version, 1);
  assert.equal(look.avatar.undertone, 'neutral');
  assert.equal(look.wardrobe.dress, 'none');
  assert.equal(look.wardrobe.top, 'fitted');
});
```

- [ ] **Step 2: Run the test and confirm it fails because the style modules do not exist**

Run: `npm run test:features`

Expected: TypeScript cannot resolve `../src/style/styleCatalog.js`.

- [ ] **Step 3: Define the exact style contracts**

Create unions for `Undertone`, `BodyPreset`, `HairStyle`, makeup finishes, garment ids, and the nested `StyleLook` shape. Keep every property JSON-safe.

- [ ] **Step 4: Add the default catalog implementation**

Create `createDefaultLook(now = new Date())` returning a complete version-1 look with stable defaults and a generated id.

- [ ] **Step 5: Run the focused feature suite**

Run: `npm run test:features`

Expected: the default-look test passes.

### Task 2: Implement Wardrobe Rules And Palette Recommendations

**Files:**
- Create: `Frontend/src/style/styleCatalog.ts`
- Create: `Frontend/src/style/styleEngine.ts`
- Modify: `Frontend/tests/styleEngine.test.ts`

- [ ] **Step 1: Add failing tests for wardrobe exclusivity**

```ts
test('selecting a dress clears separates and selecting a top clears the dress', () => {
  const dressed = setWardrobePiece(createDefaultLook(), 'dress', 'flare');
  assert.equal(dressed.wardrobe.top, 'none');
  assert.equal(dressed.wardrobe.bottom, 'none');
  const separated = setWardrobePiece(dressed, 'top', 'cropped');
  assert.equal(separated.wardrobe.dress, 'none');
});
```

- [ ] **Step 2: Add a failing recommendation-order test**

```ts
test('ranks warm lip colors above cool colors for warm undertones', () => {
  const ranked = recommendColors('warm', 'lip', '#D79A72');
  assert.equal(ranked[0].undertones.includes('warm'), true);
  assert.ok(ranked[0].score >= ranked[1].score);
});
```

- [ ] **Step 3: Run the suite and confirm both behaviors fail**

Run: `npm run test:features`

Expected: missing `setWardrobePiece` and `recommendColors`.

- [ ] **Step 4: Implement immutable wardrobe updates**

`setWardrobePiece` must enforce dress/separates exclusivity and return a new `StyleLook`.

- [ ] **Step 5: Implement deterministic recommendation scoring**

Score undertone affinity, skin contrast, and anchor-color harmony, then return sorted `ColorRecommendation[]` with translated reason keys.

- [ ] **Step 6: Run the suite**

Run: `npm run test:features`

Expected: all style engine tests pass.

### Task 3: Implement Defensive Saved Looks

**Files:**
- Create: `Frontend/src/style/styleStorage.ts`
- Modify: `Frontend/tests/styleEngine.test.ts`

- [ ] **Step 1: Add failing round-trip and malformed-input tests**

```ts
test('round-trips saved looks and ignores malformed entries', () => {
  const look = createDefaultLook(new Date('2026-06-13T12:00:00Z'));
  const parsed = parseSavedLooks(JSON.stringify([look, { broken: true }]));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].createdAt, '2026-06-13T12:00:00.000Z');
});
```

- [ ] **Step 2: Run and confirm the parser is missing**

Run: `npm run test:features`

Expected: missing `parseSavedLooks`.

- [ ] **Step 3: Implement storage helpers**

Provide `parseSavedLooks`, `loadSavedLooks`, `saveSavedLooks`, `upsertSavedLook`, and `removeSavedLook`. Validate version, required nested objects, ids, and color strings.

- [ ] **Step 4: Run the suite**

Run: `npm run test:features`

Expected: malformed data is discarded and valid data survives.

### Task 4: Register The App And Its Five-Language Text

**Files:**
- Create: `Frontend/src/style/styleText.ts`
- Modify: `Frontend/src/i18n/I18nContext.tsx`
- Modify: `Frontend/src/types.ts`
- Modify: `Frontend/src/data/fusionApps.ts`
- Modify: `Frontend/tests/appCatalog.test.ts`

- [ ] **Step 1: Add a failing App Center registration test**

```ts
test('registers Virtual Style Studio as a translated creative overlay', () => {
  const app = getAppById('style');
  assert.equal(app?.title, '虛擬造型工作室');
  assert.equal(app?.category, 'creative');
  assert.equal(app?.launchMode, 'overlay');
});
```

- [ ] **Step 2: Run and confirm `style` is not registered**

Run: `npm run test:features`

Expected: `getAppById('style')` returns undefined.

- [ ] **Step 3: Add the app id and catalog entry**

Use glyph `LOOK`, accent `#ff75bd`, featured creative category, and Traditional Chinese source keys.

- [ ] **Step 4: Add all studio translations**

Define every catalog and studio string in `STYLE_TRANSLATIONS` for `zh-CN`, `en`, `ja`, and `ko`, then merge it before the general dictionaries in `I18nContext`.

- [ ] **Step 5: Run catalog tests**

Run: `npm run test:features`

Expected: complete translation coverage passes.

### Task 5: Build The Procedural 3D Mannequin

**Files:**
- Create: `Frontend/src/components/style/StyleMannequin3D.tsx`

- [ ] **Step 1: Add typed scene props and compile to expose missing implementation**

The component accepts `look`, `view`, `motionEnabled`, and `onReady`. Use the exact `StyleLook` and `StyleView` contracts from the domain.

- [ ] **Step 2: Implement the R3F studio scene**

Use `Canvas`, capped DPR, perspective camera, `OrbitControls`, contact shadows, ambient/key/rim lights, and a procedural mannequin group.

- [ ] **Step 3: Add independently colored model zones**

Construct skin, hair, eyeshadow, blush, lips, top, bottom, dress, shoes, earrings, and necklace as separate meshes. Use shallow face overlays for makeup and hide meshes according to wardrobe state.

- [ ] **Step 4: Add view presets and reduced motion**

Animate camera targets for `full`, `face`, and `outfit`. Disable idle breathing and stage rotation when motion is disabled.

- [ ] **Step 5: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: no type errors.

### Task 6: Build The Studio Overlay

**Files:**
- Create: `Frontend/src/components/FusionStyleStudio.tsx`
- Create: `Frontend/src/styles/fusionStyleStudio.css`
- Modify: `Frontend/src/main.tsx`

- [ ] **Step 1: Implement the lazy-ready overlay shell**

Use the existing overlay animation pattern, a top bar, profile rail, 3D stage, inspector, toast region, and accessible close action.

- [ ] **Step 2: Implement avatar and makeup controls**

Map catalog presets to buttons and swatches. Apply intensity sliders and finish selectors through immutable look updates.

- [ ] **Step 3: Implement wardrobe controls**

Expose garment silhouettes and color swatches. Show only valid combinations according to domain rules.

- [ ] **Step 4: Implement palette guidance**

Render the top recommendations with scores and translated reasons. Applying a recommendation updates the active makeup or garment target.

- [ ] **Step 5: Implement saved looks**

Allow naming, saving, loading, deleting, and exporting the current look. Format save timestamps with `formatFusionDateTime(lang, settings.timezone, settings.clock24)`.

- [ ] **Step 6: Add responsive and reduced-motion CSS**

Keep a three-column desktop layout, collapse the inspector rails at constrained widths, and preserve a usable center canvas.

- [ ] **Step 7: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: no type errors.

### Task 7: Integrate With Fusion OS

**Files:**
- Modify: `Frontend/src/components/SpatialHomeStage.tsx`

- [ ] **Step 1: Lazy-load the studio**

Use `React.lazy(() => import('./FusionStyleStudio'))` and render it inside `Suspense` only while `overlayApp === 'style'`.

- [ ] **Step 2: Add overlay routing and icon**

Treat `style` as an in-shell app and map it to a `Shirt` or `Palette` Lucide icon.

- [ ] **Step 3: Verify shell compilation**

Run: `npx tsc --noEmit`

Expected: no type errors and no exhaustive `AppId` breakage.

### Task 8: Full Verification

**Files:**
- Verify all modified and created files.

- [ ] **Step 1: Run all feature tests**

Run: `npm run test:features`

Expected: zero failures.

- [ ] **Step 2: Run the TypeScript check**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 3: Build production assets**

Run: `npm run build`

Expected: Vite build completes and emits a separate Three.js vendor chunk.

- [ ] **Step 4: Inspect the local preview in the in-app browser**

Open the Fusion OS preview, launch Virtual Style Studio, test mannequin rotation, makeup changes, garment exclusivity, recommendations, save/load, language switching, timezone formatting, and constrained viewport layout.

- [ ] **Step 5: Check browser console**

Read error-level logs and resolve any React, Three.js, asset, or runtime errors before completion.

