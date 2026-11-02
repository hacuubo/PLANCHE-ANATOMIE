// Rubrique Coronaires : animations de l'angioplastie coronaire (intervention coronaire percutanée, ICP) de l'IVA.
//   « Infarctus (IVA) » : angioplastie primaire d'un infarctus antérieur — occlusion de l'IVA moyenne, juste après la
//     1re diagonale (même artère et même territoire que la vue de l'infarctus, js/heart.js) ;
//   « Lésion serrée (IVA) » : angioplastie programmée d'un rétrécissement serré de l'IVA proximale (angor stable).
// Déroulé (ESC 2023, syndromes coronaires aigus ; ESC 2024, syndromes coronaires chroniques) : coronarographie par voie
// radiale, sonde guide (6 F) à l'entrée de la coronaire gauche, produit de contraste (flux TIMI : TIMI Study Group, NEJM
// 1985) ; guide de 0,014 pouce (0,36 mm) poussé au-delà de la lésion ; prédilatation au ballon ; stent actif serti sur
// son ballon, couvrant la lésion d'un segment sain à l'autre, déployé à ≈ 12 atm ; post-dilatation au ballon non
// compliant à haute pression (lésion serrée) ; contrôle (TIMI 3), retrait du guide et de la sonde. Pas d'aspiration
// systématique du thrombus (ESC 2023 ; essai TOTAL, NEJM 2015).
// La vue : d'abord le cœur entier (coronarographie : le produit de contraste remplit le réseau gauche ; dans l'infarctus,
// il s'arrête à l'occlusion), puis un gros plan sur l'IVA, à sa place et à l'échelle réelle (1 = 1 cm), fendue en long
// (moitié avant retirée) : la paroi en coupe, de la lumière vers le dehors — intima (≈ 0,12 mm), limitante élastique
// interne, média de cellules musculaires lisses (≈ 0,2 mm, Konishi, PLOS ONE 2023), limitante élastique externe,
// adventice (≈ 0,2 mm) — et la plaque d'athérome dans l'intima : chape fibreuse, cœur lipidique (nécrotique), calcifications ;
// plaque rompue de l'infarctus : chape très fine (< 65 µm, Burke, NEJM 1997 ; Virmani, ATVB 2000) déchirée, thrombus
// (tête blanche plaquettaire, corps rouge) qui bouche la lumière ; plaque stable : chape épaisse, remodelage positif
// (Glagov, NEJM 1987). Calibre : IVA ≈ 3,3 mm proximale, 2,7 mm moyenne (angiographie quantitative ; Dodge, Circulation
// 1992). Matériel : guide 0,36 mm à bout radio-opaque ; ballons semi-compliants (2,5 mm), ballon non compliant ; stent en
// cobalt-chrome, mailles de ≈ 80 µm (60 à 81 µm selon les modèles), anneaux sinusoïdaux reliés par des ponts, qui
// s'ouvrent quand le ballon gonfle. Le cœur bat : l'artère du gros plan et le matériel suivent la déformation (shader,
// heart.addDeform), la caméra suit le centre de la lésion.
import * as THREE from 'three';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const sm = (a, b, x) => ease((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

export const PCI_STEPS = {
  idm: [
    { d: 4.5, text: 'Infarctus du myocarde antérieur : l’IVA est bouchée juste après la 1re diagonale. Le muscle en aval ne reçoit plus de sang : il souffre et cesse de se contracter.' },
    { d: 5.0, text: 'Coronarographie en urgence, par l’artère radiale (poignet) : une sonde guide (6 F) est placée à l’entrée de la coronaire gauche. Le produit de contraste remplit le tronc commun et la circonflexe, mais s’arrête net dans l’IVA : occlusion complète, flux TIMI 0.' },
    { d: 6.5, text: 'Dans l’artère, fendue en long : une plaque d’athérome s’est rompue. Sa chape fibreuse, très fine (moins de 65 µm), s’est déchirée sur un cœur lipidique ; un caillot (thrombus) s’y est formé et bouche la lumière. En aval, le sang ne passe plus.' },
    { d: 4.5, text: 'Un guide très fin (0,36 mm, soit 0,014 pouce) est poussé à travers le caillot, loin en aval : il servira de rail à tout le matériel.' },
    { d: 6.0, text: 'Un petit ballon (2,5 mm) est gonflé dans la lésion : il tasse le caillot et ouvre un passage. Le sang circule de nouveau en aval : c’est la reperfusion.' },
    { d: 6.5, text: 'Le stent actif (3 × 18 mm), serti sur son ballon, est placé à cheval sur la lésion, d’un segment sain à l’autre, puis déployé à environ 12 atm : son treillis métallique plaque la plaque et le caillot contre la paroi.' },
    { d: 3.5, text: 'Le ballon est dégonflé puis retiré ; le stent reste en place, appliqué contre la paroi (une post-dilatation au ballon non compliant l’y aide si besoin).' },
    { d: 5.5, text: 'Contrôle : le produit de contraste passe de nouveau jusqu’à la pointe, flux normal (TIMI 3). Le guide, puis la sonde, sont retirés.' },
    { d: 0, text: 'L’artère est rouverte : plus elle l’est tôt (moins de 120 min après le diagnostic), plus de muscle est sauvé. Le stent libère un médicament qui freine la re-sténose ; une double anti-agrégation plaquettaire (12 mois en général) le protège du caillot.' },
  ],
  stenose: [
    { d: 4.5, text: 'Angor d’effort : l’IVA proximale, avant la 1re diagonale, est rétrécie par une plaque d’athérome. Au repos le débit suffit ; à l’effort, le muscle manque d’oxygène.' },
    { d: 5.0, text: 'Coronarographie, par l’artère radiale (poignet) : la sonde guide (6 F) est à l’entrée de la coronaire gauche. Le produit de contraste remplit toute l’IVA (flux TIMI 3) mais dessine un rétrécissement serré, d’environ 75 % du diamètre.' },
    { d: 6.5, text: 'Dans l’artère, fendue en long : une plaque stable — chape fibreuse épaisse, cœur lipidique, calcifications. La paroi s’est d’abord élargie vers l’extérieur, puis la plaque a envahi la lumière ; le sang accélère dans le rétrécissement. (Rétrécissement intermédiaire : on mesure d’abord la FFR ou l’iFR.)' },
    { d: 4.5, text: 'Un guide très fin (0,36 mm, soit 0,014 pouce) franchit le rétrécissement et est poussé loin en aval : il servira de rail à tout le matériel.' },
    { d: 6.0, text: 'Prédilatation : un ballon de 2,5 mm est gonflé dans la plaque, qui se fissure et se tasse ; la lumière s’agrandit.' },
    { d: 6.5, text: 'Le stent actif (3 × 20 mm), serti sur son ballon, couvre toute la plaque, d’un segment sain à l’autre ; il est déployé à environ 12 atm.' },
    { d: 4.5, text: 'Post-dilatation : un ballon non compliant, gonflé à haute pression (≈ 18 atm), finit d’ouvrir le stent et l’applique contre la paroi (l’imagerie endocoronaire, IVUS ou OCT, le vérifie pour les lésions complexes).' },
    { d: 5.5, text: 'Contrôle : la lumière a retrouvé son calibre, le sang passe sans accélérer (TIMI 3). Le guide, puis la sonde, sont retirés.' },
    { d: 0, text: 'Le stent libère un médicament qui freine la re-sténose ; une double anti-agrégation plaquettaire (6 mois en général dans l’angor stable) le protège du caillot. Le traitement des facteurs de risque reste essentiel.' },
  ],
};

// lésions : longueur de la plaque (cm), centre (cm, depuis le repère de la lésion), sténose en diamètre, excentricité
// (épaisseur du côté opposé / côté de la plaque), remodelage (élargissement de la limitante élastique interne), chape
// (fraction de l'épaisseur de la plaque), cœur lipidique (longueur, fraction), rupture et thrombus (infarctus)
const CASES = {
  idm: { Lp: 1.15, uP: 0.05, ds: 0.5, kap: 0.25, remodel: 0.1, cap: 0.07, coreL: 0.7, coreF: 0.6, uR: -0.12, thr: [-0.2, 0.6], rb: 0.125, Ls: 1.8, Lw: 2.0, nc: false },
  stenose: { Lp: 1.5, uP: 0, ds: 0.75, kap: 0.18, remodel: 0.18, cap: 0.3, coreL: 0.75, coreF: 0.42, uR: null, thr: null, rb: 0.125, Ls: 2.0, Lw: 2.2, nc: true,
    calc: [[-0.42, 0.78, 0.11], [0.05, 0.86, 0.15], [0.46, 0.8, 0.09]] },
};
const T_INT = 0.012, T_MED = 0.02, T_ADV = 0.022; // épaisseurs normales : intima, média, adventice (cm)

// textures des tranches (dessinées une fois) : collagène, cœur lipidique, média, adventice, thrombus
function canvasTex(draw, w = 256, h = 64) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); let s = 987654321;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  draw(g, w, h, rnd);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const wavy = (g, w, y0, amp, f, ph) => { g.beginPath(); for (let x = 0; x <= w; x += 4) { const y = y0 + amp * Math.sin(x * f + ph); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
const TEXTURES = () => ({
  // collagène de la chape et de l'intima épaissie : ivoire, fibres ondulées
  fib: canvasTex((g, w, h, r) => { g.fillStyle = '#e8d6c2'; g.fillRect(0, 0, w, h); for (let k = 0; k < 30; k++) { g.strokeStyle = r() < 0.5 ? '#d2b99e' : '#f6eee2'; g.lineWidth = 0.6 + r() * 1.4; wavy(g, w, r() * h, 1.5 + r() * 2, 0.04 + r() * 0.04, r() * 6); } }),
  // cœur lipidique (nécrotique) : jaune, débris, cristaux de cholestérol en aiguilles
  core: canvasTex((g, w, h, r) => {
    g.fillStyle = '#e4bc55'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) { g.fillStyle = r() < 0.5 ? 'rgba(170,120,40,0.45)' : 'rgba(250,225,140,0.5)'; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 7, 2 + r() * 4, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,250,225,0.9)'; g.lineWidth = 1.1;
    for (let k = 0; k < 34; k++) { const x = r() * w, y = r() * h, a = r() * 3.14, l = 6 + r() * 14; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * Math.cos(a), y + l * Math.sin(a)); g.stroke(); }
  }),
  // média : cellules musculaires lisses circulaires, coupées en travers (noyaux en rangées), lames élastiques fines
  med: canvasTex((g, w, h, r) => {
    g.fillStyle = '#9c3f37'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(214,140,120,0.55)'; g.lineWidth = 0.8; for (let k = 0; k < 7; k++) wavy(g, w, (k + 0.5) * h / 7, 1, 0.08, k);
    g.fillStyle = 'rgba(70,18,22,0.75)'; for (let k = 0; k < 160; k++) { g.beginPath(); g.ellipse(r() * w, r() * h, 1.6, 0.9, 0, 0, 7); g.fill(); }
  }),
  // adventice : tissu conjonctif lâche, fibres ondulées, petits vaisseaux (vasa vasorum)
  adv: canvasTex((g, w, h, r) => {
    g.fillStyle = '#e2c4ae'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 18; k++) { g.strokeStyle = r() < 0.5 ? '#c9a084' : '#f1dccb'; g.lineWidth = 0.8 + r(); wavy(g, w, r() * h, 3 + r() * 3, 0.05 + r() * 0.05, r() * 6); }
    for (let k = 0; k < 6; k++) { const x = r() * w, y = r() * h; g.fillStyle = '#b23a36'; g.beginPath(); g.arc(x, y, 1.6 + r() * 1.4, 0, 7); g.fill(); g.strokeStyle = '#f3dccb'; g.stroke(); }
  }),
  // thrombus : globules rouges serrés et fibrine en stries claires
  thr: canvasTex((g, w, h, r) => {
    g.fillStyle = '#6f1016'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 220; k++) { g.fillStyle = r() < 0.5 ? 'rgba(150,24,32,0.8)' : 'rgba(80,8,14,0.8)'; g.beginPath(); g.arc(r() * w, r() * h, 1.5 + r() * 1.2, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(232,190,180,0.6)'; g.lineWidth = 0.9; for (let k = 0; k < 14; k++) wavy(g, w, r() * h, 4, 0.03 + r() * 0.04, r() * 6);
  }),
  // calcium : blanc crayeux, grain
  calc: canvasTex((g, w, h, r) => { g.fillStyle = '#f1efe8'; g.fillRect(0, 0, w, h); for (let k = 0; k < 200; k++) { g.fillStyle = r() < 0.5 ? 'rgba(200,198,190,0.6)' : 'rgba(255,255,255,0.8)'; g.fillRect(r() * w, r() * h, 2, 2); } }, 64, 64),
});

// grille (nu × nv sommets) à mettre à jour sur place
function grid(nu, nv, color = false) {
  const n = nu * nv, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  const idx = []; for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) { const a = i * nv + j, b = a + nv; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  g.setIndex(idx);
  return g;
}

export function createPciAnimation(heart, view, hooks) {
  let G = null, kind = 'idm', built = null, playing = false, shown = false, t = 0, step = -1, tail = -1;
  const V3 = () => new THREE.Vector3();

  /* ── ligne centrale du tronc de l'IVA (une fois) ──
     Le maillage de l'IVA réunit plusieurs pièces de BodyParts3D (tronc, diagonales, septales) : le tronc est sa plus
     grande composante connexe. On suit son axe depuis le point le plus proche de l'ostium du tronc commun, pas à pas
     (centre des sommets de l'anneau qui précède), puis on lisse ; rayon externe mesuré sur les mêmes anneaux. */
  const centerline = () => {
    const mesh = heart.registry.iva?.meshes.find((m) => m.geometry.index);
    if (!mesh || !heart.ostia?.gauche) return null;
    const pa = mesh.geometry.attributes.position, idx = mesh.geometry.index.array, n = pa.count;
    const par = new Int32Array(n).map((_, i) => i), find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (let k = 0; k < idx.length; k += 3) for (let e = 0; e < 3; e++) { const a = find(idx[k + e]), b = find(idx[k + (e + 1) % 3]); if (a !== b) par[a] = b; }
    const cnt = new Map(); for (let i = 0; i < n; i++) { const r = find(i); cnt.set(r, (cnt.get(r) || 0) + 1); }
    const big = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const T = []; for (let i = 0; i < n; i++) if (find(i) === big) T.push(V3().fromBufferAttribute(pa, i));
    const lm = heart.ostia.gauche.point, start = T.reduce((b, p) => (p.distanceTo(lm) < b.distanceTo(lm) ? p : b));
    let cur = start.clone(), dir;
    { const nb = T.filter((p) => p.distanceTo(cur) < 0.6); dir = nb.reduce((a, p) => a.add(p), V3()).multiplyScalar(1 / nb.length).sub(cur).normalize(); }
    const pts = [], rad = [];
    for (let k = 0; k < 90; k++) {
      const pred = cur.clone().addScaledVector(dir, 0.15);
      const near = T.filter((p) => p.distanceTo(pred) < 0.3 && p.clone().sub(cur).dot(dir) > 0);
      if (near.length < 4) break;
      dir.lerp(near.reduce((a, p) => a.add(p), V3()).multiplyScalar(1 / near.length).sub(cur).normalize(), 0.5).normalize();
      const ring = T.filter((p) => Math.abs(p.clone().sub(cur).dot(dir)) < 0.05 && p.distanceTo(cur) < 0.5);
      const c = ring.length > 3 ? ring.reduce((a, p) => a.add(p), V3()).multiplyScalar(1 / ring.length) : cur.clone();
      pts.push(c); rad.push(ring.length ? ring.reduce((a, p) => a + p.distanceTo(c), 0) / ring.length : 0.2);
      cur = c.clone().addScaledVector(dir, 0.12);
    }
    for (let pass = 0; pass < 6; pass++) {
      const P = pts.map((p) => p.clone()), R = rad.slice();
      for (let i = 1; i < pts.length - 1; i++) { pts[i].copy(P[i - 1]).add(P[i]).add(P[i]).add(P[i + 1]).multiplyScalar(0.25); rad[i] = (R[i - 1] + 2 * R[i] + R[i + 1]) / 4; }
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), L = curve.getLength();
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const scale = L / cum[cum.length - 1];
    const radAt = (a) => { const x = a / scale; let i = 0; while (i < cum.length - 2 && cum[i + 1] < x) i++; const f = clamp01((x - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i])); return lerp(rad[i], rad[i + 1], f); };
    const arcOf = (p) => { let b = 0, bd = 1e9; for (let k = 0; k <= 400; k++) { const d = curve.getPointAt(k / 400).distanceTo(p); if (d < bd) { bd = d; b = k; } } return (b / 400) * L; };
    return { curve, L, radAt, arcOf };
  };

  /* ── matériel et artère du gros plan, pour un cas ── */
  const build = (k) => {
    G ??= centerline();
    if (!G) return null;
    const cs = CASES[k], { curve, L } = G, U = heart.deformUniforms;
    const aL = k === 'idm' && heart.infarct?.point ? Math.min(L - 2, G.arcOf(heart.infarct.point) + 0.1) : Math.min(L - 2, 2.0);
    const a0 = Math.max(0.25, aL - 1.7), a1 = Math.min(L - 0.25, aL + 1.7), NS = 150, da = (a1 - a0) / NS;
    // repère le long de l'artère : tangente T, F vers le dehors du cœur (loin de l'axe du VG), B = T × F
    const S = Array.from({ length: NS + 1 }, (_, i) => {
      const a = a0 + i * da, P = curve.getPointAt(a / L), T = curve.getTangentAt(a / L);
      const q = P.clone().sub(U.uDB.value); q.addScaledVector(U.uDA.value, -q.dot(U.uDA.value));
      const F = q.addScaledVector(T, -q.dot(T)).normalize();
      return { a, u: a - aL, P, T, F, B: V3() };
    });
    for (let pass = 0; pass < 8; pass++) { const F0 = S.map((s) => s.F.clone()); S.forEach((s, i) => { if (i > 0 && i < NS) s.F.copy(F0[i - 1]).add(F0[i]).add(F0[i + 1]).addScaledVector(s.T, -s.F.dot(s.T)).normalize(); }); }
    S.forEach((s) => { s.B.crossVectors(s.T, s.F).normalize(); s.F.crossVectors(s.B, s.T).normalize(); });
    // calibre : rayon externe mesuré (lissé), limitante élastique interne, lumière normale
    const rO = S.map((s) => Math.min(0.235, Math.max(0.17, G.radAt(s.a))));
    const RI0 = rO.map((r) => r - T_MED - T_ADV);
    const iL = Math.round((aL + cs.uP - a0) / da), rlRef = RI0[iL] - T_INT;
    const w = S.map((s) => 1 - sm(cs.Lp * 0.22, cs.Lp * 0.5, Math.abs(s.u - cs.uP)));
    const RIpre = RI0.map((r, i) => r * (1 + cs.remodel * w[i]));
    const Hmax = (2 * (RIpre[iL] - T_INT - (1 - cs.ds) * rlRef)) / (1 + cs.kap);
    const H = w.map((x) => Hmax * x);
    const coreW = S.map((s) => 1 - sm(cs.coreL * 0.3, cs.coreL * 0.5, Math.abs(s.u - cs.uP)));
    const occ = S.map((s) => (cs.thr ? sm(cs.thr[0], cs.thr[0] + 0.12, s.u) * (1 - sm(cs.thr[1] - 0.3, cs.thr[1], s.u)) : 0));
    const rsRef = rlRef * 1.04; // stent : au calibre de l'artère saine (≈ 3 mm)
    const rsMax = cs.nc ? rsRef * 1.06 : rsRef;

    // état de la lésion : rayon imposé (ballon, stent, prédilatation) et caillot tassé (q) → cercles de chaque couche
    // (centre décalé le long de B, rayon) : lumière où passe le sang (F), surface de la plaque (L), limitantes (I, E), dehors (O)
    const st = S.map(() => ({ cF: 0, rF: 0, cL: 0, rL: 0, cW: 0, rI: 0, rE: 0, rO: 0, tP: 0, tM: 0, tt: 0, cl0: 0 }));
    const lesion = (Rimp, q) => {
      S.forEach((s, i) => {
        const tP0 = T_INT + H[i], tM0 = T_INT + cs.kap * H[i], RI = RIpre[i];
        const rl0 = RI - (tP0 + tM0) / 2, cl0 = (tM0 - tP0) / 2;
        const tt = rl0 * occ[i] * (1 - 0.88 * q);
        const rF = Math.max(rl0 - tt, Rimp[i]), rL = Math.max(rl0, rF + tt);
        const f = clamp01((rL - rl0) / Math.max(0.01, rsRef - rl0));
        const tP = tP0 * (1 - 0.6 * f), tM = tM0 * (1 - 0.6 * f), cL = cl0 * (1 - f);
        const o = st[i]; o.cl0 = cl0; o.cF = cL; o.rF = rF; o.cL = cL; o.rL = rL; o.tP = tP; o.tM = tM; o.tt = rL - rF;
        o.cW = cL + (tP - tM) / 2; o.rI = rL + (tP + tM) / 2; o.rE = o.rI + T_MED * (1 - 0.15 * f); o.rO = o.rE + T_ADV;
      });
    };
    // interpolation le long de l'artère (hors du gros plan : sur la ligne centrale, repère et calibre du bout)
    const at = (a) => { const x = (a - a0) / da, i = Math.max(0, Math.min(NS - 1, Math.floor(x))), f = x - i; return { i, f: Math.max(0, Math.min(1, f)), over: a < a0 ? a - a0 : a > a1 ? a - a1 : 0 }; };
    const frame = (a, o) => {
      const { i, f, over } = at(a), s0 = S[i], s1 = S[i + 1];
      if (over) { const x = Math.min(1, Math.max(0, a / L)); curve.getPointAt(x, o.P); curve.getTangentAt(x, o.T); }
      else { o.P.lerpVectors(s0.P, s1.P, f); o.T.lerpVectors(s0.T, s1.T, f).normalize(); }
      o.F.lerpVectors(s0.F, s1.F, f).addScaledVector(o.T, -o.F.dot(o.T)).normalize(); o.B.crossVectors(o.T, o.F).normalize();
      o.st = (key) => lerp(st[i][key], st[i + 1][key], f);
      return o;
    };
    const fr = { P: V3(), T: V3(), F: V3(), B: V3(), st: null };

    const group = new THREE.Group(); group.visible = false; heart.root.add(group);
    const tex = (built?.tex) ?? TEXTURES();
    const def = (m) => heart.addDeform(m, 0.1, 'none');
    const mesh = (geo, mat, order = 0) => { const m = new THREE.Mesh(geo, def(mat)); m.frustumCulled = false; m.renderOrder = order; group.add(m); return m; };
    const faceMat = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0, side: THREE.DoubleSide, vertexColors: true, ...extra });

    // tranches : bandes dans le plan de coupe (T, B), une par couche et par côté (+B : côté de la plaque ; −B : opposé)
    const BANDS_P = [['thr', tex.thr], ['cap', tex.fib], ['core', tex.core], ['base', tex.fib], ['med', tex.med], ['adv', tex.adv]];
    const BANDS_M = [['thr', tex.thr], ['int', tex.fib], ['med', tex.med], ['adv', tex.adv]];
    const bands = [];
    for (const [side, list] of [[1, BANDS_P], [-1, BANDS_M]]) for (const [name, map] of list) {
      if (name === 'thr' && !cs.thr) continue;
      const g = grid(NS + 1, 2, true);
      bands.push({ side, name, g, m: mesh(g, faceMat(map)) });
    }
    // limitantes élastiques interne et externe : liserés clairs, ondulés
    const laminae = [];
    for (const side of [1, -1]) for (const which of ['I', 'E']) { const g = grid(NS + 1, 2, false); laminae.push({ side, which, g, m: mesh(g, new THREE.MeshStandardMaterial({ color: 0xf3e8c8, roughness: 0.5, side: THREE.DoubleSide }), 1) }); }
    // surface de la lumière (moitié arrière) : endothélium, plus clair et jaunâtre sur la plaque ; caillot ; dehors de l'artère
    const NV = 25;
    const lumenG = grid(NS + 1, NV, true), lumenM = mesh(lumenG, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide }));
    const thrG = cs.thr ? grid(NS + 1, NV, true) : null, thrM = thrG ? mesh(thrG, new THREE.MeshStandardMaterial({ map: tex.thr, vertexColors: true, roughness: 0.55, side: THREE.DoubleSide })) : null;
    const outerG = grid(NS + 1, NV, false); mesh(outerG, new THREE.MeshStandardMaterial({ color: 0xdcb7a0, roughness: 0.7, side: THREE.DoubleSide }));
    // calcifications : plaques crayeuses dans la tranche, au fond de la plaque
    const calcs = (cs.calc ?? []).map(([u, depth, len]) => { const g = grid(13, 2, false); return { u, depth, len, g, m: mesh(g, new THREE.MeshStandardMaterial({ map: tex.calc, roughness: 0.85, side: THREE.DoubleSide }), 2) }; });

    const setV = (arr, k, v) => { arr[k * 3] = v.x; arr[k * 3 + 1] = v.y; arr[k * 3 + 2] = v.z; };
    const p = V3(), n = V3();
    const PALE = new THREE.Color(2.2, 1.9, 1.8), PALE2 = new THREE.Color(2.0, 1.8, 1.7);
    const endo = new THREE.Color(0.8, 0.4, 0.4), plq = cs.thr ? new THREE.Color(0.95, 0.8, 0.48) : new THREE.Color(0.95, 0.87, 0.72), torn = new THREE.Color(0.42, 0.1, 0.1), cc = new THREE.Color();
    const rebuild = () => {
      // bandes de la tranche : limites radiales (le long de B, depuis l'axe) de chaque couche
      for (const b of bands) {
        const pos = b.g.attributes.position.array, nor = b.g.attributes.normal.array, uv = b.g.attributes.uv.array, col = b.g.attributes.color.array;
        S.forEach((s, i) => {
          const o = st[i], sd = b.side, capF = cs.cap * (cs.uR == null ? 1 : sm(0.025, 0.07, Math.abs(s.u - cs.uR)));
          const yF = o.cF + sd * o.rF, yL = o.cL + sd * o.rL, yI = o.cW + sd * o.rI, yE = o.cW + sd * o.rE, yO = o.cW + sd * o.rO;
          const tPl = sd > 0 ? o.tP : o.tM, c1 = yL + sd * capF * tPl, c2 = c1 + sd * Math.min(cs.coreF * coreW[i], 0.88 - capF) * tPl;
          const [y0, y1] = { thr: [yF, yL], cap: [yL, c1], core: [c1, c2], base: [c2, yI], int: [yL, yI], med: [yI, yE], adv: [yE, yO] }[b.name];
          for (let j = 0; j < 2; j++) {
            const kk = i * 2 + j; p.copy(s.P).addScaledVector(s.B, j ? y1 : y0); setV(pos, kk, p); setV(nor, kk, s.F);
            uv[kk * 2] = s.a / 0.25; uv[kk * 2 + 1] = j;
            // caillot : tête blanche (plaquettes, fibrine) à la rupture, corps rouge en aval
            const white = b.name === 'thr' && cs.uR != null ? 1 - sm(0.05, 0.25, s.u - cs.uR) : 0;
            cc.setRGB(1, 1, 1).lerp(PALE, 0.55 * white); col[kk * 3] = cc.r; col[kk * 3 + 1] = cc.g; col[kk * 3 + 2] = cc.b;
          }
        });
        b.g.attributes.position.needsUpdate = b.g.attributes.uv.needsUpdate = b.g.attributes.normal.needsUpdate = b.g.attributes.color.needsUpdate = true;
        b.g.computeBoundingSphere();
      }
      for (const l of laminae) {
        const pos = l.g.attributes.position.array, nor = l.g.attributes.normal.array;
        S.forEach((s, i) => { const o = st[i], y = o.cW + l.side * (l.which === 'I' ? o.rI : o.rE) + 0.0012 * Math.sin(s.a * 260);
          for (let j = 0; j < 2; j++) { p.copy(s.P).addScaledVector(s.B, y + (j - 0.5) * 0.0026).addScaledVector(s.F, 0.0006); setV(pos, i * 2 + j, p); setV(nor, i * 2 + j, s.F); } });
        l.g.attributes.position.needsUpdate = l.g.attributes.normal.needsUpdate = true;
      }
      // surfaces de la moitié arrière (φ de 90° à 270° : F ≤ 0)
      const surf = (g, cKey, rKey, colFn, hideOut) => {
        const pos = g.attributes.position.array, nor = g.attributes.normal.array, uv = g.attributes.uv.array, col = g.attributes.color?.array;
        S.forEach((s, i) => { const o = st[i];
          let c = o[cKey], r = o[rKey]; if (hideOut && o.tt < 0.002) { c = o.cL; r = o.rL + 0.003; }
          for (let j = 0; j < NV; j++) {
            const ph = Math.PI / 2 + (j / (NV - 1)) * Math.PI, cph = Math.cos(ph), sph = Math.sin(ph), k2 = i * NV + j;
            const bump = hideOut ? 0.006 * Math.sin(s.a * 90 + j * 1.7) * Math.sin(j * 0.9 + s.a * 40) : 0;
            p.copy(s.P).addScaledVector(s.F, (r + bump) * cph).addScaledVector(s.B, c + (r + bump) * sph); setV(pos, k2, p);
            n.set(0, 0, 0).addScaledVector(s.F, -cph).addScaledVector(s.B, -sph); setV(nor, k2, n);
            uv[k2 * 2] = s.a / 0.25; uv[k2 * 2 + 1] = j / (NV - 1);
            if (col) { colFn(i, s, j, cc); col[k2 * 3] = cc.r; col[k2 * 3 + 1] = cc.g; col[k2 * 3 + 2] = cc.b; }
          } });
        for (const a of ['position', 'normal', 'uv', 'color']) if (g.attributes[a]) g.attributes[a].needsUpdate = true;
        g.computeBoundingSphere();
      };
      surf(lumenG, 'cL', 'rL', (i, s, j, c) => {
        const side = Math.max(0, Math.sin(Math.PI / 2 + (j / (NV - 1)) * Math.PI)); // plaque du côté +B
        c.copy(endo).lerp(plq, 0.75 * (H[i] / Math.max(1e-6, Hmax)) * (0.35 + 0.65 * side));
        if (cs.uR != null) c.lerp(torn, (1 - sm(0.03, 0.09, Math.abs(s.u - cs.uR))) * side);
      });
      if (thrG) surf(thrG, 'cF', 'rF', (i, s, j, c) => { const white = 1 - sm(0.05, 0.25, s.u - cs.uR); c.setRGB(1, 1, 1).lerp(PALE2, 0.5 * white); }, true);
      surf(outerG, 'cW', 'rO', null);
      for (const c of calcs) {
        const pos = c.g.attributes.position.array, nor = c.g.attributes.normal.array, uv = c.g.attributes.uv.array;
        for (let k2 = 0; k2 < 13; k2++) {
          const x = (k2 / 12) * 2 - 1, a = aL + c.u + x * c.len / 2; frame(a, fr);
          const yL = fr.st('cL') + fr.st('rL'), tP = fr.st('tP'), half = 0.22 * tP * Math.sqrt(Math.max(0, 1 - x * x)), yc = yL + c.depth * tP - 0.1 * tP;
          for (let j = 0; j < 2; j++) { p.copy(fr.P).addScaledVector(fr.B, yc + (j ? half : -half)).addScaledVector(fr.F, 0.0009); setV(pos, k2 * 2 + j, p); setV(nor, k2 * 2 + j, fr.F); uv[(k2 * 2 + j) * 2] = k2 / 12; uv[(k2 * 2 + j) * 2 + 1] = j; }
        }
        c.g.attributes.position.needsUpdate = c.g.attributes.normal.needsUpdate = c.g.attributes.uv.needsUpdate = true; c.g.computeBoundingSphere();
      }
    };

    /* ── sang : globules qui s'écoulent dans la lumière (moitié arrière), plus vite dans un rétrécissement ;
       arrêtés par l'occlusion. Produit de contraste : ils blanchissent derrière le front ── */
    const NP = 340, oct = new THREE.OctahedronGeometry(1, 0), ov = oct.attributes.position.array, nOV = ov.length / 3;
    const bloodG = new THREE.BufferGeometry();
    bloodG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * nOV * 3), 3));
    bloodG.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(NP * nOV * 3), 3));
    bloodG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NP * nOV * 3), 3));
    const bloodM = mesh(bloodG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, flatShading: false }), 3);
    let seed = 12345; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const parts = Array.from({ length: NP }, () => ({ a: 0, rho: 0, th: 0, spd: 1, rot: 0, size: 1 }));
    const blockArc = () => { for (let i = 0; i < NS; i++) if (st[i].rF < 0.012) return S[i].a; return null; };
    const spawn = (q, init) => {
      const blk = blockArc();
      q.a = init ? a0 + rnd() * ((blk ?? a1) - a0) : a0 - 0.15 - rnd() * 0.3;
      q.rho = Math.sqrt(rnd()) * 0.8; q.th = Math.PI / 2 + 0.25 + rnd() * (Math.PI - 0.5); q.spd = 0.8 + rnd() * 0.4; q.rot = rnd() * 6.28; q.size = 0.8 + rnd() * 0.4;
    };
    parts.forEach((q) => spawn(q, true));
    const red = new THREE.Color(0.6, 0.04, 0.06), white = new THREE.Color(0.93, 0.94, 0.97), m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = V3(), v = V3();
    let ctrFront = -1e9, ctrFade = 0;
    const flow = (dt) => {
      const blk = blockArc(), pos = bloodG.attributes.position.array, nor = bloodG.attributes.normal.array, col = bloodG.attributes.color.array;
      parts.forEach((q, k) => {
        frame(q.a, fr);
        const rF = Math.max(0.02, fr.st('rF')), vel = 0.9 * q.spd * Math.min(5, Math.max(0.5, (rlRef / rF) ** 2));
        let na = q.a + vel * dt;
        if (blk != null && q.a < blk && na > blk - 0.03) na = Math.max(q.a, blk - 0.03 - 0.06 * (k % 7) / 7); // amassés contre le caillot
        q.a = na; if (q.a > a1 + 0.2) spawn(q, false);
        frame(q.a, fr);
        const r = fr.st('rF') * q.rho, c = fr.st('cF');
        p.copy(fr.P).addScaledVector(fr.F, r * Math.cos(q.th)).addScaledVector(fr.B, c + r * Math.sin(q.th));
        qt.setFromAxisAngle(fr.T, q.rot); sc.set(0.021 * q.size, 0.009 * q.size, 0.021 * q.size); m4.compose(p, qt, sc); // globules figurés (bien plus gros que nature)
        const vis = q.a > a0 - 0.05 && fr.st('rF') > 0.012;
        const cw = ctrFade * (q.a < ctrFront ? 1 : 0); cc.copy(red).lerp(white, cw);
        for (let j = 0; j < nOV; j++) {
          v.set(ov[j * 3], ov[j * 3 + 1], ov[j * 3 + 2]); n.copy(v).normalize();
          if (vis) v.applyMatrix4(m4); else v.copy(fr.P);
          setV(pos, k * nOV + j, v); n.applyQuaternion(qt); setV(nor, k * nOV + j, n);
          col[(k * nOV + j) * 3] = cc.r; col[(k * nOV + j) * 3 + 1] = cc.g; col[(k * nOV + j) * 3 + 2] = cc.b;
        }
      });
      bloodG.attributes.position.needsUpdate = bloodG.attributes.normal.needsUpdate = bloodG.attributes.color.needsUpdate = true;
      bloodG.computeBoundingSphere();
    };

    /* ── guide 0,014 pouce : dans l'axe de la lumière d'origine, prolongé dans l'artère de part et d'autre ── */
    lesion(S.map(() => 0), 0);
    const wireArcs = []; for (let a = a0 - 0.8; a <= a1 + 0.5; a += 0.02) wireArcs.push(a);
    const wirePts = wireArcs.map((a) => { frame(a, fr); return fr.P.clone().addScaledVector(fr.B, fr.st('cl0')).addScaledVector(fr.F, -0.25 * fr.st('rL')); });
    const WSEG = wirePts.length - 1, WRS = 8;
    const wireG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wirePts), WSEG, 0.018, WRS, false);
    const wcol = new Float32Array(wireG.attributes.position.count * 3).fill(1); wireG.setAttribute('color', new THREE.BufferAttribute(wcol, 3));
    const wire = mesh(wireG, new THREE.MeshStandardMaterial({ color: 0x8a9099, metalness: 0.85, roughness: 0.28, vertexColors: true }), 4);
    const setWire = (tip) => {
      const kTip = Math.max(0, Math.min(WSEG, Math.round(((tip - wireArcs[0]) / (wireArcs[WSEG] - wireArcs[0])) * WSEG)));
      wire.visible = kTip > 0; wireG.setDrawRange(0, kTip * WRS * 6);
      // bout souple radio-opaque (doré) sur ≈ 3 mm
      for (let s2 = 0; s2 <= WSEG; s2++) { const gold = s2 > kTip - 15 ? 1 : 0; for (let j = 0; j <= WRS; j++) { const o = (s2 * (WRS + 1) + j) * 3; wcol[o] = gold ? 1.25 : 1; wcol[o + 1] = gold ? 1.05 : 1; wcol[o + 2] = gold ? 0.55 : 1; } }
      wireG.attributes.color.needsUpdate = true;
    };
    const wireCenter = (a) => { frame(a, fr); return fr.st('cl0'); };

    /* ── ballon (semi-compliant ou non compliant), sa tige, ses marqueurs ── */
    const NB = 56, NBV = 28;
    const balG = grid(NB, NBV, false), balM = mesh(balG, new THREE.MeshPhysicalMaterial({ color: 0xd9e7f2, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), 6);
    const shaftG = grid(30, 10, false), shaftM = mesh(shaftG, new THREE.MeshStandardMaterial({ color: 0x7fa7cf, roughness: 0.35 }), 5);
    const markG = grid(4, 14, false), markM = mesh(markG, new THREE.MeshStandardMaterial({ color: 0xd7dade, metalness: 0.9, roughness: 0.2 }), 5);
    const ballMat = balM.material, ncTint = new THREE.Color(0xf2e1c4), scTint = new THREE.Color(0xd9e7f2);
    const tubeAlong = (g, nu, nv, aS, aE, rFn, cFn, foldFn) => {
      const pos = g.attributes.position.array, nor = g.attributes.normal.array;
      for (let i = 0; i < nu; i++) {
        const a = lerp(aS, aE, i / (nu - 1)); frame(a, fr); const r = rFn(a), c = cFn(a);
        for (let j = 0; j < nv; j++) {
          const ph = (j / (nv - 1)) * Math.PI * 2, rr = foldFn ? foldFn(r, ph) : r, k2 = i * nv + j;
          n.set(0, 0, 0).addScaledVector(fr.F, Math.cos(ph)).addScaledVector(fr.B, Math.sin(ph));
          p.copy(fr.P).addScaledVector(fr.B, c).addScaledVector(n, rr); setV(pos, k2, p); setV(nor, k2, n);
        }
      }
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true; g.computeBoundingSphere();
    };
    const R_DEF = 0.034, R_SHAFT = 0.024;
    // ballon centré en aC, longueur utile Lw, gonflé à rIn (infl : 0 dégonflé, plié en trois ailes ; 1 gonflé)
    const setBalloon = (vis, aC, Lw, rIn, infl, nc = false) => {
      balM.visible = shaftM.visible = markM.visible = vis; if (!vis) return;
      ballMat.color.copy(nc ? ncTint : scTint);
      const aS = aC - Lw / 2 - 0.18, aE = aC + Lw / 2 + 0.18, rC = lerp(R_DEF, rIn, infl);
      const prof = (a) => { const e = Math.min(a - aS, aE - a); return e > 0.18 ? 1 : Math.max(0, e / 0.18); };
      const cen = (a) => lerp(wireCenter(a), (frame(a, fr), fr.st('cL')), infl);
      tubeAlong(balG, NB, NBV, aS, aE, (a) => R_SHAFT + (rC - R_SHAFT) * prof(a), cen, (r, ph) => r * (1 + 0.2 * (1 - infl) * Math.cos(3 * ph)));
      tubeAlong(shaftG, 30, 10, a0 - 0.9, aS + 0.02, () => R_SHAFT, wireCenter);
      // marqueurs radio-opaques (platine) aux deux bouts de la longueur utile, sur la tige intérieure
      const pos = markG.attributes.position.array, nor = markG.attributes.normal.array;
      [aC - Lw / 2, aC + Lw / 2].forEach((am, h2) => { for (let i = 0; i < 2; i++) { const a = am + (i - 0.5) * 0.04; frame(a, fr); const c = cen(a);
        for (let j = 0; j < 14; j++) { const ph = (j / 13) * Math.PI * 2, k2 = (h2 * 2 + i) * 14 + j; n.set(0, 0, 0).addScaledVector(fr.F, Math.cos(ph)).addScaledVector(fr.B, Math.sin(ph)); p.copy(fr.P).addScaledVector(fr.B, c).addScaledVector(n, R_SHAFT + 0.004); setV(pos, k2, p); setV(nor, k2, n); } } });
      markG.attributes.position.needsUpdate = markG.attributes.normal.needsUpdate = true; markG.computeBoundingSphere();
    };
    const balRadius = (aC, Lw, rIn, infl) => (a) => { const e = Math.min(a - (aC - Lw / 2), aC + Lw / 2 - a); return e < -0.12 ? 0 : lerp(R_DEF, rIn, infl) * (e > 0 ? 1 : 1 + e / 0.12); };

    /* ── stent : anneaux sinusoïdaux (8 sommets par anneau) reliés par trois ponts ; ses bras gardent leur longueur, les
       anneaux s'ouvrent (ils raccourcissent un peu) quand le rayon augmente ; mailles de 80 µm × 90 µm ── */
    const CROWN = 8, DTH = Math.PI / CROWN, ELL = 0.095, NR = Math.round(cs.Ls / 0.112), PITCH = cs.Ls / NR;
    const segs = [];
    for (let j = 0; j < NR; j++) for (let k2 = 0; k2 < 2 * CROWN; k2++) segs.push([j, k2, j, (k2 + 1) % (2 * CROWN), 'ring']);
    for (let j = 0; j < NR - 1; j++) for (const k2 of [1, 7, 11]) segs.push([j, k2, j + 1, k2, 'link']);
    const NSEG = segs.length, stentG = new THREE.BufferGeometry();
    stentG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NSEG * 8 * 3), 3));
    stentG.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(NSEG * 8 * 3), 3));
    { const idx = []; for (let s2 = 0; s2 < NSEG; s2++) { const o = s2 * 8; for (let f = 0; f < 4; f++) { const a = o + f, b = o + (f + 1) % 4, c = a + 4, d = b + 4; idx.push(a, b, c, b, d, c); } } stentG.setIndex(idx); }
    const stentM = mesh(stentG, new THREE.MeshStandardMaterial({ color: 0xc9cdd3, metalness: 0.92, roughness: 0.24 }), 5);
    const sp = [V3(), V3()], dd = V3(), wv = V3(), rv = V3(), cnt = V3();
    // nœud (anneau j, sommet k) du stent centré en aC, de rayon R ; centre : guide (serti) → lumière (déployé)
    const node = (aC, R, ex, j, k2, out) => {
      const amp = Math.sqrt(Math.max(1e-6, ELL * ELL - (R * DTH) ** 2)), sj = -cs.Ls / 2 + PITCH * (j + 0.5);
      const phase = (j % 2) * DTH, th = k2 * DTH + phase, s = sj + ((k2 + j) % 2 ? amp / 2 : -amp / 2);
      const a = aC + s; frame(a, fr); const c = lerp(wireCenter(a), fr.st('cL'), ex);
      out.copy(fr.P).addScaledVector(fr.B, c).addScaledVector(fr.F, R * Math.cos(th)).addScaledVector(fr.B, R * Math.sin(th));
      return out;
    };
    const setStent = (vis, aC, R, ex) => {
      stentM.visible = vis; if (!vis) return;
      const pos = stentG.attributes.position.array, nor = stentG.attributes.normal.array;
      segs.forEach(([j1, k1, j2, k2], s2) => {
        node(aC, R, ex, j1, k1, sp[0]); node(aC, R, ex, j2, k2, sp[1]);
        const aR = aC + (-cs.Ls / 2 + PITCH * (j1 + 0.5)), cR = lerp(wireCenter(aR), fr.st('cL'), ex); // repère : celui de aR
        cnt.copy(fr.P).addScaledVector(fr.B, cR);
        dd.subVectors(sp[1], sp[0]); rv.addVectors(sp[0], sp[1]).multiplyScalar(0.5).sub(cnt); rv.addScaledVector(fr.T, -rv.dot(fr.T)).normalize();
        wv.crossVectors(dd, rv).normalize();
        for (let e = 0; e < 2; e++) for (let f = 0; f < 4; f++) {
          const sw = f === 0 || f === 3 ? -1 : 1, sr = f < 2 ? -1 : 1, k3 = s2 * 8 + e * 4 + f;
          p.copy(sp[e]).addScaledVector(wv, 0.0045 * sw).addScaledVector(rv, 0.004 * sr); setV(pos, k3, p);
          n.copy(wv).multiplyScalar(sw).addScaledVector(rv, sr).normalize(); setV(nor, k3, n);
        }
      });
      stentG.attributes.position.needsUpdate = stentG.attributes.normal.needsUpdate = true; stentG.computeBoundingSphere();
    };

    /* ── noms (gros plan) ── */
    const label = (text, cls, anchor) => ({ o: hooks.label(text, cls), anchor });
    const ptAt = (u, yFn, fOff = 0.012) => () => { frame(aL + u, fr); return fr.P.clone().addScaledVector(fr.B, yFn()).addScaledVector(fr.F, fOff); };
    const Y = (key, side) => () => fr.st(key.c) + side * fr.st(key.r);
    const mid = (k1, k2, side) => () => (Y(k1, side)() + Y(k2, side)()) / 2;
    const KL = { c: 'cL', r: 'rL' }, KI = { c: 'cW', r: 'rI' }, KE = { c: 'cW', r: 'rE' }, KO = { c: 'cW', r: 'rO' };
    const anat = [
      label('Lumière', '', ptAt(-0.85, () => fr.st('cF'), -0.05)),
      label('Intima', '', ptAt(-1.05, mid(KL, KI, -1))), label('Média', '', ptAt(-0.8, mid(KI, KE, -1))), label('Adventice', '', ptAt(-0.55, mid(KE, KO, -1))),
      label('Chape fibreuse', '', ptAt(cs.uP - 0.38, () => Y(KL, 1)() + cs.cap * fr.st('tP') * 0.5)),
      label('Cœur lipidique', '', ptAt(cs.uP + 0.12, () => Y(KL, 1)() + (cs.cap + 0.25) * fr.st('tP'))),
      ...(cs.thr ? [label('Rupture de plaque', 'struct', ptAt(cs.uR, () => Y(KL, 1)())), label('Thrombus', 'struct', ptAt(0.3, () => fr.st('cL')))]
        : [label('Calcifications', '', ptAt(cs.calc[1][0], () => Y(KL, 1)() + 0.75 * fr.st('tP'))), label('Rétrécissement', 'struct', ptAt(cs.uP, () => fr.st('cF')))]),
    ];
    const devLabels = { wire: label('Guide 0,014″', '', () => null), bal: label('Ballon', '', () => null), stent: label('Stent actif', '', () => null), heart: label(cs.thr ? 'Occlusion de l’IVA' : 'Rétrécissement de l’IVA', 'struct', () => { frame(aL, fr); return fr.P.clone().addScaledVector(fr.F, 0.3); }) };
    const allLabels = [...anat, ...Object.values(devLabels)];

    // effacement de l'IVA du modèle sous le gros plan (bouts : le maillage d'origine recouvre l'artère fendue)
    const cutPts = Array.from({ length: 14 }, (_, i) => curve.getPointAt(lerp(a0 + 0.28, a1 - 0.28, i / 13) / L));
    const cutR = Math.max(...rO) + 0.03;
    return { k, cs, group, S, st, aL, a0, a1, NS, frame, fr, lesion, rebuild, flow, setWire, setBalloon, balRadius, setStent, rsRef, rsMax, rlRef, anat, devLabels, allLabels,
      cutPts, cutR, tex, setCtr: (front, fade) => { ctrFront = front; ctrFade = fade; } };
  };

  // état de la scène au temps t
  let sig = '';
  const pose = (dt) => {
    const b = built, cs = b.cs, steps = PCI_STEPS[kind], starts = [];
    let acc = 0; for (const s of steps) { starts.push(acc); acc += s.d; }
    const k = Math.max(0, starts.findLastIndex((s0) => t >= s0));
    const tau = (i) => t - starts[i], ph = (i, a, d) => ease((tau(i) - a) / d);
    const aT = b.aL + cs.uP; // centre de la lésion
    // gros plan : du cœur entier à l'artère (étape 2), retour au cœur (fin de l'étape 7)
    zoom = k < 2 ? 0 : k < 7 ? ph(2, 0, 2.2) : k === 7 ? 1 - ph(7, 3.4, 2.0) : 0;
    b.group.visible = zoom > 0.02;
    heart.setPciCut(zoom > 0.02 ? b.cutPts : null, b.cutR);
    // coronarographie (cœur entier) : front du produit de contraste depuis l'ostium du tronc commun
    if (k === 1) heart.setContrast(10 * ph(1, 0.6, 3.2), true);
    else if (k === 2) heart.setContrast(10, tau(2) < 1.2);
    else if (k === 7 && tau(7) > 3.6) heart.setContrast(12 * ph(7, 3.6, 1.8), true);
    else if (k === 8) heart.setContrast(12, true);
    else heart.setContrast(0, false);
    // infarctus : reperfusion (le sang revient en aval) quand le ballon de prédilatation se dégonfle
    if (kind === 'idm') { const oc = !(k > 4 || (k === 4 && tau(4) > 3.9)); if (oc !== lastOccl) { lastOccl = oc; heart.setInfarct(true, { tint: true, occl: oc }); } }
    // guide : poussé (étape 3), retiré (étape 7)
    const tip = k < 3 ? b.a0 - 1 : k === 3 ? lerp(b.a0 - 0.7, b.a1 + 0.35, ph(3, 0.3, 3.8)) : k < 7 ? b.a1 + 0.35 : k === 7 ? lerp(b.a1 + 0.35, b.a0 - 0.8, ph(7, 1.8, 1.5)) : b.a0 - 1;
    b.setWire(tip);
    // ballons et stent
    let bal = null, stR = 0, stEx = 0, stA = aT, stVis = false, q = 0, Rperm = 0;
    const pre = { Lw: 1.2, r: cs.rb };
    if (k === 4) {
      const aC = lerp(b.a0 - 1.3, aT, ph(4, 0, 1.6)) - 2.5 * ph(4, 4.7, 1.2), infl = ph(4, 1.8, 1.0) * (1 - ph(4, 3.8, 0.8));
      bal = { aC, Lw: pre.Lw, r: pre.r, infl, nc: false };
      q = 0.7 * ph(4, 1.8, 1.0); Rperm = tau(4) > 3.8 ? 1 : 0;
    }
    if (k > 4) { q = 0.7; Rperm = 1; }
    if (k === 5) {
      const aC = lerp(b.a0 - 1.6, aT, ph(5, 0, 2.0)), infl = ph(5, 2.4, 1.8) * (1 - ph(5, 4.8, 0.8));
      bal = { aC, Lw: cs.Lw, r: b.rsRef - 0.006, infl, nc: false };
      stVis = true; stA = aC; stEx = ph(5, 2.4, 1.8); stR = lerp(R_CRIMP, b.rsRef, stEx);
      q = 0.7 + 0.3 * ph(5, 2.4, 1.8);
    }
    if (k > 5) { q = 1; stVis = true; stEx = 1; stR = b.rsRef; }
    if (k === 6) {
      if (cs.nc) {
        const aC = lerp(b.a0 - 1.4, aT, ph(6, 0, 1.2)) - 2.5 * ph(6, 3.6, 0.9), infl = ph(6, 1.4, 1.0) * (1 - ph(6, 3.0, 0.6));
        bal = { aC, Lw: 1.2, r: b.rsMax * 1.02, infl, nc: true };
        stR = lerp(b.rsRef, b.rsMax, ph(6, 1.4, 1.0));
      } else bal = { aC: aT - 2.6 * ph(6, 0.2, 1.8), Lw: cs.Lw, r: b.rsRef - 0.006, infl: 0, nc: false };
    }
    if (k > 6) stR = b.rsMax;
    if (bal && bal.aC + bal.Lw / 2 < b.a0 - 0.25) bal = null;
    b.setBalloon(!!bal, bal?.aC ?? 0, bal?.Lw ?? 1, bal?.r ?? 0.1, bal?.infl ?? 0, bal?.nc);
    b.setStent(stVis && zoom > 0.02, stA, stR, stEx);
    // lumière imposée : ballon gonflé, prédilatation (retour élastique ≈ 25 %), stent déployé
    const bR = bal ? b.balRadius(bal.aC, bal.Lw, bal.r, bal.infl) : null;
    const preR = b.balRadius(aT, pre.Lw, pre.r * 0.78, 1);
    const sR = stEx > 0 ? b.balRadius(stA, cs.Ls, stR, 1) : null;
    const Rimp = b.S.map((s) => Math.max(bR ? bR(s.a) : 0, Rperm ? preR(s.a) : 0, sR ? sR(s.a) : 0));
    const sg = Rimp.reduce((x, r) => x + r, 0).toFixed(4) + '|' + q.toFixed(3);
    if (sg !== sig) { sig = sg; b.lesion(Rimp, q); b.rebuild(); }
    // produit de contraste dans le gros plan (contrôle, étape 7)
    b.setCtr(k === 7 ? lerp(b.a0, b.a1 + 0.6, ph(7, 0, 1.6)) : -1e9, k === 7 ? 1 - ph(7, 1.8, 0.8) : 0);
    if (b.group.visible) b.flow(dt);
    // noms : anatomie (étape 2), matériel (étapes 3 à 6), lésion sur le cœur entier (étapes 0 et 1)
    const showAnat = k === 2 && tau(2) > 2.4;
    b.anat.forEach((l) => { l.on = showAnat; });
    b.devLabels.heart.on = k <= 1 && tau(k) > 0.6;
    b.devLabels.wire.on = k === 3 && tau(3) > 1.2; b.devLabels.wire.anchor = () => { b.frame(Math.min(tip - 0.25, b.a1 - 0.2), b.fr); return b.fr.P.clone().addScaledVector(b.fr.F, 0.03); };
    b.devLabels.bal.on = !!bal && bal.aC > b.a0 && (k === 4 || (k === 6 && cs.nc)); b.devLabels.bal.o.element.textContent = bal?.nc ? 'Ballon non compliant' : 'Ballon';
    b.devLabels.bal.anchor = () => { b.frame(bal.aC, b.fr); return b.fr.P.clone().addScaledVector(b.fr.B, -(bal.r + 0.05)).addScaledVector(b.fr.F, 0.02); };
    b.devLabels.stent.on = k === 5 && tau(5) > 0.8;
    b.devLabels.stent.anchor = () => { b.frame(stA - 0.35, b.fr); return b.fr.P.clone().addScaledVector(b.fr.B, stR + 0.06).addScaledVector(b.fr.F, 0.02); };
    return k;
  };
  const R_CRIMP = 0.046;
  let lastOccl = null;
  let zoom = 0;
  const _p = new THREE.Vector3();
  const syncLabels = () => {
    if (!built) return;
    for (const l of built.allLabels) {
      const on = !!l.on && shown && built.group.visible === (l !== built.devLabels.heart) ;
      const pos = on ? l.anchor() : null;
      l.o.visible = !!(on && pos);
      if (pos) l.o.position.copy(heart.deformPoint(_p.copy(pos)));
    }
  };
  // cadrage : cœur entier (vue Coronaires) ↔ gros plan sur la lésion (l'artère à l'horizontale, l'amont à gauche)
  const _q = new THREE.Quaternion(), _c = new THREE.Vector3();
  const frameAt = () => {
    const h = view.sides.C, b = built;
    if (!b || zoom <= 0) return { center: h.center.clone(), dir: h.camDir.clone(), dist: h.dist, up: h.up.clone() };
    b.frame(b.aL + b.cs.uP, b.fr);
    const c1 = heart.deformPoint(_c.copy(b.fr.P)).clone(), d1 = b.fr.F.clone(), u1 = b.fr.B.clone().negate();
    const z = ease(zoom), dist1 = 2.35;
    _q.setFromUnitVectors(h.camDir.clone().normalize(), d1);
    const dir = h.camDir.clone().normalize().applyQuaternion(new THREE.Quaternion().slerp(_q, z));
    return { center: h.center.clone().lerp(c1, z), dir, dist: h.dist * Math.pow(dist1 / h.dist, z), up: h.up.clone().lerp(u1, z).normalize() };
  };
  const finishView = () => { heart.setPciCut(null); if (built) { built.group.visible = false; } };
  const api = {
    get playing() { return playing; },
    get shown() { return shown; },
    get step() { return step; },
    get kind() { return kind; },
    get steps() { return PCI_STEPS[kind]; },
    get zoom() { return zoom; },
    parts: () => built, // essais : matériel construit
    prepare(k2 = kind) { if (!built || built.k !== k2) { if (built) { built.group.removeFromParent(); built.allLabels.forEach((l) => { l.o.visible = false; }); } built = build(k2); sig = ''; } },
    play(k2) {
      kind = k2; api.prepare(k2);
      if (!built) return;
      t = 0; step = -1; playing = true; shown = true; tail = -1; zoom = 0; lastOccl = null;
      pose(0); syncLabels();
      hooks.caption(0, PCI_STEPS[kind][0].text);
    },
    stop() {
      playing = false; shown = false; step = -1; tail = -1; zoom = 0;
      if (built) built.allLabels.forEach((l) => { l.o.visible = false; });
      finishView(); heart.setContrast(0, false);
      hooks.caption(-1, '');
    },
    frame: () => frameAt(),
    // coupe du gros plan : plan face au regard, à la profondeur de l'axe de l'artère là où il est le plus enfoui sur le
    // segment montré (l'IVA suit la convexité du cœur : ailleurs, elle passe devant le plan) ; il vient de loin devant
    // pendant que la caméra s'approche. Dans le modèle, l'IVA est à moitié enchâssée dans le myocarde : la coupe montre le
    // muscle autour de l'artère fendue, qui repose dans son sillon
    cut() {
      if (!built || !shown || zoom <= 0) return null;
      const b = built; b.frame(b.aL + b.cs.uP, b.fr);
      const F = b.fr.F.clone(); let d = Infinity;
      for (let u = -1.4; u <= 1.41; u += 0.1) { b.frame(b.aL + b.cs.uP + u, b.fr); d = Math.min(d, F.dot(heart.deformPoint(_c.copy(b.fr.P)))); }
      return { normal: F.negate(), depth: d - 0.02 + 25 * (1 - ease(zoom)) ** 2 };
    },
    seek(x) { if (!playing) return; t = x - 1e-3; api.update(1e-3); },
    update(dt) {
      if (tail >= 0) { tail += dt; if (tail > 4) heart.setContrast(12, false); if (tail > 12) { tail = -1; if (!playing) hooks.caption(-1, ''); } }
      if (!playing) return;
      t += dt;
      const k = pose(dt);
      syncLabels();
      if (k !== step) {
        step = k; hooks.caption(k, PCI_STEPS[kind][k].text);
        if (k === PCI_STEPS[kind].length - 1) { playing = false; tail = 0; finishView(); built.allLabels.forEach((l) => { l.o.visible = false; }); hooks.finish(); }
      }
    },
  };
  return api;
}
