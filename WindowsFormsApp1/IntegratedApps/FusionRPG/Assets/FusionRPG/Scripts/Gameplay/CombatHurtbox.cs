using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(Collider))]
    public sealed class CombatHurtbox : MonoBehaviour
    {
        private void Reset()
        {
            var attachedCollider = GetComponent<Collider>();
            if (attachedCollider != null)
            {
                attachedCollider.isTrigger = true;
            }
        }
    }
}
