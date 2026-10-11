// Modèle 3D procédural du cœur — unités en centimètres.
// Repère monde : +x = gauche du patient, +y = haut, +z = avant (vers l'observateur en vue antérieure).
// La masse ventriculaire est construite dans un repère local incliné (axe base→apex),
// les grands vaisseaux dans le repère monde (ils se rapportent au thorax).
import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

// Six jetons sémantiques, identiques aux variables CSS (--sang-riche, --sang-pauvre, --muscle, --graisse, --valve, --conduction)
// et aux couleurs de pastille de js/data.js.
// Direction artistique « planche peinte » (atlas type Netter) : chair rose-rouge des ventricules, oreillettes mauves,
// graisse épicardique orange, vaisseaux rouge profond / bleu marine, intérieur des cavités rose avec cordages nacrés.
// Les teintes de base sont des « tons moyens » : le lavis de bord (painterly) les fonce et les sature vers la silhouette,
// la texture aquarelle les module de ±11 %, la lumière clé les éclaircit sur les faces tournées vers l'observateur.
export const COL = {
  myocarde: 0xd16c62,        // chair rose-rouge (ton moyen ; bords ≈ 0x8f3a36, hautes lumières ≈ 0xe09a90)
  myocardeCoupe: 0xd68c85,   // tranche de muscle, rosée
  endocarde: 0xc1746f,       // paroi interne des cavités (trabéculée), rose plus clair que la tranche
  papillaire: 0xb3564f,
  oreillette: 0xa98bb8,      // mauve, paroi mince
  oreilletteCoupe: 0xc4a8cc,
  artere: 0xbb3533,
  arterePulm: 0x344a9a,      // sang pauvre en oxygène
  veine: 0x344a9a,
  veinePulm: 0xbb3533,       // sang riche en oxygène
  graisse: 0xe8a846,         // graisse épicardique jaune-orange, mate
  graisseCoupe: 0xeeb858,
  coronaire: 0xbb3533,
  veineCard: 0x344a9a,
  valve: 0xe3e8ea,           // feuillets nacrés
  cordage: 0xf3f5f5,
  conduction: 0xf3c23b,
  ligament: 0xcbb79a,
  // lumière des vaisseaux sectionnés (sang : plus sombre que la paroi, mais lisible) et anneau de paroi
  lumenArtere: 0xa63a3a, lumenVeine: 0x3b4c92,
  paroiArtere: 0x8e2426, paroiVeine: 0x263676,
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

// Infundibulum (cône artériel du VD) : soulèvement lisse de la base vers la valve pulmonaire, fondu dans la masse
// (pas de tube rapporté, donc pas de « couture »). Centré sur θ = 30° (avant-gauche), ρ = 2,9 cm, sommet ≈ y = 1,9.
const CONUS = { theta: THREE.MathUtils.degToRad(30), rho: 2.9, sigTh: THREE.MathUtils.degToRad(34), sigRho: 1.05, h: 1.75 };
function conusLift(theta, rho, t) {
  let d = theta - CONUS.theta;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const g = Math.exp(-(d * d) / (2 * CONUS.sigTh * CONUS.sigTh)) * Math.exp(-((rho - CONUS.rho) ** 2) / (2 * CONUS.sigRho * CONUS.sigRho));
  const fade = t < 0 ? 1 : Math.max(0, 1 - t / 0.15);
  return CONUS.h * g * fade;
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
    const y = (t < 0 ? -L * t * 0.35 : -L * t) + conusLift(theta, r, t);
    const x0 = r * Math.sin(theta), z0 = r * Math.cos(theta) * Z_SCALE;
    const bump = 1 + 0.012 * noise(x0, y, z0);
    target.set(x0 * bump, y, z0 * bump);
  }, 96, 72);
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
  // Disques terminaux : la surface est fermée (indispensable au comptage stencil des coupes ; un tube ouvert
  // produit de faux capuchons partout où le rayon de vue traverse son extrémité).
  const T0 = curve.getTangentAt(0), T1 = curve.getTangentAt(1);
  const P0 = curve.getPointAt(0), P1 = curve.getPointAt(1);
  const c0 = pos.length / 3;
  pos.push(P0.x, P0.y, P0.z); nor.push(-T0.x, -T0.y, -T0.z); uv.push(0.5, 0);
  const c1 = pos.length / 3;
  pos.push(P1.x, P1.y, P1.z); nor.push(T1.x, T1.y, T1.z); uv.push(0.5, 1);
  for (let j = 0; j < radial; j++) {
    idx.push(c0, j, j + 1);
    const e = segs * (radial + 1) + j;
    idx.push(c1, e + 1, e);
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
  lum.position.set(0, 0, 0.015); // local +z = vers l'extérieur après lookAt ; légèrement devant le disque terminal du tube
  const wall = new THREE.Mesh(new THREE.RingGeometry(r * (1 - wallFrac), r * 0.99, 32), wallMat);
  wall.position.set(0, 0, 0.03);
  group.add(lum, wall);
  group.position.copy(p);
  group.lookAt(p.clone().add(tan.clone().multiplyScalar(atEnd ? 1 : -1)));
  [lum, wall].forEach((m) => { m.userData.cap = true; });
  group.userData.cap = true;
  return group;
}

// Texture « aquarelle » : bruit de valeur doux multiplié à la couleur (−12 % à +2 %), avec une composante basse
// fréquence (plages de lavis) et un grain fin (pigment). Tuilable ; `repeat` adapte l'échelle aux UV de chaque géométrie.
let noiseCanvas = null;
const noiseTexCache = new Map();
function watercolorTexture(repeatU = 1, repeatV = 1) {
  const key = `${repeatU}x${repeatV}`;
  if (noiseTexCache.has(key)) return noiseTexCache.get(key);
  if (!noiseCanvas) {
    const S = 512, c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    const rnd = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
    const smooth = (x, y, f) => {
      const gx = (x / S) * f, gy = (y / S) * f;
      const i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      const a = rnd(i % f, j % f), b = rnd((i + 1) % f, j % f), cc = rnd(i % f, (j + 1) % f), d = rnd((i + 1) % f, (j + 1) % f);
      return (a * (1 - u) + b * u) * (1 - v) + (cc * (1 - u) + d * u) * v;
    };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      // plages larges (3, 6) + nuages (13) + grain de pigment (37, 83)
      const raw = 0.42 * smooth(x, y, 3) + 0.26 * smooth(x, y, 6) + 0.17 * smooth(x, y, 13) + 0.1 * smooth(x, y, 37) + 0.05 * smooth(x, y, 83);
      // la somme des octaves se concentre autour de 0,5 : on ré-étire le contraste pour obtenir de vraies plages
      const n = Math.min(1, Math.max(0, (raw - 0.5) * 2.6 + 0.5));
      const val = Math.round(255 * (0.82 + 0.21 * n));
      const o = (y * S + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = val; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    noiseCanvas = c;
  }
  const tex = new THREE.CanvasTexture(noiseCanvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatU, repeatV);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  noiseTexCache.set(key, tex);
  return tex;
}
export { watercolorTexture };

// Rendu « peint » : lavis de bord (fresnel) qui fonce ET sature la couleur vers la silhouette (le pigment s'accumule
// au bord d'une plage d'aquarelle), léger éclaircissement des faces tournées vers l'œil. `edge` = facteur de valeur au
// bord ; la teinte du lavis retire davantage aux canaux secondaires qu'au canal dominant, d'où la saturation.
function painterly(mat, edge = 0.62, power = 1.7) {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float ndv = abs(dot(normalize(vNormal), normalize(vViewPosition)));
        float fres = pow(1.0 - ndv, ${power.toFixed(2)});
        float mx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
        vec3 sat = mix(diffuseColor.rgb, diffuseColor.rgb * diffuseColor.rgb / max(mx, 1e-3), 0.45);
        diffuseColor.rgb = mix(diffuseColor.rgb, sat * ${edge.toFixed(3)}, fres);
        diffuseColor.rgb *= 1.0 + 0.14 * ndv * ndv; }`);
  };
  mat.customProgramCacheKey = () => `painterly${edge}_${power}`;
  return mat;
}

// Dégradé peint par couleurs de sommets : `fn(x, y, z)` renvoie un facteur (1 = couleur de base, < 1 plus sombre).
// Purement esthétique (ne déplace aucun sommet) ; le matériau doit avoir vertexColors = true.
function tintGradient(geo, fn) {
  const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const f = fn(p.getX(i), p.getY(i), p.getZ(i));
    // le facteur agit davantage sur vert/bleu que sur rouge : une chair qui fonce rougit, elle ne grisonne pas
    col[i * 3] = Math.min(1.08, 0.3 + 0.7 * f + 0.06 * (1 - f));
    col[i * 3 + 1] = f * f * 0.9 + 0.1 * f;
    col[i * 3 + 2] = f * f * 0.9 + 0.1 * f;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Cône d'axe base → pointe (muscles papillaires, lobules).
function coneBetween(base, tip, rBase, mat, rTip = 0.06) {
  const dir = tip.clone().sub(base), h = dir.length();
  const g = new THREE.CylinderGeometry(rTip, rBase, h, 14, 1, false);
  g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(base);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// Trabécules charnues : relief irrégulier de la paroi interne (déplacement le long des normales, surface restant fermée).
function trabeculate(geo, amp = 0.1, freq = 2.2) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = amp * (0.6 * Math.sin(freq * 2.3 * x + 1.7 * y) * Math.cos(freq * 1.9 * z - 0.8 * y) + 0.4 * Math.sin(freq * 3.1 * y + 2.2 * z) * Math.cos(freq * 2.6 * x));
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
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

  // organic : texture aquarelle + lavis de bord prononcé (muscle, graisse, oreillettes), surface mate, peu de reflet
  // d'environnement ; physical : vaisseaux, vernis très discret (reflet peint) et lavis plus marqué vers les bords du tube.
  // repeat : échelle de la texture selon les UV de la géométrie (tubes : 1 tour × longueur ; masse : 3 × 1,4).
  const mkMat = (color, opts = {}) => {
    const { organic = false, physical = false, repeat = [1, 1], edge, flowOpacity, ...rest } = opts;
    const Cls = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const m = new Cls({ color, roughness: 0.66, metalness: 0.0, side: THREE.DoubleSide, ...rest });
    if (physical) { m.clearcoat = 0.12; m.clearcoatRoughness = 0.6; m.specularIntensity = 0.55; m.envMapIntensity = 0.7; }
    if (organic) { m.map = watercolorTexture(repeat[0], repeat[1]); m.envMapIntensity = 0.45; }
    painterly(m, edge ?? (organic ? 0.58 : 0.52), organic ? 1.7 : 2.0);
    m.userData.baseColor = new THREE.Color(color);
    m.userData.baseOpacity = 1;
    if (flowOpacity !== undefined) m.userData.flowOpacity = flowOpacity; // opacité en mode circulation (défaut 0,3)
    materials.push(m);
    return m;
  };
  // matériaux partagés des extrémités sectionnées
  const lumMats = { artere: mkMat(COL.lumenArtere, { roughness: 0.9, edge: 0.8 }), veine: mkMat(COL.lumenVeine, { roughness: 0.9, edge: 0.8 }) };
  const wallMats = { artere: mkMat(COL.paroiArtere, { roughness: 0.75, edge: 0.8 }), veine: mkMat(COL.paroiVeine, { roughness: 0.75, edge: 0.8 }) };
  const register = (id, mesh, anchorWorld, group = root) => {
    mesh.userData.id = id;
    group.add(mesh);
    if (!registry[id]) registry[id] = { meshes: [], anchor: null };
    registry[id].meshes.push(mesh);
    if (anchorWorld && !registry[id].anchor) registry[id].anchor = anchorWorld.clone();
    return mesh;
  };
  const vessel = (id, points, radius, color, { caps = [false, false], seg = 64, group = root, anchorT = 0.5, cap, type = 'artere', roughness = 0.58, physical = true, flowOpacity } = {}) => {
    const g = tubeGeometry(points, radius, seg, 22);
    const mat = mkMat(color, { roughness, physical, flowOpacity });
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
    solids.push({ mesh, hole: false, cap: cap ?? type, open: true });
    return mesh;
  };

  /* ── Masse ventriculaire ── */
  const myoMat = mkMat(COL.myocarde, { roughness: 0.8, organic: true, repeat: [7, 3], vertexColors: true });
  const massGeo = ventricularMassGeometry();
  // Lavis de la masse (repère local : y = 0 base, y = -L apex ; x > 0 gauche, z > 0 avant) : la base et la face antérieure
  // du VD restent claires, la couleur se charge vers l'apex et la face postéro-gauche, comme sur les planches peintes.
  tintGradient(massGeo, (x, y, z) => {
    const t = THREE.MathUtils.clamp(-y / L, 0, 1);
    const ang = Math.atan2(x, z / Z_SCALE); // 0 = avant, +90° = gauche
    const side = 0.5 - 0.5 * Math.cos(ang - 0.35); // 0 en avant-droite, 1 en arrière-gauche
    return 1.06 - 0.16 * t * t - 0.08 * side + 0.02 * noise(x * 0.9, y * 0.9, z * 0.9);
  });
  const mass = new THREE.Mesh(massGeo, myoMat);
  mass.userData.id = 'ventricule-droit'; // par défaut, résolu finement au clic (voir pickId)
  local.add(mass);
  // Coupe en deux couches : enveloppe de graisse épicardique (≈ 0,25 cm, capuchon orange) puis muscle (capuchon rosé).
  // La surface interne de la graisse est une copie réduite de la masse ; elle sert de « trou » au groupe graisse et de
  // « plein » au groupe muscle (maillages invisibles, utilisés seulement par le stencil).
  solids.push({ mesh: mass, hole: false, cap: 'fat' });
  const innerGeo = massGeo.clone();
  innerGeo.scale(0.94, 0.97, 0.94);
  const hiddenMat = new THREE.MeshBasicMaterial({ visible: false });
  const innerHole = new THREE.Mesh(innerGeo, hiddenMat);
  const innerSolid = new THREE.Mesh(innerGeo, hiddenMat);
  local.add(innerHole, innerSolid);
  solids.push({ mesh: innerHole, hole: true, cap: 'fat' });
  solids.push({ mesh: innerSolid, hole: false, cap: 'myo' });
  registry['ventricule-droit'] = { meshes: [mass], anchor: L2W(surf(0.42, -45, 0)) };
  registry['ventricule-gauche'] = { meshes: [mass], anchor: L2W(surf(0.5, 75, 0)) };
  registry['apex'] = { meshes: [mass], anchor: L2W(surf(0.985, 20, 0)) };
  registry['septum-interventriculaire'] = { meshes: [], anchor: l(-0.35, -3.0, 0.5) };

  // Racine du tronc pulmonaire : au sommet du cône artériel (infundibulum), désormais modelé dans la masse elle-même (voir conusLift)
  const PT_ROOT_L = new THREE.Vector3(1.45, 1.9, 2.15); // en avant et à gauche de la racine aortique (axes distants ≥ 3 cm)

  /* ── Cavités ventriculaires (trous pour la coupe) ── */
  // endocarde : lavis léger (edge 0,72) pour que le fond des cavités reste rose et lisible, pas brun
  const endoMat = mkMat(COL.endocarde, { side: THREE.BackSide, roughness: 0.78, organic: true, repeat: [2, 2], edge: 0.72 });
  // VG : cavité conique à paroi épaisse (≈ 1 cm), dans la moitié postéro-gauche de la masse ; paroi légèrement trabéculée.
  const LV_C = new THREE.Vector3(1.0, -3.0, -0.6);
  const lvCav = new THREE.Mesh(trabeculate(ellipsoid(2.0, 2.9, 1.9, 64), 0.07, 2.0), endoMat); // paroi VG ≈ 1,0–1,2 cm
  lvCav.position.copy(LV_C);
  lvCav.userData.id = 'ventricule-gauche';
  local.add(lvCav);
  solids.push({ mesh: lvCav, hole: true, cap: 'myo' });
  cutOnly.push(lvCav);

  // VD : cavité en croissant qui s'enroule en avant et à droite du VG (ellipsoïde « plié » autour de l'axe du VG),
  // croissant large (≈ 1,5 cm d'épaisseur), paroi libre 0,4–0,8 cm, septum 0,6–1,0 cm ; paroi très trabéculée.
  const RV_P = new THREE.Vector3(LV_C.x - 0.75, -2.3, LV_C.z + 0.3);
  const rvCav = new THREE.Mesh(trabeculate(bentEllipsoid(3.2, 2.6, 0.75, 2.85, THREE.MathUtils.degToRad(-45), 64), 0.09, 2.4), endoMat);
  rvCav.position.copy(RV_P);
  rvCav.userData.id = 'ventricule-droit';
  local.add(rvCav);
  solids.push({ mesh: rvCav, hole: true, cap: 'myo' });
  cutOnly.push(rvCav);

  /* ── Oreillettes (mauves, parois minces) ── */
  const atrMat = mkMat(COL.oreillette, { roughness: 0.7, organic: true, repeat: [2, 1], edge: 0.6, flowOpacity: 0.26 });
  const atrEndoMat = mkMat(0xbb9fc6, { side: THREE.BackSide, roughness: 0.8, organic: true, repeat: [2, 1], edge: 0.74 });
  const ra = new THREE.Mesh(ellipsoid(2.2, 2.45, 2.1), atrMat);
  ra.position.set(-2.5, 1.95, -0.4);
  register('oreillette-droite', ra, L2W(new THREE.Vector3(-4.6, 2.8, 0.4)), local);
  solids.push({ mesh: ra, hole: false, cap: 'atr' });
  const raCav = new THREE.Mesh(ellipsoid(1.95, 2.2, 1.85), atrEndoMat);
  raCav.position.copy(ra.position);
  raCav.userData.id = 'oreillette-droite';
  local.add(raCav);
  solids.push({ mesh: raCav, hole: true, cap: 'atr' });
  cutOnly.push(raCav);

  const raAur = new THREE.Mesh(ellipsoid(1.35, 0.95, 1.25), atrMat);
  raAur.position.set(-1.55, 1.9, 1.55);
  raAur.rotation.y = -0.4;
  register('auricule-droite', raAur, L2W(new THREE.Vector3(-1.9, 2.4, 3.0)), local);
  solids.push({ mesh: raAur, hole: false, cap: 'atr' });

  const la = new THREE.Mesh(ellipsoid(2.7, 2.1, 1.9), atrMat);
  la.position.set(0.55, 2.05, -2.7);
  register('oreillette-gauche', la, L2W(new THREE.Vector3(1.2, 3.2, -4.7)), local);
  solids.push({ mesh: la, hole: false, cap: 'atr' });
  const laCav = new THREE.Mesh(ellipsoid(2.42, 1.82, 1.62), atrEndoMat);
  laCav.position.copy(la.position);
  laCav.userData.id = 'oreillette-gauche';
  local.add(laCav);
  solids.push({ mesh: laCav, hole: true, cap: 'atr' });
  cutOnly.push(laCav);

  const laAur = vessel('auricule-gauche', [new THREE.Vector3(2.6, 2.0, -1.2), new THREE.Vector3(3.2, 1.7, 0.2), new THREE.Vector3(3.1, 1.35, 1.6), new THREE.Vector3(2.5, 1.1, 2.5)],
    (t) => 0.75 - 0.35 * t, COL.oreillette, { group: local, seg: 24, anchorT: 0.8, cap: 'atr', physical: false });
  laAur.material = atrMat;

  /* ── Sillons (graisse épicardique) ── */
  // graisse : mate (roughness 0,95), lavis orangé marqué entre les lobules (edge 0,52), presque effacée en mode circulation
  const fatMat = mkMat(COL.graisse, { roughness: 0.95, organic: true, repeat: [1, 3], edge: 0.52, flowOpacity: 0.1 });
  // la graisse est enfoncée dans la surface (-0.08) : coussinet qui comble le sillon plutôt que tube posé dessus
  const sulcusPts = (list) => list.map(([t, th]) => surf(t, th, -0.08));
  const fatOpts = { group: local, cap: 'fat', physical: false, roughness: 0.95 };
  // sillon coronaire : interrompu en avant par l'infundibulum et le tronc pulmonaire (de -20° à +35°)
  const coroD = [], coroG = [];
  for (let th = -20; th >= -180; th -= 12) coroD.push(surf(0.01, th, 0.0));
  for (let th = 35; th <= 180; th += 12) coroG.push(surf(0.01, th, 0.0));
  const sCoroD = vessel('sillons', coroD, 0.5, COL.graisse, { ...fatOpts, seg: 48, anchorT: 0.3 });
  sCoroD.material = fatMat;
  const sCoroG = vessel('sillons', coroG, 0.5, COL.graisse, { ...fatOpts, seg: 48, anchorT: 0.3 });
  sCoroG.material = fatMat;
  // sillon interventriculaire antérieur
  const ivaPts = [[0.0, 24], [0.2, 22], [0.4, 20], [0.6, 18], [0.8, 15], [0.95, 12]];
  const sIVA = vessel('sillons', sulcusPts(ivaPts), 0.4, COL.graisse, { ...fatOpts, seg: 32 });
  sIVA.material = fatMat;
  // sillon interventriculaire postérieur
  const ivpPts = [[0.0, -168], [0.2, -166], [0.4, -164], [0.6, -162], [0.8, -160], [0.93, -158]];
  const sIVP = vessel('sillons', sulcusPts(ivpPts), 0.4, COL.graisse, { ...fatOpts, seg: 32 });
  sIVP.material = fatMat;
  // Lobules de graisse : amas irréguliers le long des sillons (aspect bosselé des planches)
  let lobK = 0;
  const lobule = (pL, s = 1) => {
    // lobules un peu plus larges et plus plats qu'avant (0,46 × 0,26 × 0,36) : coussinets fondus dans le sillon
    const m = new THREE.Mesh(ellipsoid(0.52 * s, 0.22 * s, 0.42 * s, 18), fatMat);
    m.position.copy(pL);
    m.rotation.set(lobK * 1.7, lobK * 2.3, lobK * 0.9);
    lobK++;
    m.userData.id = 'sillons';
    local.add(m);
    registry['sillons'].meshes.push(m);
    solids.push({ mesh: m, hole: false, cap: 'fat' });
  };
  for (let th = -30; th >= -175; th -= 22) lobule(surf(0.03 + 0.02 * Math.sin(th), th, 0.1), 1 + 0.25 * Math.cos(th * 3));
  for (let th = 45; th <= 175; th += 22) lobule(surf(0.03 + 0.02 * Math.cos(th), th, 0.1), 1 + 0.25 * Math.sin(th * 3));
  [[0.08, 27], [0.3, 24], [0.55, 20], [0.78, 16]].forEach(([t, th]) => lobule(surf(t, th + 1.5, 0.02), 0.8));
  [[0.1, -170], [0.33, -166], [0.58, -162], [0.8, -159]].forEach(([t, th]) => lobule(surf(t, th - 1.5, 0.02), 0.8));

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
  vessel('sinus-coronaire', sc, (t) => 0.28 + 0.2 * t, COL.veineCard, { group: local, seg: 40, anchorT: 0.5, roughness: 0.62, flowOpacity: 0.14 });

  /* ── Artères coronaires (repère local, posées sur la surface) ── */
  const cor = (id, pts, r = 0.2, opts = {}) => vessel(id, pts, r, COL.coronaire, { group: local, seg: 48, roughness: 0.62, flowOpacity: 0.14, ...opts });
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

  /* ── Valves et appareil sous-valvulaire (visibles en coupe) ── */
  // feuillets nacrés : lavis gris-bleu discret vers les bords (edge 0,8), surface satinée ; cordages blancs sans lavis
  const valveMat = mkMat(COL.valve, { roughness: 0.48, transparent: true, opacity: 0.94, edge: 0.8 });
  const cordMat = mkMat(COL.cordage, { roughness: 0.5, edge: 0.88 });
  cordMat.userData.noTranslucent = true;
  const papMat = mkMat(COL.papillaire, { roughness: 0.8, organic: true, repeat: [1, 2], edge: 0.62 });
  // Rattache un groupe « intérieur » à une structure (sélectionnable, visible seulement en coupe, sans contour ni ombre portée)
  const addCut = (obj, id, leaf = true) => {
    obj.traverse((o) => { if (o.isMesh) { o.userData.id = id; if (leaf) o.userData.leaf = true; } });
    local.add(obj);
    cutOnly.push(obj);
    if (!registry[id]) registry[id] = { meshes: [], anchor: null };
    obj.traverse((o) => { if (o.isMesh) registry[id].meshes.push(o); });
    return obj;
  };
  // Valve atrio-ventriculaire : anneau fibreux + feuillets en entonnoir pendant dans le ventricule
  const avValve = (id, c, r, depth) => {
    const grp = new THREE.Group();
    grp.position.copy(c);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 10, 48), valveMat);
    ring.rotation.x = Math.PI / 2;
    const leaf = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.5, depth, 40, 1, true), valveMat);
    leaf.position.y = -depth / 2;
    grp.add(ring, leaf);
    addCut(grp, id);
    registry[id].anchor = L2W(c);
    return grp;
  };
  // Valve semi-lunaire : anneau + trois cuspides en poches (coupoles ouvertes vers l'artère)
  const slValve = (id, c, r, rot) => {
    const grp = new THREE.Group();
    grp.position.copy(c);
    grp.rotation.set(rot[0], rot[1], rot[2]);
    grp.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 10, 48), valveMat));
    for (let k = 0; k < 3; k++) {
      const g = new THREE.SphereGeometry(r * 0.92, 20, 10, (k / 3) * Math.PI * 2, (Math.PI * 2) / 3, Math.PI / 2, Math.PI / 2);
      g.rotateX(-Math.PI / 2); // ouverture des poches vers l'aval (artère)
      grp.add(new THREE.Mesh(g, valveMat));
    }
    addCut(grp, id);
    registry[id].anchor = L2W(c);
    return grp;
  };
  // Cordages tendineux : éventail de fils nacrés entre la pointe d'un pilier et le bord libre des feuillets
  const chordae = (id, tip, c, rEdge, yEdge, baseAngle, n = 5) => {
    const grp = new THREE.Group();
    for (let k = 0; k < n; k++) {
      const a = baseAngle + ((k / (n - 1)) - 0.5) * 1.3;
      const target = new THREE.Vector3(c.x + rEdge * Math.sin(a), yEdge, c.z + rEdge * Math.cos(a));
      grp.add(new THREE.Mesh(tubeGeometry([tip, target], 0.028, 4, 6), cordMat));
    }
    addCut(grp, id);
  };
  const ML = new THREE.Vector3(1.05, 0.25, -1.05), TL = new THREE.Vector3(-2.0, 0.25, 0.95);
  avValve('valve-tricuspide', TL, 1.65, 1.1);
  avValve('valve-mitrale', ML, 1.4, 1.2);
  slValve('valve-aortique', new THREE.Vector3(-0.25, 1.1, 0.55), 1.05, [Math.PI / 2 + 0.3, 0, 0]);
  slValve('valve-pulmonaire', new THREE.Vector3(1.45, 1.5, 2.15), 1.05, [Math.PI / 2 + 0.6, 0.2, 0]);
  // Muscles papillaires du VG (antéro-latéral, postéro-médial) et leurs cordages vers la mitrale
  const papLV = [
    { base: new THREE.Vector3(2.56, -3.9, 0.43), tip: new THREE.Vector3(1.5, -1.3, -0.7), ang: 0.9 },
    { base: new THREE.Vector3(0.83, -3.9, -2.4), tip: new THREE.Vector3(0.7, -1.3, -1.3), ang: 3.3 },
  ];
  papLV.forEach((p) => { addCut(coneBetween(p.base, p.tip, 0.42, papMat), 'ventricule-gauche', false); chordae('valve-mitrale', p.tip, ML, 0.7, -0.95, p.ang); });
  // Muscles papillaires du VD (antérieur, postérieur, septal), bande modératrice, cordages vers la tricuspide
  const papRV = [
    { base: new THREE.Vector3(-1.47, -3.4, 2.69), tip: new THREE.Vector3(-1.7, -1.2, 1.45), ang: 0.6, r: 0.36 },
    { base: new THREE.Vector3(-3.2, -3.2, -0.3), tip: new THREE.Vector3(-2.6, -1.2, 0.75), ang: -1.9, r: 0.34 },
    { base: new THREE.Vector3(-1.44, -2.6, 1.11), tip: new THREE.Vector3(-1.8, -1.1, 0.95), ang: 2.6, r: 0.22 },
  ];
  papRV.forEach((p) => { addCut(coneBetween(p.base, p.tip, p.r, papMat), 'ventricule-droit', false); chordae('valve-tricuspide', p.tip, TL, 0.8, -0.85, p.ang, 4); });
  addCut(new THREE.Mesh(tubeGeometry([new THREE.Vector3(-1.1, -3.3, 1.0), new THREE.Vector3(-1.3, -3.5, 1.9), papRV[0].base], 0.17, 8, 10), papMat), 'ventricule-droit', false);

  /* ── Système de conduction (visible en coupe) ── */
  const condMat = mkMat(COL.conduction, { emissive: 0xffb300, emissiveIntensity: 0.4, roughness: 0.5, edge: 0.78 });
  const node = (id, posL, r) => {
    const m = new THREE.Mesh(ellipsoid(r, r * 0.7, r * 0.5), condMat);
    m.position.copy(posL);
    register(id, m, L2W(posL), local);
    cutOnly.push(m);
    return m;
  };
  node('noeud-sinusal', new THREE.Vector3(-2.7, 3.75, 0.5), 0.5);
  node('noeud-av', new THREE.Vector3(-0.9, 0.45, -0.25), 0.4);
  const his = vessel('faisceau-his', [new THREE.Vector3(-0.9, 0.45, -0.25), new THREE.Vector3(-0.5, -0.3, 0.3), new THREE.Vector3(-0.35, -1.6, 0.55), new THREE.Vector3(-0.1, -3.2, 0.9), new THREE.Vector3(0.6, -5.0, 1.4)], (t) => 0.14 - 0.04 * t, COL.conduction, { group: local, seg: 24, anchorT: 0.4, cap: 'conduction', physical: false });
  his.material = condMat;
  cutOnly.push(his);
  // Branche gauche : en nappe sous l'endocarde de la face septale du VG (elle ne traverse pas la cavité)
  const hisG = vessel('faisceau-his', [new THREE.Vector3(-0.4, -1.4, 0.4), new THREE.Vector3(-0.25, -2.6, 0.6), new THREE.Vector3(-0.12, -4.3, 0.5), new THREE.Vector3(0.4, -5.5, 0.1)], 0.09, COL.conduction, { group: local, seg: 16, cap: 'conduction', physical: false });
  hisG.material = condMat;
  cutOnly.push(hisG);
  const hisD = vessel('faisceau-his', [new THREE.Vector3(-0.4, -1.4, 0.7), new THREE.Vector3(-1.0, -2.6, 1.4), new THREE.Vector3(-1.6, -3.8, 1.9)], 0.09, COL.conduction, { group: local, seg: 16, cap: 'conduction', physical: false });
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
    // VD : de -165° (face inférieure) à +24° (sillon IV antérieur), VG ailleurs ; le cône artériel (base, 0–65°) est VD
    if (t < 0.08 && th > -165 && th < 65) return 'ventricule-droit';
    return (th > -165 && th < 24) ? 'ventricule-droit' : 'ventricule-gauche';
  };

  cutOnly.forEach((m) => { m.visible = false; });

  return { root, local, registry, materials, solids, cutOnly, flowPaths, pickId, matrixLocal: M, axis: AXIS.clone(), base: B.clone(), apex: APEX.clone() };
}
