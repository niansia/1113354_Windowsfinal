using UnityEngine;
using UnityEngine.UI;

namespace FusionRPG
{
    public sealed class GameHud : MonoBehaviour
    {
        [SerializeField] private Health playerHealth;
        [SerializeField] private Health enemyHealth;
        [SerializeField] private PlayerCombat playerCombat;
        [SerializeField] private Image playerHpFill;
        [SerializeField] private Image enemyHpFill;
        [SerializeField] private Image skillFill;
        [SerializeField] private Text objectiveText;
        [SerializeField] private Text completionText;

        private bool completed;

        private void Update()
        {
            if (playerHealth != null && playerHpFill != null)
            {
                playerHpFill.fillAmount = Ratio(playerHealth.Current, playerHealth.Max);
            }

            if (enemyHealth != null && enemyHpFill != null)
            {
                enemyHpFill.fillAmount = Ratio(enemyHealth.Current, enemyHealth.Max);
            }

            if (playerCombat != null && skillFill != null)
            {
                skillFill.fillAmount = 1f - playerCombat.SkillCooldownRemaining01;
            }
        }

        public void Bind(Health nextPlayerHealth, Health nextEnemyHealth, PlayerCombat nextCombat)
        {
            playerHealth = nextPlayerHealth;
            enemyHealth = nextEnemyHealth;
            playerCombat = nextCombat;
            if (objectiveText != null)
            {
                objectiveText.text = "Defeat the training sentinel";
            }
            SetCompleted(false);
        }

        public void ConfigureForPrototype(
            Image nextPlayerHpFill,
            Image nextEnemyHpFill,
            Image nextSkillFill,
            Text nextObjectiveText,
            Text nextCompletionText)
        {
            playerHpFill = nextPlayerHpFill;
            enemyHpFill = nextEnemyHpFill;
            skillFill = nextSkillFill;
            objectiveText = nextObjectiveText;
            completionText = nextCompletionText;
        }

        public void SetCompleted(bool value)
        {
            completed = value;
            if (completionText != null)
            {
                completionText.gameObject.SetActive(completed);
                completionText.text = completed ? "Prototype Clear" : string.Empty;
            }
        }

        private static float Ratio(int current, int max)
        {
            return max <= 0 ? 0f : Mathf.Clamp01((float)current / max);
        }
    }
}
