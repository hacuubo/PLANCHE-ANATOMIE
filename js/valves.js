// Valves du cœur : modèle paramétrique calé sur les repères BodyParts3D (anneaux, secteurs des feuillets, muscles
// papillaires), préparés par tools/build-heart-bp3d.mjs. Chaque valve a un degré d'ouverture (0 = fermée, 1 = ouverte),
// ce qui permet de l'animer pendant le cycle cardiaque.
//
// Valves auriculo-ventriculaires (mitrale, tricuspide) : feuillets minces suspendus à l'anneau, bord libre festonné ;
// ouvertes, ils pendent dans le ventricule le long de la paroi ; fermées, ils bombent vers l'oreillette et s'accolent
// sur la ligne de coaptation (droite pour la mitrale, en Y pour la tricuspide). Cordages tendineux en éventail : un
// tronc depuis la tête de chaque pilier, puis des branches vers le bord libre et la face ventriculaire des feuillets.
// Valves sigmoïdes (aortique, pulmonaire) : trois cuspides en poche ; fermées, leurs bords libres se rejoignent en Y
// au centre ; ouvertes, elles se plaquent contre la paroi de la racine.
import * as THREE from 'three';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const CREME = [0.925, 0.82, 0.6], BORD = [0.9, 0.77, 0.52], ENDO = [0.85, 0.58, 0.56];
// feuillet AV : base rosée (continuité avec l'endocarde auriculaire), corps crème, bord libre épaissi plus jaune
const shadeLeaflet = (u, v) => {
  let c = mix(ENDO, CREME, Math.min(1, v / 0.22));
  if (v > 0.78) c = mix(c, BORD, (v - 0.78) / 0.22);
  const ao = 0.78 + 0.22 * Math.min(1, v / 0.3) - 0.1 * Math.pow(1 - Math.sin(Math.PI * u), 4);
  return [...c, ao];
};
// cuspide sigmoïde : creux de la poche plus sombre, bord libre et nodule plus clairs
const shadeCusp = (u, v) => {
  const belly = Math.sin(Math.PI * v) * Math.sin(Math.PI * u);
  let c = mix(CREME, [0.86, 0.66, 0.5], belly * 0.5);
  if (v > 0.85) c = mix(c, BORD, (v - 0.85) / 0.15);
  return [...c, 0.62 + 0.38 * (1 - belly) - 0.12 * Math.pow(1 - Math.sin(Math.PI * u), 6)];
};

// Nappe paramétrique (u, v) mise à jour à chaque image : positions recalculées, normales recalculées.
class Sheet {
  constructor(nu, nv, material, shade) {
    this.nu = nu; this.nv = nv;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((nu + 1) * (nv + 1) * 3), 3));
    // couleur sRGB + occlusion (col) et tissu « paroi lisse » sans identifiant d'enveloppe (tis.w = 255)
    const col = new Uint8Array((nu + 1) * (nv + 1) * 4), tis = new Uint8Array((nu + 1) * (nv + 1) * 4);
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const k = (j * (nu + 1) + i) * 4, c = shade(i / nu, j / nv);
      for (let q = 0; q < 4; q++) col[k + q] = Math.round(Math.min(1, Math.max(0, c[q])) * 255);
      tis[k + 1] = 255; tis[k + 3] = 255;
    }
    g.setAttribute('col', new THREE.BufferAttribute(col, 4, true));
    g.setAttribute('tis', new THREE.BufferAttribute(tis, 4, true));
    const idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.castShadow = true;
  }
  update(fn) {
    const p = this.mesh.geometry.attributes.position, t = new THREE.Vector3();
    for (let j = 0; j <= this.nv; j++) for (let i = 0; i <= this.nu; i++) { fn(i / this.nu, j / this.nv, t); p.setXYZ(j * (this.nu + 1) + i, t.x, t.y, t.z); }
    p.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeBoundingSphere();
  }
}

// Faisceau de cylindres (cordages) dont les extrémités bougent : une seule géométrie, topologie fixe.
class Cords {
  constructor(count, material, radial = 6) {
    this.n = count; this.radial = radial;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * radial * 2 * 3), 3));
    const idx = [];
    for (let s = 0; s < count; s++) for (let j = 0; j < radial; j++) {
      const a = s * radial * 2 + j, b = s * radial * 2 + (j + 1) % radial, c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, material);
    this._t = new THREE.Vector3(); this._n = new THREE.Vector3(); this._b = new THREE.Vector3(); this._q = new THREE.Vector3();
  }
  // segs : [[a: Vector3, b: Vector3, ra, rb]]
  update(segs) {
    const p = this.mesh.geometry.attributes.position, { radial } = this;
    segs.forEach(([a, b, ra, rb], s) => {
      const t = this._t.subVectors(b, a).normalize();
      const n = this._n.set(0, 1, 0); if (Math.abs(t.y) > 0.9) n.set(1, 0, 0);
      n.sub(this._q.copy(t).multiplyScalar(n.dot(t))).normalize();
      const bb = this._b.crossVectors(t, n);
      for (let end = 0; end < 2; end++) {
        const c = end ? b : a, r = end ? rb : ra;
        for (let j = 0; j < radial; j++) {
          const ang = (j / radial) * Math.PI * 2, cs = Math.cos(ang) * r, sn = Math.sin(ang) * r;
          p.setXYZ(s * radial * 2 + end * radial + j, c.x + n.x * cs + bb.x * sn, c.y + n.y * cs + bb.y * sn, c.z + n.z * cs + bb.z * sn);
        }
      }
    });
    p.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeBoundingSphere();
  }
}

/* ─────────── valve auriculo-ventriculaire ─────────── */
function avValve(id, d, leafletMat, cordMat) {
  const C = V(d.center), A = V(d.axis).normalize(), E1 = V(d.e1), E2 = V(d.e2);
  const [ra, rb] = d.radii;
  const mitral = id === 'valve-mitrale';
  const ant = d.leaflets.find((l) => /Anterior/.test(l.name));
  const tAnt = (ant.t0 + ant.t1) / 2;
  const dir = (th, out) => out.copy(E1).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th)).normalize();
  // anneau en selle (plus haut en avant et en arrière pour la mitrale)
  const annulus = (th, out) => out.copy(C).addScaledVector(E1, ra * Math.cos(th)).addScaledVector(E2, rb * Math.sin(th)).addScaledVector(A, -d.saddle * Math.cos(2 * (th - tAnt)));
  // ligne de coaptation : mitrale = segment décalé vers l'arrière (le feuillet antérieur couvre l'essentiel de l'orifice)
  const dirAnt = dir(tAnt, new THREE.Vector3()), lineDir = new THREE.Vector3().crossVectors(A, dirAnt).normalize();
  const Rm = (ra + rb) / 2, Cc = C.clone().addScaledVector(dirAnt, -0.18 * Rm);
  const tmpA = new THREE.Vector3(), tmpQ = new THREE.Vector3(), tmpD = new THREE.Vector3();
  const coapt = (th, out) => {
    if (mitral) { annulus(th, tmpA); const s = THREE.MathUtils.clamp(tmpA.sub(Cc).dot(lineDir), -0.85 * Rm, 0.85 * Rm); return out.copy(Cc).addScaledVector(lineDir, s); }
    return out.copy(C).addScaledVector(dir(th, tmpD), 0.1 * Rm);
  };
  const leaflets = d.leaflets.map((L) => {
    const span = L.t1 - L.t0, nu = Math.max(16, Math.round(span / 0.12)), pad = 0.06;
    const sheet = new Sheet(nu, 14, leafletMat, shadeLeaflet);
    const prof = (u) => {
      let h = Math.pow(Math.sin(Math.PI * u), 0.55);
      if (L.scallops > 1) h *= 0.78 + 0.22 * Math.abs(Math.sin(L.scallops * Math.PI * u));
      return L.height * (0.25 + 0.75 * h);
    };
    // position d'un point (u le long de l'anneau, v de l'anneau au bord libre) pour une ouverture donnée
    const point = (u, v, open, out) => {
      const th = L.t0 - pad + (span + 2 * pad) * u, h = prof(u);
      annulus(th, tmpA);
      const R = tmpA.clone().sub(C).projectOnPlane(A).length();
      dir(th, tmpD);
      // ouvert : le feuillet pend dans le ventricule, légèrement rentré vers le centre
      const ox = tmpA.x + A.x * v * h * 0.95 - tmpD.x * R * (0.1 * v + 0.12 * v * v);
      const oy = tmpA.y + A.y * v * h * 0.95 - tmpD.y * R * (0.1 * v + 0.12 * v * v);
      const oz = tmpA.z + A.z * v * h * 0.95 - tmpD.z * R * (0.1 * v + 0.12 * v * v);
      // fermé : le corps du feuillet rejoint la ligne de coaptation en bombant vers l'oreillette, puis la zone
      // d'accolement (bord libre) pend dans le ventricule
      coapt(th, tmpQ);
      const vc = 0.7, w = smooth(0, vc, v), belly = 0.2 * L.height * Math.sin(Math.PI * Math.min(1, v / vc)) * Math.pow(Math.sin(Math.PI * u), 0.5);
      const lip = Math.max(0, (v - vc) / (1 - vc)) * 0.35 * h;
      const cx = tmpA.x + (tmpQ.x - tmpA.x) * w - A.x * belly + A.x * (0.08 * w + lip);
      const cy = tmpA.y + (tmpQ.y - tmpA.y) * w - A.y * belly + A.y * (0.08 * w + lip);
      const cz = tmpA.z + (tmpQ.z - tmpA.z) * w - A.z * belly + A.z * (0.08 * w + lip);
      return out.set(cx + (ox - cx) * open, cy + (oy - cy) * open, cz + (oz - cz) * open);
    };
    return { L, sheet, point, span };
  });
  // cordages : points d'insertion sur le bord libre et sur la face ventriculaire, groupés par pilier
  const heads = d.papillaries.map((p) => ({ ...p, H: V(p.head) }));
  const groups = new Map();
  for (const lf of leaflets) {
    const nA = Math.max(4, Math.round(lf.span / 0.32));
    const ins = [];
    for (let k = 0; k < nA; k++) ins.push([(k + 0.5) / nA, 1]);
    for (let k = 0; k < Math.max(2, nA >> 2); k++) ins.push([(k + 0.5) / Math.max(2, nA >> 2), 0.62]); // cordages de 2e ordre
    for (const [u, v] of ins) {
      const th = lf.L.t0 + lf.span * u;
      let best = heads[0], bd = 1e9;
      for (const h of heads) { const dd = Math.abs(wrap(th - h.angle)); if (dd < bd) { bd = dd; best = h; } }
      const key = `${lf.L.name}|${best.name}`;
      if (!groups.has(key)) groups.set(key, { lf, head: best, ins: [] });
      groups.get(key).ins.push([u, v]);
    }
  }
  const G = [...groups.values()];
  const nSeg = G.reduce((s, g) => s + g.ins.length + 1, 0);
  const cords = new Cords(nSeg, cordMat);
  const pts = new Map();
  const update = (open, headOffset = null) => {
    for (const lf of leaflets) lf.sheet.update((u, v, out) => lf.point(u, v, open, out));
    const segs = [];
    for (const g of G) {
      const H = g.head.H.clone(); if (headOffset) H.add(headOffset(g.head.name));
      const ins = g.ins.map(([u, v]) => g.lf.point(u, v, open, new THREE.Vector3()));
      const m = ins.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / ins.length);
      const B = H.clone().lerp(m, 0.42);
      segs.push([H, B, 0.05, 0.035]);
      for (const p of ins) segs.push([B, p, 0.026, 0.018]);
    }
    cords.update(segs);
  };
  update(1);
  return { meshes: [...leaflets.map((l) => l.sheet.mesh), cords.mesh], update, pts };
}

/* ─────────── valve sigmoïde ─────────── */
function slValve(id, d, cuspMat) {
  const C = V(d.center), A = V(d.axis).normalize(), E1 = V(d.e1), E2 = V(d.e2);
  const R = d.radius, Hc = d.height;
  const dir = (th, out) => out.copy(E1).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th)).normalize();
  const tD = new THREE.Vector3(), t0D = new THREE.Vector3(), t1D = new THREE.Vector3(), Hp = new THREE.Vector3(), Fc = new THREE.Vector3(), Fo = new THREE.Vector3();
  const cusps = d.cusps.map((c) => {
    const sheet = new Sheet(22, 14, cuspMat, shadeCusp);
    const point = (u, v, open, out) => {
      const th = c.t0 + (c.t1 - c.t0) * u;
      dir(th, tD); dir(c.t0, t0D); dir(c.t1, t1D);
      // ligne d'attache en croissant : basse au milieu de la cuspide, haute aux commissures
      Hp.copy(C).addScaledVector(tD, R).addScaledVector(A, Hc * 0.95 * (1 - Math.sin(Math.PI * u)));
      // bord libre fermé : deux segments le long des rayons des commissures (fermeture en Y), nodule au centre
      const s = u < 0.5 ? 1 - 2 * u : 2 * u - 1;
      Fc.copy(C).addScaledVector(A, Hc * (0.8 + 0.06 * (1 - s))).addScaledVector(u < 0.5 ? t0D : t1D, R * 0.98 * s);
      // bord libre ouvert : plaqué contre la paroi de la racine
      Fo.copy(C).addScaledVector(tD, R * 0.84).addScaledVector(A, Hc * 1.02);
      const F = Fc.lerp(Fo, open);
      out.copy(Hp).lerp(F, v);
      // ventre de la poche : vers le ventricule quand elle est fermée (remplie de sang), vers le sinus quand elle s'ouvre
      const bulge = Math.sin(Math.PI * v) * Math.sin(Math.PI * u);
      out.addScaledVector(A, -0.32 * Hc * bulge * (1 - open)).addScaledVector(tD, 0.12 * R * bulge * open);
      return out;
    };
    return { sheet, point };
  });
  const update = (open) => { for (const c of cusps) c.sheet.update((u, v, out) => c.point(u, v, open, out)); };
  update(0);
  return { meshes: cusps.map((c) => c.sheet.mesh), update };
}

// Construit les quatre valves. makeMat(id, preset) fournit les matériaux (feuillet, cordage) de heart.js.
export function buildValves(valves, makeMat) {
  const out = {};
  for (const [id, d] of Object.entries(valves)) {
    out[id] = d.type === 'av' ? avValve(id, d, makeMat(id, 'valve'), makeMat(id, 'cordage')) : slValve(id, d, makeMat(id, 'valve'));
  }
  return out;
}
