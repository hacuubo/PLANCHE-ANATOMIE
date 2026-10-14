// Contrôle anatomique de l'intérieur du cœur (aucune dépendance) :
//   node tools/check-walls.mjs
// 1. Épaisseur de paroi entre chaque cavité (S.CAVITES) et la surface extérieure (enveloppe de js/heart-shape.js).
//    Une valeur négative signifie que la cavité perce l'enveloppe.
// 2. Épaisseur du septum interventriculaire (distance entre les cavités VG et VD).
// 3. Position des structures internes de js/heart.js : faisceau de His dans le septum, piliers dans leur cavité.
// À relancer après toute modification de la forme (PROFIL, Z_SCALE…) ou des cavités.
import * as S from '../js/heart-shape.js';

const { VG, VD, OD, OG, chasseVG, infundibulum } = S.CAVITES;
const ellipsoid = (c, r) => (u, v) => [c[0] + r[0] * Math.sin(v) * Math.cos(u), c[1] + r[1] * Math.cos(v), c[2] + r[2] * Math.sin(v) * Math.sin(u)];
// ellipsoïde plié en arc (bentEllipsoid de heart.js) et sa fonction inverse
const bentFwd = ([x, y, z]) => { const phi = VD.phiC + x / VD.R; return [VD.pos[0] + (VD.R + z) * Math.sin(phi), VD.pos[1] + y, VD.pos[2] + (VD.R + z) * Math.cos(phi)]; };
const rvSurf = (u, v) => bentFwd([VD.ax * Math.sin(v) * Math.cos(u), VD.ay * Math.cos(v), VD.az * Math.sin(v) * Math.sin(u)]);
const rvN = (p) => { const x0 = p[0] - VD.pos[0], z0 = p[2] - VD.pos[2]; return Math.hypot((Math.atan2(x0, z0) - VD.phiC) * VD.R / VD.ax, (p[1] - VD.pos[1]) / VD.ay, (Math.hypot(x0, z0) - VD.R) / VD.az); };
const lvN = (p) => Math.hypot((p[0] - VG.centre[0]) / VG.rayons[0], (p[1] - VG.centre[1]) / VG.rayons[1], (p[2] - VG.centre[2]) / VG.rayons[2]);
const tube = ({ pts, r }) => (u, v) => { const c = S.curvePoint(pts, v / Math.PI), n = S.curvePoint(pts, Math.min(1, v / Math.PI + 0.01)), t = S.vnorm(S.vsub(n, c)); const a = S.vnorm(S.vcross(t, [0, 1, 0])), b = S.vcross(t, a); return S.vadd(c, S.vadd(S.vscale(a, r * Math.cos(u)), S.vscale(b, r * Math.sin(u)))); };
const wall = (pl) => { const pw = S.l2w(pl); return -S.field(pw[0], pw[1], pw[2]); };
const sample = (f) => { const o = []; for (let i = 0; i < 72; i++) for (let j = 1; j < 36; j++) o.push(f((i / 72) * 2 * Math.PI, (j / 36) * Math.PI)); return o; };
const pct = (a, q) => a[Math.floor(q * (a.length - 1))].toFixed(2);
let erreurs = 0;

// Chambres de chasse : au niveau des valves, la paroi est celle de la racine artérielle (≈ 2 mm) ou le rideau
// fibreux mitro-aortique (≈ 1 mm), d'où des minima plus bas.
console.log('1. Parois (cm) — points de la base (y > −0,4, ouverts sur les oreillettes) exclus pour les ventricules');
for (const [nom, f, base, mini] of [['VG', ellipsoid(VG.centre, VG.rayons), true, 0.6], ['VD', rvSurf, true, 0.25], ['OD', ellipsoid(OD.centre, OD.rayons), false, 0.15], ['OG', ellipsoid(OG.centre, OG.rayons), false, 0.15], ['chasse VG', tube(chasseVG), false, 0.08], ['infundibulum', tube(infundibulum), false, 0.15]]) {
  const w = sample(f).filter((p) => !base || p[1] < -0.4).map(wall).sort((a, b) => a - b);
  const ok = w[0] >= mini;
  if (!ok) erreurs++;
  console.log(`   ${ok ? 'ok ' : 'NON'} ${nom.padEnd(13)} min ${pct(w, 0)}  5 % ${pct(w, 0.05)}  médiane ${pct(w, 0.5)}  (minimum attendu ${mini})`);
}

const ellD = (p) => { const [c, r] = [VG.centre, VG.rayons]; const x = p[0] - c[0], y = p[1] - c[1], z = p[2] - c[2]; const k0 = Math.hypot(x / r[0], y / r[1], z / r[2]), k1 = Math.hypot(x / r[0] ** 2, y / r[1] ** 2, z / r[2] ** 2); return k0 * (k0 - 1) / k1; };
const sept = Math.min(...sample(rvSurf).map(ellD));
if (sept < 0.7) erreurs++;
console.log(`2. Septum : épaisseur minimale ${sept.toFixed(2)} cm (attendu ≥ 0,7)`);

console.log('3. Structures internes (indice < 1 = dans la cavité)');
const POINTS = [
  ['His (septum)', [[-1.0, -0.4, 0.3], [-1.05, -1.4, 0.87], [-1.1, -2.6, 0.94], [-1.15, -3.8, 1.0]], 'septum'],
  ['branche gauche (sous-endocarde VG)', [[-0.75, -1.6, 0.5], [-0.84, -2.6, 0.62], [-0.69, -3.8, 0.45]], 'endoVG'],
  ['ancre du septum', [[-1.1, -2.6, 0.94]], 'septum'],
  ['sommets des piliers du VG', [[1.5, -1.3, -0.7], [0.7, -1.3, -1.3]], 'VG'],
  ['sommets des piliers du VD', [[-1.7, -1.2, 1.45], [-2.6, -1.2, 0.75], [-1.8, -1.1, 0.95]], 'VD'],
];
for (const [nom, pts, ou] of POINTS) {
  const ok = pts.every((p) => (ou === 'septum' ? lvN(p) > 1 && rvN(p) > 1 && wall(p) > 0.3 : ou === 'endoVG' ? lvN(p) > 1 && lvN(p) < 1.15 && rvN(p) > 1 : ou === 'VG' ? lvN(p) < 1 : rvN(p) < 1));
  if (!ok) erreurs++;
  console.log(`   ${ok ? 'ok ' : 'NON'} ${nom.padEnd(40)} ` + pts.map((p) => `VG ${lvN(p).toFixed(2)} / VD ${rvN(p).toFixed(2)}`).join(' ; '));
}
console.log(erreurs ? `\n${erreurs} contrôle(s) en échec.` : '\nTous les contrôles passent.');
process.exitCode = erreurs ? 1 : 0;
