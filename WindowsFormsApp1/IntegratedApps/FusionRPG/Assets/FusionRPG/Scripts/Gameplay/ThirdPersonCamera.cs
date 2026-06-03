using UnityEngine;

namespace FusionRPG
{
    public sealed class ThirdPersonCamera : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 targetOffset = new Vector3(0f, 1.45f, 0f);
        [SerializeField] private float distance = 6.5f;
        [SerializeField] private float minPitch = -12f;
        [SerializeField] private float maxPitch = 58f;
        [SerializeField] private float mouseSensitivity = 160f;
        [SerializeField] private float followSharpness = 11f;

        private float yaw;
        private float pitch = 22f;

        public void SetTarget(Transform nextTarget)
        {
            target = nextTarget;
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

            if (Input.GetMouseButton(1))
            {
                yaw += Input.GetAxis("Mouse X") * mouseSensitivity * Time.deltaTime;
                pitch -= Input.GetAxis("Mouse Y") * mouseSensitivity * Time.deltaTime;
                pitch = Mathf.Clamp(pitch, minPitch, maxPitch);
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
