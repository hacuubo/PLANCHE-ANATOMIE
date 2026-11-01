// Rubrique Stimulation : « Stimulation de branche gauche », animation de l'implantation d'un stimulateur cardiaque
// double chambre (≈ 20 s), dans la coupe 4 cavités (pointe, centres des valves mitrale et tricuspide), caméra fixe :
//   1. la cible : côté droit du septum interventriculaire, à la jonction du 1er et du 2e tiers de la distance qui va de la
//      jonction auriculo-ventriculaire (charnière septale de la tricuspide) à la pointe ;
//   2. une gaine préformée (type C315HIS), rigide, amène la sonde par la veine cave supérieure, l'oreillette droite et la
//      valve tricuspide ; dans le ventricule droit, sa courbure la fait arriver perpendiculaire au septum ;
//   3. la sonde est vissée dans le septum, toujours perpendiculaire, jusqu'aux 3/4 de son épaisseur (zone de la branche
//      gauche, sous l'endocarde gauche) ; sa progression se fait dans le plan de coupe, sur la tranche du septum ;
//   4. la gaine est retirée, la sonde reste : libérée de la gaine, du bout vers l'arrière, elle prend sa propre forme,
//      souple, à travers la tricuspide, avec une légère réserve dans l'oreillette ;
//   5. la sonde auriculaire descend dans l'oreillette droite, s'y recourbe et se pose sur la paroi latérale ; sa vis sort
//      et se fixe ;
//   6. les deux sondes suivent le battement.
// Le cœur bat pendant toute l'animation : chaque point des sondes est déplacé par la déformation du battement
// (heart.deformPoint), depuis sa position au repos. La gaine, rigide, garde sa forme : elle ne suit que le déplacement de
// son bout (glissement réparti le long de la gaine), et la sonde qu'elle contient suit la gaine.
// Matériel (fabricant) :
//   - sonde ventriculaire sans lumière à vis fixe (Medtronic SelectSecure 3830) : 4,1 F, 1,4 mm ; vis de 1,8 mm ;
//   - gaine de pose (Medtronic C315HIS) : 7 F, 2,4 mm de diamètre extérieur (5,4 F intérieur) ;
//   - sonde auriculaire à vis rétractable (Medtronic CapSureFix Novus 5076) : 6 F, ≈ 2 mm ; vis de 1,8 mm.
// Unités du modèle : 1 = 1 cm.
import * as THREE from 'three';
import { K_ENDO } from './heart.js';

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const PACING_STEPS = [
  { d: 3.0, text: 'Coupe 4 cavités. La cible : le côté droit de la cloison entre les ventricules (septum), à un tiers de la distance qui va de la jonction entre oreillettes et ventricules à la pointe.' },
  { d: 5.0, text: 'Par la veine cave supérieure, une gaine courbe amène la sonde dans l’oreillette droite puis à travers la valve tricuspide ; dans le ventricule droit, elle tourne pour arriver perpendiculaire à la cloison.' },
  { d: 4.5, text: 'La sonde est vissée dans la cloison, toujours perpendiculaire, jusqu’aux trois quarts de son épaisseur : sa pointe arrive près du côté gauche, là où court la branche gauche du faisceau de His.' },
  { d: 2.5, text: 'La gaine est retirée ; la sonde reste vissée dans la cloison.' },
  { d: 5.0, text: 'Deuxième sonde : elle descend dans l’oreillette droite, s’y recourbe et se pose sur sa paroi latérale, où sa vis sort et se fixe.' },
  { d: 0, text: 'Les deux sondes sont en place et suivent chaque battement : l’une stimule l’oreillette droite, l’autre la branche gauche, pour une contraction des ventricules proche de la normale.' },
];
// diamètres (cm) : sonde ventriculaire 1,4 mm, gaine 2,4 mm, sonde auriculaire 2 mm ; vis de 1,8 mm
const R_LBB = 0.07, R_SHEATH = 0.12, R_RA = 0.1, HELIX = 0.18;

// Géométrie, mesurée sur le modèle au repos : plan 4 cavités, cible septale, épaisseur du septum, paroi latérale de l'OD
function measure(heart) {
  const V = heart.landmarks.valves, TV = V['valve-tricuspide'].center, MV = V['valve-mitrale'].center, apex = heart.landmarks.apex;
  const n = new THREE.Vector3().crossVectors(TV.clone().sub(MV), apex.clone().sub(TV)).normalize();
  if (n.dot(heart.cut4.normal) < 0) n.negate(); // vers l'observateur
  const O = TV.clone();
  const Y = heart.landmarks.base.clone().sub(apex).projectOnPlane(n).normalize(); // vers la base
  const X = new THREE.Vector3().crossVectors(Y, n); // vers la gauche du patient (VG à droite de l'écran)
  const inPlane = (p) => p.clone().addScaledVector(n, -n.dot(p.clone().sub(O)));
  // endocarde des cavités : sommets et normales (vers la paroi), distance signée (positive dans la cavité)
  let cav = null;
  heart.root.traverse((o) => { if (!cav && o.userData.id === 'cavites') cav = o; });
  const pa = cav.geometry.attributes.position, na = cav.geometry.attributes.normal, sid = cav.userData.sid, W = {};
  for (let i = 0; i < pa.count; i++) {
    const w = (W[heart.structureIds[sid[i]]] ??= [[], []]);
    w[0].push(new THREE.Vector3().fromBufferAttribute(pa, i)); w[1].push(new THREE.Vector3().fromBufferAttribute(na, i));
  }
  const near = (side, p) => { const [A] = W[side]; let m = Infinity, j = 0; for (let i = 0; i < A.length; i++) { const d = A[i].distanceToSquared(p); if (d < m) { m = d; j = i; } } return [j, Math.sqrt(m)]; };
  const sd = (side, p) => { const [j, m] = near(side, p); return p.clone().sub(W[side][0][j]).dot(W[side][1][j]) > 0 ? -m : m; };
  // face droite du septum dans le plan : sommets du VD dont la normale regarde le VG, à moins de 2,2 cm de lui
  const sOf = (p) => -Y.dot(p.clone().sub(O)); // abscisse vers la pointe
  const sep = [];
  W['ventricule-droit'][0].forEach((p, i) => {
    if (Math.abs(n.dot(p.clone().sub(O))) > 0.12) return;
    const [j, m] = near('ventricule-gauche', p), q = W['ventricule-gauche'][0][j];
    if (m < 2.2 && q.clone().sub(p).normalize().dot(W['ventricule-droit'][1][i]) > 0.6) sep.push({ p, nrm: W['ventricule-droit'][1][i], s: sOf(p) });
  });
  sep.sort((a, b) => a.s - b.s);
  // jonction AV : extrémité basale du septum (3e point, pour écarter un sommet isolé) ; pointe : celle du cœur
  const s0 = sep[Math.min(2, sep.length - 1)].s, s1 = sOf(apex), sT = s0 + (s1 - s0) / 3;
  // ligne du septum (face droite), par tranches de 0,5 cm, jusqu'à la pointe
  const line = [];
  for (let s = s0; s <= sep[sep.length - 1].s; s += 0.5) {
    const b = sep.filter((o) => Math.abs(o.s - s) < 0.3);
    if (b.length) line.push(inPlane(b.reduce((a, o) => a.add(o.p), new THREE.Vector3()).multiplyScalar(1 / b.length)));
  }
  line.push(inPlane(apex));
  // cible : face droite du septum à l'abscisse sT ; direction perpendiculaire au septum, dans le plan, vers le VG
  const tb = sep.filter((o) => Math.abs(o.s - sT) < 0.35);
  const d = tb.reduce((a, o) => a.add(o.nrm), new THREE.Vector3()).projectOnPlane(n).normalize();
  let S = inPlane(tb.reduce((a, o) => a.add(o.p), new THREE.Vector3()).multiplyScalar(1 / tb.length));
  { // posée sur l'endocarde : depuis le VD, on avance jusqu'à la surface
    const p = S.clone().addScaledVector(d, -0.5);
    for (let k = 0; k < 60 && sd('ventricule-droit', p) > 0; k++) p.addScaledVector(d, 0.02);
    S = p;
  }
  // épaisseur du septum le long de d (jusqu'à l'endocarde du VG)
  let thick = 0;
  { const p = S.clone(); while (thick < 2.5 && sd('ventricule-gauche', p) < 0) { p.addScaledVector(d, 0.02); thick += 0.02; } }
  // paroi latérale de l'OD dans le plan, au tiers inférieur de l'oreillette
  const ra = [];
  W['oreillette-droite'][0].forEach((p, i) => { if (Math.abs(n.dot(p.clone().sub(O))) < 0.1) ra.push({ p, nrm: W['oreillette-droite'][1][i], x: X.dot(p.clone().sub(O)), y: Y.dot(p.clone().sub(O)) }); });
  const y0 = Math.min(...ra.map((o) => o.y)), y1 = Math.max(...ra.map((o) => o.y)), yT = y0 + 0.3 * (y1 - y0);
  const band = ra.filter((o) => Math.abs(o.y - yT) < 0.25), xm = Math.min(...band.map((o) => o.x)), lat = band.filter((o) => o.x < xm + 0.12);
  const rn = lat.reduce((a, o) => a.add(o.nrm), new THREE.Vector3()).projectOnPlane(n).normalize();
  let Rw = inPlane(lat.reduce((a, o) => a.add(o.p), new THREE.Vector3()).multiplyScalar(1 / lat.length));
  { const p = Rw.clone().addScaledVector(rn, -0.6); for (let k = 0; k < 60 && sd('oreillette-droite', p) > 0; k++) p.addScaledVector(rn, 0.02); Rw = p; }
  const fo = heart.fossa, svc = fo.svc.clone(), su = fo.svc.clone().sub(fo.ivc).normalize();
  return { n, O, X, Y, S, d, thick, depth: 0.75 * thick, line, s0, s1, sT, Rw, rn, svc, su, sd };
}

// Vue « Stimulation de branche gauche » : coupe 4 cavités, regard un peu incliné vers la base (la veine cave supérieure,
// qui arrive vers l'observateur, se lit de biais), caméra fixe
export function buildPacingView(heart) {
  const g = measure(heart), a = THREE.MathUtils.degToRad(25);
  const camDir = g.n.clone().multiplyScalar(Math.cos(a)).addScaledVector(g.Y, -Math.sin(a)).normalize();
  const up = g.Y.clone().multiplyScalar(Math.cos(a)).addScaledVector(g.n, Math.sin(a)).normalize();
  const view = {
    key: 'stim', title: 'Stimulation de branche gauche', group: 'stim', phase: null, compare: false, fixed: true, geo: g,
    variantList: [['normale', 'Stimulation de branche gauche']], variant: 'normale', setVariant() {},
    sides: { C: {
      camDir, up, center: g.O.clone().addScaledVector(g.X, 1.4).addScaledVector(g.Y, -3.0), dist: 35, // les 4 cavités, de la veine cave à la pointe
      cut: { normal: g.n.clone().negate(), def: g.n.dot(g.O) }, interior: 0,
      orient: 'Coupe 4 cavités · <b>oreillettes en haut, pointe en bas</b>',
    } },
    active: false,
    activate(on) { view.active = on; view.onActivate?.(on); },
  };
  return view;
}

// Tube dont l'axe change à chaque image (sonde, gaine) : repère transporté le long de l'axe ; texture tournée de spin
function dynTube(r, radial, maxN, mat) {
  const R = radial + 1, pos = new Float32Array(maxN * R * 3), nor = new Float32Array(maxN * R * 3), uv = new Float32Array(maxN * R * 2), idx = [];
  for (let i = 0; i < maxN - 1; i++) for (let j = 0; j < radial; j++) { const a = i * R + j, b = a + R; idx.push(a, a + 1, b, b, a + 1, b + 1); } // faces tournées vers l'extérieur
  const geo = new THREE.BufferGeometry();
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const t = new THREE.Vector3(), nn = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Vector3();
  mesh.set = (pts, count, spin = 0) => {
    count = Math.min(count, maxN);
    mesh.visible = count > 1;
    if (!mesh.visible) return;
    t.subVectors(pts[1], pts[0]).normalize();
    nn.set(0, 0, 1); if (Math.abs(t.z) > 0.9) nn.set(1, 0, 0);
    for (let i = 0; i < count; i++) {
      t.subVectors(pts[Math.min(count - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      nn.addScaledVector(t, -nn.dot(t)).normalize(); b.crossVectors(t, nn);
      for (let j = 0; j <= radial; j++) {
        const th = (j / radial) * 2 * Math.PI, c = Math.cos(th), s = Math.sin(th), k = i * R + j;
        q.copy(nn).multiplyScalar(c).addScaledVector(b, s);
        pos[3 * k] = pts[i].x + q.x * r; pos[3 * k + 1] = pts[i].y + q.y * r; pos[3 * k + 2] = pts[i].z + q.z * r;
        nor[3 * k] = q.x; nor[3 * k + 1] = q.y; nor[3 * k + 2] = q.z;
        uv[2 * k] = i / maxN; uv[2 * k + 1] = j / radial + spin;
      }
    }
    geo.setDrawRange(0, (count - 1) * radial * 6);
    geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = geo.attributes.uv.needsUpdate = true;
  };
  return mesh;
}
// gaine isolante de la sonde : silicone clair, un liseré le long de la sonde (on la voit tourner quand on la visse)
function stripeTexture(base, line) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 4, 64); g.fillStyle = line; g.fillRect(0, 26, 4, 10);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// vis : hélice de fil métallique, axe Y local, de 0 à len
class HelixCurve extends THREE.Curve {
  constructor(r, len, turns) { super(); Object.assign(this, { r, len, turns }); }
  getPoint(u, o = new THREE.Vector3()) { const a = u * this.turns * 2 * Math.PI; return o.set(this.r * Math.cos(a), u * this.len, this.r * Math.sin(a)); }
}

export function createPacingAnimation(heart, view, hooks) {
  let built = null, playing = false, shown = false, t = 0, step = -1, tail = -1;
  const Yax = new THREE.Vector3(0, 1, 0);
  // Point déplacé par le battement. La coupe de la vue ne suit que le centre de la vue (js/app.js, valveCut) : près du
  // plan, un point déformé passerait sous la tranche ; il garde donc sa hauteur au repos par rapport au plan (déplacé
  // de shift, comme la coupe), et suit le battement dans le plan. Loin du plan (veine cave), déformation entière.
  let shift = 0;
  const _c = new THREE.Vector3();
  const planeShift = () => { const c = view.sides.C.center; shift = view.geo.n.dot(heart.deformPoint(_c.copy(c)).sub(c)); };
  const move = (o, rest) => {
    const { n, O } = view.geo, z0 = n.dot(_c.copy(rest).sub(O));
    heart.deformPoint(o.copy(rest), K_ENDO);
    const w = 1 - ease((Math.abs(z0) - 0.3) / 0.7);
    if (w > 0) o.addScaledVector(n, w * (z0 + shift - n.dot(_c.copy(o).sub(O))));
    return o;
  };
  const build = () => {
    const g = view.geo, { n, O, X, Y, S, d, depth, Rw, rn, svc, su } = g;
    const at = (x, y, z) => O.clone().addScaledVector(X, x).addScaledVector(Y, y).addScaledVector(n, z);
    // sonde ventriculaire : veine cave supérieure, oreillette droite, valve tricuspide (son centre), virage dans le VD,
    // approche perpendiculaire au septum, puis le septum lui-même (prolongé pour la tangente)
    const routeV = [svc.clone().addScaledVector(su, 4), svc.clone().addScaledVector(su, 1.2), svc.clone(), at(1.0, 1.0, 1.2), at(0.15, 0.45, 0.25), O.clone(),
      at(-0.1, -1.1, 0), S.clone().addScaledVector(d, -1.25), S.clone().addScaledVector(d, -0.5), S.clone(), S.clone().addScaledVector(d, depth + 0.3)];
    // sonde ventriculaire libérée de la gaine : sa propre forme, souple — une légère réserve dans l'oreillette, le centre
    // de la tricuspide, une courbe douce dans le VD jusqu'au même point d'ancrage, perpendiculaire au septum
    const routeR = [svc.clone().addScaledVector(su, 4), svc.clone().addScaledVector(su, 1.2), svc.clone(), at(0.9, 1.0, 1.0), at(0.05, 0.55, 0.3), O.clone(),
      at(0.3, -1.0, 0), S.clone().addScaledVector(d, -0.65), S.clone().addScaledVector(d, -0.25), S.clone(), S.clone().addScaledVector(d, depth + 0.3)];
    // sonde auriculaire : même veine, descend vers la tricuspide, se recourbe vers la paroi latérale de l'OD
    const routeA = [svc.clone().addScaledVector(su, 4).addScaledVector(X, 0.25), svc.clone().addScaledVector(su, 1.2).addScaledVector(X, 0.25), svc.clone().addScaledVector(X, 0.25),
      at(1.4, 1.5, 1.1), at(0.45, 0.25, 0.5), at(-0.45, 0.15, 0.25), Rw.clone().addScaledVector(rn, -0.45), Rw.clone(), Rw.clone().addScaledVector(rn, 0.3)]; // crosse : descend au plancher de l'OD puis remonte vers la paroi
    const path = (pts) => {
      const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), L = c.getLength(), DU = 0.03, N = Math.ceil(L / DU) + 1;
      const rest = Array.from({ length: N }, (_, i) => c.getPointAt(Math.min(1, (i * DU) / L)));
      const uOf = (p) => { let bi = 0; rest.forEach((q, i) => { if (q.distanceTo(p) < rest[bi].distanceTo(p)) bi = i; }); return bi * DU; };
      // positions déformées par le battement : calculées une fois par image, à la demande
      const def = rest.map(() => new THREE.Vector3()), stamp = new Int32Array(N).fill(-1);
      const P = (i, f) => { if (stamp[i] !== f) { stamp[i] = f; move(def[i], rest[i]); } return def[i]; };
      // points de l'axe de 0 à u (le dernier exactement en u), déformés ; buf : { pts, end } réutilisé d'une image à l'autre
      const upTo = (u, f, buf) => {
        u = Math.min(Math.max(u, 0), L); const k = Math.floor(u / DU), out = buf.pts;
        let m = 0; for (let i = 0; i <= Math.min(k, N - 1); i++) out[m++] = P(i, f);
        const fr = u / DU - k;
        if (k + 1 < N && fr > 1e-3) out[m++] = buf.end.lerpVectors(P(k, f), P(k + 1, f), fr);
        return m;
      };
      // point et tangente déformés en u
      const pt = (u, f, o) => { u = Math.min(Math.max(u, 0), L); const k = Math.min(N - 2, Math.floor(u / DU)), fr = u / DU - k; return o.lerpVectors(P(k, f), P(k + 1, f), fr); };
      const tan = (u, f, o) => { const a = pt(u - 0.06, f, new THREE.Vector3()); return pt(u, f, o).sub(a).normalize(); };
      // point au repos en u (gaine rigide)
      const ptRest = (u, o) => { u = Math.min(Math.max(u, 0), L); const k = Math.min(N - 2, Math.floor(u / DU)), fr = u / DU - k; return o.lerpVectors(rest[k], rest[k + 1], fr); };
      return { L, N, DU, rest, uOf, upTo, pt, tan, ptRest };
    };
    const pv = path(routeV), pa = path(routeA), pr = path(routeR);
    const group = new THREE.Group(); group.visible = false; heart.root.add(group);
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9cdd3, metalness: 0.9, roughness: 0.25 });
    const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; group.add(m); return m; };
    const leadV = dynTube(R_LBB, 14, pv.N + 2, new THREE.MeshStandardMaterial({ map: stripeTexture('#dfe3e6', '#9aa6b2'), roughness: 0.42, metalness: 0.05 }));
    const sheath = dynTube(R_SHEATH, 18, pv.N + 2, new THREE.MeshPhysicalMaterial({ color: 0x2c3a6b, roughness: 0.33, clearcoat: 0.7, clearcoatRoughness: 0.25, side: THREE.DoubleSide })); // bout ouvert : on voit l'intérieur
    const leadA = dynTube(R_RA, 16, pa.N + 2, new THREE.MeshStandardMaterial({ map: stripeTexture('#ecebe6', '#b9b6aa'), roughness: 0.5, metalness: 0.02 }));
    group.add(leadV, sheath, leadA);
    // extrémités : manchon métallique, vis (1,8 mm), électrode annulaire ; repère radio-opaque du bout de la gaine
    const tipV = { collar: mk(new THREE.CylinderGeometry(R_LBB, R_LBB, 0.08, 18), metal), helix: mk(new THREE.TubeGeometry(new HelixCurve(0.048, HELIX, 2.2), 64, 0.011, 6), metal), ring: mk(new THREE.CylinderGeometry(R_LBB * 1.04, R_LBB * 1.04, 0.12, 18), metal) };
    const tipA = { collar: mk(new THREE.CylinderGeometry(R_RA, R_RA * 0.92, 0.14, 18), metal), helix: mk(new THREE.TubeGeometry(new HelixCurve(0.06, HELIX, 2.2), 64, 0.013, 6), metal), ring: mk(new THREE.CylinderGeometry(R_RA * 1.04, R_RA * 1.04, 0.14, 18), metal) };
    const band = mk(new THREE.CylinderGeometry(R_SHEATH * 1.02, R_SHEATH * 1.02, 0.1, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }));
    // cible et repère de la mesure : ligne du septum (jonction AV → pointe) en pointillés, tiers marqués, cible au 1er tiers
    const dotM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }), tickM = new THREE.MeshBasicMaterial({ color: 0xf2b23a, transparent: true, opacity: 0 });
    const lift = (p) => p.clone().addScaledVector(n, 0.04);
    const lc = new THREE.CatmullRomCurve3(g.line, false, 'centripetal'), LL = lc.getLength(), dots = [];
    for (let u = 0; u <= LL; u += 0.22) dots.push({ m: mk(new THREE.SphereGeometry(0.028, 10, 8), dotM), p: lift(lc.getPointAt(u / LL)) });
    // tiers : abscisses s (vers la pointe) de la ligne
    const sOf = (p) => -Y.dot(p.clone().sub(O));
    for (const f of [0, 1 / 3, 2 / 3, 1]) {
      const s = g.s0 + (g.s1 - g.s0) * f; let best = 0, bd = Infinity;
      for (let u = 0; u <= LL; u += 0.02) { const dd = Math.abs(sOf(lc.getPointAt(u / LL)) - s); if (dd < bd) { bd = dd; best = u; } }
      dots.push({ m: mk(new THREE.SphereGeometry(0.06, 14, 10), tickM), p: lift(lc.getPointAt(best / LL)) });
    }
    const target = mk(new THREE.TorusGeometry(0.24, 0.028, 10, 40), new THREE.MeshBasicMaterial({ color: 0xf2b23a, transparent: true, opacity: 0 }));
    target.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    return { g, pv, pa, group, leadV, sheath, leadA, tipV, tipA, band, dots, dotM, tickM, target, uS: pv.uOf(S), uW: pa.uOf(Rw), pr, uRS: pr.uOf(S),
      poolV: Array.from({ length: pv.N + 2 }, () => new THREE.Vector3()), poolS: Array.from({ length: pv.N + 2 }, () => new THREE.Vector3()), bufA: { pts: [], end: new THREE.Vector3() } };
  };
  // pose d'une extrémité de sonde, d'après les points de son axe (pts[0..n-1], pas du ≈ 0,03 cm, le dernier au bout du
  // corps) : manchon, vis (sortie de ext ∈ [0, 1]) tournée de spin, anneau à ringAt du bout
  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _q = new THREE.Quaternion(), _qs = new THREE.Quaternion();
  const axisAt = (pts, n, i, o, t) => { i = Math.min(n - 1, Math.max(2, i)); o.copy(pts[i]); t.subVectors(pts[i], pts[i - 2]).normalize(); };
  const placeTip = (tip, pts, n, ext, spin, collarLen, ringAt) => {
    const show = n > 7;
    for (const m of Object.values(tip)) m.visible = show;
    if (!show) return;
    axisAt(pts, n, n - 1, _p, _t);
    _q.setFromUnitVectors(Yax, _t); _qs.setFromAxisAngle(Yax, spin);
    tip.collar.position.copy(_p).addScaledVector(_t, -collarLen / 2); tip.collar.quaternion.copy(_q);
    tip.helix.position.copy(_p).addScaledVector(_t, -HELIX * (1 - ext)); tip.helix.quaternion.copy(_q).multiply(_qs);
    tip.helix.visible = ext > 0.02;
    axisAt(pts, n, n - 1 - Math.round(ringAt / 0.03), _p, _t);
    tip.ring.position.copy(_p); tip.ring.quaternion.setFromUnitVectors(Yax, _t);
  };
  const sm = (a, b, x) => ease((x - a) / (b - a));
  let frameNo = 0;
  const _o = new THREE.Vector3(), _r = new THREE.Vector3(), _dT = new THREE.Vector3();
  const pose = () => {
    const b = built, f = ++frameNo, starts = [];
    planeShift();
    let acc = 0; for (const s of PACING_STEPS) { starts.push(acc); acc += s.d; }
    const ph = (k) => (PACING_STEPS[k].d ? Math.min(1, Math.max(0, (t - starts[k]) / PACING_STEPS[k].d)) : t >= starts[k] ? 1 : 0);
    const k = Math.max(0, starts.findLastIndex((s0) => t >= s0));
    // repère de la mesure : apparaît (1), s'efface quand la sonde arrive (2)
    const vis = ease(t / 0.8) * (1 - ease((ph(1) - 0.6) / 0.4));
    b.dotM.opacity = 0.9 * vis; b.tickM.opacity = vis; b.target.material.opacity = vis;
    for (const o of b.dots) { o.m.visible = vis > 0.01; if (o.m.visible) move(o.m.position, o.p); }
    b.target.visible = vis > 0.01;
    if (b.target.visible) { move(b.target.position, b.g.S.clone().addScaledVector(b.g.n, 0.05)); b.target.scale.setScalar(1 + 0.12 * Math.sin(t * 5)); }
    // sonde ventriculaire : avance dans la gaine (2), vissée dans le septum (3) ; vis fixe, toujours sortie
    const uContact = b.uS, uGo = ease(ph(1)) * uContact, screw = ph(2);
    const uTipV = screw > 0 ? uContact + b.g.depth * ease(screw) : uGo; // bout de la vis
    const spin = -2 * Math.PI * 7 * screw; // ≈ 7 tours
    // gaine : avance avec la sonde jusqu'au septum, s'y appuie pendant le vissage, puis est retirée (4). Rigide : sa forme
    // au repos, déplacée du mouvement de son bout, réparti le long de la gaine (rien à l'entrée de la veine cave)
    const uSh = ph(3) > 0 ? (uContact - 0.24) * (1 - ease(ph(3))) : Math.max(0, uGo - 0.24);
    move(_dT, b.pv.ptRest(uSh, _r)).sub(_r);
    const sheathAt = (u, o) => b.pv.ptRest(u, o).addScaledVector(_dT, uSh > 0 ? Math.min(1, Math.max(0, u / uSh)) : 0);
    const DU = b.pv.DU;
    let nS = 0;
    for (let u = 0; u < uSh; u += DU) sheathAt(u, b.poolS[nS++]);
    if (uSh > 0) sheathAt(uSh, b.poolS[nS++]);
    b.sheath.set(b.poolS, nS);
    b.band.visible = uSh > 0.3;
    if (b.band.visible) { sheathAt(uSh - 0.06, b.band.position); b.band.quaternion.setFromUnitVectors(Yax, _t.subVectors(sheathAt(uSh, _o), b.band.position).normalize()); }
    // sonde ventriculaire, de l'entrée au bout du corps (uB, sur le trajet de la gaine) : dans la gaine, elle suit la gaine ;
    // au-delà de son bout, souple, elle suit le battement ; une fois la gaine retirée au-delà d'un point, elle y prend sa
    // propre forme (trajet libre, même point d'ancrage)
    const uB = Math.max(0, uTipV - HELIX), relax = ph(3) > 0, uRB = b.uRS + b.g.depth - HELIX;
    let nV = 0;
    for (let i = 0; ; i++) {
      const u = Math.min(i * DU, uB), o = b.poolV[nV++];
      b.pv.pt(u, f, o);
      const cov = uSh > 0 ? 1 - sm(uSh - 0.05, uSh + 0.35, u) : 0;
      if (cov > 0) o.lerp(sheathAt(u, _o), cov);
      const r = relax ? (ph(3) >= 1 ? 1 : sm(uSh, uSh + 1.0, u)) : 0;
      if (r > 0) o.lerp(b.pr.pt(uRB - (uB - u), f, _o), r);
      if (u >= uB || nV >= b.poolV.length) break;
    }
    b.leadV.set(b.poolV, nV, spin / (2 * Math.PI));
    placeTip(b.tipV, b.poolV, nV, 1, spin, 0.08, 0.95);
    // sonde auriculaire : descend, se recourbe, se pose (5 : 0 → 0,7), vis sortie en tournant (0,7 → 1)
    const pA = ph(4), uA = b.uW * ease(pA / 0.7), ext = ease((pA - 0.72) / 0.28);
    const nA = b.pa.upTo(uA, f, b.bufA);
    b.leadA.set(b.bufA.pts, nA);
    placeTip(b.tipA, b.bufA.pts, nA, ext, -2 * Math.PI * 2.5 * ext, 0.14, 1.0);
    return k;
  };
  // cadrages, toujours dans l'axe de la vue (la coupe ne tourne pas) : [instant (s), centre, distance] — les 4 cavités (W),
  // le septum pendant le vissage (Z), l'oreillette droite pendant la pose de la sonde auriculaire (A), les deux sondes en place (F)
  let shots = null;
  const shotsOf = () => {
    const g = view.geo, sd = view.sides.C;
    const W = [sd.center.clone(), sd.dist], Z = [g.S.clone().addScaledVector(g.d, 0.15), 10], A = [g.Rw.clone().lerp(g.O, 0.5).addScaledVector(g.Y, -0.5), 18], F = [g.Rw.clone().lerp(g.S, 0.5).addScaledVector(g.Y, -0.4), 23];
    return [[0, W], [6.6, W], [8.0, Z], [12.6, Z], [14.2, W], [15.0, W], [16.0, A], [18.6, A], [20.0, F]];
  };
  const frameAt = () => {
    shots ??= shotsOf();
    let i = 0; while (i < shots.length - 1 && t >= shots[i + 1][0]) i++;
    const [ta, a] = shots[i], [tb, b] = shots[Math.min(i + 1, shots.length - 1)], f = b === a ? 0 : ease((t - ta) / (tb - ta));
    return { center: a[0].clone().lerp(b[0], f), dist: a[1] * Math.pow(b[1] / a[1], f) };
  };
  const api = {
    steps: PACING_STEPS,
    frame: () => frameAt(),
    get playing() { return playing; },
    get step() { return step; },
    get shown() { return shown; },
    prepare() { built ??= build(); }, // construction d'avance (pendant le trajet depuis la ponction, js/app.js)
    play() {
      built ??= build();
      t = -0.8; step = -1; playing = true; shown = true; tail = -1;
      built.group.visible = true;
      pose();
      hooks.caption(0, PACING_STEPS[0].text);
    },
    // arrêt (autre vue) : matériel retiré
    stop() {
      if (!built) return;
      playing = false; shown = false; step = -1; tail = -1;
      built.group.visible = false;
      hooks.caption(-1, '');
    },
    parts: () => built, // essais : matériel construit
    seek(x) { if (!playing) return; t = x - 1e-3; api.update(1e-3); },
    update(dt) {
      if (tail >= 0 && (tail += dt) > 12) { tail = -1; if (!playing) hooks.caption(-1, ''); } // légende finale : 12 s
      if (!shown) return;
      if (!playing) { pose(); return; } // en place : les sondes suivent le battement
      t += dt;
      const k = pose();
      if (k !== step) {
        step = k; hooks.caption(k, PACING_STEPS[k].text);
        if (k === PACING_STEPS.length - 1) { playing = false; tail = 0; hooks.finish(); }
      }
    },
  };
  return api;
}
