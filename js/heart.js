// Modèle 3D procédural du cœur — unités en centimètres.
// Repère monde : +x = gauche du patient, +y = haut, +z = avant (vers l'observateur en vue antérieure).
// La masse ventriculaire est construite dans un repère local incliné (axe base→apex),
// les grands vaisseaux dans le repère monde (ils se rapportent au thorax).
import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

// Six jetons sémantiques, identiques aux variables CSS (--sang-riche, --sang-pauvre, --muscle, --graisse, --valve, --conduction)
// et aux couleurs de pastille de js/data.js.
export const COL = {
  myocarde: 0xb25048,
  myocardeCoupe: 0xa3463f,
  endocarde: 0x5e2222,
  oreillette: 0xc98078,
  artere: 0xc43a33,
  arterePulm: 0x43589f,   // sang pauvre en oxygène
  veine: 0x43589f,
  veinePulm: 0xc43a33,    // sang riche en oxygène
  graisse: 0xe5d2a6,
  coronaire: 0xc43a33,
  veineCard: 0x43589f,
  valve: 0xefe3d3,
  conduction: 0xf3c23b,
  ligament: 0xcbb79a,
  // lumière des vaisseaux sectionnés (teinte de la paroi, assombrie) et anneau de paroi
  lumenArtere: 0x7a2522, lumenVeine: 0x2a3870,
  paroiArtere: 0xa9312b, paroiVeine: 0x384a86,
};

/* ─────────── repère local du cœur ─────────── */
const B = new THREE.Vector3(-0.3, 1.2, -0.6);          // centre de la base ventriculaire
const APEX = new THREE.Vector3(3.4, -5.2, 1.8);         // pointe du cœur
const AXIS = APEX.clone().sub(B);
const L = AXIS.length();
AXIS.normalize();
const ZW = new THREE.Vector3(0, 0, 1);
const U = ZW.clone().sub(AXIS.clone().multiplyScalar(ZW.dot(AXIS))).normalize(); // "avant" local
const V = new THREE.Vector3().crossVectors(U, AXIS).normalize();                    // "gauche" local
const M = new THREE.Matrix4().makeBasis(V, AXIS.clone().negate(), U).setPosition(B);
const Z_SCALE = 0.86; // aplatissement antéro-postérieur de la masse ventriculaire

export function L2W(p) { return p.clone().applyMatrix4(M); }
const l = (x, y, z) => L2W(new THREE.Vector3(x, y, z));

// Profil de rayon de la masse ventriculaire (t = 0 base → 1 apex), interpolation Catmull-Rom.
const PROFIL = [3.75, 4.15, 4.35, 4.3, 4.15, 3.85, 3.4, 2.8, 2.05, 1.15, 0.0];
function rOf(t) {
  t = THREE.MathUtils.clamp(t, 0, 1);
  const n = PROFIL.length - 1;
  const x = t * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  const p0 = PROFIL[Math.max(i - 1, 0)], p1 = PROFIL[i], p2 = PROFIL[i + 1], p3 = PROFIL[Math.min(i + 2, n)];
  return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}
// Point sur la surface ventriculaire (repère local). theta : 0 = avant, +90° = gauche.
export function surf(t, thetaDeg, off = 0) {
  const th = THREE.MathUtils.degToRad(thetaDeg);
  const r = rOf(t) + off;
  return new THREE.Vector3(r * Math.sin(th), -L * t, r * Math.cos(th) * Z_SCALE);
}

/* ─────────── utilitaires géométriques ─────────── */
function noise(x, y, z) {
  return 0.5 * Math.sin(2.1 * x + 1.3 * y) * Math.cos(1.7 * z - 0.6 * x) + 0.5 * Math.sin(3.3 * y + 0.7 * z) * Math.cos(2.4 * x);
}

function ventricularMassGeometry() {
  const geo = new ParametricGeometry((uu, vv, target) => {
    const theta = (1 - uu) * Math.PI * 2; // sens inversé pour que les faces avant pointent vers l'extérieur (nécessaire au stencil de coupe)
    const t = -0.1 + vv * 1.1; // léger dôme à la base (t<0)
    let r;
    if (t < 0) {
      const k = Math.sqrt(Math.max(0, 1 - (t / 0.1) * (t / 0.1)));
      r = rOf(0) * k;
    } else r = rOf(t);
    const y = t < 0 ? -L * t * 0.35 : -L * t;
    const x0 = r * Math.sin(theta), z0 = r * Math.cos(theta) * Z_SCALE;
    const bump = 1 + 0.012 * noise(x0, y, z0);
    target.set(x0 * bump, y, z0 * bump);
  }, 96, 64);
  geo.computeVertexNormals();
  return geo;
}

function ellipsoid(rx, ry, rz, seg = 48) {
  const g = new THREE.SphereGeometry(1, seg, seg);
  g.scale(rx, ry, rz);
  return g;
}

// Ellipsoïde (ax, ay, az) plié en arc de rayon R autour de l'axe Y local, centré sur l'angle phiC
// (0 = +z, sens positif vers +x). L'application préserve l'orientation des faces.
function bentEllipsoid(ax, ay, az, R, phiC, seg = 56) {
  const g = new THREE.SphereGeometry(1, seg, seg);
  g.scale(ax, ay, az);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const phi = phiC + x / R;
    p.setXYZ(i, (R + z) * Math.sin(phi), y, (R + z) * Math.cos(phi));
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

// Tube à rayon variable le long d'une courbe Catmull-Rom.
export function tubeGeometry(points, radiusFn, segs = 64, radial = 20) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], uv = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    const r = typeof radiusFn === 'function' ? radiusFn(t) : radiusFn;
    const nn = frames.normals[i], bb = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      const cx = -Math.cos(ang), cy = Math.sin(ang);
      N.set(cx * nn.x + cy * bb.x, cx * nn.y + cy * bb.y, cx * nn.z + cy * bb.z).normalize();
      pos.push(P.x + r * N.x, P.y + r * N.y, P.z + r * N.z);
      nor.push(N.x, N.y, N.z);
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j, c = b + 1, d = a + 1;
      idx.push(a, b, d, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.userData.curve = curve;
  return g;
}

// Extrémité « sectionnée » d'un vaisseau : lumière colorée + anneau de paroi (plus épais pour une artère).
function lumenCap(curve, atEnd, r, lumMat, wallMat, wallFrac) {
  const t = atEnd ? 1 : 0;
  const p = curve.getPointAt(t);
  const tan = curve.getTangentAt(t);
  const group = new THREE.Group();
  const lum = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 32), lumMat);
  lum.position.set(0, 0, -0.03); // local +z = vers l'extérieur après lookAt
  const wall = new THREE.Mesh(new THREE.RingGeometry(r * (1 - wallFrac), r * 0.99, 32), wallMat);
  wall.position.set(0, 0, -0.01);
  group.add(lum, wall);
  group.position.copy(p);
  group.lookAt(p.clone().add(tan.clone().multiplyScalar(atEnd ? 1 : -1)));
  [lum, wall].forEach((m) => { m.userData.cap = true; });
  group.userData.cap = true;
  return group;
}

/* ─────────── construction ─────────── */
export function buildHeart() {
  const root = new THREE.Group();
  root.name = 'coeur';
  const local = new THREE.Group();
  local.matrixAutoUpdate = false;
  local.matrix.copy(M);
  root.add(local);

  const registry = {};        // id → { meshes: [], anchor: Vector3 (monde) }
  const materials = [];       // matériaux opaques (pour le mode translucide)
  const solids = [];          // { mesh, hole:boolean, capColor } pour la coupe (stencil)
  const cutOnly = [];         // objets visibles seulement en coupe
  const flowPaths = [];       // { points:[Vector3], color, speed }

  const mkMat = (color, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.0, side: THREE.DoubleSide, ...opts });
    m.userData.baseColor = new THREE.Color(color);
    m.userData.baseOpacity = 1;
    materials.push(m);
    return m;
  };
  // matériaux partagés des extrémités sectionnées
  const lumMats = { artere: mkMat(COL.lumenArtere, { roughness: 0.85 }), veine: mkMat(COL.lumenVeine, { roughness: 0.85 }) };
  const wallMats = { artere: mkMat(COL.paroiArtere, { roughness: 0.7 }), veine: mkMat(COL.paroiVeine, { roughness: 0.7 }) };
  const register = (id, mesh, anchorWorld, group = root) => {
    mesh.userData.id = id;
    group.add(mesh);
    if (!registry[id]) registry[id] = { meshes: [], anchor: null };
    registry[id].meshes.push(mesh);
    if (anchorWorld && !registry[id].anchor) registry[id].anchor = anchorWorld.clone();
    return mesh;
  };
  const vessel = (id, points, radius, color, { caps = [false, false], seg = 64, group = root, anchorT = 0.5, capColor, type = 'artere', roughness = 0.55 } = {}) => {
    const g = tubeGeometry(points, radius, seg, 22);
    const mat = mkMat(color, { roughness });
    const mesh = new THREE.Mesh(g, mat);
    const curve = g.userData.curve;
    const anchor = curve.getPointAt(anchorT);
    const anchorW = group === local ? L2W(anchor) : anchor;
    register(id, mesh, anchorW, group);
    caps.forEach((c, i) => {
      if (!c) return;
      const r = typeof radius === 'function' ? radius(i) : radius;
      const cap = lumenCap(curve, i === 1, r, lumMats[type], wallMats[type], type === 'artere' ? 0.2 : 0.12);
      register(id, cap, null, group);
    });
    solids.push({ mesh, hole: false, capColor: capColor ?? color, open: true });
    return mesh;
  };

  /* ── Masse ventriculaire ── */
  const myoMat = mkMat(COL.myocarde, { roughness: 0.74 });
  const mass = new THREE.Mesh(ventricularMassGeometry(), myoMat);
  mass.userData.id = 'ventricule-droit'; // par défaut, résolu finement au clic (voir pickId)
  local.add(mass);
  solids.push({ mesh: mass, hole: false, capColor: COL.myocardeCoupe });
  registry['ventricule-droit'] = { meshes: [mass], anchor: L2W(surf(0.42, -45, 0)) };
  registry['ventricule-gauche'] = { meshes: [mass], anchor: L2W(surf(0.5, 75, 0)) };
  registry['apex'] = { meshes: [mass], anchor: L2W(surf(0.985, 20, 0)) };
  registry['septum-interventriculaire'] = { meshes: [], anchor: l(-0.35, -3.0, 0.5) };

  // Infundibulum (cône artériel du VD) montant vers la valve pulmonaire
  const PT_ROOT_L = new THREE.Vector3(1.45, 1.9, 2.15); // en avant et à gauche de la racine aortique (axes distants ≥ 3 cm)
  const infund = vessel('ventricule-droit', [new THREE.Vector3(0.2, -1.6, 2.4), new THREE.Vector3(0.7, -0.2, 2.5), PT_ROOT_L.clone().add(new THREE.Vector3(0, 0.1, 0))],
    (t) => 1.75 - 0.3 * t, COL.myocarde, { group: local, seg: 24 });
  infund.material = myoMat;

  /* ── Cavités ventriculaires (trous pour la coupe) ── */
  const endoMat = mkMat(COL.endocarde, { side: THREE.BackSide, roughness: 0.8 });
  // VG : cavité conique à paroi épaisse (≈ 1 cm), dans la moitié postéro-gauche de la masse.
  const LV_C = new THREE.Vector3(1.0, -3.0, -0.6);
  const lvCav = new THREE.Mesh(ellipsoid(2.0, 2.9, 1.9), endoMat); // paroi VG ≈ 1,0–1,2 cm
  lvCav.position.copy(LV_C);
  lvCav.userData.id = 'ventricule-gauche';
  local.add(lvCav);
  solids.push({ mesh: lvCav, hole: true });
  cutOnly.push(lvCav);

  // VD : cavité en croissant qui s'enroule en avant et à droite du VG (ellipsoïde « plié » autour de l'axe du VG),
  // paroi libre mince (≈ 0,4 cm), septum ≈ 0,7 cm. Surface fermée sans auto-intersection (requis par le stencil).
  // croissant large (≈ 1,6 cm d'épaisseur), paroi libre 0,4–0,8 cm, septum 0,6–1,0 cm
  const rvCav = new THREE.Mesh(bentEllipsoid(3.2, 2.6, 0.8, 2.85, THREE.MathUtils.degToRad(-45)), endoMat);
  rvCav.position.set(LV_C.x - 0.75, -2.3, LV_C.z + 0.3);
  rvCav.userData.id = 'ventricule-droit';
  local.add(rvCav);
  solids.push({ mesh: rvCav, hole: true });
  cutOnly.push(rvCav);

  /* ── Oreillettes ── */
  const atrMat = mkMat(COL.oreillette, { roughness: 0.7 });
  const ra = new THREE.Mesh(ellipsoid(2.2, 2.45, 2.1), atrMat);
  ra.position.set(-2.5, 1.95, -0.4);
  register('oreillette-droite', ra, L2W(new THREE.Vector3(-4.6, 2.8, 0.4)), local);
  solids.push({ mesh: ra, hole: false, capColor: COL.myocardeCoupe });
  const raCav = new THREE.Mesh(ellipsoid(1.9, 2.1, 1.8), endoMat);
  raCav.position.copy(ra.position);
  raCav.userData.id = 'oreillette-droite';
  local.add(raCav);
  solids.push({ mesh: raCav, hole: true });
  cutOnly.push(raCav);

  const raAur = new THREE.Mesh(ellipsoid(1.35, 0.95, 1.25), atrMat);
  raAur.position.set(-1.55, 1.9, 1.55);
  raAur.rotation.y = -0.4;
  register('auricule-droite', raAur, L2W(new THREE.Vector3(-1.9, 2.4, 3.0)), local);
  solids.push({ mesh: raAur, hole: false, capColor: COL.myocardeCoupe });

  const la = new THREE.Mesh(ellipsoid(2.7, 2.1, 1.9), atrMat);
  la.position.set(0.55, 2.05, -2.7);
  register('oreillette-gauche', la, L2W(new THREE.Vector3(1.2, 3.2, -4.7)), local);
  solids.push({ mesh: la, hole: false, capColor: COL.myocardeCoupe });
  const laCav = new THREE.Mesh(ellipsoid(2.35, 1.75, 1.55), endoMat);
  laCav.position.copy(la.position);
  laCav.userData.id = 'oreillette-gauche';
  local.add(laCav);
  solids.push({ mesh: laCav, hole: true });
  cutOnly.push(laCav);

  const laAur = vessel('auricule-gauche', [new THREE.Vector3(2.6, 2.0, -1.2), new THREE.Vector3(3.2, 1.7, 0.2), new THREE.Vector3(3.1, 1.35, 1.6), new THREE.Vector3(2.5, 1.1, 2.5)],
    (t) => 0.75 - 0.35 * t, COL.oreillette, { group: local, seg: 24, anchorT: 0.8 });
  laAur.material = atrMat;

  /* ── Sillons (graisse épicardique) ── */
  const fatMat = mkMat(COL.graisse, { roughness: 0.88 });
  // la graisse est enfoncée dans la surface (-0.08) : coussinet qui comble le sillon plutôt que tube posé dessus
  const sulcusPts = (list) => list.map(([t, th]) => surf(t, th, -0.08));
  // sillon coronaire : interrompu en avant par l'infundibulum et le tronc pulmonaire (de -20° à +35°)
  const coroD = [], coroG = [];
  for (let th = -20; th >= -180; th -= 12) coroD.push(surf(0.01, th, 0.0));
  for (let th = 35; th <= 180; th += 12) coroG.push(surf(0.01, th, 0.0));
  const sCoroD = vessel('sillons', coroD, 0.45, COL.graisse, { group: local, seg: 48, anchorT: 0.3 });
  sCoroD.material = fatMat;
  const sCoroG = vessel('sillons', coroG, 0.45, COL.graisse, { group: local, seg: 48, anchorT: 0.3 });
  sCoroG.material = fatMat;
  // sillon interventriculaire antérieur
  const sIVA = vessel('sillons', sulcusPts([[0.0, 24], [0.2, 22], [0.4, 20], [0.6, 18], [0.8, 15], [0.95, 12]]), 0.36, COL.graisse, { group: local, seg: 32 });
  sIVA.material = fatMat;
  // sillon interventriculaire postérieur
  const sIVP = vessel('sillons', sulcusPts([[0.0, -168], [0.2, -166], [0.4, -164], [0.6, -162], [0.8, -160], [0.93, -158]]), 0.36, COL.graisse, { group: local, seg: 32 });
  sIVP.material = fatMat;

  /* ── Grands vaisseaux (repère monde) ── */
  const AO_ROOT = l(-0.25, 1.75, 0.55);
  const PT_ROOT = L2W(PT_ROOT_L);

  // Aorte : ascendante → crosse → descendante
  // Aorte ascendante à droite et en arrière du tronc pulmonaire (axes distants ≥ 3 cm) ; crosse relevée pour
  // ménager l'intervalle du ligament artériel au-dessus de l'artère pulmonaire gauche.
  const aortePts = [
    AO_ROOT, l(-0.3, 2.6, 0.5),
    new THREE.Vector3(-1.7, 5.0, -0.45), new THREE.Vector3(-1.3, 7.3, -0.8),
    new THREE.Vector3(0.0, 9.8, -1.2), new THREE.Vector3(1.3, 10.3, -2.2), new THREE.Vector3(2.5, 9.7, -3.8),
    new THREE.Vector3(3.3, 7.6, -4.6), new THREE.Vector3(3.5, 4.0, -5.2), new THREE.Vector3(3.3, 0.0, -5.6), new THREE.Vector3(3.0, -4.0, -5.9), new THREE.Vector3(2.8, -8.0, -6.1),
  ];
  const aorte = vessel('aorte', aortePts, (t) => {
    if (t < 0.05) return 1.55 + 0.25 * Math.sin(t / 0.05 * Math.PI); // sinus de Valsalva
    if (t < 0.35) return 1.5 - 0.1 * (t - 0.05) / 0.3;
    if (t < 0.55) return 1.4 - 0.2 * (t - 0.35) / 0.2;
    return 1.2 - 0.1 * (t - 0.55) / 0.45;
  }, COL.artere, { caps: [false, true], seg: 110, anchorT: 0.3 });
  registry['aorte'].anchor = new THREE.Vector3(-1.7, 5.6, 0.95); // face antérieure de l'aorte ascendante (visible en vue de face)

  // Branches de la crosse
  vessel('tronc-brachio-cephalique', [new THREE.Vector3(0.15, 9.8, -1.25), new THREE.Vector3(-0.4, 11.3, -1.0), new THREE.Vector3(-1.2, 12.4, -0.85)], 0.62, COL.artere, { seg: 16, anchorT: 0.6 });
  vessel('tronc-brachio-cephalique', [new THREE.Vector3(-1.2, 12.4, -0.85), new THREE.Vector3(-1.5, 13.5, -0.7), new THREE.Vector3(-1.7, 14.7, -0.6)], 0.45, COL.artere, { caps: [false, true], seg: 12 }); // carotide commune droite
  vessel('tronc-brachio-cephalique', [new THREE.Vector3(-1.2, 12.4, -0.85), new THREE.Vector3(-2.6, 13.2, -0.95), new THREE.Vector3(-4.6, 13.5, -1.1)], 0.45, COL.artere, { caps: [false, true], seg: 12 }); // subclavière droite
  vessel('carotide-commune-gauche', [new THREE.Vector3(1.25, 10.3, -2.2), new THREE.Vector3(1.2, 12.4, -2.0), new THREE.Vector3(1.1, 14.7, -1.9)], 0.46, COL.artere, { caps: [false, true], seg: 12, anchorT: 0.7 });
  vessel('subclaviere-gauche', [new THREE.Vector3(2.15, 10.05, -2.95), new THREE.Vector3(2.9, 11.9, -3.1), new THREE.Vector3(4.8, 13.0, -3.3)], 0.46, COL.artere, { caps: [false, true], seg: 12, anchorT: 0.7 });

  // Tronc pulmonaire : naît en avant et à gauche de l'aorte, longe son bord gauche sans la recouvrir, se divise sous la crosse
  const BIF = new THREE.Vector3(1.6, 7.5, -1.4);
  const ptPts = [PT_ROOT, PT_ROOT.clone().add(new THREE.Vector3(0.3, 1.2, -0.1)), new THREE.Vector3(1.3, 6.0, 0.7), new THREE.Vector3(1.5, 7.2, -0.6), BIF];
  vessel('tronc-pulmonaire', ptPts, (t) => 1.45 - 0.1 * t, COL.arterePulm, { seg: 48, anchorT: 0.45, type: 'veine' });
  vessel('artere-pulmonaire-droite', [BIF, new THREE.Vector3(-0.4, 7.3, -2.4), new THREE.Vector3(-2.6, 7.1, -3.2), new THREE.Vector3(-5.2, 6.8, -3.6)], (t) => 1.1 - 0.15 * t, COL.arterePulm, { caps: [false, true], seg: 32, anchorT: 0.75, type: 'veine' });
  vessel('artere-pulmonaire-gauche', [BIF, new THREE.Vector3(2.4, 7.4, -2.0), new THREE.Vector3(4.3, 7.4, -2.9), new THREE.Vector3(5.6, 7.0, -3.4)], (t) => 1.05 - 0.15 * t, COL.arterePulm, { caps: [false, true], seg: 32, anchorT: 0.7, type: 'veine' });
  // Ligament artériel : de la face supérieure de l'AP gauche à la face inférieure de la crosse (≈ 0,5 cm visibles)
  vessel('ligament-arteriel', [new THREE.Vector3(2.4, 8.3, -2.05), new THREE.Vector3(2.35, 8.85, -2.9)], 0.2, COL.ligament, { seg: 6, anchorT: 0.5, roughness: 0.8 });

  // Veines caves (la VCS reste à droite de l'aorte ascendante, en avant de l'AP droite)
  const RA_W = L2W(ra.position);
  vessel('veine-cave-superieure', [new THREE.Vector3(-3.8, 12.0, -1.6), new THREE.Vector3(-3.8, 9.5, -1.6), new THREE.Vector3(-3.7, 6.5, -1.6), RA_W.clone().add(new THREE.Vector3(0.1, 1.6, 0.0))], (t) => 1.0 + 0.1 * t, COL.veine, { caps: [true, false], seg: 32, anchorT: 0.4, type: 'veine', roughness: 0.6 });
  vessel('veine-cave-inferieure', [RA_W.clone().add(new THREE.Vector3(0.2, -1.6, -0.5)), new THREE.Vector3(-3.1, -1.6, -2.3), new THREE.Vector3(-2.9, -4.3, -2.7), new THREE.Vector3(-2.7, -6.5, -2.9)], (t) => 1.1 + 0.1 * t, COL.veine, { caps: [false, true], seg: 24, anchorT: 0.6, type: 'veine', roughness: 0.6 });

  // Veines pulmonaires (sang oxygéné → rouge)
  const LA_W = L2W(la.position);
  const pv = (dx, dy, dz, ex, ey, ez) => vessel('veines-pulmonaires', [LA_W.clone().add(new THREE.Vector3(dx, dy, dz)), LA_W.clone().add(new THREE.Vector3(ex * 0.6, ey, ez)), LA_W.clone().add(new THREE.Vector3(ex, ey, ez))], 0.55, COL.veinePulm, { caps: [false, true], seg: 12, anchorT: 0.8, type: 'veine', roughness: 0.6 });
  pv(-1.4, 0.9, -0.9, -4.6, 1.3, -1.2);   // VP supérieure droite
  pv(-1.4, -0.7, -1.0, -4.6, -1.1, -1.3); // VP inférieure droite
  pv(1.6, 0.9, -0.9, 4.4, 1.5, -1.2);     // VP supérieure gauche
  pv(1.6, -0.6, -1.0, 4.4, -0.9, -1.4);   // VP inférieure gauche

  // Sinus coronaire (face postérieure, sillon AV) → OD
  const sc = [];
  for (let th = 125; th <= 180; th += 11) sc.push(surf(-0.05, th, 0.45));
  for (let th = -180; th <= -160; th += 10) sc.push(surf(-0.05, th, 0.55));
  sc.push(new THREE.Vector3(-2.6, 0.3, -0.5)); // ostium en avant et en dedans de la VCI, au plancher de l'OD
  vessel('sinus-coronaire', sc, (t) => 0.28 + 0.2 * t, COL.veineCard, { group: local, seg: 40, anchorT: 0.5, roughness: 0.6 });

  /* ── Artères coronaires (repère local, posées sur la surface) ── */
  const cor = (id, pts, r = 0.2, opts = {}) => vessel(id, pts, r, COL.coronaire, { group: local, seg: 48, ...opts });
  // Tronc commun : sinus aortique postéro-gauche → entre le tronc pulmonaire (en avant) et l'auricule gauche (en arrière) → sillon AV gauche
  const AO_L = new THREE.Vector3(-0.25, 1.75, 0.55);
  cor('tronc-commun', [AO_L.clone().add(new THREE.Vector3(0.95, -0.35, -0.15)), new THREE.Vector3(1.55, 0.95, 0.55), new THREE.Vector3(2.25, 0.45, 1.15), surf(0.02, 38, 0.25)], 0.26, { seg: 16, anchorT: 0.5 });
  // IVA : sillon interventriculaire antérieur jusqu'à l'apex
  cor('iva', [surf(0.02, 38, 0.25), surf(0.1, 28, 0.22), surf(0.25, 23, 0.22), surf(0.45, 20, 0.22), surf(0.65, 18, 0.22), surf(0.85, 15, 0.22), surf(0.97, 12, 0.22), surf(1.0, 5, 0.25)], 0.22, { anchorT: 0.45 });
  // Diagonales
  cor('iva', [surf(0.2, 24, 0.2), surf(0.35, 42, 0.17), surf(0.55, 58, 0.15), surf(0.72, 66, 0.13)], 0.12, { seg: 20 });
  cor('iva', [surf(0.42, 21, 0.2), surf(0.58, 36, 0.16), surf(0.78, 46, 0.13)], 0.1, { seg: 16 });
  // Circonflexe : sillon AV gauche, sous l'auricule gauche, vers la face postérieure
  cor('circonflexe', [surf(0.02, 38, 0.25), surf(0.0, 52, 0.3), surf(-0.02, 75, 0.32), surf(-0.02, 100, 0.32), surf(-0.02, 125, 0.32), surf(0.0, 148, 0.3)], 0.21, { anchorT: 0.5 });
  // Marginale obtuse
  cor('circonflexe', [surf(0.0, 88, 0.3), surf(0.2, 95, 0.2), surf(0.45, 100, 0.17), surf(0.7, 104, 0.14)], 0.13, { seg: 20 });
  // Coronaire droite : sinus aortique droit → sillon AV droit → croix du cœur → IVP
  cor('coronaire-droite', [AO_L.clone().add(new THREE.Vector3(-1.1, -0.4, 0.9)), new THREE.Vector3(-1.9, 0.6, 2.2), surf(0.0, -35, 0.3), surf(-0.02, -60, 0.32), surf(-0.02, -90, 0.32), surf(-0.02, -120, 0.32), surf(-0.02, -150, 0.32), surf(0.0, -170, 0.3)], 0.23, { anchorT: 0.45 });
  // Marginale droite (bord aigu)
  cor('coronaire-droite', [surf(0.0, -88, 0.3), surf(0.2, -95, 0.2), surf(0.45, -100, 0.17), surf(0.68, -104, 0.14)], 0.13, { seg: 20 });
  // Interventriculaire postérieure (dominance droite)
  cor('coronaire-droite', [surf(0.0, -170, 0.3), surf(0.15, -166, 0.22), surf(0.35, -164, 0.22), surf(0.55, -162, 0.2), surf(0.75, -160, 0.18), surf(0.9, -158, 0.16)], 0.18, { seg: 32 });
  // Branche du nœud sinusal (depuis la CD, vers la jonction VCS/OD)
  cor('coronaire-droite', [surf(0.0, -45, 0.3), new THREE.Vector3(-2.5, 2.2, 1.9), new THREE.Vector3(-2.9, 3.9, 0.6)], 0.09, { seg: 12 });

  /* ── Valves (anneaux, visibles en coupe) ── */
  const valveMat = mkMat(COL.valve, { roughness: 0.6 });
  const commMat = mkMat(0x8a6e5a, { roughness: 0.7 });
  // Anneau fin + disque plat (feuillets fermés) + lignes de commissure (3 feuillets, 2 pour la mitrale)
  const ring = (id, pos, r, rot, nLeaf) => {
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.rotation.set(rot[0], rot[1], rot[2]);
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 10, 48), valveMat);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 48), valveMat);
    disc.userData.leaf = true;
    grp.add(m, disc);
    for (let k = 0; k < nLeaf; k++) {
      const a = (k / nLeaf) * Math.PI * 2 + (nLeaf === 2 ? Math.PI / 2 : 0);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, 0.05, 0.05), commMat);
      seg.position.set(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, 0.03);
      seg.rotation.z = a;
      seg.userData.leaf = true;
      grp.add(seg);
    }
    grp.traverse((o) => { if (o.isMesh) { o.userData.id = id; } });
    register(id, m, L2W(pos), local);
    local.add(grp);
    grp.children.forEach((c) => { if (c !== m) registry[id].meshes.push(c); });
    grp.remove(m); grp.add(m); // m reste enfant du groupe (register l'avait rattaché à local)
    cutOnly.push(grp);
    return grp;
  };
  ring('valve-tricuspide', new THREE.Vector3(-2.0, 0.25, 0.95), 1.65, [Math.PI / 2, 0, 0], 3);
  ring('valve-mitrale', new THREE.Vector3(1.05, 0.25, -1.05), 1.4, [Math.PI / 2, 0, 0.1], 2);
  ring('valve-aortique', new THREE.Vector3(-0.25, 1.1, 0.55), 1.05, [Math.PI / 2 + 0.3, 0, 0], 3);
  ring('valve-pulmonaire', new THREE.Vector3(1.45, 1.5, 2.15), 1.05, [Math.PI / 2 + 0.6, 0.2, 0], 3);

  /* ── Système de conduction (visible en coupe) ── */
  const condMat = mkMat(COL.conduction, { emissive: 0xffb300, emissiveIntensity: 0.45, roughness: 0.4 });
  const node = (id, posL, r) => {
    const m = new THREE.Mesh(ellipsoid(r, r * 0.7, r * 0.5), condMat);
    m.position.copy(posL);
    register(id, m, L2W(posL), local);
    cutOnly.push(m);
    return m;
  };
  node('noeud-sinusal', new THREE.Vector3(-2.7, 3.75, 0.5), 0.5);
  node('noeud-av', new THREE.Vector3(-0.9, 0.45, -0.25), 0.4);
  const his = vessel('faisceau-his', [new THREE.Vector3(-0.9, 0.45, -0.25), new THREE.Vector3(-0.5, -0.3, 0.3), new THREE.Vector3(-0.35, -1.6, 0.55), new THREE.Vector3(-0.1, -3.2, 0.9), new THREE.Vector3(0.6, -5.0, 1.4)], (t) => 0.14 - 0.04 * t, COL.conduction, { group: local, seg: 24, anchorT: 0.4 });
  his.material = condMat;
  cutOnly.push(his);
  // Branche gauche : en nappe sous l'endocarde de la face septale du VG (elle ne traverse pas la cavité)
  const hisG = vessel('faisceau-his', [new THREE.Vector3(-0.4, -1.4, 0.4), new THREE.Vector3(-0.25, -2.6, 0.6), new THREE.Vector3(-0.12, -4.3, 0.5), new THREE.Vector3(0.4, -5.5, 0.1)], 0.09, COL.conduction, { group: local, seg: 16 });
  hisG.material = condMat;
  cutOnly.push(hisG);
  const hisD = vessel('faisceau-his', [new THREE.Vector3(-0.4, -1.4, 0.7), new THREE.Vector3(-1.0, -2.6, 1.4), new THREE.Vector3(-1.6, -3.8, 1.9)], 0.09, COL.conduction, { group: local, seg: 16 });
  hisD.material = condMat;
  cutOnly.push(hisD);

  /* ── Trajets du sang (mode circulation) ── */
  const W = (pts) => pts.map((p) => (p.isVector3 ? p : L2W(new THREE.Vector3(...p))));
  // Côté droit : VCS → OD → VD → tronc pulmonaire → AP droite / gauche
  const PT_MID = new THREE.Vector3(1.3, 6.0, 0.7);
  flowPaths.push({ color: 0x43589f, speed: 0.11, points: [new THREE.Vector3(-3.8, 11.5, -1.6), new THREE.Vector3(-3.8, 8.0, -1.6), RA_W.clone().add(new THREE.Vector3(0.1, 0.8, 0.0)), ...W([[-2.4, 1.4, 0.3], [-2.0, 0.2, 0.95], [-2.2, -1.6, 1.6], [-1.5, -3.2, 1.9], [-0.1, -1.4, 2.4], [0.9, 0.2, 2.4]]), PT_ROOT, PT_MID, BIF, new THREE.Vector3(-2.6, 7.1, -3.2), new THREE.Vector3(-5.2, 6.8, -3.6)] });
  flowPaths.push({ color: 0x43589f, speed: 0.11, points: [new THREE.Vector3(-2.7, -6.5, -2.9), new THREE.Vector3(-3.0, -2.0, -2.4), RA_W.clone().add(new THREE.Vector3(0.1, -0.9, -0.3)), ...W([[-2.4, 1.0, 0.2], [-2.0, 0.2, 0.95], [-2.3, -1.8, 1.7], [-1.3, -3.4, 2.0], [0.0, -1.2, 2.4], [1.0, 0.3, 2.4]]), PT_ROOT, PT_MID, BIF, new THREE.Vector3(2.4, 7.4, -2.0), new THREE.Vector3(5.6, 7.0, -3.4)] });
  // Côté gauche : veines pulmonaires → OG → VG → aorte
  const leftCore = [...W([[0.9, 2.3, -2.6], [1.05, 0.25, -1.05], [1.3, -2.0, -0.8], [1.6, -4.2, -0.3], [1.0, -2.5, -0.1], [0.2, -0.5, 0.3], [-0.25, 1.1, 0.55]]), AO_ROOT, new THREE.Vector3(-1.7, 5.0, -0.45), new THREE.Vector3(0.0, 9.8, -1.2), new THREE.Vector3(2.5, 9.7, -3.8), new THREE.Vector3(3.5, 4.0, -5.2), new THREE.Vector3(3.0, -4.0, -5.9), new THREE.Vector3(2.8, -8.0, -6.1)];
  flowPaths.push({ color: 0xc43a33, speed: 0.12, points: [LA_W.clone().add(new THREE.Vector3(-4.6, 1.3, -1.2)), LA_W.clone().add(new THREE.Vector3(-1.4, 0.9, -0.9)), ...leftCore] });
  flowPaths.push({ color: 0xc43a33, speed: 0.12, points: [LA_W.clone().add(new THREE.Vector3(4.4, -0.9, -1.4)), LA_W.clone().add(new THREE.Vector3(1.6, -0.6, -1.0)), ...leftCore] });
  flowPaths.push({ color: 0xc43a33, speed: 0.12, points: [AO_ROOT, new THREE.Vector3(-1.7, 5.0, -0.45), new THREE.Vector3(-1.3, 7.3, -0.8), new THREE.Vector3(0.15, 9.8, -1.25), new THREE.Vector3(-1.2, 12.4, -0.85), new THREE.Vector3(-1.7, 14.7, -0.6)] });

  // Résolution fine du clic sur la masse ventriculaire (VD / VG / apex / septum).
  const invM = M.clone().invert();
  const pickId = (mesh, worldPoint) => {
    if (mesh !== mass) return mesh.userData.id;
    const p = worldPoint.clone().applyMatrix4(invM);
    const t = -p.y / L;
    if (t > 0.93) return 'apex';
    const th = THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z / Z_SCALE));
    // VD : de -165° (face inférieure) à +24° (sillon IV antérieur), VG ailleurs
    return (th > -165 && th < 24) ? 'ventricule-droit' : 'ventricule-gauche';
  };

  cutOnly.forEach((m) => { m.visible = false; });

  return { root, local, registry, materials, solids, cutOnly, flowPaths, pickId, matrixLocal: M, axis: AXIS.clone(), base: B.clone(), apex: APEX.clone() };
}
