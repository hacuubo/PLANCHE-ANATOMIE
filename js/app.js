import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHeart, COL, GLSL_ROOTS } from './heart.js';
import { ContactShadows } from './contact-shadows.js';
import { sectionMaterial, setSectionPlane, setSectionFrame } from './cut-surface.js';
import { buildAorticView } from './aortic-view.js';
import { buildAVView } from './av-views.js';
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
// antialiasing assuré par la cible multi-échantillonnée des ombres de contact (js/contact-shadows.js)
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, stencil: true, powerPreference: 'high-performance' });
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
const hemi = new THREE.HemisphereLight(0xf2f6fc, 0xb08080, 0.95);
scene.add(key, key.target, fill, rim, rim2, hemi);
// lumières sur tous les calques : le calque d'interface (flèches) partage l'état d'éclairage, pas de recompilation
[key, fill, rim, rim2, hemi].forEach((l) => l.layers.enableAll());

/* ─────────── cœur ─────────── */
const heart = await buildHeart();
canvasWrap.classList.add('ready');
const pivot = new THREE.Group();
pivot.position.copy(CENTER);
heart.root.position.copy(CENTER.clone().negate());
pivot.add(heart.root);
scene.add(pivot);
key.target.position.copy(CENTER);

// Vues chirurgicales des valves, dans le cœur (aortique, mitrale, tricuspide ; normale et pathologique)
const VALVE_VIEWS = { aortique: buildAorticView(heart), mitrale: buildAVView(heart, 'mitrale'), tricuspide: buildAVView(heart, 'tricuspide') };

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
    const gm = new THREE.MeshBasicMaterial({ color: 0x5a3f42, transparent: true, opacity: 0.09, depthWrite: false, clippingPlanes: [ghostPlane] });
    heart.addDeform(gm, o.material.userData.uniforms?.uDK?.value ?? 0.07, 'ghost');
    const gh = new THREE.Mesh(o.geometry, gm);
    gh.visible = false; gh.userData.ghost = true;
    o.add(gh); ghostMats.push(gm); ghosts.push(gh);
  });
}
function syncGhost() { ghostPlane.normal.copy(cutPlane.normal).negate(); ghostPlane.constant = -cutPlane.constant; }

/* ─────────── coupe (plan de clipping ou surface courbe + capuchons stencil) ─────────── */
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.4);
// Dans les coupes du grand axe, valves et cordages sont coupés 0,6 cm plus loin : on les voit entiers devant la tranche,
// comme sur les planches et en animation médicale, au lieu d'une section plate. Les piliers sont coupés avec le muscle.
const interiorPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 2.0);
function syncInterior() {
  interiorPlane.normal.copy(cutPlane.normal); interiorPlane.constant = cutPlane.constant + interiorOff;
  heart.cutUniforms.uCutOffI.value = interiorOff;
}
let interiorOff = 0.6; // 0,6 cm en coupes 5 cavités et frontale, 1,5 cm dans les vues des valves (setCutMode)
let curved = false;    // coupe courbe active (5 cavités)
// partie retirée par la coupe (en tenant compte du décalage des structures intérieures)
const isCutAway = (h) => {
  if (!state.coupe) return false;
  const inner = h.object.material?.userData?.interior;
  if (curved) return CURVE.field(h.point, inner ? interiorOff : 0) < 0;
  return (inner ? interiorPlane : cutPlane).distanceToPoint(h.point) < 0;
};
const CUT_MODES = {
  frontale: { normal: new THREE.Vector3(0, 0, -1), min: -6, max: 6, def: 0.2 },
};
// Repères échographiques (heart.landmarks) : pointe, centres et axes des valves
const LM = heart.landmarks, VMI = LM.valves['valve-mitrale'], VTR = LM.valves['valve-tricuspide'], VAO = LM.valves['valve-aortique'], VPU = LM.valves['valve-pulmonaire'];
// « Frontale » : plan frontal à peine incliné (≈ 6°) pour contenir l'axe de la racine aortique, et placé par défaut au
// centre de la valve aortique : voie d'éjection du VG, cuspides coupées en leur milieu (de profil), sinus et aorte
// ascendante dans le même plan.
{
  const n = new THREE.Vector3(0, 0, -1); n.addScaledVector(VAO.axis, -n.dot(VAO.axis)).normalize();
  Object.assign(CUT_MODES.frontale, { normal: n, def: Math.round(-n.dot(VAO.center) * 10) / 10 });
}
// « 5 cavités » : coupe échographique 5 cavités (pointe, chambre de chasse et valve aortique) rendue exacte pour les
// valves mitrale et tricuspide. Le plan 5 cavités passe par le centre de la valve aortique mais 2 cm en avant de la
// mitrale et de la tricuspide (leurs feuillets antérieurs seulement). La tranche suit donc ce plan et se creuse en
// pente douce autour des deux valves auriculo-ventriculaires jusqu'au plan 4 cavités (pointe, mitrale, tricuspide) :
// les trois valves sont coupées en leur milieu (à ≈ 2 mm près), feuillets de profil, avec les cinq cavités ouvertes.
// La valve pulmonaire, en avant de l'aorte, n'y figure pas.
// Surface : z = h(x, y) dans le repère de l'écran de la coupe (x à droite, y vers la base, z vers l'observateur) ;
// h mêle le plan de fond et des plans locaux autour de chaque valve (poids exp(−(d/σ)^e)) : voir cutU dans heart.js.
function buildCurve({ V, fond, locaux, S, up }) {
  const Y = (up ?? LM.base.clone().sub(LM.apex)).clone().projectOnPlane(V).normalize(); // par défaut, base du cœur en haut de l'écran
  const XS = new THREE.Vector3().crossVectors(Y, V);
  const O = fond[0].clone();
  const loc = (p) => { const q = p.clone().sub(O); return [q.dot(XS), q.dot(Y), q.dot(V)]; };
  const lv = (n) => [n.dot(XS), n.dot(Y), n.dot(V)];
  // plan passant par c (repère de l'écran) de normale n (monde) : z = a + b x + c y
  const planeAt = (c, n) => { const [nx, ny, nz] = lv(n); return [c[2] + (nx * c[0] + ny * c[1]) / nz, -nx / nz, -ny / nz]; };
  const bg = planeAt(loc(fond[0]), new THREE.Vector3().crossVectors(fond[1].clone().sub(fond[0]), fond[2].clone().sub(fond[0])));
  const C = locaux.map(([p]) => loc(p)), PL = locaux.map(([, n], i) => planeAt(C[i], n));
  while (C.length < 4) { C.push([1e4, 1e4, 0]); PL.push(bg); } // plans locaux inutilisés : hors d'atteinte
  const height = (x, y) => {
    let h = bg[0] + bg[1] * x + bg[2] * y, ws = 1;
    C.forEach((p, i) => { const w = S[2] * Math.exp(-((Math.hypot(x - p[0], y - p[1]) / S[0]) ** S[1])); h += w * (PL[i][0] + PL[i][1] * x + PL[i][2] * y); ws += w; });
    return h / ws;
  };
  const cv = { V, Y, X: XS, O, loc, height, off: 0 };
  cv.field = (p, extra = 0) => { const [x, y, z] = loc(p); return height(x, y) + cv.off + extra - z; };
  // uniformes des shaders (heart.cutUniforms)
  const u = heart.cutUniforms;
  u.uCutO.value.copy(O); u.uCutX.value.copy(XS); u.uCutY.value.copy(Y); u.uCutV.value.copy(V); u.uCutAB.value.set(...bg);
  C.forEach((p, i) => { u.uCutC.value[i].set(p[0], p[1]); u.uCutP.value[i].set(...PL[i]); }); u.uCutS.value.set(...S);
  return cv;
}
const CURVE_5C = (() => {
  const T = VTR.center, M = VMI.center, Ao = VAO.center, X = LM.apex;
  const n4 = new THREE.Vector3().crossVectors(M.clone().sub(T), X.clone().sub(T)).normalize();
  const n5 = new THREE.Vector3().crossVectors(M.clone().sub(T), Ao.clone().sub(X)).normalize();
  if (n5.dot(heart.cut4.normal) < 0) n5.negate();
  return { V: n5, fond: [X, Ao, Ao.clone().add(M).sub(T)], locaux: [[M, n4], [T, n4], [Ao, n5]], S: [1.4, 4, 100] }; // centres à ≤ 2 mm près
})();
let CURVE = buildCurve(CURVE_5C);
CUT_MODES['cinq-cavites'] = { curved: CURVE_5C, min: -3, max: 3, def: 0 };
// valves et cordages coupés plus loin que le muscle : entiers devant la tranche (vues des valves : feuillets fermés
// bombés vers l'oreillette, jamais percés par le plan ; voir plus bas)
const INTERIOR_OFF = { 'cinq-cavites': 0.6, frontale: 0.6 };
// vues des valves : pas de voile de la partie retirée entre l'œil et la valve (complété plus bas)
const NO_GHOST = new Set();
// direction de l'observateur pour une coupe (côté retiré)
const cutViewDir = (mode = state.modeCoupe) => (CUT_MODES[mode].curved ? CUT_MODES[mode].curved.V.clone() : cutPlane.normal.clone().negate());
// Pose au repos : valves auriculo-ventriculaires ouvertes (diastole) ; vue d'une valve : position choisie
function restPose() {
  if (state.battement) return;
  const v = state.valve && VALVE_VIEWS[state.valve];
  // vue d'une valve, cœur arrêté : position choisie (ouverte ou fermée) pour la valve regardée
  if (v) { heart.setPose({ atr: 0, ven: 0, av: v.phase === 'av' && valveOpen ? 1 : 0, sl: v.phase === 'sl' && valveOpen ? 1 : 0 }); if (!trans) valveCut(v, 0); }
  else heart.setBeat(null);
  renderer.shadowMap.needsUpdate = true;
}
// Cadrage de chaque coupe (onlyOriented : à l'ouverture de la coupe, seules les coupes « échographiques » déplacent la caméra)
function viewForCut(mode, onlyOriented = false) {
  if (mode === 'cinq-cavites') goDir(CURVE.V, { up: CURVE.Y, dist: viewDistance() * 0.72 }); // cœur plus grand : la coupe se lit mieux
  else if (onlyOriented) { if (camera.up.y < 0.99) goView('anterieure'); }
  else goView('anterieure');
}
function chooseCut(mode) {
  document.querySelectorAll('[data-cut]').forEach((x) => x.classList.toggle('active', x.dataset.cut === mode));
  setCutMode(mode);
  if (state.coupe) viewForCut(mode);
  restPose();
}
const stencilGroup = new THREE.Group();
stencilGroup.name = 'stencil';
heart.root.add(stencilGroup);
const capGroups = new Map(); // clé de capuchon → [tranche plane, tranche courbe]
const stencilMats = [];

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
  stencilMats.push(back, front);
  solid.mesh.add(g); // hérite de la transformation ; invisible quand le parent l'est
  return g;
}

// Tranche courbe : grille de 26 cm posée sur la surface de coupe (recalculée quand la profondeur change)
const curveGeo = new THREE.PlaneGeometry(26, 26, 130, 130);
const curveGrid = Float32Array.from(curveGeo.attributes.position.array);
function updateCurveGeo() {
  const pos = curveGeo.attributes.position, c = CURVE.loc(CENTER), p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = c[0] + curveGrid[i * 3], y = c[1] + curveGrid[i * 3 + 1];
    p.copy(CURVE.O).addScaledVector(CURVE.X, x).addScaledVector(CURVE.Y, y).addScaledVector(CURVE.V, CURVE.height(x, y) + CURVE.off);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  curveGeo.computeVertexNormals(); curveGeo.computeBoundingSphere();
}

// Regroupement par clé de capuchon (s.cap) : chaque groupe a sa passe de stencil et sa tranche (plane ou courbe).
// 'myo' = muscle et parois (copie réduite − cavités), 'artere' / 'veine' = lumière des vaisseaux (sang), 'conduction'.
const CAP_COLORS = { artere: COL.lumenArtere, veine: COL.lumenVeine, conduction: COL.conduction };
// Racines aortique et pulmonaire ouvertes (GLSL_ROOTS, js/heart.js) : la tranche de sang s'arrête au cylindre de
// chaque racine ; une coupe qui passe par la valve laisse voir ses cuspides et l'intima de la paroi opposée, comme sur
// une pièce ouverte, au lieu d'un aplat de sang qui les cache. La paroi coupée garde sa tranche (la lumière est un
// creux dans la tranche du muscle et des parois).
function withRootHoles(mat) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, heart.rootUniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHoleW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHoleW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHoleW;\n${GLSL_ROOTS}`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (inRoot(vHoleW, 0.0)) discard;');
  };
  const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => key() + '|racines';
  return mat;
}
// Compteur de stencil centré sur 128 : solides +1, creux −1. La tranche n'est posée que si le compte est positif ;
// là où deux creux se chevauchent (cavité du VG et lumière aortique dans la chambre de chasse), le compte tombe sous
// zéro, ce qui, sur 8 bits et centré sur 0, aurait donné 255 et une tranche de muscle en plein sang.
const STENCIL_BASE = 128;
renderer.state.buffers.stencil.setClear(STENCIL_BASE);
const STENCIL_CAP = { stencilWrite: true, stencilRef: STENCIL_BASE, stencilFunc: THREE.LessStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp };
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
    // muscle : tranche réaliste (fibres, endocarde, épicarde, js/cut-surface.js) ; sang et conduction : teinte unie
    const mat = () => (capKey === 'myo' ? sectionMaterial(heart, { stencil: STENCIL_CAP, rank })
      : (capKey === 'artere' ? withRootHoles : (m) => m)(new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, envMapIntensity: 0.5, ...STENCIL_CAP, polygonOffset: true, polygonOffsetFactor: -rank, polygonOffsetUnits: -rank })));
    const caps = [new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat()), new THREE.Mesh(curveGeo, mat())];
    for (const cap of caps) {
      cap.renderOrder = order + 1; cap.visible = false; cap.userData.capKey = capKey;
      cap.onAfterRender = (r) => r.clearStencil();
      scene.add(cap);
    }
    caps[1].frustumCulled = false;
    capGroups.set(capKey, caps);
  }
});

function updateCapPlanes() {
  syncInterior();
  const n = cutPlane.normal;
  capGroups.forEach(([flat, curve]) => {
    cutPlane.coplanarPoint(flat.position);
    flat.lookAt(flat.position.clone().sub(n)); // face avant tournée vers la partie retirée (donc vers l'observateur)
    setSectionPlane(flat.material, n.clone().negate());
    setSectionFrame(curve.material, CURVE.X, CURVE.Y);
  });
}

const state = { coupe: false, modeCoupe: 'cinq-cavites', battement: true, coronaires: true, selected: null, hovered: null, vue: 'anterieure', valve: null };

function applyClipping() {
  const cut = state.coupe, flat = cut && !curved;
  const planes = flat ? [cutPlane] : [];
  syncInterior();
  heart.cutUniforms.uCutOn.value = cut && curved ? 1 : 0;
  heart.materials.forEach((m) => { m.clippingPlanes = m.userData.interior ? (flat ? [interiorPlane] : []) : planes; m.needsUpdate = true; });
  stencilMats.forEach((m) => { m.clippingPlanes = planes; m.needsUpdate = true; });
  ghostMats.forEach((m) => { m.clippingPlanes = flat ? [ghostPlane] : []; m.needsUpdate = true; });
  ghosts.forEach((g) => { g.visible = cut && !NO_GHOST.has(state.modeCoupe); }); // vue de dessus : rien entre l'œil et les valves
  heart.solids.forEach((s) => { s.stencil.visible = cut; });
  capGroups.forEach(([f, c]) => { f.visible = flat; c.visible = cut && curved; });
  heart.cutOnly.forEach((m) => { m.visible = cut && (!m.userData.ostium || state.coronaires); }); // orifice du sinus : avec les coronaires
  heart.showValves(cut);
  canvasWrap.classList.toggle('is-cut', state.coupe);
  renderer.shadowMap.needsUpdate = true;
  syncGhost();
  updateCapPlanes();
}

function setCutMode(mode, value) {
  state.modeCoupe = mode;
  interiorOff = INTERIOR_OFF[mode] ?? 0;
  ghosts.forEach((g) => { g.visible = state.coupe && !NO_GHOST.has(mode); });
  const cfg = CUT_MODES[mode], was = curved;
  curved = !!cfg.curved;
  if (curved) CURVE = buildCurve(cfg.curved);
  if (!curved) cutPlane.normal.copy(cfg.normal ? cfg.normal : localAnterior().negate());
  const slider = document.getElementById('cut-depth');
  slider.min = cfg.min; slider.max = cfg.max; slider.step = 0.1;
  slider.value = value ?? cfg.def;
  setCutDepth(parseFloat(slider.value));
  if (was !== curved) applyClipping(); // plan ↔ surface courbe : matériaux à recompiler (nombre de plans)
}
// Profondeur : déplace le plan, ou la surface courbe vers l'observateur
function setCutDepth(v) {
  if (curved) { CURVE.off = v; heart.cutUniforms.uCutOff.value = v; updateCurveGeo(); }
  else cutPlane.constant = v - cutPlaneOffset();
  renderer.shadowMap.needsUpdate = true;
  syncGhost();
  updateCapPlanes();
}
function localAnterior() { const v = new THREE.Vector3(); heart.matrixLocal.extractBasis(new THREE.Vector3(), new THREE.Vector3(), v); return v; }
// Le plan est exprimé dans le repère monde ; le cœur est translaté de -CENTER dans le pivot puis de +CENTER : net nul.
function cutPlaneOffset() { return 0; }

// Calque d'interface (dessiné après les ombres de contact, sans ombrage)
const OVERLAY_LAYER = 1;
// vues des valves : valve centrée sous le panneau des réglages (projection décalée, la cible reste sur la valve)
function viewOffset() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  if (state.valve && w && h) {
    const top = document.querySelector('.tools').getBoundingClientRect().bottom - canvasWrap.getBoundingClientRect().top;
    camera.setViewOffset(w, h, 0, -Math.max(0, top) / 2, w, h);
  } else camera.clearViewOffset();
}

/* ─────────── vues des valves : zoom dans le cœur ─────────── */
// Chaque vue est tirée du cœur lui-même : depuis la vue en cours, la caméra plonge vers la valve en pivotant jusqu'à la
// vue chirurgicale, pendant que la coupe descend jusqu'au-dessus de l'anneau (oreillette ou aorte retirées). La valve
// normale est celle du cœur ; une variante pathologique prend sa place (js/av-views.js, js/aortic-view.js) et bat avec
// lui. D'une valve à l'autre : la caméra passe directement d'une vue à l'autre en reculant un peu ; la coupe remonte, puis
// redescend sur la nouvelle valve. Au retour, la caméra revient à la vue de départ et la coupe d'origine est rétablie.
let valvePanel = false; // panneau du choix des valves ouvert (sans valve choisie : la vue ne bouge pas)
let valveOpen = false, trans = null, beforeValve = null;
// Côté d'observation : C (chirurgical, depuis l'oreillette ou l'aorte) ou V (ventriculaire, côté opposé)
let valveSide = 'C';
const sideOf = (v, side = valveSide) => v.sides[side];
for (const v of Object.values(VALVE_VIEWS)) for (const [side, sd] of Object.entries(v.sides)) {
  const mode = `v-${v.key}-${side}`;
  CUT_MODES[mode] = { normal: sd.cut.normal, min: sd.cut.def - 8, max: sd.cut.def + 16, def: sd.cut.def };
  INTERIOR_OFF[mode] = sd.interior; NO_GHOST.add(mode);
}
const FAR = 15; // coupe repoussée hors du cœur (rien n'est retiré)
// états de caméra : cible, direction (de la cible vers l'œil), distance, verticale
const camSt = () => { const off = camera.position.clone().sub(controls.target); return { target: controls.target.clone(), dir: off.clone().normalize(), dist: off.length(), up: camera.up.clone() }; };
const portrait = () => Math.max(1, 0.95 / camera.aspect);
const closeCam = (v, side = valveSide) => { const sd = sideOf(v, side); return { target: sd.center.clone(), dir: sd.camDir.clone(), dist: sd.dist * portrait(), up: sd.up.clone() }; };
const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _d = new THREE.Vector3(), _u = new THREE.Vector3();
function applyCam(a, b, e) {
  controls.target.lerpVectors(a.target, b.target, e);
  _q.setFromUnitVectors(a.dir, b.dir); _qi.identity().slerp(_q, e);
  _d.copy(a.dir).applyQuaternion(_qi);                       // la caméra tourne autour de la cible (ne traverse pas le cœur)
  camera.position.copy(controls.target).addScaledVector(_d, a.dist * Math.pow(b.dist / a.dist, e));
  _u.copy(a.up).lerp(b.up, e); if (_u.lengthSq() < 1e-6) _u.copy(Y_UP);
  setCameraUp(_u.normalize());
  camera.lookAt(controls.target);
}
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let pendingAction = null; // action demandée pendant une transition : exécutée à la fin
const debug = { transScale: 1 };
function runSteps(steps, done) {
  steps.forEach((s) => { s.dur *= 2; }); // zoom lent : le patient suit où l'on va
  if (reduced.matches) steps.forEach((s) => { s.dur *= 0.35; }); // mouvement réduit : transitions brèves
  steps.forEach((s) => { s.dur *= debug.transScale; }); // tests pilotés : transitions accélérées
  camAnim = null; trans = { steps, i: 0, t: 0, done }; controls.enabled = false; startStep();
}
function startStep() { const s = trans.steps[trans.i]; s.from = camSt(); s.onStart?.(); }
function stepTrans(dt) {
  const s = trans.steps[trans.i];
  trans.t = Math.min(1, trans.t + Math.min(dt, 0.25) / s.dur); // appareil lent : la transition garde sa durée
  const e = easeIO(trans.t);
  applyCam(s.from, s.to(), e);
  if (s.pull) camera.position.sub(controls.target).multiplyScalar(1 + s.pull * Math.sin(Math.PI * e)).add(controls.target); // recul à mi-parcours
  s.onUpdate?.(e);
  renderer.shadowMap.needsUpdate = true;
  if (trans.t < 1) return;
  s.onEnd?.();
  trans.i++; trans.t = 0;
  if (trans.i < trans.steps.length) startStep();
  else {
    const done = trans.done; trans = null; camAnim = null; controls.enabled = true; controls.update();
    done?.();
    const p = pendingAction; pendingAction = null; p?.();
  }
}
// Coupe d'une vue de valve, à la profondeur def + off (off = FAR : rien n'est retiré). Elle suit la valve pendant le
// battement (la base descend de 13 à 23 mm en systole) : profondeur recalculée sur le centre déformé de la valve.
const _vc = new THREE.Vector3();
function valveCut(v, off, side = valveSide) {
  const sd = sideOf(v, side);
  heart.deformPoint(_vc.copy(sd.center));
  const depth = sd.cut.def + off - sd.cut.normal.dot(_vc.sub(sd.center)), mode = `v-${v.key}-${side}`;
  const wasOn = state.coupe, wasCurved = curved;
  state.coupe = true;
  if (state.modeCoupe !== mode) setCutMode(mode, depth); else setCutDepth(depth);
  if (!wasOn && wasCurved === curved) applyClipping(); // une seule mise à jour des matériaux
  document.getElementById('cut-tools').classList.add('hidden');
}
// Passe à la valve « key » depuis la vue en cours (ou d'une valve à une autre) ; key = null : retour à la vue de départ.
// after : appelé à la fin.
function goValve(key, after) {
  if (trans) { pendingAction = () => goValve(key, after); return; }
  const from = state.valve;
  if (from === key) { after?.(); return; }
  // vue de départ : celle où l'on se trouve (ou celle vers laquelle la caméra se dirigeait)
  const startCam = () => (camAnim ? { target: camAnim.tTo.clone(), dir: camAnim.to.clone().sub(camAnim.tTo).normalize(), dist: camAnim.to.distanceTo(camAnim.tTo), up: camAnim.uTo.clone() } : camSt());
  if (!from) beforeValve = { cam: startCam(), coupe: state.coupe, mode: state.modeCoupe, depth: parseFloat(document.getElementById('cut-depth').value) };
  if (state.selected) { state.selected = null; heart.setHighlight(null); document.querySelectorAll('.struct-btn.active').forEach((b) => b.classList.remove('active')); }
  if (!key) valvePanel = false;
  state.valve = key;
  syncValveUI();
  const V0 = from && VALVE_VIEWS[from], V1 = key && VALVE_VIEWS[key], steps = [];
  if (V0 && V1) {
    let switched = false;
    const d0 = V0.dilation ?? 0;
    steps.push({ // d'une valve à l'autre : la coupe remonte, la caméra tourne vers la nouvelle valve, la coupe redescend
      dur: 1.8, to: () => closeCam(V1), pull: 0.9,
      onUpdate: (e) => {
        if (e < 0.5) { if (d0) heart.setDilation(d0 * (1 - smooth01(0, 0.45, e))); valveCut(V0, FAR * smooth01(0, 0.45, e)); return; }
        if (!switched) { switched = true; V0.activate(false); V1.activate(true); restPose(); }
        if (V1.dilation) heart.setDilation(V1.dilation * smooth01(0.55, 0.95, e));
        valveCut(V1, FAR * (1 - smooth01(0.55, 0.95, e)));
      },
      onEnd: () => viewOffset(),
    });
  } else if (V1) steps.push({ // plongée vers la valve, la coupe descend jusqu'au-dessus de l'anneau
    dur: 1.6, to: () => closeCam(V1),
    onStart: () => { V1.activate(true); valveCut(V1, FAR); restPose(); },
    onUpdate: (e) => { if (V1.dilation) heart.setDilation(V1.dilation * smooth01(0.3, 0.9, e)); valveCut(V1, FAR * (1 - smooth01(0.05, 0.75, e))); },
    onEnd: () => viewOffset(),
  });
  else {
    const b = beforeValve, d0 = V0.dilation ?? 0;
    let switched = false;
    steps.push({ // retour à la vue de départ : la coupe de la valve remonte, puis la coupe d'origine redescend
      dur: 1.4, to: () => b.cam,
      onUpdate: (e) => {
        if (e < 0.5) { if (d0) heart.setDilation(d0 * (1 - smooth01(0, 0.45, e))); valveCut(V0, FAR * smooth01(0, 0.45, e)); return; }
        if (!switched) {
          switched = true; V0.activate(false);
          const wasCurved = curved;
          state.coupe = b.coupe;
          setCutMode(b.mode, b.depth);
          if (!b.coupe && wasCurved === curved) applyClipping();
          document.getElementById('cut-tools').classList.toggle('hidden', !state.coupe);
          if (!b.coupe) return;
        }
        if (b.coupe) setCutDepth(b.depth + FAR * (1 - smooth01(0.55, 0.95, e)));
      },
      onEnd: () => {
        if (b.coupe) setCutDepth(b.depth);
        if (!['anterieure', 'superieure'].includes(state.vue) || camera.up.y < 0.99) document.querySelectorAll('.view-btn').forEach((x) => x.classList.remove('active'));
      },
    });
  }
  runSteps(steps, () => { syncValveUI(); restPose(); renderer.shadowMap.needsUpdate = true; after?.(); });
}
// Change de côté (C ↔ V) : la coupe remonte, la caméra fait le tour de la valve par le côté, la coupe redescend
function setValveSide(side) {
  if (trans) { pendingAction = () => setValveSide(side); return; }
  if (side === valveSide) return;
  const v = state.valve && VALVE_VIEWS[state.valve], from = valveSide;
  valveSide = side;
  syncValveUI();
  if (!v) return;
  const a = sideOf(v, from), mid = () => ({ target: a.center.clone().lerp(sideOf(v, side).center, 0.5), dir: new THREE.Vector3().crossVectors(a.up, a.camDir).normalize(), dist: a.dist * 1.9 * portrait(), up: a.up.clone() });
  runSteps([
    { dur: 1.0, to: mid, onUpdate: (e) => valveCut(v, FAR * smooth01(0, 0.8, e), from) },
    { dur: 1.2, to: () => closeCam(v), onUpdate: (e) => valveCut(v, FAR * (1 - smooth01(0.2, 0.95, e))), onEnd: () => viewOffset() },
  ], () => { restPose(); renderer.shadowMap.needsUpdate = true; });
}
// Interface : bouton « Valves », panneau (valve, côté, variante, position)
function syncValveUI() {
  const v = state.valve && VALVE_VIEWS[state.valve], open = !!v || valvePanel;
  document.getElementById('valve-tools').classList.toggle('hidden', !open);
  document.getElementById('valve-variants').classList.toggle('hidden', !v);
  document.querySelector('[data-vphase]').parentElement.classList.toggle('hidden', !v);
  document.querySelector('[data-vside]').parentElement.classList.toggle('hidden', !v);
  document.querySelectorAll('[data-vside]').forEach((b) => { b.classList.toggle('active', b.dataset.vside === valveSide); b.setAttribute('aria-pressed', String(b.dataset.vside === valveSide)); });
  const btn = document.querySelector('[data-toggle="valves"]');
  btn.classList.toggle('on', open); btn.setAttribute('aria-pressed', String(open));
  canvasWrap.classList.toggle('is-valve', !!v);
  document.querySelectorAll('[data-valve]').forEach((b) => b.classList.toggle('active', b.dataset.valve === state.valve));
  if (v) {
    const seg = document.getElementById('valve-variants');
    seg.innerHTML = v.variantList.map(([k, l]) => `<button type="button" data-variant="${k}" class="${k === v.variant ? 'active' : ''}">${l}</button>`).join('');
    seg.querySelectorAll('[data-variant]').forEach((b) => b.addEventListener('click', () => { v.setVariant(b.dataset.variant); syncValveUI(); restPose(); renderer.shadowMap.needsUpdate = true; }));
  }
  viewOffset();
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
    // étiquette flottante : structure sélectionnée ou survolée
    L.obj.visible = false; // modèle visuel : pas de nom affiché
    L.el.classList.toggle('selected', state.selected === id);
    L.el.classList.toggle('hover', state.hovered === id && state.selected !== id);
  }
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
  if (trans) { pendingAction = () => select(id); return; }
  if (id && state.valve) { goValve(null, () => select(id)); return; } // retour au cœur, puis sélection
  if (id && STRUCTURES[id].coupe && !state.coupe) toggle('coupe', true);
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
    return { id: heart.pickId(h.object, h.point, h.face), point: h.point };
  }
  return null;
}
labelRenderer.domElement.addEventListener('pointerdown', (e) => { downPos = [e.clientX, e.clientY]; });
labelRenderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
  downPos = null;
  if (moved > 6 || state.valve) return; // vues des valves : la fiche de la variante reste affichée
  const hit = pick(e);
  select(hit ? hit.id : null);
});
labelRenderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || state.valve) return;
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
function viewDistance() { const a = camera.aspect > 0 && Number.isFinite(camera.aspect) ? camera.aspect : 1.3; return 44 * Math.max(1, 1.2 / a); }
const Y_UP = new THREE.Vector3(0, 1, 0), camUp = new THREE.Vector3();
// Verticale de la caméra (OrbitControls garde la rotation « verticale → +y » calculée à sa création : on la met à jour)
function setCameraUp(up) {
  camera.up.copy(up);
  if (controls._quat) { controls._quat.setFromUnitVectors(camera.up, Y_UP); controls._quatInverse.copy(controls._quat).invert(); }
}
// Regarde le cœur depuis une direction quelconque, vers une cible, avec une verticale donnée
function goDir(dir, { target = CENTER, dist = viewDistance(), up = Y_UP, instant = false } = {}) {
  const to = target.clone().add(dir.clone().normalize().multiplyScalar(dist));
  camAnim = { from: camera.position.clone(), to, tFrom: controls.target.clone(), tTo: target.clone(), uFrom: camera.up.clone(), uTo: up.clone().normalize(), t: instant ? 1 : 0 };
  if (instant) stepCamAnim(0);
  document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
}
function stepCamAnim(dt) {
  camAnim.t = Math.min(1, camAnim.t + dt * 1.6);
  const e = camAnim.t * camAnim.t * (3 - 2 * camAnim.t);
  camera.position.lerpVectors(camAnim.from, camAnim.to, e);
  controls.target.lerpVectors(camAnim.tFrom, camAnim.tTo, e);
  camUp.copy(camAnim.uFrom).lerp(camAnim.uTo, e);
  if (camUp.lengthSq() > 1e-6) setCameraUp(camUp.normalize());
  if (camAnim.t >= 1) camAnim = null;
}
function goView(name, instant = false) {
  const v = VUES[name];
  state.vue = name;
  goDir(new THREE.Vector3(...v.dir), { instant });
  document.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}

function toggle(name, value) {
  if (trans && name !== 'battement' && name !== 'coronaires') { pendingAction = () => toggle(name, value); return; }
  if (name === 'valves') { if (state.valve) { valvePanel = false; goValve(null); } else { valvePanel = !valvePanel; syncValveUI(); } return; }
  if (name === 'coupe' && state.valve) { goValve(null, () => toggle(name, value)); return; }
  state[name] = value ?? !state[name];
  renderer.shadowMap.needsUpdate = true;
  const btn = document.querySelector(`[data-toggle="${name}"]`);
  if (btn) { btn.classList.toggle('on', state[name]); btn.setAttribute('aria-pressed', String(state[name])); }
  if (name === 'battement') { const t = document.querySelector('.beat-txt'); if (t) t.textContent = state.battement ? 'Pause' : 'Battement'; }
  if (name === 'coupe') restPose();
  if (name === 'coupe') { if (state.coupe) viewForCut(state.modeCoupe, true); else if (camera.up.y < 0.99 || controls.target.distanceTo(CENTER) > 0.01) goView('anterieure'); applyClipping(); document.getElementById('cut-tools').classList.toggle('hidden', !state.coupe); if (!state.coupe && state.selected && STRUCTURES[state.selected]?.coupe) select(null); }
  if (name === 'coronaires') { ['coronaire-droite', 'tronc-commun', 'iva', 'circonflexe', 'sinus-coronaire', 'grande-veine-cardiaque', 'veine-cardiaque-moyenne', 'petites-veines-cardiaques'].forEach((id) => (heart.registry[id]?.meshes || []).forEach((m) => { m.visible = state.coronaires && (!m.userData.ostium || state.coupe); })); }
}

function renderFiche(id) {
  const box = document.getElementById('fiche');
  delete box.dataset.ao;
  box.innerHTML = ''; box.hidden = true; return; // modèle visuel : pas de texte explicatif
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
    b.addEventListener('click', () => (state.valve ? goValve(null, () => goView(k)) : goView(k)));
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
  document.querySelectorAll('[data-cut]').forEach((b) => b.addEventListener('click', () => chooseCut(b.dataset.cut)));
  document.querySelectorAll('[data-valve]').forEach((b) => b.addEventListener('click', () => goValve(b.dataset.valve)));
  document.querySelectorAll('[data-vside]').forEach((b) => b.addEventListener('click', () => setValveSide(b.dataset.vside)));
  document.querySelectorAll('[data-vphase]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-vphase]').forEach((x) => x.classList.toggle('active', x === b));
    valveOpen = b.dataset.vphase === 'ouvert';
    restPose();
  }));
  document.getElementById('cut-depth').addEventListener('input', (e) => setCutDepth(parseFloat(e.target.value)));
  document.getElementById('panel-toggle').addEventListener('click', () => document.getElementById('panel').classList.toggle('open'));
  document.getElementById('panel-handle').addEventListener('click', () => document.getElementById('panel').classList.toggle('open'));
  renderFiche(null);
  // états initiaux (le battement est désactivé par défaut : le patient voit d'abord une planche)
  // battement automatique dès l'ouverture (bouton Pause pour l'arrêter)
  { const b = document.querySelector('[data-toggle="battement"]'); b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); }
}
buildPanel();
setCutMode('cinq-cavites'); // coupe par défaut : 5 cavités, par le centre des valves tricuspide, mitrale et aortique
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
  camera.aspect = w / h;
  controls.maxDistance = Math.max(60, viewDistance() * 1.1); // téléphone en portrait : le cadrage peut dépasser 60 cm
  viewOffset(); camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h); contact.setSize(w, h);
}
// Ombres de contact (occlusion ambiante en espace écran, js/contact-shadows.js)
const contact = new ContactShadows(renderer, scene, camera, { overlayLayer: OVERLAY_LAYER });
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
    if (!L.obj.visible) continue;
    if (state.selected === id) { L.occluded = false; L.el.style.visibility = ''; continue; }
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
  if (state.valve && !trans) txt = sideOf(VALVE_VIEWS[state.valve]).orient;
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
  if (camAnim && !trans) stepCamAnim(dt);
  // battement physiologique : cycle complet (≈ 64 battements par minute) ; au repos, planche figée en diastole
  if (state.battement) { heart.setBeat((t % (60 / BPM)) / (60 / BPM)); beatIdle = false; if (frame % 3 === 0) renderer.shadowMap.needsUpdate = true; }
  else if (!beatIdle) { beatIdle = true; restPose(); }
  if (trans) stepTrans(dt); // zoom vers une valve
  else if (state.valve && state.battement) valveCut(VALVE_VIEWS[state.valve], 0); // la coupe suit la valve qui bat
  // valves : ressorts, retard du bord libre, vibration dans le flux (visibles seulement en coupe et dans les vues des valves)
  if (state.coupe && heart.stepValves(dt, t, state.battement) && frame % 3 === 0) renderer.shadowMap.needsUpdate = true;
  controls.update();
  if ((frame & 7) === 0) updateOrientation();
  if ((frame++ & 3) === 0) occludeLabels();
  contact.render(); // scène + ombres de contact + calque d'interface
  labelRenderer.render(scene, camera);
}
animate();

// Exposé pour le débogage et les tests pilotés
window.__planche = { debug, setValveSide, scene, camera, controls, heart, state, select, toggle, goView, goDir, setCutMode, renderer, contact, VALVE_VIEWS, goValve, chooseCut, CUT_MODES, get CURVE() { return CURVE; }, cutViewDir, setCutDepth };
