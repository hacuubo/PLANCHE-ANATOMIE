// Cœur reconstruit à partir de BodyParts3D (maillages OBJ de l'arbre PART-OF, réduction 99 %).
// « BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International ».
//
// BodyParts3D ne fournit pas le muscle ventriculaire : seulement les cavités, valves, piliers, oreillettes, coronaires et
// gros vaisseaux. Le myocarde ventriculaire est donc reconstruit autour des cavités réelles, avec une épaisseur
// interpolée à partir de la position réelle des coronaires (qui courent à la surface du cœur).
// Toutes les surfaces visibles sont ré-extraites d'un champ de distance : maillages fermés, lissés, sans trous.
import fs from 'node:fs';
import path from 'node:path';
import { MeshSDF, PointCloud } from './mesh-sdf.mjs';

/* ─────────── lecture ─────────── */
// Repère BodyParts3D (mm) : x = gauche du patient, y = arrière, z = haut. Application (cm) : x gauche, y haut, z avant.
export const OFFSET = [-0.84, -122.08, -12.32];
export function readPieces(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.obj')) continue;
    const fd = fs.openSync(path.join(dir, f), 'r'); const head = Buffer.alloc(1200); fs.readSync(fd, head, 0, 1200, 0); fs.closeSync(fd);
    const name = (head.toString('latin1').match(/# English name : ([^\r\n]*)/) || [])[1];
    if (name) out.push({ file: f, name });
  }
  return out;
}
export function loadMesh(dir, file) {
  const txt = fs.readFileSync(path.join(dir, file), 'latin1');
  const v = [], idx = [];
  for (const line of txt.split('\n')) {
    if (line.startsWith('v ')) { const [, x, y, z] = line.trim().split(/\s+/).map(Number); v.push(x / 10 + OFFSET[0], z / 10 + OFFSET[1], -y / 10 + OFFSET[2]); }
    else if (line.startsWith('f ')) { const p = line.trim().split(/\s+/).slice(1).map((s) => parseInt(s, 10) - 1); for (let i = 1; i < p.length - 1; i++) idx.push(p[0], p[i], p[i + 1]); }
  }
  return { pos: new Float64Array(v), idx: new Uint32Array(idx) };
}
export function mergeMeshes(list) {
  let nv = 0, ni = 0; list.forEach((m) => { nv += m.pos.length; ni += m.idx.length; });
  const pos = new Float64Array(nv), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const m of list) { pos.set(m.pos, ov); for (let i = 0; i < m.idx.length; i++) idx[oi + i] = m.idx[i] + ov / 3; ov += m.pos.length; oi += m.idx.length; }
  return { pos, idx };
}

/* ─────────── correspondance anatomique ─────────── */
// rôle : cavite | paroi | vaisseau | coronaire | veine | valve | pilier ; id = identifiant de js/data.js
export const MAP = [
  [/^Cavity of left ventricle$/, 'cavite', 'ventricule-gauche'], [/^Cavity of right ventricle$/, 'cavite', 'ventricule-droit'],
  [/^Cavity of left atrium$/, 'cavite', 'oreillette-gauche'], [/^Cavity of right atrium$/, 'cavite', 'oreillette-droite'],
  [/^Wall of left atrium$/, 'paroi', 'oreillette-gauche'], [/^Wall of right atrium$/, 'paroi', 'oreillette-droite'],
  [/^(Ascending aorta|Arch of aorta|Descending thoracic aorta)$/, 'vaisseau', 'aorte'],
  [/^Pulmonary trunk$/, 'vaisseau', 'tronc-pulmonaire'], [/^Right pulmonary artery$/, 'vaisseau', 'artere-pulmonaire-droite'],
  [/^Left pulmonary artery$/, 'vaisseau', 'artere-pulmonaire-gauche'], [/^Superior vena cava$/, 'vaisseau', 'veine-cave-superieure'],
  [/^Inferior vena cava$/, 'vaisseau', 'veine-cave-inferieure'], [/pulmonary vein$/, 'vaisseau', 'veines-pulmonaires'],
  [/^Left common carotid artery$/, 'vaisseau', 'carotide-commune-gauche'], [/^Left subclavian artery$/, 'vaisseau', 'subclaviere-gauche'],
  [/^(Brachiocephalic artery|Right common carotid artery|Right subclavian artery)$/, 'vaisseau', 'tronc-brachio-cephalique'],
  [/^Trunk of left coronary artery$/, 'coronaire', 'tronc-commun'],
  [/anterior interventricular branch|Diagonal branch|anterior descending/, 'coronaire', 'iva'],
  [/^Circumflex branch of left coronary artery$/, 'coronaire', 'circonflexe'],
  [/right coronary artery|^Right conus artery$/, 'coronaire', 'coronaire-droite'],
  [/^Great cardiac vein$|^Left marginal vein$/, 'veine', 'grande-veine-cardiaque'],
  [/^Middle cardiac vein$/, 'veine', 'veine-cardiaque-moyenne'],
  [/^Coronary sinus$/, 'veine', 'sinus-coronaire'],
  [/^Posterior vein of left ventricle$|^Small cardiac vein$|^Right marginal vein$/, 'veine', 'petites-veines-cardiaques'],
  [/aortic valve/, 'valve', 'valve-aortique'], [/pulmonary valve/, 'valve', 'valve-pulmonaire'],
  [/mitral valve/, 'valve', 'valve-mitrale'], [/tricuspid valve/, 'valve', 'valve-tricuspide'],
  [/papillary muscle of left ventricle/, 'pilier', 'ventricule-gauche'], [/papillary muscle of right ventricle/, 'pilier', 'ventricule-droit'],
];
export function classify(name) { for (const [re, role, id] of MAP) if (re.test(name)) return { role, id }; return null; }

/* ─────────── outils de champ ─────────── */
export const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const smax = (a, b, k) => -smin(-a, -b, k);
export function hash3(i, j, k) {
  let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(k, 0x6c8e9cf5);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash3(i, j, k), hash3(i + 1, j, k), u), L(hash3(i, j + 1, k), hash3(i + 1, j + 1, k), u), v),
    L(L(hash3(i, j, k + 1), hash3(i + 1, j, k + 1), u), L(hash3(i, j + 1, k + 1), hash3(i + 1, j + 1, k + 1), u), v), w);
}
export const fbm = (x, y, z) => 0.6 * vnoise(x, y, z) + 0.4 * vnoise(x * 2.03 + 17, y * 2.03 + 31, z * 2.03 + 7);

// Tube analytique (segments) — tronc brachio-céphalique, ligament artériel.
export function tubeSDF(pts, r) {
  return (x, y, z) => {
    let best = 1e9;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2];
      const l2 = bx * bx + by * by + bz * bz;
      const h = Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / l2));
      const ra = typeof r === 'function' ? r((i + h) / (pts.length - 1)) : r;
      best = Math.min(best, Math.hypot(px - bx * h, py - by * h, pz - bz * h) - ra);
    }
    return best;
  };
}
export const centroid = (pos) => { let x = 0, y = 0, z = 0; const n = pos.length / 3; for (let i = 0; i < n; i++) { x += pos[i * 3]; y += pos[i * 3 + 1]; z += pos[i * 3 + 2]; } return [x / n, y / n, z / n]; };
export const bboxOf = (pos) => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < pos.length; i++) { const k = i % 3; mn[k] = Math.min(mn[k], pos[i]); mx[k] = Math.max(mx[k], pos[i]); } return { min: mn, max: mx }; };
export { MeshSDF, PointCloud };
