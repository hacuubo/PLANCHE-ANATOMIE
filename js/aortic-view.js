// Vues des valves sigmoïdes (aortique et pulmonaire), tirées du cœur lui-même, coupé perpendiculairement à l'axe de la
// racine : C (chirurgicale), depuis l'artère, coupe au-dessus de la jonction sino-tubulaire (aortotomie,
// artériotomie pulmonaire) ; V (ventriculaire), depuis la chambre de chasse du ventricule. Les variantes pathologiques
// remplacent la valve du cœur à sa place (heart.useValve) et battent avec lui.
//
// Valve aortique — cuspide coronaire droite à 6 h des deux côtés (convention ASE/EAE, Lang 2012) :
//   - normale : la valve du cœur — trois cuspides fines (coronaire droite R, coronaire gauche L, non coronaire N),
//     fermeture en Y, ouverture triangulaire large ;
//   - bicuspidie de type 1 L-R (classification de Sievers, ≈ 75-80 % des bicuspidies) : cuspides coronaires droite
//     et gauche fusionnées en une cuspide unique plus grande, crête de fusion (raphé) partiellement calcifiée, ligne
//     d'attache abaissée au niveau du raphé, deux commissures ; fermeture sur une ligne, ouverture en « bouche de
//     poisson » ;
//   - rétrécissement aortique serré dégénératif (calcifié, stade évolué) : trois cuspides séparées (commissures
//     libres, à la différence de l'atteinte rhumatismale) mais épaissies, rigides et calcifiées sur toute leur
//     étendue : amas calcaires sur la face aortique, plus gros à la base et dans le corps des cuspides, jusque dans
//     les commissures ; bord libre épaissi, irrégulier, festonné et rétracté par endroits, nodulaire ; ouverture
//     réduite à un petit orifice irrégulier ;
//   - insuffisance aortique par dilatation de la racine (type I d'El Khoury, le plus fréquent) : cuspides normales,
//     écartées par la jonction sino-tubulaire et l'anneau élargis ; hauteur de coaptation réduite et défaut de
//     fermeture central triangulaire (orifice régurgitant ≈ 0,4 cm², IA importante au-delà de 0,30 cm²).
// Valve pulmonaire :
//   - normale : la valve du cœur — trois cuspides (droite et gauche, face à l'aorte ; antérieure) ;
//   - rétrécissement pulmonaire congénital « en dôme » (forme typique, ≈ 90 %) : commissures fusionnées, cuspides
//     épaissies formant un dôme percé d'un orifice central étroit, raphés de fusion visibles ; en systole, la valve se
//     bombe en dôme vers le tronc pulmonaire.
// Sources de représentation : anatomopathologie des valves natives, classification de Sievers, classification
// fonctionnelle de l'insuffisance aortique (El Khoury 2005), recommandations ESC/EACTS 2021 (seuils de sévérité),
// morphologie du rétrécissement pulmonaire valvulaire (valve en dôme).
// Les variantes ne sont construites qu'à leur premier affichage (démarrage plus court).
import * as THREE from 'three';
import { Shell, Opening, smooth, mix, ENDO, CLAIRE, NODULE, nodule } from './valves.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const gauss = (x, s) => Math.exp(-((x / s) ** 2));
// petit générateur pseudo-aléatoire reproductible (même valve à chaque chargement)
// Valve pulmonaire : orientation de l'image (voir plus bas)
// cuspide antérieure à 12 h quelle que soit la perspective (depuis le tronc ou depuis le VD : EAE/ASE, Lang 2012)
const PULMONARY_UP = (dir, mid, { cA, A }) => dir(mid(cA)).projectOnPlane(A).normalize();
const PULMONARY_ORIENT = 'cuspide antérieure en haut';
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// Variante : jeu de cuspides animé comme une valve du cœur (consigne d'ouverture, ressort, vibration dans le flux).
// max : ouverture maximale (rétrécissement : petit orifice) ; wob : amplitude de la vibration du bord libre.
function asValve(cusps, max, wob) {
  const op = new Opening([14, 0.75], [9, 0.65], 0);
  let flow = 0;
  const draw = (xf, time) => {
    const w = flow > 0 && wob ? (u, v) => flow * wob * v * v * Math.sin(2 * Math.PI * 9 * time + 12 * u) * Math.max(0, op.tip.x) : null;
    for (const c of cusps) c.shell.updateOpen((v) => op.at(v), xf, 0.04, w);
  };
  return {
    meshes: cusps.map((c) => c.shell.mesh),
    setTarget: (o) => { op.target = o * max; },
    snap: (o, xf) => { op.snap(o * max); draw(xf, 0); },
    step: (dt, time, xf, dirty, live) => {
      op.step(dt);
      flow = live ? smooth(0.5, 0.9, op.target / max) : 0;
      const moving = op.moving || (flow > 0 && wob > 0);
      if (moving || dirty) draw(xf, time);
      return moving;
    },
  };
}

export function buildSLView(heart, kind = 'aortique') {
  const aortic = kind === 'aortique';
  const id = aortic ? 'valve-aortique' : 'valve-pulmonaire', d = heart.valveData[id];
  const C = V(d.center), A = V(d.axis).normalize(), E1 = V(d.e1), E2 = V(d.e2);
  const R = d.radius, Hc = d.height;
  const dir = (th, out = new THREE.Vector3()) => out.copy(E1).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th)).normalize();
  const mid = (c) => (c.t0 + c.t1) / 2;
  const byName = (re) => d.cusps.find((c) => re.test(c.name));
  /* ── cuspides ── */
  const valveMat = heart.material(id, 'valve'); // même matériau que la valve du cœur (coupes, ombres)
  const tD = new THREE.Vector3(), Hp = new THREE.Vector3(), Fc = new THREE.Vector3(), Fo = new THREE.Vector3(), Q0 = new THREE.Vector3(), Q1 = new THREE.Vector3(), M = new THREE.Vector3(), U = new THREE.Vector3(), Wv = new THREE.Vector3();
  // spec : t0, t1 (angles des commissures), raphe (u du raphé, facultatif), chord (fermeture sur une ligne : bicuspidie),
  // shade, thick, bulge. Bord libre ouvert : tricuspide → triangle à côtés bombés entre les commissures (orifice
  // systolique triangulaire) ; bicuspide → demi-ellipse allongée entre les deux commissures (« bouche de poisson »).
  // Options : coapt (hauteur de coaptation, en fraction de Hc), gap (écart du bord libre au centre : défaut de
  // coaptation central), dome (ouverte : orifice central de rayon dome × R, cuspides fusionnées bombées en dôme), ragged (bord libre abîmé :
  // ragged(u) → [abaissement, recul vers le sinus], en fraction de Hc et de R, appliqué au voisinage du bord, valve
  // ouverte comme fermée ; nu, nv : finesse du maillage).
  const makeCusp = (spec) => {
    const { t0, t1, raphe = null, chord = false, coapt = 0.8, gap = 0, dome = 0, ragged = null } = spec;
    const span = t1 - t0;
    const attach = (u) => {
      if (raphe === null) return Hc * 0.95 * (1 - Math.sin(Math.PI * u));
      // deux demi-poches : ligne d'attache abaissée au niveau du raphé (commissure fusionnée)
      const eR = 0.5;
      if (u < raphe) { const s = u / raphe; return Hc * (0.95 + (eR - 0.95) * s) * (1 - Math.sin(Math.PI * s)); }
      const s = (u - raphe) / (1 - raphe); return Hc * (eR + (0.95 - eR) * s) * (1 - Math.sin(Math.PI * s));
    };
    const belly = (u) => (raphe === null ? Math.sin(Math.PI * u) : (u < raphe ? Math.sin(Math.PI * u / raphe) : Math.sin(Math.PI * (u - raphe) / (1 - raphe))) * 0.85 + 0.15);
    const point = (u, v, open, out) => {
      const th = t0 + span * u;
      dir(th, tD);
      const h = attach(u);
      Hp.copy(C).addScaledVector(tD, R * 0.985).addScaledVector(A, h); // attache sur la paroi réelle de la racine
      if (chord) { // fermeture sur une ligne entre les deux commissures, légèrement creusée au centre
        Q0.copy(C).addScaledVector(dir(t0), R * 0.97).addScaledVector(A, Hc * 0.9);
        Q1.copy(C).addScaledVector(dir(t1), R * 0.97).addScaledVector(A, Hc * 0.9);
        Fc.copy(Q0).lerp(Q1, u).addScaledVector(A, -Hc * 0.1 * Math.sin(Math.PI * u)).addScaledVector(dir(t0 + span / 2), 0.025);
      } else { // fermeture en Y, nodule au centre ; défaut de coaptation : bord libre écarté du centre vers son sinus
        const s = u < 0.5 ? 1 - 2 * u : 2 * u - 1;
        Fc.copy(C).addScaledVector(A, Hc * (coapt + 0.06 * (1 - s))).addScaledVector(dir(u < 0.5 ? t0 : t1), R * 0.98 * s)
          .addScaledVector(dir(t0 + span / 2), 0.02 + gap * Math.pow(1 - s, 1.5));
      }
      Q0.copy(C).addScaledVector(dir(t0), R * 0.97); Q1.copy(C).addScaledVector(dir(t1), R * 0.97);
      M.copy(Q0).add(Q1).multiplyScalar(0.5); U.copy(Q0).sub(M);
      Wv.copy(dir(t0 + span / 2)).projectOnPlane(A).addScaledVector(U, -Wv.dot(U) / Math.max(U.lengthSq(), 1e-6)).normalize();
      if (dome) { // dôme : orifice central étroit, bords libres soudés en cercle
        Fo.copy(C).addScaledVector(tD, R * dome).addScaledVector(A, Hc * 1.25);
      } else {
        if (chord) { // demi-ellipse : demi-grand axe = demi-distance des commissures, demi-petit axe 0,42 R
          Fo.copy(M).addScaledVector(U, Math.cos(Math.PI * u)).addScaledVector(Wv, R * 0.42 * Math.sin(Math.PI * u));
        } else { // côté du triangle, bombé vers la paroi
          Fo.copy(Q0).lerp(Q1, u).addScaledVector(Wv, R * 0.12 * Math.sin(Math.PI * u));
        }
        Fo.addScaledVector(A, Hc * 1.02);
      }
      Fc.lerp(Fo, open);
      out.copy(Hp).lerp(Fc, v);
      const b = Math.sin(Math.PI * v) * belly(u);
      out.addScaledVector(A, -0.3 * Hc * b * (1 - open)); // ventre vers le ventricule, valve fermée
      if (dome) out.addScaledVector(A, 0.32 * Hc * Math.sin(Math.PI * v) * open); // voûte du dôme, convexe vers l'artère
      else out.addScaledVector(tD, 0.06 * R * b * open); // ventre vers le sinus, sans toucher la paroi
      if (ragged) { // indépendant de open : point() reste linéaire en open
        const [dn, dr] = ragged(u), e = smooth(0.55, 1, v) * Math.sqrt(Math.sin(Math.PI * u)); // commissures tenues
        out.addScaledVector(A, -dn * Hc * e).addScaledVector(Wv, dr * R * e);
      }
      return out;
    };
    const shell = new Shell(spec.nu ?? 44, spec.nv ?? 28, spec.mat ?? valveMat, spec.shade, spec.thick, spec.bulge ?? null);
    shell.cache(point);
    shell.mesh.castShadow = true; shell.mesh.receiveShadow = true;
    return { shell, point };
  };

  // aspect normal (cuspide fine, lunules, nodule d'Arantius)
  const shadeNormal = (u, v) => {
    const b = Math.sin(Math.PI * v) * Math.sin(Math.PI * u);
    let c = mix(CLAIRE, [0.88, 0.74, 0.64], b * 0.3);
    c = mix(c, ENDO, 1 - smooth(0, 0.1, v));
    c = mix(c, NODULE, nodule(u, v));
    return [...c, 0.62 + 0.38 * (1 - b) - 0.12 * Math.pow(1 - Math.sin(Math.PI * u), 6)];
  };
  const thickNormal = (u, v) => 0.065 * (1 - smooth(0, 0.18, v)) + 0.035 - 0.012 * smooth(0.78, 0.9, v) * (1 - nodule(u, v)) + 0.11 * nodule(u, v);
  // cuspide calcifiée (rétrécissement dégénératif)
  const calcified = (s, i) => {
    const r = rng(97 + i * 31), arc = (s.t1 - s.t0) * R, hv = Hc * 1.05;
    // amas calcaires sur toute la cuspide : gros à la base et dans le corps (sinus), en traînées le long de la ligne de
    // fermeture, jusque dans les commissures, et nodules sur le bord libre (stade évolué)
    const nods = [];
    for (let k = 0; k < 9; k++) nods.push({ u: 0.08 + 0.84 * r(), v: 0.08 + 0.4 * r(), s: 0.2 + 0.18 * r(), h: 0.15 + 0.15 * r() });
    for (let k = 0; k < 6; k++) nods.push({ u: 0.12 + 0.76 * r(), v: 0.5 + 0.3 * r(), s: 0.12 + 0.12 * r(), h: 0.1 + 0.1 * r() });
    for (let k = 0; k < 5; k++) nods.push({ u: 0.1 + 0.8 * r(), v: 0.86 + 0.12 * r(), s: 0.07 + 0.07 * r(), h: 0.06 + 0.07 * r() });
    for (const uc of [0.04, 0.96]) nods.push({ u: uc, v: 0.2 + 0.25 * r(), s: 0.18, h: 0.1 + 0.06 * r() }); // commissures
    const ph = [r(), r(), r(), r(), r()].map((x) => 2 * Math.PI * x);
    const noise = (u, v) => Math.sin(37 * u + 11 * v + ph[0]) * Math.sin(23 * v + 5 * u + ph[1]);
    const calc = (u, v) => {
      let c = 0;
      for (const n of nods) c += n.h * Math.exp(-(((u - n.u) * arc) ** 2 + ((v - n.v) * hv) ** 2) / (n.s * n.s));
      return c * (0.75 + 0.25 * noise(u, v));
    };
    // bord libre abîmé : festons irréguliers, encoches de rétraction, petites dents (déformation fixe)
    const notches = [0, 1].map(() => ({ u: 0.18 + 0.64 * r(), w: 0.04 + 0.04 * r(), d: 0.07 + 0.07 * r() }));
    const ragged = (u) => {
      let dn = 0.035 * Math.sin(2 * Math.PI * 2.5 * u + ph[2]) + 0.022 * Math.sin(2 * Math.PI * 6.5 * u + ph[3]) + 0.012 * Math.sin(2 * Math.PI * 13 * u + ph[4]);
      let dr = 0.025 * Math.sin(2 * Math.PI * 3.5 * u + ph[3]);
      for (const n of notches) { const g = gauss(u - n.u, n.w); dn += n.d * g; dr += 0.6 * n.d * g; }
      return [dn, dr];
    };
    const rim = (u) => 0.6 + 0.4 * Math.sin(2 * Math.PI * 9 * u + ph[0]) * Math.sin(2 * Math.PI * 4 * u + ph[1]);
    const shade = (u, v) => {
      const k = Math.min(1, calc(u, v) / 0.1);
      let c = mix([0.82, 0.74, 0.6], [0.95, 0.94, 0.89], k);                // cuspide fibreuse jaunâtre → calcaire crayeux
      c = mix(c, [0.72, 0.62, 0.5], 0.35 * smooth(0.88, 1, v) * (1 - k));  // bord libre épaissi, remanié
      c = mix(c, ENDO, 1 - smooth(0, 0.07, v));
      const foot = Math.min(1, calc(u, v) / 0.025) * (1 - k);             // pied des amas : ombre de contact
      const ao = 0.6 + 0.4 * (1 - Math.sin(Math.PI * v) * Math.sin(Math.PI * u) * 0.5) - 0.35 * foot;
      return [...c, ao];
    };
    return makeCusp({ t0: s.t0, t1: s.t1, shade, nu: 72, nv: 32, ragged,
      thick: (u, v) => 0.12 + 0.03 * (1 - smooth(0, 0.2, v)) + 0.05 * smooth(0.82, 1, v) * rim(u) + calc(u, v),
      bulge: (u, v) => 0.55 * calc(u, v) });
  };

  const variants = {}, list = [['normale', 'Normale']]; // variante : fonction qui fabrique { max, wob, cusps }
  let cusps3, up, names;
  if (aortic) {
    // ancienne nomenclature de BodyParts3D : antérieure = coronaire droite, postérieure gauche = coronaire gauche,
    // postérieure droite = non coronaire
    const cR = byName(/^Anterior/), cL = byName(/^Left posterior/), cN = byName(/^Right posterior/);
    cusps3 = [cR, cL, cN];
    // convention ASE/EAE (Lang 2012) : cuspide coronaire droite à 6 h, du côté aortique comme du côté ventriculaire
    up = dir(mid(cR)).projectOnPlane(A).normalize().negate();
    names = 'cuspide coronaire droite en bas';
    // — bicuspidie type 1 L-R —
    variants.bicuspide = () => {
      // commissures déplacées : cuspide non coronaire ≈ 150°, cuspide fusionnée L-R ≈ 210°
      const nA = cN.t0 - 0.3, nB = cN.t1 + 0.3;
      const fA = nB - 2 * Math.PI, fB = nA; // cuspide fusionnée : de la commissure N/R à la commissure L/N
      const thR = cL.t0; // ancienne commissure L/R : raphé
      const ur = (thR - fA) / (fB - fA);
      const raphe = (u, v) => gauss(u - ur, 0.035) * (0.35 + 0.65 * smooth(0, 0.75, v));
      const calc = (u, v) => gauss(u - ur, 0.05) * (gauss(v - 0.35, 0.12) + 0.8 * gauss(v - 0.62, 0.1));
      const shadeFused = (u, v) => {
        let c = shadeNormal(u, v).slice(0, 3);
        c = mix(c, [0.94, 0.9, 0.82], Math.min(1, raphe(u, v) * 0.9));   // raphé fibreux, blanchâtre
        c = mix(c, [0.95, 0.93, 0.88], Math.min(1, calc(u, v)));         // calcifications du raphé
        // sillons d'ombre de part et d'autre de la crête du raphé
        const groove = gauss(Math.abs(u - ur) - 0.05, 0.025) * smooth(0, 0.6, v);
        return [...c, 0.62 + 0.3 * (1 - Math.sin(Math.PI * v)) - 0.28 * groove];
      };
      return {
        max: 0.85, wob: 0.02,
        cusps: [
          makeCusp({ t0: fA, t1: fB, raphe: ur, chord: true, shade: shadeFused,
            thick: (u, v) => 0.06 * (1 - smooth(0, 0.18, v)) + 0.045 + 0.08 * raphe(u, v), bulge: (u, v) => 0.08 * raphe(u, v) + 0.12 * calc(u, v) }),
          makeCusp({ t0: nA, t1: nB, chord: true, shade: shadeNormal, thick: (u, v) => 0.05 + 0.04 * (1 - smooth(0, 0.18, v)) }),
        ],
      };
    };
    list.push(['bicuspide', 'Bicuspidie L-R']);
    // — rétrécissement aortique serré dégénératif —
    variants.rao = () => ({ max: 0.18, wob: 0, cusps: cusps3.map((s, i) => calcified(s, i)) });
    list.push(['rao', 'Rétrécissement serré']);
    // — insuffisance aortique par dilatation de la racine (El Khoury type I) —
    // cuspides normales, coaptation basse et défaut de fermeture central : écart de 2,8 mm au centre de chaque bord
    // libre, d'où un orifice triangulaire d'≈ 0,4 cm² (IA importante : orifice régurgitant ≥ 0,30 cm², ESC 2021)
    variants.ia = () => ({ max: 1, wob: 0.03, cusps: cusps3.map((s) => makeCusp({ t0: s.t0, t1: s.t1, shade: shadeNormal, thick: thickNormal, coapt: 0.7, gap: 0.28 })) });
    list.push(['ia', 'Insuffisance']);
  } else {
    // Valve pulmonaire : cuspides droite et gauche face à l'aorte, antérieure à l'opposé (nomenclature actuelle ;
    // BodyParts3D : « antérieure gauche », « antérieure droite », « postérieure »). Reconnues par leur position.
    const ao = heart.landmarks.valves['valve-aortique'].center.clone().sub(C).projectOnPlane(A).normalize();
    const sorted = [...d.cusps].sort((a, b) => dir(mid(a)).dot(ao) - dir(mid(b)).dot(ao));
    const cA = sorted[0]; // la plus éloignée de l'aorte : antérieure (non adjacente)
    const [c1, c2] = sorted.slice(1), cLft = dir(mid(c1)).x > dir(mid(c2)).x ? c1 : c2, cRgt = cLft === c1 ? c2 : c1; // +x : gauche du patient
    cusps3 = [cA, cRgt, cLft];
    up = PULMONARY_UP(dir, mid, { cA, cRgt, cLft, ao, A });
    names = PULMONARY_ORIENT;
    // — rétrécissement pulmonaire valvulaire en dôme —
    variants.stenose = () => {
      const fuse = (u) => gauss(u, 0.06) + gauss(1 - u, 0.06); // raphés de fusion le long des commissures
      const shadeDome = (u, v) => {
        let c = mix([0.92, 0.85, 0.72], [0.88, 0.8, 0.66], Math.sin(Math.PI * v) * 0.4);
        c = mix(c, ENDO, 1 - smooth(0, 0.1, v));
        c = mix(c, [0.95, 0.92, 0.85], Math.min(1, fuse(u) * smooth(0.2, 0.9, v)));
        return [...c, 0.6 + 0.35 * (1 - Math.sin(Math.PI * v) * 0.6) - 0.2 * fuse(u)];
      };
      return {
        max: 1, wob: 0.01,
        // orifice systolique central de quelques millimètres au sommet du dôme : 0,2 R (≈ 6,5 mm de diamètre, ≈ 0,33 cm²)
        cusps: cusps3.map((s) => makeCusp({ t0: s.t0, t1: s.t1, dome: 0.2, shade: shadeDome, thick: (u, v) => 0.07 + 0.03 * (1 - smooth(0, 0.2, v)) + 0.04 * smooth(0.85, 1, v) + 0.03 * fuse(u), bulge: (u, v) => 0.05 * fuse(u) * smooth(0.3, 0.9, v) })),
      };
    };
    list.push(['stenose', 'Rétrécissement']);
  }
  // valve d'une variante, construite et ajoutée au cœur à sa première demande (normale : null, la valve du cœur)
  const built = {};
  const valveOf = (name) => {
    if (!variants[name]) return null;
    if (!built[name]) { const v = variants[name](); built[name] = heart.addValve(id, asValve(v.cusps, v.max, v.wob)); }
    return built[name];
  };
  let current = 'normale';
  const where = aortic ? ['l’aorte', 'la chambre de chasse du VG'] : ['le tronc pulmonaire', 'l’infundibulum du VD'];
  const view = {
    key: kind, title: aortic ? 'Valve aortique' : 'Valve pulmonaire', heartValveId: id, phase: 'sl',
    variantList: list,
    cusps: cusps3, // aortique : coronaire droite, gauche, non coronaire ; pulmonaire : antérieure, droite, gauche
    // C (chirurgicale) : caméra côté artère, dans l'axe de la racine ; on garde le côté ventriculaire, la coupe passe
    //   au-dessus de la jonction sino-tubulaire (sinus et cuspides entiers) ;
    // V (ventriculaire) : caméra dans la chambre de chasse, regard vers l'artère ; on garde le côté artériel, la coupe
    //   passe 1 cm sous la valve : face ventriculaire des cuspides, sinus vus à travers la valve ouverte.
    sides: {
      // (aortique : aortotomie transverse à 2 hauteurs de cuspide, au-dessus de la jonction sino-tubulaire et des ostia
      // coronaires, qui restent visibles dans leurs sinus ; pulmonaire : le tronc de BodyParts3D n'est pas dans l'axe de
      // la valve ; coupe juste au-dessus des cuspides, qui restent entières car coupées 1,5 cm plus loin, pour regarder
      // la valve de face et non un tube oblique)
      C: { camDir: A.clone(), center: C.clone().addScaledVector(A, Hc * (aortic ? 0.8 : 0.5)), dist: aortic ? 11 : 10, up, cut: { normal: A.clone().negate(), def: A.dot(C) + Hc * (aortic ? 2.0 : 1.12) }, interior: 1.5,
        orient: `Vue depuis ${where[0]} · <b>${names}</b>` },
      V: { camDir: A.clone().negate(), center: C.clone().addScaledVector(A, Hc * 0.2), dist: 10, up, cut: { normal: A.clone(), def: -A.dot(C) + 1.0 }, interior: 0.3,
        orient: `Vue depuis ${where[1]} · <b>${names}</b>` },
    },
    get variant() { return current; },
    valveFor: (name) => valveOf(name) ?? heart.valves[id], // objet valve d'une variante (normale : celle du cœur)
    dilationOf: () => 0,
    setVariant(name) { current = name; if (view.active) view.activate(true); },
    active: false,
    activate(on) { view.active = on; heart.useValve(id, on ? valveOf(current) : null); },
  };
  return view;
}
export const buildAorticView = (heart) => buildSLView(heart, 'aortique');
