using System.Collections.Generic;
using UnityEngine;

namespace FusionRPG
{
    public sealed class PrototypeGameManager : MonoBehaviour
    {
        [SerializeField] private Health playerHealth;
        [SerializeField] private PlayerCombat playerCombat;
        [SerializeField] private TargetSelectionController targetSelection;
        [SerializeField] private GameHud hud;
        [SerializeField] private GameObject[] waveOne;
        [SerializeField] private GameObject[] waveTwo;
        [SerializeField] private GameObject boss;

        private readonly List<Health> subscribedEnemies = new List<Health>();
        private EncounterProgress progress;
        private Health bossHealth;

        public int CurrentWave => progress != null ? progress.CurrentWaveNumber : 0;
        public bool IsBossActive => progress != null && progress.IsBossUnlocked;

        private void Awake()
        {
            progress = new EncounterProgress(new[]
            {
                Mathf.Max(1, waveOne != null ? waveOne.Length : 0),
                Mathf.Max(1, waveTwo != null ? waveTwo.Length : 0)
            });

            SetGroupActive(waveOne, false);
            SetGroupActive(waveTwo, false);
            if (boss != null)
            {
                boss.SetActive(false);
                bossHealth = boss.GetComponent<Health>();
            }

            SubscribeGroup(waveOne);
            SubscribeGroup(waveTwo);
            if (bossHealth != null)
            {
                bossHealth.Died += HandleBossDefeated;
            }

            if (hud != null)
            {
                hud.Bind(playerHealth, playerCombat, targetSelection, bossHealth);
            }

            progress.Start();
            SetGroupActive(waveOne, true);
            hud?.SetObjective("第一波：擊敗緋櫻幼獸");
        }

        public void ConfigureEncounter(
            Health nextPlayerHealth,
            PlayerCombat nextPlayerCombat,
            TargetSelectionController nextTargetSelection,
            GameHud nextHud,
            GameObject[] nextWaveOne,
            GameObject[] nextWaveTwo,
            GameObject nextBoss)
        {
            playerHealth = nextPlayerHealth;
            playerCombat = nextPlayerCombat;
            targetSelection = nextTargetSelection;
            hud = nextHud;
            waveOne = nextWaveOne;
            waveTwo = nextWaveTwo;
            boss = nextBoss;
        }

        private void SubscribeGroup(GameObject[] group)
        {
            if (group == null)
            {
                return;
            }

            foreach (var enemy in group)
            {
                var health = enemy != null ? enemy.GetComponent<Health>() : null;
                if (health == null)
                {
                    continue;
                }

                health.Died += HandleLesserEnemyDefeated;
                subscribedEnemies.Add(health);
            }
        }

        private void HandleLesserEnemyDefeated()
        {
            targetSelection?.ClearSelection();
            switch (progress.NotifyEnemyDefeated())
            {
                case EncounterProgressChange.WaveAdvanced:
                    SetGroupActive(waveTwo, true);
                    hud?.SetObjective("第二波：清除強化緋櫻獸群");
                    break;
                case EncounterProgressChange.BossUnlocked:
                    if (boss != null)
                    {
                        boss.SetActive(true);
                    }
                    hud?.SetObjective("最終戰：擊敗緋櫻獸");
                    hud?.SetBossVisible(true);
                    break;
            }
        }

        private void HandleBossDefeated()
        {
            targetSelection?.ClearSelection();
            hud?.SetCompleted(true);
        }

        private static void SetGroupActive(GameObject[] group, bool active)
        {
            if (group == null)
            {
                return;
            }

            foreach (var item in group)
            {
                if (item != null)
                {
                    item.SetActive(active);
                }
            }
        }

        private void OnDestroy()
        {
            foreach (var health in subscribedEnemies)
            {
                if (health != null)
                {
                    health.Died -= HandleLesserEnemyDefeated;
                }
            }

            if (bossHealth != null)
            {
                bossHealth.Died -= HandleBossDefeated;
            }
        }
    }
}
