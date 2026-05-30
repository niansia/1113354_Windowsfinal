import * as React from 'react';
// @ts-ignore
import * as THREE from './Assets/vendor/three/three.module.js';
import { createHtmlTextureCanvas } from './htmlTextureFactory';

/**
 * HtmlTextureViewport.tsx
 * 真正 Three.js 實作的 WebGL 3D Viewport
 */

export const HtmlTextureViewport: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rendererRef = React.useRef<any>(null);
  const cubeRef = React.useRef<any>(null);
  const mouse = React.useRef({ x: 0, y: 0 });
  const isDragging = React.useRef(false);
  const previousMousePosition = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x22d3ee, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // 3. Cube with HTML Textures
    const geometry = new THREE.BoxGeometry(2.5, 2.5, 2.5);
    const labels = ['INDEX', 'PROFILE', 'SYSTEM', 'CONFIG', 'STATS', 'DEBUG'];
    const materials = labels.map(label => {
      const canvas = createHtmlTextureCanvas(label);
      const texture = new THREE.CanvasTexture(canvas);
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.3, metalness: 0.1 });
    });

    const cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
    cubeRef.current = cube;

    // 4. Floating Panels
    for (let i = 0; i < 4; i++) {
        const pGeo = new THREE.PlaneGeometry(1.2, 0.8);
        const pMat = new THREE.MeshStandardMaterial({ 
            map: new THREE.CanvasTexture(createHtmlTextureCanvas(`NODE_${i}`)), 
            transparent: true, 
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const panel = new THREE.Mesh(pGeo, pMat);
        panel.position.set(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 4
        );
        panel.rotation.y = Math.random() * Math.PI;
        scene.add(panel);
    }

    // 5. Interaction
    const handleMouseMove = (e: MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // Parallax effect for camera
        mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (isDragging.current && cubeRef.current) {
            const deltaMove = {
                x: e.offsetX - previousMousePosition.current.x,
                y: e.offsetY - previousMousePosition.current.y
            };

            cubeRef.current.rotation.y += deltaMove.x * 0.01;
            cubeRef.current.rotation.x += deltaMove.y * 0.01;
        }
        previousMousePosition.current = { x: e.offsetX, y: e.offsetY };
    };

    const handleMouseDown = () => { isDragging.current = true; };
    const handleMouseUp = () => { isDragging.current = false; };

    window.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // 6. Render Loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Auto rotation
      if (!isDragging.current && cubeRef.current) {
          cubeRef.current.rotation.y += 0.005;
          cubeRef.current.rotation.x += 0.002;
      }

      // Camera parallax
      camera.position.x += (mouse.current.x * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (mouse.current.y * 0.5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
          containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', height: '100%', position: 'absolute', inset: 0, 
        background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)',
        zIndex: 1
      }} 
    />
  );
};
