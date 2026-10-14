// Modèle 3D du cœur — unités en centimètres.
// Repère monde : +x = gauche du patient, +y = haut, +z = avant (vers l'observateur en vue antérieure).
//
// L'extérieur du cœur est une enveloppe continue (masse ventriculaire, oreillettes, auricules, graisse des sillons,
// gros vaisseaux raccordés en douceur), générée hors ligne à partir de js/heart-shape.js (assets/heart.bin).
// Les coronaires, les structures internes (cavités, valves, piliers, système de conduction) et les trajets du sang
// sont construits ici. Rendu « tissu vivant » : fibres musculaires, graisse lobulée, film humide (vernis),
// diffusion sous la surface (translucidité) et occlusion ambiante cuite dans le maillage.
import * as THREE from 'three';
import * as S from './heart-shape.js';

// Couleurs des surfaces de coupe et des structures internes (sRGB)
export const COL = {
  myocarde: 0xdc9184,
  myocardeCoupe: 0xe9a29c,   // tranche de muscle, rose clair
  graisseCoupe: 0xeed8a8,
  oreilletteCoupe: 0xe3a09a,
  endocarde: 0xc7646b,       // paroi interne des cavités (trabéculée), rose soutenu
  endoOreillette: 0xc8737a,
  papillaire: 0xc35e67,
  valve: 0xf1e4c6,           // feuillets crème nacrés
  cordage: 0xfbf6ec,
  conduction: 0xf3c23b,
  coronaire: 0xc25e60,       // fines artères en surface : lignes rose-rouge
  veineCard: 0xa194b6,       // veines du cœur : lignes mauves
  lumenArtere: 0xb0585b, lumenVeine: 0x857a9c,
};

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const M = new THREE.Matrix4().makeBasis(v3(S.V), v3(S.AXIS).negate(), v3(S.U)).setPosition(v3(S.BASE));
export function L2W(p) { return p.clone().applyMatrix4(M); }

/* ─────────── matériau « tissu » ─────────── */
// MeshPhysicalMaterial + relief procédural (dérivées écran), translucidité enveloppante, liseré lumineux,
// occlusion ambiante et surbrillance de sélection. uTis = poids [graisse, vaisseau, oreillette, occlusion]
// pour les maillages sans attributs ; l'enveloppe fournit ces poids par sommet (attributs « col » et « tis »).
const GLSL_COMMON = /* glsl */`
varying vec3 vObj;
varying vec4 vTis;
varying vec3 vCol;
varying float vSid;
uniform float uSel;
uniform float uHi;
uniform float uBump;
uniform float uSSS;
uniform float uRim;
uniform float uFocus;
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
// Relief et modulation de teinte selon le tissu (p en cm, repère de l'objet)
float tissueDetail(vec3 p, vec4 t, out float tint) {
  float fat = t.x, ves = t.y, atr = t.z;
  float mus = clamp(1.0 - fat - ves, 0.0, 1.0);
  float lod = clamp(length(fwidth(p)) * 9.0, 0.0, 1.0); // atténue le grain fin quand on s'éloigne (pas de moiré)
  // fibres myocardiques : bruit étiré le long d'une direction oblique (hélice simplifiée)
  vec3 q = vec3(dot(p, vec3(0.62, -0.70, 0.35)), dot(p, vec3(-0.55, -0.15, 0.82)), dot(p, vec3(0.56, 0.70, 0.45)));
  float f1 = vnoise(vec3(q.x * 1.2, q.y * 12.0, q.z * 12.0));
  float f2 = vnoise(vec3(q.x * 2.4 + 7.0, q.y * 26.0, q.z * 26.0));
  float fib = mix(0.62 * f1 + 0.38 * f2, 0.5, lod * 0.8);
  float mot = vnoise(p * 1.1 + 3.0);
  // oreillettes : plis fins de la paroi mince
  float wr = vnoise(vec3(p.x * 4.5, p.y * 8.0, p.z * 4.5));
  float muscH = mix(fib, 0.45 * fib + 0.55 * wr, atr);
  // graisse : lobules arrondis
  float lob = 1.0 - abs(2.0 * vnoise(p * 3.2) - 1.0);
  float fatH = mix(0.72 * lob + 0.28 * vnoise(p * 9.0), lob, lod);
  // paroi vasculaire : très lisse
  float vesH = vnoise(p * 4.0);
  tint = mus * mix(0.76, 1.1, muscH) * (0.9 + 0.2 * mot) + fat * mix(0.93, 1.03, fatH) + ves * (0.95 + 0.08 * vesH);
  return mus * muscH * 0.8 + fat * fatH * 0.8 + ves * vesH * 0.25;
}
vec3 perturbN(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
  vec3 vSigmaX = normalize(dFdx(surf_pos.xyz));
  vec3 vSigmaY = normalize(dFdy(surf_pos.xyz));
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

function patchShader(sh) {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', `#include <common>
      varying vec3 vObj; varying vec4 vTis; varying vec3 vCol; varying float vSid;
      uniform vec4 uTis;
      #ifdef ENVELOPPE
      attribute vec4 col; attribute vec4 tis;
      #endif`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vObj = position;
      #ifdef ENVELOPPE
      vCol = pow(col.rgb, vec3(2.2)); vTis = vec4(tis.xyz, col.a); vSid = floor(tis.w * 255.0 + 0.5);
      #else
      vCol = vec3(1.0); vTis = uTis; vSid = -10.0;
      #endif`);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>\n${GLSL_COMMON}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
      float dTint;
      float dH = tissueDetail(vObj, vTis, dTint);
      diffuseColor.rgb *= vCol * dTint;`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = perturbN(-vViewPosition, normal, vec2(dFdx(dH), dFdy(dH)) * uBump, faceDirection);`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor * mix(1.0, 1.25, vTis.x) * mix(1.0, 0.85, vTis.y) * (1.12 - 0.24 * dTint), 0.08, 1.0);`)
    .replace('#include <aomap_fragment>', `float hlF = max(uHi, 1.0 - step(0.5, abs(vSid - uSel)));
    {
      float ao = vTis.w;
      reflectedLight.indirectDiffuse *= ao;
      reflectedLight.indirectSpecular *= mix(0.3, 1.0, ao);
      reflectedLight.directDiffuse *= mix(0.55, 1.0, ao);
      reflectedLight.directSpecular *= mix(0.45, 1.0, ao);
      // diffusion sous la surface : la lumière « enveloppe » le relief et rougit les zones d'ombre douce
      vec3 sssTint = mix(mix(vec3(1.0, 0.55, 0.6), vec3(1.0, 0.78, 0.45), vTis.x), vec3(1.0, 0.86, 0.8), vTis.y);
      #if NUM_DIR_LIGHTS > 0
      for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
        float ndl = dot(normal, directionalLights[i].direction);
        float wrap = clamp((ndl + 0.6) / 1.6, 0.0, 1.0) - clamp(ndl, 0.0, 1.0);
        reflectedLight.directDiffuse += directionalLights[i].color * diffuseColor.rgb * sssTint * max(wrap, 0.0) * uSSS * ao;
      }
      #endif
      float fres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
      totalEmissiveRadiance += (diffuseColor.rgb * sssTint + vec3(0.25 * vTis.y)) * fres * uRim * ao;
      // sélection : la structure garde sa couleur naturelle, un liseré clair et chaud la détache
      totalEmissiveRadiance += hlF * (diffuseColor.rgb * 0.1 + pow(fres, 0.8) * vec3(1.0, 0.9, 0.72) * 0.9);
    }
    #include <aomap_fragment>`)
    .replace('#include <opaque_fragment>', `// mode focus : tout ce qui n'est pas sélectionné s'estompe vers un gris clair désaturé (procédé des animations médicales)
    if (uFocus > 0.5 && hlF < 0.5) {
      float lum = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
      outgoingLight = mix(outgoingLight, vec3(lum) * 0.55 + vec3(0.3, 0.31, 0.33), 0.6);
    }
    #include <opaque_fragment>`);
}

/* ─────────── utilitaires géométriques ─────────── */
function ellipsoid(rx, ry, rz, seg = 48) {
  const g = new THREE.SphereGeometry(1, seg, seg);
  g.scale(rx, ry, rz);
  return g;
}
// Ellipsoïde plié en arc de rayon R autour de l'axe Y local, centré sur l'angle phiC (0 = +z, positif vers +x).
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
// Tube fermé à rayon variable le long d'une courbe Catmull-Rom (disques terminaux : surface close pour le stencil).
export function tubeGeometry(points, radiusFn, segs = 64, radial = 20) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  const rOf = (t) => (typeof radiusFn === 'function' ? radiusFn(t) : radiusFn);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    const r = rOf(t);
    const nn = frames.normals[i], bb = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      const cx = -Math.cos(ang), cy = Math.sin(ang);
      N.set(cx * nn.x + cy * bb.x, cx * nn.y + cy * bb.y, cx * nn.z + cy * bb.z).normalize();
      pos.push(P.x + r * N.x, P.y + r * N.y, P.z + r * N.z);
      nor.push(N.x, N.y, N.z);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j, c = b + 1, d = a + 1;
      idx.push(a, b, d, b, c, d);
    }
  }
  const T0 = curve.getTangentAt(0), T1 = curve.getTangentAt(1), P0 = curve.getPointAt(0), P1 = curve.getPointAt(1);
  const c0 = pos.length / 3; pos.push(P0.x, P0.y, P0.z); nor.push(-T0.x, -T0.y, -T0.z);
  const c1 = pos.length / 3; pos.push(P1.x, P1.y, P1.z); nor.push(T1.x, T1.y, T1.z);
  for (let j = 0; j < radial; j++) {
    idx.push(c0, j, j + 1);
    const e = segs * (radial + 1) + j;
    idx.push(c1, e + 1, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.userData.curve = curve;
  return g;
}
// Cône d'axe base → pointe (muscles papillaires).
function coneBetween(base, tip, rBase, mat, rTip = 0.08) {
  const dir = tip.clone().sub(base), h = dir.length();
  const g = new THREE.CylinderGeometry(rTip, rBase, h, 16, 4, false);
  g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(base);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}
// Trabécules charnues : relief irrégulier de la paroi interne (déplacement le long des normales).
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

// Fusionne des géométries indexées (position, normale) en une seule.
function mergeIndexed(geos) {
  let nv = 0, ni = 0;
  geos.forEach((g) => { nv += g.attributes.position.count; ni += g.index.count; });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, ov * 3);
    nor.set(g.attributes.normal.array, ov * 3);
    const src = g.index.array;
    for (let i = 0; i < src.length; i++) idx[oi + i] = src[i] + ov;
    ov += g.attributes.position.count; oi += src.length;
    g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  m.computeBoundingSphere();
  return m;
}

/* ─────────── lancer de rayons accéléré (grille régulière) ─────────── */
// Le maillage simplifié sert au clic et au masquage des étiquettes (jusqu'à 32 rayons toutes les 4 images) :
// une grille de cases de 0,6 cm limite chaque rayon à quelques centaines de triangles au lieu de 35 000.
function buildRayGrid(geo, cell = 0.6) {
  const pos = geo.attributes.position.array, idx = geo.index.array;
  geo.computeBoundingBox();
  const min = geo.boundingBox.min.clone().subScalar(0.05), max = geo.boundingBox.max.clone().addScalar(0.05);
  const n = [Math.ceil((max.x - min.x) / cell), Math.ceil((max.y - min.y) / cell), Math.ceil((max.z - min.z) / cell)];
  const cellOf = (v, k) => Math.min(n[k] - 1, Math.max(0, Math.floor((v - min.getComponent(k)) / cell)));
  const ntri = idx.length / 3;
  const ranges = new Int32Array(ntri * 6);
  const count = new Uint32Array(n[0] * n[1] * n[2] + 1);
  for (let t = 0; t < ntri; t++) {
    for (let k = 0; k < 3; k++) {
      const a = pos[idx[t * 3] * 3 + k], b = pos[idx[t * 3 + 1] * 3 + k], c = pos[idx[t * 3 + 2] * 3 + k];
      ranges[t * 6 + k] = cellOf(Math.min(a, b, c), k); ranges[t * 6 + 3 + k] = cellOf(Math.max(a, b, c), k);
    }
    for (let z = ranges[t * 6 + 2]; z <= ranges[t * 6 + 5]; z++) for (let y = ranges[t * 6 + 1]; y <= ranges[t * 6 + 4]; y++) for (let x = ranges[t * 6]; x <= ranges[t * 6 + 3]; x++) count[(z * n[1] + y) * n[0] + x + 1]++;
  }
  for (let i = 1; i < count.length; i++) count[i] += count[i - 1];
  const items = new Uint32Array(count[count.length - 1]);
  const fill = count.slice();
  for (let t = 0; t < ntri; t++) {
    for (let z = ranges[t * 6 + 2]; z <= ranges[t * 6 + 5]; z++) for (let y = ranges[t * 6 + 1]; y <= ranges[t * 6 + 4]; y++) for (let x = ranges[t * 6]; x <= ranges[t * 6 + 3]; x++) items[fill[(z * n[1] + y) * n[0] + x]++] = t;
  }
  return { pos, idx, min, n, cell, start: count, items };
}
const _inv = new THREE.Matrix4(), _ray = new THREE.Ray(), _p = new THREE.Vector3();
function gridRaycast(raycaster, intersects) {
  const G = this.userData.grid;
  _inv.copy(this.matrixWorld).invert();
  _ray.copy(raycaster.ray).applyMatrix4(_inv);
  const o = _ray.origin, d = _ray.direction;
  // entrée dans la boîte de la grille
  const lo = [G.min.x, G.min.y, G.min.z], hi = [lo[0] + G.n[0] * G.cell, lo[1] + G.n[1] * G.cell, lo[2] + G.n[2] * G.cell];
  const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z];
  let t0 = 0, t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(D[k]) < 1e-12) { if (O[k] < lo[k] || O[k] > hi[k]) return; continue; }
    let a = (lo[k] - O[k]) / D[k], b = (hi[k] - O[k]) / D[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  if (t0 > t1) return;
  const cellIdx = [0, 1, 2].map((k) => Math.min(G.n[k] - 1, Math.max(0, Math.floor((O[k] + D[k] * (t0 + 1e-6) - lo[k]) / G.cell))));
  const step = D.map((v) => (v > 0 ? 1 : -1));
  const tMax = [0, 1, 2].map((k) => (Math.abs(D[k]) < 1e-12 ? Infinity : (lo[k] + (cellIdx[k] + (D[k] > 0 ? 1 : 0)) * G.cell - O[k]) / D[k]));
  const tDelta = D.map((v) => (Math.abs(v) < 1e-12 ? Infinity : G.cell / Math.abs(v)));
  const seen = new Set(), hits = [];
  const { pos, idx } = G;
  for (;;) {
    const c = (cellIdx[2] * G.n[1] + cellIdx[1]) * G.n[0] + cellIdx[0];
    for (let s = G.start[c]; s < G.start[c + 1]; s++) {
      const t = G.items[s];
      if (seen.has(t)) continue;
      seen.add(t);
      // Möller–Trumbore, faces avant seulement (comme THREE.Mesh avec un matériau FrontSide)
      const ia = idx[t * 3] * 3, ib = idx[t * 3 + 1] * 3, ic = idx[t * 3 + 2] * 3;
      const e1x = pos[ib] - pos[ia], e1y = pos[ib + 1] - pos[ia + 1], e1z = pos[ib + 2] - pos[ia + 2];
      const e2x = pos[ic] - pos[ia], e2y = pos[ic + 1] - pos[ia + 1], e2z = pos[ic + 2] - pos[ia + 2];
      const px = D[1] * e2z - D[2] * e2y, py = D[2] * e2x - D[0] * e2z, pz = D[0] * e2y - D[1] * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (det < 1e-12) continue;
      const inv = 1 / det;
      const tx = O[0] - pos[ia], ty = O[1] - pos[ia + 1], tz = O[2] - pos[ia + 2];
      const u = (tx * px + ty * py + tz * pz) * inv;
      if (u < 0 || u > 1) continue;
      const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
      const v = (D[0] * qx + D[1] * qy + D[2] * qz) * inv;
      if (v < 0 || u + v > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (tt <= 0) continue;
      hits.push([tt, t]);
    }
    const k = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
    if (tMax[k] > t1) break;
    cellIdx[k] += step[k];
    if (cellIdx[k] < 0 || cellIdx[k] >= G.n[k]) break;
    tMax[k] += tDelta[k];
  }
  for (const [tt, t] of hits) {
    _p.copy(d).multiplyScalar(tt).add(o).applyMatrix4(this.matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(_p);
    if (distance < raycaster.near || distance > raycaster.far) continue;
    intersects.push({ distance, point: _p.clone(), object: this, face: { a: idx[t * 3], b: idx[t * 3 + 1], c: idx[t * 3 + 2] }, faceIndex: t });
  }
}

/* ─────────── enveloppe (assets/heart.bin) ─────────── */
async function loadEnvelope() {
  const res = await fetch(new URL('../assets/heart.bin', import.meta.url));
  if (!res.ok) throw new Error(`assets/heart.bin : ${res.status}`);
  const buf = await res.arrayBuffer();
  const dv = new DataView(buf);
  const hl = dv.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  const base = 8 + hl;
  const view = (Type, [off, len]) => new Type(buf, base + off, len);
  const { min, size } = header.bounds;
  const positions = (lod) => {
    const q = view(Uint16Array, lod.pos), f = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) { const k = i % 3; f[i] = min[k] + (q[i] / 65535) * size[k]; }
    return f;
  };
  const [vis, prx] = header.lods;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions(vis), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(view(Int16Array, vis.nor), 3, true));
  g.setAttribute('col', new THREE.BufferAttribute(view(Uint8Array, vis.col), 4, true));
  g.setAttribute('tis', new THREE.BufferAttribute(view(Uint8Array, vis.tis), 4, true));
  g.setIndex(new THREE.BufferAttribute(view(Uint32Array, vis.idx), 1));
  g.computeBoundingSphere();
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(positions(prx), 3));
  pg.setIndex(new THREE.BufferAttribute(view(Uint32Array, prx.idx), 1));
  pg.computeBoundingSphere(); pg.computeBoundingBox();
  return { ids: header.ids, visual: g, proxy: pg, proxySid: view(Uint8Array, prx.sid), coronaires: header.coronaires };
}

/* ─────────── construction ─────────── */
export async function buildHeart() {
  const env = await loadEnvelope();
  const root = new THREE.Group();
  root.name = 'coeur';
  const local = new THREE.Group();
  local.matrixAutoUpdate = false;
  local.matrix.copy(M);
  root.add(local);

  const registry = {};        // id → { meshes: [], anchor: Vector3 (monde) }
  const materials = [];       // matériaux visibles (clipping, mode translucide)
  const tissueMats = [];      // matériaux « tissu » (surbrillance)
  const solids = [];          // { mesh, hole, cap } pour les surfaces de coupe (stencil)
  const cutOnly = [];         // objets visibles seulement en coupe
  const flowPaths = [];       // { points:[Vector3], color, speed }
  const selUniform = { value: -1 };
  const focusUniform = { value: 0 }; // partagé par tous les tissus : estompe ce qui n'est pas sélectionné

  const tissue = (color, { tis = [0, 0, 0, 1], envelope = false, bump = 0.35, sss = 0.42, rim = 0.32, flowOpacity, ...rest } = {}) => {
    const m = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.5, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.32, specularIntensity: 0.45,
      sheen: 0.5, sheenRoughness: 0.55, sheenColor: 0xffe2dc, envMapIntensity: 0.8, side: THREE.DoubleSide, ...rest,
    });
    if (envelope) m.defines = { ...m.defines, ENVELOPPE: '' };
    const uniforms = {
      uSel: envelope ? selUniform : { value: -1 }, uHi: { value: 0 }, uTis: { value: new THREE.Vector4(...tis) },
      uBump: { value: bump }, uSSS: { value: sss }, uRim: { value: rim }, uFocus: focusUniform,
    };
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, uniforms); patchShader(sh); };
    m.customProgramCacheKey = () => (envelope ? 'tissu-enveloppe' : 'tissu');
    m.userData.uniforms = uniforms;
    m.userData.baseColor = new THREE.Color(color);
    if (flowOpacity !== undefined) m.userData.flowOpacity = flowOpacity;
    materials.push(m); tissueMats.push(m);
    return m;
  };
  // un matériau par structure (la surbrillance agit par matériau)
  const matCache = new Map();
  const PRESETS = {
    endo: () => tissue(COL.endocarde, { side: THREE.BackSide, roughness: 0.5, bump: 0.35 }),
    endoAtr: () => tissue(COL.endoOreillette, { side: THREE.BackSide, roughness: 0.5, tis: [0, 0, 1, 1], bump: 0.3 }),
    valve: () => tissue(COL.valve, { tis: [0, 1, 0, 1], transparent: true, opacity: 0.93, sss: 0.55, rim: 0.2, roughness: 0.35, bump: 0.1 }),
    cordage: () => { const m = tissue(COL.cordage, { tis: [0, 1, 0, 1], roughness: 0.4, bump: 0.05 }); m.userData.noTranslucent = true; return m; },
    papillaire: () => tissue(COL.papillaire, { roughness: 0.5, bump: 0.3 }),
    conduction: () => tissue(COL.conduction, { tis: [0, 1, 0, 1], emissive: 0xffb300, emissiveIntensity: 0.35, roughness: 0.45, sss: 0.2 }),
    coroA: () => tissue(COL.coronaire, { tis: [0, 1, 0, 1], roughness: 0.42, clearcoat: 0.1, bump: 0.08, sss: 0.4, flowOpacity: 0.14 }),
    coroV: () => tissue(COL.veineCard, { tis: [0, 1, 0, 1], roughness: 0.35, bump: 0.08, sss: 0.3, flowOpacity: 0.14 }),
  };
  const matFor = (id, preset) => {
    const key = `${id}|${preset}`;
    if (!matCache.has(key)) matCache.set(key, PRESETS[preset]());
    return matCache.get(key);
  };
  const reg = (id) => (registry[id] ??= { meshes: [], anchor: null });
  const register = (id, mesh, anchorWorld, group = root) => {
    mesh.userData.id = id;
    group.add(mesh);
    reg(id).meshes.push(mesh);
    if (anchorWorld && !registry[id].anchor) registry[id].anchor = anchorWorld.clone();
    return mesh;
  };

  /* ── Enveloppe continue ── */
  const envMat = tissue(0xffffff, { envelope: true, flowOpacity: 0.28, rim: 0.45 });
  const envelope = new THREE.Mesh(env.visual, envMat);
  envelope.userData.envelope = true;
  envelope.castShadow = true; envelope.receiveShadow = true;
  root.add(envelope);
  solids.push({ mesh: envelope, hole: false, cap: 'myo' });
  // maillage simplifié invisible : clic et masquage des étiquettes
  const proxy = new THREE.Mesh(env.proxy, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.userData.proxy = true;
  proxy.userData.id = 'enveloppe';
  proxy.userData.grid = buildRayGrid(env.proxy);
  proxy.raycast = gridRaycast;
  root.add(proxy);
  // ancres des étiquettes : point de l'enveloppe le plus proche, appartenant à la bonne structure
  {
    const pos = env.visual.attributes.position, nor = env.visual.attributes.normal, tis = env.visual.attributes.tis;
    for (const [id, a] of Object.entries(S.ANCRES)) {
      const sid = env.ids.indexOf(id);
      let best = Infinity, bi = -1;
      for (let i = 0; i < pos.count; i += 2) {
        if (Math.round(tis.getW(i) * 255) !== sid) continue;
        const d = (pos.getX(i) - a[0]) ** 2 + (pos.getY(i) - a[1]) ** 2 + (pos.getZ(i) - a[2]) ** 2;
        if (d < best) { best = d; bi = i; }
      }
      const anchor = bi < 0 ? v3(a) : new THREE.Vector3(pos.getX(bi), pos.getY(bi), pos.getZ(bi)).addScaledVector(new THREE.Vector3(nor.getX(bi), nor.getY(bi), nor.getZ(bi)), 0.03);
      reg(id).anchor = anchor;
    }
  }
  reg('septum-interventriculaire').anchor = L2W(new THREE.Vector3(-1.1, -2.6, 0.94));

  // Lumière des vaisseaux : solides invisibles qui colorent la coupe du sang (groupe stencil « artere » / « veine »)
  const lumenMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  S.LUMIERES.forEach(({ pts, r, type }) => {
    const g = tubeGeometry(pts.map(v3), (t) => r(t) * 0.82, 64, 18);
    const m = new THREE.Mesh(g, lumenMat);
    m.renderOrder = -2;
    root.add(m);
    solids.push({ mesh: m, hole: false, cap: type });
  });

  // Graisse des sillons : solides invisibles qui colorent la coupe en crème (groupe stencil « fat »)
  S.GRAISSE.forEach(({ pts, r }) => {
    const m = new THREE.Mesh(tubeGeometry(pts.map(v3), r, 64, 16), lumenMat);
    m.renderOrder = -2;
    local.add(m);
    solids.push({ mesh: m, hole: false, cap: 'fat' });
  });

  /* ── Cavités (paroi interne, visibles en coupe ; « trous » pour les surfaces de coupe) ── */
  const { VG, VD, OD, OG } = S.CAVITES;
  const lvCav = new THREE.Mesh(trabeculate(ellipsoid(...VG.rayons, 64), 0.07, 2.0), matFor('ventricule-gauche', 'endo'));
  lvCav.position.copy(v3(VG.centre));
  lvCav.userData.id = 'ventricule-gauche';
  local.add(lvCav);
  solids.push({ mesh: lvCav, hole: true, cap: 'myo' });
  cutOnly.push(lvCav);
  const rvCav = new THREE.Mesh(trabeculate(bentEllipsoid(VD.ax, VD.ay, VD.az, VD.R, VD.phiC, 64), 0.09, 2.4), matFor('ventricule-droit', 'endo'));
  rvCav.position.copy(v3(VD.pos));
  rvCav.userData.id = 'ventricule-droit';
  local.add(rvCav);
  solids.push({ mesh: rvCav, hole: true, cap: 'myo' });
  cutOnly.push(rvCav);
  // Chambres de chasse : le VG s'ouvre sur la valve aortique, le VD (infundibulum) sur la valve pulmonaire
  const outflow = (id, pts, r) => {
    const m = new THREE.Mesh(tubeGeometry(pts, r, 24, 24), matFor(id, 'endo'));
    m.userData.id = id;
    local.add(m);
    solids.push({ mesh: m, hole: true, cap: 'myo' });
    cutOnly.push(m);
  };
  outflow('ventricule-gauche', S.CAVITES.chasseVG.pts.map(v3), S.CAVITES.chasseVG.r);
  outflow('ventricule-droit', S.CAVITES.infundibulum.pts.map(v3), S.CAVITES.infundibulum.r);
  const raCav = new THREE.Mesh(ellipsoid(...OD.rayons), matFor('oreillette-droite', 'endoAtr'));
  raCav.position.copy(v3(S.RA_C));
  raCav.userData.id = 'oreillette-droite';
  local.add(raCav);
  solids.push({ mesh: raCav, hole: true, cap: 'myo' });
  cutOnly.push(raCav);
  const laCav = new THREE.Mesh(ellipsoid(...OG.rayons), matFor('oreillette-gauche', 'endoAtr'));
  laCav.position.copy(v3(S.LA_C));
  laCav.userData.id = 'oreillette-gauche';
  local.add(laCav);
  solids.push({ mesh: laCav, hole: true, cap: 'myo' });
  cutOnly.push(laCav);

  /* ── Coronaires et veines du cœur (tubes posés dans les sillons, à fleur de muscle) ── */
  const coroGroups = new Map();
  env.coronaires.forEach((c) => {
    const rr = S.radiusAlong(c.r);
    const small = rr(0) < 0.1;
    const g = tubeGeometry(c.pts.map(v3), rr, small ? 20 : 48, small ? 8 : 14);
    const key = `${c.id}|${c.kind}`;
    if (!coroGroups.has(key)) coroGroups.set(key, { id: c.id, kind: c.kind, geos: [], anchor: null });
    const G = coroGroups.get(key);
    G.geos.push(g);
    if (c.anchorT !== undefined && !G.anchor) G.anchor = L2W(g.userData.curve.getPointAt(c.anchorT));
  });
  coroGroups.forEach((G) => {
    const geo = mergeIndexed(G.geos);
    const mesh = new THREE.Mesh(geo, matFor(G.id, G.kind === 'veine' ? 'coroV' : 'coroA'));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.grid = buildRayGrid(geo, 0.4);
    mesh.raycast = gridRaycast;
    register(G.id, mesh, G.anchor, local);
  });

  /* ── Valves et appareil sous-valvulaire (visibles en coupe) ── */
  const addCut = (obj, id, leaf = true) => {
    obj.traverse((o) => { if (o.isMesh) { o.userData.id = id; if (leaf) o.userData.leaf = true; } });
    local.add(obj);
    cutOnly.push(obj);
    obj.traverse((o) => { if (o.isMesh) reg(id).meshes.push(o); });
    return obj;
  };
  const avValve = (id, c, r, depth) => {
    const grp = new THREE.Group();
    grp.position.copy(c);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 10, 48), matFor(id, 'valve'));
    ring.rotation.x = Math.PI / 2;
    const leaf = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.5, depth, 40, 1, true), matFor(id, 'valve'));
    leaf.position.y = -depth / 2;
    grp.add(ring, leaf);
    addCut(grp, id);
    reg(id).anchor = L2W(c);
  };
  const slValve = (id, c, r, rot) => {
    const grp = new THREE.Group();
    grp.position.copy(c);
    grp.rotation.set(rot[0], rot[1], rot[2]);
    grp.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 10, 48), matFor(id, 'valve')));
    for (let k = 0; k < 3; k++) {
      const g = new THREE.SphereGeometry(r * 0.92, 20, 10, (k / 3) * Math.PI * 2, (Math.PI * 2) / 3, Math.PI / 2, Math.PI / 2);
      g.rotateX(-Math.PI / 2);
      grp.add(new THREE.Mesh(g, matFor(id, 'valve')));
    }
    addCut(grp, id);
    reg(id).anchor = L2W(c);
  };
  const chordae = (id, tip, c, rEdge, yEdge, baseAngle, n = 5) => {
    const grp = new THREE.Group();
    for (let k = 0; k < n; k++) {
      const a = baseAngle + ((k / (n - 1)) - 0.5) * 1.3;
      const target = new THREE.Vector3(c.x + rEdge * Math.sin(a), yEdge, c.z + rEdge * Math.cos(a));
      grp.add(new THREE.Mesh(tubeGeometry([tip, target], 0.028, 4, 6), matFor(id, 'cordage')));
    }
    addCut(grp, id);
  };
  const ML = new THREE.Vector3(1.05, 0.25, -1.05), TL = new THREE.Vector3(-2.0, 0.25, 0.95);
  avValve('valve-tricuspide', TL, 1.65, 1.1);
  avValve('valve-mitrale', ML, 1.4, 1.2);
  slValve('valve-aortique', new THREE.Vector3(-0.25, 1.1, 0.55), 1.05, [Math.PI / 2 + 0.3, 0, 0]);
  slValve('valve-pulmonaire', new THREE.Vector3(1.45, 1.5, 2.15), 1.05, [Math.PI / 2 + 0.6, 0.2, 0]);
  const papLV = [
    { base: new THREE.Vector3(2.4, -3.77, 0.35), tip: new THREE.Vector3(1.5, -1.3, -0.7), ang: 0.9 },
    { base: new THREE.Vector3(0.83, -3.6, -1.97), tip: new THREE.Vector3(0.7, -1.3, -1.3), ang: 3.3 },
  ];
  papLV.forEach((p) => { addCut(coneBetween(p.base, p.tip, 0.42, matFor('ventricule-gauche', 'papillaire')), 'ventricule-gauche', false); chordae('valve-mitrale', p.tip, ML, 0.7, -0.95, p.ang); });
  const papRV = [
    { base: new THREE.Vector3(-1.78, -3.16, 2.4), tip: new THREE.Vector3(-1.7, -1.2, 1.45), ang: 0.6, r: 0.36 },
    { base: new THREE.Vector3(-3.26, -3.42, -0.54), tip: new THREE.Vector3(-2.6, -1.2, 0.75), ang: -1.9, r: 0.34 },
    { base: new THREE.Vector3(-1.37, -2.6, 1.26), tip: new THREE.Vector3(-1.8, -1.1, 0.95), ang: 2.6, r: 0.22 },
  ];
  papRV.forEach((p) => { addCut(coneBetween(p.base, p.tip, p.r, matFor('ventricule-droit', 'papillaire')), 'ventricule-droit', false); chordae('valve-tricuspide', p.tip, TL, 0.8, -0.85, p.ang, 4); });
  addCut(new THREE.Mesh(tubeGeometry([new THREE.Vector3(-1.44, -3.2, 1.34), new THREE.Vector3(-1.6, -3.35, 1.9), papRV[0].base], 0.17, 8, 10), matFor('ventricule-droit', 'papillaire')), 'ventricule-droit', false); // bande modératrice

  /* ── Système de conduction (visible en coupe) ── */
  const node = (id, posL, r) => {
    const m = new THREE.Mesh(ellipsoid(r, r * 0.7, r * 0.5), matFor(id, 'conduction'));
    m.position.copy(posL);
    register(id, m, L2W(posL), local);
    cutOnly.push(m);
    solids.push({ mesh: m, hole: false, cap: 'conduction' });
  };
  node('noeud-sinusal', new THREE.Vector3(-2.7, 3.75, 0.5), 0.5);
  node('noeud-av', new THREE.Vector3(-0.9, 0.45, -0.25), 0.4);
  const hisTube = (pts, r, anchorT) => {
    const g = tubeGeometry(pts, r, 24, 10);
    const m = new THREE.Mesh(g, matFor('faisceau-his', 'conduction'));
    register('faisceau-his', m, anchorT !== undefined ? L2W(g.userData.curve.getPointAt(anchorT)) : null, local);
    cutOnly.push(m);
    solids.push({ mesh: m, hole: false, cap: 'conduction' });
  };
  hisTube([new THREE.Vector3(-0.9, 0.45, -0.25), new THREE.Vector3(-1.0, -0.4, 0.3), new THREE.Vector3(-1.05, -1.4, 0.87), new THREE.Vector3(-1.1, -2.6, 0.94), new THREE.Vector3(-1.15, -3.8, 1.0)], (t) => 0.14 - 0.04 * t, 0.4);
  hisTube([new THREE.Vector3(-1.05, -1.4, 0.87), new THREE.Vector3(-0.75, -1.6, 0.5), new THREE.Vector3(-0.84, -2.6, 0.62), new THREE.Vector3(-0.69, -3.8, 0.45)], 0.09); // branche gauche
  hisTube([new THREE.Vector3(-1.05, -1.4, 0.87), new THREE.Vector3(-1.37, -2.6, 1.26), new THREE.Vector3(-1.44, -3.2, 1.34), new THREE.Vector3(-1.6, -3.35, 1.9)], 0.09); // branche droite (par la bande modératrice)

  /* ── Trajets du sang (mode circulation) ── */
  const W = (pts) => pts.map((p) => (p.isVector3 ? p : L2W(new THREE.Vector3(...p))));
  const RA_W = v3(S.RA_W), LA_W = v3(S.LA_W), PT_ROOT = v3(S.PT_ROOT), AO_ROOT = v3(S.AO_ROOT), BIF = v3(S.BIF), PT_MID = v3(S.PT_MID);
  flowPaths.push({ color: 0x43589f, speed: 0.11, points: [new THREE.Vector3(-3.8, 11.5, -1.6), new THREE.Vector3(-3.8, 8.0, -1.6), RA_W.clone().add(new THREE.Vector3(0.1, 0.8, 0.0)), ...W([[-2.4, 1.4, 0.3], [-2.0, 0.2, 0.95], [-2.2, -1.6, 1.6], [-1.5, -3.2, 1.9], [-0.1, -1.4, 2.4], [0.9, 0.2, 2.4]]), PT_ROOT, PT_MID, BIF, new THREE.Vector3(-2.6, 7.1, -3.2), new THREE.Vector3(-5.2, 6.8, -3.6)] });
  flowPaths.push({ color: 0x43589f, speed: 0.11, points: [new THREE.Vector3(-2.7, -6.5, -2.9), new THREE.Vector3(-3.0, -2.0, -2.4), RA_W.clone().add(new THREE.Vector3(0.1, -0.9, -0.3)), ...W([[-2.4, 1.0, 0.2], [-2.0, 0.2, 0.95], [-2.3, -1.8, 1.7], [-1.3, -3.4, 2.0], [0.0, -1.2, 2.4], [1.0, 0.3, 2.4]]), PT_ROOT, PT_MID, BIF, new THREE.Vector3(2.4, 7.4, -2.0), new THREE.Vector3(5.6, 7.0, -3.4)] });
  const leftCore = [...W([[0.9, 2.3, -2.6], [1.05, 0.25, -1.05], [1.3, -2.0, -0.8], [1.6, -4.2, -0.3], [1.0, -2.5, -0.1], [0.2, -0.5, 0.3], [-0.25, 1.1, 0.55]]), AO_ROOT, new THREE.Vector3(-1.7, 5.0, -0.45), new THREE.Vector3(0.0, 9.8, -1.2), new THREE.Vector3(2.5, 9.7, -3.8), new THREE.Vector3(3.5, 4.0, -5.2), new THREE.Vector3(3.0, -4.0, -5.9), new THREE.Vector3(2.8, -8.0, -6.1)];
  flowPaths.push({ color: 0xc43a33, speed: 0.12, points: [LA_W.clone().add(new THREE.Vector3(-4.6, 1.3, -1.2)), LA_W.clone().add(new THREE.Vector3(-1.4, 0.9, -0.9)), ...leftCore] });
  flowPaths.push({ color: 0xc43a33, speed: 0.12, points: [LA_W.clone().add(new THREE.Vector3(4.4, -0.9, -1.4)), LA_W.clone().add(new THREE.Vector3(1.6, -0.6, -1.0)), ...leftCore] });
  flowPaths.push({ color: 0xc43a33, speed: 0.12, points: [AO_ROOT, new THREE.Vector3(-1.7, 5.0, -0.45), new THREE.Vector3(-1.3, 7.3, -0.8), new THREE.Vector3(0.15, 9.8, -1.25), new THREE.Vector3(-1.2, 12.4, -0.85), new THREE.Vector3(-1.7, 14.7, -0.6)] });

  // Résolution du clic : structure portée par l'enveloppe (attribut du maillage simplifié) ou par le maillage touché.
  const tmp = new THREE.Vector3();
  const pickId = (mesh, worldPoint, face) => {
    if (!mesh.userData.proxy) return mesh.userData.id;
    let id = env.ids[env.proxySid[face.a]];
    if (id === 'ventricule-droit' || id === 'ventricule-gauche' || id === 'apex') {
      root.worldToLocal(tmp.copy(worldPoint));
      id = S.ventricleRegion(S.w2l([tmp.x, tmp.y, tmp.z]));
    }
    return id;
  };
  // Surbrillance : par indice de structure pour l'enveloppe, par matériau pour les autres maillages.
  const setHighlight = (id) => {
    selUniform.value = id ? env.ids.indexOf(id) : -1;
    tissueMats.forEach((m) => { m.userData.uniforms.uHi.value = 0; });
    let any = selUniform.value >= 0;
    (id && registry[id] ? registry[id].meshes : []).forEach((mesh) => { const u = mesh.material?.userData?.uniforms; if (u) { u.uHi.value = 1; any = true; } });
    focusUniform.value = any ? 1 : 0; // pas de mise en retrait si rien n'est éclairé (septum, par exemple)
  };

  cutOnly.forEach((m) => { m.visible = false; });

  return { root, local, registry, materials, solids, cutOnly, flowPaths, pickId, setHighlight, envelope, proxy, matrixLocal: M };
}
