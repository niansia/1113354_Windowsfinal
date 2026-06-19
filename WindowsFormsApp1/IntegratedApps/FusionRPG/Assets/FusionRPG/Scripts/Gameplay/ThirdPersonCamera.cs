using UnityEngine;

namespace FusionRPG
{
    public sealed class ThirdPersonCamera : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 targetOffset = new Vector3(0f, 1.05f, 0f);
        [SerializeField] private float distance = 7.4f;
        [SerializeField] private float minDistance = 4.4f;
        [SerializeField] private float maxDistance = 12f;
        [SerializeField] private float minPitch = -8f;
        [SerializeField] private float maxPitch = 72f;
        [SerializeField] private float mouseSensitivity = 160f;
        [SerializeField] private float zoomSensitivity = 3.8f;
        [SerializeField] private float followSharpness = 11f;
        [SerializeField] private float collisionRadius = 0.28f;
        [SerializeField] private float collisionPadding = 0.12f;
        [SerializeField] private LayerMask obstructionLayers = ~0;

        private float yaw;
        private float pitch = 25f;
        private float currentDistance;
        private static readonly RaycastHit[] ObstructionHits = new RaycastHit[64];

        public void SetTarget(Transform nextTarget)
        {
            target = nextTarget;
        }

        public void ConfigureForPrototype(Vector3 nextTargetOffset, float nextDistance, float nextPitch)
        {
            targetOffset = nextTargetOffset;
            distance = Mathf.Clamp(nextDistance, minDistance, maxDistance);
            pitch = Mathf.Clamp(nextPitch, minPitch, maxPitch);
        }

        private void Start()
        {
            yaw = transform.eulerAngles.y;
            currentDistance = distance;
        }

        private void LateUpdate()
        {
            if (target == null)
            {
                return;
            }

            if (Input.GetMouseButton(0) || Input.GetMouseButton(1) || Input.GetMouseButton(2))
            {
                yaw += Input.GetAxis("Mouse X") * mouseSensitivity * Time.deltaTime;
                pitch -= Input.GetAxis("Mouse Y") * mouseSensitivity * Time.deltaTime;
                pitch = Mathf.Clamp(pitch, minPitch, maxPitch);
            }

            var scroll = Input.GetAxis("Mouse ScrollWheel");
            if (Mathf.Abs(scroll) > 0.001f)
            {
                distance = Mathf.Clamp(distance - scroll * zoomSensitivity, minDistance, maxDistance);
            }

            var rotation = Quaternion.Euler(pitch, yaw, 0f);
            var focus = target.position + targetOffset;
            var backward = -(rotation * Vector3.forward);
            var unobstructedDistance = ResolveObstructedDistance(
                focus,
                backward,
                distance,
                collisionRadius,
                collisionPadding,
                target,
                obstructionLayers);
            if (currentDistance <= 0f || unobstructedDistance < currentDistance)
            {
                currentDistance = unobstructedDistance;
            }
            else
            {
                var t = 1f - Mathf.Exp(-followSharpness * Time.deltaTime);
                currentDistance = Mathf.Lerp(currentDistance, unobstructedDistance, t);
            }

            transform.position = focus + backward * currentDistance;
            transform.rotation = rotation;
        }

        public static float ResolveObstructedDistance(
            Vector3 focus,
            Vector3 backwardDirection,
            float desiredDistance,
            float radius,
            float padding,
            Transform ignoredRoot,
            LayerMask obstructionMask)
        {
            if (desiredDistance <= 0f || backwardDirection.sqrMagnitude <= 0.0001f)
            {
                return Mathf.Max(0.35f, desiredDistance);
            }

            var direction = backwardDirection.normalized;
            var hitCount = Physics.SphereCastNonAlloc(
                focus,
                Mathf.Max(0.05f, radius),
                direction,
                ObstructionHits,
                desiredDistance,
                obstructionMask,
                QueryTriggerInteraction.Ignore);
            var nearest = desiredDistance;
            for (var i = 0; i < hitCount; i++)
            {
                var hit = ObstructionHits[i];
                if (hit.collider == null)
                {
                    continue;
                }
                if (ignoredRoot != null &&
                    (hit.collider.transform == ignoredRoot || hit.collider.transform.IsChildOf(ignoredRoot)))
                {
                    continue;
                }

                nearest = Mathf.Min(nearest, hit.distance - Mathf.Max(0f, padding));
            }

            return Mathf.Clamp(nearest, 0.35f, desiredDistance);
        }
    }
}
