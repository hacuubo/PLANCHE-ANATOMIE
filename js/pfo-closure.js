// Animation de la fermeture percutanée du FOP (prothèse à double disque de type Amplatzer PFO Occluder, voie veineuse
// fémorale), dans la coupe bicave de la rubrique FOP (oreillette gauche en haut, veine cave supérieure à droite) :
//   1. la gaine de largage remonte la veine cave inférieure, traverse l'oreillette droite, passe par le tunnel du FOP
//      et débouche dans l'oreillette gauche ;
//   2. le disque gauche est poussé hors de la gaine et s'ouvre dans l'oreillette gauche ;
//   3. il est tiré contre la cloison et plaque le FOP du côté gauche ;
//   4. la gaine recule dans l'oreillette droite et libère le disque droit, qui se plaque de l'autre côté ; le col de la
//      prothèse traverse le tunnel ;
//   5. la prothèse est larguée : le câble est dévissé, puis retiré avec la gaine ;
//   6. la cloison est prise entre les deux disques, le FOP est fermé ; le cœur bat, les bulles du test ne passent
//      plus dans l'oreillette gauche.
// Matériel : gaine de ≈ 2,6 mm (8 F), câble de largage, prothèse 25 mm (disque droit 25 mm, disque gauche 18 mm,
// treillis de nitinol garni de polyester, col court articulé). Le cœur est arrêté en diastole pendant la mise en place
// (pose sans déformation) ; à la fin, la prothèse suit le battement de la cloison.
import * as THREE from 'three';

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const CLOSURE_STEPS = [
  { d: 5.0, text: 'Par la veine de l’aine, une gaine fine remonte la veine cave inférieure, traverse l’oreillette droite, passe par le FOP et débouche dans l’oreillette gauche.' },
  { d: 3.5, text: 'On commence par déployer le disque gauche : poussé hors de la gaine, il s’ouvre dans l’oreillette gauche.' },
  { d: 2.8, text: 'Ensuite, on le tire contre la cloison : il plaque le FOP du côté gauche.' },
  { d: 4.0, text: 'Puis la gaine recule et libère le disque droit, qui s’ouvre de l’autre côté de la cloison.' },
  { d: 3.0, text: 'La prothèse est larguée : le câble est dévissé, puis retiré avec la gaine.' },
  { d: 0, text: 'La cloison est prise entre les deux disques : le FOP est fermé, les bulles ne passent plus. En quelques mois, la prothèse sera recouverte par le tissu du cœur.' },
];

// treillis tressé : deux familles de fils en spirale (diagonales dans les coordonnées du tour), sur le tissu de polyester
function braidTexture() {
  const W = 1024, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#c9bc98'; g.fillRect(0, 0, W, H);
  const N = 44, slope = 0.55 * W; // décalage horizontal sur toute la hauteur : un demi-tour (spirales)
  for (const [col, w] of [['#7b6f55', 4.2], ['#f6f1e2', 2.4]]) {
    g.strokeStyle = col; g.lineWidth = w;
    for (const s of [1, -1]) for (let i = 0; i < N; i++) for (const k of [-1, 0, 1]) {
      const x0 = (i / N) * W + k * W;
      g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + s * slope, H); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function createClosureAnimation(heart, view, hooks) {
  const fo = heart.fossa;
  let built = null, playing = false, shown = false, t = 0, step = -1, tail = -1, tunnelOpen = true;
  const build = () => {
    const [T0, T1, T2] = fo.tunnel, n = fo.n, dT = T2.clone().sub(T0).normalize();
    // trajet : veine cave inférieure, oreillette droite, tunnel du FOP, oreillette gauche
    const cav = fo.svc.clone().sub(fo.ivc).normalize();
    const route = [fo.ivc.clone().addScaledVector(cav, -3), fo.ivc.clone(), fo.ivc.clone().lerp(T0, 0.45).addScaledVector(n, -0.6),
      T0.clone().addScaledVector(dT, -1.3), T0.clone(), T1.clone(), T2.clone(), T2.clone().addScaledVector(dT, 0.5).addScaledVector(n, 0.4), T2.clone().addScaledVector(dT, 0.8).addScaledVector(n, 1.0)];
    const curve = new THREE.CatmullRomCurve3(route, false, 'centripetal'), L = curve.getLength(), S = 700;
    const samples = curve.getSpacedPoints(S), uOf = (p) => { let b = 0; samples.forEach((q, i) => { if (q.distanceTo(p) < samples[b].distanceTo(p)) b = i; }); return (b / S) * L; };
    const group = new THREE.Group(); group.visible = false; heart.root.add(group);
    const tube = (r, rs, mat) => { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, S, r, rs, false), mat); m.frustumCulled = false; m.userData.rs = rs; group.add(m); return m; };
    const sheath = tube(0.13, 18, new THREE.MeshPhysicalMaterial({ color: 0x2c62d3, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
    const tip = tube(0.135, 18, new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.4, roughness: 0.3 })); // bout radio-opaque
    const cable = tube(0.04, 8, new THREE.MeshStandardMaterial({ color: 0x9aa1a9, metalness: 0.8, roughness: 0.3 }));
    const range = (m, u0, u1) => {
      const i0 = Math.max(0, Math.floor((u0 / L) * S)), i1 = Math.min(S, Math.ceil((u1 / L) * S)), per = m.userData.rs * 6;
      m.visible = i1 > i0; m.geometry.setDrawRange(i0 * per, Math.max(0, i1 - i0) * per);
    };
    // disques : lentille aplatie (super-ellipse), axe Y local de l'OD vers l'OG ; treillis, moyeu
    const braid = braidTexture();
    const disc = (R, h, hubSide) => {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const th = -Math.PI / 2 + (i / 24) * Math.PI, c = Math.cos(th), s = Math.sin(th);
        pts.push(new THREE.Vector2(Math.max(0.004, R * Math.sign(c) * Math.abs(c) ** 0.4), (h / 2) * Math.sign(s) * Math.abs(s) ** 0.6));
      }
      const tex = braid.clone(); tex.needsUpdate = true; tex.repeat.set(1, 1);
      const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.45, roughness: 0.4, side: THREE.DoubleSide }));
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.85, roughness: 0.25 }));
      hub.position.y = hubSide * (h / 2 + 0.06);
      const g = new THREE.Group(); g.add(m, hub);
      g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      group.add(g);
      return g;
    };
    const dL = disc(0.9, 0.22, 1), dR = disc(1.25, 0.24, -1);
    // col : du moyeu du disque gauche à celui du disque droit, à travers le tunnel
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), new THREE.MeshStandardMaterial({ color: 0xc9bc98, metalness: 0.4, roughness: 0.45 }));
    waist.frustumCulled = false; group.add(waist);
    // poses sur la cloison : les deux disques centrés sur le milieu du tunnel, chacun contre une face de la cloison
    // (endocarde des oreillettes ou limbe, mesurés par lancer de rayons depuis le milieu du tunnel, au repos), le droit
    // couvrant aussi la fosse ; le col traverse le tunnel perpendiculairement à la cloison
    const both = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), targets = [];
    heart.root.traverse((o) => { if (o.isMesh && (o.userData.id === 'cavites' || (o.userData.id === 'septum-interauriculaire' && !o.userData.pfo))) { const m = new THREE.Mesh(o.geometry, both); m.matrixWorld.copy(o.matrix); targets.push(m); } });
    const rc = new THREE.Raycaster();
    const face = (dir, fallback) => { rc.set(T1, dir); const h = rc.intersectObjects(targets, false)[0]; return h && h.distance < 1.2 ? h.distance : fallback; };
    const CL = T1.clone().addScaledVector(n, face(n, n.dot(T2) - n.dot(T1)) + 0.12);
    const CR = T1.clone().addScaledVector(n, -face(n.clone().negate(), n.dot(T1) - n.dot(T0)) - 0.13);
    const uLA = L, uT2 = uOf(T2), uT0 = uOf(T0), uR = uOf(T0.clone().addScaledVector(dT, -0.9));
    const Y = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), Tg = new THREE.Vector3();
    const at = (u) => { const f = Math.min(1, Math.max(0, u / L)); curve.getPointAt(f, P); curve.getTangentAt(f, Tg); return P; };
    return { group, sheath, tip, cable, range, dL, dR, waist, CL, CR, n, L, uLA, uT2, uT0, uR, Y, P, Tg, at, cav, T1 };
  };
  // pose d'un disque : centre, axe (de l'OD vers l'OG), ouverture o (0 : replié, allongé dans la gaine ; 1 : ouvert)
  const _q = new THREE.Quaternion();
  const setDisc = (d, c, axis, o) => {
    d.visible = o > 0.001;
    if (!d.visible) return;
    const s = 0.1 + 0.9 * ease(o), ax = 1 + 4 * (1 - ease(o));
    d.position.copy(c); d.quaternion.copy(_q.setFromUnitVectors(built.Y, axis)); d.scale.set(s, ax, s);
  };
  const off = new THREE.Vector3(), _p = new THREE.Vector3();
  // état de la scène au temps t (s) depuis le début
  const pose = () => {
    const b = built, starts = [];
    let acc = 0; for (const s of CLOSURE_STEPS) { starts.push(acc); acc += s.d; }
    const ph = (k) => (CLOSURE_STEPS[k].d ? Math.min(1, Math.max(0, (t - starts[k]) / CLOSURE_STEPS[k].d)) : t >= starts[k] ? 1 : 0);
    const k = Math.max(0, starts.findLastIndex((s0) => t >= s0));
    // bout de la gaine : avance (1), recul au débouché du tunnel (3), dans l'oreillette droite (4), retrait (5)
    let uTip = b.uLA * ease(ph(0));
    if (ph(2) > 0) uTip = b.uLA + (b.uT2 - 0.15 - b.uLA) * ease(ph(2));
    if (ph(3) > 0) uTip = b.uT2 - 0.15 + (b.uR - b.uT2 + 0.15) * ease(ph(3) / 0.6);
    const out = ease((ph(4) - 0.3) / 0.7) * 9; // retrait de la gaine et du câble
    if (ph(4) > 0) uTip = b.uR - out;
    b.range(b.sheath, 0, Math.max(0, uTip - 0.3)); b.range(b.tip, Math.max(0, uTip - 0.3), Math.max(0, uTip));
    // disque gauche : sort du bout de la gaine dans l'OG (2), puis plaqué contre la cloison (3)
    const tipP = b.at(uTip).clone(), tipT = b.Tg.clone();
    const o1 = ease(ph(1)), pull = ease(ph(2));
    const front = tipP.clone().addScaledVector(tipT, 0.12 + 0.55 * (1 - o1) + 0.25 * o1);
    const axL = tipT.clone().lerp(b.n, pull).normalize();
    setDisc(b.dL, front.lerp(b.CL, pull), axL, ph(1) > 0 ? Math.max(0.02, o1) : 0);
    // disque droit : s'ouvre quand la gaine a reculé sous l'entrée du tunnel (4)
    const o2 = ease((ph(3) - 0.3) / 0.6);
    const rIn = b.at(Math.max(uTip, b.uR)).clone().addScaledVector(b.Tg, 0.4 * (1 - o2));
    setDisc(b.dR, rIn.lerp(b.CR, o2), b.Tg.clone().lerp(b.n, Math.min(1, o2 * 1.5)).normalize(), ph(3) > 0.3 ? Math.max(0.02, o2) : 0);
    // col : visible dès que le disque droit sort
    b.waist.visible = b.dR.visible;
    if (b.waist.visible) {
      const a = b.dL.position, c = b.dR.position, len = a.distanceTo(c);
      b.waist.position.copy(a).add(c).multiplyScalar(0.5); b.waist.quaternion.setFromUnitVectors(b.Y, _p.copy(a).sub(c).normalize()); b.waist.scale.set(1, len, 1);
    }
    // câble : jusqu'au moyeu du disque droit (sous le disque gauche avant), dévissé puis retiré (5)
    const gap = ease(ph(4) / 0.3) * 0.5;
    const uCab = (ph(3) > 0.3 ? b.uT0 - 0.3 : uTip + 0.3) - gap - out;
    b.range(b.cable, 0, ph(0) >= 1 ? Math.max(0, uCab) : 0);
    b.sheath.visible &&= ph(4) < 1; b.tip.visible &&= ph(4) < 1; b.cable.visible &&= ph(4) < 1;
    // tunnel écrasé entre les deux disques : refermé au largage (caché alors par le disque droit)
    const open = ph(4) <= 0;
    if (open !== tunnelOpen) { tunnelOpen = open; heart.setPFO(open); }
    return k;
  };
  // en place (fin) : la prothèse suit le battement de la cloison (déplacement du point entre les deux disques)
  const follow = () => {
    const b = built, c = b.CL.clone().lerp(b.CR, 0.5);
    off.copy(heart.deformPoint(_p.copy(c), 0.38)).sub(c);
    b.group.position.copy(off);
  };
  // cadrages : [instant (s), plan] ; plans : gaine (A), disque gauche vu de l'OG (B), disque droit vu de l'OD (C),
  // coupe bicave de la vue (D)
  let shots = null;
  const shotsOf = () => {
    const b = built, sd = view.sides.C, d0 = sd.camDir, n = b.n, k = Math.PI / 180 * 52;
    const mk = (center, dir, dist, up) => ({ center, dir: dir.normalize(), dist, up });
    const A = mk(fo.ivc.clone().lerp(b.T1, 0.62), d0.clone(), 17, sd.up.clone());
    const B = mk(b.CL.clone().addScaledVector(n, 0.2), d0.clone().multiplyScalar(Math.cos(k)).addScaledVector(n, Math.sin(k)), 8.5, sd.up.clone());
    const C = mk(b.CR.clone().addScaledVector(n, -0.2), d0.clone().multiplyScalar(Math.cos(k)).addScaledVector(n, -Math.sin(k)), 9, sd.up.clone());
    const D = mk(sd.center.clone(), d0.clone(), sd.dist, sd.up.clone());
    return [[0, A], [4.0, A], [5.6, B], [10.6, B], [12.2, C], [16.3, C], [18.3, D]];
  };
  const _qa = new THREE.Quaternion();
  const frameAt = () => {
    shots ??= shotsOf();
    let i = 0; while (i < shots.length - 1 && t >= shots[i + 1][0]) i++;
    const [ta, a] = shots[i], [tb, b] = shots[Math.min(i + 1, shots.length - 1)], f = b === a ? 0 : ease((t - ta) / (tb - ta));
    _qa.setFromUnitVectors(a.dir, b.dir); const dir = a.dir.clone().applyQuaternion(new THREE.Quaternion().slerp(_qa, f));
    return { center: a.center.clone().lerp(b.center, f), dir, dist: a.dist * Math.pow(b.dist / a.dist, f), up: a.up.clone().lerp(b.up, f).normalize() };
  };
  const api = {
    steps: CLOSURE_STEPS,
    get playing() { return playing; },
    get step() { return step; },
    get shown() { return shown; },
    play() {
      built ??= build();
      t = -1.2; step = -1; playing = true; shown = true; tail = -1;
      built.group.visible = true; built.group.position.set(0, 0, 0);
      tunnelOpen = true; heart.setPFO(true);
      pose();
      hooks.caption(0, CLOSURE_STEPS[0].text);
    },
    // arrêt (autre vue) : matériel retiré
    stop() {
      if (!built) return;
      playing = false; shown = false; step = -1; tail = -1;
      built.group.visible = false;
      tunnelOpen = true; heart.setPFO(view.active); // FOP rouvert (tunnel affiché tant que la vue est ouverte)
      hooks.caption(-1, '');
    },
    frame: () => frameAt(),
    seek(x) { if (!playing) return; t = x - 1e-3; api.update(1e-3); },
    update(dt) {
      if (tail >= 0 && (tail += dt) > 12) { tail = -1; if (!playing) hooks.caption(-1, ''); } // légende finale : 12 s
      if (shown && !playing) { follow(); return; }
      if (!playing) return;
      t += dt;
      const k = pose();
      if (k !== step) {
        step = k; hooks.caption(k, CLOSURE_STEPS[k].text);
        if (k === CLOSURE_STEPS.length - 1) { playing = false; tail = 0; hooks.finish(); }
      }
    },
  };
  return api;
}
