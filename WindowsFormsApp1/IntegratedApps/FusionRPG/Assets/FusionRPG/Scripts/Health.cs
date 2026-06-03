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
