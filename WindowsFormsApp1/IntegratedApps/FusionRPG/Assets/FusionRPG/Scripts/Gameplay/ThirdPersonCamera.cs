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

        private float yaw;
        private float pitch = 25f;

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
            var desiredPosition = focus - rotation * Vector3.forward * distance;
            var t = 1f - Mathf.Exp(-followSharpness * Time.deltaTime);
            transform.position = Vector3.Lerp(transform.position, desiredPosition, t);
            transform.rotation = rotation;
        }
    }
}
