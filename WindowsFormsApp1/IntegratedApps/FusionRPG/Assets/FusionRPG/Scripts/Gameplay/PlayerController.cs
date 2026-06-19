using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        [SerializeField] private Camera orbitCamera;
        [SerializeField] private float moveSpeed = 5.2f;
        [SerializeField] private float sprintSpeed = 6.8f;
        [SerializeField] private float rotationSpeed = 720f;
        [SerializeField] private float jumpHeight = 1.35f;
        [SerializeField] private float gravity = -24f;
        [SerializeField] private float dashSpeed = 13f;
        [SerializeField] private float dashDuration = 0.18f;
        [SerializeField] private float dashCooldown = 0.55f;
        [SerializeField] private float maxMoveStepDistance = 0.08f;

        private CharacterController controller;
        private Vector3 planarVelocity;
        private Vector3 dashDirection;
        private float verticalVelocity;
        private float dashTimer;
        private float dashCooldownTimer;

        public bool IsDashing => dashTimer > 0f;
        public bool IsGrounded => controller != null && controller.isGrounded;
        public Vector3 MoveDirection => planarVelocity.sqrMagnitude <= 0.001f ? transform.forward : planarVelocity.normalized;
        public float CurrentPlanarSpeed => planarVelocity.magnitude;
        public float NormalizedMoveAmount => Mathf.Clamp01(CurrentPlanarSpeed / sprintSpeed);
        public float VerticalSpeed => verticalVelocity;

        public void SetCamera(Camera nextCamera)
        {
            orbitCamera = nextCamera;
        }

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            if (orbitCamera == null)
            {
                orbitCamera = Camera.main;
            }
        }

        private void Update()
        {
            var input = CombatInputBindings.ReadMovement();
            var jump = Input.GetKeyDown(KeyCode.Space);
            var dash = Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift);
            Move(input, jump, dash, Time.deltaTime);
        }

        public void Move(Vector2 input, bool jumpPressed, bool dashPressed, float deltaTime)
        {
            if (deltaTime <= 0f)
            {
                return;
            }

            dashCooldownTimer = Mathf.Max(0f, dashCooldownTimer - deltaTime);

            var desired = CameraRelativeInput(input);
            if (desired.sqrMagnitude > 1f)
            {
                desired.Normalize();
            }

            if (dashPressed && dashCooldownTimer <= 0f && desired.sqrMagnitude > 0.01f)
            {
                dashTimer = dashDuration;
                dashCooldownTimer = dashCooldown;
                dashDirection = desired.normalized;
            }

            if (controller.isGrounded && verticalVelocity < 0f)
            {
                verticalVelocity = -2f;
            }

            if (jumpPressed && controller.isGrounded && dashTimer <= 0f)
            {
                verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);
            }

            verticalVelocity += gravity * deltaTime;

            Vector3 horizontal;
            if (dashTimer > 0f)
            {
                horizontal = dashDirection * dashSpeed;
                dashTimer = Mathf.Max(0f, dashTimer - deltaTime);
            }
            else
            {
                horizontal = desired * moveSpeed;
            }

            planarVelocity = horizontal;
            if (desired.sqrMagnitude > 0.01f)
            {
                var targetRotation = Quaternion.LookRotation(desired, Vector3.up);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, targetRotation, rotationSpeed * deltaTime);
            }

            var motion = horizontal;
            motion.y = verticalVelocity;
            MoveWithCollisionSubsteps(motion * deltaTime);
        }

        public void MoveExternal(Vector3 worldMotion)
        {
            MoveWithCollisionSubsteps(worldMotion);
        }

        public void BeginPlunge(float downwardSpeed)
        {
            verticalVelocity = -Mathf.Max(2f, downwardSpeed);
        }

        private void MoveWithCollisionSubsteps(Vector3 motion)
        {
            var distance = motion.magnitude;
            if (distance <= Mathf.Epsilon)
            {
                return;
            }

            var stepDistance = Mathf.Max(0.02f, maxMoveStepDistance);
            var steps = Mathf.Clamp(Mathf.CeilToInt(distance / stepDistance), 1, 32);
            var step = motion / steps;
            for (var i = 0; i < steps; i++)
            {
                controller.Move(step);
            }
        }

        private Vector3 CameraRelativeInput(Vector2 input)
        {
            if (input.sqrMagnitude <= 0.0001f)
            {
                return Vector3.zero;
            }

            var forward = orbitCamera != null ? orbitCamera.transform.forward : Vector3.forward;
            var right = orbitCamera != null ? orbitCamera.transform.right : Vector3.right;
            forward.y = 0f;
            right.y = 0f;
            forward.Normalize();
            right.Normalize();
            return forward * input.y + right * input.x;
        }
    }
}
