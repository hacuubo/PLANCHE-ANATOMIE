import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHeart, COL, GLSL_ROOTS } from './heart.js';
import { ContactShadows } from './contact-shadows.js';
import { sectionMaterial, setSectionPlane, setSectionFrame } from './cut-surface.js';
import { buildSLView } from './aortic-view.js';
import { buildAVView } from './av-views.js';
import { buildFOPViews, buildCoronaryView, createBubbles } from './special-views.js';
import { createDoppler, restTime, NYQUIST } from './doppler.js';
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
// Vues des valves : ce qui est loin derrière la valve s'assombrit doucement, comme sous l'éclairage frontal du
// chirurgien ou de l'endoscope ; la valve et son anneau se détachent du fond rose. Brouillard posé dès le départ (rejeté
// à l'infini hors des vues des valves) : pas de recompilation des matériaux.
const FOG_FAR = 25; // cm derrière la valve où la teinte sombre serait atteinte (≈ 15 % d'assombrissement à 6 cm)
scene.fog = new THREE.Fog(0x3b1c1e, 1e4, 1e4 + 1);
let fogK = 0;
function updateDepthFog(dt) {
  fogK += ((state.valve && !VALVE_VIEWS[state.valve].noFog ? 1 : 0) - fogK) * Math.min(1, dt * 2.5);
  if (fogK < 0.002) { scene.fog.near = 1e4; scene.fog.far = 1e4 + 1; return; }
  const d = camera.position.distanceTo(controls.target);
  scene.fog.near = d - 0.5; scene.fog.far = d - 0.5 + FOG_FAR / fogK;
}

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
// chargement : barre de progression (≈ 2,2 Mo transférés), puis préparation du modèle
const loading = document.createElement('div');
loading.className = 'loading'; loading.setAttribute('role', 'progressbar'); loading.setAttribute('aria-label', 'Chargement du modèle');
loading.innerHTML = '<span class="loading-txt">Chargement du modèle…</span><span class="loading-bar"><i></i></span>';
canvasWrap.appendChild(loading);
const heart = await buildHeart((f) => {
  loading.querySelector('i').style.width = `${Math.round(f * 100)}%`;
  loading.setAttribute('aria-valuenow', String(Math.round(f * 100)));
  if (f >= 1) loading.querySelector('.loading-txt').textContent = 'Préparation du cœur…';
});
loading.remove();
canvasWrap.classList.add('ready');
const pivot = new THREE.Group();
pivot.position.copy(CENTER);
heart.root.position.copy(CENTER.clone().negate());
pivot.add(heart.root);
scene.add(pivot);
key.target.position.copy(CENTER);

// Vues chirurgicales des valves, dans le cœur (aortique, mitrale, tricuspide ; normale et pathologique)
const VALVE_VIEWS = { aortique: buildSLView(heart, 'aortique'), mitrale: buildAVView(heart, 'mitrale'), tricuspide: buildAVView(heart, 'tricuspide'), pulmonaire: buildSLView(heart, 'pulmonaire') };
for (const v of Object.values(VALVE_VIEWS)) v.group = 'valves';
// Rubriques FOP (fosse ovale, test aux bulles) et Coronaires (infarctus de l'IVA) : mêmes mécanismes de vue
const bubbles = createBubbles(heart);
Object.assign(VALVE_VIEWS, buildFOPViews(heart), { coronaires: buildCoronaryView(heart) });
for (const k of ['fosse', 'fop']) if (VALVE_VIEWS[k]) VALVE_VIEWS[k].onActivate = (on, pfo) => bubbles.setActive(on && pfo, pfo);

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
  // cœur arrêté à un instant du cycle (pause ou curseur du cycle) : cet instant, et la coupe suit la valve
  if (frozenPhase !== null) { heart.setBeat(frozenPhase); if (v && !trans) valveCut(v, 0); renderer.shadowMap.needsUpdate = true; return; }
  // vue d'une valve, cœur arrêté : position choisie (ouverte ou fermée) pour la valve regardée
  if (v && !v.phase) { heart.setBeat(null); if (!trans) valveCut(v, 0); } // FOP, coronaires : pose de repos (diastole)
  else if (v) { heart.setPose({ atr: 0, ven: 0, av: v.phase === 'av' && valveOpen ? 1 : 0, sl: v.phase === 'sl' && valveOpen ? 1 : 0 }); if (!trans) valveCut(v, 0); }
  else heart.setBeat(null);
  renderer.shadowMap.needsUpdate = true;
}
// Cadrage de chaque coupe (onlyOriented : à l'ouverture de la coupe, seules les coupes « échographiques » déplacent la caméra)
function viewForCut(mode, onlyOriented = false) {
  if (mode === 'cinq-cavites') goDir(CURVE.V, { up: CURVE.Y, dist: viewDistance() * 0.72 }); // cœur plus grand : la coupe se lit mieux
  // frontale : vue de face cadrée sur le cœur (de la pointe à la racine aortique), pas sur la crosse et les troncs ;
  // recadrée aussi à l'ouverture de la coupe (une coupe frontale ne se lit que de face)
  else if (mode === 'frontale') goDir(cutViewDir('frontale'), { target: LM.apex.clone().lerp(VAO.center, 0.62), dist: viewDistance() * 0.7 });
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
function withRootHoles(mat, rootSel = -1) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, heart.rootUniforms, { uRootSel: { value: rootSel } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHoleW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHoleW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHoleW;\n${GLSL_ROOTS}`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (inRootW(vHoleW, 0.0)) discard;'); // racine à sa place du moment
  };
  const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => key() + '|racines';
  return mat;
}
// Tranche de la lumière des gros vaisseaux : sang sombre et humide, plus profond au centre qu'au bord (la carte de la
// paroi donne la profondeur sous la surface du vaisseau), comme une lumière ouverte, et non un aplat de couleur vive.
// carte de la paroi seule, sans le code de la déformation du battement (avec le brouillard de profondeur, celui-ci
// rendait la compilation du shader interminable sur certains pilotes)
const GLSL_WALL = /* glsl */`
uniform sampler3D uVol; uniform vec3 uVolMin; uniform vec3 uVolScale; uniform vec3 uVolHalf; uniform float uVolOn;
vec4 wallAt(vec3 p) {
  vec3 t = (p - uVolMin) * uVolScale + uVolHalf;
  if (uVolOn < 0.5 || any(lessThan(t, vec3(0.0))) || any(greaterThan(t, vec3(1.0)))) return vec4(0.4, 0.4, 0.5, 1.0);
  return textureLod(uVol, t, 0.0);
}`;
const LUMEN_TINT = { artere: 0x9a3034, veine: 0x625f84 };
function lumenCapMaterial(capKey, rank) {
  const mat = new THREE.MeshPhysicalMaterial({ color: LUMEN_TINT[capKey], roughness: 0.32, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.6, ...STENCIL_CAP, polygonOffset: true, polygonOffsetFactor: -rank, polygonOffsetUnits: -rank });
  mat.onBeforeCompile = (sh) => {
    const u = heart.deformUniforms;
    Object.assign(sh.uniforms, { uVol: u.uVol, uVolMin: u.uVolMin, uVolScale: u.uVolScale, uVolHalf: u.uVolHalf, uVolOn: u.uVolOn });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLumW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvLumW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vLumW;\n${GLSL_WALL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  { vec4 vol = wallAt(vLumW);
    bool outside = vol.a > 0.99 && abs(vol.r - 0.4) < 0.002; // hors de la carte : assombrissement moyen
    float depth = outside ? 0.3 : smoothstep(0.05, 0.7, vol.r * 2.55);
    diffuseColor.rgb *= mix(1.0, 0.42, depth); }`);
  };
  mat.customProgramCacheKey = () => `lumiere-${capKey}`;
  return withRootHoles(mat, capKey === 'artere' ? 0 : 1); // aorte : racine aortique ; tronc pulmonaire : racine pulmonaire
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
    const mat = () => (capKey === 'myo' || capKey === 'pilier' ? sectionMaterial(heart, { stencil: STENCIL_CAP, rank, papillary: capKey === 'pilier' })
      : LUMEN_TINT[capKey] ? lumenCapMaterial(capKey, rank)
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

// Cycle cardiaque : phase dans le battement (0 → 1, cycle de 940 ms à 64 battements par minute), vitesse (ralenti),
// instant figé (pause ou curseur ; null : pose de repos, ou position choisie dans les vues des valves)
const BPM = 64;
let beatPhase = 0, beatSpeed = 1, frozenPhase = null;
const cyclePos = document.getElementById('cycle-pos');
let scrubbing = false, cycleTick = 0; // doigt ou souris sur le curseur ; compteur (texte lu, mis à jour par moments)
const cycleEl = document.getElementById('cycle');
function phaseText(ph) {
  const ms = Math.round(ph * 940), part = ms >= 175 && ms < 495 ? 'systole' : ms >= 20 && ms < 178 ? 'contraction des oreillettes' : 'diastole';
  return `${ms} ms, ${part}`;
}
function syncCycleUI() {
  const ph = state.battement ? beatPhase : frozenPhase;
  cycleEl.classList.toggle('idle', ph === null); // position choisie (fermée / ouverte) : pas d'instant du cycle
  if (ph === null || scrubbing) return;
  cyclePos.value = String(Math.round(ph * 1000));
  if ((++cycleTick & 15) === 0 || !state.battement) cyclePos.setAttribute('aria-valuetext', phaseText(ph));
}
const state = { coupe: false, modeCoupe: 'cinq-cavites', battement: true, coronaires: true, reperes: false, comparer: false, doppler: false, selected: null, hovered: null, vue: 'anterieure', valve: null };

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
  syncCutOnly();
  heart.showValves(cut);
  canvasWrap.classList.toggle('is-cut', state.coupe);
  renderer.shadowMap.needsUpdate = true;
  syncGhost();
  updateCapPlanes();
}

// Structures intérieures (piliers, conduction, orifice du sinus) : visibles en coupe. Voies de conduction (nœuds
// sinusal et auriculo-ventriculaire, faisceau de His, en jaune) masquées pour le moment ; avec SHOW_CONDUCTION, elles
// reviennent dans les coupes, sauf dans les vues des valves (points jaunes au ras de l'anneau).
const CONDUCTION = new Set(['noeud-sinusal', 'noeud-av', 'faisceau-his']);
const SHOW_CONDUCTION = false;
// orifice du sinus coronaire : montré dans les coupes et dans les vues qui regardent l'oreillette droite ; ailleurs
// (valves aortique, pulmonaire, mitrale) on ne le voyait que par la tranche, au loin, tache sombre qui bougeait
const CS_VIEWS = new Set(['tricuspide', 'fosse', 'fop']);
function syncCutOnly() {
  const cut = state.coupe;
  heart.cutOnly.forEach((m) => {
    const cond = CONDUCTION.has(m.userData.id);
    const cs = m.userData.ostium && m.userData.id === 'sinus-coronaire' && state.valve && !CS_VIEWS.has(state.valve);
    m.visible = cut && !m.userData.hidden && (!m.userData.ostium || state.coronaires) && !cs && !(cond && (!SHOW_CONDUCTION || state.valve));
  });
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
function valveShift() {
  // entre le panneau des réglages (en haut) et la barre du cycle (en bas)
  const sc = canvasWrap.getBoundingClientRect(), cyc = document.getElementById('cycle').getBoundingClientRect();
  const top = Math.max(0, document.querySelector('.tools').getBoundingClientRect().bottom - sc.top);
  const bottom = cyc.height ? Math.max(0, sc.bottom - cyc.top) : 0;
  return { shift: -(top - bottom) / 2, top };
}
function viewOffset() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  if (state.valve && w && h) camera.setViewOffset(w, h, 0, valveShift().shift, w, h);
  else camera.clearViewOffset();
  syncCompareTags(); syncLocator();
}

/* ─────────── comparaison : écran partagé, valve normale à gauche, malade à droite ─────────── */
// Même cœur, même instant du cycle, même coupe et même point de vue ; seule la valve change (et l'anneau dilaté de la
// tricuspide, porté par la déformation du cœur). Chaque moitié est dessinée avec sa propre valve (contact.split).
const cmpTags = document.createElement('div');
cmpTags.className = 'compare-tags hidden'; cmpTags.setAttribute('aria-hidden', 'true');
cmpTags.innerHTML = '<i></i><span class="cmp-l">Normale</span><span class="cmp-r"></span>';
canvasWrap.appendChild(cmpTags);
function syncCompareTags() {
  const v = state.valve && VALVE_VIEWS[state.valve], on = !!(state.comparer && v);
  cmpTags.classList.toggle('hidden', !on);
  if (!on) return;
  cmpTags.querySelector('.cmp-r').textContent = v.variantList.find(([k]) => k === v.variant)?.[1] ?? '';
  cmpTags.style.setProperty('--cmp-top', `${valveShift().top + 8}px`);
}
let splitShift = 0; // décalage vertical des vues des valves, relu au redimensionnement et à l'ouverture de la comparaison
function halfCamera(on) {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  if (!w || !h) return;
  camera.aspect = (on ? w / 2 : w) / h;
  camera.setViewOffset(on ? w / 2 : w, h, 0, splitShift, on ? w / 2 : w, h);
  camera.updateProjectionMatrix();
}
const splitHooks = {
  before(i) {
    const v = VALVE_VIEWS[state.valve]; if (!v) return;
    if (v.applyHalf) { v.applyHalf(i); renderer.shadowMap.needsUpdate = true; halfCamera(true); return; }
    const name = i === 0 ? 'normale' : v.variant, valve = v.valveFor(name), dil = v.dilationOf(name);
    if (state.doppler) doppler.setView(state.valve, name);
    heart.showValve(v.heartValveId, valve);
    if (v.dilationOf('normale') !== v.dilationOf(v.variant)) { // anneau dilaté d'un seul côté : cœur et valve redessinés
      heart.setDilation(dil);
      if (!trans) valveCut(v, 0);
      heart.redrawValve(valve, clock.elapsedTime, state.battement);
    }
    renderer.shadowMap.needsUpdate = true; // ombres de la valve de cette moitié (une seule carte d'ombre)
    halfCamera(true);
  },
  after() {
    const v = VALVE_VIEWS[state.valve]; if (!v) return;
    if (v.applyHalf) { v.applyHalf(null); halfCamera(false); return; }
    heart.showValve(v.heartValveId, v.valveFor(v.variant)); heart.setDilation(v.dilationOf(v.variant));
    if (state.doppler) doppler.setView(state.valve, v.variant);
    halfCamera(false);
  },
};
function setCompare(on) {
  const v = state.valve && VALVE_VIEWS[state.valve];
  on = !!(on && v);
  state.comparer = on;
  const btn = document.querySelector('[data-toggle="comparer"]');
  btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on));
  if (on && v.variant === 'normale') v.setVariant(v.variantList[1][0]); // à droite : la première pathologie
  if (v?.valveFor) heart.setExtraValves(on ? [[v.heartValveId, v.valveFor('normale')]] : []);
  contact.split = on ? splitHooks : null;
  if (v) { syncValveUI(); splitShift = valveShift().shift; restPose(); recenter(); } // cadrage refait pour une moitié d'écran
  syncCompareTags(); syncMarks(); syncLocator();
}

/* ─────────── vues des valves : zoom dans le cœur ─────────── */
// Chaque vue est tirée du cœur lui-même : depuis la vue en cours, la caméra plonge vers la valve en pivotant jusqu'à la
// vue chirurgicale, pendant que la coupe descend jusqu'au-dessus de l'anneau (oreillette ou aorte retirées). La valve
// normale est celle du cœur ; une variante pathologique prend sa place (js/av-views.js, js/aortic-view.js) et bat avec
// lui. D'une valve à l'autre : la caméra passe directement d'une vue à l'autre en reculant un peu ; la coupe remonte, puis
// redescend sur la nouvelle valve. Au retour, la caméra revient à la vue de départ et la coupe d'origine est rétablie.
let valvePanel = false; // panneau du choix des valves ouvert (sans valve choisie : la vue ne bouge pas)
// rubrique affichée : celle de la vue en cours, sinon « valves » si son panneau est ouvert
const groupOf = () => (state.valve ? VALVE_VIEWS[state.valve].group : valvePanel ? 'valves' : null);
// bouton d'une rubrique : ouvre sa vue (FOP : fosse ovale ; Coronaires : vue de face) ou referme la rubrique
function openGroup(g) {
  const cur = state.valve && VALVE_VIEWS[state.valve].group;
  if (g === 'valves') { if (state.valve) { valvePanel = false; goValve(null, () => { if (cur !== 'valves') { valvePanel = true; syncValveUI(); } }); } else { valvePanel = !valvePanel; syncValveUI(); } return; }
  if (cur === g) { goValve(null); return; }
  valvePanel = false;
  goValve(g === 'fop' ? 'fosse' : 'coronaires');
}
let valveOpen = false, trans = null, beforeValve = null;
// Côté d'observation : C (chirurgical, depuis l'oreillette ou l'aorte) ou V (ventriculaire, côté opposé)
let valveSide = 'C';
const sideOf = (v, side = valveSide) => v.sides[side] ?? v.sides.C;
for (const v of Object.values(VALVE_VIEWS)) for (const [side, sd] of Object.entries(v.sides)) {
  const mode = `v-${v.key}-${side}`;
  CUT_MODES[mode] = { normal: sd.cut.normal, min: sd.cut.def - 8, max: sd.cut.def + 16, def: sd.cut.def };
  INTERIOR_OFF[mode] = sd.interior; NO_GHOST.add(mode);
}
if (bubbles.mesh) bubbles.mesh.material.clippingPlanes = [cutPlane]; // bulles coupées avec le cœur (vue bicave)
// Doppler couleur (js/doppler.js) : flux de la valve regardée, sonde à la pointe ; légende sur le côté de la vue
const doppler = createDoppler(heart);
const dopLegend = document.createElement('div');
dopLegend.className = 'doppler-legend hidden'; dopLegend.setAttribute('role', 'note');
const nq = NYQUIST.toFixed(1).replace('.', ',');
dopLegend.innerHTML = `<b>Doppler couleur</b><small>Sonde à la pointe du cœur</small>
  <div class="dl-scale"><i class="dl-bar"></i><span class="dl-top">+${nq} m/s<em>vers la sonde</em></span><span class="dl-bot">−${nq} m/s<em>s'éloigne</em></span></div>
  <div class="dl-mos"><i></i><span>Mosaïque<em> : flux rapide et turbulent (fuite, rétrécissement)</em></span></div>`;
// Repère des vues des valves : petite coupe fixe où la valve regardée est entourée (image pré-rendue depuis le modèle,
// cœur en diastole, assets/reperes ; position et rayon du cercle en % de la largeur de l'image). Mitrale et tricuspide :
// coupe 4 cavités ; aortique : coupe 5 cavités ; pulmonaire : coupe frontale passant par la voie d'éjection du VD.
const LOCATOR = {
  mitrale: { img: 'coupe-4-cavites', cut: 'Coupe 4 cavités', x: 64.5, y: 47.3, r: 11.9 },
  tricuspide: { img: 'coupe-4-cavites', cut: 'Coupe 4 cavités', x: 36.1, y: 36.4, r: 11.5 },
  aortique: { img: 'coupe-5-cavites', cut: 'Coupe 5 cavités', x: 51.8, y: 44.5, r: 11.9 },
  pulmonaire: { img: 'coupe-frontale', cut: 'Coupe frontale (voie d’éjection du VD)', x: 50.8, y: 27.5, r: 13.0 },
};
const locator = document.createElement('figure');
locator.className = 'locator hidden';
locator.innerHTML = `<div class="loc-img"><img alt="" width="180" height="135"><svg viewBox="0 0 100 75" aria-hidden="true">
  <circle class="loc-halo"/><circle class="loc-ring"/></svg></div><figcaption></figcaption>`;
const sideStack = document.createElement('div');
sideStack.className = 'side-stack';
sideStack.append(locator, dopLegend);
canvasWrap.appendChild(sideStack);
function syncLocator() {
  const L = state.valve && LOCATOR[state.valve], on = !!(L && !state.comparer); // écran partagé : place laissée aux deux vues
  if (state.valve) sideStack.style.setProperty('--stack-top', `${valveShift().top + 10}px`); // sous le panneau des réglages
  locator.classList.toggle('hidden', !on);
  if (!on) return;
  const img = locator.querySelector('img');
  img.src = `assets/reperes/${L.img}.jpg`;
  img.alt = `${L.cut} : ${VALVE_VIEWS[state.valve].title.toLowerCase()} entourée`;
  for (const c of locator.querySelectorAll('circle')) { c.setAttribute('cx', L.x); c.setAttribute('cy', L.y * 0.75); c.setAttribute('r', L.r); }
  locator.querySelector('figcaption').textContent = L.cut;
}
function syncDoppler() {
  const v = state.valve && VALVE_VIEWS[state.valve], on = !!(state.doppler && v && v.group === 'valves');
  doppler.setView(on ? state.valve : null, v?.variant);
  doppler.setActive(on);
  dopLegend.classList.toggle('hidden', !on);
}
const FAR = 15; // coupe repoussée hors du cœur (rien n'est retiré)
// états de caméra : cible, direction (de la cible vers l'œil), distance, verticale
const camSt = () => { const off = camera.position.clone().sub(controls.target); return { target: controls.target.clone(), dir: off.clone().normalize(), dist: off.length(), up: camera.up.clone() }; };
const portrait = () => Math.max(1, 0.95 / (camera.aspect * (state.comparer ? 0.5 : 1))); // comparaison : moitié d'écran
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
  if (state.comparer) setCompare(false); // autre valve ou retour au cœur : écran entier
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
function syncPhaseButtons() {
  document.querySelectorAll('[data-vphase]').forEach((x) => x.classList.toggle('active', frozenPhase === null && !state.battement && (x.dataset.vphase === 'ouvert') === valveOpen));
}
// Interface : bouton « Valves », panneau (valve, côté, variante, position)
function syncValveUI() {
  const v = state.valve && VALVE_VIEWS[state.valve], group = groupOf(), open = !!group, isValve = group === 'valves';
  document.getElementById('valve-tools').classList.toggle('hidden', !open);
  document.querySelectorAll('[data-group]').forEach((el) => el.classList.toggle('hidden', el.dataset.group !== group));
  document.getElementById('valve-variants').classList.toggle('hidden', !v || v.variantList.length < 2);
  document.querySelector('[data-vphase]').parentElement.classList.toggle('hidden', !v || !isValve);
  document.querySelector('[data-vside]').parentElement.classList.toggle('hidden', !v || !isValve);
  document.querySelectorAll('[data-vside]').forEach((b) => { b.classList.toggle('active', b.dataset.vside === valveSide); b.setAttribute('aria-pressed', String(b.dataset.vside === valveSide)); });
  for (const [name, g] of [['valves', 'valves'], ['fop', 'fop'], ['coro', 'coro']]) {
    const btn = document.querySelector(`[data-toggle="${name}"]`); if (!btn) continue;
    btn.classList.toggle('on', group === g); btn.setAttribute('aria-pressed', String(group === g));
  }
  canvasWrap.classList.toggle('is-valve', !!v);
  document.querySelector('[data-toggle="comparer"]').classList.toggle('hidden', !v || v.compare === false);
  document.querySelector('[data-toggle="doppler"]').classList.toggle('hidden', !v || !isValve);
  syncCutOnly();
  syncDoppler(); syncLocator();
  document.querySelectorAll('[data-valve]').forEach((b) => b.classList.toggle('active', b.dataset.valve === state.valve));
  if (v) {
    const seg = document.getElementById('valve-variants');
    seg.innerHTML = v.variantList.map(([k, l]) => `<button type="button" data-variant="${k}" class="${k === v.variant ? 'active' : ''}">${l}</button>`).join('');
    seg.querySelectorAll('[data-variant]').forEach((b) => b.addEventListener('click', () => {
      v.setVariant(b.dataset.variant);
      if (state.comparer && v.variant === 'normale') setCompare(false); // normale contre normale : comparaison close
      syncValveUI(); restPose(); renderer.shadowMap.needsUpdate = true;
    }));
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

/* ─────────── repères des vues des valves (bouton « Repères ») ─────────── */
// Noms posés sur la valve, à l'aplomb de l'anneau : feuillets (mitrale, tricuspide), cuspides (aortique, pulmonaire),
// et l'aorte pour la mitrale (12 h, Lang 2012). Cuspides reconnues par les vues (js/aortic-view.js) : aortique,
// coronaire droite, coronaire gauche, non coronaire ; pulmonaire, antérieure, droite, gauche.
const valveMarks = {};
{
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const NAMES = [[/^Anterior leaflet of mitral/, 'Feuillet antérieur'], [/^Posterior leaflet of mitral/, 'Feuillet postérieur'],
    [/^Anterior leaflet of tricuspid/, 'Antérieur'], [/^Posterior leaflet of tricuspid/, 'Postérieur'], [/^Septal leaflet/, 'Septal']];
  const CUSPS = { aortique: ['Coronaire droite', 'Coronaire gauche', 'Non coronaire'], pulmonaire: ['Antérieure', 'Droite', 'Gauche'] };
  const mark = (text, pos, cls = '') => {
    const el = document.createElement('div'); el.className = 'ao-label ' + cls; el.textContent = text;
    const o = new CSS2DObject(el); o.position.copy(pos); o.visible = false; heart.root.add(o); return o;
  };
  for (const [key, id] of [['mitrale', 'valve-mitrale'], ['tricuspide', 'valve-tricuspide'], ['aortique', 'valve-aortique'], ['pulmonaire', 'valve-pulmonaire']]) {
    const d = heart.valveData[id]; if (!d) continue;
    const C = V3(d.center), E1 = V3(d.e1), E2 = V3(d.e2), [ra, rb] = d.radii ?? [d.radius, d.radius];
    const at = (t, k) => C.clone().addScaledVector(E1, ra * k * Math.cos(t)).addScaledVector(E2, rb * k * Math.sin(t));
    const list = [];
    if (CUSPS[key]) VALVE_VIEWS[key].cusps.forEach((c, i) => list.push(mark(CUSPS[key][i], at((c.t0 + c.t1) / 2, 0.55))));
    else for (const l of d.leaflets) {
      const name = NAMES.find(([re]) => re.test(l.name)); if (!name) continue;
      list.push(mark(name[1], at((l.t0 + l.t1) / 2, 0.6)));
    }
    if (key === 'aortique') for (const [side, o] of Object.entries(heart.ostia ?? {})) list.push(mark(`Ostium coronaire ${side}`, o.point.clone().addScaledVector(o.normal, -0.45), 'struct')); // au-delà de la paroi : ne cache pas le nom de la cuspide
    if (key === 'mitrale') list.push(mark('Aorte', C.clone().addScaledVector(VALVE_VIEWS.mitrale.sides.C.up, Math.max(ra, rb) * 1.18), 'struct'));
    valveMarks[key] = list;
  }
  const fo = heart.fossa;
  if (fo) {
    valveMarks.fosse = [mark('Fosse ovale', fo.F.clone().addScaledVector(fo.n, -0.2)), mark('Limbe (septum secundum)', fo.F.clone().addScaledVector(fo.up, fo.a * 1.25).addScaledVector(fo.n, -0.3)),
      mark('Veine cave supérieure', fo.svc, 'struct'), mark('Veine cave inférieure', fo.ivc, 'struct')];
    valveMarks.fop = [mark('Oreillette droite', fo.ra, 'struct'), mark('Oreillette gauche', fo.la, 'struct'), mark('FOP', fo.tunnel[1].clone().addScaledVector(fo.up, 0.4))];
  }
  const inf = heart.infarct;
  valveMarks.coronaires = [];
  if (inf?.point) {
    const occ = mark('Occlusion (IVA 2)', inf.point, 'struct'), zone = mark('Territoire akinétique', inf.center);
    occ.userData.variant = zone.userData.variant = 'idm';
    valveMarks.coronaires.push(occ, zone);
  }
}
function syncMarks() {
  for (const [key, list] of Object.entries(valveMarks)) {
    const on = state.reperes && state.valve === key && !trans && !state.comparer; // pas de noms en écran partagé
    list.forEach((o) => { o.visible = on && (!o.userData.variant || o.userData.variant === VALVE_VIEWS[key].variant); });
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
  if (name === 'comparer') { setCompare(value ?? !state.comparer); return; }
  if (name === 'valves' || name === 'fop' || name === 'coro') { openGroup(name); return; }
  if (name === 'coupe' && state.valve) { goValve(null, () => toggle(name, value)); return; }
  state[name] = value ?? !state[name];
  renderer.shadowMap.needsUpdate = true;
  const btn = document.querySelector(`[data-toggle="${name}"]`);
  if (btn) { btn.classList.toggle('on', state[name]); btn.setAttribute('aria-pressed', String(state[name])); }
  if (name === 'battement') {
    const t = document.querySelector('.beat-txt'); if (t) t.textContent = state.battement ? 'Pause' : 'Battement';
    if (state.battement) { if (frozenPhase !== null) beatPhase = frozenPhase; frozenPhase = null; }
    else frozenPhase = beatPhase; // pause : le cœur reste à l'instant où on l'arrête
    syncPhaseButtons();
  }
  if (name === 'reperes') { canvasWrap.classList.toggle('show-marks', state.reperes); syncMarks(); }
  if (name === 'doppler') syncDoppler();
  if (name === 'coupe') restPose();
  if (name === 'coupe') { if (state.coupe) viewForCut(state.modeCoupe, true); else if (camera.up.y < 0.99 || controls.target.distanceTo(CENTER) > 0.01) goView('anterieure'); applyClipping(); document.getElementById('cut-tools').classList.toggle('hidden', !state.coupe); if (!state.coupe && state.selected && STRUCTURES[state.selected]?.coupe) select(null); }
  if (name === 'coronaires') { ['coronaire-droite', 'tronc-commun', 'iva', 'circonflexe', 'sinus-coronaire', 'grande-veine-cardiaque', 'veine-cardiaque-moyenne', 'petites-veines-cardiaques'].forEach((id) => (heart.registry[id]?.meshes || []).forEach((m) => { m.visible = state.coronaires && (!m.userData.ostium || state.coupe); })); }
}

// Recentrer : cadrage de départ de la vue en cours (valve, coupe, ou face antérieure)
function recenter() {
  if (trans) { pendingAction = recenter; return; }
  const v = state.valve && VALVE_VIEWS[state.valve];
  if (v) { runSteps([{ dur: 0.6, to: () => closeCam(v), onEnd: () => viewOffset() }], () => restPose()); return; }
  if (state.coupe) viewForCut(state.modeCoupe); else goView('anterieure');
}
// Lien de la vue en cours (valve, côté, variante, position ou instant du cycle, coupe, vitesse, repères), tenu à jour
// dans la barre d'adresse : le médecin peut préparer une vue, l'envoyer au patient ou la rouvrir en consultation.
function viewParams() {
  const q = new URLSearchParams();
  if (state.valve) {
    const v = VALVE_VIEWS[state.valve];
    q.set('valve', state.valve); q.set('cote', valveSide === 'C' ? 'chirurgien' : 'ventricule');
    if (v.variant !== 'normale') q.set('variante', v.variant);
  } else if (state.coupe) q.set('coupe', state.modeCoupe);
  if (!state.battement) {
    if (frozenPhase !== null) q.set('instant', String(Math.round(frozenPhase * 940)));
    else if (state.valve) q.set('position', valveOpen ? 'ouverte' : 'fermee');
    else q.set('battement', 'pause');
  }
  if (beatSpeed !== 1) q.set('vitesse', String(beatSpeed));
  if (state.comparer) q.set('comparer', '1');
  if (state.doppler && state.valve) q.set('doppler', '1');
  if (state.reperes) q.set('reperes', '1');
  return q.toString();
}
let urlShown = location.search.slice(1);
function syncURL() {
  if (trans) return;
  const q = viewParams();
  if (q !== urlShown) { urlShown = q; history.replaceState(null, '', q ? '?' + q : location.pathname); }
}
function applyURL() {
  const q = new URLSearchParams(location.search);
  if (q.get('reperes') === '1') toggle('reperes', true);
  if (q.get('doppler') === '1') toggle('doppler', true);
  const sp = parseFloat(q.get('vitesse'));
  if ([0.5, 0.25].includes(sp)) { beatSpeed = sp; document.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('active', parseFloat(x.dataset.speed) === sp)); }
  const inst = parseFloat(q.get('instant')), pos = q.get('position');
  if (Number.isFinite(inst) || pos || q.get('battement') === 'pause') {
    toggle('battement', false);
    if (Number.isFinite(inst)) { frozenPhase = ((inst / 940) % 1 + 1) % 1; beatPhase = frozenPhase; } else frozenPhase = null;
    if (pos) valveOpen = pos === 'ouverte';
    syncPhaseButtons(); syncCycleUI(); restPose();
  }
  const valve = q.get('valve'), coupe = q.get('coupe');
  if (VALVE_VIEWS[valve]) {
    valveSide = q.get('cote') === 'ventricule' ? 'V' : 'C';
    const v = VALVE_VIEWS[valve], vr = q.get('variante');
    if (vr && v.variantList.some(([k]) => k === vr)) v.setVariant(vr);
    goValve(valve, () => { if (q.get('comparer') === '1') setCompare(true); });
  } else if (CUT_MODES[coupe] && !coupe.startsWith('v-')) { toggle('coupe', true); chooseCut(coupe); }
}
let toastTimer = 0;
function toast(text) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); canvasWrap.appendChild(el); }
  el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}
async function shareView() {
  syncURL();
  const url = location.href;
  if (navigator.share && matchMedia('(pointer: coarse)').matches) { try { await navigator.share({ title: document.title, url }); return; } catch { /* partage annulé */ } }
  try { await navigator.clipboard.writeText(url); toast('Lien de cette vue copié'); } catch { toast(url); }
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
  document.querySelector('[data-action="recentrer"]').addEventListener('click', recenter);
  document.querySelector('[data-action="partager"]').addEventListener('click', shareView);
  document.querySelectorAll('[data-cut]').forEach((b) => b.addEventListener('click', () => chooseCut(b.dataset.cut)));
  document.querySelectorAll('[data-valve]').forEach((b) => b.addEventListener('click', () => goValve(b.dataset.valve)));
  document.querySelectorAll('[data-vside]').forEach((b) => b.addEventListener('click', () => setValveSide(b.dataset.vside)));
  document.querySelectorAll('[data-vphase]').forEach((b) => b.addEventListener('click', () => {
    valveOpen = b.dataset.vphase === 'ouvert';
    if (state.battement) toggle('battement', false);
    frozenPhase = null; // position choisie : plus d'instant figé du cycle
    syncPhaseButtons(); syncCycleUI();
    restPose();
  }));
  document.getElementById('cut-depth').addEventListener('input', (e) => setCutDepth(parseFloat(e.target.value)));
  // curseur du cycle : glisser arrête le cœur à cet instant (valves comprises) ; vitesse : réel, ½, ¼
  cyclePos.addEventListener('pointerdown', () => { scrubbing = true; });
  addEventListener('pointerup', () => { scrubbing = false; });
  cyclePos.addEventListener('change', () => { scrubbing = false; });
  cyclePos.addEventListener('input', () => {
    if (state.battement) toggle('battement', false);
    frozenPhase = parseInt(cyclePos.value, 10) / 1000; beatPhase = frozenPhase;
    cyclePos.setAttribute('aria-valuetext', phaseText(frozenPhase));
    syncPhaseButtons(); syncCycleUI(); restPose();
  });
  document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
    beatSpeed = parseFloat(b.dataset.speed);
    document.querySelectorAll('[data-speed]').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    if (!state.battement) toggle('battement', true);
  }));
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
// en local (développement) : pas de cache hors ligne, sans quoi les essais tourneraient sur l'ancienne version
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator && LOCAL) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  caches?.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
}
else if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

/* ─────────── boucle ─────────── */
function resize() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  if (!w || !h) return; // scène pas encore disposée (onglet masqué) : on attendra l'événement resize
  camera.aspect = w / h;
  controls.maxDistance = Math.max(60, viewDistance() * 1.1); // téléphone en portrait : le cadrage peut dépasser 60 cm
  viewOffset(); camera.updateProjectionMatrix();
  if (state.valve) splitShift = valveShift().shift;
  renderer.setSize(w, h); labelRenderer.setSize(w, h); contact.setSize(w, h);
}
// Ombres de contact (occlusion ambiante en espace écran, js/contact-shadows.js)
const contact = new ContactShadows(renderer, scene, camera, { overlayLayer: OVERLAY_LAYER });
window.addEventListener('resize', resize);
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvasWrap);
resize();
goView('anterieure', true);
applyURL(); // vue demandée par le lien (valve, coupe, instant du cycle…)

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
let beatIdle = true;
let frame = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  if (camAnim && !trans) stepCamAnim(dt);
  updateDepthFog(dt);
  // battement physiologique : cycle complet (≈ 64 battements par minute) ; au repos, planche figée en diastole
  if (state.battement) {
    beatPhase = (beatPhase + Math.min(dt, 0.1) * beatSpeed * BPM / 60) % 1;
    heart.setBeat(beatPhase); beatIdle = false;
    if (frame % 3 === 0) renderer.shadowMap.needsUpdate = true;
    if ((frame & 1) === 0) syncCycleUI();
  }
  else if (!beatIdle) { beatIdle = true; restPose(); }
  if (trans) stepTrans(dt); // zoom vers une valve
  else if (state.valve && state.battement) valveCut(VALVE_VIEWS[state.valve], 0); // la coupe suit la valve qui bat
  // valves : ressorts, retard du bord libre, vibration dans le flux (visibles seulement en coupe et dans les vues des valves)
  if (state.coupe && heart.stepValves(dt, t, state.battement) && frame % 3 === 0) renderer.shadowMap.needsUpdate = true;
  bubbles.update(Math.min(dt, 0.1) * beatSpeed, state.battement ? beatPhase : frozenPhase ?? 0, state.battement);
  // Doppler : instant du cycle ; vue figée (valve ouverte ou fermée) : instant représentatif de cette position
  doppler.update(state.battement ? Math.min(dt, 0.1) * beatSpeed : 0,
    state.battement ? beatPhase * 940 : frozenPhase !== null ? frozenPhase * 940 : restTime(state.valve && VALVE_VIEWS[state.valve].phase, valveOpen), camera.position);
  controls.update();
  if ((frame & 7) === 0) { updateOrientation(); syncMarks(); }
  if (frame % 30 === 0) syncURL();
  if ((frame++ & 3) === 0) occludeLabels();
  contact.render(); // scène + ombres de contact + calque d'interface
  labelRenderer.render(scene, camera);
}
animate();

// Exposé pour le débogage et les tests pilotés
window.__planche = { debug, setValveSide, scene, camera, controls, heart, state, select, toggle, goView, goDir, setCutMode, renderer, contact, VALVE_VIEWS, goValve, chooseCut, CUT_MODES, get CURVE() { return CURVE; }, cutViewDir, setCutDepth };
