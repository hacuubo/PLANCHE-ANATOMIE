// Vues de la valve aortique, tirées du cœur lui-même, coupé perpendiculairement à l'axe de la racine : C (chirurgicale),
// depuis l'aorte, coupe au-dessus de la jonction sino-tubulaire (aortotomie) ; V (ventriculaire), depuis la chambre de
// chasse du VG. Cuspide coronaire droite à 6 h dans les deux cas (convention ASE/EAE, Lang 2012). Les variantes
// pathologiques remplacent la valve du cœur à sa place (heart.useValve) et battent avec lui.
//   - normale : la valve du cœur — trois cuspides fines (coronaire droite R, coronaire gauche L, non coronaire N),
//     fermeture en Y, ouverture triangulaire large ;
//   - bicuspidie de type 1 L-R (classification de Sievers, ≈ 75-80 % des bicuspidies) : cuspides coronaires droite
//     et gauche fusionnées en une cuspide unique plus grande, crête de fusion (raphé) partiellement calcifiée, ligne
//     d'attache abaissée au niveau du raphé, deux commissures ; fermeture sur une ligne, ouverture en « bouche de
//     poisson » ;
//   - rétrécissement aortique serré dégénératif : trois cuspides séparées (commissures libres) mais épaissies et
//     rigides, nodules calcaires sur la face aortique, d'abord à la base puis le long de la ligne de fermeture, bord
//     libre épargné ; ouverture réduite à un petit orifice.
// Sources de représentation : anatomopathologie des valves natives (calcifications basales de la face aortique,
// commissures non soudées), classification de Sievers (type 1, raphé L-R), aspect en bouche de poisson.
import * as THREE from 'three';
import { Shell, Opening, smooth, mix, ENDO, CLAIRE, NODULE, nodule } from './valves.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const gauss = (x, s) => Math.exp(-((x / s) ** 2));
// petit générateur pseudo-aléatoire reproductible (même valve à chaque chargement)
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

export function buildAorticView(heart) {
  const id = 'valve-aortique', d = heart.valveData[id];
  const C = V(d.center), A = V(d.axis).normalize(), E1 = V(d.e1), E2 = V(d.e2);
  const R = d.radius, Hc = d.height;
  const dir = (th, out = new THREE.Vector3()) => out.copy(E1).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th)).normalize();
  const byName = (re) => d.cusps.find((c) => re.test(c.name));
  // ancienne nomenclature de BodyParts3D : antérieure = coronaire droite, postérieure gauche = coronaire gauche,
  // postérieure droite = non coronaire
  const cR = byName(/^Anterior/), cL = byName(/^Left posterior/), cN = byName(/^Right posterior/);
  /* ── cuspides ── */
  const valveMat = heart.material('valve-aortique', 'valve'); // même matériau que la valve du cœur (coupes, ombres)
  const tD = new THREE.Vector3(), Hp = new THREE.Vector3(), Fc = new THREE.Vector3(), Fo = new THREE.Vector3(), Q0 = new THREE.Vector3(), Q1 = new THREE.Vector3(), M = new THREE.Vector3(), U = new THREE.Vector3(), Wv = new THREE.Vector3();
  // spec : t0, t1 (angles des commissures), raphe (u du raphé, facultatif), chord (fermeture sur une ligne : bicuspidie),
  // shade, thick, bulge. Bord libre ouvert : tricuspide → triangle à côtés bombés entre les commissures (orifice
  // systolique triangulaire) ; bicuspide → demi-ellipse allongée entre les deux commissures (« bouche de poisson »).
  const makeCusp = (spec) => {
    const { t0, t1, raphe = null, chord = false } = spec;
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
      } else { // fermeture en Y, nodule au centre
        const s = u < 0.5 ? 1 - 2 * u : 2 * u - 1;
        Fc.copy(C).addScaledVector(A, Hc * (0.8 + 0.06 * (1 - s))).addScaledVector(dir(u < 0.5 ? t0 : t1), R * 0.98 * s).addScaledVector(dir(t0 + span / 2), 0.02);
      }
      Q0.copy(C).addScaledVector(dir(t0), R * 0.97); Q1.copy(C).addScaledVector(dir(t1), R * 0.97);
      M.copy(Q0).add(Q1).multiplyScalar(0.5); U.copy(Q0).sub(M);
      Wv.copy(dir(t0 + span / 2)).projectOnPlane(A).addScaledVector(U, -Wv.dot(U) / Math.max(U.lengthSq(), 1e-6)).normalize();
      if (chord) { // demi-ellipse : demi-grand axe = demi-distance des commissures, demi-petit axe 0,42 R
        Fo.copy(M).addScaledVector(U, Math.cos(Math.PI * u)).addScaledVector(Wv, R * 0.42 * Math.sin(Math.PI * u));
      } else { // côté du triangle, bombé vers la paroi
        Fo.copy(Q0).lerp(Q1, u).addScaledVector(Wv, R * 0.12 * Math.sin(Math.PI * u));
      }
      Fo.addScaledVector(A, Hc * 1.02);
      Fc.lerp(Fo, open);
      out.copy(Hp).lerp(Fc, v);
      const b = Math.sin(Math.PI * v) * belly(u);
      out.addScaledVector(A, -0.3 * Hc * b * (1 - open)).addScaledVector(tD, 0.06 * R * b * open); // ventre vers le sinus, sans toucher la paroi
      return out;
    };
    const shell = new Shell(44, 28, valveMat, spec.shade, spec.thick, spec.bulge ?? null);
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


  const variants = {};
  // — valve normale —
  // — bicuspidie type 1 L-R —
  {
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
    variants.bicuspide = {
      max: 0.85, wob: 0.02,
      cusps: [
        makeCusp({ t0: fA, t1: fB, raphe: ur, chord: true, shade: shadeFused,
          thick: (u, v) => 0.06 * (1 - smooth(0, 0.18, v)) + 0.045 + 0.08 * raphe(u, v), bulge: (u, v) => 0.08 * raphe(u, v) + 0.12 * calc(u, v) }),
        makeCusp({ t0: nA, t1: nB, chord: true, shade: shadeNormal, thick: (u, v) => 0.05 + 0.04 * (1 - smooth(0, 0.18, v)) }),
      ],
    };
  }
  // — rétrécissement aortique serré dégénératif —
  {
    const shells = [cR, cL, cN].map((s, i) => {
      const r = rng(97 + i * 31), arc = (s.t1 - s.t0) * R, hv = Hc * 1.05;
      // nodules calcaires : surtout à la base (attache), puis le long de la ligne de fermeture ; bord libre épargné
      const nods = [];
      for (let k = 0; k < 6; k++) nods.push({ u: 0.15 + 0.7 * r(), v: 0.1 + 0.32 * r(), s: 0.22 + 0.16 * r(), h: 0.16 + 0.14 * r() });
      for (let k = 0; k < 3; k++) nods.push({ u: 0.2 + 0.6 * r(), v: 0.6 + 0.14 * r(), s: 0.14 + 0.1 * r(), h: 0.09 + 0.08 * r() });
      const calc = (u, v) => {
        let c = 0;
        for (const n of nods) c += n.h * Math.exp(-(((u - n.u) * arc) ** 2 + ((v - n.v) * hv) ** 2) / (n.s * n.s));
        return c * (0.8 + 0.2 * Math.sin(37 * u + 11 * v) * Math.sin(23 * v + 5 * u)) * (1 - smooth(0.82, 0.95, v));
      };
      const shade = (u, v) => {
        const k = Math.min(1, calc(u, v) / 0.12);
        let c = mix([0.88, 0.8, 0.66], [0.95, 0.94, 0.9], k);                 // cuspide fibreuse → calcaire crayeux
        c = mix(c, ENDO, 1 - smooth(0, 0.08, v));
        const foot = Math.min(1, calc(u, v) / 0.03) * (1 - k);              // pied des nodules : ombre de contact
        const ao = 0.62 + 0.38 * (1 - Math.sin(Math.PI * v) * Math.sin(Math.PI * u) * 0.5) - 0.3 * foot;
        return [...c, ao];
      };
      return makeCusp({ t0: s.t0, t1: s.t1, shade, thick: (u, v) => 0.11 + 0.03 * (1 - smooth(0, 0.2, v)) + calc(u, v), bulge: (u, v) => 0.5 * calc(u, v) });
    });
    variants.rao = {
      max: 0.18, wob: 0, cusps: shells,
    };
  }
  const out = { normale: null };
  for (const [k, v] of Object.entries(variants)) if (k !== 'normale') out[k] = heart.addValve(id, asValve(v.cusps, v.max, v.wob));
  let current = 'normale';
  const view = {
    key: 'aortique', title: 'Valve aortique', heartValveId: id, phase: 'sl',
    variantList: [['normale', 'Normale'], ['bicuspide', 'Bicuspidie L-R'], ['rao', 'Rétrécissement serré']],
    // C (chirurgicale) : caméra côté aorte, dans l'axe de la racine ; on garde le côté ventriculaire, la coupe passe
    //   au-dessus de la jonction sino-tubulaire (sinus de Valsalva et cuspides entiers) ;
    // V (ventriculaire) : caméra dans la chambre de chasse du VG, regard vers l'aorte ; on garde le côté aortique, la
    //   coupe passe 1 cm sous la valve, au-dessus des piliers : face ventriculaire des cuspides, sinus vus à travers la
    //   valve ouverte. Valves voisines (mitrale) coupées près du plan pour ne pas masquer la chambre de chasse.
    sides: (() => {
      // convention ASE/EAE (Lang 2012) : cuspide coronaire droite à 6 h, du côté aortique comme du côté ventriculaire
      const up = dir((cR.t0 + cR.t1) / 2).projectOnPlane(A).normalize().negate();
      return {
        C: { camDir: A.clone(), center: C.clone().addScaledVector(A, Hc * 0.5), dist: 10, up, cut: { normal: A.clone().negate(), def: A.dot(C) + Hc * 1.35 }, interior: 1.5,
          orient: 'Vue depuis l’aorte · <b>cuspide coronaire droite en bas</b>' },
        V: { camDir: A.clone().negate(), center: C.clone().addScaledVector(A, Hc * 0.2), dist: 10, up, cut: { normal: A.clone(), def: -A.dot(C) + 1.0 }, interior: 0.3,
          orient: 'Vue depuis la chambre de chasse du VG · <b>cuspide coronaire droite en bas</b>' },
      };
    })(),
    get variant() { return current; },
    valveFor: (name) => out[name] ?? heart.valves[id], // objet valve d'une variante (normale : celle du cœur)
    dilationOf: () => 0,
    setVariant(name) { current = name; if (view.active) view.activate(true); },
    active: false,
    activate(on) { view.active = on; heart.useValve(id, on ? out[current] : null); },
  };
  return view;
}
