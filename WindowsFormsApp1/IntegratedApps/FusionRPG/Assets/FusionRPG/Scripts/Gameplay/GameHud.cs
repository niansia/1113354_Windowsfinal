using UnityEngine;
using UnityEngine.UI;

namespace FusionRPG
{
    public sealed class GameHud : MonoBehaviour
    {
        [SerializeField] private Health playerHealth;
        [SerializeField] private PlayerCombat playerCombat;
        [SerializeField] private TargetSelectionController targetSelection;
        [SerializeField] private Health bossHealth;
        [SerializeField] private BossController bossController;
        [SerializeField] private Image playerHpFill;
        [SerializeField] private Image selectedHpFill;
        [SerializeField] private Image bossHpFill;
        [SerializeField] private Image quickSkillFill;
        [SerializeField] private Image areaSkillFill;
        [SerializeField] private Image dashSkillFill;
        [SerializeField] private Image ultimateFill;
        [SerializeField] private Text objectiveText;
        [SerializeField] private Text targetText;
        [SerializeField] private Text bossText;
        [SerializeField] private Text completionText;
        [SerializeField] private GameObject selectedPanel;
        [SerializeField] private GameObject bossPanel;

        private void Update()
        {
            SetFill(playerHpFill, playerHealth != null ? playerHealth.Ratio : 0f);
            SetFill(quickSkillFill, playerCombat != null ? 1f - playerCombat.QuickCooldownRemaining01 : 0f);
            SetFill(areaSkillFill, playerCombat != null ? 1f - playerCombat.AreaCooldownRemaining01 : 0f);
            SetFill(dashSkillFill, playerCombat != null ? 1f - playerCombat.DashCooldownRemaining01 : 0f);
            SetFill(ultimateFill, playerCombat != null ? playerCombat.UltimateNormalized : 0f);

            var selected = targetSelection != null ? targetSelection.SelectedHealth : null;
            if (selectedPanel != null)
            {
                selectedPanel.SetActive(selected != null && !selected.IsDead);
            }
            SetFill(selectedHpFill, selected != null ? selected.Ratio : 0f);
            if (targetText != null)
            {
                targetText.text = selected != null ? targetSelection.SelectedDisplayName : string.Empty;
            }

            if (bossPanel != null && bossPanel.activeSelf && bossHealth != null)
            {
                SetFill(bossHpFill, bossHealth.Ratio);
                if (bossText != null && bossController != null)
                {
                    bossText.text = "緋櫻獸　" + PhaseName(bossController.CurrentPhase);
                }
            }
        }

        public void Bind(
            Health nextPlayerHealth,
            PlayerCombat nextCombat,
            TargetSelectionController nextTargetSelection,
            Health nextBossHealth)
        {
            playerHealth = nextPlayerHealth;
            playerCombat = nextCombat;
            targetSelection = nextTargetSelection;
            bossHealth = nextBossHealth;
            bossController = bossHealth != null ? bossHealth.GetComponent<BossController>() : null;
            SetCompleted(false);
            SetBossVisible(false);
        }

        public void ConfigureCombatHud(
            Image nextPlayerHpFill,
            Image nextSelectedHpFill,
            Image nextBossHpFill,
            Image nextQuickSkillFill,
            Image nextAreaSkillFill,
            Image nextDashSkillFill,
            Image nextUltimateFill,
            Text nextObjectiveText,
            Text nextTargetText,
            Text nextBossText,
            Text nextCompletionText,
            GameObject nextSelectedPanel,
            GameObject nextBossPanel)
        {
            playerHpFill = nextPlayerHpFill;
            selectedHpFill = nextSelectedHpFill;
            bossHpFill = nextBossHpFill;
            quickSkillFill = nextQuickSkillFill;
            areaSkillFill = nextAreaSkillFill;
            dashSkillFill = nextDashSkillFill;
            ultimateFill = nextUltimateFill;
            objectiveText = nextObjectiveText;
            targetText = nextTargetText;
            bossText = nextBossText;
            completionText = nextCompletionText;
            selectedPanel = nextSelectedPanel;
            bossPanel = nextBossPanel;
        }

        public void SetObjective(string text)
        {
            if (objectiveText != null)
            {
                objectiveText.text = text;
            }
        }

        public void SetBossVisible(bool visible)
        {
            if (bossPanel != null)
            {
                bossPanel.SetActive(visible);
            }
        }

        public void SetCompleted(bool completed)
        {
            if (completionText != null)
            {
                completionText.gameObject.SetActive(completed);
                completionText.text = completed ? "討伐完成" : string.Empty;
            }
            if (completed)
            {
                SetObjective("緋櫻庭院已恢復平靜");
            }
        }

        private static void SetFill(Image image, float value)
        {
            if (image != null)
            {
                image.fillAmount = Mathf.Clamp01(value);
            }
        }

        private static string PhaseName(BossPhase phase)
        {
            switch (phase)
            {
                case BossPhase.PhaseThree:
                    return "狂櫻形態";
                case BossPhase.PhaseTwo:
                    return "盛放形態";
                default:
                    return "初綻形態";
            }
        }
    }
}
