using UnityEngine;

namespace FusionRPG
{
    public sealed class PrototypeGameManager : MonoBehaviour
    {
        [SerializeField] private Health playerHealth;
        [SerializeField] private Health enemyHealth;
        [SerializeField] private PlayerCombat playerCombat;
        [SerializeField] private GameHud hud;

        private void Awake()
        {
            if (playerHealth == null)
            {
                var player = GameObject.Find("Sakuraba Sakura");
                if (player != null) playerHealth = player.GetComponent<Health>();
            }

            if (enemyHealth == null)
            {
                var enemy = GameObject.Find("Training Sentinel");
                if (enemy != null) enemyHealth = enemy.GetComponent<Health>();
            }

            if (playerCombat == null && playerHealth != null)
            {
                playerCombat = playerHealth.GetComponent<PlayerCombat>();
            }

            if (hud == null)
            {
                hud = FindFirstObjectByType<GameHud>();
            }

            if (hud != null)
            {
                hud.Bind(playerHealth, enemyHealth, playerCombat);
            }

            if (enemyHealth != null)
            {
                enemyHealth.Died += HandleEnemyDefeated;
            }
        }

        private void HandleEnemyDefeated()
        {
            if (hud != null)
            {
                hud.SetCompleted(true);
            }
        }

        private void OnDestroy()
        {
            if (enemyHealth != null)
            {
                enemyHealth.Died -= HandleEnemyDefeated;
            }
        }

        public void ConfigureForPrototype(Health nextPlayerHealth, Health nextEnemyHealth, PlayerCombat nextCombat, GameHud nextHud)
        {
            playerHealth = nextPlayerHealth;
            enemyHealth = nextEnemyHealth;
            playerCombat = nextCombat;
            hud = nextHud;
        }
    }
}
