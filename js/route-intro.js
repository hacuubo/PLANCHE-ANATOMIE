// Première partie des animations de pose de dispositifs (TAVI, fermeture du FOP, stimulateur) : le trajet, du point de
// ponction au cœur, sur une planche du corps entier — grande circulation seule (artères en rouge, veines en bleu, pas
// de circulation pulmonaire), cœur immobile. L'aiguille ponctionne le vaisseau, le dispositif le remonte jusqu'au cœur,
// la vue suit sa progression puis plonge sur le cœur ; la planche s'efface sur la deuxième partie (animation 3D).
//
// Planche vectorielle (SVG), dessinée ici : vue de face, côté droit du patient à gauche de l'écran. Repère : 1000
// unités de haut (≈ 5,5 unités par cm), axe du corps en x = 200. Chaque vaisseau est une ligne centrale lissée
// (Catmull-Rom) dont la largeur varie le long du trajet ; les membres et les vaisseaux symétriques sont décrits à
// droite et reportés à gauche. Le trajet du dispositif suit les lignes centrales de ces vaisseaux.
//   TAVI      artère fémorale droite → iliaque commune → aorte abdominale puis thoracique → crosse → valve aortique ;
//   FOP       veine fémorale droite → iliaque commune → veine cave inférieure → oreillette droite ;
//   pacemaker veine sous-clavière gauche → tronc veineux brachiocéphalique gauche → veine cave supérieure → oreillette.

const NS = 'http://www.w3.org/2000/svg';
const MID = 200;
const mirror = (pts) => pts.map(([x, ...r]) => [2 * MID - x, ...r]);

// Ligne centrale lissée : Catmull-Rom sur toutes les composantes (x, y, largeur), n points par segment
function spline(P, closed = false, n = 10) {
  const N = P.length, at = (i) => (closed ? P[(i + N) % N] : P[Math.max(0, Math.min(N - 1, i))]), out = [];
  for (let i = 0; i < (closed ? N : N - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, j) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  if (!closed) out.push(P[N - 1].slice());
  return out;
}
const f1 = (v) => Math.round(v * 10) / 10;
// Tube de largeur variable : contour (deux bords décalés de ± w/2, bouts arrondis), décalé de shift·w (reflet)
function tube(P, scale = 1, shift = 0) {
  const S = spline(P, false, 8), L = [], R = [];
  let tx = 0, ty = 0;
  for (let i = 0; i < S.length; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    tx = dx / d; ty = dy / d;
    const w = S[i][2] * scale / 2, nx = -ty, ny = tx, cx = S[i][0] + nx * S[i][2] * shift, cy = S[i][1] + ny * S[i][2] * shift;
    L.push([cx + nx * w, cy + ny * w]); R.push([cx - nx * w, cy - ny * w]);
    if (i === 0) S.t0 = [tx, ty];
  }
  const k0 = S[0][2] * scale * 0.66, k1 = S[S.length - 1][2] * scale * 0.66, [ux, uy] = S.t0, e = L.length - 1;
  const p = (q) => `${f1(q[0])} ${f1(q[1])}`;
  return `M${p(L[0])}L${L.slice(1).map(p).join('L')}C${p([L[e][0] + tx * k1, L[e][1] + ty * k1])} ${p([R[e][0] + tx * k1, R[e][1] + ty * k1])} ${p(R[e])}`
    + `L${R.slice(0, -1).reverse().map(p).join('L')}C${p([R[0][0] - ux * k0, R[0][1] - uy * k0])} ${p([L[0][0] - ux * k0, L[0][1] - uy * k0])} ${p(L[0])}Z`;
}
const closedPath = (P) => { const S = spline(P, true, 10); return `M${S.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}Z`; };

/* ── Corps (côté droit du patient, reporté à gauche) ── */
const TORSO_R = [[200, 180], [182, 182], [160, 187], [136, 191], [116, 195], [103, 203], [98, 218], [104, 236], [118, 256], [126, 290], [131, 330], [134, 370],
  [132, 400], [128, 432], [127, 462], [131, 490], [144, 514], [166, 532], [188, 542], [200, 544]];
const TORSO = [...TORSO_R, ...mirror(TORSO_R).reverse().slice(1, -1)];
const LIMBS_R = [
  [[200, 126, 50], [200, 160, 52], [200, 190, 64]], // cou (axial)
  [[110, 206, 40], [104, 250, 36], [98, 300, 32], [93, 350, 28], [91, 386, 26], [88, 430, 25], [84, 480, 21], [81, 518, 18]], // bras, avant-bras
  [[81, 514, 18], [80, 540, 22], [79, 565, 21], [78, 590, 15], [78, 600, 9]], // main
  [[75, 526, 9], [68, 550, 8], [65, 566, 6]], // pouce (en dehors : paume en avant)
  [[163, 505, 74], [163, 560, 68], [164, 620, 58], [165, 680, 46], [166, 722, 40], [166, 760, 42], [167, 800, 40], [169, 860, 30], [171, 905, 22], [172, 935, 20]], // jambe
  [[172, 930, 21], [171, 952, 25], [168, 971, 22], [166, 981, 13]], // pied
];
// repères discrets : clavicules, ligaments inguinaux
const HINTS_R = [
  [[194, 187], [176, 187], [152, 190], [128, 193], [110, 199]],
  [[137, 470], [150, 486], [168, 502], [190, 517]],
];

/* ── Artères ── (x, y, largeur) */
const ART_C = [ // tronc et branches de la crosse (asymétriques)
  [[204, 250, 8], [203, 230, 8], [205, 216, 7.8], [212, 208, 7.6], [220, 211, 7.4], [224, 221, 7.2], [223, 240, 7], [221, 270, 6.8], [216, 300, 6.5], [211, 330, 6.2], [209, 360, 6], [208, 386, 5.7], [207, 412, 5.4]], // aorte
  [[208, 208, 5], [200, 197, 4.8], [194, 186, 4.5]], // tronc artériel brachiocéphalique
  [[194, 186, 4], [188, 168, 3.6], [184, 158, 3.4]], // carotide commune droite
  [[213, 206, 4], [215, 188, 3.8], [216, 168, 3.6], [216, 158, 3.4]], // carotide commune gauche
  [[194, 186, 4.2], [178, 188, 4], [160, 190, 3.8], [140, 193, 3.6], [124, 199, 3.4], [112, 210, 3.2]], // sous-clavière droite
  [[218, 207, 4.2], [226, 195, 4], [240, 191, 3.8], [260, 190, 3.6], [276, 193, 3.4], [288, 210, 3.2]], // sous-clavière gauche
  [[208, 356, 3], [196, 358, 2.8], [184, 361, 2.5]], [[209, 354, 3], [222, 355, 2.8], [234, 359, 2.5]], // rénales
  [[207, 412, 5], [197, 428, 4.7], [188, 444, 4.5], [182, 458, 4.3]], // iliaque commune droite
  [[207, 412, 5], [212, 428, 4.7], [216, 444, 4.5], [218, 458, 4.3]], // iliaque commune gauche
];
const ART_R = [ // de chaque côté
  [[184, 158, 3], [185, 140, 2.8], [186, 124, 2.5]], // carotide interne
  [[184, 158, 2.8], [180, 144, 2.5], [176, 128, 2.2], [171, 108, 1.8], [167, 86, 1.4], [166, 62, 1.1]], // carotide externe, temporale superficielle
  [[167, 88, 1.2], [174, 64, 1], [182, 46, 0.8]],
  [[181, 148, 1.8], [177, 139, 1.6], [178, 129, 1.4], [183, 120, 1.2], [188, 113, 1]], // faciale
  [[112, 210, 3.2], [110, 240, 3.1], [107, 280, 2.9], [103, 320, 2.8], [100, 355, 2.7], [97, 385, 2.6]], // axillaire, humérale
  [[97, 385, 2.4], [90, 420, 2.2], [84, 460, 2], [79, 500, 1.8], [76, 522, 1.5]], // radiale
  [[97, 386, 2.4], [96, 420, 2.2], [93, 460, 2], [89, 500, 1.8], [87, 524, 1.5]], // ulnaire
  [[76, 522, 1.3], [78, 536, 1.2], [84, 539, 1.2], [87, 524, 1.3]], // arcade palmaire
  [[78, 537, 1], [75, 565, 0.8], [75, 585, 0.6]], [[81, 539, 1], [80, 570, 0.8], [79, 592, 0.6]], [[85, 537, 1], [84, 565, 0.8], [83, 585, 0.6]],
  [[183, 456, 3], [188, 472, 2.6], [192, 486, 2.2], [193, 498, 1.8]], // iliaque interne
  [[182, 458, 4.2], [176, 478, 4.1], [170, 498, 4], [167, 520, 3.9], [166, 545, 3.7], [166, 590, 3.5], [167, 640, 3.3], [169, 690, 3.1], [168, 722, 3], [167, 752, 2.8]], // iliaque externe, fémorale, poplitée
  [[166, 550, 2.8], [158, 575, 2.4], [154, 615, 2], [153, 655, 1.5]], // fémorale profonde
  [[167, 752, 2.4], [161, 775, 2.2], [159, 830, 2], [162, 890, 1.8], [166, 930, 1.6], [166, 962, 1.2], [166, 976, 0.9]], // tibiale antérieure, pédieuse
  [[168, 754, 2.4], [172, 800, 2.2], [175, 860, 2], [177, 925, 1.7], [175, 955, 1.2]], // tibiale postérieure
  [[168, 770, 1.8], [169, 830, 1.6], [170, 890, 1.3]], // fibulaire
];

/* ── Veines ── */
const VEIN_C = [
  [[195, 244, 7], [194, 226, 7], [193, 208, 6.8]], // veine cave supérieure
  [[196, 288, 7.2], [195, 310, 7.2], [194, 340, 7], [194, 375, 6.8], [195, 416, 6.4]], // veine cave inférieure
  [[195, 416, 5.4], [188, 432, 5.2], [181, 446, 5], [176, 460, 4.8]], // iliaque commune droite
  [[195, 416, 5.4], [206, 430, 5.2], [217, 446, 5], [224, 460, 4.8]], // iliaque commune gauche
];
// devant les artères : troncs brachiocéphaliques (devant les branches de la crosse), veines rénales (la gauche passe devant
// l'aorte), veines sous-clavières (en avant des artères)
const VEIN_TOP = [
  [[193, 208, 5.4], [189, 197, 5.2], [185, 189, 5]], // tronc brachiocéphalique droit
  [[193, 208, 5.4], [202, 203, 5.2], [210, 195, 5], [215, 189, 5]], // tronc brachiocéphalique gauche (plus long, oblique)
  [[194, 360, 3.2], [184, 362, 3], [175, 365, 2.8]], [[195, 358, 3.2], [208, 356, 3.1], [222, 357, 2.9], [236, 361, 2.7]], // rénales
];
const VEIN_TOP_R = [[[185, 189, 4.6], [168, 192, 4.4], [150, 196, 4.2], [134, 200, 4], [122, 208, 3.8], [115, 216, 3.6]]]; // sous-clavière, axillaire
const VEIN_R = [
  [[185, 189, 4.8], [181, 172, 4.4], [178, 154, 4], [176, 136, 3.5], [175, 120, 3]], // jugulaire interne
  [[170, 192, 2.2], [167, 172, 2], [164, 152, 1.8], [163, 132, 1.5], [164, 114, 1.2]], // jugulaire externe
  [[115, 216, 3.6], [113, 245, 3.4], [110, 285, 3.2], [106, 325, 3], [103, 355, 2.8], [101, 388, 2.6], [98, 425, 2.3], [93, 465, 2], [89, 505, 1.8]], // basilique
  [[136, 200, 2.6], [122, 212, 2.6], [108, 226, 2.5], [96, 250, 2.4], [91, 290, 2.3], [87, 330, 2.2], [84, 370, 2.1], [80, 410, 2], [78, 450, 1.8], [75, 490, 1.6], [74, 515, 1.3]], // céphalique
  [[86, 372, 1.8], [94, 380, 1.7], [101, 389, 1.7]], // médiane du coude
  [[75, 520, 1.3], [76, 540, 1.1], [75, 565, 0.9]], [[82, 522, 1.3], [82, 548, 1.1], [81, 575, 0.9]], [[88, 520, 1.2], [86, 545, 1], [85, 568, 0.8]],
  [[176, 460, 4.8], [174, 480, 4.7], [173, 500, 4.6], [173, 522, 4.5], [174, 548, 4.3], [175, 600, 4], [175, 650, 3.7], [174, 695, 3.4], [172, 725, 3.1], [171, 752, 2.9]], // iliaque externe, fémorale, poplitée
  [[174, 540, 2.6], [181, 575, 2.5], [186, 630, 2.4], [184, 690, 2.3], [181, 730, 2.2], [181, 790, 2.1], [179, 860, 1.9], [178, 915, 1.7], [173, 945, 1.4], [168, 962, 1.2]], // grande saphène
  [[171, 752, 2.4], [174, 800, 2.2], [178, 860, 2], [180, 925, 1.7]], // tibiales postérieures
  [[170, 754, 2.2], [164, 778, 2], [162, 835, 1.8], [164, 895, 1.6], [168, 935, 1.4]], // tibiales antérieures
  [[160, 958, 1.3], [168, 965, 1.3], [177, 958, 1.3]], // arcade veineuse du pied
];

/* ── Cœur (vue de face : ventricule droit en avant, oreillette droite au bord droit, pointe en bas à gauche) ── */
const HEART = [[196, 234], [186, 242], [182, 256], [182, 272], [187, 286], [198, 293], [214, 296], [230, 295], [243, 290], [249, 282], [249, 268], [244, 254], [236, 243], [226, 236], [212, 233]];
const HEART_RA = [[196, 234], [186, 242], [182, 256], [182, 272], [187, 286], [196, 291], [199, 276], [199, 252], [201, 238]];
const HEART_C = [214, 263];

/* ── Trajets ── */
export const ROUTES = {
  tavi: {
    pts: [[167, 527], [167, 520], [170, 498], [176, 478], [182, 458], [188, 444], [197, 428], [207, 412], [208, 386], [209, 360], [211, 330], [216, 300], [221, 270], [223, 240], [224, 221], [220, 211], [212, 208], [205, 216], [203, 230], [204, 248]],
    dur: 6.6, color: '#3a414b', width: 2.4, side: -1, needle: [-12, 34],
    label: ['Ponction', 'artère fémorale droite'],
    text: ['Ponction de l’artère fémorale droite, au pli de l’aine.', 'Le guide remonte l’artère iliaque, l’aorte abdominale puis thoracique, passe la crosse et descend vers la valve aortique.'],
    zoom: [720, 330],
  },
  fop: {
    pts: [[173, 529], [173, 522], [173, 500], [174, 480], [176, 460], [181, 446], [188, 432], [195, 416], [194, 375], [194, 340], [195, 310], [196, 288], [196, 274]],
    dur: 4.8, color: '#2c62d3', width: 3.6, side: -1, needle: [-12, 34],
    label: ['Ponction', 'veine fémorale droite'],
    text: ['Ponction de la veine fémorale droite, au pli de l’aine.', 'La gaine remonte la veine iliaque puis la veine cave inférieure jusqu’à l’oreillette droite.'],
    zoom: [720, 330],
  },
  pm: {
    pts: [[258, 198], [250, 196], [232, 192], [215, 189], [210, 195], [202, 203], [193, 208], [194, 226], [195, 244], [196, 256]],
    dur: 3.4, color: '#2c3a6b', width: 3.6, side: 1, needle: [16, 28],
    label: ['Ponction', 'veine sous-clavière gauche'],
    text: ['Ponction de la veine sous-clavière gauche, sous la clavicule.', 'La sonde, dans sa gaine, rejoint le tronc veineux brachiocéphalique gauche puis la veine cave supérieure jusqu’à l’oreillette droite.'],
    zoom: [420, 210],
  },
};

const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent?.appendChild(e); return e; };
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

function buildPlate(svg) {
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <radialGradient id="ri-skin" cx="200" cy="330" r="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fbeae0"/><stop offset=".55" stop-color="#f3d8c8"/><stop offset="1" stop-color="#e6bfab"/></radialGradient>
    <radialGradient id="ri-heart" cx="206" cy="252" r="62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d4615a"/><stop offset=".6" stop-color="#a8353a"/><stop offset="1" stop-color="#7a1f27"/></radialGradient>
    <radialGradient id="ri-ra" cx="190" cy="258" r="34" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9e4a63"/><stop offset="1" stop-color="#6a2a44"/></radialGradient>
    <filter id="ri-shadow" x="-20%" y="-10%" width="140%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#2a3550" flood-opacity=".16"/></filter>
    <filter id="ri-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
  const body = el('g', { id: 'ri-body' }, defs);
  el('path', { d: closedPath(TORSO) }, body);
  el('ellipse', { cx: MID, cy: 84, rx: 46, ry: 60 }, body);
  for (const l of [...LIMBS_R, ...LIMBS_R.slice(1).map(mirror)]) el('path', { d: tube(l) }, body);
  // silhouette : contour (formes tracées plus larges, dessous) puis remplissage
  el('use', { href: '#ri-body', fill: '#d7ae9a', stroke: '#d7ae9a', 'stroke-width': 3, filter: 'url(#ri-shadow)' }, svg);
  el('use', { href: '#ri-body', fill: 'url(#ri-skin)' }, svg);
  const hints = el('g', { fill: 'none', stroke: '#dcb6a4', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.8 }, svg);
  for (const h of [...HINTS_R, ...HINTS_R.map(mirror)]) el('path', { d: `M${spline(h, false, 8).map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}` }, hints);
  el('circle', { cx: MID, cy: 410, r: 2.2, fill: '#d9b09d' }, svg); // ombilic
  // vaisseaux : corps, reflet ; veines dessous, artères dessus
  const vessels = (list, fill, edge, shine) => {
    const g = el('g', {}, svg);
    for (const v of list) el('path', { d: tube(v), fill, stroke: edge, 'stroke-width': 0.5 }, g);
    for (const v of list) if (v[0][2] > 1.6) el('path', { d: tube(v, 0.3, -0.18), fill: shine, opacity: 0.5 }, g);
    return g;
  };
  vessels([...VEIN_C, ...VEIN_R, ...VEIN_R.map(mirror)], '#3e519e', '#2e3d7a', '#93a6e6');
  vessels([...ART_C, ...ART_R, ...ART_R.map(mirror)], '#c43a33', '#962a27', '#f19a8e');
  vessels([...VEIN_TOP, ...VEIN_TOP_R, ...VEIN_TOP_R.map(mirror)], '#3e519e', '#2e3d7a', '#93a6e6');
  const device = el('g', {}, svg); // sous le cœur : le dispositif y entre
  // cœur
  const heart = el('g', {}, svg);
  el('path', { d: closedPath(HEART), fill: 'url(#ri-heart)', stroke: '#6a1a22', 'stroke-width': 0.8 }, heart);
  el('path', { d: closedPath(HEART_RA), fill: 'url(#ri-ra)', opacity: 0.9 }, heart);
  el('ellipse', { cx: 241, cy: 247, rx: 7, ry: 4.4, transform: 'rotate(32 241 247)', fill: '#8a2b36' }, heart); // auricule gauche
  for (const g of [[[201, 236], [199, 252], [198, 270], [199, 286], [205, 293]], [[220, 236], [222, 252], [228, 270], [238, 286], [244, 290]]]) {
    const d = `M${spline(g, false, 8).map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}`;
    el('path', { d, fill: 'none', stroke: '#e6c98f', 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.75 }, heart); // graisse des sillons
    el('path', { d, fill: 'none', stroke: '#c8443d', 'stroke-width': 0.8, 'stroke-linecap': 'round' }, heart); // coronaires
  }
  el('ellipse', { cx: 214, cy: 254, rx: 16, ry: 9, fill: '#fff', opacity: 0.18, filter: 'url(#ri-glow)' }, heart);
  const fx = el('g', {}, svg); // aiguille, point de ponction, bout du dispositif, étiquette
  return { device, fx };
}

export function createRouteIntro(host, hooks = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'route-intro hidden';
  wrap.innerHTML = '<div class="ri-legend"><span class="ri-a">Artères</span><span class="ri-v">Veines</span></div><button type="button" class="ri-skip">Passer ›</button>';
  const svg = el('svg', { class: 'ri-svg', 'aria-hidden': 'true' });
  wrap.prepend(svg);
  host.appendChild(wrap);
  const { device, fx } = buildPlate(svg);
  // dispositif : halo clair puis corps ; bout lumineux ; aiguille ; anneau de ponction ; étiquette
  const halo = el('path', { fill: 'none', stroke: '#fff', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', opacity: 0.9 }, device);
  const line = el('path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, device);
  const ring = el('circle', { fill: 'none', stroke: '#f2b23a', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 }, fx);
  const needle = el('g', {}, fx);
  const shaft = el('line', { stroke: '#8d949d', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 }, needle);
  const hub = el('line', { stroke: '#f2b23a', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 6 }, needle);
  const tipGlow = el('circle', { fill: '#fff', opacity: 0.85, filter: 'url(#ri-glow)' }, fx);
  const tip = el('circle', { fill: '#fff', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 }, fx);
  const tag = el('g', {}, fx);
  const lead = el('line', { stroke: '#14213a', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', opacity: 0.55 }, tag);
  const t1 = el('text', { class: 'ri-t1' }, tag), t2 = el('text', { class: 'ri-t2' }, tag);

  let kind = null, R = null, S = null, cum = null, t = 0, playing = false, done = null, cam = null, lastText = -1;
  const T_PUNCT = 1.8, T_ZOOM = 1.7, T_FADE = 0.8;
  const prepare = (k) => {
    kind = k; R = ROUTES[k];
    S = spline(R.pts, false, 12); cum = [0];
    for (let i = 1; i < S.length; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
    line.setAttribute('stroke', R.color); line.setAttribute('stroke-width', R.width);
    halo.setAttribute('stroke-width', R.width + 3.4); tip.setAttribute('stroke', R.color);
    t1.textContent = R.label[0]; t2.textContent = R.label[1];
    for (const e of [t1, t2]) e.setAttribute('text-anchor', R.side < 0 ? 'end' : 'start');
    cam = { x: MID, y: 503, h: 1000 }; lastText = -1;
  };
  // point du trajet à l'abscisse s (unités), et trajet jusqu'à s
  const pointAt = (s) => {
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const f = Math.min(1, Math.max(0, (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1)));
    return [lerp(S[i - 1][0], S[i][0], f), lerp(S[i - 1][1], S[i][1], f), i];
  };
  const upTo = (s) => { const [x, y, i] = pointAt(s); return `M${S.slice(0, i).map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}L${f1(x)} ${f1(y)}`; };
  const total = () => T_PUNCT + R.dur + T_ZOOM + T_FADE;

  function render(dt) {
    const W = Math.max(1, wrap.clientWidth), H = Math.max(1, wrap.clientHeight), asp = W / H;
    const Ltot = cum[cum.length - 1], site = S[0];
    const pT = ease((t - T_PUNCT) / R.dur), sLen = (t < T_PUNCT ? 0 : Math.max(0.0001, pT)) * Ltot;
    const [tx, ty] = pointAt(sLen);
    // cadrage visé : corps entier, puis le point de ponction, puis la tête du dispositif et le cœur, puis le cœur
    let goal;
    const tz = t - T_PUNCT - R.dur;
    if (t < T_PUNCT) { const e = ease(t / T_PUNCT); goal = { x: lerp(MID, lerp(MID, site[0], 0.5), e), y: lerp(503, lerp(503, site[1], 0.5), e), h: lerp(1000, R.zoom[0] + 140, e) }; }
    else if (tz < 0) { goal = { x: lerp(tx, HEART_C[0], 0.35), y: lerp(ty, HEART_C[1], 0.35), h: lerp(R.zoom[0], R.zoom[1], pT) }; }
    else { const e = ease(tz / T_ZOOM); goal = { x: lerp(HEART_C[0], HEART_C[0], e), y: HEART_C[1], h: lerp(R.zoom[1], 105, e) }; }
    const k = dt < 0 ? 1 : 1 - Math.exp(-dt * 3.2);
    cam.x += (goal.x - cam.x) * k; cam.y += (goal.y - cam.y) * k; cam.h = Math.exp(Math.log(cam.h) + (Math.log(goal.h) - Math.log(cam.h)) * k);
    const h = cam.h, w = h * asp;
    svg.setAttribute('viewBox', `${f1(cam.x - w / 2)} ${f1(cam.y - h / 2)} ${f1(w)} ${f1(h)}`);
    const u = h / H; // unités par pixel
    // ponction : aiguille qui entre, anneau qui pulse
    const pin = ease((t - 0.35) / 0.9), out = ease((t - T_PUNCT - 0.4) / 0.6);
    const [nx, ny] = R.needle, nl = Math.hypot(nx, ny), dx = nx / nl, dy = ny / nl, L0 = 30 * u * 1.4, depth = lerp(14 * u, 0, pin);
    const ax = site[0] + dx * depth, ay = site[1] + dy * depth;
    shaft.setAttribute('x1', f1(ax)); shaft.setAttribute('y1', f1(ay)); shaft.setAttribute('x2', f1(ax + dx * L0)); shaft.setAttribute('y2', f1(ay + dy * L0));
    hub.setAttribute('x1', f1(ax + dx * L0)); hub.setAttribute('y1', f1(ay + dy * L0)); hub.setAttribute('x2', f1(ax + dx * (L0 + 12 * u))); hub.setAttribute('y2', f1(ay + dy * (L0 + 12 * u)));
    needle.setAttribute('opacity', f1((t < 0.15 ? t / 0.15 : 1) * (1 - out)));
    const rp = (t * 1.1) % 1;
    ring.setAttribute('cx', f1(site[0])); ring.setAttribute('cy', f1(site[1])); ring.setAttribute('r', f1((5 + 16 * rp) * u));
    ring.setAttribute('opacity', f1((1 - rp) * (1 - ease((t - T_PUNCT) / 0.8))));
    // dispositif et son bout
    const show = t >= T_PUNCT;
    for (const e of [line, halo, tip, tipGlow]) e.style.display = show ? '' : 'none';
    if (show) {
      const d = upTo(sLen);
      line.setAttribute('d', d); halo.setAttribute('d', d);
      tip.setAttribute('cx', f1(tx)); tip.setAttribute('cy', f1(ty)); tip.setAttribute('r', f1(3.2 * u));
      tipGlow.setAttribute('cx', f1(tx)); tipGlow.setAttribute('cy', f1(ty)); tipGlow.setAttribute('r', f1(7 * u));
      tipGlow.setAttribute('opacity', f1(0.85 * (1 - ease(tz / 0.6))));
    }
    // étiquette de la ponction (taille constante à l'écran)
    const fs = 15 * u, ox = site[0] + R.side * 26 * u, oy = site[1] - 8 * u;
    t1.setAttribute('x', f1(ox)); t1.setAttribute('y', f1(oy - fs * 0.15)); t1.setAttribute('font-size', f1(fs * 0.82));
    t2.setAttribute('x', f1(ox)); t2.setAttribute('y', f1(oy + fs * 1.0)); t2.setAttribute('font-size', f1(fs));
    lead.setAttribute('x1', f1(site[0] + R.side * 5 * u)); lead.setAttribute('y1', f1(site[1])); lead.setAttribute('x2', f1(ox - R.side * 4 * u)); lead.setAttribute('y2', f1(oy + fs * 0.2));
    tag.setAttribute('opacity', f1(ease(t / 0.5) * (1 - ease((t - T_PUNCT - 0.3) / 0.6))));
    // légende de l'étape : ponction, puis trajet
    const ti = t < T_PUNCT ? 0 : 1;
    if (ti !== lastText) { lastText = ti; hooks.caption?.(kind, R.text[ti]); }
    // fondu sur la deuxième partie
    const fade = ease((t - T_PUNCT - R.dur - T_ZOOM) / T_FADE);
    wrap.style.opacity = String(1 - fade);
  }
  function finish() {
    const cb = done; playing = false; done = null;
    wrap.classList.add('hidden'); host.classList.remove('intro-on');
    cb?.();
  }
  wrap.querySelector('.ri-skip').addEventListener('click', () => { if (playing) { t = total() - T_FADE; } });
  return {
    get playing() { return playing; },
    get kind() { return kind; },
    // joue la première partie du trajet « k » ; onDone : au début du fondu (la deuxième partie démarre dessous)
    play(k, onDone) {
      prepare(k); t = 0; playing = true; done = onDone;
      wrap.style.opacity = '1'; wrap.classList.remove('hidden'); host.classList.add('intro-on');
      render(-1);
    },
    update(dt) {
      if (!playing) return;
      t += dt;
      if (done && t >= total() - T_FADE) { const cb = done; done = null; cb(); } // la deuxième partie démarre sous le fondu
      render(dt);
      if (t >= total()) finish();
    },
    stop() { if (!playing) return; done = null; finish(); },
    seek(s) { if (playing) { t = s; render(-1); } }, // débogage
  };
}
