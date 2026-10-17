// Vue chirurgicale de la valve aortique : racine aortique ouverte au-dessus de la jonction sino-tubulaire, regardée
// depuis l'aorte (aortotomie, chirurgien à droite du patient). Repères réels de la valve (heart.bin : centre, axe,
// rayon, secteurs des cuspides). Trois variantes :
//   - normale : trois cuspides fines (coronaire droite R, coronaire gauche L, non coronaire N), fermeture en Y,
//     ouverture triangulaire large ;
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
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Shell, Opening, smooth, mix, ENDO, CLAIRE, NODULE, nodule } from './valves.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const gauss = (x, s) => Math.exp(-((x / s) ** 2));
// petit générateur pseudo-aléatoire reproductible (même valve à chaque chargement)
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// Matériaux de la vue : uniformes de mise en retrait (mode focus) et de sélection propres, avant toute compilation
export const isolate = (m) => { const u = m.userData.uniforms; if (u) { u.uFocus = { value: 0 }; u.uSel = { value: -2 }; } return m; };

export function buildAorticView(heart) {
  const d = heart.valveData['valve-aortique'];
  const C = V(d.center), A = V(d.axis).normalize(), E1 = V(d.e1), E2 = V(d.e2);
  const R = d.radius, Hc = d.height;
  const dir = (th, out = new THREE.Vector3()) => out.copy(E1).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th)).normalize();
  const byName = (re) => d.cusps.find((c) => re.test(c.name));
  // ancienne nomenclature de BodyParts3D : antérieure = coronaire droite, postérieure gauche = coronaire gauche,
  // postérieure droite = non coronaire
  const cR = byName(/^Anterior/), cL = byName(/^Left posterior/), cN = byName(/^Right posterior/);
  const group = new THREE.Group();
  group.visible = false;

  const ostiumLabels = [];
  /* ── racine aortique : sinus de Valsalva, jonction sino-tubulaire, chambre de chasse ── */
  const HS = Hc * 1.15, HT = HS, HB = -0.9; // bord coupé à la jonction sino-tubulaire
  const FLARE = Math.tan(0.6); // aorte ouverte et écartée : les sinus et les ostia restent visibles d'en haut
  const sectors = [cR, cL, cN];
  const lobe = (th) => { // 0 aux commissures, 1 au milieu d'un sinus
    for (const s of sectors) { const t = ((th - s.t0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), span = s.t1 - s.t0; if (t <= span) return Math.sin(Math.PI * t / span); }
    return 0;
  };
  const rootR = (th, h) => {
    if (h < 0) return R * (0.93 + 0.07 * smooth(HB, 0, h));
    const l = lobe(th);
    if (h <= HS / 2) return R * (1 + 0.2 * Math.sin(Math.PI * h / HS) * l);
    return R * (1 + 0.2 * l) + l * FLARE * (h - HS / 2); // pas de surplomb au-dessus des sinus
  };
  {
    const nT = 132, nH = 46, wall = 0.2;
    const pos = [], col = [], tis = [], idx = [];
    const push = (p, c, ao) => { pos.push(p.x, p.y, p.z); col.push(...c.map((x) => Math.round(x * 255)), Math.round(ao * 255)); tis.push(0, 255, 0, 255); };
    const P = new THREE.Vector3();
    // paroi interne (vue de l'intérieur) puis paroi externe (épaisseur visible au bord coupé)
    for (const side of [0, 1]) {
      const base = pos.length / 3;
      for (let j = 0; j <= nH; j++) for (let i = 0; i <= nT; i++) {
        const th = (i / nT) * 2 * Math.PI, h = HB + (HT - HB) * (j / nH);
        P.copy(C).addScaledVector(dir(th), rootR(th, h) + side * wall).addScaledVector(A, h);
        // intima ivoire-rosée ; chambre de chasse (sous l'anneau) plus rouge et plus sombre ; fond des sinus ombré
        const lv = 1 - smooth(-0.35, 0.05, h);
        const c = mix([0.93, 0.84, 0.77], [0.72, 0.36, 0.37], lv);
        const ao = side ? 0.9 : (0.45 + 0.55 * smooth(HB, 0.2, h)) * (1 - 0.18 * lobe(th) * Math.sin(Math.PI * Math.min(1, Math.max(0, h / HS))));
        push(P, c, ao);
      }
      for (let j = 0; j < nH; j++) for (let i = 0; i < nT; i++) {
        const a = base + j * (nT + 1) + i, b = a + 1, c2 = a + nT + 1, dd = c2 + 1;
        if (side) idx.push(a, b, c2, b, dd, c2); else idx.push(a, c2, b, b, c2, dd);
      }
    }
    // bord coupé de l'aorte (au-dessus de la jonction sino-tubulaire)
    const top = pos.length / 3;
    for (const side of [0, 1]) for (let i = 0; i <= nT; i++) {
      const th = (i / nT) * 2 * Math.PI;
      P.copy(C).addScaledVector(dir(th), rootR(th, HT) + side * wall).addScaledVector(A, HT);
      push(P, [0.88, 0.7, 0.64], 1);
    }
    for (let i = 0; i < nT; i++) { const a = top + i, b = a + 1, c2 = top + nT + 1 + i, dd = c2 + 1; idx.push(a, c2, b, b, c2, dd); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('col', new THREE.BufferAttribute(new Uint8Array(col), 4, true));
    g.setAttribute('tis', new THREE.BufferAttribute(new Uint8Array(tis), 4, true));
    g.setIndex(idx);
    g.computeVertexNormals();
    const root = new THREE.Mesh(g, isolate(heart.material('vue-aortique', 'intima')));
    root.castShadow = true; root.receiveShadow = true;
    group.add(root);
    // fond : cavité du ventricule gauche dans l'ombre, vue à travers la valve ouverte
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R * 0.95, 64), new THREE.MeshBasicMaterial({ color: 0x3d1216 }));
    floor.position.copy(C).addScaledVector(A, HB + 0.02);
    floor.lookAt(floor.position.clone().add(A));
    group.add(floor);
    // ostia des artères coronaires (sinus droit et gauche), juste sous la jonction sino-tubulaire
    const rimMat = new THREE.MeshPhysicalMaterial({ color: 0xd99a92, roughness: 0.45, clearcoat: 0.5 });
    for (const [s, name] of [[cR, 'Ostium coronaire droit'], [cL, 'Ostium coronaire gauche']]) {
      const th = (s.t0 + s.t1) / 2, h = Hc * 0.92, n = dir(th).addScaledVector(A, -FLARE).normalize(); // normale de la paroi évasée
      const p = C.clone().addScaledVector(dir(th), rootR(th, h)).addScaledVector(n, -0.015).addScaledVector(A, h);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshBasicMaterial({ color: 0x2a0b0e }));
      hole.position.copy(p); hole.lookAt(p.clone().sub(n));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.04, 12, 40), rimMat);
      rim.position.copy(p); rim.lookAt(p.clone().sub(n));
      group.add(hole, rim);
      ostiumLabels.push([p.clone().addScaledVector(A, 0.35), name]);
    }
  }

  /* ── cuspides ── */
  const valveMat = heart.material('vue-aortique', 'valve');
  isolate(valveMat);
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
      Hp.copy(C).addScaledVector(tD, rootR(th, h) * 0.985).addScaledVector(A, h);
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
      out.addScaledVector(A, -0.3 * Hc * b * (1 - open)).addScaledVector(tD, 0.12 * R * b * open);
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

  const label = (text, p) => {
    const el = document.createElement('div'); el.className = 'ao-label'; el.textContent = text;
    const o = new CSS2DObject(el); o.position.copy(p); o.visible = false; group.add(o); return o;
  };
  const labelAt = (th, text, r = 0.62, h = 1.25) => label(text, C.clone().addScaledVector(dir(th), R * r).addScaledVector(A, Hc * h));
  const mid = (s) => (s.t0 + s.t1) / 2;

  const variants = {};
  // — valve normale —
  variants.normale = {
    max: 1, wob: 0.03,
    cusps: [cR, cL, cN].map((s) => makeCusp({ t0: s.t0, t1: s.t1, shade: shadeNormal, thick: thickNormal })),
    labels: [labelAt(mid(cR), 'Coronaire droite (R)'), labelAt(mid(cL), 'Coronaire gauche (L)'), labelAt(mid(cN), 'Non coronaire (N)')],
  };
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
      labels: [labelAt(fA + (fB - fA) * 0.75, 'Cuspide fusionnée L-R'), label('Raphé', C.clone().addScaledVector(dir(thR), R * 0.55).addScaledVector(A, Hc * 0.95)), labelAt(mid({ t0: nA, t1: nB }), 'Non coronaire (N)')],
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
      labels: [labelAt(mid(cR), 'Coronaire droite (R)'), labelAt(mid(cL), 'Coronaire gauche (L)'), labelAt(mid(cN), 'Non coronaire (N)')],
    };
  }
  const commonLabels = ostiumLabels.map(([p, t]) => label(t, p));
  for (const v of Object.values(variants)) {
    v.op = new Opening([14, 0.75], [9, 0.65], 0);
    for (const c of v.cusps) { c.shell.mesh.visible = false; group.add(c.shell.mesh); }
  }

  let current = 'normale', dirty = true;
  const draw = (v, time, live) => {
    const wob = live && v.wob ? (u, w) => v.wob * w * w * Math.sin(2 * Math.PI * 9 * time + 12 * u) * Math.max(0, v.op.tip.x) : null;
    for (const c of v.cusps) c.shell.updateOpen((w) => v.op.at(w), null, 0, wob);
  };
  let labelsOn = true;
  const view = {
    key: 'aortique', title: 'Valve aortique', heartValveId: 'valve-aortique', phase: 'sl',
    variantList: [['normale', 'Normale'], ['bicuspide', 'Bicuspidie L-R'], ['rao', 'Rétrécissement serré']],
    orient: 'Vue depuis l’aorte · chirurgien <b>à droite</b> du patient',
    group, variants,
    center: C.clone().addScaledVector(A, Hc * 0.55), axis: A.clone(),
    camDir: A.clone(), focus: C.clone().addScaledVector(A, Hc * 0.4), dist: 11.5, // caméra côté aorte
    // chirurgien à droite du patient : le côté gauche du patient en haut de l'image
    up: new THREE.Vector3(1, 0, 0).projectOnPlane(A).normalize(),
    get variant() { return current; },
    setVariant(name) { current = name; dirty = true; view.setVisible(group.visible); },
    showLabels(on) { labelsOn = on; view.setVisible(group.visible); },
    setVisible(on) {
      group.visible = on;
      for (const [k, v] of Object.entries(variants)) {
        for (const c of v.cusps) c.shell.mesh.visible = on && k === current;
        for (const l of v.labels) l.visible = on && labelsOn && k === current;
      }
      for (const l of commonLabels) l.visible = on && labelsOn;
      dirty = true;
    },
    // open : 0 fermée → 1 ouverture maximale de la variante
    step(open, dt, time, live) {
      if (!group.visible) return false;
      const v = variants[current];
      v.op.target = open * v.max;
      v.op.step(dt);
      const moving = v.op.moving || (live && v.wob > 0);
      if (moving || dirty) { draw(v, time, live); dirty = false; }
      return moving;
    },
  };
  return view;
}
