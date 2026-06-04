using System.Collections.Generic;
using UnityEngine;

namespace FusionRPG
{
    public sealed class PlayerModelAnimator : MonoBehaviour
    {
        [SerializeField] private PlayerController controller;
        [SerializeField] private Transform visualRoot;
        [SerializeField] private float strideLength = 0.09f;
        [SerializeField] private float footLift = 0.045f;
        [SerializeField] private float bobHeight = 0.035f;
        [SerializeField] private float leanDegrees = 4.5f;
        [SerializeField] private float strideFrequency = 7.5f;

        private readonly List<MeshRuntimeCopy> runtimeMeshes = new List<MeshRuntimeCopy>();
        private Vector3 baseLocalPosition;
        private Quaternion baseLocalRotation;
        private float phase;

        public void Configure(PlayerController nextController, Transform nextVisualRoot)
        {
            controller = nextController;
            visualRoot = nextVisualRoot;
        }

        private void Awake()
        {
            if (controller == null)
            {
                controller = GetComponentInParent<PlayerController>();
            }

            if (visualRoot == null)
            {
                visualRoot = transform;
            }

            baseLocalPosition = visualRoot.localPosition;
            baseLocalRotation = visualRoot.localRotation;

            foreach (var meshFilter in visualRoot.GetComponentsInChildren<MeshFilter>())
            {
                if (meshFilter.sharedMesh == null || !meshFilter.sharedMesh.isReadable)
                {
                    continue;
                }

                var runtimeMesh = Instantiate(meshFilter.sharedMesh);
                runtimeMesh.name = meshFilter.sharedMesh.name + " Runtime Walk";
                meshFilter.sharedMesh = runtimeMesh;
                runtimeMeshes.Add(new MeshRuntimeCopy(runtimeMesh));
            }
        }

        private void LateUpdate()
        {
            var moveAmount = controller != null ? controller.NormalizedMoveAmount : 0f;
            phase += Time.deltaTime * strideFrequency * Mathf.Lerp(0.35f, 1.35f, moveAmount);

            var bob = Mathf.Sin(phase * 2f) * bobHeight * moveAmount;
            visualRoot.localPosition = baseLocalPosition + Vector3.up * bob;
            visualRoot.localRotation = baseLocalRotation * Quaternion.Euler(
                Mathf.Sin(phase) * leanDegrees * 0.35f * moveAmount,
                0f,
                -Mathf.Sin(phase) * leanDegrees * moveAmount);

            foreach (var runtimeMesh in runtimeMeshes)
            {
                runtimeMesh.ApplyWalkPose(phase, moveAmount, strideLength, footLift);
            }
        }

        private void OnDestroy()
        {
            foreach (var runtimeMesh in runtimeMeshes)
            {
                if (runtimeMesh.Mesh != null)
                {
                    Destroy(runtimeMesh.Mesh);
                }
            }

            runtimeMeshes.Clear();
        }

        private sealed class MeshRuntimeCopy
        {
            private readonly Vector3[] baseVertices;
            private readonly Vector3[] posedVertices;
            private readonly Bounds bounds;

            public Mesh Mesh { get; }

            public MeshRuntimeCopy(Mesh mesh)
            {
                Mesh = mesh;
                baseVertices = mesh.vertices;
                posedVertices = new Vector3[baseVertices.Length];
                bounds = mesh.bounds;
            }

            public void ApplyWalkPose(float phase, float moveAmount, float strideLength, float footLift)
            {
                if (moveAmount <= 0.002f)
                {
                    Mesh.vertices = baseVertices;
                    Mesh.RecalculateBounds();
                    return;
                }

                var height = Mathf.Max(0.001f, bounds.size.y);
                var halfWidth = Mathf.Max(0.001f, bounds.extents.x);
                for (var i = 0; i < baseVertices.Length; i++)
                {
                    var vertex = baseVertices[i];
                    var height01 = Mathf.Clamp01((vertex.y - bounds.min.y) / height);
                    var lowerBody = 1f - Mathf.SmoothStep(0.18f, 0.48f, height01);
                    if (lowerBody <= 0.001f)
                    {
                        posedVertices[i] = vertex;
                        continue;
                    }

                    var side = vertex.x >= bounds.center.x ? 1f : -1f;
                    var sideWeight = Mathf.Clamp01(Mathf.Abs(vertex.x - bounds.center.x) / halfWidth);
                    var footWeight = lowerBody * Mathf.Lerp(0.35f, 1f, sideWeight);
                    var sidePhase = phase + (side > 0f ? 0f : Mathf.PI);
                    var swing = Mathf.Sin(sidePhase) * strideLength * moveAmount * footWeight;
                    var lift = Mathf.Max(0f, Mathf.Sin(sidePhase)) * footLift * moveAmount * footWeight;

                    vertex.z += swing;
                    vertex.y += lift;
                    vertex.x += Mathf.Sin(sidePhase) * 0.018f * moveAmount * lowerBody;
                    posedVertices[i] = vertex;
                }

                Mesh.vertices = posedVertices;
                Mesh.RecalculateBounds();
            }
        }
    }
}
