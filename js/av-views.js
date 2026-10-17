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

  // plancher de l'oreillette autour de l'anneau (endocarde), suivant l'anneau de la variante (dilaté ou non)
  const floor = (valve, color) => {
    const nT = 120, nS = 18, pos = [], col = [], tis = [], idx = [], P = new THREE.Vector3(), Q = new THREE.Vector3();
    for (let j = 0; j <= nS; j++) for (let i = 0; i <= nT; i++) {
      const th = (i / nT) * 2 * Math.PI, s = j / nS;
      valve.annulus(th, Q);
      const r = Q.clone().sub(C).projectOnPlane(A);
      P.copy(Q).addScaledVector(r, 0.02 + 0.85 * s).addScaledVector(A, -(0.12 + 1.0 * s * s));
      pos.push(P.x, P.y, P.z);
      const c = mix([0.9, 0.76, 0.69], color, smooth(0, 0.25, s)); // anneau fibreux plus pâle
      col.push(...c.map((x) => Math.round(x * 255)), Math.round((0.62 + 0.38 * smooth(0, 0.6, s)) * 255));
      tis.push(0, 255, 0, 255);
    }
    for (let j = 0; j < nS; j++) for (let i = 0; i < nT; i++) { const a = j * (nT + 1) + i, b = a + 1, c2 = a + nT + 1, dd = c2 + 1; idx.push(a, b, c2, b, dd, c2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('col', new THREE.BufferAttribute(new Uint8Array(col), 4, true));
    g.setAttribute('tis', new THREE.BufferAttribute(new Uint8Array(tis), 4, true));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, wallMat); m.receiveShadow = true; m.castShadow = true;
    return m;
  };
  const floorPoint = (valve, th, s) => {
    const Q = valve.annulus(th, new THREE.Vector3()), r = Q.clone().sub(C).projectOnPlane(A);
    return Q.addScaledVector(r, 0.02 + 0.85 * s).addScaledVector(A, -(0.12 + 1.0 * s * s) - 0.02);
  };
  const hole = (p, n, rx, ry, rot = 0) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x2a0b0e }));
    m.scale.set(rx, ry, 1); m.position.copy(p); m.lookAt(p.clone().add(n)); m.rotateZ(rot); return m;
  };
  const atrialSide = A.clone().negate();
  // fond : cavité ventriculaire dans l'ombre, et têtes des piliers, vues à travers la valve ouverte
  const R = (d.radii[0] + d.radii[1]) / 2;
  const deep = new THREE.Mesh(new THREE.CircleGeometry(R * 1.6, 48), new THREE.MeshBasicMaterial({ color: 0x3d1216 }));
  deep.position.copy(C).addScaledVector(A, 3.2); deep.lookAt(deep.position.clone().add(atrialSide));
  group.add(deep);
  const pilMat = new THREE.MeshPhysicalMaterial({ color: 0xc5636b, roughness: 0.5, clearcoat: 0.4 });

  // variantes : une valve paramétrique par variante (normale / pathologique)
  const make = (opts) => {
    const v = avValve(id, d, valveMat, cordMat, opts);
    const meshes = [...v.meshes, floor(v, mitral ? [0.86, 0.6, 0.58] : [0.84, 0.57, 0.57])];
    for (const h of v.heads) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), pilMat); s.scale.set(1, 1, 1.6); s.position.copy(h); s.lookAt(h.clone().add(A)); meshes.push(s); }
    for (const m of meshes) { m.visible = false; group.add(m); }
    return { valve: v, meshes, labels: [] };
  };
  const variants = {};
  const leafLabel = (valve, re, u, text, lift = 0.35, v = 0.45) => {
    const lf = valve.leaflets.find((l) => re.test(l.name));
    return label(text, lf.point(u, v, 0, new THREE.Vector3()).addScaledVector(atrialSide, lift));
  };
  const ant = d.leaflets.find((l) => /Anterior/.test(l.name)), tAnt = (ant.t0 + ant.t1) / 2;
  const dirOf = (th) => new THREE.Vector3().copy(V(d.e1)).multiplyScalar(Math.cos(th)).addScaledVector(V(d.e2), Math.sin(th));
  let up, extra = [];

  if (mitral) {
    // commissure antérolatérale : celle du côté gauche du patient (+x)
    const tAL = dirOf(ant.t0).x > dirOf(ant.t1).x ? ant.t0 : ant.t1;
    const post = d.leaflets.find((l) => /Posterior/.test(l.name));
    const p1First = Math.abs(Math.atan2(Math.sin(post.t0 - tAL), Math.cos(post.t0 - tAL))) < Math.abs(Math.atan2(Math.sin(post.t1 - tAL), Math.cos(post.t1 - tAL)));
    const uP = (k) => (p1First ? k : 1 - k); // u des festons P1 (k = 1/6), P2 (1/2), P3 (5/6)
    const vaoC = heart.landmarks.valves['valve-aortique'].center;
    up = vaoC.clone().sub(C).projectOnPlane(A).normalize(); // aorte à 12 h
    variants.normale = make({});
    variants.prolapsus = make({ prolapse: { leaflet: /Posterior/, u0: 0.37, u1: 0.63, lift: 0.75, ruptured: true } });
    for (const [k, v] of Object.entries(variants)) {
      v.labels.push(leafLabel(v.valve, /Anterior/, 0.5, 'Feuillet antérieur (A1-A3)', 0.35, 0.2));
      v.labels.push(leafLabel(v.valve, /Posterior/, uP(1 / 6), 'P1'), leafLabel(v.valve, /Posterior/, uP(5 / 6), 'P3'));
      v.labels.push(k === 'prolapsus' ? leafLabel(v.valve, /Posterior/, 0.5, 'P2 prolabé · cordage rompu', 0.95) : leafLabel(v.valve, /Posterior/, 0.5, 'P2'));
    }
    // repères de la vue chirurgicale : auricule gauche (près de la commissure antérolatérale), aorte à 12 h
    const vv = variants.normale.valve;
    const pLAA = floorPoint(vv, tAL + 0.25, 0.7), nLAA = atrialSide.clone().addScaledVector(pLAA.clone().sub(C).projectOnPlane(A).normalize(), -0.6).normalize();
    extra.push(hole(pLAA, nLAA, 0.42, 0.26));
    extra.push(label('Auricule gauche', pLAA.clone().addScaledVector(atrialSide, 0.45)));
    extra.push(label('Aorte', floorPoint(vv, tAnt, 1).addScaledVector(atrialSide, 0.3)));
  } else {
    const sep = d.leaflets.find((l) => /Septal/.test(l.name)), post = d.leaflets.find((l) => /Posterior/.test(l.name));
    const tSep = (sep.t0 + sep.t1) / 2;
    up = dirOf(tSep).projectOnPlane(A).normalize().negate(); // feuillet septal en bas (6 h)
    variants.normale = make({});
    variants.dilatation = make({ dilate: 0.32, gap: 0.12, tether: 0.3 });
    for (const [k, v] of Object.entries(variants)) {
      v.labels.push(leafLabel(v.valve, /Anterior/, 0.5, 'Feuillet antérieur', 0.35, 0.18), leafLabel(v.valve, /Posterior/, 0.5, 'Feuillet postérieur', 0.35, 0.18), leafLabel(v.valve, /Septal/, 0.5, 'Feuillet septal', 0.35, 0.18));
      if (k === 'dilatation') {
        v.labels.push(label('Défaut de coaptation', C.clone().addScaledVector(atrialSide, 0.55)));
        const tFree = tSep - Math.PI * 0.62; // paroi libre, sur le côté de l'image
        v.labels.push(label('Anneau dilaté', floorPoint(v.valve, tFree, 0.15).addScaledVector(atrialSide, 0.35)));
      }
    }
    // sinus coronaire : près de la commissure postéro-septale, sur le plancher de l'oreillette droite
    const tPS = Math.abs(Math.atan2(Math.sin(sep.t0 - post.t1), Math.cos(sep.t0 - post.t1))) < 0.6 ? sep.t0 : sep.t1;
    const pCS = floorPoint(variants.normale.valve, tPS, 0.55);
    extra.push(hole(pCS, atrialSide.clone().addScaledVector(pCS.clone().sub(C).projectOnPlane(A).normalize(), -0.5).normalize(), 0.32, 0.24));
    extra.push(label('Sinus coronaire', pCS.clone().addScaledVector(atrialSide, 0.4)));
  }
  for (const m of extra) if (!m.isCSS2DObject) group.add(m);
  const commonLabels = extra.filter((m) => m.isCSS2DObject);

  let current = 'normale', dirty = true, labelsOn = true;
  const view = {
    key: kind, title: mitral ? 'Valve mitrale' : 'Valve tricuspide', heartValveId: id, phase: 'av',
    variantList: mitral ? [['normale', 'Normale'], ['prolapsus', 'Prolapsus P2']] : [['normale', 'Normale'], ['dilatation', 'Anneau dilaté']],
    orient: mitral ? 'Vue depuis l’oreillette gauche · <b>aorte en haut</b>' : 'Vue depuis l’oreillette droite · <b>septum en bas</b>',
    group, variants,
    center: C.clone().addScaledVector(atrialSide, 0.2), axis: A.clone(),
    camDir: atrialSide.clone(), focus: C.clone(), dist: 10.5, up,
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
