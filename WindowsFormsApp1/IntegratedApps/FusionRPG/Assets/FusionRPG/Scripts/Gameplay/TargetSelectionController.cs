using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace FusionRPG
{
    public sealed class TargetSelectionController : MonoBehaviour
    {
        [SerializeField] private Camera selectionCamera;
        [SerializeField] private float clickDragThreshold = 9f;
        [SerializeField] private float maximumSelectionDistance = 80f;

        private readonly CombatTargeting targeting = new CombatTargeting();
        private CombatTarget selectedTarget;
        private Vector2 mouseDownPosition;

        public event Action<Health, string> TargetChanged;
        public Health SelectedHealth => targeting.Selected;
        public string SelectedDisplayName => selectedTarget != null ? selectedTarget.DisplayName : string.Empty;

        private void Awake()
        {
            if (selectionCamera == null)
            {
                selectionCamera = Camera.main;
            }
        }

        private void Update()
        {
            if (Input.GetMouseButtonDown(0))
            {
                mouseDownPosition = Input.mousePosition;
            }

            if (Input.GetMouseButtonUp(0) &&
                Vector2.Distance(mouseDownPosition, Input.mousePosition) <= clickDragThreshold &&
                (EventSystem.current == null || !EventSystem.current.IsPointerOverGameObject()))
            {
                SelectUnderCursor(Input.mousePosition);
            }

            var previous = targeting.Selected;
            targeting.Refresh();
            if (previous != null && targeting.Selected == null)
            {
                SetSelectedTarget(null);
            }
        }

        public void Configure(Camera nextCamera)
        {
            selectionCamera = nextCamera;
        }

        public bool SelectUnderCursor(Vector2 screenPosition)
        {
            if (selectionCamera == null)
            {
                return false;
            }

            var ray = selectionCamera.ScreenPointToRay(screenPosition);
            var hits = Physics.RaycastAll(ray, maximumSelectionDistance, ~0, QueryTriggerInteraction.Collide);
            Array.Sort(hits, (left, right) => left.distance.CompareTo(right.distance));
            foreach (var hit in hits)
            {
                var target = hit.collider.GetComponentInParent<CombatTarget>();
                if (target == null || target.Health == null || target.Health.IsDead)
                {
                    continue;
                }

                SetSelectedTarget(target);
                return true;
            }

            SetSelectedTarget(null);
            return false;
        }

        public void ClearSelection()
        {
            SetSelectedTarget(null);
        }

        private void SetSelectedTarget(CombatTarget nextTarget)
        {
            if (selectedTarget == nextTarget)
            {
                return;
            }

            if (selectedTarget != null)
            {
                selectedTarget.SetSelected(false);
            }

            selectedTarget = nextTarget;
            targeting.SetTarget(nextTarget != null ? nextTarget.Health : null);
            if (selectedTarget != null)
            {
                selectedTarget.SetSelected(true);
            }

            TargetChanged?.Invoke(SelectedHealth, SelectedDisplayName);
        }
    }
}
