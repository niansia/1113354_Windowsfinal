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
  const dark = !!opts.dark;                      // birds page: night-sky atlas
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(dark ? 0x07080d : 0xf3edde, 1);   // night vs warm paper
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
      uSunDir: { value: sunDir }, uDark: { value: dark ? 1.0 : 0.0 }
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vWp;
      void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal);
        vec4 wp=modelMatrix*vec4(position,1.0); vWp=wp.xyz;
        gl_Position=projectionMatrix*viewMatrix*wp; }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D dayMap, nightMap, specMap; uniform vec3 uSunDir; uniform float uDark;
      varying vec2 vUv; varying vec3 vN; varying vec3 vWp;
      void main(){
        vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWp);
        vec3 day=texture2D(dayMap,vUv).rgb;
        float ocean=texture2D(specMap,vUv).r;
        float lum=dot(day, vec3(0.299,0.587,0.114));
        float isOcean=smoothstep(0.35,0.65,ocean);
        vec3 col;
        if(uDark>0.5){
          // NIGHT atlas: near-black ocean, warm-lit landmasses, faint city lights,
          // a dotted land texture -- the "万羽拾音" planet.
          vec3 night=texture2D(nightMap,vUv).rgb;
          vec3 oceanCol=vec3(0.04,0.05,0.072);
          // brighter, sun-lit landmasses (the map read too dark before)
          vec3 landTone=mix(vec3(0.22,0.185,0.135), vec3(0.70,0.575,0.36), smoothstep(0.06,0.55,lum));
          vec2 g=fract(vUv*vec2(480.0,240.0))-0.5;
          float dotp=smoothstep(0.34,0.16,length(g));
          vec3 landCol=mix(landTone, landTone*1.45, dotp*0.5);
          landCol*=0.7+0.78*day;                         // restore real terrain detail + lift
          col=mix(landCol, oceanCol, isOcean);
          col+=night*vec3(1.0,0.85,0.5)*0.45;            // city lights, warm
          float fres=pow(1.0-max(dot(N,V),0.0),2.5);
          col+=vec3(0.55,0.42,0.2)*fres*0.4;             // warm gold limb
        } else {
          // "paper atlas": re-ink the texture in warm paper tones.
          float stripe=smoothstep(0.36,0.5,abs(fract(vUv.y*160.0)-0.5));
          vec3 oceanCol=mix(vec3(0.955,0.935,0.875), vec3(0.80,0.765,0.685), stripe*0.5);
          vec3 landTone=mix(vec3(0.835,0.79,0.69), vec3(0.90,0.865,0.775), smoothstep(0.1,0.55,lum));
          vec2 g=fract(vUv*vec2(480.0,240.0))-0.5;
          float dotp=smoothstep(0.34,0.16,length(g));
          vec3 landCol=mix(landTone, vec3(0.52,0.475,0.385), dotp*0.38);
          col=mix(landCol, oceanCol, isOcean);
          float fres=pow(1.0-max(dot(N,V),0.0),2.0);
          col=mix(col, col*0.8, fres*0.65);
        }
        gl_FragColor=vec4(col,1.0);
      }
    `
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 64, 48), earthMat);
  world.add(earth);

  // ---- graticule: a faint lat/lon grid that tiles the globe into cells (the
  // "data-planet" look). depthTest hides the lines on the far hemisphere. ----
  // Paper (culture) page: a faint full lat/lon graticule. The birds page instead draws a
  // fine grid that covers ONLY land, one cell per bird (built by setLandGrid below once the
  // page's land mask has loaded) -- so there are no empty cells floating over the ocean.
  (function buildGraticule() {
    if (dark) return;
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
    world.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: 0x6d6354, transparent: true, opacity: 0.22, depthWrite: false
    })));
  }());

  // birds page: draw the supplied cells as bird-sized grid squares. The page hands us the
  // SAME cells the birds are placed in (centres), so every bird sits inside a box and the
  // ocean stays clean. Lines are kept faint so the planet reads calm and coherent. The big
  // static land grid is built once (setLandGrid); a tiny dynamic set of used coastal cells
  // is updated per filter (setLandGridExtra) so it doesn't rebuild the whole grid each time.
  const GRID_R = EARTH_R * 1.004;         // just above the surface, below the bird tiles
  function gridMeshFromCells(cells) {
    const pts = [];
    for (const c of cells) {
      const a = latLonToVec3(c.latLo, c.lonLo, GRID_R), b = latLonToVec3(c.latLo, c.lonHi, GRID_R);
      const d = latLonToVec3(c.latHi, c.lonHi, GRID_R), e = latLonToVec3(c.latHi, c.lonLo, GRID_R);
      pts.push(a, b, b, d, d, e, e, a);                                          // four cell edges
    }
    return new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xb89255, transparent: true, opacity: 0.14, depthWrite: false })
    );
  }
  let landGridMesh = null, extraGridMesh = null;
  function setLandGrid(cells) {
    if (landGridMesh) { world.remove(landGridMesh); landGridMesh.geometry.dispose(); landGridMesh.material.dispose(); }
    landGridMesh = gridMeshFromCells(cells);
    world.add(landGridMesh);
  }
  function setLandGridExtra(cells) {
    if (extraGridMesh) { world.remove(extraGridMesh); extraGridMesh.geometry.dispose(); extraGridMesh.material.dispose(); extraGridMesh = null; }
    if (!cells || !cells.length) return;
    extraGridMesh = gridMeshFromCells(cells);
    world.add(extraGridMesh);
  }

  // ---- soft shadow halo: on a light page an additive glow is invisible, so the
  // sphere instead casts a faint warm shadow ring that lifts it off the paper ----
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false,
    blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uDark: { value: dark ? 1.0 : 0.0 } },
    vertexShader: `varying vec3 vN; varying vec3 vWp;
      void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.0); vWp=wp.xyz;
        gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `precision highp float; varying vec3 vN; varying vec3 vWp; uniform float uDark;
      void main(){ vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWp);
        float i=pow(0.72-dot(N,V),3.0); i=clamp(i,0.0,1.0);
        if(uDark>0.5){ gl_FragColor=vec4(vec3(0.85,0.62,0.28), i*0.5); }
        else { gl_FragColor=vec4(vec3(0.45,0.40,0.31), i*0.16); } }`
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * (dark ? 1.09 : 1.06), 48, 24), atmoMat);
  world.add(atmo);

  // ---- markers (one Points cloud) ----
  let markerData = [];
  const markerGeo = new THREE.BufferGeometry();
  const markerMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,   // normal blending: ink dots on paper
    uniforms: { uTime: { value: 0 }, uHover: { value: -1 }, uSel: { value: -1 }, uPr: { value: renderer.getPixelRatio() }, uDark: { value: dark ? 1.0 : 0.0 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aId; attribute float aSize; attribute float aHide;
      uniform float uTime, uHover, uSel, uPr; varying vec3 vColor; varying float vHi; varying float vHide;
      void main(){
        vColor=aColor; vHide=aHide;
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
      precision highp float; varying vec3 vColor; varying float vHi; varying float vHide;
      uniform float uDark;
      void main(){
        if(vHide>0.5) discard;          // node already shows as a photo tile -> no dot
        vec2 d=gl_PointCoord-0.5; float r=length(d);
        if(r>0.5) discard;
        if(uDark>0.5){
          // glowing dot on the night globe
          float core=smoothstep(0.5,0.0,r);
          vec3 col=mix(vColor, vec3(1.0), 0.25+vHi*0.4);
          gl_FragColor=vec4(col, core*(0.8+vHi*0.2));
        } else {
          // solid ink dot with a thin paper-white rim so it pops off the tan globe
          float rim=smoothstep(0.5,0.40,r)-smoothstep(0.36,0.26,r);
          vec3 col=mix(vColor*(0.85+vHi*0.35), vec3(0.97,0.95,0.90), rim*0.9);
          float a=smoothstep(0.5,0.44,r)*(0.85+vHi*0.15);
          gl_FragColor=vec4(col, a);
        }
      }
    `
  });
  const markers = new THREE.Points(markerGeo, markerMat);
  markers.frustumCulled = false;
  world.add(markers);

  // ---- image tiles: each picture lies FLAT on the globe surface, snapped onto a
  // global angular grid (one tile per cell), so tiles can NEVER overlap no matter
  // how many images are supplied -- the reference "mosaic atlas" look where photos
  // tile the land side by side. Hovering or selecting a tile pops up a single
  // enlarged billboard copy with a leader line; clicking opens the same card as the
  // dot. ----
  const calloutGroup = new THREE.Group();
  world.add(calloutGroup);
  let callouts = [];              // { mesh, dir, marker, aspect, color, emph, tex }
  let tileMeshes = [];            // meshes only, for raycasting
  let hoverCallout = null, selCallout = null;
  let selectionActive = false;     // while a marker is open, freeze the globe (no autospin drift)
  const TILE_CELL = 2.6;           // grid cell (degrees); also the max flat-tile size
  const TILE_LIFT = 1.006;         // just above the graticule, hugging the surface
  const ZOOM_H = 0.46, ZOOM_LIFT = 1.21;
  const tileGeoShared = new THREE.PlaneGeometry(1, 1);

  // one reusable leader line + one reusable zoom billboard for the focused tile
  const leadGeo = new THREE.BufferGeometry();
  leadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const leadLine = new THREE.Line(leadGeo, new THREE.LineBasicMaterial({
    color: 0x55483a, transparent: true, opacity: 0.8, depthWrite: false
  }));
  leadLine.renderOrder = 7; leadLine.visible = false; leadLine.frustumCulled = false;
  calloutGroup.add(leadLine);
  const zoomSprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
  zoomSprite.renderOrder = 8; zoomSprite.visible = false; zoomSprite.center.set(0.5, 0.0);
  calloutGroup.add(zoomSprite);

  // orient a plane so it lies tangent on the sphere with "up" pointing north
  const _east = new THREE.Vector3(), _north = new THREE.Vector3(), _basis = new THREE.Matrix4();
  const _upY = new THREE.Vector3(0, 1, 0), _upX = new THREE.Vector3(1, 0, 0);
  function orientTile(mesh, dir) {
    const up = Math.abs(dir.y) > 0.99 ? _upX : _upY;
    _east.crossVectors(up, dir).normalize();
    _north.crossVectors(dir, _east).normalize();
    _basis.makeBasis(_east, _north, dir);
    mesh.quaternion.setFromRotationMatrix(_basis);
  }

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
    // a little mounted photo: warm-white mat + thin ink frame (museum style)
    roundRect(g, 2, 2, W - 4, H - 4, 7); g.fillStyle = 'rgba(250,247,238,0.97)'; g.fill();
    const pad = 6, iw = W - pad * 2, ih = H - pad * 2;          // cover-fit the photo
    const s = Math.max(iw / img.width, ih / img.height);
    const dw = img.width * s, dh = img.height * s;
    g.save(); roundRect(g, pad, pad, iw, ih, 4); g.clip();
    g.drawImage(img, pad + (iw - dw) / 2, pad + (ih - dh) / 2, dw, dh); g.restore();
    roundRect(g, 2, 2, W - 4, H - 4, 7); g.lineWidth = 2.5; g.strokeStyle = color || '#55483a'; g.stroke();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { tex, aspect };
  }
  function clearCallouts() {
    callouts = []; tileMeshes = []; hoverCallout = null; selCallout = null;
    leadLine.visible = false; zoomSprite.visible = false; zoomSprite.userData.callout = null;
    for (let i = calloutGroup.children.length - 1; i >= 0; i -= 1) {
      const o = calloutGroup.children[i];
      if (o === leadLine || o === zoomSprite) continue;
      calloutGroup.remove(o);
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    }
  }
  // opts.calloutStyle === 'standing': the image STANDS upright on the globe as a
  // billboard -- the "birds on the planet" look. The image is either a ready
  // transparent canvas (item.canvas) or a real photo URL (item.url) that gets loaded
  // and circle-masked into a soft vignette portrait. Default style: flat framed tile.
  function mountStanding(tex, aspect, item, dir) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false, depthTest: true
    }));
    const h = EARTH_R * TILE_CELL * (Math.PI / 180) * 2.1;
    sp.scale.set(h * aspect, h, 1);
    sp.center.set(0.5, 0.04);            // feet on the ground
    sp.position.copy(dir).multiplyScalar(EARTH_R * 1.002);
    sp.renderOrder = 5;
    const co = { mesh: sp, dir, marker: item.marker, aspect, color: item.color || '#55483a', emph: 0, tex };
    sp.userData.callout = co;
    callouts.push(co); tileMeshes.push(sp);
    calloutGroup.add(sp);
  }
  // real photo -> a round soft-edged portrait disc (transparent corners) so the bird
  // reads as a cutout on the dark globe, not a rectangular tile.
  function makeDiscTexture(img) {
    const S = 128;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    g.save();
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    g.closePath();
    g.clip();
    const s = Math.max(S / img.width, S / img.height);
    const dw = img.width * s, dh = img.height * s;
    g.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
    g.restore();
    // soft inner vignette + thin rim to lift it off the dark planet
    const grad = g.createRadialGradient(S / 2, S / 2, S * 0.32, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(8,10,16,0.55)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(228,224,210,0.5)';
    g.lineWidth = 2.5;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.stroke();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  function addStandingSprite(item, dir) {
    if (item.canvas) {
      const tex = new THREE.CanvasTexture(item.canvas);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      mountStanding(tex, item.canvas.width / item.canvas.height, item, dir);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';       // open iNat CDN -> taintless canvas
    img.onload = () => mountStanding(makeDiscTexture(img), 1, item, dir);
    img.onerror = () => { /* photo failed -> the dot still marks it */ };
    img.src = item.url;
  }

  // ---- cutout-instanced bird layer: HUNDREDS of transparent-cutout images packed
  // into a few texture atlases and drawn with GPU instancing (one draw call per
  // atlas), so 1000+ birds render at full frame rate. Items reuse the same hover /
  // zoom / selection flow as callouts; picking is done in screen space. ----
  let cutoutMeshes = [];
  let cutoutItems = [];
  // "release the birds": a shared uniform (all atlas meshes reference the same object) eased
  // between 0 (perched on the map) and 1 (scattered into the sky around the planet).
  const flyUniform = { value: 0 };
  let flyTarget = 0, flyT = 0;
  function setBirdsFlying(on) { flyTarget = on ? 1 : 0; }
  function clearCutouts() {
    for (const m of cutoutMeshes) {
      calloutGroup.remove(m);
      m.geometry.dispose();
      if (m.material.uniforms.uAtlas.value) m.material.uniforms.uAtlas.value.dispose();
      m.material.dispose();
    }
    for (const it of cutoutItems) { if (it.tex) { it.tex.dispose(); it.tex = null; } }
    cutoutMeshes = []; cutoutItems = [];
  }
  function setCutouts(list, opts) {
    clearCallouts();
    clearCutouts();
    const rad = Math.PI / 180;
    // When the caller has ALREADY laid the items onto a tidy per-continent grid
    // (snap:false), use their lat/lon verbatim -- re-snapping would fight that layout.
    // Otherwise quantise each item to a free angular cell so nothing piles up.
    const snap = !opts || opts.snap !== false;
    const occupied = new Set();
    const lonStepAt = (latC) => TILE_CELL / Math.max(0.30, Math.cos(latC * rad));
    function allocCell(lat, lon) {
      const r0 = Math.round(lat / TILE_CELL);
      for (let radius = 0; radius <= 9; radius += 1) {
        let best = null;
        for (let dr = -radius; dr <= radius; dr += 1) {
          const r = r0 + dr;
          const latC = r * TILE_CELL;
          if (Math.abs(latC) > 82) continue;
          const step = lonStepAt(latC);
          const c0 = Math.round(lon / step);
          for (let dc = -radius; dc <= radius; dc += 1) {
            if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
            const c = c0 + dc;
            const key = r + ':' + c;
            if (occupied.has(key)) continue;
            const lonC = c * step;
            const d = (latC - lat) * (latC - lat) + (lonC - lon) * (lonC - lon) * Math.cos(latC * rad) * Math.cos(latC * rad);
            if (!best || d < best.d) best = { key, latC, lonC, d };
          }
        }
        if (best) { occupied.add(best.key); return best; }
      }
      return null;
    }

    // pack the cutouts into 2048px atlases (96px cells -> 441 per atlas)
    const CELL = 96, COLS = 21, PER = COLS * COLS, ATLAS = CELL * COLS;
    // every bird is fitted INSIDE one grid cell (the grid is physically square at any
    // latitude), so the flock reads as an even field -- no piling, no size jumble.
    const cellWorld = EARTH_R * TILE_CELL * rad;
    const fitWorld = cellWorld * 0.92;   // fill most of the cell, with a margin so neighbours never overlap
    const atlases = [];
    const placed = [];
    list.forEach((item) => {
      const cell = snap ? allocCell(item.lat, item.lon) : { latC: item.lat, lonC: item.lon };
      if (!cell) return;
      const slot = placed.length;
      const ai = Math.floor(slot / PER);
      if (!atlases[ai]) {
        const cv = document.createElement('canvas');
        cv.width = ATLAS; cv.height = ATLAS;
        atlases[ai] = { cv, g: cv.getContext('2d'), n: 0 };
      }
      const a = atlases[ai];
      const idx = slot % PER;
      const cx = (idx % COLS) * CELL, cy = Math.floor(idx / COLS) * CELL;
      const img = item.img;
      const s = Math.min(CELL / img.width, CELL / img.height);
      const dw = Math.max(1, Math.round(img.width * s)), dh = Math.max(1, Math.round(img.height * s));
      a.g.drawImage(img, cx + (CELL - dw) / 2, cy + CELL - dh, dw, dh);   // feet at cell bottom
      a.n += 1;
      // narrower aspect clamp + fit-inside-cell so every bird is roughly the same size and
      // always stays within its square (no bird spills into a neighbour's cell)
      const aspect = Math.max(0.62, Math.min(1.5, img.width / img.height));
      const w = aspect >= 1 ? fitWorld : fitWorld * aspect;
      const h = aspect >= 1 ? fitWorld / aspect : fitWorld;
      const dir = latLonToVec3(cell.latC, cell.lonC, 1).normalize();
      placed.push({
        atlas: ai,
        uv: [(cx + (CELL - dw) / 2) / ATLAS, 1 - (cy + CELL) / ATLAS, dw / ATLAS, dh / ATLAS],
        dir,
        w, h,
        marker: item.marker, aspect, color: item.color || '#e0b15a', emph: 0, tex: null, img
      });
    });

    // one instanced mesh per atlas: a unit CENTRE-anchored quad, billboarded in the
    // vertex shader (view-space offset), per-instance position/size/uv-rect. Centre-anchored
    // so the bird sits in the middle of its cell rather than standing on the gridline.
    for (let ai = 0; ai < atlases.length; ai++) {
      const items = placed.filter((p) => p.atlas === ai);
      const n = items.length;
      if (!n) continue;
      const geo = new THREE.InstancedBufferGeometry();
      const quad = new THREE.PlaneGeometry(1, 1);
      geo.index = quad.index;
      geo.setAttribute('position', quad.getAttribute('position'));
      geo.setAttribute('uv', quad.getAttribute('uv'));
      const iPos = new Float32Array(n * 3), iSize = new Float32Array(n * 2), iUV = new Float32Array(n * 4);
      const iSky = new Float32Array(n * 3), iPhase = new Float32Array(n);
      items.forEach((p, k) => {
        const v = p.dir.clone().multiplyScalar(EARTH_R * 1.002);
        iPos[k * 3] = v.x; iPos[k * 3 + 1] = v.y; iPos[k * 3 + 2] = v.z;
        // sky target: lifted out along its own normal to a random height, with a little
        // sideways jitter so the flock reads as a drifting cloud rather than a shell
        const skyR = EARTH_R * (1.32 + Math.random() * 0.92);
        iSky[k * 3] = p.dir.x * skyR + (Math.random() - 0.5) * EARTH_R * 0.42;
        iSky[k * 3 + 1] = p.dir.y * skyR + (Math.random() - 0.5) * EARTH_R * 0.42;
        iSky[k * 3 + 2] = p.dir.z * skyR + (Math.random() - 0.5) * EARTH_R * 0.42;
        iPhase[k] = Math.random();           // staggers lift-off so they don't all leave at once
        iSize[k * 2] = p.w; iSize[k * 2 + 1] = p.h;
        iUV[k * 4] = p.uv[0]; iUV[k * 4 + 1] = p.uv[1]; iUV[k * 4 + 2] = p.uv[2]; iUV[k * 4 + 3] = p.uv[3];
      });
      geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 3));
      geo.setAttribute('iSky', new THREE.InstancedBufferAttribute(iSky, 3));
      geo.setAttribute('iPhase', new THREE.InstancedBufferAttribute(iPhase, 1));
      geo.setAttribute('iSize', new THREE.InstancedBufferAttribute(iSize, 2));
      geo.setAttribute('iUV', new THREE.InstancedBufferAttribute(iUV, 4));
      geo.instanceCount = n;
      const tex = new THREE.CanvasTexture(atlases[ai].cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      tex.flipY = true;
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthTest: true, depthWrite: false,
        uniforms: { uAtlas: { value: tex }, uFly: flyUniform },
        vertexShader: `
          attribute vec3 iPos; attribute vec3 iSky; attribute float iPhase;
          attribute vec2 iSize; attribute vec4 iUV;
          uniform float uFly;
          varying vec2 vUv;
          void main(){
            vUv = vec2(iUV.x + uv.x * iUV.z, iUV.y + uv.y * iUV.w);
            // staggered, eased lift between the map position and the sky position
            float local = clamp(uFly * 1.55 - iPhase * 0.55, 0.0, 1.0);
            float e = local * local * (3.0 - 2.0 * local);
            vec3 wp = mix(iPos, iSky, e);
            vec4 mv = modelViewMatrix * vec4(wp, 1.0);
            mv.xy += position.xy * iSize;     // screen-aligned billboard, centre anchored
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          precision highp float; uniform sampler2D uAtlas; varying vec2 vUv;
          void main(){
            vec4 c = texture2D(uAtlas, vUv);
            if (c.a < 0.2) discard;
            // lift shadows + a small floor so dark-plumaged birds stay visible on the
            // night-sky globe instead of sinking into the black background
            vec3 col = pow(c.rgb, vec3(0.72)) * 1.22 + 0.05;
            gl_FragColor = vec4(min(col, vec3(1.0)), c.a);
          }
        `
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      calloutGroup.add(mesh);
      cutoutMeshes.push(mesh);
    }
    cutoutItems = placed;
    callouts = placed;          // hover / zoom / selection reuse the callout flow
  }

  // screen-space picking for the instanced cutouts (no per-instance raycast needed)
  const _cw = new THREE.Vector3(), _cv = new THREE.Vector3();
  function pickCutoutScreen() {
    if (!cutoutItems.length || flyT > 0.02) return null;   // birds in flight aren't pickable
    const W = window.innerWidth, H = window.innerHeight;
    const px = (ndc.x * 0.5 + 0.5) * W, py = (-ndc.y * 0.5 + 0.5) * H;
    const P11 = camera.projectionMatrix.elements[5];
    let best = null, bestD = 1e9;
    for (const it of cutoutItems) {
      _cw.copy(it.dir).multiplyScalar(EARTH_R * 1.002).applyMatrix4(world.matrixWorld);
      if (occludedByEarth(_cw)) continue;
      _cv.copy(_cw).applyMatrix4(camera.matrixWorldInverse);
      const z = -_cv.z;
      if (z <= 0.1) continue;
      const sx = (_cv.x / z) * P11 * (camera.aspect ? 1 / camera.aspect : 1) * (W / 2) + W / 2;
      const sy = -(_cv.y / z) * P11 * (H / 2) + H / 2;
      const hPx = it.h * P11 * (H / 2) / z;
      const wPx = it.w * P11 * (H / 2) / z;
      if (px < sx - wPx / 2 || px > sx + wPx / 2) continue;   // centre-anchored hit box
      if (py < sy - hPx / 2 || py > sy + hPx / 2) continue;
      const d = Math.abs(px - sx) + Math.abs(py - sy);
      if (d < bestD) { bestD = d; best = it; }
    }
    if (best && !best.tex && best.img) {
      const t = new THREE.Texture(best.img);
      t.needsUpdate = true;
      t.colorSpace = THREE.SRGBColorSpace;
      best.tex = t;
    }
    return best;
  }

  function setImageCallouts(list) {
    clearCallouts();
    clearCutouts();
    // global angular grid: quantize each tile to a cell; if taken, spiral outward to
    // the nearest free one. One tile per cell == overlap is impossible by design.
    const occupied = new Set();
    const rad = Math.PI / 180;
    const lonStepAt = (latC) => TILE_CELL / Math.max(0.30, Math.cos(latC * rad));
    function allocCell(lat, lon) {
      const r0 = Math.round(lat / TILE_CELL);
      for (let radius = 0; radius <= 9; radius += 1) {
        let best = null;
        for (let dr = -radius; dr <= radius; dr += 1) {
          const r = r0 + dr;
          const latC = r * TILE_CELL;
          if (Math.abs(latC) > 82) continue;
          const step = lonStepAt(latC);
          const c0 = Math.round(lon / step);
          for (let dc = -radius; dc <= radius; dc += 1) {
            if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;   // ring only
            const c = c0 + dc;
            const key = r + ':' + c;
            if (occupied.has(key)) continue;
            const lonC = c * step;
            const d = (latC - lat) * (latC - lat)
              + (lonC - lon) * (lonC - lon) * Math.cos(latC * rad) * Math.cos(latC * rad);
            if (!best || d < best.d) best = { key, latC, lonC, d };
          }
        }
        if (best) { occupied.add(best.key); return best; }
      }
      return null;            // crowded beyond belief -> skip; the dot still marks it
    }
    list.forEach((item) => {
      const cell = allocCell(item.lat, item.lon);
      if (!cell) return;
      const dir = latLonToVec3(cell.latC, cell.lonC, 1).normalize();
      if (opts.calloutStyle === 'standing' && (item.canvas || item.url)) {
        addStandingSprite(item, dir);
        return;
      }
      const color = item.color || '#55483a';
      const img = new Image();
      img.onload = () => {
        const { tex, aspect } = makeTileTexture(img, color);
        const mesh = new THREE.Mesh(tileGeoShared, new THREE.MeshBasicMaterial({
          map: tex, transparent: true, depthWrite: false
        }));
        const size = EARTH_R * TILE_CELL * rad * 0.94;          // fits inside its cell
        mesh.scale.set(aspect >= 1 ? size : size * aspect, aspect >= 1 ? size / aspect : size, 1);
        mesh.position.copy(dir).multiplyScalar(EARTH_R * TILE_LIFT);
        orientTile(mesh, dir);
        mesh.renderOrder = 5;
        const co = { mesh, dir, marker: item.marker, aspect, color, emph: 0, tex };
        mesh.userData.callout = co;
        callouts.push(co); tileMeshes.push(mesh);
        calloutGroup.add(mesh);
      };
      img.onerror = () => { /* image missing/failed -> the dot still marks it */ };
      img.src = item.url;
    });
  }

  // per-frame: the flat tiles never move; only the single zoom billboard eases up
  // over whichever tile is hovered/selected, tethered by the leader line.
  const _leadA = new THREE.Vector3(), _leadB = new THREE.Vector3();
  function updateCallouts() {
    let active = null;
    for (let i = 0; i < callouts.length; i += 1) {
      const co = callouts[i];
      const target = (co === selCallout || co === hoverCallout) ? 1 : 0;
      if (Math.abs(co.emph - target) > 0.001) co.emph += (target - co.emph) * 0.22; else co.emph = target;
      if (co.emph > 0.04 && (!active || co.emph > active.emph)) active = co;
    }
    if (active && active.tex) {
      const e = active.emph;
      zoomSprite.material.map = active.tex;
      zoomSprite.material.opacity = Math.min(1, e * 1.6);
      const h = ZOOM_H * (0.55 + 0.45 * e);
      zoomSprite.scale.set(h * active.aspect, h, 1);
      zoomSprite.position.copy(active.dir).multiplyScalar(EARTH_R * (TILE_LIFT + (ZOOM_LIFT - TILE_LIFT) * e));
      zoomSprite.visible = true;
      zoomSprite.userData.callout = active;
      _leadA.copy(active.dir).multiplyScalar(EARTH_R * 1.01);
      _leadB.copy(zoomSprite.position);
      const p = leadGeo.attributes.position;
      p.setXYZ(0, _leadA.x, _leadA.y, _leadA.z); p.setXYZ(1, _leadB.x, _leadB.y, _leadB.z);
      p.needsUpdate = true;
      leadLine.material.color.set(active.color);
      leadLine.visible = true;
    } else {
      zoomSprite.visible = false; zoomSprite.userData.callout = null;
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
    if (!calloutGroup.visible) return null;
    if (cutoutItems.length) return pickCutoutScreen();
    if (!tileMeshes.length) return null;
    raycaster.setFromCamera(ndc, camera);
    // the zoom billboard covers its tile while shown -> give it first claim
    if (zoomSprite.visible && zoomSprite.userData.callout) {
      const zh = raycaster.intersectObject(zoomSprite, false);
      if (zh.length && !occludedByEarth(zoomSprite.getWorldPosition(_wp))) return zoomSprite.userData.callout;
    }
    const hits = raycaster.intersectObjects(tileMeshes, false);
    for (let i = 0; i < hits.length; i += 1) {
      const o = hits[i].object;
      if (!occludedByEarth(o.getWorldPosition(_wp))) return o.userData.callout || null;
    }
    return null;
  }

  // ---- label halo: thin leader lines fan from the front-facing markers out to their
  // names stacked along the globe's left/right rim -- the British-Museum "data planet"
  // look. SVG overlay above the globe but under the UI panels (z-index 3). ----
  const SVGNS = 'http://www.w3.org/2000/svg';
  const HALO_MAX = 72;                 // dense museum-catalog rows, like the reference
  let haloEnabled = true;
  const halo = document.createElementNS(SVGNS, 'svg');
  Object.assign(halo.style, { position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3, overflow: 'visible' });
  document.body.appendChild(halo);
  const haloPool = [];
  for (let i = 0; i < HALO_MAX; i += 1) {
    const ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('stroke', dark ? 'rgba(190,160,90,0.42)' : 'rgba(90,78,60,0.4)'); ln.setAttribute('stroke-width', '0.8');
    const tx = document.createElementNS(SVGNS, 'text');
    tx.setAttribute('font-size', '11.5'); tx.setAttribute('fill', dark ? 'rgba(232,224,200,0.92)' : 'rgba(52,45,34,0.92)');
    tx.setAttribute('font-family', '"Microsoft JhengHei","PingFang TC","Noto Sans CJK TC",sans-serif');
    tx.setAttribute('dominant-baseline', 'middle');
    tx.setAttribute('stroke', dark ? 'rgba(8,10,16,0.8)' : 'rgba(244,238,224,0.85)'); tx.setAttribute('stroke-width', '3'); tx.setAttribute('paint-order', 'stroke');
    halo.appendChild(ln); halo.appendChild(tx);
    haloPool.push({ ln, tx });
  }
  const _hw = new THREE.Vector3(), _ho = new THREE.Vector3(), _hr = new THREE.Vector3();
  let haloT = 0;
  function hideHalo() { for (let i = 0; i < HALO_MAX; i += 1) { haloPool[i].ln.style.display = 'none'; haloPool[i].tx.style.display = 'none'; } }
  function updateHalo(now) {
    if (now - haloT < 90) return; haloT = now;          // ~11 fps is plenty
    if (!haloEnabled || !opts.labelOf || !markerData.length) { hideHalo(); return; }
    const W = window.innerWidth, H = window.innerHeight;
    _ho.set(0, 0, 0).project(camera);
    const cx = (_ho.x * 0.5 + 0.5) * W, cy = (-_ho.y * 0.5 + 0.5) * H;
    _hr.set(EARTH_R, 0, 0).project(camera);
    const rim = Math.hypot((_hr.x * 0.5 + 0.5) * W - cx, (-_hr.y * 0.5 + 0.5) * H - cy);
    // one marker per angular sector (front hemisphere only) -> a spread, uncluttered set
    const SECT = 72; const buckets = new Array(SECT).fill(null);
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
    const GAP = 14.5;
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
    const hid = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const m = list[i];
      const v = latLonToVec3(m.lat, m.lon, EARTH_R * (1.01 + (m.tier || 0) * 0.012));
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      col[i * 3] = m.color[0]; col[i * 3 + 1] = m.color[1]; col[i * 3 + 2] = m.color[2];
      ids[i] = i; siz[i] = m.size || 7;
      hid[i] = m.hasImg ? 1 : 0;     // photo tile replaces the dot (label/halo keeps it)
    }
    markerGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    markerGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    markerGeo.setAttribute('aId', new THREE.BufferAttribute(ids, 1));
    markerGeo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    markerGeo.setAttribute('aHide', new THREE.BufferAttribute(hid, 1));
    markerGeo.attributes.position.needsUpdate = true;
  }

  // ---- interaction: hand-written orbit + zoom + inertia + autospin ----
  let yaw = -1.6, pitch = -0.12, vYaw = 0, vPitch = 0;   // open on Africa/Europe/Asia (land + markers)
  let autospin = true;
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
    // nearest to camera among close hits; skip dots hidden behind a photo tile AND
    // dots on the far hemisphere (the ray passes through the globe, depthTest only
    // hides them visually -- without this you could hover Cuba from Asia).
    for (let i = 0; i < hits.length; i += 1) {
      const m = markerData[hits[i].index];
      if (!m || m.hasImg) continue;
      _hw.copy(latLonToVec3(m.lat, m.lon, EARTH_R * 1.01)).applyMatrix4(world.matrixWorld);
      if (occludedByEarth(_hw)) continue;
      return hits[i].index;
    }
    return -1;
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
    // world euler is XYZ (Rx·Ry): after yaw brings the point to (0, y, s), a rotation
    // of +tp about x (not -tp) levels it onto +z, i.e. the screen centre.
    // Take the SHORTEST path: after long autospin yaw has wound up many turns, and
    // chasing the absolute angle would spin the globe all the way back.
    const TWO_PI = Math.PI * 2;
    const dYaw = ((((-ty - yaw) % TWO_PI) + TWO_PI + Math.PI) % TWO_PI) - Math.PI;
    focusTarget = { yaw: yaw + dYaw, pitch: tp }; focusT = 0;
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
    markerMat.uniforms.uPr.value = pr;
  }
  function frame() {
    raf = requestAnimationFrame(frame);
    if (window.innerWidth !== lastW || window.innerHeight !== lastH) resize();
    const dt = clock.getDelta(); const t = clock.elapsedTime;
    markerMat.uniforms.uTime.value = t;
    const idle = performance.now() - lastInteract > 3500 && autospin;
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
    flyT += (flyTarget - flyT) * Math.min(1, dt * 2.4);     // ease the flock up / back down
    flyUniform.value = flyT;
    updateCallouts();
    renderer.render(scene, camera);
    updateHalo(performance.now());        // after render -> world/camera matrices are current
  }
  resize(); frame();

  return {
    setMarkers,
    setImageCallouts,
    setCutouts,
    setLandGrid,
    setLandGridExtra,
    setBirdsFlying,
    focus: focusOn,
    // programmatic selection (e.g. from the country-list panel): highlight + fly to it
    select: (marker) => {
      const idx = markerData.indexOf(marker);
      if (idx < 0) return false;
      markerMat.uniforms.uSel.value = idx; selectionActive = true;
      focusOn(marker);
      return true;
    },
    clearSelection: () => { markerMat.uniforms.uSel.value = -1; selCallout = null; selectionActive = false; },
    setAutospin: (on) => { autospin = !!on; },
    setHaloVisible: (on) => { haloEnabled = !!on; if (!on) hideHalo(); },
    setCalloutsVisible: (on) => { calloutGroup.visible = !!on; if (!on) { hoverCallout = null; } },
    resize,
    dispose: () => { cancelAnimationFrame(raf); renderer.dispose(); }
  };
}
