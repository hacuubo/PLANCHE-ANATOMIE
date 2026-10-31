// Animation de la fermeture percutanée du FOP (prothèse à double disque de type Amplatzer PFO Occluder, voie veineuse
// fémorale), dans la coupe bicave de la rubrique FOP (oreillette gauche en haut, veine cave supérieure à droite) :
//   1. le FOP : un tunnel entre le rabat du septum primum (côté OG) et le septum secundum (limbe, côté OD) ;
//   2. la gaine de largage remonte la veine cave inférieure, traverse l'oreillette droite, entre dans la fosse, suit le
//      tunnel et débouche dans l'oreillette gauche ;
//   3. le disque gauche est poussé hors de la gaine et s'ouvre dans l'oreillette gauche, à distance de ses parois ;
//   4. il est tiré contre la cloison et plaque le rabat du côté gauche ;
//   5. la gaine recule dans l'oreillette droite et libère le disque droit, qui se plaque de l'autre côté : le rabat est
//      pris contre le limbe, le tunnel s'écrase ; le col de la prothèse le traverse ;
//   6. la prothèse est larguée : le câble est dévissé, puis retiré avec la gaine ;
//   7. la cloison est prise entre les deux disques, le FOP est fermé ; le cœur bat, les bulles du test ne passent
//      plus dans l'oreillette gauche.
// Matériel : gaine de ≈ 2,5 mm (8 F), câble de largage, prothèse 25 mm (disque droit 25 mm, disque gauche 18 mm,
// treillis de nitinol garni de polyester, col court articulé). Le cœur est arrêté en diastole pendant la mise en place
// (pose sans déformation) ; à la fin, la prothèse suit le battement de la cloison.
// Anatomie : la gaine et les disques restent dans les oreillettes. Le point où le disque gauche s'ouvre est choisi
// dans l'OG pour que le disque ouvert (18 mm) en reste à distance (distance signée à l'endocarde de l'OG, au repos) ;
// de même pour l'ouverture du disque droit dans l'OD.
import * as THREE from 'three';

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const CLOSURE_STEPS = [
  { d: 5.0, text: 'Le FOP est un petit tunnel dans la cloison entre les oreillettes : un rabat fin (septum primum, côté gauche) recouvre le bord épais du septum secundum (côté droit) sans y être soudé.' },
  { d: 5.0, text: 'Par la veine de l’aine, une gaine fine remonte la veine cave inférieure, traverse l’oreillette droite, suit le tunnel du FOP et débouche dans l’oreillette gauche.' },
  { d: 3.5, text: 'On commence par déployer le disque gauche : poussé hors de la gaine, il s’ouvre dans l’oreillette gauche.' },
  { d: 2.8, text: 'Ensuite, on le tire contre la cloison : il plaque le rabat du côté gauche.' },
  { d: 4.0, text: 'Puis la gaine recule et libère le disque droit, de l’autre côté : le rabat est pris contre la cloison, le tunnel s’écrase.' },
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
  let built = null, playing = false, shown = false, t = 0, step = -1, tail = -1;
  const RL = 0.9, RR = 1.25; // rayons des disques gauche et droit
  const build = () => {
    const [T0, T1, T2] = fo.tunnel, n = fo.n, dT = fo.tunnelDir;
    // endocarde des oreillettes au repos : distance signée (positive dans la cavité ; normale du sommet le plus proche)
    let cav = null;
    heart.root.traverse((o) => { if (!cav && o.userData.id === 'cavites') cav = o; });
    const cp = cav.geometry.attributes.position, cn = cav.geometry.attributes.normal, cs = cav.userData.sid, wall = { 'oreillette-gauche': [[], []], 'oreillette-droite': [[], []] };
    for (let i = 0; i < cs.length; i += 2) { const w = wall[heart.structureIds[cs[i]]]; if (w) { w[0].push(new THREE.Vector3().fromBufferAttribute(cp, i)); w[1].push(new THREE.Vector3().fromBufferAttribute(cn, i)); } }
    const sd = (side, p) => { const [W, N] = wall[side]; let m = Infinity, j = 0; for (let i = 0; i < W.length; i++) { const d = W[i].distanceToSquared(p); if (d < m) { m = d; j = i; } } return p.clone().sub(W[j]).dot(N[j]) > 0 ? -Math.sqrt(m) : Math.sqrt(m); };
    // marge d'un disque ouvert (centre c, axe ax, rayon r) : plus petite distance signée de son bord et de son centre
    const margin = (side, c, ax, r) => {
      const u = new THREE.Vector3().crossVectors(ax, Math.abs(ax.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize(), v = new THREE.Vector3().crossVectors(ax, u);
      let m = sd(side, c);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * 2 * Math.PI; m = Math.min(m, sd(side, c.clone().addScaledVector(u, r * Math.cos(a)).addScaledVector(v, r * Math.sin(a)))); }
      return m;
    };
    // OG : point d'ouverture du disque gauche, au-delà du débouché du tunnel (le disque s'ouvre 3,7 mm devant le bout
    // de la gaine, son axe dans l'axe de la gaine), le plus loin possible des parois
    const wT = new THREE.Vector3().crossVectors(n, dT).normalize();
    let E = null, best = -Infinity;
    for (let d = 0.8; d <= 2.21; d += 0.2) for (let a = -0.6; a <= 0.61; a += 0.3) for (let bb = -0.6; bb <= 0.61; bb += 0.3) {
      const p = T2.clone().addScaledVector(n, d).addScaledVector(dT, a).addScaledVector(wT, bb), ax = p.clone().sub(T2).normalize();
      const m = margin('oreillette-gauche', p.clone().addScaledVector(ax, 0.37), ax, RL) - 0.02 * d; // à marge égale, le plus près
      if (m > best) { best = m; E = p; }
    }
    // OD : abord de la fosse par en dessous (dans l'axe de la cloison), puis entrée dans la fosse
    const A0 = T0.clone().addScaledVector(n, -0.9).addScaledVector(dT, -0.25);
    // trajet : veine cave inférieure, oreillette droite, fosse, tunnel, oreillette gauche
    const cv = fo.svc.clone().sub(fo.ivc).normalize();
    const route = [fo.ivc.clone().addScaledVector(cv, -3), fo.ivc.clone(), fo.ivc.clone().lerp(A0, 0.5).addScaledVector(n, -0.5), A0,
      T0.clone().addScaledVector(n, -0.35), T0.clone(), T1.clone(), T2.clone(), T2.clone().lerp(E, 0.5).addScaledVector(n, 0.1), E];
    const curve = new THREE.CatmullRomCurve3(route, false, 'centripetal'), L = curve.getLength(), S = 700;
    const samples = curve.getSpacedPoints(S), uOf = (p) => { let b = 0; samples.forEach((q, i) => { if (q.distanceTo(p) < samples[b].distanceTo(p)) b = i; }); return (b / S) * L; };
    const group = new THREE.Group(); group.visible = false; heart.root.add(group);
    const tube = (r, rs, mat) => { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, S, r, rs, false), mat); m.frustumCulled = false; m.userData.rs = rs; group.add(m); return m; };
    const sheath = tube(0.125, 18, new THREE.MeshPhysicalMaterial({ color: 0x2c62d3, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
    const tip = tube(0.13, 18, new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.4, roughness: 0.3 })); // bout radio-opaque
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
    const dL = disc(RL, 0.22, 1), dR = disc(RR, 0.24, -1);
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
    const CL = T1.clone().addScaledVector(n, face(n, 0.3) + 0.12);
    const CR = T1.clone().addScaledVector(n, -face(n.clone().negate(), 0.3) - 0.13);
    // bout de la gaine : dans l'OG (ouverture du disque gauche), au débouché du tunnel, dans l'OD (disque droit)
    const uLA = L, uT2 = uOf(T2), uT0 = uOf(T0), uR = uOf(A0);
    const Y = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), Tg = new THREE.Vector3();
    const at = (u) => { const f = Math.min(1, Math.max(0, u / L)); curve.getPointAt(f, P); curve.getTangentAt(f, Tg); return P; };
    const Efront = E.clone().addScaledVector(E.clone().sub(T2).normalize(), 0.37);
    // disques plaqués : la cloison n'est pas plane (côté OD, elle bombe en avant de la fosse) ; chaque disque s'y
    // conforme comme le treillis souple d'une vraie prothèse — ses points reculent le long de son axe, vers son
    // oreillette, là où la cloison avance (reculs mesurés sur ses sommets dans la pose finale)
    const qN = new THREE.Quaternion().setFromUnitVectors(Y, n);
    const conform = (dsc, C0, R, side, sign) => {
      // recul nécessaire de chaque sommet (disque à plat dans sa pose finale) pour rester dans son oreillette, rangé par
      // case (anneau, secteur) en gardant le plus grand, puis étendu aux cases voisines (sans l'affaiblir)
      const NR = 8, NA = 36, g = Array.from({ length: NR + 1 }, () => new Float32Array(NA)), pt = new THREE.Vector3();
      const geo = dsc.children[0].geometry, pa = geo.attributes.position, base = Float32Array.from(pa.array), dy = new Float32Array(pa.count);
      const cell = (x, z) => { const fr = Math.min(NR, (Math.hypot(x, z) / R) * NR), a2 = ((((Math.atan2(z, x) / (2 * Math.PI)) % 1) + 1) % 1) * NA; return [fr, a2]; };
      const fill = () => { for (let i = 0; i < pa.count; i++) {
        const [fr, a2] = cell(base[3 * i], base[3 * i + 2]), ir = Math.min(NR - 1, Math.floor(fr)), f2 = fr - ir, ia = Math.floor(a2) % NA, ib = (ia + 1) % NA, fa = a2 - Math.floor(a2);
        const v0 = g[ir][ia] + (g[ir][ib] - g[ir][ia]) * fa, v1 = g[ir + 1][ia] + (g[ir + 1][ib] - g[ir + 1][ia]) * fa;
        dy[i] = sign * (v0 + (v1 - v0) * f2);
      } };
      // passes : la paroi qui gêne n'est pas toujours en face — on remesure depuis les positions déjà reculées ; recul
      // plafonné (MAXB) : une légère cuvette, comme une vraie prothèse appliquée, pas un entonnoir
      const MAXB = 0.35;
      for (let it = 0; it < 3; it++) {
        const add = Array.from({ length: NR + 1 }, () => new Float32Array(NA));
        for (let i = 0; i < pa.count; i++) {
          pt.set(base[3 * i], base[3 * i + 1] + dy[i], base[3 * i + 2]).applyQuaternion(qN).add(C0);
          const need = Math.max(0, 0.015 - sd(side, pt)), [fr, a2] = cell(base[3 * i], base[3 * i + 2]);
          const ir = Math.round(fr), ia = Math.round(a2) % NA; add[ir][ia] = Math.max(add[ir][ia], need);
        }
        for (let pass = 0; pass < 2; pass++) for (let ir = 0; ir <= NR; ir++) {
          const c = add[ir].slice();
          for (let ia = 0; ia < NA; ia++) add[ir][ia] = Math.max(c[ia], (c[(ia + NA - 1) % NA] + c[ia] + c[(ia + 1) % NA]) / 3);
        }
        let any = false;
        for (let ir = 0; ir <= NR; ir++) for (let ia = 0; ia < NA; ia++) if (add[ir][ia] > 0.005 && g[ir][ia] < MAXB) { g[ir][ia] = Math.min(MAXB, g[ir][ia] + add[ir][ia]); any = true; }
        if (!any) break;
        for (let ir = NR - 1; ir >= 0; ir--) for (let ia = 0; ia < NA; ia++) g[ir][ia] = Math.max(g[ir][ia], g[ir + 1][ia] * 0.5); // pente douce vers le centre
        fill();
      }
      let w0 = -1;
      return (w) => { // w : 0 plat (ouvert dans l'oreillette), 1 appliqué sur la cloison
        if (Math.abs(w - w0) < 1e-3) return;
        w0 = w;
        for (let i = 0; i < pa.count; i++) pa.setY(i, base[3 * i + 1] + dy[i] * w);
        pa.needsUpdate = true; geo.computeVertexNormals();
      };
    };
    const bendL = conform(dL, CL, RL, 'oreillette-gauche', 1), bendR = conform(dR, CR, RR, 'oreillette-droite', -1);
    return { group, sheath, tip, cable, range, dL, dR, waist, CL, CR, n, L, uLA, uT2, uT0, uR, Y, P, Tg, at, T1, E, Efront, A0, margin, laMargin: best, bendL, bendR };
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
    // bout de la gaine : avance (2), recul au débouché du tunnel (4), dans l'oreillette droite (5), retrait (6)
    let uTip = b.uLA * ease(ph(1));
    if (ph(3) > 0) uTip = b.uLA + (b.uT2 - 0.15 - b.uLA) * ease(ph(3));
    if (ph(4) > 0) uTip = b.uT2 - 0.15 + (b.uR - b.uT2 + 0.15) * ease(ph(4) / 0.55);
    const out = ease((ph(5) - 0.3) / 0.7) * 9; // retrait de la gaine et du câble
    if (ph(5) > 0) uTip = b.uR - out;
    b.range(b.sheath, 0, Math.max(0, uTip - 0.3)); b.range(b.tip, Math.max(0, uTip - 0.3), Math.max(0, uTip));
    // disque gauche : sort du bout de la gaine dans l'OG (3), puis plaqué contre la cloison (4)
    const tipP = b.at(uTip).clone(), tipT = b.Tg.clone();
    const o1 = ease(ph(2)), pull = ease(ph(3));
    const front = tipP.clone().addScaledVector(tipT, 0.12 + 0.55 * (1 - o1) + 0.25 * o1);
    const axL = tipT.clone().lerp(b.n, pull).normalize();
    setDisc(b.dL, front.lerp(b.CL, pull), axL, ph(2) > 0 ? Math.max(0.02, o1) : 0);
    b.bendL(ease((ph(3) - 0.6) / 0.4));
    // disque droit : s'ouvre dans l'OD quand la gaine est sortie de la fosse (5), puis se plaque sur la cloison
    const o2 = ease((ph(4) - 0.3) / 0.55);
    const rIn = b.at(Math.max(uTip, b.uR)).clone().addScaledVector(b.Tg, 0.3 * (1 - o2));
    setDisc(b.dR, rIn.lerp(b.CR, ease((ph(4) - 0.45) / 0.55)), b.Tg.clone().lerp(b.n, Math.min(1, o2 * 1.5)).normalize(), ph(4) > 0.3 ? Math.max(0.02, o2) : 0);
    b.bendR(ease((ph(4) - 0.7) / 0.3));
    // le rabat est pris contre le limbe à mesure que le disque droit vient s'appliquer : le tunnel s'écrase
    heart.setPFOClosure(ease((ph(4) - 0.55) / 0.45));
    // col : visible dès que le disque droit sort
    b.waist.visible = b.dR.visible;
    if (b.waist.visible) {
      const a = b.dL.position, c = b.dR.position, len = a.distanceTo(c);
      b.waist.position.copy(a).add(c).multiplyScalar(0.5); b.waist.quaternion.setFromUnitVectors(b.Y, _p.copy(a).sub(c).normalize()); b.waist.scale.set(1, len, 1);
    }
    // câble : jusqu'au moyeu du disque droit (sous le disque gauche avant), dévissé puis retiré (6)
    const gap = ease(ph(5) / 0.3) * 0.5;
    const uCab = (ph(4) > 0.3 ? b.uT0 - 0.3 : uTip + 0.3) - gap - out;
    b.range(b.cable, 0, ph(1) >= 1 ? Math.max(0, uCab) : 0);
    b.sheath.visible &&= ph(5) < 1; b.tip.visible &&= ph(5) < 1; b.cable.visible &&= ph(5) < 1;
    return k;
  };
  // en place (fin) : la prothèse suit le battement de la cloison (déplacement du point entre les deux disques)
  const follow = () => {
    const b = built, c = b.CL.clone().lerp(b.CR, 0.5);
    off.copy(heart.deformPoint(_p.copy(c), 0.38)).sub(c);
    b.group.position.copy(off);
  };
  // cadrages : [instant (s), plan] ; plans : tunnel en gros plan (O), gaine (A), disque gauche vu de l'OG (B), disque
  // droit vu de l'OD (C), coupe bicave de la vue, rapprochée sur la prothèse (D)
  let shots = null;
  const shotsOf = () => {
    const b = built, sd = view.sides.C, d0 = sd.camDir, n = b.n, k = Math.PI / 180 * 52;
    const mk = (center, dir, dist, up) => ({ center, dir: dir.normalize(), dist, up });
    const O = mk(b.T1.clone().addScaledVector(fo.tunnelDir, -0.2).addScaledVector(n, -0.45), d0.clone(), 4.2, sd.up.clone());
    const A = mk(fo.ivc.clone().lerp(b.T1, 0.62), d0.clone(), 16, sd.up.clone());
    const B = mk(b.CL.clone().lerp(b.Efront, 0.5).addScaledVector(n, 0.1), d0.clone().multiplyScalar(Math.cos(k)).addScaledVector(n, Math.sin(k)), 9, sd.up.clone());
    const C = mk(b.CR.clone().addScaledVector(n, -0.2), d0.clone().multiplyScalar(Math.cos(k)).addScaledVector(n, -Math.sin(k)), 9, sd.up.clone());
    const D = mk(sd.center.clone(), d0.clone(), sd.dist, sd.up.clone());
    return [[0, O], [3.8, O], [5.6, A], [9.0, A], [10.6, B], [15.6, B], [17.2, C], [21.3, C], [23.3, D]];
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
      heart.setPFO(true); heart.setPFOClosure(0);
      pose();
      hooks.caption(0, CLOSURE_STEPS[0].text);
    },
    // arrêt (autre vue) : matériel retiré, FOP rouvert (affiché tant que la vue est ouverte)
    stop() {
      if (!built) return;
      playing = false; shown = false; step = -1; tail = -1;
      built.group.visible = false;
      heart.setPFOClosure(0); heart.setPFO(view.active);
      hooks.caption(-1, '');
    },
    frame: () => frameAt(),
    parts: () => built, // essais : matériel construit
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
