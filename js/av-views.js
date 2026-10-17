// Vues chirurgicales des valves auriculo-ventriculaires, regardées depuis l'oreillette (repères réels de heart.bin).
//
// Valve mitrale (vue du chirurgien, comme en ETO 3D « surgeon's view » : aorte à 12 h, auricule gauche à gauche) :
//   - normale : feuillet antérieur (A1-A3) et feuillet postérieur festonné (P1, P2, P3), fermeture en « sourire » ;
//   - insuffisance mitrale par prolapsus de P2 avec rupture de cordage : le segment P2 n'est plus retenu, il se
//     soulève au-dessus de l'anneau et son bord libre se retourne dans l'oreillette à chaque fermeture (feuillet
//     flottant) ; les cordages rompus flottent dans l'oreillette ; défaut de coaptation en regard de P2, par où le
//     sang reflue. C'est la forme la plus fréquente d'insuffisance mitrale dégénérative.
// Valve tricuspide (vue depuis l'oreillette droite, feuillet septal en bas — présentation habituelle en 3D) :
//   - normale : feuillets antérieur, postérieur et septal, fermeture en Y ;
//   - insuffisance par dilatation de l'anneau (fonctionnelle) : l'anneau s'élargit sur la paroi libre (le versant
//     septal, fixé, se dilate peu), les feuillets, normaux, ne se rejoignent plus et sont attirés vers le ventricule :
//     défaut de coaptation central.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { avValve, smooth, mix } from './valves.js';
import { isolate } from './aortic-view.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export function buildAVView(heart, kind) {
  const mitral = kind === 'mitrale';
  const id = mitral ? 'valve-mitrale' : 'valve-tricuspide';
  const d = heart.valveData[id];
  const C = V(d.center), A = V(d.axis).normalize(); // A : de l'oreillette vers le ventricule
  const group = new THREE.Group();
  group.visible = false;
  const valveMat = isolate(heart.material(`vue-${kind}`, 'valve')), cordMat = isolate(heart.material(`vue-${kind}`, 'cordage'));
  const wallMat = isolate(heart.material(`vue-${kind}`, 'intima'));

  const label = (text, p, cls = '') => {
    const el = document.createElement('div'); el.className = `ao-label${cls}`; el.textContent = text;
    const o = new CSS2DObject(el); o.position.copy(p); o.visible = false; group.add(o); return o;
  };

  // Oreillette ouverte (atriotomie) : la paroi réelle remonte de l'anneau vers l'observateur et s'élargit (cavité),
  // bord coupé épais et écarté en haut ; l'anneau n'est qu'une fine ligne de charnière plus pâle. Repères placés selon
  // les directions réelles du patient (x gauche, y haut, z avant) :
  //   oreillette gauche : endocarde lisse, quatre orifices de veines pulmonaires (en arrière), orifice de l'auricule
  //   gauche (en avant, à gauche) séparé des veines gauches par une crête, fosse ovale sur le septum ;
  //   oreillette droite : veines caves supérieure et inférieure (valvule d'Eustachi), sinus coronaire à la base du
  //   triangle de Koch, fosse ovale et son limbe sur le septum, muscles pectinés de la paroi libre et crête terminale,
  //   auricule droite.
  const atrialSide = A.clone().negate();
  const E1 = V(d.e1), E2 = V(d.e2);
  const angleOf = (w) => { const p = w.clone().projectOnPlane(A); return Math.atan2(p.dot(E2), p.dot(E1)); };
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const H = mitral ? 2.5 : 2.7, WALL = 0.25;
  const otherC = heart.landmarks.valves[mitral ? 'valve-tricuspide' : 'valve-mitrale'].center;
  const septDir = otherC.clone().sub(C); // vers l'autre oreillette : septum interauriculaire
  const W = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
  const sep = d.leaflets.find((l) => /Septal/.test(l.name)), postL = d.leaflets.find((l) => /Posterior/.test(l.name));
  // repères : { th, s (hauteur 0 → 1), rx, ry (cm), depth (> 0 : orifice / fosse ; < 0 : relief), type, color, name }
  const F = [];
  const DARK = [0.22, 0.05, 0.06];
  if (mitral) {
    F.push({ name: 'Auricule gauche', th: angleOf(W(1, 0.35, 0.55)), s: 0.42, rx: 0.55, ry: 0.36, depth: 0.5, type: 'pit' });
    for (const [n, w, s] of [['LSPV', W(0.75, 0.3, -1), 0.72], ['LIPV', W(0.75, -0.35, -1), 0.48], ['RSPV', W(-0.6, 0.3, -1), 0.72], ['RIPV', W(-0.6, -0.35, -1), 0.48]]) {
      F.push({ name: n, th: angleOf(w), s, rx: 0.5, ry: 0.42, depth: 0.55, type: 'pit' });
    }
    // crête entre l'auricule et la veine pulmonaire supérieure gauche
    const a = F[0], b = F[1];
    for (let k = 1; k <= 5; k++) { const t = k / 6; F.push({ th: a.th + wrapA(b.th - a.th) * t, s: a.s + (b.s - a.s) * t, rx: 0.2, ry: 0.2, depth: -0.12, type: 'ridge' }); }
    F.push({ name: 'Fosse ovale', th: angleOf(septDir), s: 0.55, rx: 0.6, ry: 0.45, depth: 0.1, type: 'fossa' });
  } else {
    const sB = septDir.clone().normalize().multiplyScalar(0.35);
    F.push({ name: 'Veine cave supérieure', th: angleOf(W(0, 1, -0.35)), s: 0.72, rx: 0.85, ry: 0.7, depth: 0.6, type: 'pit' });
    const ivc = { name: 'Veine cave inférieure', th: angleOf(W(0, -1, -0.3).add(sB)), s: 0.8, rx: 0.95, ry: 0.75, depth: 0.6, type: 'pit' };
    F.push(ivc);
    F.push({ th: ivc.th, s: 0.6, rx: 0.9, ry: 0.12, depth: -0.12, type: 'ridge' }); // valvule d'Eustachi
    const tPS = Math.abs(wrapA(sep.t0 - postL.t1)) < 0.6 ? sep.t0 : sep.t1; // commissure postéro-septale
    F.push({ name: 'Sinus coronaire', th: tPS + 0.25 * Math.sign(wrapA(ivc.th - tPS)), s: 0.16, rx: 0.32, ry: 0.26, depth: 0.45, type: 'pit' });
    F.push({ name: 'Fosse ovale', th: angleOf(septDir) + 0.25 * Math.sign(wrapA(F[0].th - angleOf(septDir))), s: 0.6, rx: 0.75, ry: 0.6, depth: 0.12, type: 'fossa' });
    F.push({ name: 'Auricule droite', th: angleOf(W(0.15, 0.6, 1)), s: 0.7, rx: 1.0, ry: 0.7, depth: 0.3, type: 'pouch' });
  }
  const tFree = angleOf(septDir.clone().negate());
  // relief (cm, > 0 vers l'extérieur) et teinte en un point (θ, s) de la paroi ; r : rayon local (longueur d'arc)
  const wallAt = (th, s, r) => {
    let disp = 0, dark = 0, pale = 0, trab = 0;
    for (const f of F) {
      const dx = wrapA(th - f.th) * r / f.rx, dy = (s - f.s) * H / f.ry, q = dx * dx + dy * dy;
      if (q > 9) continue;
      const g = Math.exp(-q);
      if (f.type === 'pit') { disp += f.depth * g; dark = Math.max(dark, smooth(0.3, 0.85, g)); }
      else if (f.type === 'ridge') disp += f.depth * g;
      else if (f.type === 'fossa') { const rho = Math.sqrt(q); disp += f.depth * g - 0.1 * Math.exp(-(((rho - 1.15) / 0.25) ** 2)); pale = Math.max(pale, smooth(0.2, 0.7, g)); } // fosse et limbe
      else if (f.type === 'pouch') { disp += f.depth * g; trab = Math.max(trab, g); dark = Math.max(dark, 0.35 * smooth(0.5, 0.95, g)); }
    }
    if (!mitral) { // muscles pectinés de la paroi libre (et de l'auricule), crête terminale à leur limite postérieure
      const off = wrapA(th - tFree), win = (1 - smooth(1.2, 1.7, Math.abs(off))) * smooth(0.18, 0.32, s) * (1 - smooth(0.92, 1, s));
      // colonnes irrégulières : espacement, obliquité et épaisseur variables
      const ph = off * 33 + 8.4 * s + 1.6 * Math.sin(off * 7 + s * 5) + 0.9 * Math.sin(off * 17 - s * 9);
      const pect = Math.pow(Math.max(0, Math.sin(ph)), 5 + 3 * (0.5 + 0.5 * Math.sin(off * 5 + 2))) * Math.max(win, trab) * (0.7 + 0.3 * Math.sin(off * 11 + s * 13));
      const crista = Math.exp(-(((Math.abs(off) - 1.35) / 0.1) ** 2)) * smooth(0.2, 0.35, s) * (1 - smooth(0.9, 1, s));
      disp -= 0.08 * pect + 0.16 * crista;
      trab = Math.max(trab, pect);
    }
    return { disp, dark, pale, trab };
  };
  const base = mitral ? [0.85, 0.64, 0.6] : [0.83, 0.58, 0.56];
  const atrium = (valve) => {
    const nT = 180, nS = 46, pos = [], col = [], tis = [], idx = [];
    const Q = new THREE.Vector3(), P = new THREE.Vector3();
    const point = (th, s, extra, out) => {
      valve.annulus(th, Q);
      const rv = Q.clone().sub(C).projectOnPlane(A), r0 = rv.length(); rv.normalize();
      const widen = r0 * (mitral ? 0.5 : 0.45) * smooth(0, 0.7, s) + 0.55 * smooth(0.85, 1, s) ** 2; // cavité, puis bord écarté
      return { p: out.copy(Q).addScaledVector(rv, widen + extra).addScaledVector(atrialSide, H * s), r: r0 + widen };
    };
    const push = (p, c, ao) => { pos.push(p.x, p.y, p.z); col.push(...c.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255)), Math.round(Math.min(1, Math.max(0, ao)) * 255)); tis.push(0, 255, 0, 255); };
    // paroi interne (endocarde)
    for (let j = 0; j <= nS; j++) for (let i = 0; i <= nT; i++) {
      const th = (i / nT) * 2 * Math.PI, s = j / nS;
      const { r } = point(th, s, 0, P);
      const w = wallAt(th, s, r);
      point(th, s, w.disp, P);
      let c = mix([0.9, 0.79, 0.7], base, smooth(0.0, 0.06, s));        // ligne de charnière de l'anneau, fine et pâle
      c = mix(c, [0.92, 0.8, 0.74], w.pale);                              // fosse ovale plus pâle
      c = mix(c, [0.76, 0.45, 0.45], 0.5 * w.trab);                       // relief musculaire plus rouge
      c = mix(c, DARK, w.dark);                                           // orifices : vers l'ombre des veines
      const ao = (0.55 + 0.45 * smooth(0, 0.6, s)) * (1 - 0.25 * w.trab) * (1 - 0.6 * w.dark);
      push(P, c, ao);
    }
    for (let j = 0; j < nS; j++) for (let i = 0; i < nT; i++) { const a = j * (nT + 1) + i, b = a + 1, c2 = a + nT + 1, dd = c2 + 1; idx.push(a, c2, b, b, c2, dd); }
    // paroi externe et bord coupé (épaisseur du muscle auriculaire)
    const o0 = pos.length / 3;
    for (let j = 0; j <= nS; j += nS) for (let i = 0; i <= nT; i++) { const th = (i / nT) * 2 * Math.PI, s = j / nS; point(th, s, WALL, P); push(P, [0.86, 0.6, 0.56], 0.9); }
    const top0 = o0 + (nT + 1), inTop = nS * (nT + 1);
    for (let i = 0; i < nT; i++) { const a = inTop + i, b = a + 1, c2 = top0 + i, dd = c2 + 1; idx.push(a, b, c2, b, dd, c2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('col', new THREE.BufferAttribute(new Uint8Array(col), 4, true));
    g.setAttribute('tis', new THREE.BufferAttribute(new Uint8Array(tis), 4, true));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, wallMat); m.receiveShadow = true; m.castShadow = true;
    // position d'un repère, un peu en avant de la paroi (pour son étiquette)
    const at = (th, s, inward = 0.35) => { const { r } = point(th, s, 0, P); const p = point(th, s, wallAt(th, s, r).disp, new THREE.Vector3()).p; return p.addScaledVector(p.clone().sub(C).projectOnPlane(A).normalize(), -inward); };
    return { mesh: m, at };
  };
  // fond : cavité ventriculaire dans l'ombre, et têtes des piliers, vues à travers la valve ouverte
  const R = (d.radii[0] + d.radii[1]) / 2;
  const deep = new THREE.Mesh(new THREE.CircleGeometry(R * 1.6, 48), new THREE.MeshBasicMaterial({ color: 0x3d1216 }));
  deep.position.copy(C).addScaledVector(A, 3.2); deep.lookAt(deep.position.clone().add(atrialSide));
  group.add(deep);
  const pilMat = new THREE.MeshPhysicalMaterial({ color: 0xc5636b, roughness: 0.5, clearcoat: 0.4 });

  // variantes : une valve paramétrique par variante (normale / pathologique), avec son oreillette (anneau dilaté compris)
  const make = (opts) => {
    const v = avValve(id, d, valveMat, cordMat, opts);
    const atr = atrium(v);
    const meshes = [...v.meshes, atr.mesh];
    for (const h of v.heads) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), pilMat); s.scale.set(1, 1, 1.6); s.position.copy(h); s.lookAt(h.clone().add(A)); meshes.push(s); }
    for (const m of meshes) { m.visible = false; group.add(m); }
    const labels = [];
    for (const f of F) if (f.name && !/PV$/.test(f.name)) labels.push(label(f.name, atr.at(f.th, f.s)));
    if (mitral) { // veines pulmonaires : une étiquette par côté
      const L = F.filter((f) => /^L.PV$/.test(f.name)), Rv = F.filter((f) => /^R.PV$/.test(f.name));
      labels.push(label('Veines pulmonaires gauches', atr.at((L[0].th + L[1].th) / 2, 0.6, 0.8)), label('Veines pulmonaires droites', atr.at((Rv[0].th + Rv[1].th) / 2, 0.6, 0.8)));
    }
    return { valve: v, meshes, labels, atr };
  };
  const variants = {};
  const leafLabel = (valve, re, u, text, lift = 0.35, v = 0.45) => {
    const lf = valve.leaflets.find((l) => re.test(l.name));
    return label(text, lf.point(u, v, 0, new THREE.Vector3()).addScaledVector(atrialSide, lift));
  };
  const ant = d.leaflets.find((l) => /Anterior/.test(l.name));
  const dirOf = (th) => new THREE.Vector3().copy(E1).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th));
  let up;
  const extra = [];

  if (mitral) {
    // commissure antérolatérale : celle du côté gauche du patient (+x)
    const tAL = dirOf(ant.t0).x > dirOf(ant.t1).x ? ant.t0 : ant.t1;
    const p1First = Math.abs(wrapA(postL.t0 - tAL)) < Math.abs(wrapA(postL.t1 - tAL));
    const uP = (k) => (p1First ? k : 1 - k); // u des festons P1 (k = 1/6), P2 (1/2), P3 (5/6)
    const vaoC = heart.landmarks.valves['valve-aortique'].center;
    up = vaoC.clone().sub(C).projectOnPlane(A).normalize(); // aorte à 12 h
    variants.normale = make({});
    variants.prolapsus = make({ prolapse: { leaflet: /Posterior/, u0: 0.37, u1: 0.63, lift: 1.0, ruptured: true } });
    for (const [k, v] of Object.entries(variants)) {
      v.labels.push(leafLabel(v.valve, /Anterior/, 0.5, 'Feuillet antérieur (A1-A3)', 0.35, 0.2));
      v.labels.push(leafLabel(v.valve, /Posterior/, uP(1 / 6), 'P1'), leafLabel(v.valve, /Posterior/, uP(5 / 6), 'P3'));
      v.labels.push(k === 'prolapsus' ? leafLabel(v.valve, /Posterior/, 0.5, 'P2 prolabé · cordage rompu', 0.95) : leafLabel(v.valve, /Posterior/, 0.5, 'P2'));
    }
    extra.push(label('Aorte (en arrière)', variants.normale.atr.at(angleOf(up), 1, 0.2)));
  } else {
    const tSep = (sep.t0 + sep.t1) / 2;
    up = dirOf(tSep).projectOnPlane(A).normalize().negate(); // feuillet septal en bas (6 h)
    variants.normale = make({});
    variants.dilatation = make({ dilate: 0.32, gap: 0.12, tether: 0.3 });
    for (const [k, v] of Object.entries(variants)) {
      v.labels.push(leafLabel(v.valve, /Anterior/, 0.5, 'Feuillet antérieur', 0.35, 0.18), leafLabel(v.valve, /Posterior/, 0.5, 'Feuillet postérieur', 0.35, 0.18), leafLabel(v.valve, /Septal/, 0.5, 'Feuillet septal', 0.35, 0.18));
      if (k === 'dilatation') {
        v.labels.push(label('Défaut de coaptation', C.clone().addScaledVector(atrialSide, 0.55)));
        v.labels.push(label('Anneau dilaté', v.atr.at(tSep + Math.PI * 0.8, 0.1, 0.15)));
      }
    }
  }
  const commonLabels = extra;

  let current = 'normale', dirty = true, labelsOn = true;
  const view = {
    key: kind, title: mitral ? 'Valve mitrale' : 'Valve tricuspide', heartValveId: id, phase: 'av',
    variantList: mitral ? [['normale', 'Normale'], ['prolapsus', 'Prolapsus P2']] : [['normale', 'Normale'], ['dilatation', 'Anneau dilaté']],
    orient: mitral ? 'Vue depuis l’oreillette gauche · <b>aorte en haut</b>' : 'Vue depuis l’oreillette droite · <b>septum en bas</b>',
    group, variants,
    center: C.clone().addScaledVector(atrialSide, 0.6), axis: A.clone(),
    camDir: atrialSide.clone(), focus: C.clone(), dist: mitral ? 13 : 14.5, up, // recul : on voit la paroi de l'oreillette ouverte
    get variant() { return current; },
    setVariant(name) { current = name; dirty = true; view.setVisible(group.visible); },
    showLabels(on) { labelsOn = on; view.setVisible(group.visible); },
    setVisible(on) {
      group.visible = on;
      for (const [k, v] of Object.entries(variants)) {
        for (const m of v.meshes) m.visible = on && k === current;
        for (const l of v.labels) l.visible = on && labelsOn && k === current;
      }
      for (const l of commonLabels) l.visible = on && labelsOn;
      dirty = true;
    },
    // open : 0 fermée → 1 ouverte (diastole)
    step(open, dt, time, live) {
      if (!group.visible) return false;
      const v = variants[current].valve;
      v.setTarget(open);
      const moving = v.step(dt, time, null, dirty, live);
      dirty = false;
      return moving;
    },
  };
  return view;
}
