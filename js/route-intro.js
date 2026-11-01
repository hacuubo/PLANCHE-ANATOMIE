// Première partie des animations de pose de dispositifs (TAVI, fermeture du FOP, stimulateur) : le trajet, du point de
// ponction à l'abord du cœur, sur une planche du corps entier — grande circulation seule (artères en rouge, veines en
// bleu, pas de circulation pulmonaire), cœur immobile. L'aiguille ponctionne le vaisseau, le dispositif le remonte, la
// vue suit sa progression ; en 4 à 5 s, à l'abord du cœur (aorte thoracique descendante, veine cave inférieure au
// niveau du foie, veine cave supérieure), la deuxième partie (animation 3D) prend le relais : la caméra 3D se pose
// exactement sur le cadrage de la planche, qui s'efface en fondu.
//
// Planche : vue de face, côté droit du patient à gauche de l'écran. Repère : 1000 unités de haut, K = 5,45 unités par
// cm, axe du corps en x = 200 ; un point de la scène (x, y en cm) est en (OX + K·x, OY − K·y). La silhouette du corps est
// dessinée ici (SVG) ; par-dessus, l'image du réseau vasculaire et du cœur, rendus ensemble en 3D par js/app.js
// (heartPlate, livrée toute faite dans assets/planche/) : chaque vaisseau du réseau (vesselNetwork) est un tube le long
// d'une ligne centrale décrite ici, au calibre du vaisseau, et ceux du tronc partent des extrémités des gros vaisseaux
// du modèle. Les membres et les vaisseaux symétriques sont décrits à droite et reportés à gauche. Le trajet du
// dispositif suit les lignes centrales de ces vaisseaux.
//   TAVI      artère fémorale droite → iliaque commune → aorte abdominale → aorte thoracique descendante ;
//   FOP       veine fémorale droite → iliaque commune → veine cave inférieure, au niveau du foie ;
//   pacemaker veine sous-clavière gauche → tronc veineux brachiocéphalique gauche → veine cave supérieure.

const NS = 'http://www.w3.org/2000/svg';
const MID = 200, K = 5.45, OX = 200, OY = 252.9;
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

/* ── Réseau vasculaire de la grande circulation ── Rendu en 3D avec le cœur du modèle, même lumière, même matière, même
   teinte (js/app.js, heartPlate) : chaque vaisseau est un tube le long de sa ligne centrale. Sur la planche : x, y en
   unités, largeur = calibre en unités ; z : profondeur en cm dans le repère de la scène (vers l'observateur > 0), aux
   deux bouts du vaisseau ou point par point. Les vaisseaux du tronc partent des extrémités des gros vaisseaux du modèle.
   Repères et calibres (docs/relectures/2026-11-01-relecture-reseau-vasculaire-3d.md) : niveaux vertébraux sur la planche
   T12 ≈ 340, L1 ≈ 352, L2 ≈ 366, L3 ≈ 396, L4 ≈ 414, L5 ≈ 430 — tronc cœliaque T12, mésentérique supérieure L1, rénales
   L1-L2, mésentérique inférieure L3, bifurcation aortique L4, confluent des veines iliaques L5 ; bifurcation carotidienne
   au bord supérieur du cartilage thyroïde (C4) ; division de l'humérale au col du radius ; jonction de la grande saphène
   ≈ 3,7 cm en dehors du tubercule pubien ; division de la poplitée au bord inférieur du poplité. Calibres (cm) : aorte
   sous-diaphragmatique ≈ 2 puis 1,7, iliaque commune ≈ 0,9, fémorale ≈ 0,8, poplitée ≈ 0,5, jambières ≈ 0,3-0,4,
   carotide ≈ 0,65, sous-clavière ≈ 0,85, humérale ≈ 0,45, radiale et ulnaire ≈ 0,25 ; veine cave inférieure ≈ 2,1,
   iliaque commune ≈ 1,2, fémorale ≈ 1, jugulaire interne ≈ 1,1, grande saphène ≈ 0,4. */
const A = (z, p) => ({ k: 'a', z, p }), V = (z, p) => ({ k: 'v', z, p });
const mirrorV = (v) => ({ ...v, p: mirror(v.p) });
// artères, de chaque côté (côté droit du patient)
const ART_R = [
  // cou et face
  A([-2.4, -2.6], [[178, 187, 2], [184, 174, 1.9], [187, 155, 1.8], [189, 130, 1.6], [190, 112, 1.4]]), // vertébrale (derrière la carotide)
  A([-1.2, -1.6], [[184, 160, 3.4], [185, 145, 3], [186, 130, 2.8], [187, 116, 2.6]]), // carotide interne
  A([-1, -0.6], [[184, 160, 3], [181, 148, 2.6], [178, 134, 2.2], [174, 118, 1.8], [170, 100, 1.5], [167, 82, 1.3], [166, 62, 1.1], [168, 46, 0.8]]), // carotide externe, temporale superficielle
  A([-0.8, -0.4], [[183, 156, 1.3], [188, 160, 1.1], [192, 166, 0.9]]), // thyroïdienne supérieure
  A([-0.8, -0.6], [[182, 150, 1.3], [188, 146, 1.1], [192, 140, 0.9]]), // linguale
  A([-0.8, 0], [[181, 146, 1.5], [178, 138, 1.4], [180, 128, 1.2], [185, 118, 1], [190, 108, 0.8], [193, 98, 0.6]]), // faciale
  A([-1.2, -1.2], [[176, 128, 1.3], [184, 124, 1.1], [190, 122, 0.9]]), // maxillaire
  A([-0.4, 0], [[167, 74, 1], [174, 58, 0.8], [182, 44, 0.6]]), // branche frontale de la temporale
  // membre supérieur
  A([-1, -0.6], [[124, 203, 4], [116, 216, 3.8], [112, 236, 3.6], [110, 252, 3.2], [107, 285, 3], [103, 325, 2.8], [100, 360, 2.6], [97, 386, 2.5], [96, 398, 2.4]]), // axillaire, humérale
  A([-0.6, -0.4], [[128, 200, 1.2], [124, 192, 1], [118, 190, 0.8]]), // thoraco-acromiale
  A([-0.8, -0.6], [[118, 214, 1.3], [122, 236, 1.2], [125, 260, 1], [127, 285, 0.8]]), // thoracique latérale
  A([-1.2, -1.2], [[110, 256, 1.6], [105, 276, 1.4], [99, 300, 1.2], [95, 330, 1], [94, 360, 0.8]]), // humérale profonde
  A([-0.8, -0.4], [[96, 398, 1.6], [92, 420, 1.5], [87, 450, 1.4], [82, 480, 1.3], [78, 505, 1.2], [76, 522, 1.1]]), // radiale
  A([-0.8, -0.6], [[96, 398, 1.7], [96, 420, 1.6], [94, 450, 1.5], [91, 480, 1.4], [89, 505, 1.3], [87, 524, 1.2]]), // ulnaire
  A([-1.2, -1.2], [[96, 404, 1], [93, 430, 0.9], [90, 460, 0.8]]), // interosseuse commune
  A([-0.2, -0.2], [[87, 524, 1.1], [86, 536, 1], [82, 540, 1], [78, 536, 0.9]]), // arcade palmaire superficielle
  A([-0.6, -0.6], [[76, 522, 1], [78, 530, 0.9], [84, 530, 0.9]]), // arcade palmaire profonde
  A([-0.2, -0.2], [[78, 538, 0.8], [75, 565, 0.65], [75, 586, 0.5]]), A([-0.2, -0.2], [[81, 540, 0.8], [80, 570, 0.65], [79, 592, 0.5]]),
  A([-0.2, -0.2], [[85, 539, 0.8], [84, 566, 0.65], [83, 586, 0.5]]), A([-0.2, -0.2], [[77, 530, 0.8], [70, 548, 0.6], [66, 563, 0.5]]), // digitales
  // bassin et membre inférieur
  A([-3, -3.4], [[183, 458, 3], [187, 470, 2.7], [190, 482, 2.3]]), // iliaque interne
  A([-3.4, -3.8], [[189, 478, 1.6], [180, 484, 1.4], [170, 486, 1.2]]), // glutéale supérieure
  A([-3.4, -3.2], [[190, 482, 1.5], [193, 494, 1.3], [192, 506, 1.1]]), // obturatrice
  A([-2.6, -1], [[182, 460, 4.6], [176, 478, 4.5], [170, 498, 4.4], [168, 514, 4.3], [167, 530, 4], [167, 560, 3.6], [168, 600, 3.4], [170, 640, 3.2], [172, 672, 3], [171, 700, 2.9], [169, 725, 2.8], [168, 748, 2.7]]), // iliaque externe, fémorale, poplitée
  A([-1.6, -0.8], [[175, 486, 1.4], [180, 470, 1.3], [183, 450, 1.1], [185, 428, 0.9], [186, 410, 0.7]]), // épigastrique inférieure
  A([-1.6, -1.6], [[172, 492, 1.1], [160, 484, 1], [148, 476, 0.8]]), // circonflexe iliaque profonde
  A([-1.4, -1.8], [[167, 522, 3], [161, 540, 2.8], [157, 570, 2.4], [155, 610, 2], [155, 650, 1.6], [156, 680, 1.2]]), // fémorale profonde
  A([-1.2, -1], [[160, 536, 2], [150, 542, 1.8], [144, 550, 1.6]]), // circonflexe fémorale latérale
  A([-1, -1], [[146, 548, 1.4], [144, 590, 1.2], [146, 640, 1], [150, 690, 0.8]]), // sa branche descendante
  A([-1.6, -1.8], [[161, 538, 1.6], [168, 548, 1.4], [174, 552, 1.2]]), // circonflexe fémorale médiale
  A([-0.8, -0.6], [[171, 690, 1.1], [178, 705, 1], [182, 720, 0.8]]), A([-0.8, -0.6], [[168, 712, 1], [159, 716, 0.9], [154, 724, 0.8]]), // géniculées
  A([-1, -0.2], [[168, 748, 2.2], [162, 764, 2.1], [160, 800, 2], [159, 840, 1.9], [161, 880, 1.8], [164, 915, 1.7], [166, 935, 1.6]]), // tibiale antérieure
  A([-0.2, 0], [[166, 935, 1.6], [166, 955, 1.4], [165, 972, 1.1]]), A([0, 0], [[166, 958, 0.9], [160, 962, 0.8], [156, 966, 0.6]]), // pédieuse, arquée
  A([-1.2, -1.2], [[168, 748, 2.4], [170, 760, 2.3], [171, 770, 2.2]]), // tronc tibio-fibulaire
  A([-1.2, -0.8], [[171, 770, 2.1], [174, 810, 2], [176, 860, 1.8], [178, 905, 1.6], [179, 928, 1.5], [177, 950, 1.2], [174, 966, 0.9]]), // tibiale postérieure
  A([-1.6, -1.6], [[171, 770, 1.8], [169, 820, 1.6], [169, 870, 1.4], [170, 910, 1.1]]), // fibulaire
];
// artères du tronc (asymétriques)
const ART_C = [
  A([-3.2, -1.2], [[209, 340, 3.4], [208, 337, 3.2], [205, 334, 3]]), // tronc cœliaque (T12)
  A([-1.2, -1.4], [[205, 334, 2.4], [198, 331, 2.2], [190, 326, 2], [183, 319, 1.7], [178, 313, 1.4]]), // hépatique commune (vers le foie)
  A([-1.2, -1.8], [[206, 334, 2.6], [213, 328, 2.5], [220, 333, 2.4], [228, 326, 2.2], [236, 331, 2.1], [244, 324, 1.9], [251, 320, 1.6]]), // splénique (sinueuse)
  A([-1.2, -1.4], [[207, 334, 1.4], [211, 326, 1.2], [214, 318, 1]]), // gastrique gauche
  A([-2.8, -1, -0.8, -0.8, -0.8, -0.8], [[208, 352, 3.4], [206, 361, 3.2], [203, 378, 2.8], [201, 394, 2.4], [200, 410, 2], [202, 428, 1.4]]), // mésentérique supérieure (L1), devant la veine rénale gauche
  A([-0.8, -0.8], [[204, 372, 1.4], [214, 380, 1.2], [222, 392, 1]]), A([-0.8, -0.8], [[202, 388, 1.3], [214, 398, 1.1], [220, 410, 0.9]]), // jéjunales
  A([-0.8, -0.8], [[201, 398, 1.4], [190, 410, 1.2], [182, 424, 1]]), // iléo-colique
  A([-3.4, -3.6], [[208, 362, 3.4], [196, 364, 3.2], [182, 368, 2.8], [170, 372, 2.4], [163, 374, 2]]), A([-3.4, -3.6], [[209, 360, 3.4], [220, 361, 3.2], [230, 363, 2.8], [238, 365, 2.2]]), // rénales (L1-L2), jusqu'au hile
  A([-3.2, -2], [[209, 396, 2.2], [214, 404, 2], [219, 414, 1.8], [222, 428, 1.5], [221, 440, 1.2]]), // mésentérique inférieure (L3)
  A([-3, -1], [[207, 372, 0.9], [198, 400, 0.8], [190, 440, 0.8], [184, 480, 0.7], [182, 500, 0.6]]), A([-3, -1], [[209, 374, 0.9], [216, 400, 0.8], [214, 440, 0.8], [216, 480, 0.7], [218, 500, 0.6]]), // gonadiques
  A([-3.2, -2.6], [[207, 414, 5.2], [197, 430, 5], [188, 446, 4.9], [182, 460, 4.8]]), A([-3.2, -2.6], [[207, 414, 5.2], [212, 430, 5], [216, 446, 4.9], [218, 460, 4.8]]), // iliaques communes (L4)
  A([-2.4, -2.6], [[222, 187, 2], [216, 174, 1.9], [213, 155, 1.8], [211, 130, 1.6], [210, 112, 1.4]]), // vertébrale gauche
];
// veines, de chaque côté
const VEIN_R = [
  V([0.2, -0.4], [[185, 190, 6.4], [181, 172, 5.8], [178, 154, 5.2], [176, 136, 4.6], [175, 120, 4], [176, 108, 3.2]]), // jugulaire interne (en dehors de la carotide)
  V([1.5, 1.5], [[171, 194, 2.4], [168, 174, 2.2], [165, 154, 2], [164, 134, 1.8], [165, 116, 1.5]]), // jugulaire externe
  V([0.5, 0.5], [[177, 138, 1.6], [181, 128, 1.4], [186, 116, 1.2], [190, 104, 1]]), // faciale
  V([0.6, 0.2], [[185, 190, 6], [168, 193, 5.6], [150, 197, 5.2], [134, 202, 4.8], [124, 210, 4.4], [117, 222, 4.2]]), // sous-clavière, axillaire (devant l'artère)
  V([-1.3, -1.1], [[117, 222, 4.2], [114, 240, 3.4], [111, 256, 2.6], [108, 285, 2.2], [104, 325, 2], [101, 360, 1.8], [98, 388, 1.6]]), // humérales
  V([2, 2, 2, 2, 2, 1.5, 0, -1, -1.2], [[89, 505, 1.8], [93, 465, 2], [97, 425, 2.2], [100, 392, 2.4], [103, 360, 2.6], [107, 325, 2.8], [111, 290, 3], [113, 262, 3.2], [114, 244, 3.4]]), // basilique
  V([2, 0.8], [[73, 515, 1.4], [74, 490, 1.6], [77, 450, 1.8], [80, 410, 2], [84, 370, 2.1], [87, 330, 2.2], [91, 290, 2.3], [96, 250, 2.4], [108, 226, 2.5], [120, 212, 2.6], [128, 206, 2.7]]), // céphalique (sillon delto-pectoral)
  V([2.2, 2.2], [[86, 372, 1.9], [94, 381, 1.8], [101, 390, 1.8]]), // médiane du coude
  V([2.2, 2.2], [[94, 383, 1.4], [90, 420, 1.3], [86, 460, 1.2], [83, 500, 1]]), // médiane de l'avant-bras
  V([2.2, 2.2], [[75, 520, 1.3], [76, 540, 1.1], [75, 565, 0.9]]), V([2.2, 2.2], [[82, 522, 1.3], [82, 548, 1.1], [81, 575, 0.9]]), V([2.2, 2.2], [[88, 520, 1.2], [86, 545, 1], [85, 568, 0.8]]),
  V([2.2, 2.2], [[74, 532, 1.1], [80, 536, 1.1], [87, 532, 1.1]]), // réseau dorsal de la main
  V([-2.2, -1.3], [[176, 472, 5.6], [174, 488, 5.4], [173, 504, 5.3], [173, 522, 5.2], [174, 548, 4.8], [175, 580, 4.4], [175, 620, 4.1], [175, 660, 3.8], [174, 695, 3.6], [172, 725, 3.4], [171, 750, 3.2]]), // iliaque externe, fémorale, poplitée
  V([-1.8, -2], [[174, 524, 3], [164, 545, 2.6], [159, 575, 2.2], [157, 615, 1.8], [157, 655, 1.4]]), // fémorale profonde
  V([-0.8, 1.5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], [[174, 532, 3.4], [179, 546, 3], [183, 575, 2.8], [186, 630, 2.6], [185, 690, 2.4], [182, 730, 2.3], [181, 790, 2.2], [180, 850, 2], [178, 905, 1.9], [175, 930, 1.7], [170, 948, 1.5], [165, 958, 1.3]]), // grande saphène
  V([1.8, 1.8], [[178, 540, 1.3], [180, 520, 1.1], [182, 498, 0.9], [184, 478, 0.7]]), V([1.8, 1.8], [[177, 542, 1.2], [165, 532, 1], [153, 520, 0.8]]), // épigastrique et circonflexe iliaque superficielles
  V([2, 2], [[180, 555, 1.4], [172, 590, 1.2], [168, 630, 1]]), // saphène accessoire
  V([-1.5, -1], [[171, 752, 2.6], [174, 800, 2.4], [177, 860, 2.2], [179, 915, 1.9], [180, 930, 1.7]]), // tibiales postérieures
  V([-1.3, -0.4], [[170, 754, 2.2], [164, 778, 2], [161, 835, 1.9], [163, 895, 1.7], [167, 932, 1.5]]), // tibiales antérieures
  V([1, 1], [[158, 958, 1.4], [166, 966, 1.4], [176, 960, 1.4], [180, 948, 1.4]]), // arcade veineuse dorsale du pied
];
const VEIN_C = [
  V([-1.8, -2.2], [[194, 364, 4.4], [184, 367, 4], [174, 371, 3.6], [164, 376, 3]]), // rénale droite
  V([-1.8, -2.4], [[194, 362, 4.6], [204, 360, 4.4], [214, 361, 4.2], [226, 362, 3.8], [237, 363, 3.2]]), // rénale gauche (entre l'aorte et la mésentérique supérieure), jusqu'au hile
  V([-1.6, -1], [[194, 384, 1.2], [190, 420, 1.1], [186, 460, 1], [183, 500, 0.9]]), V([-1.9, -1], [[222, 362, 1.2], [220, 400, 1.1], [216, 440, 1], [217, 480, 0.9], [218, 500, 0.8]]), // gonadiques
  V([-1.6, -2.2], [[194, 430, 6.6], [187, 446, 6.2], [180, 460, 5.8], [176, 472, 5.6]]), // iliaque commune droite (L5)
  V([-3.8, -2.6], [[194, 430, 6.6], [204, 442, 6.2], [214, 456, 5.8], [222, 468, 5.6], [224, 472, 5.6]]), // iliaque commune gauche (derrière l'iliaque commune droite)
];

/* ── Raccords au modèle ── Extrémités des gros vaisseaux du modèle (hooks.plate().ends, en cm) : point (x, y, z),
   direction vers l'extérieur, rayon ; sur la planche, chaque vaisseau commence 3 mm dans le moignon */
const toSvg = (p) => [OX + K * p[0], OY - K * p[1]];
function joints(ends) {
  const J = {};
  for (const [k, e] of Object.entries(ends)) {
    const [x, y] = toSvg(e.p), dx = e.d[0], dy = -e.d[1], w = Math.max(3, Math.min(14, 2 * e.r * K));
    J[k] = { x, y, z: e.p[2] ?? 0, dx, dy, w, at: (cm) => [x + dx * cm * K, y + dy * cm * K] }; // at(−0,3) : dans le moignon ; at(> 0) : au-delà
  }
  return J;
}
// vaisseau qui part d'une extrémité du modèle : profondeur du moignon, puis zEnd
const from = (k, j, w1, rest, zEnd) => {
  const p = [[...j.at(-1.2), j.w * 0.96], [j.x, j.y, j.w], [...j.at(0.6), (j.w + w1) / 2], ...rest], n = p.length; // 12 mm dans le moignon (caché), au calibre du moignon à sa sortie
  return { k, p, z: p.map((_, i) => (i < 2 ? j.z : j.z + ((zEnd - j.z) * (i - 1)) / (n - 2))) };
};
// Réseau entier (lignes centrales en unités de la planche) : ce que js/app.js rend en 3D
export function vesselNetwork(ends) {
  const J = joints(ends), S = J.svc;
  return [
    from('a', J.ao, 11, [[209, 320, 11], [209, 340, 11], [208, 360, 10.4], [208, 386, 9.6], [207, 414, 9.2]], -3.2), // aorte abdominale
    from('a', J.rcar, 3.6, [[185, 170, 3.6], [184, 160, 3.4]], -1.2), from('a', J.lcar, 3.6, [[212, 170, 3.6], [216, 160, 3.4]], -1.2), // carotides communes
    from('a', J.rsub, 4.6, [[160, 189, 4.6], [146, 193, 4.4], [132, 198, 4.2], [124, 203, 4]], -1), // sous-clavière droite
    from('a', J.lsub, 4.6, [[240, 189, 4.6], [254, 193, 4.4], [268, 198, 4.2], [276, 203, 4]], -1), // sous-clavière gauche
    from('v', J.ivc, 11, [[193, 300, 11], [193, 320, 11.4], [194, 345, 11.2], [194, 375, 10.8], [194, 405, 10.4], [194, 430, 9.6]], -1.6), // veine cave inférieure
    // troncs brachiocéphaliques : devant les branches de la crosse, jusqu'à la veine cave supérieure du modèle
    { k: 'v', z: [0.2, 0.3, 0.1, S.z, S.z], p: [[185, 190, 6.8], [186, 197, 7], [S.x - 2, S.y - 3, 7.2], [S.x, S.y, 7.2], [...S.at(-0.3), 7.2]] },
    { k: 'v', z: [0.2, 0.4, 0.4, 0.1, S.z, S.z], p: [[215, 190, 6.8], [209, 196, 7], [199, 201, 7.2], [S.x + 2, S.y - 3, 7.2], [S.x, S.y, 7.2], [...S.at(-0.3), 7.2]] },
    ...ART_C, ...ART_R, ...ART_R.map(mirrorV), ...VEIN_C, ...VEIN_R, ...VEIN_R.map(mirrorV),
  ];
}
// trajets du dispositif, jusqu'à l'abord du cœur (dans le moignon du modèle)
function routes(J) {
  const S = J.svc;
  return {
    tavi: [[167, 529], [167, 520], [168, 514], [170, 498], [176, 478], [182, 460], [188, 446], [197, 430], [207, 414], [208, 386], [208, 360], [209, 340], [209, 320], J.ao.at(0.6), [J.ao.x, J.ao.y], J.ao.at(-1.6)],
    fop: [[173, 530], [173, 522], [173, 504], [174, 488], [176, 472], [180, 460], [187, 446], [194, 430], [194, 405], [194, 375], [194, 345], [193, 320], [193, 300], J.ivc.at(0.6), [J.ivc.x, J.ivc.y], J.ivc.at(-1.4)],
    pm: [[258, 199], [250, 197], [232, 193], [215, 190], [209, 196], [199, 201], [S.x + 2, S.y - 3], [S.x, S.y], S.at(-1.2)],
  };
}
export const ROUTES = {
  tavi: {
    dur: 3.2, color: '#3a414b', width: 2.4, side: -1, needle: [-12, 34], zoom: [620, 175],
    label: ['Ponction', 'artère fémorale droite'],
    text: 'Ponction de l’artère fémorale droite, au pli de l’aine : le guide remonte l’artère iliaque et l’aorte abdominale jusqu’à l’aorte thoracique.',
  },
  fop: {
    dur: 2.9, color: '#2c62d3', width: 3.6, side: -1, needle: [-12, 34], zoom: [620, 165],
    label: ['Ponction', 'veine fémorale droite'],
    text: 'Ponction de la veine fémorale droite, au pli de l’aine : la gaine remonte la veine iliaque et la veine cave inférieure jusqu’au foie.',
  },
  pm: {
    dur: 2.8, color: '#2c3a6b', width: 3.6, side: 1, needle: [16, 28], zoom: [380, 150],
    label: ['Ponction', 'veine sous-clavière gauche'],
    text: 'Ponction de la veine sous-clavière gauche, sous la clavicule : la sonde, dans sa gaine, rejoint le tronc veineux brachiocéphalique gauche puis la veine cave supérieure.',
  },
};

const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent?.appendChild(e); return e; };
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// Planche : corps, puis l'image du réseau et du cœur rendue en 3D (plate : { images: [{ url, rect: [x0, x1, y0, y1] en cm }],
// ends }) — l'image entière, puis celle du tronc, plus fine, par-dessus
function buildPlate(svg, plate) {
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <radialGradient id="ri-skin" cx="200" cy="330" r="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fbeae0"/><stop offset=".55" stop-color="#f3d8c8"/><stop offset="1" stop-color="#e6bfab"/></radialGradient>
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
  for (const im of plate.images) {
    const [x0, x1, y0, y1] = im.rect, [ix, iy] = toSvg([x0, y1]);
    el('image', { href: im.url, x: f1(ix), y: f1(iy), width: f1((x1 - x0) * K), height: f1((y1 - y0) * K), preserveAspectRatio: 'none' }, svg);
  }
  const J = joints(plate.ends);
  const device = el('g', {}, svg);
  const fx = el('g', {}, svg); // aiguille, point de ponction, bout du dispositif, étiquette
  return { device, fx, routes: routes(J), heart: toSvg([0, 0.5]) };
}

export function createRouteIntro(host, hooks = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'route-intro hidden';
  wrap.innerHTML = '<div class="ri-legend"><span class="ri-a">Artères</span><span class="ri-v">Veines</span></div><button type="button" class="ri-skip">Passer ›</button>';
  const svg = el('svg', { class: 'ri-svg', 'aria-hidden': 'true' });
  wrap.prepend(svg);
  host.appendChild(wrap);
  let P = null; // planche, construite au premier lancement (l'image du cœur est rendue à ce moment)
  let halo, line, ring, needle, shaft, hub, tipGlow, tip, tag, lead, t1, t2;
  const build = () => {
    P = buildPlate(svg, hooks.plate());
    const { device, fx } = P;
    // dispositif : halo clair puis corps ; bout lumineux ; aiguille ; anneau de ponction ; étiquette
    halo = el('path', { fill: 'none', stroke: '#fff', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', opacity: 0.9 }, device);
    line = el('path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, device);
    ring = el('circle', { fill: 'none', stroke: '#f2b23a', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 }, fx);
    needle = el('g', {}, fx);
    shaft = el('line', { stroke: '#8d949d', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 }, needle);
    hub = el('line', { stroke: '#f2b23a', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 6 }, needle);
    tipGlow = el('circle', { fill: '#fff', opacity: 0.85, filter: 'url(#ri-glow)' }, fx);
    tip = el('circle', { fill: '#fff', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 }, fx);
    tag = el('g', {}, fx);
    lead = el('line', { stroke: '#14213a', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', opacity: 0.55 }, tag);
    t1 = el('text', { class: 'ri-t1' }, tag); t2 = el('text', { class: 'ri-t2' }, tag);
  };

  let kind = null, R = null, S = null, cum = null, t = 0, playing = false, done = null, cam = null, handed = false;
  const T_PUNCT = 0.9, T_FADE = 0.55;
  const prepare = (k) => {
    if (!P) build();
    kind = k; R = ROUTES[k];
    S = spline(P.routes[k], false, 12); cum = [0];
    for (let i = 1; i < S.length; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
    line.setAttribute('stroke', R.color); line.setAttribute('stroke-width', R.width);
    halo.setAttribute('stroke-width', R.width + 3.4); tip.setAttribute('stroke', R.color);
    t1.textContent = R.label[0]; t2.textContent = R.label[1];
    for (const e of [t1, t2]) e.setAttribute('text-anchor', R.side < 0 ? 'end' : 'start');
    cam = { x: MID, y: 503, h: 1000 }; handed = false;
  };
  // point du trajet à l'abscisse s (unités), et trajet jusqu'à s
  const pointAt = (s) => {
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const f = Math.min(1, Math.max(0, (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1)));
    return [lerp(S[i - 1][0], S[i][0], f), lerp(S[i - 1][1], S[i][1], f), i];
  };
  const upTo = (s) => { const [x, y, i] = pointAt(s); return `M${S.slice(0, i).map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}L${f1(x)} ${f1(y)}`; };
  const tHand = () => T_PUNCT + R.dur; // relais : la deuxième partie démarre, la planche s'efface
  let view = null; // cadrage courant (centre, hauteur en unités, hauteur en pixels)

  function render(dt) {
    const W = Math.max(1, wrap.clientWidth), H = Math.max(1, wrap.clientHeight), asp = W / H;
    const Ltot = cum[cum.length - 1], site = S[0], end = S[S.length - 1];
    const pT = ease((t - T_PUNCT) / R.dur), sLen = (t < T_PUNCT ? 0 : Math.max(0.0001, pT)) * Ltot;
    const [tx, ty] = pointAt(sLen);
    // cadrage visé : corps entier, puis le point de ponction, puis la tête du dispositif et l'abord du cœur
    let goal;
    if (t < T_PUNCT) { const e = ease(t / T_PUNCT); goal = { x: lerp(MID, lerp(MID, site[0], 0.35), e), y: lerp(503, lerp(503, site[1], 0.35), e), h: lerp(1000, R.zoom[0], e) }; }
    else { const a = lerp(0.2, 0.55, pT); goal = { x: lerp(tx, lerp(end[0], P.heart[0], 0.5), a), y: lerp(ty, lerp(end[1], P.heart[1], 0.5), a), h: Math.exp(lerp(Math.log(R.zoom[0]), Math.log(R.zoom[1]), pT)) }; }
    if (!handed) { // après le relais, le cadrage ne bouge plus (la caméra 3D s'y est posée)
      const k = dt < 0 ? 1 : 1 - Math.exp(-dt * 4.5);
      cam.x += (goal.x - cam.x) * k; cam.y += (goal.y - cam.y) * k; cam.h = Math.exp(Math.log(cam.h) + (Math.log(goal.h) - Math.log(cam.h)) * k);
    }
    const h = cam.h, w = h * asp;
    svg.setAttribute('viewBox', `${f1(cam.x - w / 2)} ${f1(cam.y - h / 2)} ${f1(w)} ${f1(h)}`);
    view = { cx: cam.x, cy: cam.y, h, H };
    const u = h / H; // unités par pixel
    // ponction : aiguille qui entre, anneau qui pulse
    const pin = ease((t - 0.1) / 0.55), out = ease((t - T_PUNCT - 0.2) / 0.4);
    const [nx, ny] = R.needle, nl = Math.hypot(nx, ny), dx = nx / nl, dy = ny / nl, L0 = 30 * u * 1.4, depth = lerp(14 * u, 0, pin);
    const ax = site[0] + dx * depth, ay = site[1] + dy * depth;
    shaft.setAttribute('x1', f1(ax)); shaft.setAttribute('y1', f1(ay)); shaft.setAttribute('x2', f1(ax + dx * L0)); shaft.setAttribute('y2', f1(ay + dy * L0));
    hub.setAttribute('x1', f1(ax + dx * L0)); hub.setAttribute('y1', f1(ay + dy * L0)); hub.setAttribute('x2', f1(ax + dx * (L0 + 12 * u))); hub.setAttribute('y2', f1(ay + dy * (L0 + 12 * u)));
    needle.setAttribute('opacity', f1((t < 0.1 ? t / 0.1 : 1) * (1 - out)));
    const rp = (t * 1.6) % 1;
    ring.setAttribute('cx', f1(site[0])); ring.setAttribute('cy', f1(site[1])); ring.setAttribute('r', f1((5 + 16 * rp) * u));
    ring.setAttribute('opacity', f1((1 - rp) * (1 - ease((t - T_PUNCT) / 0.5))));
    // dispositif et son bout
    const show = t >= T_PUNCT;
    for (const e of [line, halo, tip, tipGlow]) e.style.display = show ? '' : 'none';
    if (show) {
      const d = upTo(sLen);
      line.setAttribute('d', d); halo.setAttribute('d', d);
      tip.setAttribute('cx', f1(tx)); tip.setAttribute('cy', f1(ty)); tip.setAttribute('r', f1(3.2 * u));
      tipGlow.setAttribute('cx', f1(tx)); tipGlow.setAttribute('cy', f1(ty)); tipGlow.setAttribute('r', f1(7 * u));
    }
    // étiquette de la ponction (taille constante à l'écran), pendant la ponction
    const fs = 15 * u, ox = site[0] + R.side * 26 * u, oy = site[1] - 8 * u;
    t1.setAttribute('x', f1(ox)); t1.setAttribute('y', f1(oy - fs * 0.15)); t1.setAttribute('font-size', f1(fs * 0.82));
    t2.setAttribute('x', f1(ox)); t2.setAttribute('y', f1(oy + fs * 1.0)); t2.setAttribute('font-size', f1(fs));
    lead.setAttribute('x1', f1(site[0] + R.side * 5 * u)); lead.setAttribute('y1', f1(site[1])); lead.setAttribute('x2', f1(ox - R.side * 4 * u)); lead.setAttribute('y2', f1(oy + fs * 0.2));
    tag.setAttribute('opacity', f1(ease(t / 0.3) * (1 - ease((t - T_PUNCT - 0.2) / 0.5))));
    // fondu sur la deuxième partie
    wrap.style.opacity = String(1 - ease((t - tHand()) / T_FADE));
  }
  function finish() {
    playing = false; done = null;
    wrap.classList.add('hidden'); host.classList.remove('intro-on');
  }
  const handoff = () => { handed = true; const cb = done; done = null; cb?.(view); }; // la deuxième partie démarre sous la planche
  wrap.querySelector('.ri-skip').addEventListener('click', () => { if (playing && !handed) { t = tHand(); render(-1); handoff(); } });
  return {
    get playing() { return playing; },
    get kind() { return kind; },
    // joue la première partie du trajet « k » ; onDone(view) au relais : cadrage de la planche à ce moment
    // ({ cx, cy, h } en unités, H en pixels) et repère du modèle (K, OX, OY), pour y poser la caméra 3D
    play(k, onDone) {
      wrap.classList.remove('hidden'); host.classList.add('intro-on');
      prepare(k); t = 0; playing = true; done = onDone;
      wrap.style.opacity = '1';
      hooks.caption?.(kind, R.text);
      render(-1);
    },
    update(dt) {
      if (!playing) return;
      t += dt;
      render(dt);
      if (!handed && t >= tHand()) handoff();
      if (t >= tHand() + T_FADE) finish();
    },
    stop() { if (!playing) return; done = null; finish(); },
    seek(s) { if (playing) { t = s; render(-1); } }, // débogage
    frame: { K, OX, OY },
  };
}
