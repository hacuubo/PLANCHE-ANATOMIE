import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHeart, COL } from './heart.js';
import { ContactShadows } from './contact-shadows.js';
import { sectionMaterial, setSectionPlane, setSectionFrame } from './cut-surface.js';
import { buildAorticView } from './aortic-view.js';
import { buildAVView } from './av-views.js';
import { STRUCTURES, GROUPES, ORDRE, INTRO, VALVE_AORTIQUE, VALVE_MITRALE, VALVE_TRICUSPIDE } from './data.js';

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

// Vues chirurgicales des valves (gros plan : aortique, mitrale, tricuspide ; normale et pathologique)
const VALVE_VIEWS = { aortique: buildAorticView(heart), mitrale: buildAVView(heart, 'mitrale'), tricuspide: buildAVView(heart, 'tricuspide') };
const VALVE_FICHES = { aortique: VALVE_AORTIQUE, mitrale: VALVE_MITRALE, tricuspide: VALVE_TRICUSPIDE };
for (const v of Object.values(VALVE_VIEWS)) { scene.add(v.group); v.showLabels(false); } // pas d'étiquettes sur les valves

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
  // vue chirurgien (décalage 1,5 cm) : si l'on enfonce la coupe sous l'anneau, valves et cordages sont coupés avec le muscle
  const off = state.modeCoupe === 'chirurgien' && cutPlane.constant < CUT_MODES.chirurgien.def - 0.05 ? 0.15 : interiorOff;
  interiorPlane.normal.copy(cutPlane.normal); interiorPlane.constant = cutPlane.constant + off;
  heart.cutUniforms.uCutOffI.value = interiorOff;
}
let interiorOff = 0.6; // 0,6 cm en coupe 5 cavités, 1,5 cm en vue chirurgien, 0 dans les autres coupes (setCutMode)
let curved = false;    // coupe courbe active (5 cavités, 4 valves)
// partie retirée par la coupe (en tenant compte du décalage des structures intérieures)
const isCutAway = (h) => {
  if (!state.coupe) return false;
  const inner = h.object.material?.userData?.interior;
  if (curved) return CURVE.field(h.point, inner ? interiorOff : 0) < 0;
  return (inner ? interiorPlane : cutPlane).distanceToPoint(h.point) < 0;
};
const CUT_MODES = {
  frontale: { normal: new THREE.Vector3(0, 0, -1), min: -6, max: 6, def: 0.2 },
  horizontale: { normal: new THREE.Vector3(0, -1, 0), min: -5, max: 9, def: 0.0 },
};
// Repères échographiques (heart.landmarks) : pointe, centres et axes des valves
const LM = heart.landmarks, VMI = LM.valves['valve-mitrale'], VTR = LM.valves['valve-tricuspide'], VAO = LM.valves['valve-aortique'], VPU = LM.valves['valve-pulmonaire'];
// « 5 cavités » : coupe échographique 5 cavités (pointe, chambre de chasse et valve aortique) rendue exacte pour les
// valves mitrale et tricuspide. Le plan 5 cavités passe par le centre de la valve aortique mais 2 cm en avant de la
// mitrale et de la tricuspide (leurs feuillets antérieurs seulement). La tranche suit donc ce plan et se creuse en
// pente douce autour des deux valves auriculo-ventriculaires jusqu'au plan 4 cavités (pointe, mitrale, tricuspide) :
// les trois valves sont coupées en leur milieu (à ≈ 2 mm près), feuillets de profil, avec les cinq cavités ouvertes.
// La valve pulmonaire, en avant de l'aorte, n'y figure pas : voir la coupe « 4 valves ».
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
// « 4 valves » : la base du cœur vue d'en haut, comme sur les planches classiques — pulmonaire en avant, aortique au
// centre, mitrale et tricuspide de part et d'autre. Surface de fond : plan au plus près des centres des quatre valves
// (à moins de 4 mm de chacun) ; autour de chaque valve, la tranche suit son propre plan : anneau des valves mitrale et
// tricuspide (oreillettes retirées jusqu'à l'anneau, feuillets entiers dessous), plan perpendiculaire à l'axe des
// valves aortique et pulmonaire en leur milieu (sinus et trois cuspides vus de dessus).
const VALVE_PLANE = (() => {
  const pts = [VTR.center, VMI.center, VAO.center, VPU.center];
  const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  // normale : plus petite direction de dispersion (itération de puissance inverse sur la covariance)
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pts) { const d = p.clone().sub(c).toArray(); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i][j] += d[i] * d[j]; }
  let n = new THREE.Vector3(...[0, 1, 2].map((i) => m[i][0] + m[i][1] + m[i][2])).cross(new THREE.Vector3(m[0][0], m[1][0], m[2][0])).normalize();
  for (let k = 0; k < 40; k++) { // normale = vecteur propre de plus petite valeur propre : n ← (M − λmax·I)·n répété
    const tr = m[0][0] + m[1][1] + m[2][2];
    const v = n.toArray(), r = [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2] - tr * v[i]);
    n.set(...r).normalize();
  }
  if (n.dot(LM.base.clone().sub(LM.apex)) < 0) n.negate(); // vers les oreillettes (côté retiré)
  return { normal: n, center: c };
})();
const CURVE_4V = (() => {
  const n = VALVE_PLANE.normal, c = VALVE_PLANE.center, t = new THREE.Vector3(1, 0, 0).projectOnPlane(n).normalize();
  const V = n.clone().add(new THREE.Vector3(0, 0, 0.2)).normalize(); // d'en haut, un peu de face
  return { V, up: new THREE.Vector3(0, 0, 1), fond: [c, c.clone().add(t), c.clone().add(new THREE.Vector3().crossVectors(n, t))],
    locaux: [[VMI.center, VMI.axis], [VTR.center, VTR.axis], [VAO.center, VAO.axis], [VPU.center, VPU.axis]], S: [1.6, 4, 100] };
})();
CUT_MODES.valves = { curved: CURVE_4V, min: -3, max: 3, def: 0 };
// « Vue chirurgien » (ETO 3D, petit axe de la mitrale) : oreillettes retirées au-dessus de l'anneau mitral, valve vue
// de face depuis l'oreillette gauche, aorte à 12 h. On garde le côté ventriculaire : axe · (p − centre) ≥ −profondeur.
const SURG_UP = VAO.center.clone().sub(VMI.center).projectOnPlane(VMI.axis).normalize();
CUT_MODES.chirurgien = (() => { const c = -VMI.axis.dot(VMI.center); return { normal: VMI.axis.clone(), min: c - 2.5, max: c + 3, def: c + 0.4 }; })();
// valves et cordages coupés plus loin que le muscle : entiers devant la tranche (vue chirurgien : feuillets fermés
// bombés vers l'oreillette, jamais percés par le plan)
const INTERIOR_OFF = { 'cinq-cavites': 0.6, valves: 1.5, chirurgien: 1.5 };
// coupes vues de dessus (valves) : pas de voile de la partie retirée entre l'œil et les valves
const NO_GHOST = new Set(['chirurgien', 'valves']);
// direction de l'observateur pour une coupe (côté retiré)
const cutViewDir = (mode = state.modeCoupe) => (CUT_MODES[mode].curved ? CUT_MODES[mode].curved.V.clone() : cutPlane.normal.clone().negate());
// Pose au repos : valves auriculo-ventriculaires ouvertes (diastole) ; en vue chirurgien, mitrale fermée (systole) pour
// montrer la ligne de coaptation et les festons, comme le chirurgien l'examine
function restPose() {
  if (state.circulation || state.battement) return;
  if (state.coupe && state.modeCoupe === 'chirurgien') heart.setPose({ atr: 0, ven: 0, av: 0, sl: 0 }); else heart.setBeat(null);
  renderer.shadowMap.needsUpdate = true;
}
// Cadrage de chaque coupe (onlyOriented : à l'ouverture de la coupe, seules les coupes « échographiques » déplacent la caméra)
function viewForCut(mode, onlyOriented = false) {
  if (mode === 'cinq-cavites') goDir(CURVE.V, { up: CURVE.Y, dist: viewDistance() * 0.72 }); // cœur plus grand : la coupe se lit mieux
  else if (mode === 'valves') { // vue d'en haut, légèrement de face, l'avant (valve pulmonaire) en haut de l'écran
    goDir(CURVE.V, { target: VALVE_PLANE.center.clone().addScaledVector(CURVE.Y, 1.5), dist: 24, up: CURVE.Y }); // cible remontée : le cœur passe sous le panneau des coupes
  }
  else if (mode === 'chirurgien') goDir(VMI.axis.clone().negate(), { target: VMI.center, dist: 17, up: SURG_UP });
  else if (onlyOriented) { if (camera.up.y < 0.99) goView('anterieure'); }
  else if (mode === 'horizontale') goView('superieure');
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
const STENCIL_CAP = { stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp };
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
      : new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, envMapIntensity: 0.5, ...STENCIL_CAP, polygonOffset: true, polygonOffsetFactor: -rank, polygonOffsetUnits: -rank }));
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

const state = { coupe: false, modeCoupe: 'cinq-cavites', circulation: false, battement: true, coronaires: true, selected: null, hovered: null, vue: 'anterieure', valve: null };

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
  heart.cutOnly.forEach((m) => { m.visible = cut; });
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

/* ─────────── circulation guidée : le trajet du sang, étape par étape ─────────── */
// Trajets du générateur (heart.flowPaths) : 0 VCS → OD → VD → tronc pulmonaire → APD, 1 VCI → … → APG,
// 2 et 3 veines pulmonaires droites / gauches → OG → VG → aorte descendante, 4 aorte → tronc brachio-céphalique.
// Chaque étape en reprend une portion [trajet, premier point, dernier point], avec des flèches qui avancent dans le sens
// du sang ; les valves prennent la position de l'étape. Coupe par étape (par défaut 5 cavités) : la voie d'éjection
// du ventricule droit est en avant de cette coupe, on la montre en coupe frontale, pour que les flèches restent dans la
// bonne cavité à l'écran.
const FLOW_STEPS = [
  { titre: 'Le sang revient du corps', texte: "Le sang pauvre en oxygène revient de tout le corps par les veines caves supérieure et inférieure. Il remplit l'oreillette droite.",
    seg: [[0, 0, 2], [1, 0, 2]], focus: 'oreillette-droite', pose: { atr: 0, ven: 0, av: 0, sl: 0 } },
  { titre: "De l'oreillette au ventricule droit", texte: "Le ventricule droit se relâche : la valve tricuspide s'ouvre et le sang de l'oreillette droite descend dans le ventricule. À la fin, l'oreillette se contracte pour achever de le remplir.",
    seg: [[0, 2, 6]], focus: 'valve-tricuspide', pose: { atr: 0.4, ven: 0, av: 1, sl: 0 } },
  { titre: 'Le ventricule droit éjecte le sang', texte: "Le ventricule droit se contracte : la valve tricuspide se ferme, la valve pulmonaire s'ouvre et le sang part dans le tronc pulmonaire.",
    seg: [[0, 6, 9]], focus: 'ventricule-droit', pose: { atr: 0, ven: 1, av: 0, sl: 1 }, coupe: ['frontale', 2.0] },
  { titre: 'Vers les poumons', texte: "Les artères pulmonaires droite et gauche conduisent le sang aux poumons. Il y rejette le gaz carbonique et se charge en oxygène.",
    seg: [[0, 9, 12], [1, 9, 11]], focus: 'tronc-pulmonaire', pose: { atr: 0, ven: 0.2, av: 0.9, sl: 0 }, coupe: ['frontale', 2.0] },
  { titre: 'Le sang revient des poumons', texte: "Le sang, maintenant riche en oxygène, revient des poumons par les quatre veines pulmonaires. Il remplit l'oreillette gauche.",
    seg: [[2, 0, 2], [3, 0, 2]], focus: 'oreillette-gauche', pose: { atr: 0, ven: 0, av: 0, sl: 0 } },
  { titre: "De l'oreillette au ventricule gauche", texte: "Le ventricule gauche se relâche : la valve mitrale s'ouvre et le sang de l'oreillette gauche descend dans le ventricule. À la fin, l'oreillette se contracte pour achever de le remplir.",
    seg: [[2, 2, 4]], focus: 'valve-mitrale', pose: { atr: 0.4, ven: 0, av: 1, sl: 0 } },
  { titre: 'Le ventricule gauche éjecte le sang', texte: "Le ventricule gauche, le plus puissant, se contracte : la valve mitrale se ferme, la valve aortique s'ouvre et le sang est propulsé dans l'aorte.",
    seg: [[2, 4, 6]], focus: 'ventricule-gauche', pose: { atr: 0, ven: 1, av: 0, sl: 1 }, coupe: ['cinq-cavites'] },
  { titre: 'Vers tout le corps', texte: "L'aorte distribue le sang riche en oxygène à tout le corps : la tête et les bras par les branches de la crosse, le reste du corps par l'aorte descendante.",
    seg: [[2, 6, 10], [4, 2, 4]], focus: 'aorte', pose: { atr: 0, ven: 0.2, av: 0.9, sl: 0 }, coupe: ['cinq-cavites'] },
];
const FLOW_NOTE = 'En réalité, les deux moitiés du cœur se contractent en même temps ; on les suit ici l’une après l’autre.';
// lecture automatique : le temps de lire le texte (≈ 2,5 mots par seconde), au moins 9 s
const stepDur = (st) => Math.max(9, st.texte.split(/\s+/).length / 2.5 + (st === FLOW_STEPS[0] || st === FLOW_STEPS[4] ? 4 : 0));
const flowGroup = new THREE.Group();
flowGroup.visible = false;
heart.root.add(flowGroup);
const FLOW_LAYER = 1; // calque d'interface : dessiné après les ombres de contact, sans ombrage
const overlayMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, toneMapped: false });
// Chaque portion : couloir translucide (le trajet) et flèches qui avancent dessus
const flowSteps = FLOW_STEPS.map((st) => ({
  ...st,
  segs: st.seg.map(([pi, a, b]) => {
    const path = heart.flowPaths[pi];
    const curve = new THREE.CatmullRomCurve3(path.points.slice(a, b + 1), false, 'centripetal', 0.5);
    const len = curve.getLength();
    const lane = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, Math.round(len * 6)), 0.2, 10, false), overlayMat(path.color, 0.3));
    lane.renderOrder = 899;
    lane.layers.set(FLOW_LAYER);
    lane.visible = false;
    flowGroup.add(lane);
    return { curve, len, color: new THREE.Color(path.color), lane };
  }),
}));
// Flèches : chevrons plats tournés vers l'observateur et orientés selon le trajet vu à l'écran (un trajet qui fuit
// vers l'observateur reste lisible), doublés d'un liseré clair pour se détacher des tissus
const MAX_ARROWS = 96;
const arrowShape = new THREE.Shape([new THREE.Vector2(0.5, 0), new THREE.Vector2(-0.38, 0.4), new THREE.Vector2(-0.16, 0), new THREE.Vector2(-0.38, -0.4)]);
const arrowGeo = new THREE.ShapeGeometry(arrowShape);
const arrowEdge = new THREE.InstancedMesh(arrowGeo, overlayMat(0xfffdf9, 0.95), MAX_ARROWS);
const arrows = new THREE.InstancedMesh(arrowGeo, overlayMat(0xffffff, 1), MAX_ARROWS);
arrowEdge.renderOrder = 901; arrows.renderOrder = 902;
for (const m of [arrowEdge, arrows]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.layers.set(FLOW_LAYER); flowGroup.add(m); }
const flow = { step: 0, time: 0, playing: true, pose: { atr: 0, ven: 0, av: 0.9, sl: 0 }, prev: null };
const fM = new THREE.Matrix4(), fP = new THREE.Vector3(), fT = new THREE.Vector3(), fQ = new THREE.Quaternion(), fS = new THREE.Vector3(), fA = new THREE.Vector3(), fB = new THREE.Vector3(), fR = new THREE.Quaternion(), Z_AXIS = new THREE.Vector3(0, 0, 1);
function updateFlow(dt) {
  dt = Math.min(dt, 0.1); // onglet revenu au premier plan : pas de saut d'étapes
  flow.time += dt;
  if (flow.playing && flow.time > stepDur(FLOW_STEPS[flow.step])) showStep((flow.step + 1) % flowSteps.length);
  const st = flowSteps[flow.step];
  let n = 0;
  for (const s of st.segs) {
    const gap = 1.3, count = Math.max(2, Math.floor(s.len / gap));
    for (let k = 0; k < count && n < MAX_ARROWS; k++, n++) {
      const d = (k * gap + flow.time * 2.4) % (count * gap);
      const u = Math.min(1, d / s.len);
      s.curve.getPointAt(u, fP); s.curve.getTangentAt(u, fT);
      const fade = Math.min(1, d / 0.5, Math.max(0, (s.len - d) / 0.5));
      // direction du trajet à l'écran
      fA.copy(fP).project(camera); fB.copy(fP).addScaledVector(fT, 0.3).project(camera);
      const ang = Math.atan2(fB.y - fA.y, (fB.x - fA.x) * camera.aspect);
      fQ.copy(camera.quaternion).multiply(fR.setFromAxisAngle(Z_AXIS, ang));
      fM.compose(fP, fQ, fS.setScalar(0.85 * fade)); arrows.setMatrixAt(n, fM); arrows.setColorAt(n, s.color);
      fM.compose(fP, fQ, fS.setScalar(0.85 * fade * 1.3)); arrowEdge.setMatrixAt(n, fM);
    }
  }
  arrows.count = arrowEdge.count = n;
  arrows.instanceMatrix.needsUpdate = arrowEdge.instanceMatrix.needsUpdate = true;
  if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
  // la pose du cœur rejoint celle de l'étape en douceur
  const k = 1 - Math.exp(-dt * 4);
  let moved = 0;
  for (const key of ['atr', 'ven', 'av', 'sl']) {
    // une valve ne s'ouvre que lorsque l'autre est (presque) fermée
    if (key === 'sl' && st.pose.sl > flow.pose.sl && flow.pose.av > 0.15) continue;
    if (key === 'av' && st.pose.av > flow.pose.av && flow.pose.sl > 0.15) continue;
    const dv = (st.pose[key] - flow.pose[key]) * k; flow.pose[key] += dv; moved += Math.abs(dv);
  }
  if (moved > 1e-4) { heart.setPose(flow.pose); if (frame % 3 === 0) renderer.shadowMap.needsUpdate = true; }
}
function showStep(i) {
  flow.step = i; flow.time = 0;
  flowSteps.forEach((st, j) => st.segs.forEach((s) => {
    s.lane.visible = j <= i;
    s.lane.material.opacity = j === i ? 0.32 : 0.12; // déjà parcouru : trace pâle
  }));
  const st = flowSteps[i];
  const [mode, depth] = st.coupe ?? ['cinq-cavites'];
  if (mode !== state.modeCoupe || (depth !== undefined && Math.abs(cutPlane.constant - depth) > 1e-3)) {
    document.querySelectorAll('[data-cut]').forEach((x) => x.classList.toggle('active', x.dataset.cut === mode));
    setCutMode(mode, depth);
    flowView(mode);
  }
  flowUI.querySelector('.fg-note').hidden = !(i === 0 || i === 4);
  flowUI.querySelector('.fg-num').textContent = `${i + 1} / ${flowSteps.length}`;
  flowUI.querySelector('.fg-title').textContent = st.titre;
  flowUI.querySelector('.fg-text').textContent = st.texte;
  flowUI.querySelectorAll('.fg-dots i').forEach((d, j) => d.classList.toggle('on', j === i));
  if (!state.selected) heart.setHighlight(st.focus, { focus: false });
  if (state.circulation) flowOffset(); // hauteur du panneau variable selon le texte
}
// Panneau des étapes (au-dessus de la légende)
const flowUI = document.createElement('div');
flowUI.className = 'flow-guide hidden';
flowUI.setAttribute('role', 'region');
flowUI.setAttribute('aria-label', 'Trajet du sang, étape par étape');
flowUI.innerHTML = `<div class="fg-live" aria-live="off"><div class="fg-head"><span class="fg-num"></span><b class="fg-title"></b></div>
  <p class="fg-text"></p></div><p class="fg-note">${FLOW_NOTE}</p>
  <div class="fg-ctrl"><button type="button" class="fg-prev" aria-label="Étape précédente">‹</button>
  <span class="fg-dots" aria-hidden="true">${flowSteps.map(() => '<i></i>').join('')}</span>
  <button type="button" class="fg-play" aria-label="Pause">❚❚</button><button type="button" class="fg-next" aria-label="Étape suivante">›</button></div>`;
canvasWrap.appendChild(flowUI);
// lecteurs d'écran : étape annoncée quand on avance pas à pas, pas pendant la lecture automatique
const setPlaying = (on) => { flow.playing = on; const b = flowUI.querySelector('.fg-play'); b.textContent = on ? '❚❚' : '▶'; b.setAttribute('aria-label', on ? 'Pause' : 'Lecture'); flowUI.querySelector('.fg-live').setAttribute('aria-live', on ? 'off' : 'polite'); };
flowUI.querySelector('.fg-prev').addEventListener('click', () => { setPlaying(false); showStep((flow.step + flowSteps.length - 1) % flowSteps.length); });
flowUI.querySelector('.fg-next').addEventListener('click', () => { setPlaying(false); showStep((flow.step + 1) % flowSteps.length); });
flowUI.querySelector('.fg-play').addEventListener('click', () => setPlaying(!flow.playing));
// cadrage : coupe vue de face et d'en haut (la coupe 5 cavités est presque horizontale ; vu de face, les veines caves et
// l'aorte gardent leur longueur à l'écran) ; coupe frontale vue de face
const flowView = (mode = 'cinq-cavites') => {
  const n = mode === 'frontale' ? new THREE.Vector3(0, 0, 1) : cutViewDir(mode).add(new THREE.Vector3(0, 0, 0.9));
  goDir(n, { dist: viewDistance() * 0.92 });
};
// le cœur est remonté au-dessus du panneau des étapes en décalant la projection (la cible reste au centre du cœur)
function flowOffset() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  if (state.circulation && w && h) camera.setViewOffset(w, h, 0, (flowUI.offsetHeight + 16) / 2, w, h);
  else if (state.valve && w && h) { // vues des valves : valve centrée sous le panneau des réglages
    const top = document.querySelector('.tools').getBoundingClientRect().bottom - canvasWrap.getBoundingClientRect().top;
    camera.setViewOffset(w, h, 0, -Math.max(0, top) / 2, w, h);
  } else camera.clearViewOffset();
}
function setCirculation(on) {
  flowGroup.visible = on;
  flowUI.classList.toggle('hidden', !on);
  canvasWrap.classList.toggle('is-flow', on);
  if (on) {
    flow.beat = state.battement;
    if (state.battement) toggle('battement', false);
    flow.prev = { coupe: state.coupe, mode: state.modeCoupe };
    flow.pose = { atr: 0, ven: 0, av: 0.9, sl: 0 };
    if (state.modeCoupe !== 'cinq-cavites') chooseCut('cinq-cavites');
    if (!state.coupe) toggle('coupe', true);
    flowView();
    setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches);
    showStep(0);
    flowOffset();
  } else {
    flowOffset();
    if (flow.beat) toggle('battement', true);
    restPose();
    heart.setHighlight(state.selected);
    if (flow.prev) { if (flow.prev.mode !== state.modeCoupe) chooseCut(flow.prev.mode); if (!flow.prev.coupe && state.coupe) toggle('coupe', false); }
  }
}

/* ─────────── vues des valves : gros plan et zoom de repérage ─────────── */
// Pour que le patient situe la valve, le passage du cœur à une valve (ou d'une valve à une autre) est un zoom continu :
//   1. la caméra se place de trois quarts face au cœur, rendu translucide ; la valve choisie apparaît à sa place,
//      entourée d'un anneau lumineux et nommée ;
//   2. la caméra plonge vers la valve en pivotant jusqu'à la vue chirurgicale, pendant que le cœur s'efface et que le
//      gros plan (valve, paroi, repères) apparaît.
// D'une valve à l'autre : retour au cœur translucide, rotation vers la nouvelle valve, puis plongée.
let valvePanel = false; // panneau du choix des valves ouvert (sans valve choisie : la vue ne bouge pas)
let valveOpen = false, lastValve = 'aortique', trans = null, markerOn = false, markerFade = 1;
const viewMats = new Set();
for (const v of Object.values(VALVE_VIEWS)) v.group.traverse((o) => { if (o.material) viewMats.add(o.material); });
const matsOf = (obj) => { const s = new Set(); obj.traverse((o) => { if (o.material) s.add(o.material); }); return s; };
function setOpacity(mats, o) {
  for (const m of mats) {
    const tr = o < 0.999;
    if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
    m.opacity = o; m.depthWrite = !tr;
  }
}
// cœur translucide (sauf la valve à situer) ; pas d'ombre portée tant qu'il est transparent
const castSaved = new Map();
function fadeHeart(o, keepValveId = null) {
  const keep = new Set();
  if (keepValveId) for (const m of heart.valves[keepValveId]?.meshes ?? []) keep.add(m.material);
  setOpacity(heart.materials.filter((m) => !viewMats.has(m) && !keep.has(m)), o);
  setOpacity(keep, 1); // la valve à situer reste opaque
  heart.root.traverse((m) => {
    if (!m.isMesh) return;
    if (o < 0.999 && m.castShadow) { castSaved.set(m, true); m.castShadow = false; }
    if (o >= 0.999 && castSaved.has(m)) { m.castShadow = true; castSaved.delete(m); }
  });
  for (const id in labels) labels[id].obj.visible = o >= 0.999 && (state.selected === id || state.hovered === id);
}
// valve du cœur montrée fermée pendant le repérage (comme dans le gros plan qui suit), remise au repos ensuite
const showHeartValve = (v, on) => {
  const hv = heart.valves[v.heartValveId];
  if (!hv) return;
  hv.snap(on ? 0 : (v.phase === 'av' ? 0.9 : 0), null);
  for (const m of hv.meshes) m.visible = on;
};
// anneau lumineux et nom de la valve pendant le repérage (calque d'interface : par-dessus, sans ombrage)
const markerMat = new THREE.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false, toneMapped: false });
const marker = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.07, 12, 72), markerMat);
marker.renderOrder = 950; marker.layers.set(FLOW_LAYER); marker.visible = false;
scene.add(marker);
const markerLabel = (() => { const el = document.createElement('div'); el.className = 'ao-label marker'; const o = new CSS2DObject(el); o.visible = false; scene.add(o); return o; })();
function setMarker(v) {
  markerOn = !!v; markerFade = 1; marker.visible = markerOn; markerLabel.visible = false; // l'anneau seul désigne la valve
  if (!v) return;
  marker.position.copy(v.focus); marker.lookAt(v.focus.clone().add(v.camDir));
  markerLabel.element.textContent = v.title;
  markerLabel.position.copy(v.focus).add(new THREE.Vector3(0, 2.8, 0));
}
// états de caméra : cible, direction (de la cible vers l'œil), distance, verticale
const camSt = () => { const off = camera.position.clone().sub(controls.target); return { target: controls.target.clone(), dir: off.clone().normalize(), dist: off.length(), up: camera.up.clone() }; };
const portrait = () => Math.max(1, 0.95 / camera.aspect);
const ctxCam = (v) => ({ target: v.focus.clone(), dir: v.camDir.clone().multiplyScalar(1.4).add(new THREE.Vector3(0, 0.2, 1)).normalize(), dist: viewDistance() * 0.75, up: Y_UP.clone() });
const closeCam = (v) => ({ target: v.center.clone(), dir: v.camDir.clone(), dist: v.dist * portrait(), up: v.up.clone() });
const frontCam = () => ({ target: CENTER.clone(), dir: new THREE.Vector3(...VUES.anterieure.dir).normalize(), dist: viewDistance(), up: Y_UP.clone() });
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
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let pendingAction = null; // action demandée pendant une transition : exécutée à la fin
function runSteps(steps, done) {
  steps.forEach((s) => { s.dur *= 2; }); // zoom lent : le patient suit où l'on va
  if (reduced.matches) steps.forEach((s) => { s.dur *= 0.35; }); // mouvement réduit : transitions brèves
  camAnim = null; trans = { steps, i: 0, t: 0, done }; controls.enabled = false; startStep();
}
function startStep() { const s = trans.steps[trans.i]; s.from = camSt(); s.onStart?.(); }
function stepTrans(dt) {
  const s = trans.steps[trans.i];
  trans.t = Math.min(1, trans.t + Math.min(dt, 0.25) / s.dur); // appareil lent : la transition garde sa durée
  const e = easeIO(trans.t);
  applyCam(s.from, s.to(), e);
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
const viewSet = (v) => matsOf(v.group);
// Passe du cœur (ou d'une valve) à la valve « key » ; key = null : retour au cœur. after : appelé à la fin.
function goValve(key, after) {
  if (trans) { pendingAction = () => goValve(key, after); return; }
  const from = state.valve;
  if (from === key) { after?.(); return; }
  if (state.circulation) toggle('circulation', false);
  if (state.coupe) toggle('coupe', false);
  if (state.selected) { state.selected = null; heart.setHighlight(null); document.querySelectorAll('.struct-btn.active').forEach((b) => b.classList.remove('active')); }
  if (key) lastValve = key;
  heart.setBeat(null); // pose de repos pendant le repérage (pas de cœur figé en systole)
  state.valve = key;
  syncValveUI();
  const V0 = from && VALVE_VIEWS[from], V1 = key && VALVE_VIEWS[key], steps = [];
  if (V0) steps.push({ // sortie du gros plan : le cœur translucide réapparaît autour de la valve
    dur: 1.1, to: () => ctxCam(V0),
    onStart: () => { heart.root.visible = true; showHeartValve(V0, true); V0.showLabels(false); fadeHeart(0, V0.heartValveId); },
    onUpdate: (e) => { fadeHeart(0.28 * e, V0.heartValveId); setOpacity(viewSet(V0), 1 - smooth01(0, 0.6, e)); },
    onEnd: () => { V0.setVisible(false); setOpacity(viewSet(V0), 1); setMarker(V1 ? null : V0); },
  });
  if (V1) {
    if (V0) steps.push({ // d'une valve à l'autre, autour du cœur translucide
      dur: 1.1, to: () => ctxCam(V1),
      onStart: () => { showHeartValve(V1, true); setMarker(V1); },
      onUpdate: () => fadeHeart(0.28, V1.heartValveId),
      onEnd: () => showHeartValve(V0, false),
    });
    else steps.push({ // repérage : cœur de trois quarts, devenant translucide, valve visible et nommée
      dur: 1.3, to: () => ctxCam(V1),
      onStart: () => { showHeartValve(V1, true); setMarker(V1); },
      onUpdate: (e) => fadeHeart(1 - 0.72 * e, V1.heartValveId),
    });
    steps.push({ // plongée vers la valve, jusqu'à la vue chirurgicale
      dur: 1.6, to: () => closeCam(V1),
      onStart: () => { V1.showLabels(false); V1.setVisible(true); setOpacity(viewSet(V1), 0); },
      onUpdate: (e) => {
        fadeHeart(0.28 * (1 - smooth01(0.3, 0.85, e)), V1.heartValveId);
        setOpacity(viewSet(V1), smooth01(0.35, 0.9, e));
        markerFade = 1 - smooth01(0, 0.45, e);
      },
      onEnd: () => {
        heart.root.visible = false; showHeartValve(V1, false); fadeHeart(1); setMarker(null);
        setOpacity(viewSet(V1), 1); flowOffset();
      },
    });
  } else steps.push({ // retour au cœur entier, de face
    dur: 1.3, to: frontCam,
    onUpdate: (e) => fadeHeart(0.28 + 0.72 * e, V0.heartValveId),
    onEnd: () => { showHeartValve(V0, false); for (const m of heart.valves[V0.heartValveId]?.meshes ?? []) m.visible = state.coupe; fadeHeart(1); setMarker(null); state.vue = 'anterieure'; document.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === 'anterieure')); },
  });
  runSteps(steps, () => { syncValveUI(); after?.(); });
}
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Interface : bouton « Valves », panneau (valve, variante, position), fiche de la variante
function syncValveUI() {
  const v = state.valve && VALVE_VIEWS[state.valve], open = !!v || valvePanel;
  document.getElementById('valve-tools').classList.toggle('hidden', !open);
  document.getElementById('valve-variants').classList.toggle('hidden', !v);
  document.querySelector('[data-vphase]').parentElement.classList.toggle('hidden', !v);
  const btn = document.querySelector('[data-toggle="valves"]');
  btn.classList.toggle('on', open); btn.setAttribute('aria-pressed', String(open));
  canvasWrap.classList.toggle('is-valve', !!v);
  document.querySelectorAll('[data-valve]').forEach((b) => b.classList.toggle('active', b.dataset.valve === state.valve));
  if (v) {
    const seg = document.getElementById('valve-variants');
    seg.innerHTML = v.variantList.map(([k, l]) => `<button type="button" data-variant="${k}" class="${k === v.variant ? 'active' : ''}">${l}</button>`).join('');
    seg.querySelectorAll('[data-variant]').forEach((b) => b.addEventListener('click', () => { v.setVariant(b.dataset.variant); syncValveUI(); renderer.shadowMap.needsUpdate = true; }));
    renderValveFiche(v);
  } else if (document.getElementById('fiche').dataset.ao) renderFiche(state.selected);
  flowOffset();
}
function renderValveFiche(v) {
  return; // modèle visuel : pas de fiche
  const f = VALVE_FICHES[v.key][v.variant], box = document.getElementById('fiche');
  box.dataset.ao = '1';
  box.innerHTML = `
    <div class="fiche-head"><div><h2>${f.titre}</h2><div class="latin">${f.sousTitre}</div></div></div>
    <p class="resume">${f.texte}</p>
    <h3>Pour aller plus loin</h3><ul>${f.details.map((x) => `<li>${x}</li>`).join('')}</ul>
    <div class="chiffres">${f.chiffres.map((c) => `<span>${c}</span>`).join('')}</div>
    <p class="hint">${v.orient.replace(/<[^>]+>/g, '')}. Choisissez « Ouverte » ou lancez le battement pour voir la valve s'ouvrir.</p>`;
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
function highlight(id) { if (!id && state.circulation) heart.setHighlight(flowSteps[flow.step].focus, { focus: false }); else heart.setHighlight(id); }
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
  // vue chirurgien : seules les valves y sont visibles ; pour une autre structure de coupe, retour à la coupe 5 cavités
  if (trans) { pendingAction = () => select(id); return; }
  if (id && state.valve) { goValve(null, () => select(id)); return; } // retour au cœur, puis sélection
  if (id && STRUCTURES[id].coupe && state.modeCoupe === 'chirurgien' && !/^valve-(mitrale|tricuspide|aortique)$/.test(id)) chooseCut('cinq-cavites');
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
  if ((name === 'coupe' || name === 'circulation') && state.valve) { goValve(null, () => toggle(name, value)); return; }
  if (name === 'coupe' && state.circulation && value === undefined) { flow.prev = { coupe: true, mode: state.modeCoupe }; toggle('circulation', false); return; }
  state[name] = value ?? !state[name];
  renderer.shadowMap.needsUpdate = true;
  const btn = document.querySelector(`[data-toggle="${name}"]`);
  if (btn) { btn.classList.toggle('on', state[name]); btn.setAttribute('aria-pressed', String(state[name])); }
  if (name === 'battement') { const t = document.querySelector('.beat-txt'); if (t) t.textContent = state.battement ? 'Pause' : 'Battement'; }
  if (name === 'battement' && state.battement && state.circulation) toggle('circulation', false);
  if (name === 'coupe') restPose();
  if (name === 'coupe') { if (state.coupe) viewForCut(state.modeCoupe, true); else if (camera.up.y < 0.99 || controls.target.distanceTo(CENTER) > 0.01) goView('anterieure'); applyClipping(); document.getElementById('cut-tools').classList.toggle('hidden', !state.coupe); if (!state.coupe && state.selected && STRUCTURES[state.selected]?.coupe) select(null); }
  if (name === 'circulation') setCirculation(state.circulation);
  if (name === 'coronaires') { ['coronaire-droite', 'tronc-commun', 'iva', 'circonflexe', 'sinus-coronaire', 'grande-veine-cardiaque', 'veine-cardiaque-moyenne', 'petites-veines-cardiaques'].forEach((id) => (heart.registry[id]?.meshes || []).forEach((m) => { m.visible = state.coronaires; })); }
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
  document.querySelectorAll('[data-vphase]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-vphase]').forEach((x) => x.classList.toggle('active', x === b));
    valveOpen = b.dataset.vphase === 'ouvert';
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
  flowOffset(); camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h); contact.setSize(w, h);
}
// Ombres de contact (occlusion ambiante en espace écran, js/contact-shadows.js)
const contact = new ContactShadows(renderer, scene, camera, { overlayLayer: FLOW_LAYER });
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
  if (state.coupe && state.modeCoupe === 'chirurgien' && !camAnim) txt = 'Vue depuis l’oreillette gauche · <b>aorte en haut</b>';
  if (state.valve && !trans) txt = VALVE_VIEWS[state.valve].orient;
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
  if (state.battement && !state.valve) { heart.setBeat((t % (60 / BPM)) / (60 / BPM)); beatIdle = false; if (frame % 3 === 0) renderer.shadowMap.needsUpdate = true; }
  else if (!beatIdle) { beatIdle = true; restPose(); }
  if (state.circulation) updateFlow(dt);
  // vues des valves : la valve affichée suit le cycle (battement) ou la position choisie
  if (trans) stepTrans(dt);
  for (const v of Object.values(VALVE_VIEWS)) {
    if (!v.group.visible) continue;
    const c = heart.cycle(((t % (60 / BPM)) / (60 / BPM) + 0.02) % 1);
    const target = state.battement ? (v.phase === 'sl' ? c.sl : c.av) : (valveOpen ? 1 : 0);
    if (v.step(target, dt, t, state.battement) && frame % 3 === 0) renderer.shadowMap.needsUpdate = true;
  }
  if (markerOn) { markerMat.opacity = (0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 4))) * markerFade; marker.quaternion.copy(camera.quaternion); } // anneau face à l'observateur
  // valves : ressorts, retard du bord libre, vibration dans le flux (visibles seulement en coupe)
  if (state.coupe && !state.valve && heart.stepValves(dt, t, state.battement || state.circulation) && frame % 3 === 0) renderer.shadowMap.needsUpdate = true;
  controls.update();
  if ((frame & 7) === 0) updateOrientation();
  if ((frame++ & 3) === 0) occludeLabels();
  contact.render(); // scène + ombres de contact + calque d'interface
  labelRenderer.render(scene, camera);
}
animate();

// Exposé pour le débogage et les tests pilotés
window.__planche = { scene, camera, controls, heart, state, select, toggle, goView, goDir, setCutMode, renderer, contact, VALVE_VIEWS, goValve, chooseCut, CUT_MODES, get CURVE() { return CURVE; }, cutViewDir, setCutDepth };
