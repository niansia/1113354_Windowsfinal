using System;
using UnityEngine;

namespace FusionRPG
{
    public sealed class Health : MonoBehaviour
    {
        [SerializeField] private int maxHealth = 100;
        [SerializeField] private int current;
        [SerializeField, Range(0f, 1f)] private float incomingDamageMultiplier = 1f;
        private bool died;

        public event Action Died;
        public event Action<int> Damaged;
        public int Current => current;
        public int Max => maxHealth;
        public bool IsDead => died;
        public float Ratio => maxHealth <= 0 ? 0f : (float)current / maxHealth;

        private void Awake()
        {
            current = Mathf.Clamp(current <= 0 ? maxHealth : current, 0, maxHealth);
            died = current <= 0;
        }

        public void ApplyDamage(int amount)
        {
            if (died || amount <= 0) return;
            amount = Mathf.RoundToInt(amount * incomingDamageMultiplier);
            if (amount <= 0) return;
            var previous = current;
            current = Mathf.Max(0, current - amount);
            var applied = previous - current;
            if (applied > 0)
            {
                Damaged?.Invoke(applied);
            }
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
            ConfigureMaxHealth(value);
        }

        public void ConfigureMaxHealth(int value)
        {
            maxHealth = Mathf.Max(1, value);
            current = maxHealth;
            died = false;
            incomingDamageMultiplier = 1f;
        }

        public void SetIncomingDamageMultiplier(float multiplier)
        {
            incomingDamageMultiplier = Mathf.Clamp01(multiplier);
        }
    }
}
