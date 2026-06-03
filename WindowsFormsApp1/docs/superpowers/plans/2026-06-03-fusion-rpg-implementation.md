# Fusion RPG Unity Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Unity third-person sakura academy action RPG prototype and launch it from Fusion OS Game Room.

**Architecture:** Unity lives as an isolated external app under `IntegratedApps/FusionRPG`, with scripts and generated scene content inside `Assets/FusionRPG`. WinForms launches the Unity Windows build with the existing external-process tracking pattern, so the Fusion OS shell remains stable.

**Tech Stack:** Unity 6000.0.32f1, C# runtime scripts, Unity Test Framework EditMode tests, Unity batchmode build, WinForms launcher integration.

---

## File Structure

### Unity Project

- Create: `IntegratedApps/FusionRPG/`
  - Unity project root created by `Unity.exe -createProject`.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Health.cs`
  - Shared HP, damage, healing, death event.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/DamageHitbox.cs`
  - Applies damage to `Health` components in a radius or trigger.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/PlayerController.cs`
  - WASD movement, jump, dash, grounding.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/ThirdPersonCamera.cs`
  - Mouse orbit camera and follow smoothing.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/PlayerCombat.cs`
  - Three-hit combo and sakura / ice skill trigger.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/SkillEffect.cs`
  - Timed visual effect and radial damage.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/EnemyController.cs`
  - Idle, chase, attack, dead state.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/GameHud.cs`
  - HP bars, skill cooldown display, win text.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/PrototypeGameManager.cs`
  - Wires player, enemy, HUD, win state.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Editor/FusionRPGSceneBuilder.cs`
  - Generates the prototype scene, proxy heroine, enemy, props, lighting, and materials.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Editor/FusionRPGBuild.cs`
  - Builds `IntegratedApps/FusionRPG/Build/FusionRPG.exe`.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/EditMode/HealthTests.cs`
  - Tests HP clamping, damage, heal, death event.
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/EditMode/CombatTests.cs`
  - Tests combo index progression and skill cooldown logic through pure helper methods.

### Fusion OS Integration

- Modify: `Form1.cs`
  - Add `LaunchFusionRPG`.
  - Route `game` / `Game Room` actions to Unity executable.
  - Add missing build message.
- Modify: `Frontend/src/data/fusionApps.ts`
  - Update Game Room description/status to reflect Fusion RPG.

## Task 1: Create Unity Project Skeleton

**Files:**
- Create directory: `IntegratedApps/FusionRPG`
- Unity creates: `IntegratedApps/FusionRPG/Assets`
- Unity creates: `IntegratedApps/FusionRPG/Packages`
- Unity creates: `IntegratedApps/FusionRPG/ProjectSettings`

- [ ] **Step 1: Verify Unity executable exists**

Run:

```powershell
Test-Path "C:\Program Files\Unity\Hub\Editor\6000.0.32f1\Editor\Unity.exe"
```

Expected: `True`

- [ ] **Step 2: Create the Unity project**

Run:

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.0.32f1\Editor\Unity.exe" `
  -batchmode `
  -quit `
  -createProject "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG"
```

Expected: Unity exits with code `0`, and `IntegratedApps/FusionRPG/Assets` exists.

- [ ] **Step 3: Configure packages**

Modify `IntegratedApps/FusionRPG/Packages/manifest.json` to include test framework and built-in rendering packages:

```json
{
  "dependencies": {
    "com.unity.collab-proxy": "2.5.2",
    "com.unity.feature.development": "1.0.2",
    "com.unity.ide.visualstudio": "2.0.22",
    "com.unity.test-framework": "1.4.5",
    "com.unity.textmeshpro": "3.0.9",
    "com.unity.timeline": "1.8.7",
    "com.unity.ugui": "2.0.0",
    "com.unity.modules.ai": "1.0.0",
    "com.unity.modules.animation": "1.0.0",
    "com.unity.modules.audio": "1.0.0",
    "com.unity.modules.imgui": "1.0.0",
    "com.unity.modules.jsonserialize": "1.0.0",
    "com.unity.modules.particlesystem": "1.0.0",
    "com.unity.modules.physics": "1.0.0",
    "com.unity.modules.ui": "1.0.0",
    "com.unity.modules.uielements": "1.0.0"
  }
}
```

- [ ] **Step 4: Open project once in batchmode**

Run:

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.0.32f1\Editor\Unity.exe" `
  -batchmode `
  -projectPath "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG" `
  -quit `
  -logFile "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG\unity-open.log"
```

Expected: exit code `0`, no `Compiler errors` in `unity-open.log`.

## Task 2: Health And Damage Foundation

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/Health.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/DamageHitbox.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/EditMode/HealthTests.cs`

- [ ] **Step 1: Write failing Health tests**

Create `HealthTests.cs`:

```csharp
using NUnit.Framework;
using UnityEngine;
using FusionRPG;

public sealed class HealthTests
{
    [Test]
    public void DamageClampsAtZeroAndFiresDeathOnce()
    {
        var go = new GameObject("health");
        var health = go.AddComponent<Health>();
        health.SetMaxHealthForTests(100);
        var deaths = 0;
        health.Died += () => deaths++;

        health.ApplyDamage(35);
        Assert.AreEqual(65, health.Current);

        health.ApplyDamage(1000);
        health.ApplyDamage(10);

        Assert.AreEqual(0, health.Current);
        Assert.AreEqual(1, deaths);
        Object.DestroyImmediate(go);
    }

    [Test]
    public void HealDoesNotExceedMaxHealth()
    {
        var go = new GameObject("health");
        var health = go.AddComponent<Health>();
        health.SetMaxHealthForTests(80);

        health.ApplyDamage(50);
        health.Heal(100);

        Assert.AreEqual(80, health.Current);
        Object.DestroyImmediate(go);
    }
}
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.0.32f1\Editor\Unity.exe" `
  -batchmode `
  -projectPath "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG" `
  -runTests `
  -testPlatform EditMode `
  -testResults "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG\TestResults-Health.xml"
```

Do not add `-quit` to Unity Test Framework runs; on Unity 6000.0.32f1, the test runner owns editor shutdown and writes the XML report before exiting.

Expected: FAIL because `FusionRPG.Health` does not exist.

- [ ] **Step 3: Implement Health**

Create `Health.cs`:

```csharp
using System;
using UnityEngine;

namespace FusionRPG
{
    public sealed class Health : MonoBehaviour
    {
        [SerializeField] private int maxHealth = 100;
        [SerializeField] private int current;
        private bool died;

        public event Action Died;
        public int Current => current;
        public int Max => maxHealth;
        public bool IsDead => died;

        private void Awake()
        {
            current = Mathf.Clamp(current <= 0 ? maxHealth : current, 0, maxHealth);
            died = current <= 0;
        }

        public void ApplyDamage(int amount)
        {
            if (died || amount <= 0) return;
            current = Mathf.Max(0, current - amount);
            if (current == 0)
            {
                died = true;
                Died?.Invoke();
            }
        }

        public void Heal(int amount)
        {
            if (died || amount <= 0) return;
            current = Mathf.Min(maxHealth, current + amount);
        }

        public void SetMaxHealthForTests(int value)
        {
            maxHealth = Mathf.Max(1, value);
            current = maxHealth;
            died = false;
        }
    }
}
```

- [ ] **Step 4: Implement DamageHitbox**

Create `DamageHitbox.cs`:

```csharp
using System.Collections.Generic;
using UnityEngine;

namespace FusionRPG
{
    public sealed class DamageHitbox : MonoBehaviour
    {
        [SerializeField] private int damage = 15;
        [SerializeField] private float radius = 1.4f;
        [SerializeField] private LayerMask targetLayers = ~0;
        private readonly Collider[] hits = new Collider[16];

        public int Apply(Vector3 center)
        {
            var count = Physics.OverlapSphereNonAlloc(center, radius, hits, targetLayers, QueryTriggerInteraction.Ignore);
            var damaged = new HashSet<Health>();
            for (var i = 0; i < count; i++)
            {
                var health = hits[i].GetComponentInParent<Health>();
                if (health == null || damaged.Contains(health)) continue;
                health.ApplyDamage(damage);
                damaged.Add(health);
            }
            return damaged.Count;
        }

        public void Configure(int nextDamage, float nextRadius, LayerMask nextLayers)
        {
            damage = Mathf.Max(1, nextDamage);
            radius = Mathf.Max(0.1f, nextRadius);
            targetLayers = nextLayers;
        }
    }
}
```

- [ ] **Step 5: Run Health tests and verify pass**

Run the same Unity test command from Step 2.

Expected: PASS for both Health tests.

## Task 3: Player Movement And Camera

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/PlayerController.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/ThirdPersonCamera.cs`

- [ ] **Step 1: Implement PlayerController**

Create `PlayerController.cs`:

```csharp
using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        [SerializeField] private float moveSpeed = 5.2f;
        [SerializeField] private float dashSpeed = 10.5f;
        [SerializeField] private float dashDuration = 0.16f;
        [SerializeField] private float jumpHeight = 1.25f;
        [SerializeField] private float gravity = -22f;
        [SerializeField] private Transform cameraPivot;

        private CharacterController controller;
        private Vector3 velocity;
        private float dashTimer;

        public bool IsDashing => dashTimer > 0f;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
        }

        private void Update()
        {
            var input = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            input = Vector2.ClampMagnitude(input, 1f);

            var forward = cameraPivot ? cameraPivot.forward : Vector3.forward;
            var right = cameraPivot ? cameraPivot.right : Vector3.right;
            forward.y = 0f;
            right.y = 0f;
            forward.Normalize();
            right.Normalize();

            var move = forward * input.y + right * input.x;
            if (move.sqrMagnitude > 0.001f)
            {
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(move), 16f * Time.deltaTime);
            }

            if (controller.isGrounded && velocity.y < 0f)
            {
                velocity.y = -2f;
            }

            if (controller.isGrounded && Input.GetKeyDown(KeyCode.Space))
            {
                velocity.y = Mathf.Sqrt(jumpHeight * -2f * gravity);
            }

            if (Input.GetKeyDown(KeyCode.LeftShift) && dashTimer <= 0f)
            {
                dashTimer = dashDuration;
            }

            var speed = dashTimer > 0f ? dashSpeed : moveSpeed;
            dashTimer = Mathf.Max(0f, dashTimer - Time.deltaTime);
            controller.Move(move * speed * Time.deltaTime);

            velocity.y += gravity * Time.deltaTime;
            controller.Move(velocity * Time.deltaTime);
        }

        public void SetCameraPivot(Transform pivot)
        {
            cameraPivot = pivot;
        }
    }
}
```

- [ ] **Step 2: Implement ThirdPersonCamera**

Create `ThirdPersonCamera.cs`:

```csharp
using UnityEngine;

namespace FusionRPG
{
    public sealed class ThirdPersonCamera : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 offset = new Vector3(0f, 2.1f, -5.2f);
        [SerializeField] private float mouseSensitivity = 140f;
        [SerializeField] private float smooth = 12f;
        [SerializeField] private float minPitch = -24f;
        [SerializeField] private float maxPitch = 58f;

        private float yaw;
        private float pitch = 18f;

        private void LateUpdate()
        {
            if (!target) return;
            yaw += Input.GetAxis("Mouse X") * mouseSensitivity * Time.deltaTime;
            pitch -= Input.GetAxis("Mouse Y") * mouseSensitivity * Time.deltaTime;
            pitch = Mathf.Clamp(pitch, minPitch, maxPitch);

            var rotation = Quaternion.Euler(pitch, yaw, 0f);
            var desired = target.position + rotation * offset;
            transform.position = Vector3.Lerp(transform.position, desired, 1f - Mathf.Exp(-smooth * Time.deltaTime));
            transform.rotation = rotation;
        }

        public void SetTarget(Transform nextTarget)
        {
            target = nextTarget;
        }
    }
}
```

- [ ] **Step 3: Compile scripts**

Run:

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.0.32f1\Editor\Unity.exe" `
  -batchmode `
  -projectPath "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG" `
  -quit `
  -logFile "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG\unity-compile-movement.log"
```

Expected: exit code `0`, no compiler errors.

## Task 4: Combat, Combo, And Skill Logic

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/PlayerCombat.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/SkillEffect.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Tests/EditMode/CombatTests.cs`

- [ ] **Step 1: Write combat helper tests**

Create `CombatTests.cs`:

```csharp
using NUnit.Framework;
using FusionRPG;

public sealed class CombatTests
{
    [Test]
    public void NextComboIndexWrapsAfterThreeHits()
    {
        Assert.AreEqual(1, PlayerCombat.NextComboIndexForTests(0));
        Assert.AreEqual(2, PlayerCombat.NextComboIndexForTests(1));
        Assert.AreEqual(0, PlayerCombat.NextComboIndexForTests(2));
    }

    [Test]
    public void SkillReadyWhenCooldownRemainingIsZero()
    {
        Assert.IsTrue(PlayerCombat.IsSkillReadyForTests(0f));
        Assert.IsFalse(PlayerCombat.IsSkillReadyForTests(0.1f));
    }
}
```

- [ ] **Step 2: Run tests and verify failure**

Run Unity EditMode tests.

Expected: FAIL because `PlayerCombat` does not exist.

- [ ] **Step 3: Implement PlayerCombat**

Create `PlayerCombat.cs`:

```csharp
using UnityEngine;

namespace FusionRPG
{
    public sealed class PlayerCombat : MonoBehaviour
    {
        [SerializeField] private Transform attackOrigin;
        [SerializeField] private DamageHitbox hitbox;
        [SerializeField] private SkillEffect skillEffect;
        [SerializeField] private float comboResetTime = 0.85f;
        [SerializeField] private float attackCooldown = 0.24f;
        [SerializeField] private float skillCooldown = 4.5f;

        private int comboIndex;
        private float comboTimer;
        private float attackTimer;
        private float skillTimer;

        public float SkillCooldownRemaining => skillTimer;

        private void Update()
        {
            comboTimer = Mathf.Max(0f, comboTimer - Time.deltaTime);
            attackTimer = Mathf.Max(0f, attackTimer - Time.deltaTime);
            skillTimer = Mathf.Max(0f, skillTimer - Time.deltaTime);
            if (comboTimer <= 0f) comboIndex = 0;

            if (Input.GetMouseButtonDown(0)) TryBasicAttack();
            if (Input.GetKeyDown(KeyCode.E) || Input.GetMouseButtonDown(1)) TrySkill();
        }

        public bool TryBasicAttack()
        {
            if (attackTimer > 0f || hitbox == null) return false;
            var damage = comboIndex == 2 ? 28 : 18;
            hitbox.Configure(damage, comboIndex == 2 ? 1.9f : 1.45f, ~0);
            hitbox.Apply(attackOrigin ? attackOrigin.position : transform.position + transform.forward * 1.2f);
            comboIndex = NextComboIndexForTests(comboIndex);
            comboTimer = comboResetTime;
            attackTimer = attackCooldown;
            return true;
        }

        public bool TrySkill()
        {
            if (!IsSkillReadyForTests(skillTimer) || skillEffect == null) return false;
            skillEffect.Fire(transform.position + transform.forward * 1.5f, transform.forward);
            skillTimer = skillCooldown;
            return true;
        }

        public static int NextComboIndexForTests(int current)
        {
            return (current + 1) % 3;
        }

        public static bool IsSkillReadyForTests(float cooldownRemaining)
        {
            return cooldownRemaining <= 0f;
        }
    }
}
```

- [ ] **Step 4: Implement SkillEffect**

Create `SkillEffect.cs`:

```csharp
using UnityEngine;

namespace FusionRPG
{
    public sealed class SkillEffect : MonoBehaviour
    {
        [SerializeField] private int damage = 42;
        [SerializeField] private float radius = 2.8f;
        [SerializeField] private float visibleTime = 0.55f;
        [SerializeField] private LayerMask targetLayers = ~0;
        private readonly Collider[] hits = new Collider[24];
        private float visibleTimer;

        private void Update()
        {
            if (visibleTimer <= 0f) return;
            visibleTimer -= Time.deltaTime;
            transform.localScale = Vector3.one * Mathf.Lerp(0.8f, 1.35f, 1f - visibleTimer / visibleTime);
            if (visibleTimer <= 0f)
            {
                foreach (Transform child in transform) child.gameObject.SetActive(false);
            }
        }

        public void Fire(Vector3 center, Vector3 forward)
        {
            transform.position = center;
            transform.rotation = Quaternion.LookRotation(forward.sqrMagnitude > 0.01f ? forward : Vector3.forward);
            visibleTimer = visibleTime;
            foreach (Transform child in transform) child.gameObject.SetActive(true);

            var count = Physics.OverlapSphereNonAlloc(center, radius, hits, targetLayers, QueryTriggerInteraction.Ignore);
            for (var i = 0; i < count; i++)
            {
                var health = hits[i].GetComponentInParent<Health>();
                if (health != null) health.ApplyDamage(damage);
            }
        }
    }
}
```

- [ ] **Step 5: Run Combat tests and verify pass**

Run Unity EditMode tests.

Expected: PASS for Health and Combat tests.

## Task 5: Enemy AI And Game State

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/EnemyController.cs`
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/PrototypeGameManager.cs`

- [ ] **Step 1: Implement EnemyController**

Create `EnemyController.cs`:

```csharp
using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(Health))]
    public sealed class EnemyController : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private float chaseRange = 8f;
        [SerializeField] private float attackRange = 1.6f;
        [SerializeField] private float moveSpeed = 2.7f;
        [SerializeField] private float attackCooldown = 1.2f;
        [SerializeField] private int attackDamage = 8;
        private Health health;
        private float attackTimer;

        private void Awake()
        {
            health = GetComponent<Health>();
            health.Died += OnDied;
        }

        private void Update()
        {
            if (health.IsDead || target == null) return;
            attackTimer = Mathf.Max(0f, attackTimer - Time.deltaTime);
            var toTarget = target.position - transform.position;
            toTarget.y = 0f;
            var distance = toTarget.magnitude;
            if (distance > chaseRange) return;

            if (distance > attackRange)
            {
                var direction = toTarget.normalized;
                transform.position += direction * moveSpeed * Time.deltaTime;
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction), 10f * Time.deltaTime);
            }
            else if (attackTimer <= 0f)
            {
                target.GetComponent<Health>()?.ApplyDamage(attackDamage);
                attackTimer = attackCooldown;
            }
        }

        public void SetTarget(Transform nextTarget)
        {
            target = nextTarget;
        }

        private void OnDied()
        {
            gameObject.name = "Enemy Defeated";
            enabled = false;
        }
    }
}
```

- [ ] **Step 2: Implement PrototypeGameManager**

Create `PrototypeGameManager.cs`:

```csharp
using UnityEngine;

namespace FusionRPG
{
    public sealed class PrototypeGameManager : MonoBehaviour
    {
        [SerializeField] private Health playerHealth;
        [SerializeField] private Health enemyHealth;
        [SerializeField] private GameHud hud;

        private void Start()
        {
            if (enemyHealth != null) enemyHealth.Died += OnEnemyDefeated;
            if (hud != null) hud.SetMessage("Defeat the academy shade.");
        }

        private void Update()
        {
            if (hud == null) return;
            hud.SetHealth(playerHealth, enemyHealth);
        }

        private void OnEnemyDefeated()
        {
            if (hud != null) hud.SetMessage("Prototype complete. Sakura courtyard secured.");
        }
    }
}
```

- [ ] **Step 3: Compile scripts**

Run Unity batchmode compile.

Expected: exit code `0`, no compiler errors.

## Task 6: HUD

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scripts/GameHud.cs`

- [ ] **Step 1: Implement GameHud using legacy UGUI**

Create `GameHud.cs`:

```csharp
using UnityEngine;
using UnityEngine.UI;

namespace FusionRPG
{
    public sealed class GameHud : MonoBehaviour
    {
        [SerializeField] private Slider playerHp;
        [SerializeField] private Slider enemyHp;
        [SerializeField] private Text message;

        public void SetHealth(Health player, Health enemy)
        {
            if (playerHp != null && player != null)
            {
                playerHp.maxValue = player.Max;
                playerHp.value = player.Current;
            }
            if (enemyHp != null && enemy != null)
            {
                enemyHp.maxValue = enemy.Max;
                enemyHp.value = enemy.Current;
            }
        }

        public void SetMessage(string value)
        {
            if (message != null) message.text = value;
        }
    }
}
```

- [ ] **Step 2: Compile HUD script**

Run Unity batchmode compile.

Expected: exit code `0`, no compiler errors.

## Task 7: Generate Sakura Academy Prototype Scene

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Editor/FusionRPGSceneBuilder.cs`
- Create scene: `IntegratedApps/FusionRPG/Assets/FusionRPG/Scenes/SakuraAcademyPrototype.unity`

- [ ] **Step 1: Implement scene builder**

Create `FusionRPGSceneBuilder.cs`:

```csharp
using FusionRPG;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

namespace FusionRPG.Editor
{
    public static class FusionRPGSceneBuilder
    {
        [MenuItem("FusionRPG/Build Prototype Scene")]
        public static void BuildPrototypeScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            RenderSettings.ambientLight = new Color(0.72f, 0.78f, 0.92f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.82f, 0.88f, 0.98f);
            RenderSettings.fogDensity = 0.012f;

            var materials = new Materials();
            materials.Create();

            CreateLight();
            CreateGround(materials);
            CreateAcademyProps(materials);

            var player = CreatePlayer(materials);
            var enemy = CreateEnemy(materials);
            enemy.GetComponent<EnemyController>().SetTarget(player.transform);

            var camera = new GameObject("Third Person Camera").AddComponent<Camera>();
            camera.gameObject.AddComponent<AudioListener>();
            camera.transform.position = new Vector3(0f, 3f, -7f);
            camera.transform.rotation = Quaternion.Euler(18f, 0f, 0f);
            var follow = camera.gameObject.AddComponent<ThirdPersonCamera>();
            follow.SetTarget(player.transform);
            player.GetComponent<PlayerController>().SetCameraPivot(camera.transform);

            var hud = CreateHud();
            var manager = new GameObject("Prototype Game Manager").AddComponent<PrototypeGameManager>();
            SetPrivate(manager, "playerHealth", player.GetComponent<Health>());
            SetPrivate(manager, "enemyHealth", enemy.GetComponent<Health>());
            SetPrivate(manager, "hud", hud);

            EditorSceneManager.SaveScene(scene, "Assets/FusionRPG/Scenes/SakuraAcademyPrototype.unity");
        }

        private static void CreateLight()
        {
            var sun = new GameObject("Soft Sakura Sun").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.08f;
            sun.color = new Color(1f, 0.88f, 0.95f);
            sun.transform.rotation = Quaternion.Euler(48f, -32f, 0f);
        }

        private static void CreateGround(Materials m)
        {
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "Stone Tile Plaza";
            ground.transform.localScale = new Vector3(18f, 0.2f, 18f);
            ground.transform.position = new Vector3(0f, -0.1f, 0f);
            ground.GetComponent<Renderer>().sharedMaterial = m.Stone;

            for (var x = -4; x <= 4; x++)
            for (var z = -4; z <= 4; z++)
            {
                var tile = GameObject.CreatePrimitive(PrimitiveType.Cube);
                tile.name = "Decorative Tile";
                tile.transform.localScale = new Vector3(1.72f, 0.03f, 1.72f);
                tile.transform.position = new Vector3(x * 1.85f, 0.02f, z * 1.85f);
                tile.GetComponent<Renderer>().sharedMaterial = (x + z) % 2 == 0 ? m.StoneLight : m.Stone;
            }
        }

        private static void CreateAcademyProps(Materials m)
        {
            CreateSakuraTree(new Vector3(-6f, 0f, 5.4f), m);
            CreateGate(new Vector3(0f, 0f, 7.8f), m);
            CreateBench(new Vector3(-5.6f, 0f, -3.8f), m);
            CreateLantern(new Vector3(5.6f, 0f, 3.8f), m);
            CreateNoticeBoard(new Vector3(6.4f, 0f, -3.8f), m);
            CreateFountain(new Vector3(0f, 0f, -4.8f), m);
        }

        private static GameObject CreatePlayer(Materials m)
        {
            var root = new GameObject("Tsukishiro Aiyuki Proxy");
            root.transform.position = new Vector3(0f, 0.1f, -1.5f);
            var controller = root.AddComponent<CharacterController>();
            controller.height = 1.62f;
            controller.radius = 0.32f;
            root.AddComponent<Health>().SetMaxHealthForTests(100);
            root.AddComponent<PlayerController>();

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Ice Blue Academy Uniform Proxy";
            body.transform.SetParent(root.transform);
            body.transform.localPosition = new Vector3(0f, 0.82f, 0f);
            body.transform.localScale = new Vector3(0.68f, 0.82f, 0.68f);
            body.GetComponent<Renderer>().sharedMaterial = m.Heroine;

            var attackOrigin = new GameObject("Attack Origin").transform;
            attackOrigin.SetParent(root.transform);
            attackOrigin.localPosition = new Vector3(0f, 0.9f, 1.15f);
            var hitbox = root.AddComponent<DamageHitbox>();
            var skill = CreateSkillEffect(m);
            var combat = root.AddComponent<PlayerCombat>();
            SetPrivate(combat, "attackOrigin", attackOrigin);
            SetPrivate(combat, "hitbox", hitbox);
            SetPrivate(combat, "skillEffect", skill);
            return root;
        }

        private static GameObject CreateEnemy(Materials m)
        {
            var enemy = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            enemy.name = "Academy Shade";
            enemy.transform.position = new Vector3(2.8f, 0.9f, 1.6f);
            enemy.transform.localScale = new Vector3(0.78f, 0.9f, 0.78f);
            enemy.GetComponent<Renderer>().sharedMaterial = m.Enemy;
            enemy.AddComponent<Health>().SetMaxHealthForTests(100);
            enemy.AddComponent<EnemyController>();
            return enemy;
        }

        private static SkillEffect CreateSkillEffect(Materials m)
        {
            var root = new GameObject("Sakura Frost Burst");
            var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ring.name = "Petal Ice Ring";
            ring.transform.SetParent(root.transform);
            ring.transform.localScale = new Vector3(1.2f, 0.04f, 1.2f);
            ring.GetComponent<Renderer>().sharedMaterial = m.Skill;
            ring.SetActive(false);
            return root.AddComponent<SkillEffect>();
        }

        private static GameHud CreateHud()
        {
            var canvasGo = new GameObject("HUD");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGo.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasGo.AddComponent<GraphicRaycaster>();
            var hud = canvasGo.AddComponent<GameHud>();

            var player = CreateSlider(canvasGo.transform, "Player HP", new Vector2(22f, -22f), new Color(0.55f, 0.9f, 1f));
            var enemy = CreateSlider(canvasGo.transform, "Enemy HP", new Vector2(22f, -54f), new Color(1f, 0.55f, 0.72f));
            var message = CreateText(canvasGo.transform, "Message", new Vector2(22f, -88f));
            SetPrivate(hud, "playerHp", player);
            SetPrivate(hud, "enemyHp", enemy);
            SetPrivate(hud, "message", message);
            return hud;
        }

        private static Slider CreateSlider(Transform parent, string name, Vector2 anchored, Color fillColor)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.sizeDelta = new Vector2(280f, 18f);
            rect.anchoredPosition = anchored;
            var slider = go.AddComponent<Slider>();
            slider.minValue = 0f;
            slider.maxValue = 100f;
            slider.value = 100f;

            var background = new GameObject("Background").AddComponent<Image>();
            background.transform.SetParent(go.transform);
            background.color = new Color(0.05f, 0.07f, 0.13f, 0.82f);
            Stretch(background.rectTransform);
            var fill = new GameObject("Fill").AddComponent<Image>();
            fill.transform.SetParent(go.transform);
            fill.color = fillColor;
            Stretch(fill.rectTransform);
            slider.fillRect = fill.rectTransform;
            return slider;
        }

        private static Text CreateText(Transform parent, string name, Vector2 anchored)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.sizeDelta = new Vector2(560f, 26f);
            rect.anchoredPosition = anchored;
            var text = go.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.color = Color.white;
            text.fontSize = 16;
            text.text = "Defeat the academy shade.";
            return text;
        }

        private static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        private static void CreateSakuraTree(Vector3 position, Materials m)
        {
            var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            trunk.name = "Sakura Tree Trunk";
            trunk.transform.position = position + new Vector3(0f, 0.9f, 0f);
            trunk.transform.localScale = new Vector3(0.32f, 0.9f, 0.32f);
            trunk.GetComponent<Renderer>().sharedMaterial = m.Wood;
            var crown = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            crown.name = "Sakura Blossom Crown";
            crown.transform.position = position + new Vector3(0f, 2.2f, 0f);
            crown.transform.localScale = new Vector3(2.2f, 1.35f, 2.2f);
            crown.GetComponent<Renderer>().sharedMaterial = m.Sakura;
        }

        private static void CreateGate(Vector3 position, Materials m)
        {
            for (var i = -1; i <= 1; i += 2)
            {
                var post = GameObject.CreatePrimitive(PrimitiveType.Cube);
                post.name = "Academy Gate Post";
                post.transform.position = position + new Vector3(i * 1.6f, 1.2f, 0f);
                post.transform.localScale = new Vector3(0.28f, 2.4f, 0.28f);
                post.GetComponent<Renderer>().sharedMaterial = m.Navy;
            }
            var beam = GameObject.CreatePrimitive(PrimitiveType.Cube);
            beam.name = "Academy Gate Beam";
            beam.transform.position = position + new Vector3(0f, 2.4f, 0f);
            beam.transform.localScale = new Vector3(4.1f, 0.26f, 0.38f);
            beam.GetComponent<Renderer>().sharedMaterial = m.Navy;
        }

        private static void CreateBench(Vector3 position, Materials m)
        {
            var seat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            seat.name = "Sakura Bench";
            seat.transform.position = position + new Vector3(0f, 0.55f, 0f);
            seat.transform.localScale = new Vector3(2.4f, 0.22f, 0.55f);
            seat.GetComponent<Renderer>().sharedMaterial = m.Wood;
        }

        private static void CreateLantern(Vector3 position, Materials m)
        {
            var pole = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pole.name = "Pink Lantern Pole";
            pole.transform.position = position + new Vector3(0f, 0.9f, 0f);
            pole.transform.localScale = new Vector3(0.08f, 0.9f, 0.08f);
            pole.GetComponent<Renderer>().sharedMaterial = m.Navy;
            var lamp = GameObject.CreatePrimitive(PrimitiveType.Cube);
            lamp.name = "Pink Lantern";
            lamp.transform.position = position + new Vector3(0f, 1.85f, 0f);
            lamp.transform.localScale = new Vector3(0.52f, 0.62f, 0.52f);
            lamp.GetComponent<Renderer>().sharedMaterial = m.Sakura;
        }

        private static void CreateNoticeBoard(Vector3 position, Materials m)
        {
            var board = GameObject.CreatePrimitive(PrimitiveType.Cube);
            board.name = "Academy Notice Board";
            board.transform.position = position + new Vector3(0f, 1.1f, 0f);
            board.transform.localScale = new Vector3(1.9f, 1.1f, 0.16f);
            board.GetComponent<Renderer>().sharedMaterial = m.Navy;
        }

        private static void CreateFountain(Vector3 position, Materials m)
        {
            var basin = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            basin.name = "Sakura Fountain Basin";
            basin.transform.position = position + new Vector3(0f, 0.18f, 0f);
            basin.transform.localScale = new Vector3(1.4f, 0.18f, 1.4f);
            basin.GetComponent<Renderer>().sharedMaterial = m.StoneLight;
            var water = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            water.name = "Ice Blue Fountain Water";
            water.transform.position = position + new Vector3(0f, 0.38f, 0f);
            water.transform.localScale = new Vector3(1.12f, 0.04f, 1.12f);
            water.GetComponent<Renderer>().sharedMaterial = m.Ice;
        }

        private static void SetPrivate(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName, System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
            field.SetValue(target, value);
        }

        private sealed class Materials
        {
            public Material Stone;
            public Material StoneLight;
            public Material Sakura;
            public Material Navy;
            public Material Wood;
            public Material Ice;
            public Material Heroine;
            public Material Enemy;
            public Material Skill;

            public void Create()
            {
                Stone = Mat("Stone Lavender", new Color(0.62f, 0.62f, 0.72f));
                StoneLight = Mat("Stone Highlight", new Color(0.78f, 0.76f, 0.84f));
                Sakura = Mat("Sakura Pink", new Color(1f, 0.58f, 0.76f));
                Navy = Mat("Academy Navy", new Color(0.08f, 0.11f, 0.22f));
                Wood = Mat("Warm Wood", new Color(0.42f, 0.24f, 0.15f));
                Ice = Mat("Ice Blue", new Color(0.55f, 0.88f, 1f));
                Heroine = Mat("Aiyuki Uniform Proxy", new Color(0.72f, 0.84f, 1f));
                Enemy = Mat("Academy Shade Material", new Color(0.32f, 0.12f, 0.22f));
                Skill = Mat("Sakura Frost Skill", new Color(0.85f, 0.94f, 1f));
            }

            private static Material Mat(string name, Color color)
            {
                var mat = new Material(Shader.Find("Standard"));
                mat.name = name;
                mat.color = color;
                return mat;
            }
        }
    }
}
```

- [ ] **Step 2: Generate the scene**

Run:

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.0.32f1\Editor\Unity.exe" `
  -batchmode `
  -projectPath "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG" `
  -executeMethod FusionRPG.Editor.FusionRPGSceneBuilder.BuildPrototypeScene `
  -quit `
  -logFile "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG\scene-builder.log"
```

Expected: `Assets/FusionRPG/Scenes/SakuraAcademyPrototype.unity` exists, no compiler errors.

## Task 8: Unity Build Script

**Files:**
- Create: `IntegratedApps/FusionRPG/Assets/FusionRPG/Editor/FusionRPGBuild.cs`
- Create output: `IntegratedApps/FusionRPG/Build/FusionRPG.exe`

- [ ] **Step 1: Implement build script**

Create `FusionRPGBuild.cs`:

```csharp
using System.IO;
using UnityEditor;

namespace FusionRPG.Editor
{
    public static class FusionRPGBuild
    {
        public static void BuildWindows()
        {
            FusionRPGSceneBuilder.BuildPrototypeScene();
            var output = "Build/FusionRPG.exe";
            Directory.CreateDirectory(Path.GetDirectoryName(output));
            var report = BuildPipeline.BuildPlayer(
                new[] { "Assets/FusionRPG/Scenes/SakuraAcademyPrototype.unity" },
                output,
                BuildTarget.StandaloneWindows64,
                BuildOptions.None);

            if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                throw new System.Exception("FusionRPG build failed: " + report.summary.result);
            }
        }
    }
}
```

- [ ] **Step 2: Run Unity build**

Run:

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.0.32f1\Editor\Unity.exe" `
  -batchmode `
  -projectPath "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG" `
  -executeMethod FusionRPG.Editor.FusionRPGBuild.BuildWindows `
  -quit `
  -logFile "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG\build.log"
```

Expected: `IntegratedApps/FusionRPG/Build/FusionRPG.exe` exists.

## Task 9: Fusion OS Game Room Integration

**Files:**
- Modify: `Form1.cs`
- Modify: `Frontend/src/data/fusionApps.ts`

- [ ] **Step 1: Add launcher method in Form1**

In `Form1.cs`, add this method near the existing integrated app launch methods:

```csharp
private void LaunchFusionRPG()
{
    string appRoot = FindProjectDirectory(Path.Combine("IntegratedApps", "FusionRPG"));
    string exePath = appRoot == null ? null : Path.Combine(appRoot, "Build", "FusionRPG.exe");
    if (exePath == null || !File.Exists(exePath))
    {
        string message = "Fusion RPG build was not found. Build the Unity project first:\r\nIntegratedApps\\FusionRPG\\Build\\FusionRPG.exe";
        ShowToast("Fusion RPG build missing", Color.FromArgb(195, 92, 255));
        PostAppLaunchStatus("game", "error", "Fusion RPG build missing");
        OpenSystemWindow("Fusion RPG Missing Build", message, Color.FromArgb(195, 92, 255), "game");
        return;
    }

    try
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = exePath,
            WorkingDirectory = Path.GetDirectoryName(exePath),
            UseShellExecute = true
        };
        Process process = Process.Start(startInfo);
        if (process != null)
        {
            OpenExternalProcessWindow("Fusion RPG", process, Color.FromArgb(195, 92, 255), exePath);
            TrackExternalAppProcess("game", "Fusion RPG", process, Color.FromArgb(195, 92, 255), exePath);
        }
    }
    catch (Exception ex)
    {
        ShowToast("Fusion RPG launch failed", Color.FromArgb(195, 92, 255));
        PostAppLaunchStatus("game", "error", "Fusion RPG launch failed");
        OpenSystemWindow("Fusion RPG Launch Error", ex.Message, Color.FromArgb(195, 92, 255), "game");
    }
}
```

- [ ] **Step 2: Route Game Room icon to Unity**

Change the Game Room icon registration in `BuildDesktopIcons` from:

```csharp
AddDesktopIcon(L("GameRoom"), "GAME", L("GameRoomDesc"), accent2);
```

to:

```csharp
AddDesktopIcon(L("GameRoom"), "GAME", L("GameRoomDesc"), accent2, LaunchFusionRPG);
```

- [ ] **Step 3: Route WebView launch messages**

Inside `CarouselWebView_WebMessageReceived`, in the `launch_app` branch, add:

```csharp
else if (lower.Contains("\"game\"") || lower.Contains("\"gameroom\"")) LaunchFusionRPG();
```

Place it next to the other app launch checks.

- [ ] **Step 4: Route HeroStage node**

Inside `HeroStage_NodeClicked`, add:

```csharp
if (e.NodeKey == "game")
{
    LaunchFusionRPG();
    return;
}
```

- [ ] **Step 5: Update frontend app copy**

In `Frontend/src/data/fusionApps.ts`, update the `game` app entry:

```ts
{
  id: 'game',
  title: '遊戲室',
  subtitle: 'Fusion RPG',
  description: '啟動 Sakura Academy Action Slice，Unity 製作的小型 3D 動作 RPG 原型。',
  color: '#c35cff',
  status: 'Unity',
  tags: ['games', 'unity', '3d', 'rpg']
}
```

- [ ] **Step 6: Build frontend and WinForms**

Run:

```powershell
Push-Location Frontend
npx tsc --noEmit
npm run build
Pop-Location
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" WindowsFormsApp1.csproj /p:Configuration=Debug /p:Platform=AnyCPU /m
```

Expected: TypeScript, frontend build, and MSBuild all pass.

## Task 10: End-To-End Verification

**Files:**
- No new files unless logs are needed.

- [ ] **Step 1: Run Unity EditMode tests**

Run:

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.0.32f1\Editor\Unity.exe" `
  -batchmode `
  -projectPath "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG" `
  -runTests `
  -testPlatform EditMode `
  -testResults "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG\TestResults.xml"
```

Do not add `-quit` to Unity Test Framework runs; on Unity 6000.0.32f1, the test runner owns editor shutdown and writes the XML report before exiting.

Expected: XML report contains passing Health and Combat tests.

- [ ] **Step 2: Build Unity executable**

Run the Task 8 Unity build command.

Expected: `IntegratedApps/FusionRPG/Build/FusionRPG.exe` exists.

- [ ] **Step 3: Launch executable smoke test**

Run:

```powershell
$p = Start-Process -FilePath "C:\Users\User\OneDrive\桌面\視窗\視窗期末\WindowsFormsApp1\WindowsFormsApp1\IntegratedApps\FusionRPG\Build\FusionRPG.exe" -PassThru
Start-Sleep -Seconds 5
if ($p.HasExited) { throw "FusionRPG exited during smoke test" }
$p.CloseMainWindow() | Out-Null
Start-Sleep -Seconds 2
if (-not $p.HasExited) { $p.Kill() }
```

Expected: process stays open for at least 5 seconds.

- [ ] **Step 4: Verify Fusion OS build**

Run MSBuild command from Task 9.

Expected: `bin/Debug/WindowsFormsApp1.exe` builds successfully.

- [ ] **Step 5: Manual Game Room check**

Open `bin/Debug/WindowsFormsApp1.exe`, click Game Room, confirm:

- Fusion RPG launches.
- Game Room shows running indicator while Unity is open.
- Running indicator clears after Unity closes.
- If Unity build is deleted or renamed, Fusion OS shows a missing-build window instead of crashing.

## Self-Review

- Spec coverage: Unity project, playable scene, character and scene direction, combat, HUD, build, and Fusion OS integration are covered by Tasks 1-10.
- Placeholder scan: the plan contains no deferred markers or unspecified implementation steps.
- Type consistency: all scripts use the `FusionRPG` namespace, editor scripts use `FusionRPG.Editor`, and Fusion OS uses app id `game`.
