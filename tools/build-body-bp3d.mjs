// Corps entier pour la planche de l'introduction des animations de pose (js/route-intro.js, tools/make-plate.mjs) :
// peau, squelette, reins et vaisseaux de la grande circulation, tirés de BodyParts3D dans le repère du cœur (cm ; x à
// gauche du patient, y en haut, z en avant — même conversion que tools/build-heart-bp3d.mjs) ; trajets des dispositifs.
//   node tools/build-body-bp3d.mjs <dossier partof_BP3D_4.0_obj_99>
// Écrit tools/cache/corps.bin et tools/cache/corps.json (non versionnés : seules les images de la planche sont publiées).
// « BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International ».
//
// Vaisseaux : ceux de BodyParts3D (toutes les artères de la grande circulation, sauf intracrâniennes, pulmonaires et
// coronaires ; veines caves, troncs brachiocéphaliques, jugulaire interne et sous-clavière droites, céphaliques,
// basiliques, iliaques, rénales manquantes…). Ceux qui manquent sont reconstruits sur l'anatomie réelle du modèle :
//   — jugulaire interne, sous-clavière et humérale gauches : symétriques des droites (plan médian du corps) ;
//   — fémorales, poplitées et tibiales : le long de leur artère, en dedans puis en arrière d'elle (veine fémorale en
//     dedans de l'artère au trigone fémoral, en arrière dans le canal des adducteurs, veine poplitée en arrière) ;
//   — grande saphène : sous la peau, en avant de la malléole médiale, face médiale de la jambe et du genou, jusqu'à la
//     veine fémorale ≈ 4 cm sous le ligament inguinal ;
//   — jugulaire externe : sous la peau du cou, de l'angle de la mandibule à la veine sous-clavière ;
//   — veines rénales : de la veine cave inférieure au hile de chaque rein, la gauche passant devant l'aorte.
// Les pièces du cœur du modèle (aorte ascendante et crosse, veine cave supérieure, tronc et artères pulmonaires, veines
// pulmonaires, vaisseaux du cœur) ne sont pas reprises : le cœur de la planche est le modèle lui-même.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPieces, loadMesh } from './lib/bp3d-heart.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = process.argv[2];
if (!DIR || !fs.existsSync(DIR)) { console.error('Usage : node tools/build-body-bp3d.mjs <dossier partof_BP3D_4.0_obj_99>'); process.exit(1); }
const v3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: (a) => Math.hypot(a[0], a[1], a[2]), cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
v3.norm = (a) => v3.mul(a, 1 / (v3.len(a) || 1));
v3.dist = (a, b) => v3.len(v3.sub(a, b));
v3.lerp = (a, b, t) => v3.add(a, v3.mul(v3.sub(b, a), t));

/* ── 1. pièces ── */
const pieces = readPieces(DIR);
const BONE = /(bone|vertebra|\brib\b|ribs|sternum|manubrium|xiphoid|clavicle|scapula|humerus|radius|ulna|femur|patella|tibia|fibula|skull|mandible|sacrum|coccyx|phalan|metacarp|metatars|carpal|tarsal|calcaneus|talus|navicular|cuboid|cuneiform|hamate|capitate|trapezi|lunate|scaphoid|pisiform|triquetr|hyoid|atlas|axis|costal cartilage|maxilla|zygomatic|occipital|frontal|parietal|temporal bone|sphenoid|ethmoid|nasal|vomer|lacrimal|palatine|inferior nasal concha)/i;
const NOT_BONE = /(artery|vein|muscle|ligament|branch|nerve|tendon|lobe|gyrus|sulcus|sinus|cartilage of|fascia|membrane|joint|capsule|disc)/i;
const VESSEL = /(artery|aorta|vein|vena cava|^(left |right )?(celiac|costocervical|thyrocervical) trunk$|^trunk of .*(artery|vein)$)/i;
const NOT_VESSEL = /(coronary|cardiac vein|of left ventricle|marginal vein|conus|diagonal|interventricular|segmental|lingular|pulmonary|lobar|cerebral|cerebellar|choroidal|communicating|pontine|basilar|thalamo|ophthalmic|spinal|^ascending aorta$|^arch of aorta$|^superior vena cava$|portal|hepatic (artery|vein)|of right hepatic|of left hepatic|hepatic artery proper|phrenic|suprarenal|ureteric|caudate|splenial|esophageal)/i;
const sel = (p) => {
  if (/^skin$/i.test(p.name)) return 'skin';
  if (/^(left|right) kidney$/i.test(p.name)) return 'kidney';
  if (VESSEL.test(p.name) && !NOT_VESSEL.test(p.name)) return /(vein|vena)/i.test(p.name) ? 'v' : 'a';
  if (BONE.test(p.name) && !NOT_BONE.test(p.name)) return 'bone';
  return null;
};
const parts = pieces.map((p) => ({ ...p, kind: sel(p) })).filter((p) => p.kind);
const mesh = new Map(parts.map((p) => [p.file, loadMesh(DIR, p.file)]));
const byName = (re) => parts.filter((p) => re.test(p.name));
const one = (re) => { const p = byName(re); if (!p.length) throw new Error('pièce absente : ' + re); return p; };
console.log(parts.length, 'pièces :', ['skin', 'bone', 'kidney', 'a', 'v'].map((k) => `${k} ${parts.filter((p) => p.kind === k).length}`).join(', '));
const vertsOf = (list) => { const out = []; for (const p of list) { const m = mesh.get(p.file); for (let i = 0; i < m.pos.length; i += 3) out.push([m.pos[i], m.pos[i + 1], m.pos[i + 2]]); } return out; };

/* ── 2. repères du corps ── */
const skin = vertsOf(one(/^skin$/i));
const xs = skin.map((p) => p[0]).sort((a, b) => a - b), X0 = xs[Math.floor(xs.length / 2)]; // plan médian
const ys = skin.map((p) => p[1]), YMIN = Math.min(...ys), YMAX = Math.max(...ys);
console.log('plan médian x =', X0.toFixed(2), '; hauteur', YMIN.toFixed(1), '→', YMAX.toFixed(1), 'cm');
const mirrorX = (p) => [2 * X0 - p[0], p[1], p[2]];

// ligne centrale d'un vaisseau : tranches de 4 mm le long de son axe principal (ou de l'axe donné), barycentres lissés
function centerline(list, axis = null, step = 0.4) {
  const V = vertsOf(list), c = V.reduce((s, p) => v3.add(s, v3.mul(p, 1 / V.length)), [0, 0, 0]);
  let a = axis;
  if (!a) { // axe principal (itération de puissance sur la covariance)
    const C = [0, 0, 0, 0, 0, 0];
    for (const p of V) { const d = v3.sub(p, c); C[0] += d[0] * d[0]; C[1] += d[0] * d[1]; C[2] += d[0] * d[2]; C[3] += d[1] * d[1]; C[4] += d[1] * d[2]; C[5] += d[2] * d[2]; }
    a = [1, 1, 1];
    for (let i = 0; i < 40; i++) a = v3.norm([C[0] * a[0] + C[1] * a[1] + C[2] * a[2], C[1] * a[0] + C[3] * a[1] + C[4] * a[2], C[2] * a[0] + C[4] * a[1] + C[5] * a[2]]);
  }
  const t = V.map((p) => v3.dot(v3.sub(p, c), a)), t0 = Math.min(...t), t1 = Math.max(...t), n = Math.max(2, Math.ceil((t1 - t0) / step));
  const bins = Array.from({ length: n }, () => ({ s: [0, 0, 0], k: 0 }));
  V.forEach((p, i) => { const b = bins[Math.min(n - 1, Math.floor(((t[i] - t0) / (t1 - t0 || 1)) * n))]; b.s = v3.add(b.s, p); b.k++; });
  let pts = bins.filter((b) => b.k).map((b) => v3.mul(b.s, 1 / b.k));
  for (let k = 0; k < 3; k++) pts = pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p : v3.mul(v3.add(v3.add(pts[i - 1], v3.mul(p, 2)), pts[i + 1]), 0.25)));
  return pts;
}
// rayon moyen d'un vaisseau autour de sa ligne centrale
const radiusOf = (list, cl) => { const V = vertsOf(list); let s = 0; for (const p of V) { let m = Infinity; for (const q of cl) m = Math.min(m, v3.dist(p, q)); s += m; } return s / V.length; };
// oriente une ligne pour qu'elle commence au plus près de p
const from = (cl, p) => (v3.dist(cl[0], p) <= v3.dist(cl[cl.length - 1], p) ? cl : cl.slice().reverse());
const near = (cl, p) => cl.reduce((b, q) => (v3.dist(q, p) < v3.dist(b, p) ? q : b), cl[0]);

/* ── 3. vaisseaux reconstruits ── */
const synth = []; // { name, kind, pts, r(t) }
function tubeMesh(pts, rFn, radial = 14) {
  const pos = [], idx = [], n = pts.length;
  let prevN = null;
  for (let i = 0; i < n; i++) {
    const t = v3.norm(v3.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
    const nn = prevN ? v3.norm(v3.sub(prevN, v3.mul(t, v3.dot(prevN, t)))) : v3.norm(v3.cross(t, Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    prevN = nn;
    const bb = v3.cross(t, nn), r = rFn(i / (n - 1));
    for (let j = 0; j < radial; j++) { const a = (j / radial) * Math.PI * 2; pos.push(...v3.add(pts[i], v3.add(v3.mul(nn, r * Math.cos(a)), v3.mul(bb, r * Math.sin(a))))); }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial; idx.push(a, b, c, b, d, c); }
  for (const [ring, flip] of [[0, false], [n - 1, true]]) { const c = pos.length / 3; pos.push(...pts[ring]); for (let j = 0; j < radial; j++) { const a = ring * radial + j, b = ring * radial + (j + 1) % radial; if (flip) idx.push(c, a, b); else idx.push(c, b, a); } }
  return { pos: new Float64Array(pos), idx: new Uint32Array(idx) };
}
const resample = (pts, step = 0.3) => {
  const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) { const d = v3.dist(pts[i], pts[i - 1]); acc += d; if (acc >= step || i === pts.length - 1) { out.push(pts[i]); acc = 0; } }
  return out;
};
const smooth = (pts, k = 3) => { let p = pts; for (let s = 0; s < k; s++) p = p.map((q, i) => (i === 0 || i === p.length - 1 ? q : v3.mul(v3.add(v3.add(p[i - 1], v3.mul(q, 2)), p[i + 1]), 0.25))); return p; };
const addSynth = (name, kind, pts, r0, r1 = r0) => synth.push({ name, kind, pts: smooth(resample(pts)), r: (t) => r0 + (r1 - r0) * t });

// gauche : symétriques des veines droites de BodyParts3D
for (const [re, nm] of [[/^Right internal jugular vein$/, 'Left internal jugular vein'], [/^Right subclavian vein$/, 'Left subclavian vein'], [/^Right medial brachial vein$/, 'Left medial brachial vein']]) {
  for (const p of byName(re)) { const m = mesh.get(p.file), pos = new Float64Array(m.pos.length); for (let i = 0; i < pos.length; i += 3) { const q = mirrorX([m.pos[i], m.pos[i + 1], m.pos[i + 2]]); pos.set(q, i); } const idx = new Uint32Array(m.idx.length); for (let i = 0; i < idx.length; i += 3) { idx[i] = m.idx[i]; idx[i + 1] = m.idx[i + 2]; idx[i + 2] = m.idx[i + 1]; } mesh.set(p.file + 'M', { pos, idx }); parts.push({ file: p.file + 'M', name: nm, kind: 'v' }); }
}
// veines profondes du membre inférieur, le long des artères
for (const side of ['Right', 'Left']) {
  const s = side === 'Right' ? -1 : 1, medial = [-s, 0, 0]; // vers le plan médian
  const fem = from(centerline(one(new RegExp(`^${side} femoral artery$`)), [0, 1, 0]), [0, 1e3, 0]); // de haut en bas
  const pop = from(centerline(one(new RegExp(`^${side} popliteal artery$`)), [0, 1, 0]), fem[fem.length - 1]);
  const fv = fem.map((p, i) => { const t = i / (fem.length - 1); return v3.add(p, v3.add(v3.mul(medial, 0.9 * (1 - t) + 0.2 * t), [0, 0, -0.3 - 0.7 * t])); });
  const pv = pop.map((p) => v3.add(p, [0, 0, -0.7]));
  addSynth(`${side} femoral vein`, 'v', [...fv, ...pv], 0.5, 0.36);
  for (const [art, nm] of [['anterior tibial artery', 'anterior tibial vein'], ['posterior tibial artery', 'posterior tibial vein']]) {
    const ps = byName(new RegExp(`^${side} ${art}$`)); if (!ps.length) continue;
    const cl = from(centerline(ps, [0, 1, 0]), [0, 1e3, 0]);
    addSynth(`${side} ${nm}`, 'v', cl.map((p) => v3.add(p, v3.add(v3.mul(medial, 0.35), [0, 0, -0.25]))), 0.2, 0.14);
  }
  // grande saphène : sous la peau de la face médiale (anté-médiale à la cheville, médiale au genou, antéro-médiale en haut)
  const legSkin = skin.filter((p) => s * (p[0] - X0) > 2);
  const yAnk = YMIN + 9, yGroin = fem[0][1] - 4;
  const gsv = [];
  for (let y = yAnk; y <= yGroin; y += 2) {
    const ring = legSkin.filter((p) => Math.abs(p[1] - y) < 0.7); if (ring.length < 8) continue;
    const c = ring.reduce((a, p) => v3.add(a, v3.mul(p, 1 / ring.length)), [0, 0, 0]);
    const u = (y - yAnk) / (yGroin - yAnk), ant = u < 0.08 ? 0.8 : u < 0.55 ? -0.25 : 0.45 * (u - 0.55) / 0.45;
    const dir = v3.norm([-s, 0, ant]), top = ring.reduce((b, p) => (v3.dot(v3.sub(p, c), dir) > v3.dot(v3.sub(b, c), dir) ? p : b), ring[0]);
    gsv.push(v3.add(top, v3.mul(v3.norm(v3.sub(c, top)), 0.35)));
  }
  gsv.push(v3.add(near(fv, [0, yGroin + 1, 0]), [0, 0, 0]));
  addSynth(`${side} great saphenous vein`, 'v', gsv, 0.18, 0.26);
  // jugulaire externe : sous la peau du cou (côté latéral et avant), de l'angle de la mandibule à la veine sous-clavière
  const sub = byName(side === 'Right' ? /^Right subclavian vein$/ : /^Left subclavian vein$/);
  if (sub.length) {
    const subV = centerline(sub), lat = subV.reduce((b, p) => (s * p[0] > s * b[0] ? p : b), subV[0]); // bout latéral
    const neck = skin.filter((p) => s * (p[0] - X0) > 1 && p[1] > lat[1] + 1 && p[1] < lat[1] + 11);
    const ej = [];
    for (let y = lat[1] + 10; y >= lat[1] + 1.5; y -= 1) {
      const ring = neck.filter((p) => Math.abs(p[1] - y) < 0.5 && Math.abs(p[0] - X0) < 9); if (ring.length < 6) continue;
      const c = ring.reduce((a, p) => v3.add(a, v3.mul(p, 1 / ring.length)), [0, 0, 0]), dir = v3.norm([s * 0.75, 0, 0.66]);
      const top = ring.reduce((b, p) => (v3.dot(v3.sub(p, c), dir) > v3.dot(v3.sub(b, c), dir) ? p : b), ring[0]);
      ej.push(v3.add(top, v3.mul(v3.norm(v3.sub(c, top)), 0.4)));
    }
    if (ej.length > 3) { ej.push(v3.lerp(lat, subV[Math.floor(subV.length / 2)], 0.3)); addSynth(`${side} external jugular vein`, 'v', ej, 0.18, 0.26); }
  }
}
// veines rénales : de la veine cave inférieure au hile du rein (la gauche devant l'aorte)
{
  const ivc = centerline(one(/^Inferior vena cava$/), [0, 1, 0]), ao = centerline(one(/^Abdominal aorta$/), [0, 1, 0]);
  for (const side of ['Right', 'Left']) {
    const k = vertsOf(one(new RegExp(`^${side} kidney$`))), kc = k.reduce((a, p) => v3.add(a, v3.mul(p, 1 / k.length)), [0, 0, 0]);
    const hil = k.reduce((b, p) => (Math.abs(p[0] - X0) < Math.abs(b[0] - X0) && Math.abs(p[1] - kc[1]) < 1.5 ? p : b), kc);
    const start = near(ivc, [0, hil[1] + 0.5, 0]), a = near(ao, [0, hil[1], 0]);
    const mid = side === 'Left' ? [a[0], (start[1] + hil[1]) / 2, a[2] + 1.6] : v3.lerp(start, hil, 0.5);
    addSynth(`${side} renal vein`, 'v', side === 'Left' ? [start, v3.lerp(start, mid, 0.5), mid, v3.lerp(mid, hil, 0.5), hil] : [start, mid, hil], 0.45, 0.32);
  }
}
for (const s of synth) { const m = tubeMesh(s.pts, s.r); mesh.set(s.name, m); parts.push({ file: s.name, name: s.name, kind: s.kind }); }

/* ── 4. trajets des dispositifs (lignes centrales, dans l'ordre du parcours) ── */
// enchaîne les lignes centrales ; un point qui revient en arrière (chevauchement de deux pièces) est écarté
const chain = (segs) => {
  const out = [];
  for (const cl of segs) for (const p of (out.length ? from(cl, out[out.length - 1]) : cl)) {
    if (out.length >= 2 && v3.dot(v3.sub(out[out.length - 1], out[out.length - 2]), v3.sub(p, out[out.length - 1])) <= 0) continue;
    if (out.length && v3.dist(p, out[out.length - 1]) < 0.05) continue;
    out.push(p);
  }
  return smooth(resample(out, 0.4), 2);
};
const fa = from(centerline(one(/^Right femoral artery$/), [0, 1, 0]), [0, -1e3, 0]); // de bas en haut
const routes = {
  // artère fémorale droite (≈ 3 cm sous le ligament inguinal) → iliaques → aorte abdominale → aorte descendante
  tavi: chain([fa.filter((p) => p[1] > fa[fa.length - 1][1] - 4.5), centerline(one(/^Right external iliac artery$/)), centerline(one(/^Right common iliac artery$/)),
    centerline(one(/^Abdominal aorta$/), [0, 1, 0]), centerline(byName(/^(Descending thoracic aorta|Descending aorta)$/), [0, 1, 0])]),
  // veine fémorale droite → iliaques → veine cave inférieure
  fop: chain([from(synth.find((s) => s.name === 'Right femoral vein').pts, [0, 1e3, 0]).slice(0, 14).reverse(), centerline(one(/^Right external iliac vein$/)), centerline(one(/^Right common iliac vein$/)),
    centerline(one(/^Inferior vena cava$/), [0, 1, 0])]),
  // veine sous-clavière gauche → tronc brachiocéphalique gauche → (veine cave supérieure du modèle)
  pm: chain([from(centerline(byName(/^Left subclavian vein$/)), [100, 0, 0]), centerline(one(/^Left brachiocephalic vein$/))]),
};
// la veine fémorale s'arrête où commence l'iliaque externe ; le trajet du stimulateur commence au bout latéral
const r3 = (v) => Math.round(v * 1000) / 1000;

/* ── 5. écriture ── */
const groups = [];
let nv = 0, ni = 0;
for (const p of parts) { const m = mesh.get(p.file); nv += m.pos.length / 3; ni += m.idx.length; }
const pos = new Float32Array(nv * 3), idx = new Uint32Array(ni);
let ov = 0, oi = 0;
for (const p of parts) {
  const m = mesh.get(p.file);
  pos.set(m.pos, ov * 3);
  for (let i = 0; i < m.idx.length; i++) idx[oi + i] = m.idx[i] + ov;
  groups.push({ name: p.name, kind: p.kind, v0: ov, nv: m.pos.length / 3, i0: oi, ni: m.idx.length });
  ov += m.pos.length / 3; oi += m.idx.length;
}
fs.mkdirSync(path.join(ROOT, 'tools/cache'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tools/cache/corps.bin'), Buffer.concat([Buffer.from(pos.buffer), Buffer.from(idx.buffer)]));
fs.writeFileSync(path.join(ROOT, 'tools/cache/corps.json'), JSON.stringify({
  nv, ni, groups, midline: r3(X0), height: [r3(YMIN), r3(YMAX)],
  routes: Object.fromEntries(Object.entries(routes).map(([k, pts]) => [k, pts.map((p) => p.map(r3))])),
}));
console.log('tools/cache/corps.bin :', nv, 'sommets,', ni / 3, 'triangles ;', groups.length, 'pièces');
