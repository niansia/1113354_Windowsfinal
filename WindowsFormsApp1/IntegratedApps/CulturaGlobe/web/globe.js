// Realistic 3D Earth + culture markers, with hand-written mouse orbit/zoom.
import * as THREE from './vendor/three.module.js';

const EARTH_R = 2.0;
const TEX = './textures/';

function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export function createGlobe(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x05070f, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  let camDist = 6.2;
  camera.position.set(0, 0, camDist);

  const world = new THREE.Group();        // earth + markers rotate together
  scene.add(world);

  // sun mostly toward the camera so the hemisphere you look at is lit (friendlier
  // first impression), with a gentle terminator drifting near the limb.
  const sunDir = new THREE.Vector3(0.4, 0.26, 0.88).normalize();

  // ---- earth ----
  const loader = new THREE.TextureLoader();
  const dayMap = loader.load(TEX + 'earth_atmos_2048.jpg');
  const nightMap = loader.load(TEX + 'earth_lights_2048.png');
  const specMap = loader.load(TEX + 'earth_specular_2048.jpg');
  [dayMap, nightMap, specMap].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; });

  const earthMat = new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: dayMap }, nightMap: { value: nightMap }, specMap: { value: specMap },
      uSunDir: { value: sunDir }
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vWp;
      void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal);
        vec4 wp=modelMatrix*vec4(position,1.0); vWp=wp.xyz;
        gl_Position=projectionMatrix*viewMatrix*wp; }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D dayMap, nightMap, specMap; uniform vec3 uSunDir;
      varying vec2 vUv; varying vec3 vN; varying vec3 vWp;
      void main(){
        vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWp);
        float sun=dot(N, uSunDir);
        float lit=smoothstep(-0.22, 0.30, sun);
        vec3 day=texture2D(dayMap,vUv).rgb;
        vec3 night=texture2D(nightMap,vUv).rgb;
        float ocean=texture2D(specMap,vUv).r;
        vec3 col=mix(night*1.5, day, lit);
        col += vec3(0.018,0.03,0.06)*(1.0-lit);   // faint night earth so the globe reads
        // sun glint on water
        vec3 R=reflect(-uSunDir,N);
        float gl=pow(max(dot(R,V),0.0), 30.0)*ocean*lit;
        col+=vec3(0.7,0.85,1.0)*gl*0.5;
        // subtle terminator warmth
        float term=exp(-pow((sun)*4.0,2.0))*lit;
        col+=vec3(0.9,0.5,0.25)*term*0.12;
        // fresnel rim
        float fres=pow(1.0-max(dot(N,V),0.0),3.0);
        col+=vec3(0.25,0.5,1.0)*fres*0.6;
        gl_FragColor=vec4(col,1.0);
      }
    `
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 64, 48), earthMat);
  world.add(earth);

  // ---- atmosphere glow ----
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSunDir: { value: sunDir } },
    vertexShader: `varying vec3 vN; varying vec3 vWp;
      void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.0); vWp=wp.xyz;
        gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `precision highp float; varying vec3 vN; varying vec3 vWp; uniform vec3 uSunDir;
      void main(){ vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWp);
        float i=pow(0.72-dot(N,V),3.0); i=clamp(i,0.0,1.0);
        float lit=smoothstep(-0.3,0.4,dot(N,uSunDir));
        vec3 c=mix(vec3(0.15,0.35,0.9), vec3(0.4,0.7,1.0), lit);
        gl_FragColor=vec4(c, i*0.62); }`
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.13, 48, 24), atmoMat);
  world.add(atmo);

  // ---- starfield ----
  const starGeo = new THREE.BufferGeometry();
  const starN = 1600; const sp = new Float32Array(starN * 3); const sc = new Float32Array(starN);
  for (let i = 0; i < starN; i += 1) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(40 + Math.random() * 30);
    sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z; sc[i] = Math.random();
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  starGeo.setAttribute('aB', new THREE.BufferAttribute(sc, 1));
  const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPr: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float aB; varying float vB; uniform float uPr;
      void main(){ vB=aB; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=(0.7+aB*1.8)*uPr; }`,
    fragmentShader: `precision highp float; varying float vB;
      void main(){ vec2 d=gl_PointCoord-0.5; if(dot(d,d)>0.25) discard;
        gl_FragColor=vec4(vec3(0.8,0.88,1.0),(0.3+vB*0.7)); }`
  }));
  scene.add(stars);

  // ---- markers (one Points cloud) ----
  let markerData = [];
  const markerGeo = new THREE.BufferGeometry();
  const markerMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, depthTest: true,
    uniforms: { uTime: { value: 0 }, uHover: { value: -1 }, uSel: { value: -1 }, uPr: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute vec3 aColor; attribute float aId; attribute float aSize;
      uniform float uTime, uHover, uSel, uPr; varying vec3 vColor; varying float vHi;
      void main(){
        vColor=aColor;
        float hov = (abs(aId-uHover)<0.5)?1.0:0.0;
        float sel = (abs(aId-uSel)<0.5)?1.0:0.0;
        vHi = max(hov, sel);
        float pulse = 1.0 + 0.12*sin(uTime*3.0 + aId*1.3) + sel*0.25*sin(uTime*6.0);
        vec4 mv = modelViewMatrix*vec4(position,1.0);
        gl_Position = projectionMatrix*mv;
        float s = aSize*(1.0+hov*1.3+sel*1.0)*pulse;
        // clamp hard: unclamped point sizes around a sphere balloon to ~1000px and
        // melt weak GPUs (overdraw TDR). Keep markers a few px, bounded.
        gl_PointSize = clamp(s*uPr*(4.5/max(1.0,-mv.z)), 2.0, 34.0);
      }
    `,
    fragmentShader: `
      precision highp float; varying vec3 vColor; varying float vHi;
      void main(){
        vec2 d=gl_PointCoord-0.5; float r=length(d);
        if(r>0.5) discard;
        float core=smoothstep(0.5,0.0,r);
        float ring=smoothstep(0.5,0.42,r)*0.6;
        float a=(core*0.85+ring)*(0.7+vHi*0.6);
        gl_FragColor=vec4(vColor*(0.7+core*0.8+vHi*0.6), a);
      }
    `
  });
  const markers = new THREE.Points(markerGeo, markerMat);
  markers.frustumCulled = false;
  world.add(markers);

  function setMarkers(list) {
    markerData = list;
    const n = list.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const ids = new Float32Array(n);
    const siz = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const m = list[i];
      const v = latLonToVec3(m.lat, m.lon, EARTH_R * (1.01 + (m.tier || 0) * 0.012));
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      col[i * 3] = m.color[0]; col[i * 3 + 1] = m.color[1]; col[i * 3 + 2] = m.color[2];
      ids[i] = i; siz[i] = m.size || 7;
    }
    markerGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    markerGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    markerGeo.setAttribute('aId', new THREE.BufferAttribute(ids, 1));
    markerGeo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    markerGeo.attributes.position.needsUpdate = true;
  }

  // ---- interaction: hand-written orbit + zoom + inertia + autospin ----
  let yaw = -1.6, pitch = -0.12, vYaw = 0, vPitch = 0;   // open on Africa/Europe/Asia (land + markers)
  let dragging = false, lastX = 0, lastY = 0, moved = 0, lastInteract = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function setPointer(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  function pickMarker() {
    if (!markerGeo.attributes.position) return -1;
    raycaster.setFromCamera(ndc, camera);
    raycaster.params.Points.threshold = 0.06 * (camDist / 6.2);
    const hits = raycaster.intersectObject(markers);
    if (!hits.length) return -1;
    // nearest to camera among close hits
    return hits[0].index;
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; lastInteract = performance.now();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    setPointer(e);
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      vYaw = dx * 0.005; vPitch = dy * 0.005;
      yaw += vYaw; pitch += vPitch;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
      lastInteract = performance.now();
    } else {
      const idx = pickMarker();
      markerMat.uniforms.uHover.value = idx;
      canvas.style.cursor = idx >= 0 ? 'pointer' : 'grab';
      if (opts.onHover) opts.onHover(idx >= 0 ? markerData[idx] : null, e.clientX, e.clientY);
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (moved < 6) {
      setPointer(e);
      const idx = pickMarker();
      if (idx >= 0) {
        markerMat.uniforms.uSel.value = idx;
        if (opts.onPick) opts.onPick(markerData[idx]);
        focusOn(markerData[idx]);
      } else if (opts.onPick) {
        opts.onPick(null);
      }
    }
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camDist = Math.max(3.0, Math.min(11, camDist + e.deltaY * 0.0016));
    lastInteract = performance.now();
  }, { passive: false });

  let focusTarget = null, focusT = 0;
  function focusOn(marker) {
    const v = latLonToVec3(marker.lat, marker.lon, 1).normalize();
    // desired yaw/pitch so the marker faces the camera (+z)
    const ty = Math.atan2(v.x, v.z);
    const tp = Math.asin(Math.max(-1, Math.min(1, v.y)));
    focusTarget = { yaw: -ty, pitch: -tp }; focusT = 0;
    lastInteract = performance.now();
  }

  // ---- render loop ----
  let raf = 0; let lastW = 0, lastH = 0; const clock = new THREE.Clock();
  function resize() {
    // the canvas is fixed full-screen, so the viewport is the source of truth
    const w = window.innerWidth || canvas.clientWidth || 1280;
    const h = window.innerHeight || canvas.clientHeight || 720;
    lastW = w; lastH = h;
    const pr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
    markerMat.uniforms.uPr.value = pr; stars.material.uniforms.uPr.value = pr;
  }
  function frame() {
    raf = requestAnimationFrame(frame);
    if (window.innerWidth !== lastW || window.innerHeight !== lastH) resize();
    const dt = clock.getDelta(); const t = clock.elapsedTime;
    markerMat.uniforms.uTime.value = t;
    const idle = performance.now() - lastInteract > 3500;
    if (focusTarget) {
      focusT = Math.min(1, focusT + dt * 1.6);
      const e = 1 - Math.pow(1 - focusT, 3);
      yaw += (focusTarget.yaw - yaw) * 0.12;
      pitch += (focusTarget.pitch - pitch) * 0.12;
      if (focusT >= 1 && Math.abs(focusTarget.yaw - yaw) < 0.002) focusTarget = null;
    } else if (!dragging) {
      // inertia
      yaw += vYaw; pitch += vPitch;
      vYaw *= 0.94; vPitch *= 0.94;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
      if (idle) yaw += 0.02 * dt; // gentle autospin
    }
    world.rotation.y = yaw; world.rotation.x = pitch;
    camera.position.z += (camDist - camera.position.z) * 0.12;
    stars.rotation.y += dt * 0.003;
    renderer.render(scene, camera);
  }
  resize(); frame();

  return {
    setMarkers,
    focus: focusOn,
    clearSelection: () => { markerMat.uniforms.uSel.value = -1; },
    resize,
    dispose: () => { cancelAnimationFrame(raf); renderer.dispose(); }
  };
}
