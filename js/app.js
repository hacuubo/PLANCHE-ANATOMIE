import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHeart } from './heart.js';
import { STRUCTURES, GROUPES, ORDRE, INTRO } from './data.js';

/* ─────────── scène ─────────── */
const canvasWrap = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasWrap.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
canvasWrap.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
const CENTER = new THREE.Vector3(0, 3.0, -1.2);
const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.target.copy(CENTER);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 60;

const key = new THREE.DirectionalLight(0xfff3e6, 2.2);
key.position.set(6, 12, 14);
const fill = new THREE.DirectionalLight(0xdfe7ff, 0.9);
fill.position.set(-10, 4, 6);
const rim = new THREE.DirectionalLight(0xffffff, 0.8);
rim.position.set(2, 8, -14);
scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0x8a6a5a, 0.5));

/* ─────────── cœur ─────────── */
const heart = buildHeart();
const pivot = new THREE.Group();
pivot.position.copy(CENTER);
heart.root.position.copy(CENTER.clone().negate());
pivot.add(heart.root);
scene.add(pivot);

/* ─────────── coupe (plan de clipping + capuchons stencil) ─────────── */
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.4);
const CUT_MODES = {
  frontale: { normal: new THREE.Vector3(0, 0, -1), min: -6, max: 6, def: 0.2 },
  horizontale: { normal: new THREE.Vector3(0, -1, 0), min: -5, max: 9, def: 0.0 },
  'grand-axe': { normal: null, min: -5, max: 5, def: 0.4 }, // normale = « avant » local du cœur
};
const stencilGroup = new THREE.Group();
stencilGroup.name = 'stencil';
heart.root.add(stencilGroup);
const capGroups = new Map(); // capColor → plane mesh

function makeStencilMeshes(solid, order) {
  const base = new THREE.MeshBasicMaterial({ depthWrite: false, depthTest: false, colorWrite: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc });
  const inc = THREE.IncrementWrapStencilOp, dec = THREE.DecrementWrapStencilOp;
  const back = base.clone(); back.side = THREE.BackSide; back.clippingPlanes = [cutPlane];
  back.stencilFail = back.stencilZFail = back.stencilZPass = solid.hole ? dec : inc;
  const front = base.clone(); front.side = THREE.FrontSide; front.clippingPlanes = [cutPlane];
  front.stencilFail = front.stencilZFail = front.stencilZPass = solid.hole ? inc : dec;
  const g = new THREE.Group();
  const m0 = new THREE.Mesh(solid.mesh.geometry, back); m0.renderOrder = order;
  const m1 = new THREE.Mesh(solid.mesh.geometry, front); m1.renderOrder = order;
  g.add(m0, m1);
  solid.mesh.add(g); // hérite de la transformation ; invisible quand le parent l'est
  return g;
}

// Regroupement : masse ventriculaire + oreillettes + cavités (trous) → capuchon « myocarde sectionné » ;
// chaque couleur de vaisseau → son propre capuchon (lumière pleine de sang).
const orderByCap = new Map();
let orderCursor = 100;
heart.solids.forEach((s) => {
  const capKey = s.hole ? 'myo' : (s.capColor === 0x9c3f3a ? 'myo' : String(s.capColor));
  if (!orderByCap.has(capKey)) { orderByCap.set(capKey, orderCursor); orderCursor += 3; }
  const order = orderByCap.get(capKey);
  s.stencil = makeStencilMeshes(s, order);
  s.stencil.visible = false;
  if (!capGroups.has(capKey)) {
    const color = capKey === 'myo' ? 0x9c3f3a : s.capColor;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp });
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat);
    cap.renderOrder = order + 1;
    cap.onAfterRender = (r) => r.clearStencil();
    cap.visible = false;
    cap.userData.capKey = capKey;
    scene.add(cap);
    capGroups.set(capKey, cap);
  }
});

function updateCapPlanes() {
  const n = cutPlane.normal;
  capGroups.forEach((cap) => {
    cutPlane.coplanarPoint(cap.position);
    cap.lookAt(cap.position.clone().sub(n)); // face avant tournée vers la partie retirée (donc vers l'observateur)
  });
}

const state = { coupe: false, modeCoupe: 'frontale', circulation: false, battement: true, etiquettes: false, coronaires: true, selected: null, hovered: null };

function applyClipping() {
  const planes = state.coupe ? [cutPlane] : [];
  heart.materials.forEach((m) => { m.clippingPlanes = planes; m.needsUpdate = true; });
  heart.solids.forEach((s) => { s.stencil.visible = state.coupe; });
  capGroups.forEach((cap) => { cap.visible = state.coupe; });
  heart.cutOnly.forEach((m) => { m.visible = state.coupe; });
  updateCapPlanes();
}

function setCutMode(mode, value) {
  state.modeCoupe = mode;
  const cfg = CUT_MODES[mode];
  const n = cfg.normal ? cfg.normal.clone() : localAnterior().negate();
  cutPlane.normal.copy(n);
  const slider = document.getElementById('cut-depth');
  slider.min = cfg.min; slider.max = cfg.max; slider.step = 0.1;
  slider.value = value ?? cfg.def;
  cutPlane.constant = parseFloat(slider.value) - cutPlaneOffset();
  updateCapPlanes();
}
function localAnterior() { const v = new THREE.Vector3(); heart.matrixLocal.extractBasis(new THREE.Vector3(), new THREE.Vector3(), v); return v; }
// Le plan est exprimé dans le repère monde ; le cœur est translaté de -CENTER dans le pivot puis de +CENTER : net nul.
function cutPlaneOffset() { return 0; }

/* ─────────── circulation (particules) ─────────── */
const flowGroup = new THREE.Group();
heart.root.add(flowGroup);
const PER_PATH = 70;
const flowCurves = heart.flowPaths.map((p) => ({ curve: new THREE.CatmullRomCurve3(p.points, false, 'centripetal', 0.5), color: new THREE.Color(p.color), speed: p.speed }));
const flowCount = flowCurves.length * PER_PATH;
const flowMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.1, emissive: 0x222222 }), flowCount);
flowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
const flowPhase = new Float32Array(flowCount);
{
  const c = new THREE.Color();
  for (let i = 0; i < flowCount; i++) {
    const pi = Math.floor(i / PER_PATH);
    flowPhase[i] = Math.random();
    c.copy(flowCurves[pi].color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.15);
    flowMesh.setColorAt(i, c);
  }
}
flowMesh.visible = false;
flowGroup.add(flowMesh);
const tmpM = new THREE.Matrix4(), tmpP = new THREE.Vector3();
function updateFlow(time) {
  for (let i = 0; i < flowCount; i++) {
    const pc = flowCurves[Math.floor(i / PER_PATH)];
    const t = (flowPhase[i] + time * pc.speed) % 1;
    pc.curve.getPointAt(t, tmpP);
    tmpM.makeTranslation(tmpP.x, tmpP.y, tmpP.z);
    flowMesh.setMatrixAt(i, tmpM);
  }
  flowMesh.instanceMatrix.needsUpdate = true;
}
function setTranslucent(on) {
  heart.materials.forEach((m) => {
    if (m.userData.noTranslucent) return;
    m.transparent = on;
    m.opacity = on ? 0.22 : 1;
    m.depthWrite = !on;
    m.needsUpdate = true;
  });
}

/* ─────────── étiquettes ─────────── */
const labels = {};
ORDRE.forEach((id, i) => {
  const s = STRUCTURES[id];
  const entry = heart.registry[id];
  if (!entry || !entry.anchor) return;
  const el = document.createElement('div');
  el.className = 'label';
  el.innerHTML = `<span class="num">${i + 1}</span><span class="txt">${s.nom}</span>`;
  el.addEventListener('pointerdown', (e) => { e.stopPropagation(); select(id); });
  const obj = new CSS2DObject(el);
  obj.position.copy(entry.anchor);
  obj.visible = false;
  heart.root.add(obj);
  labels[id] = { obj, el, coupe: !!s.coupe };
});
function refreshLabels() {
  for (const id in labels) {
    const L = labels[id];
    // En mode « planche », les étiquettes sont disposées en colonnes (voir layoutPlanche) ;
    // l'étiquette flottante ne sert qu'à la sélection et au survol.
    L.obj.visible = state.selected === id || state.hovered === id;
    L.el.classList.toggle('selected', state.selected === id);
    L.el.classList.toggle('hover', state.hovered === id && state.selected !== id);
  }
  planche.style.display = state.etiquettes ? '' : 'none';
}

/* ─────────── planche numérotée (colonnes + lignes de rappel) ─────────── */
const planche = document.createElement('div');
planche.className = 'planche';
planche.style.display = 'none';
const leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
leaders.setAttribute('class', 'leaders');
planche.appendChild(leaders);
canvasWrap.appendChild(planche);
const plabels = {};
ORDRE.forEach((id, i) => {
  if (!labels[id]) return;
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'plabel';
  el.innerHTML = `<span class="num" style="background:${STRUCTURES[id].couleur}">${i + 1}</span><span class="txt">${STRUCTURES[id].nom}</span>`;
  el.addEventListener('click', () => select(id));
  planche.appendChild(el);
  plabels[id] = el;
});
const projP = new THREE.Vector3();
function layoutPlanche() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  const narrow = w < 700;
  const items = [];
  for (const id in labels) {
    const L = labels[id];
    const show = (!L.coupe || state.coupe) && !L.occluded && !(state.selected === id);
    if (!show) { plabels[id].style.display = 'none'; continue; }
    L.obj.getWorldPosition(projP).project(camera);
    if (projP.z > 1) { plabels[id].style.display = 'none'; continue; }
    items.push({ id, sx: (projP.x + 1) / 2 * w, sy: (1 - projP.y) / 2 * h });
  }
  const gap = narrow ? 20 : 24, top = narrow ? 100 : 110, bottom = h - 70;
  const columns = [items.filter((i) => i.sx < w / 2).sort((a, b) => a.sy - b.sy), items.filter((i) => i.sx >= w / 2).sort((a, b) => a.sy - b.sy)];
  let svg = '';
  columns.forEach((col, side) => {
    const ys = col.map((i) => i.sy);
    for (let k = 0; k < ys.length; k++) ys[k] = Math.max(k ? ys[k - 1] + gap : top, ys[k]);
    for (let k = ys.length - 1; k >= 0; k--) ys[k] = Math.min(k < ys.length - 1 ? ys[k + 1] - gap : bottom, ys[k]);
    for (let k = 0; k < ys.length; k++) ys[k] = Math.max(top, ys[k]);
    col.forEach((it, k) => {
      const el = plabels[it.id];
      el.style.display = '';
      el.style.top = `${ys[k]}px`;
      el.classList.toggle('right', side === 1);
      el.classList.toggle('hover', state.hovered === it.id);
      const ex = side === 0 ? 16 + el.offsetWidth : w - 16 - el.offsetWidth;
      const kx = side === 0 ? ex + 10 : ex - 10;
      svg += `<polyline points="${ex},${ys[k]} ${kx},${ys[k]} ${it.sx},${it.sy}"/><circle cx="${it.sx}" cy="${it.sy}" r="2.6"/>`;
    });
  });
  leaders.innerHTML = svg;
}

/* ─────────── sélection / surbrillance ─────────── */
const highlighted = []; // { mesh, material }
function clearHighlight() {
  highlighted.forEach(({ mesh, material }) => { mesh.material.dispose(); mesh.material = material; });
  highlighted.length = 0;
}
function highlight(id) {
  clearHighlight();
  const entry = heart.registry[id];
  if (!entry) return;
  entry.meshes.forEach((mesh) => {
    if (mesh.userData.cap) return;
    const material = mesh.material;
    const hl = material.clone();
    hl.emissive = new THREE.Color(0xffffff);
    hl.emissiveIntensity = 0.28;
    hl.color = material.userData.baseColor.clone().lerp(new THREE.Color(0xffffff), 0.18);
    hl.clippingPlanes = material.clippingPlanes;
    mesh.material = hl;
    highlighted.push({ mesh, material });
  });
}
function select(id) {
  state.selected = id;
  highlight(id);
  renderFiche(id);
  refreshLabels();
  document.querySelectorAll('.struct-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
  if (id && STRUCTURES[id].coupe && !state.coupe) toggle('coupe', true);
  if (window.innerWidth < 900) document.getElementById('panel').classList.add('open');
}

/* ─────────── picking ─────────── */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pickables = [];
heart.root.traverse((o) => { if (o.isMesh && o.userData.id && !o.userData.cap) pickables.push(o); });
let downPos = null;
function pick(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables.filter((o) => o.visible && o.parent?.visible !== false), false);
  for (const h of hits) {
    if (state.coupe && cutPlane.distanceToPoint(h.point) < 0) continue; // partie retirée par la coupe
    if (h.object.material.transparent && h.object.material.opacity < 0.5 && !state.circulation) continue;
    return { id: heart.pickId(h.object, h.point), point: h.point };
  }
  return null;
}
labelRenderer.domElement.addEventListener('pointerdown', (e) => { downPos = [e.clientX, e.clientY]; });
labelRenderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
  downPos = null;
  if (moved > 6) return;
  const hit = pick(e);
  select(hit ? hit.id : null);
});
labelRenderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  const hit = pick(e);
  const id = hit ? hit.id : null;
  if (id !== state.hovered) { state.hovered = id; refreshLabels(); }
  labelRenderer.domElement.style.cursor = id ? 'pointer' : 'grab';
});

/* ─────────── interface ─────────── */
const VUES = {
  anterieure: { dir: [0, -0.03, 1], label: 'Face antérieure' },
  gauche: { dir: [1, -0.03, 0.12], label: 'Côté gauche' },
  posterieure: { dir: [0, -0.03, -1], label: 'Face postérieure' },
  droite: { dir: [-1, -0.03, 0.12], label: 'Côté droit' },
  superieure: { dir: [0, 1, 0.18], label: 'Vue de dessus' },
  inferieure: { dir: [0.1, -1, 0.5], label: 'Face inférieure' },
};
let camAnim = null;
// Distance de cadrage : le modèle fait ≈ 22 cm de haut (de l'aorte descendante aux branches de la crosse).
function viewDistance() { return 38 * Math.max(1, 1.2 / camera.aspect); }
function goView(name, instant = false) {
  const v = VUES[name];
  const to = CENTER.clone().add(new THREE.Vector3(...v.dir).normalize().multiplyScalar(viewDistance()));
  if (instant) { camera.position.copy(to); camAnim = null; }
  else camAnim = { from: camera.position.clone(), to, t: 0 };
  document.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}

function toggle(name, value) {
  state[name] = value ?? !state[name];
  const btn = document.querySelector(`[data-toggle="${name}"]`);
  if (btn) { btn.classList.toggle('on', state[name]); btn.setAttribute('aria-pressed', String(state[name])); }
  if (name === 'coupe') { applyClipping(); document.getElementById('cut-tools').classList.toggle('hidden', !state.coupe); if (!state.coupe && state.selected && STRUCTURES[state.selected]?.coupe) select(null); }
  if (name === 'circulation') { setTranslucent(state.circulation); flowMesh.visible = state.circulation; }
  if (name === 'coronaires') { ['coronaire-droite', 'tronc-commun', 'iva', 'circonflexe', 'sinus-coronaire'].forEach((id) => heart.registry[id].meshes.forEach((m) => { m.visible = state.coronaires; })); }
  if (name === 'etiquettes') refreshLabels();
}

function renderFiche(id) {
  const box = document.getElementById('fiche');
  if (!id) {
    box.innerHTML = `<h2>${INTRO.titre}</h2><p>${INTRO.texte}</p><p class="hint">${INTRO.conseil}</p>`;
    return;
  }
  const s = STRUCTURES[id];
  const num = ORDRE.indexOf(id) + 1;
  box.innerHTML = `
    <div class="fiche-head"><span class="num big" style="background:${s.couleur}">${num}</span><div><h2>${s.nom}</h2><div class="latin">${s.latin}</div></div></div>
    <p class="resume">${s.resume}</p>
    ${s.details?.length ? `<h3>Pour aller plus loin</h3><ul>${s.details.map((d) => `<li>${d}</li>`).join('')}</ul>` : ''}
    ${s.chiffres?.length ? `<div class="chiffres">${s.chiffres.map((c) => `<span>${c}</span>`).join('')}</div>` : ''}
    <button class="link" id="fiche-close">← Retour à la présentation</button>`;
  document.getElementById('fiche-close').addEventListener('click', () => select(null));
  box.scrollTop = 0;
}

function buildPanel() {
  const views = document.getElementById('views');
  Object.entries(VUES).forEach(([k, v]) => {
    const b = document.createElement('button');
    b.className = 'view-btn' + (k === 'anterieure' ? ' active' : '');
    b.dataset.view = k; b.textContent = v.label;
    b.addEventListener('click', () => goView(k));
    views.appendChild(b);
  });
  const list = document.getElementById('structures');
  GROUPES.forEach((g) => {
    const det = document.createElement('details');
    det.open = g.id === 'cavites';
    det.innerHTML = `<summary>${g.titre}</summary>`;
    const ul = document.createElement('div');
    ul.className = 'struct-list';
    ORDRE.filter((id) => STRUCTURES[id].groupe === g.id).forEach((id) => {
      const s = STRUCTURES[id];
      const b = document.createElement('button');
      b.className = 'struct-btn'; b.dataset.id = id;
      b.innerHTML = `<span class="num" style="background:${s.couleur}">${ORDRE.indexOf(id) + 1}</span>${s.nom}`;
      b.addEventListener('click', () => select(id));
      ul.appendChild(b);
    });
    det.appendChild(ul);
    list.appendChild(det);
  });
  document.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => toggle(b.dataset.toggle)));
  document.querySelectorAll('[data-cut]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-cut]').forEach((x) => x.classList.toggle('active', x === b));
    setCutMode(b.dataset.cut);
    if (b.dataset.cut === 'horizontale') goView('superieure');
  }));
  document.getElementById('cut-depth').addEventListener('input', (e) => { cutPlane.constant = parseFloat(e.target.value); updateCapPlanes(); });
  document.getElementById('panel-toggle').addEventListener('click', () => document.getElementById('panel').classList.toggle('open'));
  document.getElementById('panel-handle').addEventListener('click', () => document.getElementById('panel').classList.toggle('open'));
  renderFiche(null);
  // états initiaux
  ['battement', 'coronaires'].forEach((n) => { const b = document.querySelector(`[data-toggle="${n}"]`); b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); });
}
buildPanel();
setCutMode('grand-axe'); // coupe par défaut : plan du grand axe, montre VD en croissant, VG, septum et oreillettes
applyClipping();

/* ─────────── PWA ─────────── */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e;
  const b = document.getElementById('install'); b.classList.remove('hidden');
  b.addEventListener('click', async () => { deferredPrompt.prompt(); await deferredPrompt.userChoice; b.classList.add('hidden'); deferredPrompt = null; });
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

/* ─────────── boucle ─────────── */
function resize() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();
goView('anterieure', true);

// Masque les étiquettes dont le point d'ancrage est caché par le modèle.
const occRay = new THREE.Raycaster();
const occPos = new THREE.Vector3(), occDir = new THREE.Vector3();
function occludeLabels() {
  const visibles = pickables.filter((o) => o.visible && o.parent?.visible !== false);
  for (const id in labels) {
    const L = labels[id];
    if (!L.obj.visible && !state.etiquettes) continue;
    if (state.selected === id || state.circulation) { L.occluded = false; L.el.style.visibility = ''; continue; }
    L.obj.getWorldPosition(occPos);
    occDir.copy(occPos).sub(camera.position);
    const dist = occDir.length();
    occRay.set(camera.position, occDir.normalize());
    occRay.far = dist - 0.45;
    const hits = occRay.intersectObjects(visibles, false);
    const own = heart.registry[id]?.meshes || [];
    L.occluded = hits.some((h) => !own.includes(h.object) && !(state.coupe && cutPlane.distanceToPoint(h.point) < 0));
    L.el.style.visibility = L.occluded ? 'hidden' : '';
  }
}

const clock = new THREE.Clock();
const BPM = 68;
let frame = 0;
function beatScale(t) {
  const period = 60 / BPM;
  const ph = (t % period) / period;
  // systole ventriculaire ≈ 35 % du cycle : contraction rapide puis relâchement
  const sys = ph < 0.08 ? ph / 0.08 : ph < 0.3 ? 1 : ph < 0.42 ? 1 - (ph - 0.3) / 0.12 : 0;
  const e = sys * sys * (3 - 2 * sys);
  return 1 - 0.035 * e;
}
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  if (camAnim) {
    camAnim.t = Math.min(1, camAnim.t + dt * 1.6);
    const e = camAnim.t * camAnim.t * (3 - 2 * camAnim.t);
    camera.position.lerpVectors(camAnim.from, camAnim.to, e);
    if (camAnim.t >= 1) camAnim = null;
  }
  const s = state.battement ? beatScale(t) : 1;
  pivot.scale.setScalar(s);
  if (state.circulation) updateFlow(t);
  controls.update();
  if ((frame++ & 3) === 0) occludeLabels();
  if (state.etiquettes && (frame & 1) === 0) layoutPlanche();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

// Exposé pour le débogage et les tests pilotés
window.__planche = { scene, camera, heart, state, select, toggle, goView, setCutMode, renderer };
