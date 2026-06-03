# Fusion RPG Unity Prototype Design

## Summary

Build a small Unity third-person action RPG prototype for Fusion OS Game Room. The prototype is a compact sakura academy action slice inspired by the four user-provided reference images: two anime character reference sheets and two sakura academy environment / prop sheets.

The game should pursue the refined visual direction of those references: pastel sakura pink, ice blue, navy uniforms, gold trim, layered cloth, long hair, ribbon accessories, decorative weapon ornaments, and a bright stylized academy courtyard. The user confirmed the reference characters, names, details, scene motifs, and prop designs are their own design work, so the game may directly preserve those naming and visual details where feasible. Implementation still needs to be staged so the first version becomes playable before high-detail art production.

## Goals

- Create a Unity sub-project under `IntegratedApps/FusionRPG`.
- Build a first playable vertical slice:
  - third-person movement
  - camera follow
  - jump and dash
  - one controllable heroine
  - one basic enemy
  - a 3-hit basic attack chain
  - one sakura / ice skill
  - simple HP and skill UI
  - one compact academy courtyard map
- Integrate the built Unity executable into Fusion OS Game Room using the same launch pattern as Piano Studio, Multimedia Studio, and Wave Studio.
- Keep the main WinForms / React Fusion OS shell stable by treating Unity as an isolated external application.

## Non-Goals For First Version

- Full open-world streaming.
- Gacha, inventory economy, character roster systems, or multiplayer.
- Complex cloth physics, hair physics, or full custom rigged character sculpt as a first task.
- Large quest systems or many NPCs.
- UE5-quality rendering, ray tracing, or heavy physics simulation.

## Visual Direction

### Character Direction

The player character should follow the user-provided reference sheets closely:

- anime school heroine proportions
- long pastel hair, with either ice-blue or sakura-pink variant support
- ribboned hair accessory
- navy and white academy uniform
- layered translucent skirt / coat panels
- gold trim and small hanging ornaments
- thigh-high stockings or asymmetric leg detail
- formal shoes with academy styling
- sword or staff-like weapon with moon / snowflake / sakura ornamentation

The initial playable version can use a proxy body or a simplified humanoid model, but scripts, naming, colors, and effects should already match the intended heroine. A later art pass can replace the proxy with a high-detail rigged model.

### Scene Direction

The first map is a small sakura academy courtyard based on the user-provided environment references:

- tiled stone plaza
- sakura trees and falling petals
- shrine / academy-style gate
- dark navy roof accents
- gold decorative trim
- pink banners
- lanterns
- benches
- notice board
- flower planters
- small pond or fountain
- low walls and modular stone paths

The first pass should use modular primitives and simple stylized meshes. The visual goal is clean composition and readable gameplay space before high-detail prop production.

## Gameplay

### Core Loop

1. Player spawns in a small sakura academy courtyard.
2. Player explores using third-person movement.
3. A basic enemy patrols or idles near the center plaza.
4. Player attacks with a 3-hit combo.
5. Player uses a sakura / ice burst skill.
6. Enemy HP reaches zero and the prototype shows a clear completion state.
7. Player can exit back to Fusion OS by closing the Unity window.

### Controls

- `WASD`: move
- Mouse: rotate camera
- `Space`: jump
- `Left Shift`: dash
- Left mouse button: basic attack
- `E` or right mouse button: skill
- `Esc`: pause / exit prompt in later versions

### Combat

The first combat system should be intentionally small:

- 3-hit melee combo with timing windows
- enemy receives damage and hit reaction
- player has HP
- enemy has HP
- one enemy attack or contact damage
- one skill called `Sakura Frost Burst`

`Sakura Frost Burst` should create a forward or radial stylized effect using pink petals and icy blue light. In first version this can be particles, simple transparent meshes, or Unity VFX Graph if available.

## Architecture

### Unity Project Layout

Target location:

```text
IntegratedApps/FusionRPG/
```

Recommended Unity folders:

```text
Assets/FusionRPG/
  Art/
  Audio/
  Materials/
  Prefabs/
  Scenes/
  Scripts/
  Settings/
  UI/
```

Core scene:

```text
Assets/FusionRPG/Scenes/SakuraAcademyPrototype.unity
```

### Script Components

- `PlayerController`
  - movement, jump, dash, grounding
- `ThirdPersonCamera`
  - follow target, mouse orbit, smoothing
- `PlayerCombat`
  - combo state, attack timing, skill trigger
- `Health`
  - current / max HP, damage, death event
- `EnemyController`
  - idle / chase / attack / dead states
- `DamageHitbox`
  - attack overlap and damage application
- `SkillEffect`
  - sakura / ice burst timing and collision
- `GameHud`
  - HP bar, skill cooldown, enemy HP, completion text
- `PrototypeGameManager`
  - spawn references, win state, reset state

### Fusion OS Integration

WinForms should gain a `LaunchFusionRPG` method following the existing `LaunchIntegratedExeApp` pattern.

Game Room should launch the built Unity executable from:

```text
IntegratedApps/FusionRPG/Build/FusionRPG.exe
```

The Unity game remains external. Fusion OS only needs to:

- launch it
- track running / closed state
- show status in the launcher
- avoid embedding Unity inside WebView

## Data Flow

```text
Fusion OS Game Room
  -> WinForms LaunchFusionRPG
  -> Unity executable
  -> Unity scene loads SakuraAcademyPrototype
  -> PlayerController / Camera / Combat systems run locally
  -> User closes Unity window
  -> WinForms process tracking marks Game Room as closed
```

No persistent save data is required for the first version.

## Art Production Stages

### Stage 1: Playable Proxy

- Use capsule or simple humanoid proxy.
- Use color-coded materials matching the heroine palette.
- Use modular blockout for courtyard.
- Implement movement, camera, enemy, attacks, skill, and HUD.

### Stage 2: Stylized Scene Pass

- Replace blockout with stylized academy props.
- Add sakura tree, tiled plaza, gate, lantern, bench, notice board, planter, pond / fountain.
- Add toon materials and soft lighting.

### Stage 3: Character Art Pass

- Replace proxy with rigged anime-style character.
- Apply reference-based uniform, hair, accessories, and weapon.
- Add idle, run, attack, dash, and skill animations.

### Stage 4: Polish

- Add petal particles.
- Add hit sparks and skill bloom.
- Improve camera framing.
- Add title / pause screen.
- Build and integrate with Fusion OS.

## Error Handling

- If Unity executable is missing, Fusion OS should show a clear Game Room missing-build message.
- If Unity exits, Fusion OS should remove the running indicator.
- If Unity build path changes, only the Game Room launcher configuration should need updating.
- If optional art assets are missing, Unity should still run with proxy prefabs.

## Testing

### Unity Checks

- Scene opens without missing script errors.
- Player can move, jump, dash, and rotate camera.
- Basic attack damages enemy.
- Skill damages enemy and displays effect.
- Enemy death triggers completion state.
- Build produces a Windows executable.

### Fusion OS Checks

- Game Room launches Unity executable.
- Running indicator appears while Unity is open.
- Running indicator clears after Unity closes.
- Missing executable path shows a useful message instead of crashing.

## Acceptance Criteria

The first version is complete when:

- `IntegratedApps/FusionRPG` contains a Unity project or Unity-compatible project structure.
- The prototype scene is playable in Unity.
- A Windows build can be launched from Fusion OS Game Room.
- The player can move around a sakura academy courtyard.
- The player can defeat one enemy with basic attacks and one sakura / ice skill.
- The visual direction clearly reflects the user-provided character and environment references, even if some assets are still proxy-quality.

