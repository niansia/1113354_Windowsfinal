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
  let camDist = 7.6;            // a little farther out so the rim labels have room to breathe
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
        // fully + EVENLY lit globe: no day/night, and no dark-vs-bright divide either.
        // A gamma lift pulls the shadows (forests, savanna, deep ocean) up close to the
        // deserts, so every region reads bright. Tune via the exponent below.
        vec3 day=texture2D(dayMap,vUv).rgb;
        float ocean=texture2D(specMap,vUv).r;
        vec3 col=pow(day, vec3(0.55))*1.12;       // lift darks toward the brights
        col+=vec3(0.05,0.09,0.14)*ocean;          // gentle blue on water
        col+=0.13;                                // global floor -> nothing reads near-black
        // very subtle sun glint on water (kept low so there is no hot/dark patch)
        vec3 R=reflect(-uSunDir,N);
        float gl=pow(max(dot(R,V),0.0), 28.0)*ocean;
        col+=vec3(0.6,0.75,0.95)*gl*0.18;
        // soft atmospheric rim
        float fres=pow(1.0-max(dot(N,V),0.0),3.0);
        col+=vec3(0.25,0.5,1.0)*fres*0.45;
        gl_FragColor=vec4(min(col, vec3(1.08)),1.0);
      }
    `
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 64, 48), earthMat);
  world.add(earth);

  // ---- graticule: a faint lat/lon grid that tiles the globe into cells (the
  // "data-planet" look). depthTest hides the lines on the far hemisphere. ----
  (function buildGraticule() {
    const pts = [];
    const R = EARTH_R * 1.003;
    const seg = 4;                       // sampling step along each line (degrees)
    for (let lat = -75; lat <= 75; lat += 15) {          // latitude circles
      for (let lon = -180; lon < 180; lon += seg) {
        pts.push(latLonToVec3(lat, lon, R), latLonToVec3(lat, lon + seg, R));
      }
    }
    for (let lon = -180; lon < 180; lon += 15) {         // meridians
      for (let lat = -88; lat < 88; lat += seg) {
        pts.push(latLonToVec3(lat, lon, R), latLonToVec3(lat + seg, lon, R));
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const grid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: 0x9fd8ff, transparent: true, opacity: 0.10, depthWrite: false
    }));
    world.add(grid);
  }());

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
        vec3 c=vec3(0.32,0.6,1.0);   // uniform sky-blue halo (globe is fully lit)
        gl_FragColor=vec4(c, i*0.6); }`
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

  // ---- image callouts: a user picture is a SMALL framed photo-tile pinned at its
  // lat/lon. It stays small by default so hundreds can coexist without covering the
  // map; on hover (or when selected) it grows and a leader line tethers it to its exact
  // point -- the "what is this" callout. Tiles are pickable: clicking opens the same
  // card as the dot. The name shows in the hover tooltip + the card. ----
  const calloutGroup = new THREE.Group();
  world.add(calloutGroup);
  let callouts = [];              // { sprite, dir, marker, aspect, color, emph }
  let calloutSprites = [];        // sprites only, for raycasting
  let hoverCallout = null, selCallout = null;
  let selectionActive = false;     // while a marker is open, freeze the globe (no autospin drift)
  const BASE_H = 0.15, BIG_H = 0.42, BASE_LIFT = 1.045, BIG_LIFT = 1.235;

  // one reusable leader line, shown only for whichever callout is emphasised
  const leadGeo = new THREE.BufferGeometry();
  leadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const leadLine = new THREE.Line(leadGeo, new THREE.LineBasicMaterial({
    color: 0xbcd8ff, transparent: true, opacity: 0.85, depthWrite: false
  }));
  leadLine.renderOrder = 7; leadLine.visible = false; leadLine.frustumCulled = false;
  calloutGroup.add(leadLine);

  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function makeTileTexture(img, color) {
    const aspect = Math.max(0.7, Math.min(1.5, img.width / img.height));
    const H = 132, W = Math.round(H * aspect);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    roundRect(g, 2, 2, W - 4, H - 4, 12); g.fillStyle = 'rgba(10,14,24,0.9)'; g.fill();
    const pad = 5, iw = W - pad * 2, ih = H - pad * 2;          // cover-fit the photo
    const s = Math.max(iw / img.width, ih / img.height);
    const dw = img.width * s, dh = img.height * s;
    g.save(); roundRect(g, pad, pad, iw, ih, 9); g.clip();
    g.drawImage(img, pad + (iw - dw) / 2, pad + (ih - dh) / 2, dw, dh); g.restore();
    roundRect(g, 2, 2, W - 4, H - 4, 12); g.lineWidth = 3; g.strokeStyle = color || '#9fd8ff'; g.stroke();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { tex, aspect };
  }
  function clearCallouts() {
    callouts = []; calloutSprites = []; hoverCallout = null; selCallout = null;
    leadLine.visible = false;
    for (let i = calloutGroup.children.length - 1; i >= 0; i -= 1) {
      const o = calloutGroup.children[i];
      if (o === leadLine) continue;
      calloutGroup.remove(o);
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    }
  }
  function setImageCallouts(list) {
    clearCallouts();
    list.forEach((item) => {
      const dir = latLonToVec3(item.lat, item.lon, 1).normalize();
      const color = item.color || '#9fd8ff';
      const img = new Image();
      img.onload = () => {
        const { tex, aspect } = makeTileTexture(img, color);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex, transparent: true, depthTest: true, depthWrite: false
        }));
        sp.scale.set(BASE_H * aspect, BASE_H, 1);
        sp.center.set(0.5, 0.0);                 // bottom-anchored -> "stands" on its point
        sp.position.copy(dir).multiplyScalar(EARTH_R * BASE_LIFT);
        sp.renderOrder = 6;
        const co = { sprite: sp, dir, marker: item.marker, aspect, color, emph: 0 };
        sp.userData.callout = co;
        callouts.push(co); calloutSprites.push(sp);
        calloutGroup.add(sp);
      };
      img.onerror = () => { /* image missing/failed -> the dot still marks it */ };
      img.src = item.url;
    });
  }

  // per-frame: ease each callout toward its emphasised/at-rest size and draw the leader
  // line for the most-emphasised one. Only the moving ones are touched.
  const _leadA = new THREE.Vector3(), _leadB = new THREE.Vector3();
  function updateCallouts() {
    let active = null;
    for (let i = 0; i < callouts.length; i += 1) {
      const co = callouts[i];
      const target = (co === selCallout || co === hoverCallout) ? 1 : 0;
      if (Math.abs(co.emph - target) > 0.001) co.emph += (target - co.emph) * 0.2; else co.emph = target;
      const h = BASE_H + (BIG_H - BASE_H) * co.emph;
      const lift = BASE_LIFT + (BIG_LIFT - BASE_LIFT) * co.emph;
      co.sprite.scale.set(h * co.aspect, h, 1);
      co.sprite.position.copy(co.dir).multiplyScalar(EARTH_R * lift);
      if (co.emph > 0.05 && (!active || co.emph > active.emph)) active = co;
    }
    if (active) {
      _leadA.copy(active.dir).multiplyScalar(EARTH_R * 1.012);
      _leadB.copy(active.sprite.position);
      const p = leadGeo.attributes.position;
      p.setXYZ(0, _leadA.x, _leadA.y, _leadA.z); p.setXYZ(1, _leadB.x, _leadB.y, _leadB.z);
      p.needsUpdate = true;
      leadLine.material.color.set(active.color);
      leadLine.visible = true;
    } else {
      leadLine.visible = false;
    }
  }

  // a back-hemisphere callout is hidden by depthTest; skip it for picking too.
  const _tmp = new THREE.Vector3(), _wp = new THREE.Vector3();
  function occludedByEarth(worldPos) {
    const cam = camera.position;
    const dir = _tmp.copy(worldPos).sub(cam);
    const dist = dir.length(); if (dist < 1e-4) return false; dir.multiplyScalar(1 / dist);
    const tc = -cam.dot(dir);                 // sphere centered at origin
    if (tc < 0 || tc > dist) return false;
    const cx = cam.x + dir.x * tc, cy = cam.y + dir.y * tc, cz = cam.z + dir.z * tc;
    return Math.sqrt(cx * cx + cy * cy + cz * cz) < EARTH_R * 0.998;
  }
  function pickCallout() {
    if (!calloutSprites.length) return null;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(calloutSprites, false);
    for (let i = 0; i < hits.length; i += 1) {
      const sp = hits[i].object;
      if (!occludedByEarth(sp.getWorldPosition(_wp))) return sp.userData.callout || null;
    }
    return null;
  }

  // ---- label halo: thin leader lines fan from the front-facing markers out to their
  // names stacked along the globe's left/right rim -- the British-Museum "data planet"
  // look. SVG overlay above the globe but under the UI panels (z-index 3). ----
  const SVGNS = 'http://www.w3.org/2000/svg';
  const HALO_MAX = 46;
  const halo = document.createElementNS(SVGNS, 'svg');
  Object.assign(halo.style, { position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3, overflow: 'visible' });
  document.body.appendChild(halo);
  const haloPool = [];
  for (let i = 0; i < HALO_MAX; i += 1) {
    const ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('stroke', 'rgba(190,214,255,0.34)'); ln.setAttribute('stroke-width', '1');
    const tx = document.createElementNS(SVGNS, 'text');
    tx.setAttribute('font-size', '12.5'); tx.setAttribute('fill', 'rgba(228,238,255,0.92)');
    tx.setAttribute('font-family', '"Microsoft JhengHei","PingFang TC","Noto Sans CJK TC",sans-serif');
    tx.setAttribute('dominant-baseline', 'middle');
    tx.setAttribute('stroke', 'rgba(4,8,16,0.7)'); tx.setAttribute('stroke-width', '3'); tx.setAttribute('paint-order', 'stroke');
    halo.appendChild(ln); halo.appendChild(tx);
    haloPool.push({ ln, tx });
  }
  const _hw = new THREE.Vector3(), _ho = new THREE.Vector3(), _hr = new THREE.Vector3();
  let haloT = 0;
  function hideHalo() { for (let i = 0; i < HALO_MAX; i += 1) { haloPool[i].ln.style.display = 'none'; haloPool[i].tx.style.display = 'none'; } }
  function updateHalo(now) {
    if (now - haloT < 90) return; haloT = now;          // ~11 fps is plenty
    if (!opts.labelOf || !markerData.length) { hideHalo(); return; }
    const W = window.innerWidth, H = window.innerHeight;
    _ho.set(0, 0, 0).project(camera);
    const cx = (_ho.x * 0.5 + 0.5) * W, cy = (-_ho.y * 0.5 + 0.5) * H;
    _hr.set(EARTH_R, 0, 0).project(camera);
    const rim = Math.hypot((_hr.x * 0.5 + 0.5) * W - cx, (-_hr.y * 0.5 + 0.5) * H - cy);
    // one marker per angular sector (front hemisphere only) -> a spread, uncluttered set
    const SECT = 44; const buckets = new Array(SECT).fill(null);
    for (let i = 0; i < markerData.length; i += 1) {
      const m = markerData[i];
      _hw.copy(latLonToVec3(m.lat, m.lon, EARTH_R * 1.02)).applyMatrix4(world.matrixWorld);
      if (occludedByEarth(_hw)) continue;
      const p = _hw.clone().project(camera);
      const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H;
      const dx = sx - cx, dy = sy - cy; const rad = Math.hypot(dx, dy);
      const b = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * SECT) % SECT;
      const prom = (m.isHero ? 1e4 : 0) + rad;       // prefer country heroes + outer markers
      if (!buckets[b] || prom > buckets[b].prom) buckets[b] = { m, sx, sy, prom, right: dx >= 0 };
    }
    const chosen = buckets.filter(Boolean);
    const GAP = 17;
    const place = (arr, side) => {
      arr.sort((a, b) => a.sy - b.sy);
      const lx = side > 0 ? Math.min(cx + rim + 14, W - 8) : Math.max(cx - rim - 14, 8);
      let prevY = -1e9; const out = [];
      for (const c of arr) { const ly = Math.max(c.sy, prevY + GAP); prevY = ly; if (ly < H - 6) out.push({ ...c, lx, ly }); }
      return out;
    };
    const items = [...place(chosen.filter((c) => c.right), 1), ...place(chosen.filter((c) => !c.right), -1)];
    let k = 0;
    for (const it of items) {
      if (k >= HALO_MAX) break;
      const s = haloPool[k++];
      s.ln.setAttribute('x1', it.sx.toFixed(1)); s.ln.setAttribute('y1', it.sy.toFixed(1));
      s.ln.setAttribute('x2', it.lx.toFixed(1)); s.ln.setAttribute('y2', it.ly.toFixed(1));
      s.ln.style.display = '';
      s.tx.setAttribute('x', (it.lx + (it.right ? 5 : -5)).toFixed(1));
      s.tx.setAttribute('y', it.ly.toFixed(1));
      s.tx.setAttribute('text-anchor', it.right ? 'start' : 'end');
      s.tx.textContent = opts.labelOf(it.m);
      s.tx.style.display = '';
    }
    for (; k < HALO_MAX; k += 1) { haloPool[k].ln.style.display = 'none'; haloPool[k].tx.style.display = 'none'; }
  }

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
    hoverCallout = null;                       // don't keep a tile enlarged while dragging
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
      const co = pickCallout();                 // thumbnails sit above the dots -> check first
      hoverCallout = co;
      const idx = co ? -1 : pickMarker();
      markerMat.uniforms.uHover.value = idx;
      canvas.style.cursor = (co || idx >= 0) ? 'pointer' : 'grab';
      if (opts.onHover) opts.onHover(co ? co.marker : (idx >= 0 ? markerData[idx] : null), e.clientX, e.clientY);
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (moved < 6) {
      setPointer(e);
      const co = pickCallout();                 // clicking a thumbnail opens its card too
      const idx = co ? -1 : pickMarker();
      if (co) {
        selCallout = co; selectionActive = true;
        const di = markerData.indexOf(co.marker);
        if (di >= 0) markerMat.uniforms.uSel.value = di;
        if (opts.onPick) opts.onPick(co.marker);
        focusOn(co.marker);
      } else if (idx >= 0) {
        selectionActive = true;
        markerMat.uniforms.uSel.value = idx;
        if (opts.onPick) opts.onPick(markerData[idx]);
        focusOn(markerData[idx]);
      } else if (opts.onPick) {
        selectionActive = false;
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
    vYaw = 0; vPitch = 0;                 // kill drift so the view settles and stays put
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
      if (idle && !selectionActive) yaw += 0.02 * dt; // gentle autospin (paused while a marker is open)
    }
    world.rotation.y = yaw; world.rotation.x = pitch;
    camera.position.z += (camDist - camera.position.z) * 0.12;
    stars.rotation.y += dt * 0.003;
    updateCallouts();
    renderer.render(scene, camera);
    updateHalo(performance.now());        // after render -> world/camera matrices are current
  }
  resize(); frame();

  return {
    setMarkers,
    setImageCallouts,
    focus: focusOn,
    clearSelection: () => { markerMat.uniforms.uSel.value = -1; selCallout = null; selectionActive = false; },
    resize,
    dispose: () => { cancelAnimationFrame(raf); renderer.dispose(); }
  };
}
