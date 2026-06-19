using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(Health))]
    public sealed class CombatTarget : MonoBehaviour
    {
        [SerializeField] private string displayName = "敵人";
        [SerializeField] private GameObject selectionMarker;

        private Health health;

        public string DisplayName => displayName;
        public Health Health => health != null ? health : health = GetComponent<Health>();

        private void Awake()
        {
            health = GetComponent<Health>();
            SetSelected(false);
        }

        public void Configure(string nextDisplayName, GameObject nextSelectionMarker)
        {
            displayName = string.IsNullOrWhiteSpace(nextDisplayName) ? "敵人" : nextDisplayName;
            selectionMarker = nextSelectionMarker;
            SetSelected(false);
        }

        public void SetSelected(bool selected)
        {
            if (selectionMarker != null)
            {
                selectionMarker.SetActive(selected && Health != null && !Health.IsDead);
            }
        }
    }
}
