import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHeart, COL } from './heart.js';
import { STRUCTURES, GROUPES, ORDRE, INTRO } from './data.js';

// Pastille numérotée : chiffre blanc sur couleur sombre, chiffre encre sur couleur claire (contraste ≥ 4,5 : 1).
function luminance(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // composantes déjà linéarisées par THREE.Color
}
function numHtml(id, big = false) {
  const s = STRUCTURES[id];
  const dark = luminance(s.couleur) > 0.35;
  return `<span class="num${big ? ' big' : ''}${dark ? ' dark' : ''}" style="background:${s.couleur}">${ORDRE.indexOf(id) + 1}</span>`;
}

/* ─────────── scène ─────────── */
const canvasWrap = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' });
// shader de tissu coûteux : densité de pixels plafonnée plus bas sur les écrans tactiles (téléphones, tablettes)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.NeutralToneMapping; // teintes pastel préservées, hautes lumières adoucies
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// ombres recalculées à la demande (lumières fixes) : au changement de mode, et une image sur trois pendant le battement
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
canvasWrap.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
canvasWrap.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6; // reflets de studio dans le film humide (vernis) des tissus

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
const CENTER = new THREE.Vector3(0, 3.0, -1.2);
const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.target.copy(CENTER);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 60;

// Éclairage « studio d'animation médicale » : clé douce et chaude en haut à gauche de l'observateur, remplissage froid,
// deux contre-jours qui détachent la silhouette du fond clair, hémisphère ciel / sol rosé (lumière renvoyée par les tissus).
const key = new THREE.DirectionalLight(0xfff3e6, 1.7);
key.position.set(7.5, 11, 9);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -16; key.shadow.camera.right = 16; key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
key.shadow.camera.near = 1; key.shadow.camera.far = 60;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.035; key.shadow.radius = 7;
const fill = new THREE.DirectionalLight(0xe4ecff, 0.9);
fill.position.set(-10, 4, 6);
const rim = new THREE.DirectionalLight(0xf2f6ff, 2.1);
rim.position.set(-6, 9, -14);
const rim2 = new THREE.DirectionalLight(0xfff0f0, 1.4);
rim2.position.set(9, -4, -10);
scene.add(key, key.target, fill, rim, rim2, new THREE.HemisphereLight(0xf2f6fc, 0xb08080, 0.95));

/* ─────────── cœur ─────────── */
const heart = await buildHeart();
canvasWrap.classList.add('ready');
const pivot = new THREE.Group();
pivot.position.copy(CENTER);
heart.root.position.copy(CENTER.clone().negate());
pivot.add(heart.root);
scene.add(pivot);
key.target.position.copy(CENTER);

// Ombres et « fantôme » de la partie retirée par la coupe (voile très léger qui garde la silhouette lisible).
const ghostMats = [], ghosts = [];
const ghostPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
{
  const toWrap = [];
  heart.root.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.userData.envelope && (!o.userData.id || o.userData.proxy || o.userData.cap || o.userData.leaf || o.material.side === THREE.BackSide)) return;
    o.castShadow = true; o.receiveShadow = true;
    if (heart.cutOnly.includes(o)) return; // structures intérieures (piliers, conduction) : pas de fantôme
    toWrap.push(o);
  });
  heart.materials.forEach((m) => { m.clipShadows = true; });
  toWrap.forEach((o) => {
    // les recouvrements s'additionnent, d'où une opacité basse
    const gm = new THREE.MeshBasicMaterial({ color: 0x5a3f42, transparent: true, opacity: 0.05, depthWrite: false, clippingPlanes: [ghostPlane] });
    heart.addDeform(gm, o.material.userData.uniforms?.uDK?.value ?? 0.07);
    const gh = new THREE.Mesh(o.geometry, gm);
    gh.visible = false; gh.userData.ghost = true;
    o.add(gh); ghostMats.push(gm); ghosts.push(gh);
  });
}
function syncGhost() { ghostPlane.normal.copy(cutPlane.normal).negate(); ghostPlane.constant = -cutPlane.constant; }

/* ─────────── coupe (plan de clipping + capuchons stencil) ─────────── */
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.4);
// Dans la coupe quatre cavités, valves et cordages sont coupés 0,6 cm plus loin : on les voit entiers devant la tranche,
// comme sur les planches et en animation médicale, au lieu d'une section plate. Les piliers sont coupés avec le muscle.
const interiorPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 2.0);
function syncInterior() { interiorPlane.normal.copy(cutPlane.normal); interiorPlane.constant = cutPlane.constant + interiorOff; }
let interiorOff = 0.6; // 0,6 cm en coupe quatre cavités, 0 dans les autres coupes (réglé par setCutMode)
// partie retirée par la coupe (en tenant compte du plan décalé des structures intérieures)
const isCutAway = (h) => state.coupe && (h.object.material?.userData?.interior ? interiorPlane : cutPlane).distanceToPoint(h.point) < 0;
const CUT_MODES = {
  frontale: { normal: new THREE.Vector3(0, 0, -1), min: -6, max: 6, def: 0.2 },
  horizontale: { normal: new THREE.Vector3(0, -1, 0), min: -5, max: 9, def: 0.0 },
  // plan « quatre cavités » : contient l'axe du cœur et passe par les valves mitrale et tricuspide (calculé à la génération)
  'grand-axe': (() => { const c = heart.cut4.normal.dot(heart.cut4.point); return { normal: heart.cut4.normal.clone().negate(), min: c - 4, max: c + 4, def: c }; })(),
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
  heart.addDeform(back, solid.k ?? 0.07); heart.addDeform(front, solid.k ?? 0.07); // le stencil suit le battement
  const m0 = new THREE.Mesh(solid.mesh.geometry, back); m0.renderOrder = order;
  const m1 = new THREE.Mesh(solid.mesh.geometry, front); m1.renderOrder = order;
  g.add(m0, m1);
  solid.mesh.add(g); // hérite de la transformation ; invisible quand le parent l'est
  return g;
}

// Regroupement par clé de capuchon (s.cap) : chaque groupe a sa passe de stencil et son capuchon coloré.
// 'fat' = enveloppe de graisse épicardique (masse − copie réduite), 'myo' = muscle (copie réduite − cavités),
// 'atr' = oreillettes − leurs cavités, 'artere' / 'veine' = lumière des vaisseaux (sang), 'conduction'.
const CAP_COLORS = { fat: COL.graisseCoupe, myo: COL.myocardeCoupe, atr: COL.oreilletteCoupe, artere: COL.lumenArtere, veine: COL.lumenVeine, conduction: COL.conduction };
const orderByCap = new Map();
let orderCursor = 100;
heart.solids.forEach((s) => {
  const capKey = String(s.cap ?? 'myo');
  if (!orderByCap.has(capKey)) { orderByCap.set(capKey, orderCursor); orderCursor += 3; }
  const order = orderByCap.get(capKey);
  s.stencil = makeStencilMeshes(s, order);
  s.stencil.visible = false;
  if (!capGroups.has(capKey)) {
    const color = CAP_COLORS[capKey] ?? parseInt(capKey, 10);
    const rank = orderByCap.size; // les groupes suivants passent devant en cas de chevauchement (décalage de polygone)
    // surface de coupe : même grain aquarelle que les parois (plan de 60 cm → répétition 14 ≈ 4 cm par plage), mate
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, envMapIntensity: 0.5, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp, polygonOffset: true, polygonOffsetFactor: -rank, polygonOffsetUnits: -rank });
    // tranche de coupe : grain fibreux et marbrure (muscle sectionné), plus satinée qu'un aplat
    if (capKey === 'myo' || capKey === 'fat') {
      mat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vW;
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn(vec3 p) { vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1,0,0)), u.x), mix(h13(i + vec3(0,1,0)), h13(i + vec3(1,1,0)), u.x), u.y),
             mix(mix(h13(i + vec3(0,0,1)), h13(i + vec3(1,0,1)), u.x), mix(h13(i + vec3(0,1,1)), h13(i + vec3(1,1,1)), u.x), u.y), u.z); }`)
          .replace('#include <color_fragment>', `#include <color_fragment>
  { float fib = vn(vec3(vW.x * 9.0, vW.y * 2.2, vW.z * 9.0)) * 0.6 + vn(vW * 22.0) * 0.4;
    float mot = vn(vW * 1.3 + 7.0);
    diffuseColor.rgb *= ${capKey === 'fat' ? '0.95 + 0.1 * vn(vW * 6.0)' : '0.84 + 0.2 * fib + 0.1 * (mot - 0.5)'}; }`);
      };
      mat.customProgramCacheKey = () => `tranche-${capKey}`;
    }
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
  syncInterior();
  const n = cutPlane.normal;
  capGroups.forEach((cap) => {
    cutPlane.coplanarPoint(cap.position);
    cap.lookAt(cap.position.clone().sub(n)); // face avant tournée vers la partie retirée (donc vers l'observateur)
  });
}

const state = { coupe: false, modeCoupe: 'grand-axe', circulation: false, battement: false, etiquettes: false, coronaires: true, selected: null, hovered: null, vue: 'anterieure' };

function applyClipping() {
  const planes = state.coupe ? [cutPlane] : [];
  syncInterior();
  heart.materials.forEach((m) => { m.clippingPlanes = m.userData.interior ? (state.coupe ? [interiorPlane] : []) : planes; m.needsUpdate = true; });
  ghosts.forEach((g) => { g.visible = state.coupe; });
  heart.solids.forEach((s) => { s.stencil.visible = state.coupe; });
  capGroups.forEach((cap) => { cap.visible = state.coupe; });
  heart.cutOnly.forEach((m) => { m.visible = state.coupe; });
  canvasWrap.classList.toggle('is-cut', state.coupe);
  renderer.shadowMap.needsUpdate = true;
  syncGhost();
  updateCapPlanes();
}

function setCutMode(mode, value) {
  state.modeCoupe = mode;
  interiorOff = mode === 'grand-axe' ? 0.6 : 0;
  const cfg = CUT_MODES[mode];
  const n = cfg.normal ? cfg.normal.clone() : localAnterior().negate();
  cutPlane.normal.copy(n);
  const slider = document.getElementById('cut-depth');
  slider.min = cfg.min; slider.max = cfg.max; slider.step = 0.1;
  slider.value = value ?? cfg.def;
  cutPlane.constant = parseFloat(slider.value) - cutPlaneOffset();
  renderer.shadowMap.needsUpdate = true;
  syncGhost();
  updateCapPlanes();
}
function localAnterior() { const v = new THREE.Vector3(); heart.matrixLocal.extractBasis(new THREE.Vector3(), new THREE.Vector3(), v); return v; }
// Le plan est exprimé dans le repère monde ; le cœur est translaté de -CENTER dans le pivot puis de +CENTER : net nul.
function cutPlaneOffset() { return 0; }

/* ─────────── circulation (particules) ─────────── */
const flowGroup = new THREE.Group();
heart.root.add(flowGroup);
const PER_PATH = 90;
const flowCurves = heart.flowPaths.map((p) => ({ curve: new THREE.CatmullRomCurve3(p.points, false, 'centripetal', 0.5), color: new THREE.Color(p.color), speed: p.speed }));
const flowCount = flowCurves.length * PER_PATH;
// Capsules orientées le long du trajet, matériau non éclairé (couleurs saturées qui dominent les parois translucides)
const capsuleGeo = new THREE.CapsuleGeometry(0.11, 0.35, 3, 8);
capsuleGeo.rotateX(Math.PI / 2); // axe de la capsule sur +z → orientée par lookAt
const flowMesh = new THREE.InstancedMesh(capsuleGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), flowCount);
flowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
const flowPhase = new Float32Array(flowCount), flowSize = new Float32Array(flowCount);
{
  const c = new THREE.Color();
  for (let i = 0; i < flowCount; i++) {
    const pi = Math.floor(i / PER_PATH);
    flowPhase[i] = Math.random();
    flowSize[i] = 0.85 + Math.random() * 0.3;
    c.copy(flowCurves[pi].color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
    flowMesh.setColorAt(i, c);
  }
}
flowMesh.visible = false;
flowGroup.add(flowMesh);
const tmpM = new THREE.Matrix4(), tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpT = new THREE.Vector3(), tmpLook = new THREE.Matrix4();
function updateFlow(time) {
  for (let i = 0; i < flowCount; i++) {
    const pc = flowCurves[Math.floor(i / PER_PATH)];
    const t = (flowPhase[i] + time * pc.speed) % 1;
    pc.curve.getPointAt(t, tmpP);
    pc.curve.getTangentAt(t, tmpT);
    tmpLook.lookAt(tmpT, new THREE.Vector3(0, 0, 0), THREE.Object3D.DEFAULT_UP);
    tmpQ.setFromRotationMatrix(tmpLook);
    tmpS.setScalar(flowSize[i]);
    tmpM.compose(tmpP, tmpQ, tmpS);
    flowMesh.setMatrixAt(i, tmpM);
  }
  flowMesh.instanceMatrix.needsUpdate = true;
}
function setTranslucent(on) {
  heart.materials.forEach((m) => {
    if (m.userData.noTranslucent) return;
    m.transparent = on;
    // graisse et coronaires presque effacées (0,10–0,14) pour ne pas brouiller les trajets ; parois 0,26–0,30
    m.opacity = on ? (m.userData.flowOpacity ?? 0.3) : 1;
    m.depthWrite = !on;
    if (m.side !== THREE.BackSide) m.side = on ? THREE.FrontSide : THREE.DoubleSide; // une seule couche par paroi
    m.needsUpdate = true;
  });
  renderer.toneMappingExposure = on ? 0.95 : 1.0;
  canvasWrap.classList.toggle('is-flow', on);
}

/* ─────────── étiquettes ─────────── */
const labels = {};
ORDRE.forEach((id, i) => {
  const s = STRUCTURES[id];
  const entry = heart.registry[id];
  if (!entry || !entry.anchor) return;
  const el = document.createElement('div');
  el.className = 'label';
  el.innerHTML = `${numHtml(id)}<span class="txt">${s.nom}</span>`;
  el.addEventListener('pointerdown', (e) => { e.stopPropagation(); select(id); });
  const obj = new CSS2DObject(el);
  obj.center.set(0, 0.5); // ancre au bord gauche de la pastille (le trait de rappel part de l'ancre)
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
  el.innerHTML = `${numHtml(id)}<span class="txt">${STRUCTURES[id].nom}</span>`;
  el.addEventListener('click', () => select(id));
  planche.appendChild(el);
  plabels[id] = el;
});
const projP = new THREE.Vector3();
function layoutPlanche() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  const narrow = w < 700; // téléphone : numéros seuls au bout des lignes, la clé est dans le tiroir « Structures »
  const items = [];
  for (const id in labels) {
    const L = labels[id];
    const show = (!L.coupe || state.coupe) && !L.occluded && !(state.selected === id);
    if (!show) { plabels[id].style.display = 'none'; continue; }
    L.obj.getWorldPosition(projP).project(camera);
    if (projP.z > 1) { plabels[id].style.display = 'none'; continue; }
    items.push({ id, sx: (projP.x + 1) / 2 * w, sy: (1 - projP.y) / 2 * h });
  }
  // pas vertical ≥ hauteur d'une étiquette (30 px sur bureau, 20 px pour les pastilles seules) : plus de boîtes qui se touchent
  const gap = narrow ? 22 : 31, top = narrow ? 100 : 110, bottom = h - 70;
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
      el.classList.toggle('numonly', narrow);
      el.classList.toggle('hover', state.hovered === it.id);
      const ex = side === 0 ? 16 + el.offsetWidth : w - 16 - el.offsetWidth;
      const kx = side === 0 ? ex + 14 : ex - 14;
      const pts = `${ex},${ys[k]} ${kx},${ys[k]} ${it.sx},${it.sy}`;
      svg += `<polyline class="halo" points="${pts}"/><polyline class="line" points="${pts}"/><circle cx="${it.sx}" cy="${it.sy}" r="2.4"/>`;
    });
  });
  leaders.innerHTML = svg;
}

/* ─────────── sélection / surbrillance ─────────── */
// La surbrillance (éclaircissement + liseré lumineux) est calculée dans le shader des tissus (voir heart.js).
function highlight(id) { heart.setHighlight(id); }
function select(id) {
  if (id && !STRUCTURES[id]) id = null; // pièce sans fiche
  state.selected = id;
  highlight(id);
  renderFiche(id);
  refreshLabels();
  document.querySelectorAll('.struct-btn').forEach((b) => {
    const on = b.dataset.id === id;
    b.classList.toggle('active', on);
    if (on) b.closest('details').open = true; // pas de défilement : la fiche doit rester lisible en haut du panneau
  });
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
    if (isCutAway(h)) continue; // partie retirée par la coupe
    if (h.object.material.transparent && h.object.material.opacity < 0.5 && !state.circulation) continue;
    return { id: heart.pickId(h.object, h.point, h.face), point: h.point };
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
function viewDistance() { const a = camera.aspect > 0 && Number.isFinite(camera.aspect) ? camera.aspect : 1.3; return 44 * Math.max(1, 1.2 / a) * (state.etiquettes ? 1.2 : 1); } // recul en mode planche : place pour les colonnes
// Regarde le cœur depuis une direction quelconque (coupe quatre cavités : on regarde le plan de face)
function goDir(dir, instant = false) {
  const to = CENTER.clone().add(dir.clone().normalize().multiplyScalar(viewDistance()));
  if (instant) { camera.position.copy(to); camAnim = null; } else camAnim = { from: camera.position.clone(), to, t: 0 };
  document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
}
function goView(name, instant = false) {
  const v = VUES[name];
  state.vue = name;
  const to = CENTER.clone().add(new THREE.Vector3(...v.dir).normalize().multiplyScalar(viewDistance()));
  if (instant) { camera.position.copy(to); camAnim = null; }
  else camAnim = { from: camera.position.clone(), to, t: 0 };
  document.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}

function toggle(name, value) {
  state[name] = value ?? !state[name];
  renderer.shadowMap.needsUpdate = true;
  const btn = document.querySelector(`[data-toggle="${name}"]`);
  if (btn) { btn.classList.toggle('on', state[name]); btn.setAttribute('aria-pressed', String(state[name])); }
  if (name === 'coupe') { if (state.coupe && state.modeCoupe === 'grand-axe') goDir(heart.cut4.normal); applyClipping(); document.getElementById('cut-tools').classList.toggle('hidden', !state.coupe); if (!state.coupe && state.selected && STRUCTURES[state.selected]?.coupe) select(null); }
  if (name === 'circulation') { setTranslucent(state.circulation); flowMesh.visible = state.circulation; }
  if (name === 'coronaires') { ['coronaire-droite', 'tronc-commun', 'iva', 'circonflexe', 'sinus-coronaire', 'grande-veine-cardiaque', 'veine-cardiaque-moyenne', 'petites-veines-cardiaques'].forEach((id) => (heart.registry[id]?.meshes || []).forEach((m) => { m.visible = state.coronaires; })); }
  if (name === 'etiquettes') { refreshLabels(); goView(state.vue); }
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
    <div class="fiche-head">${numHtml(id, true)}<div><h2>${s.nom}</h2><div class="latin">${s.latin}</div></div></div>
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
      b.innerHTML = `${numHtml(id)}${s.nom}`;
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
    else if (b.dataset.cut === 'grand-axe') goDir(heart.cut4.normal);
    else goView('anterieure');
  }));
  document.getElementById('cut-depth').addEventListener('input', (e) => { cutPlane.constant = parseFloat(e.target.value); renderer.shadowMap.needsUpdate = true; syncGhost(); updateCapPlanes(); });
  document.getElementById('panel-toggle').addEventListener('click', () => document.getElementById('panel').classList.toggle('open'));
  document.getElementById('panel-handle').addEventListener('click', () => document.getElementById('panel').classList.toggle('open'));
  renderFiche(null);
  // états initiaux (le battement est désactivé par défaut : le patient voit d'abord une planche)
  ['coronaires'].forEach((n) => { const b = document.querySelector(`[data-toggle="${n}"]`); b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); });
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
  if (!w || !h) return; // scène pas encore disposée (onglet masqué) : on attendra l'événement resize
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
}
window.addEventListener('resize', resize);
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvasWrap);
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
    // étiquette flottante : à gauche du point si l'on est près du bord droit de la scène
    const px = (occPos.clone().project(camera).x + 1) / 2 * canvasWrap.clientWidth;
    const flip = px > canvasWrap.clientWidth - 200;
    L.el.classList.toggle('flip', flip);
    L.obj.center.set(flip ? 1 : 0, 0.5);
    occDir.copy(occPos).sub(camera.position);
    const dist = occDir.length();
    occRay.set(camera.position, occDir.normalize());
    occRay.far = dist - 0.45;
    const hits = occRay.intersectObjects(visibles, false);
    L.occluded = hits.some((h) => heart.pickId(h.object, h.point, h.face) !== id && !isCutAway(h));
    L.el.style.visibility = L.occluded ? 'hidden' : '';
  }
}

// Repère d'orientation : indique ce qui est à gauche et à droite de l'écran selon le point de vue
// (patient vu de face : sa droite à gauche de l'écran ; de dos : l'inverse ; de profil : avant / arrière).
const orientEl = document.querySelector('.orient');
const camRight = new THREE.Vector3();
let orientTxt = '';
function updateOrientation() {
  camRight.setFromMatrixColumn(camera.matrixWorld, 0); // direction « droite de l'écran » dans le repère du patient
  let txt;
  if (Math.abs(camRight.x) >= Math.abs(camRight.z)) txt = camRight.x > 0 ? '<b>D</b> ← patient → <b>G</b>' : '<b>G</b> ← patient → <b>D</b>';
  else txt = camRight.z > 0 ? '<b>Arrière</b> ← patient → <b>Avant</b>' : '<b>Avant</b> ← patient → <b>Arrière</b>';
  if (txt !== orientTxt) { orientEl.innerHTML = txt; orientTxt = txt; }
}

const clock = new THREE.Clock();
const BPM = 64;
let beatIdle = true;
let frame = 0;
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
  // battement physiologique : cycle complet (≈ 64 battements par minute) ; au repos, planche figée en diastole
  if (state.battement) { heart.setBeat((t % (60 / BPM)) / (60 / BPM), { valves: state.coupe }); beatIdle = false; if (frame % 3 === 0) renderer.shadowMap.needsUpdate = true; }
  else if (!beatIdle) { heart.setBeat(null); beatIdle = true; renderer.shadowMap.needsUpdate = true; }
  if (state.circulation) updateFlow(t);
  controls.update();
  if ((frame & 7) === 0) updateOrientation();
  if ((frame++ & 3) === 0) occludeLabels();
  if (state.etiquettes && (frame & 1) === 0) layoutPlanche();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

// Exposé pour le débogage et les tests pilotés
window.__planche = { scene, camera, controls, heart, state, select, toggle, goView, setCutMode, renderer };
