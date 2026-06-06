# Fusion RPG Combat Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete lesser-enemy wave encounter and three-phase boss fight using the supplied GLBs and VFX package, with Genshin-style free control, reliable collision, automated tests, and a Windows build.

**Architecture:** Preserve the existing Unity scene builder and gameplay namespace. Add focused combat-state, targeting, projectile, encounter, boss, and procedural-animation components. Keep static environment collision mesh-accurate while using primitive compound hurtboxes and CharacterControllers for moving actors.

**Tech Stack:** Unity 6000.0.32f1, C#, UGUI, glTFast 6.19.0, Unity Test Framework, built-in ParticleSystem with URP-compatible materials.

---

### Task 1: Asset Inventory And Import

**Files:**
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Editor/FusionRPGGltfTools.cs`
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Editor/SakuraAcademyPrototypeBuilder.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Art/Models/lesser_sakura_beast.glb`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Art/Models/crimson_sakura_beast_boss.glb`
- Create: selected assets under `IntegratedApps/FusionRPG/Assets/ImagyVFX/`

- [ ] Copy the two supplied GLBs into the project with stable ASCII filenames.
- [ ] Extract the unitypackage preserving asset GUIDs.
- [ ] Import only Flowers, ShintoRune, InkAura, required common textures/materials/models/animations, and compatible utility scripts.
- [ ] Exclude demo scenes, legacy post-processing, demo characters, and obsolete demo input scripts.
- [ ] Run Unity asset import and record any compile or shader errors.
- [ ] Convert selected VFX materials to URP-compatible particle shaders where necessary.

### Task 2: Write Failing Combat-State Tests

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/EditMode/CombatExpansionTests.cs`

- [ ] Add a test asserting ultimate gauge starts empty, fills from combat events, clamps at maximum, and is consumed only when full.
- [ ] Add a test asserting boss phases change at 65% and 30% health and never regress.
- [ ] Add a test asserting the encounter starts with wave one, advances after all active enemies die, and unlocks the boss only after wave two.
- [ ] Add a test asserting selected targets can be set and are cleared when dead.
- [ ] Run the EditMode suite and verify these tests fail because the new types do not exist.

### Task 3: Implement Core Combat State

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/UltimateGauge.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/BossPhaseState.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/EncounterProgress.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/CombatTargeting.cs`
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Health.cs`

- [ ] Implement pure, deterministic state classes for gauge, phases, and wave progression.
- [ ] Add non-breaking `Damaged` and health-ratio reporting to `Health`.
- [ ] Implement target selection state independently from camera raycasting.
- [ ] Run EditMode tests and verify the new combat-state tests pass.

### Task 4: Write Failing Player Ability Tests

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/EditMode/PlayerAbilityTests.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/PlayMode/PlayerAbilityPlayModeTests.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/PlayMode/FusionRPG.PlayModeTests.asmdef`

- [ ] Test that movement consumes arrow-key axes and does not consume WASD axes.
- [ ] Test that `A` dispatches ground combo while airborne `A` arms an aerial impact.
- [ ] Test that each ability has an independent cooldown.
- [ ] Test that dash attack damage is deduplicated per target.
- [ ] Test that swept projectile collision catches a target between frames.
- [ ] Run tests and verify they fail for missing ability and projectile components.

### Task 5: Implement Player Controls And Abilities

**Files:**
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/PlayerController.cs`
- Replace: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/PlayerCombat.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/CombatInput.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/CombatProjectile.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/CombatVfx.cs`
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/DamageHitbox.cs`

- [ ] Replace horizontal/vertical Input Manager movement with direct arrow-key sampling.
- [ ] Keep mouse-drag camera behavior and Shift dash.
- [ ] Bind `A`, `W`, `Q`, `E`, and `R` exactly as approved.
- [ ] Implement ground combo, aerial impact, projectile skill, area skill, dash strike, and ultimate field.
- [ ] Use overlap and cast queries with attacker exclusion and per-cast damage deduplication.
- [ ] Connect damage dealt/received to the ultimate gauge.
- [ ] Run EditMode and PlayMode ability tests until green.

### Task 6: Write Failing Enemy And Scene Contract Tests

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/EditMode/EnemyEncounterSceneTests.cs`

- [ ] Test that both imported GLBs exist and are used by scene instances.
- [ ] Test that active enemies have CharacterControllers and at least three primitive trigger hurtboxes.
- [ ] Test that no moving enemy has a non-convex MeshCollider.
- [ ] Test that wave enemies and boss have distinct health, damage, and scale values.
- [ ] Test that the boss has three attack patterns and a phase controller.
- [ ] Run EditMode tests and verify scene contract failures.

### Task 7: Implement Enemy Actors And Boss AI

**Files:**
- Replace: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/EnemyController.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/BossController.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/EnemyAttack.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/EnemyProceduralAnimator.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/CombatHurtbox.cs`

- [ ] Implement lesser-enemy patrol, pursuit, telegraphed swipe, lunge, recovery, hit reaction, and death states.
- [ ] Implement boss phase transitions, attack selection, anti-stagger resistance, charge collision, leap slam, radial burst, and arena pulse.
- [ ] Add procedural static-mesh animation without cloning/deforming million-vertex meshes every frame.
- [ ] Ensure all actor movement uses substeps/casts and respects courtyard world collision.
- [ ] Run unit tests for phases and AI attack availability.

### Task 8: Build Encounter Scene And HUD

**Files:**
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Editor/SakuraAcademyPrototypeBuilder.cs`
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/PrototypeGameManager.cs`
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/GameHud.cs`
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Gameplay/ThirdPersonCamera.cs`

- [ ] Normalize and instantiate lesser-enemy and boss GLBs at balanced sizes.
- [ ] Create wave spawn points validated against courtyard mesh and wall overlaps.
- [ ] Build compound hurtboxes from normalized actor bounds.
- [ ] Wire the two-wave encounter and delayed boss activation.
- [ ] Add target selection raycasting and a world marker.
- [ ] Replace prototype HUD with Traditional Chinese wave, skill, target, ultimate, and boss phase UI.
- [ ] Wire selected Imagy VFX prefabs or converted particle variants to all player and boss abilities.
- [ ] Rebuild and save `SakuraAcademyPrototype.unity`.

### Task 9: Collision And Full Encounter Verification

**Files:**
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/EditMode/ImportedCourtyardCollisionTests.cs`
- Modify: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/PlayMode/PlayerAbilityPlayModeTests.cs`

- [ ] Run the full EditMode suite and require zero failures.
- [ ] Run the PlayMode collision/ability suite and require zero failures.
- [ ] Verify representative courtyard wall casts, ground snapping, enemy spawn overlap rejection, dash-wall stopping, and aerial landing impact.
- [ ] Capture a final gameplay preview showing lesser enemies or the boss, HUD, and imported environment.
- [ ] Inspect Unity logs for compile errors, missing shaders, missing scripts, and Fast Midphase warnings.

### Task 10: Windows Build

**Files:**
- Update generated player files under `IntegratedApps/FusionRPG/Build/`

- [ ] Build `IntegratedApps/FusionRPG/Build/FusionRPG.exe`.
- [ ] Confirm Unity reports `Build Finished, Result: Success`.
- [ ] Confirm the executable and data folder exist.
- [ ] Remove only transient verification logs and XML result files.

