# Fusion RPG Combat Expansion Design

## Goal

Expand the existing Sakura Academy prototype into a playable combat encounter with imported lesser-enemy and boss GLB models, wave progression, a three-phase boss, player skills, jumping and aerial attacks, target selection, themed VFX, reliable combat collision, automated tests, and a Windows build.

## Approved Controls

- Arrow keys: free movement relative to the camera.
- Mouse drag: orbit camera.
- Left click: select or mark an enemy only.
- `A`: basic three-hit combo.
- `Space`: jump.
- `Space` then `A`: aerial attack.
- `Shift`: dash.
- `Q`: area skill.
- `W`: quick skill.
- `E`: forward dash skill.
- `R`: ultimate.
- Attacks use the player's current facing. They do not auto-turn, auto-chase, snap, or magnetize toward the selected target.
- WASD movement is disabled even though `W`, `A`, and `E` are combat keys.

## Encounter Flow

The player starts in the courtyard and must defeat two waves of lesser Sakura beasts. The first wave teaches basic combat and contains two enemies. The second wave contains three stronger enemies with more aggressive timing. Defeating all lesser enemies unlocks and spawns the Crimson Sakura Beast boss.

The boss has three health-driven phases:

1. **Phase One, Stalking Bloom**: deliberate pursuit, claw swipes, and a short forward charge.
2. **Phase Two, Thornstorm** at 65% health: faster movement, radial petal burst, leap slam, and shorter recovery.
3. **Phase Three, Crimson Eclipse** at 30% health: permanent aura, stronger attacks, chained charge/slam patterns, and periodic arena pulses.

The boss cannot be stagger-locked. It receives brief hit reactions but gains short stagger resistance after repeated hits.

## Player Combat

The existing basic combo remains a three-hit sequence but is moved to the `A` key. Attacks apply damage through reusable overlap-based hit queries that deduplicate `Health` targets and exclude the attacker.

- Basic combo: short frontal arcs with increasing damage and reach.
- Aerial attack: downward impact while airborne; damage is applied on ground contact in a small area.
- Quick skill (`W`): fast ranged Sakura projectile with modest damage and a low cooldown.
- Area skill (`Q`): circular Sakura burst around the player with medium damage and crowd control.
- Dash skill (`E`): forward invulnerable strike with swept collision checks to avoid tunneling through enemies.
- Ultimate (`R`): consumes a full ultimate gauge, creates a large multi-hit flower/rune field, and grants temporary damage resistance.

The ultimate gauge fills from dealing and receiving damage. Skills use independent cooldowns. Dash movement and attack movement are sub-stepped so thin walls and enemy hurtboxes are not skipped.

## Enemy Models And Animation

Both supplied enemy GLBs are static meshes with no skin or animation clips. Their render meshes are therefore not used as dynamic MeshColliders.

Each enemy root uses:

- `CharacterController` for terrain and wall collision.
- Several child Capsule/Box/Sphere colliders as trigger hurtboxes fitted to normalized model bounds.
- Separate attack hitboxes activated only during attack impact frames.
- A visual child containing the GLB renderer.
- Procedural visual animation for idle breathing, locomotion bounce, attack anticipation, attack recoil, hit reaction, phase transition, and death.

This preserves stable movement and combat accuracy without attempting to move a million-vertex non-convex collider.

## Target Selection

Left click raycasts from the gameplay camera. The nearest `CombatTarget` under the cursor becomes selected. Selection affects HUD highlighting, the target health bar, and a world-space marker only. It never changes movement or attack direction.

The target is cleared when it dies, is disabled, or exceeds the configured selection distance.

## VFX Integration

The supplied Imagy VFX package is the primary effect source. Only compatible runtime assets and their dependencies are imported; demo scenes, demo input scripts, obsolete post-processing assets, and unrelated example characters are excluded.

Preferred mapping:

- Basic hit: Flowers explosion particles.
- Quick skill: Shinto rune/projectile treatment.
- Area skill: Flowers of Life burst.
- Dash skill: moveable trail or lightweight custom trail using imported textures.
- Ultimate: Shinto sequence plus flower particles and controlled bloom-like emissive materials.
- Boss phases: Ink Aura and red/purple variants of rune/flower effects.

Because the package predates URP, incompatible materials are converted or replaced with URP particle materials while preserving package textures and particle timing.

## HUD

The gameplay HUD displays:

- Player HP.
- Four skill cooldown indicators labeled `W`, `Q`, `E`, and `R`.
- Ultimate gauge.
- Current wave/objective text.
- Selected target name and HP.
- Boss name, HP, and phase when the boss is active.

All gameplay HUD text for this screen uses Traditional Chinese.

## Collision And Physics

- Courtyard floors and walls retain the visible imported mesh as a non-convex static `MeshCollider`, with Fast Midphase disabled.
- Player and enemies use `CharacterController` movement with substeps.
- Enemy hurtboxes are triggers and are excluded from world collision.
- Attack queries use layer masks and attacker-root filtering.
- Projectiles use sphere casts between previous and current positions to prevent tunneling.
- Aerial attacks verify grounded transition before applying impact damage.
- Spawn positions are snapped to the imported courtyard mesh and rejected if they overlap walls.
- Boss charges use capsule casts and stop at world geometry.

## Testing

EditMode tests cover:

- Approved input bindings and disabled WASD movement.
- Skill cooldown and ultimate-gauge behavior.
- Boss phase thresholds and phase monotonicity.
- Wave progression and boss unlock conditions.
- Damage deduplication, attacker exclusion, and target selection state.
- Imported enemy assets and required scene components.
- Enemy hurtboxes use primitive trigger colliders rather than dynamic high-density MeshColliders.
- Existing courtyard precision-collision guarantees remain intact.

PlayMode tests cover:

- CharacterController movement cannot pass through a representative wall.
- Projectile swept collision detects a target between frames.
- Dash attack stops at geometry and damages each enemy once.
- Aerial attack triggers only after an airborne-to-grounded transition.
- Boss transitions through all phases and can complete the encounter.

Manual verification covers camera controls, all key bindings, model scale, VFX rendering, enemy readability, HUD layout, and a complete encounter run.

## Performance Constraints

The imported enemy meshes are extremely dense. Only one boss and at most three lesser enemies are active simultaneously. Renderers share imported materials where possible. Combat collision uses primitive volumes, physics queries use non-allocating buffers, and VFX instances are short-lived or pooled.

