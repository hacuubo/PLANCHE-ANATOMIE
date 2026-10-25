// Valves du cœur : modèle paramétrique calé sur les repères BodyParts3D (anneaux, secteurs des feuillets, muscles
// papillaires), préparés par tools/build-heart-bp3d.mjs.
//
// Tissu : chaque feuillet ou cuspide est une lame épaisse (deux faces + bord libre arrondi), d'épaisseur variable selon
// l'anatomie — base fibreuse, zone claire mince et translucide, zone rugueuse épaissie près du bord libre (valves
// auriculo-ventriculaires), lunules minces et nodule d'Arantius (valves sigmoïdes). Le shader (heart.js, VALVE) y
// dessine les fibres de collagène radiales, les fines ondulations du bord et la lumière qui traverse les zones minces.
//
// Cinétique : l'ouverture suit un ressort amorti (léger rebond à la fermeture) ; le bord libre suit la base avec un
// retard, si bien que le feuillet ondule comme une voile ; pendant le passage du sang, le bord libre vibre légèrement.
//
// Valves auriculo-ventriculaires (mitrale, tricuspide) : feuillets suspendus à l'anneau en selle, bord libre festonné ;
// ouvertes, ils pendent dans le ventricule ; fermées, ils bombent vers l'oreillette et s'accolent sur la ligne de
// coaptation (en « sourire » pour la mitrale, en Y pour la tricuspide). Cordages tendineux en trois ordres : un tronc
// depuis la tête de chaque pilier, des branches, puis de fins cordages évasés à leur insertion sur le bord libre ;
// cordages de 2e ordre sur la face ventriculaire. Inextensibles : tendus valve fermée, ils s'incurvent quand elle s'ouvre,
// toujours sous les feuillets : vus de l'oreillette, ils n'apparaissent qu'à travers l'orifice.
// Valves sigmoïdes (aortique, pulmonaire) : trois cuspides en poche ; fermées, leurs bords libres se rejoignent en Y
// au centre ; ouvertes, elles se plaquent contre la paroi de la racine.
import * as THREE from 'three';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

/* ─────────── aspect et épaisseur (cm) ─────────── */
export const ENDO = [0.82, 0.52, 0.5];           // base rosée : continuité avec l'endocarde
export const CLAIRE = [0.92, 0.86, 0.75];         // zone claire : ivoire, mince et translucide
export const RUGUEUSE = [0.9, 0.8, 0.64];      // zone rugueuse : plus épaisse, plus jaune
export const NODULE = [0.94, 0.88, 0.74];
// Feuillet auriculo-ventriculaire
const shadeLeaflet = (u, v) => {
  let c = mix(ENDO, CLAIRE, smooth(0.02, 0.2, v));
  c = mix(c, RUGUEUSE, smooth(0.6, 0.85, v));
  // crête de la zone rugueuse (ligne de fermeture) : pli d'ombre
  const ao = 0.55 + 0.45 * smooth(0, 0.35, v) - 0.15 * Math.pow(1 - Math.sin(Math.PI * u), 4) - 0.16 * Math.exp(-(((v - 0.7) / 0.045) ** 2));
  return [...c, ao];
};
const thickLeaflet = (u, v) => {
  const edge = 0.75 + 0.25 * Math.pow(Math.sin(Math.PI * u), 0.4); // amincie aux commissures
  return edge * (0.075 * (1 - smooth(0, 0.15, v)) + 0.045 + 0.065 * smooth(0.55, 0.85, v) - 0.02 * smooth(0.95, 1, v));
};
// Cuspide sigmoïde : poche plus sombre au fond, lunules minces de part et d'autre du nodule d'Arantius
export const nodule = (u, v) => Math.exp(-(((u - 0.5) / 0.07) ** 2) - (((v - 0.93) / 0.07) ** 2));
const shadeCusp = (u, v) => {
  const belly = Math.sin(Math.PI * v) * Math.sin(Math.PI * u);
  let c = mix(CLAIRE, [0.88, 0.72, 0.6], belly * 0.35);
  c = mix(c, ENDO, 1 - smooth(0, 0.12, v));
  c = mix(c, NODULE, nodule(u, v));
  return [...c, 0.66 + 0.34 * (1 - belly) - 0.12 * Math.pow(1 - Math.sin(Math.PI * u), 6)];
};
const thickCusp = (u, v) => {
  const lunule = smooth(0.78, 0.9, v) * (1 - nodule(u, v));
  return 0.065 * (1 - smooth(0, 0.18, v)) + 0.035 - 0.012 * lunule + 0.11 * nodule(u, v);
};

/* ─────────── dynamique : ressort amorti ─────────── */
class Spring {
  constructor(hz, damping, x = 0) { this.w = 2 * Math.PI * hz; this.z = damping; this.x = x; this.v = 0; }
  step(target, dt) {
    dt = Math.min(dt, 0.1); // onglet revenu au premier plan : pas de saut
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n; // sous-pas : stable même à 15 images/s
    for (let i = 0; i < n; i++) {
      this.v += (this.w * this.w * (target - this.x) - 2 * this.z * this.w * this.v) * h; this.x += this.v * h;
      // contact : les feuillets fermés butent l'un contre l'autre (léger rebond amorti, jamais au-delà de la fermeture)
      if (this.x < 0) { this.x = 0; if (this.v < 0) this.v *= -0.15; }
    }
  }
  snap(x) { this.x = x; this.v = 0; }
}
// Ouverture d'une valve : la base suit la consigne, le bord libre suit la base avec retard (ondulation en voile)
export class Opening {
  constructor(base, tip, x) { this.base = new Spring(...base, x); this.tip = new Spring(...tip, x); this.target = x; }
  step(dt) { this.base.step(this.target, dt); this.tip.step(this.base.x, dt); }
  snap(x) { this.target = x; this.base.snap(x); this.tip.snap(x); }
  at(v) { return Math.min(1.04, Math.max(0, this.base.x + (this.tip.x - this.base.x) * Math.pow(v, 1.5))); }
  get moving() { return Math.abs(this.base.v) + Math.abs(this.tip.v) > 1e-3 || Math.abs(this.tip.x - this.target) > 1e-3; }
}

/* ─────────── lame épaisse ─────────── */
// Surface moyenne (u, v) recalculée à chaque image ; faces supérieure et inférieure décalées de ± épaisseur / 2 le long
// de la normale, bord libre arrondi (rangée intermédiaire). Normales posées directement (pas de recalcul coûteux).
// bulge(u, v) (cm, facultatif) : relief ajouté sur la face supérieure seule (nodules calcaires de la face aortique) ;
// les normales sont alors recalculées sur la géométrie.
export class Shell {
  constructor(nu, nv, material, shade, thick, bulge = null) {
    this.nu = nu; this.nv = nv;
    const W = nu + 1, G = W * (nv + 1), n = 2 * G + W;
    this.G = G;
    this.mid = new Float32Array(G * 3); this.nrm = new Float32Array(G * 3); this.th = new Float32Array(G);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const col = new Uint8Array(n * 4), tis = new Uint8Array(n * 4), par = new Float32Array(n * 3);
    const put = (k, u, v) => {
      const c = shade(u, v);
      for (let q = 0; q < 4; q++) col[k * 4 + q] = Math.round(Math.min(1, Math.max(0, c[q])) * 255);
      tis[k * 4 + 1] = 255; tis[k * 4 + 3] = 255; // tissu lisse, sans identifiant d'enveloppe
      par[k * 3] = u; par[k * 3 + 1] = v; par[k * 3 + 2] = thick(u, v);
    };
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const k = j * W + i, u = i / nu, v = j / nv;
      this.th[k] = thick(u, v);
      if (bulge) (this.bump ??= new Float32Array(G))[k] = bulge(u, v);
      put(k, u, v); put(G + k, u, v);
    }
    for (let i = 0; i <= nu; i++) put(2 * G + i, i / nu, 1);
    g.setAttribute('col', new THREE.BufferAttribute(col, 4, true));
    g.setAttribute('tis', new THREE.BufferAttribute(tis, 4, true));
    g.setAttribute('vparam', new THREE.BufferAttribute(par, 3)); // u, v, épaisseur (cm) : fibres et translucidité
    const idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
      idx.push(a, b, c, b, d, c);                         // face supérieure (normale +N)
      idx.push(G + a, G + c, G + b, G + b, G + c, G + d); // face inférieure (normale −N)
    }
    for (let i = 0; i < nu; i++) { // bord libre arrondi : face sup. → rangée du bord → face inf.
      const t0 = nv * W + i, t1 = t0 + 1, r0 = 2 * G + i, r1 = r0 + 1, b0 = G + t0, b1 = G + t1;
      idx.push(t0, t1, r1, t0, r1, r0, r0, r1, b1, r0, b1, b0);
    }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this._p = new THREE.Vector3();
  }
  // fn(u, v, out) : point de la surface moyenne ; wob(u, v) : déplacement le long de la normale (vibration)
  // formes extrêmes (valve fermée, valve ouverte) mises en cache : point(u, v, open) est linéaire en open
  cache(point) {
    const { nu, nv } = this, W = nu + 1, p = this._p;
    this.c0 = new Float32Array(this.G * 3); this.c1 = new Float32Array(this.G * 3);
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const k = (j * W + i) * 3;
      point(i / nu, j / nv, 0, p); this.c0[k] = p.x; this.c0[k + 1] = p.y; this.c0[k + 2] = p.z;
      point(i / nu, j / nv, 1, p); this.c1[k] = p.x; this.c1[k + 1] = p.y; this.c1[k + 2] = p.z;
    }
  }
  // surface moyenne pour une ouverture openAt(v), déformée par xf(point, raideur)
  updateOpen(openAt, xf, k0, wob) {
    const { c0, c1 } = this;
    this.update((u, v, out, k) => {
      const o = openAt(v), q = k * 3;
      out.set(c0[q] + (c1[q] - c0[q]) * o, c0[q + 1] + (c1[q + 1] - c0[q + 1]) * o, c0[q + 2] + (c1[q + 2] - c0[q + 2]) * o);
      if (xf) xf(out, k0);
    }, wob);
  }
  update(fn, wob = null) {
    const { nu, nv, G, mid, nrm, th } = this, W = nu + 1, p = this._p;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const k = j * W + i;
      fn(i / nu, j / nv, p, k);
      if (wob) { const w = wob(i / nu, j / nv); p.x += nrm[k * 3] * w; p.y += nrm[k * 3 + 1] * w; p.z += nrm[k * 3 + 2] * w; }
      mid[k * 3] = p.x; mid[k * 3 + 1] = p.y; mid[k * 3 + 2] = p.z;
    }
    // normales de la surface moyenne (différences centrées)
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const k = j * W + i;
      const iA = j * W + Math.max(0, i - 1), iB = j * W + Math.min(nu, i + 1), jA = Math.max(0, j - 1) * W + i, jB = Math.min(nv, j + 1) * W + i;
      const ux = mid[iB * 3] - mid[iA * 3], uy = mid[iB * 3 + 1] - mid[iA * 3 + 1], uz = mid[iB * 3 + 2] - mid[iA * 3 + 2];
      const vx = mid[jB * 3] - mid[jA * 3], vy = mid[jB * 3 + 1] - mid[jA * 3 + 1], vz = mid[jB * 3 + 2] - mid[jA * 3 + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
      nrm[k * 3] = nx; nrm[k * 3 + 1] = ny; nrm[k * 3 + 2] = nz;
    }
    const P = this.mesh.geometry.attributes.position.array, N = this.mesh.geometry.attributes.normal.array;
    const bump = this.bump;
    for (let k = 0; k < G; k++) {
      const h = th[k] / 2, hb = h + (bump ? bump[k] : 0);
      for (let q = 0; q < 3; q++) {
        P[k * 3 + q] = mid[k * 3 + q] + nrm[k * 3 + q] * hb; N[k * 3 + q] = nrm[k * 3 + q];
        P[(G + k) * 3 + q] = mid[k * 3 + q] - nrm[k * 3 + q] * h; N[(G + k) * 3 + q] = -nrm[k * 3 + q];
      }
    }
    for (let i = 0; i <= nu; i++) { // bord libre : prolongement de la surface, normale tangente
      const k = nv * W + i, kp = (nv - 1) * W + i;
      let tx = mid[k * 3] - mid[kp * 3], ty = mid[k * 3 + 1] - mid[kp * 3 + 1], tz = mid[k * 3 + 2] - mid[kp * 3 + 2];
      const l = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1; tx /= l; ty /= l; tz /= l;
      const r = (2 * G + i) * 3, h = th[k] / 2;
      P[r] = mid[k * 3] + tx * h; P[r + 1] = mid[k * 3 + 1] + ty * h; P[r + 2] = mid[k * 3 + 2] + tz * h;
      N[r] = tx; N[r + 1] = ty; N[r + 2] = tz;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.normal.needsUpdate = true;
    if (bump) this.mesh.geometry.computeVertexNormals(); // relief des nodules
    this.mesh.geometry.computeBoundingSphere();
  }
}

/* ─────────── cordages ─────────── */
// Faisceau de tubes dont les extrémités bougent : une seule géométrie, topologie fixe, normales radiales.
export class Cords {
  constructor(count, material, radial = 8) {
    this.n = count; this.radial = radial;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * radial * 2 * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * radial * 2 * 3), 3));
    const idx = [];
    for (let s = 0; s < count; s++) for (let j = 0; j < radial; j++) {
      const a = s * radial * 2 + j, b = s * radial * 2 + (j + 1) % radial, c = a + radial, d = b + radial;
      idx.push(a, b, c, b, d, c); // faces tournées vers l'extérieur (normales radiales)
    }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.castShadow = true;
    this._t = new THREE.Vector3(); this._n = new THREE.Vector3(); this._b = new THREE.Vector3(); this._q = new THREE.Vector3();
  }
  // segs : [[a: Vector3, b: Vector3, ra, rb]]
  update(segs) {
    const P = this.mesh.geometry.attributes.position.array, N = this.mesh.geometry.attributes.normal.array, { radial } = this;
    segs.forEach(([a, b, ra, rb], s) => {
      const t = this._t.subVectors(b, a).normalize();
      const n = this._n.set(0, 1, 0); if (Math.abs(t.y) > 0.9) n.set(1, 0, 0);
      n.sub(this._q.copy(t).multiplyScalar(n.dot(t))).normalize();
      const bb = this._b.crossVectors(t, n);
      for (let end = 0; end < 2; end++) {
        const c = end ? b : a, r = end ? rb : ra;
        for (let j = 0; j < radial; j++) {
          const ang = (j / radial) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang), k = (s * radial * 2 + end * radial + j) * 3;
          const nx = n.x * cs + bb.x * sn, ny = n.y * cs + bb.y * sn, nz = n.z * cs + bb.z * sn;
          P[k] = c.x + nx * r; P[k + 1] = c.y + ny * r; P[k + 2] = c.z + nz * r;
          N[k] = nx; N[k + 1] = ny; N[k + 2] = nz;
        }
      }
    });
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.normal.needsUpdate = true;
    this.mesh.geometry.computeBoundingSphere();
  }
}

/* ─────────── valve auriculo-ventriculaire ─────────── */
// opts (vues des valves, js/av-views.js) :
//   prolapse : { leaflet: RegExp, u0, u1, lift, ruptured } — segment (u0–u1) qui se soulève et se retourne dans
//              l'oreillette à la fermeture (prolapsus / feuillet flottant) ; ruptured : cordages de ce segment rompus,
//              libres dans l'oreillette ;
//   dilate : allongement de l'anneau sur la paroi libre (anneau septal fixe) ; gap : défaut de coaptation (cm) ;
//   tether : feuillets attirés vers le ventricule à la fermeture (cm) ;
//   rheum : { a, b, dome } — rétrécissement mitral rhumatismal : commissures soudées, bords libres réunis en un orifice
//           ovale central (demi-axes a le long de la ligne des commissures, b en travers, cm), feuillet antérieur
//           bombé vers le ventricule en diastole (dome, en fraction de la hauteur du feuillet) ;
//   shade, thick, bulge : aspect et épaisseur des feuillets ; cordScale, cordFuse : cordages épaissis, soudés et
//           raccourcis (ramification plus près du feuillet).
export function avValve(id, d, leafletMat, cordMat, opts = {}) {
  const C = V(d.center), A = V(d.axis).normalize(), E1 = V(d.e1), E2 = V(d.e2);
  const [ra, rb] = d.radii;
  const mitral = id === 'valve-mitrale';
  const ant = d.leaflets.find((l) => /Anterior/.test(l.name));
  const tAnt = (ant.t0 + ant.t1) / 2;
  const dir = (th, out) => out.copy(E1).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th)).normalize();
  const sep = d.leaflets.find((l) => /Septal/.test(l.name)), tSep = sep ? (sep.t0 + sep.t1) / 2 : tAnt + Math.PI;
  const dil = opts.dilate ?? 0, gap = opts.gap ?? 0, tether = opts.tether ?? 0, pro = opts.prolapse ?? null, rheum = mitral ? opts.rheum ?? null : null;
  const cs = opts.cordScale ?? 1, fuseC = opts.cordFuse ?? 0;
  const scaleAt = (th) => 1 + dil * (1 - 0.85 * Math.max(0, Math.cos(th - tSep))); // la paroi libre se dilate, pas le septum
  // anneau en selle (plus haut en avant et en arrière pour la mitrale)
  const annulus = (th, out) => out.copy(C).addScaledVector(E1, ra * scaleAt(th) * Math.cos(th)).addScaledVector(E2, rb * scaleAt(th) * Math.sin(th)).addScaledVector(A, -d.saddle * Math.cos(2 * (th - tAnt)));
  const flailBell = (L, u) => (pro && pro.leaflet.test(L.name) ? smooth(pro.u0 - 0.06, pro.u0 + 0.06, u) * (1 - smooth(pro.u1 - 0.06, pro.u1 + 0.06, u)) : 0);
  let tNow = 0;
  // ligne de coaptation. Mitrale : courbe en « sourire » reportée vers l'arrière (le feuillet antérieur couvre
  // l'essentiel de l'orifice), les deux zones d'accolement légèrement décalées l'une de l'autre. Tricuspide : trois
  // rayons (Y), chaque feuillet rejoignant ses voisins le long des rayons de ses commissures.
  const dirAnt = dir(tAnt, new THREE.Vector3()), lineDir = new THREE.Vector3().crossVectors(A, dirAnt).normalize();
  const Rm = (ra + rb) / 2, Cc = C.clone().addScaledVector(dirAnt, -0.05 * Rm);
  const tmpA = new THREE.Vector3(), tmpQ = new THREE.Vector3(), tmpD = new THREE.Vector3(), tmpR = new THREE.Vector3(), tmpM = new THREE.Vector3();
  const coapt = (L, th, u, out) => {
    if (mitral) {
      annulus(th, tmpR); const s = THREE.MathUtils.clamp(tmpR.sub(Cc).dot(lineDir), -0.85 * Rm, 0.85 * Rm);
      const smile = 0.2 * Rm * (1 - (s / (0.85 * Rm)) ** 2);
      return out.copy(Cc).addScaledVector(lineDir, s).addScaledVector(dirAnt, -smile + (L === ant ? 0.04 : -0.04));
    }
    const k = u < 0.5 ? 1 - 2 * u : 2 * u - 1;
    out.copy(C).addScaledVector(dir(u < 0.5 ? L.t0 : L.t1, tmpD), 0.8 * Rm * k);
    // côté de son propre feuillet ; défaut de coaptation surtout central (les bords se rejoignent mieux vers les commissures)
    return out.addScaledVector(dir((L.t0 + L.t1) / 2, tmpM), 0.04 + gap * (0.3 + 2.2 * (1 - k) * (1 - k)));
  };
  const leaflets = d.leaflets.map((L) => {
    const span = L.t1 - L.t0, nu = Math.max(24, Math.round(span / 0.07)), pad = 0.06;
    const shell = new Shell(nu, 22, leafletMat, opts.shade ?? shadeLeaflet, opts.thick ?? thickLeaflet, opts.bulge ?? null);
    const prof = (u) => {
      let h = Math.pow(Math.sin(Math.PI * u), 0.55);
      if (L.scallops > 1) h *= 0.74 + 0.26 * Math.pow(Math.abs(Math.sin(L.scallops * Math.PI * u)), 0.7); // festons et fentes
      return L.height * (0.25 + 0.75 * h);
    };
    // position d'un point de la surface moyenne (u le long de l'anneau, v de l'anneau au bord libre)
    const point = (u, v, open, out) => {
      const th = L.t0 - pad + (span + 2 * pad) * u, h = prof(u);
      annulus(th, tmpA);
      const R = tmpR.copy(tmpA).sub(C).projectOnPlane(A).length();
      dir(th, tmpD);
      // ouvert : le feuillet pend dans le ventricule, légèrement rentré vers le centre
      // voile : ventre bombé vers la paroi au milieu du feuillet, bord libre recourbé vers l'axe, ondulations souples
      // entonnoir : orifice ouvert plus étroit que l'anneau ; pas de ventre au-delà de l'anneau près de la charnière
      // (il traversait le plancher de l'oreillette), voile seulement dans la moitié distale
      const sail = R * (0.13 * Math.sin(Math.PI * v) * Math.pow(Math.sin(Math.PI * u), 0.7) * smooth(0.35, 0.8, v) + 0.025 * Math.sin(3 * Math.PI * u + 2 * v) * v * v);
      const inw = R * (0.22 * v * v + 0.08 * smooth(0.75, 1, v)); // longe la paroi près de la charnière, puis converge
      let ox = tmpA.x + A.x * v * h * 0.95 + tmpD.x * (sail - inw);
      let oy = tmpA.y + A.y * v * h * 0.95 + tmpD.y * (sail - inw);
      let oz = tmpA.z + A.z * v * h * 0.95 + tmpD.z * (sail - inw);
      if (rheum) {
        // rétrécissement rhumatismal : le bord libre est sur l'ovale central (« bouche de poisson »), du côté de son
        // feuillet ; près des commissures, les deux feuillets soudés rejoignent les extrémités de l'ovale. Le corps
        // du feuillet antérieur bombe vers le ventricule (aspect en « crosse de hockey »), le postérieur bouge peu.
        // position le long de l'ovale : d'une commissure à l'autre selon u (sens donné par la commissure de départ)
        const s0 = Math.sign(annulus(L.t0, tmpR).sub(Cc).dot(lineDir)) || 1, sx = s0 * Math.cos(Math.PI * THREE.MathUtils.clamp(u, 0, 1));
        const side = L === ant ? 1 : -1, depth = h * 0.7;
        const ex = Cc.x + lineDir.x * sx * rheum.a + dirAnt.x * side * rheum.b * Math.sqrt(1 - sx * sx) + A.x * depth;
        const ey = Cc.y + lineDir.y * sx * rheum.a + dirAnt.y * side * rheum.b * Math.sqrt(1 - sx * sx) + A.y * depth;
        const ez = Cc.z + lineDir.z * sx * rheum.a + dirAnt.z * side * rheum.b * Math.sqrt(1 - sx * sx) + A.z * depth;
        const dm = (L === ant ? rheum.dome : rheum.dome * 0.3) * h * Math.sin(Math.PI * v) * Math.pow(Math.sin(Math.PI * u), 0.6);
        ox = tmpA.x + (ex - tmpA.x) * v + A.x * dm; oy = tmpA.y + (ey - tmpA.y) * v + A.y * dm; oz = tmpA.z + (ez - tmpA.z) * v + A.z * dm;
      }
      // fermé : le corps du feuillet rejoint la ligne de coaptation en bombant vers l'oreillette, puis la zone
      // d'accolement (bord libre) pend dans le ventricule
      coapt(L, th, u, tmpQ);
      const vc = 0.7, w = smooth(0, vc, v), belly = 0.1 * L.height * Math.sin(Math.PI * Math.min(1, v / vc)) * Math.pow(Math.sin(Math.PI * u), 0.5);
      // segment prolabé : sa zone d'accolement ne pend plus dans le ventricule, elle se retourne vers l'oreillette
      const lip = Math.max(0, (v - vc) / (1 - vc)) * 0.28 * h * (1 - 2 * flailBell(L, u));
      // fermé : forme de tente (coaptation sous le plan de l'anneau), corps à peine bombé vers l'oreillette
      let cx = tmpA.x + (tmpQ.x - tmpA.x) * w - A.x * belly + A.x * ((0.2 + tether) * w + lip);
      let cy = tmpA.y + (tmpQ.y - tmpA.y) * w - A.y * belly + A.y * ((0.2 + tether) * w + lip);
      let cz = tmpA.z + (tmpQ.z - tmpA.z) * w - A.z * belly + A.z * ((0.2 + tether) * w + lip);
      // prolapsus : le segment se soulève au-dessus de l'anneau, son bord libre se retourne dans l'oreillette
      const fl = flailBell(L, u) * Math.pow(smooth(0.1, 1, v), 1.6);
      // (légèrement écarté de la ligne de fermeture : la brèche par où le sang reflue reste visible)
      if (fl > 0) { cx += (-A.x * pro.lift + tmpD.x * 0.14) * fl; cy += (-A.y * pro.lift + tmpD.y * 0.14) * fl; cz += (-A.z * pro.lift + tmpD.z * 0.14) * fl; }
      return out.set(cx + (ox - cx) * open, cy + (oy - cy) * open, cz + (oz - cz) * open);
    };
    shell.cache(point);
    return { L, shell, point, span };
  });
  // cordages : insertions marginales (bord libre, denses) et de 2e ordre (face ventriculaire), groupées par pilier
  const heads = d.papillaries.map((p) => ({ ...p, H: V(p.head) }));
  const groups = new Map();
  for (const lf of leaflets) {
    const nA = Math.max(6, Math.round(lf.span / 0.16)), nB = Math.max(2, Math.round(lf.span / 0.55));
    const ins = [];
    for (let k = 0; k < nA; k++) ins.push([(k + 0.5) / nA, 1]);
    for (let k = 0; k < nB; k++) ins.push([(k + 0.5) / nB, 0.6]);
    // chaque feuillet est tenu par les deux piliers qui encadrent ses commissures
    const near = (t, not) => heads.filter((h) => h !== not).reduce((b, h) => (Math.abs(wrap(t - h.angle)) < Math.abs(wrap(t - b.angle)) ? h : b), heads.find((h) => h !== not) ?? heads[0]);
    const p0 = near(lf.L.t0), p1 = heads.length > 1 ? near(lf.L.t1, p0) : p0;
    for (const [u, v] of ins) {
      const best = u < 0.5 ? p0 : p1;
      const key = `${lf.L.name}|${best.name}`;
      if (!groups.has(key)) groups.set(key, { lf, head: best, marg: [], sec: [], rupt: [] });
      // cordage rompu : détaché du pilier, il reste accroché au bord libre du segment prolabé
      const torn = pro?.ruptured && v === 1 && pro.leaflet.test(lf.L.name) && Math.abs(u - 0.5) < 0.07; // 2 à 3 cordages
      groups.get(key)[torn ? 'rupt' : v === 1 ? 'marg' : 'sec'].push([u, v]);
    }
  }
  // grappes de 3 cordages marginaux voisins (2e niveau de ramification)
  const G = [...groups.values()].map((g) => {
    g.marg.sort((a, b) => a[0] - b[0]);
    g.clusters = [];
    for (let k = 0; k < g.marg.length; k += 3) g.clusters.push(g.marg.slice(k, k + 3));
    return g;
  });
  const nCh = G.reduce((s, g) => s + 1 + g.clusters.length + g.marg.length + g.sec.length + 2 * g.rupt.length, 0);
  // chaque cordage est dessiné en CS tronçons : droit quand il est tendu, courbé quand il est détendu
  const CS = 5, cords = new Cords(nCh * CS, cordMat);
  // xf(point, raideur) : déformation du cycle cardiaque (heart.js) ; feuillets portés par l'anneau, têtes des piliers
  // entraînées par la paroi ventriculaire (même raideur que les piliers)
  const mean = (pts) => pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  const lineDirR = new THREE.Vector3().crossVectors(A, E1).normalize();
  const rawChords = (openAt, xf) => {
    const out = [];
    const ins = (g, [u, v]) => { const q = g.lf.point(u, v, openAt(v), new THREE.Vector3()); if (xf) xf(q, 0.1); return q; };
    for (const g of G) {
      const H = g.head.H.clone(); if (xf) xf(H, 0.24);
      const marg = g.clusters.map((cl) => cl.map((x) => ins(g, x)));
      const sec = g.sec.map((x) => ins(g, x));
      const rupt = g.rupt.map((x) => ins(g, x));
      // tronc et branches inextensibles : longueur fixée valve fermée (g.lenB, g.lenC), direction suivant les feuillets
      const toward = (from, to, len, frac) => { const d = to.clone().sub(from); const l = d.length() || 1; return from.clone().addScaledVector(d, (len ?? l * frac) / l); };
      const mAll = mean([...marg.flat(), ...sec].length ? [...marg.flat(), ...sec] : rupt);
      if (g.lenB === undefined) g.lenB = H.distanceTo(mAll) * (0.36 + 0.3 * fuseC); // cordages soudés : tronc plus long
      const B = toward(H, mAll, g.lenB);
      out.push([H, B, 0.055 * cs, 0.042 * cs, 0.042 * cs]);                 // tronc
      for (const p of sec) out.push([B, p, 0.026 * cs, 0.02 * cs, 0.036 * cs]); // 2e ordre, évasé à l'insertion
      g.lenC ??= [];
      for (const [ci, cl] of marg.entries()) {
        const mc = mean(cl);
        if (g.lenC[ci] === undefined) g.lenC[ci] = B.distanceTo(mc) * (0.55 + 0.3 * fuseC);
        const Bc = toward(B, mc, g.lenC[ci]);
        out.push([B, Bc, 0.03 * cs, 0.022 * cs, 0.022 * cs]);              // branche
        for (const p of cl) out.push([Bc, p, 0.016 * cs, 0.013 * cs, 0.03 * cs]); // cordage fin, pied évasé
      }
      // cordages rompus : bout libre qui flotte dans l'oreillette au rythme du flux
      // bout libre : dans l'oreillette quand la valve se ferme, dans le ventricule quand elle s'ouvre ; courbé, il flotte
      const s = 1 - 2 * openAt(1);
      rupt.forEach((p, k) => {
        const out1 = dir(g.lf.L.t0 + g.lf.span * g.rupt[k][0], tmpM);
        const e = p.clone().addScaledVector(A, -0.6 * s).addScaledVector(out1, 0.3).addScaledVector(lineDirR, 0.15 * Math.sin(6 * tNow + 2.3 * k) + 0.12 * (k - 1));
        const m = p.clone().lerp(e, 0.5).addScaledVector(out1, 0.12).addScaledVector(lineDirR, 0.06 * Math.sin(6 * tNow + 1.1 + 2.3 * k));
        out.push([p, m, 0.026, 0.019, 0.019, true], [m, e, 0.019, 0.013, 0.013, true]); // libres : pas tenus sous le feuillet
      });
    }
    return out;
  };
  // longueur de repos : valve fermée (cordages tendus)
  const rest = rawChords(() => 0, null).map(([a, b]) => a.distanceTo(b));
  const ctl = new THREE.Vector3(), mid = new THREE.Vector3(), sd = new THREE.Vector3();
  const bez = (a, c, b, t, out) => out.copy(a).multiplyScalar((1 - t) * (1 - t)).addScaledVector(c, 2 * t * (1 - t)).addScaledVector(b, t * t);
  // Les cordages restent sous les feuillets (côté ventricule) : vus depuis l'oreillette, ils n'apparaissent qu'à travers
  // l'orifice, jamais par-dessus la face auriculaire d'un feuillet. Chaque point d'un cordage est comparé, dans le
  // demi-plan (rayon, profondeur) de sa direction autour de l'axe, au profil du feuillet qui occupe cette direction ;
  // s'il est au-dessus (ou dans l'épaisseur du feuillet), il est repoussé sous sa face ventriculaire.
  const Cd = new THREE.Vector3(), cq = new THREE.Vector3(), cr = new THREE.Vector3();
  // profils (rayon, profondeur) de chaque colonne de feuillet, calculés à la demande une fois par image
  const prof = leaflets.map((lf) => ({ lf, r: new Float32Array((lf.shell.nu + 1) * (lf.shell.nv + 1)), a: new Float32Array((lf.shell.nu + 1) * (lf.shell.nv + 1)), gen: new Int32Array(lf.shell.nu + 1).fill(-1) }));
  let profGen = 0;
  const underLeaflets = (p, margin) => {
    cq.subVectors(p, Cd); const al = cq.dot(A); cr.copy(cq).addScaledVector(A, -al);
    const r = cr.length(); if (r < 1e-4) return;
    const th = Math.atan2(cr.dot(E2), cr.dot(E1));
    let need = -Infinity;
    for (const P of prof) {
      const { lf } = P, t0 = lf.L.t0 - 0.06, sp = lf.span + 0.12;
      const u = ((((th - t0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / sp;
      if (u > 1) continue;
      const { nu, nv, mid: M } = lf.shell, i = Math.round(u * nu), o = i * (nv + 1);
      if (P.gen[i] !== profGen) { // profil du feuillet dans ce demi-plan
        P.gen[i] = profGen;
        for (let j = 0; j <= nv; j++) {
          const k = (j * (nu + 1) + i) * 3;
          const x = M[k] - Cd.x, y = M[k + 1] - Cd.y, z = M[k + 2] - Cd.z, a = x * A.x + y * A.y + z * A.z;
          const rx = x - A.x * a, ry = y - A.y * a, rz = z - A.z * a;
          P.a[o + j] = a; P.r[o + j] = Math.sqrt(rx * rx + ry * ry + rz * rz);
        }
      }
      for (let j = 0; j < nv; j++) {
        const r0 = P.r[o + j], r1 = P.r[o + j + 1];
        if ((r - r0) * (r - r1) > 0 || r0 === r1) continue;
        need = Math.max(need, P.a[o + j] + (P.a[o + j + 1] - P.a[o + j]) * (r - r0) / (r1 - r0));
      }
    }
    if (need > -Infinity && al < need + margin) p.addScaledVector(A, need + margin - al);
  };
  // base rapide, bord libre plus lent : ouverture « en voile », léger rebond à la fermeture
  const op = new Opening([12, 0.75], [8, 0.65], 0.9);
  let flow = 0;
  const draw = (xf, time) => {
    tNow = time;
    const openAt = (v) => op.at(v);
    // vibration du bord libre dans le flux de remplissage (valve ouverte, cœur qui bat)
    const wob = flow > 0 ? (u, v) => flow * 0.022 * v * v * Math.sin(2 * Math.PI * 7 * time + 9 * u + 2 * v) * Math.max(0, op.tip.x) : null;
    for (const lf of leaflets) lf.shell.updateOpen(openAt, xf, 0.1, wob);
    Cd.copy(C); if (xf) xf(Cd, 0.1);
    profGen++;
    const segs = [];
    rawChords(openAt, xf).forEach(([a, b, r0, r1, foot, free], i) => {
      const dd = a.distanceTo(b), L0 = rest[i];
      mid.addVectors(a, b).multiplyScalar(0.5);
      let h = 0;
      if (dd < L0 && dd > 1e-4) h = Math.min(0.12 * L0, 0.5 * Math.sqrt((3 * dd * (L0 - dd)) / 8));
      sd.subVectors(b, a).normalize();
      // détendu, le cordage s'incurve vers la paroi et vers la pointe, jamais vers l'orifice ni l'oreillette
      ctl.subVectors(mid, Cd).projectOnPlane(A).normalize().addScaledVector(A, 0.6);
      ctl.addScaledVector(sd, -ctl.dot(sd)).normalize();
      ctl.multiplyScalar(2 * h).add(mid);
      let prev = a.clone(); if (!free) underLeaflets(prev, 0.06 + r0);
      for (let k = 1; k <= CS; k++) {
        const p = k === CS ? b.clone() : bez(a, ctl, b, k / CS, new THREE.Vector3());
        const rk = k === CS ? foot : r0 + (r1 - r0) * k / CS;
        if (!free) underLeaflets(p, 0.06 + rk);
        segs.push([prev, p, r0 + (r1 - r0) * (k - 1) / CS, rk]);
        prev = p;
      }
    });
    cords.update(segs);
  };
  const valve = {
    meshes: [...leaflets.map((l) => l.shell.mesh), cords.mesh],
    setTarget: (o) => { op.target = o; },
    snap: (o, xf) => { op.snap(o); draw(xf, 0); },
    // avance la dynamique ; redessine si la valve bouge, si le cœur s'est déformé (dirty) ou si elle vibre (live)
    step: (dt, time, xf, dirty, live) => {
      op.step(dt);
      flow = live ? smooth(0.5, 0.9, op.target) : 0;
      const moving = op.moving || flow > 0 || (live && !!pro?.ruptured);
      if (moving || dirty) draw(xf, time);
      return moving;
    },
    // repères pour les vues des valves
    leaflets: leaflets.map((l) => ({ name: l.L.name, t0: l.L.t0, t1: l.L.t1, point: l.point })),
    annulus, center: C, axis: A, dir: (th) => dir(th, new THREE.Vector3()), heads: heads.map((h) => h.H.clone()),
  };
  valve.snap(0.9, null);
  return valve;
}

/* ─────────── valve sigmoïde ─────────── */
function slValve(id, d, cuspMat) {
  const C = V(d.center), A = V(d.axis).normalize(), E1 = V(d.e1), E2 = V(d.e2);
  const R = d.radius, Hc = d.height;
  const dir = (th, out) => out.copy(E1).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th)).normalize();
  const tD = new THREE.Vector3(), t0D = new THREE.Vector3(), t1D = new THREE.Vector3(), Hp = new THREE.Vector3(), Fc = new THREE.Vector3(), Fo = new THREE.Vector3();
  const cusps = d.cusps.map((c) => {
    const shell = new Shell(26, 16, cuspMat, shadeCusp, thickCusp);
    const point = (u, v, open, out) => {
      const th = c.t0 + (c.t1 - c.t0) * u;
      dir(th, tD); dir(c.t0, t0D); dir(c.t1, t1D);
      // ligne d'attache en croissant : basse au milieu de la cuspide, haute aux commissures
      Hp.copy(C).addScaledVector(tD, R).addScaledVector(A, Hc * 0.95 * (1 - Math.sin(Math.PI * u)));
      // bord libre fermé : deux segments le long des rayons des commissures (fermeture en Y), nodule au centre
      const s = u < 0.5 ? 1 - 2 * u : 2 * u - 1;
      Fc.copy(C).addScaledVector(A, Hc * (0.8 + 0.06 * (1 - s))).addScaledVector(u < 0.5 ? t0D : t1D, R * 0.98 * s);
      // bord libre ouvert : plaqué contre la paroi de la racine
      // ouverte : bord libre à ≈ 0,76 R (surface libre 41 % plus petite que l'anneau, Lansac 2019), à distance de la paroi
      // du sinus (tourbillons des sinus de Valsalva, Bellhouse 1969) : jamais plaqué contre elle
      Fo.copy(C).addScaledVector(tD, R * 0.76).addScaledVector(A, Hc * 1.02);
      const F = Fc.lerp(Fo, open);
      out.copy(Hp).lerp(F, v);
      // ventre de la poche : vers le ventricule quand elle est fermée (remplie de sang), vers le sinus quand elle s'ouvre
      const bulge = Math.sin(Math.PI * v) * Math.sin(Math.PI * u);
      out.addScaledVector(A, -0.32 * Hc * bulge * (1 - open)).addScaledVector(tD, 0.06 * R * bulge * open);
      return out;
    };
    shell.cache(point);
    return { shell, point };
  });
  const op = new Opening([14, 0.75], [9, 0.65], 0);
  let flow = 0;
  const draw = (xf, time) => {
    // vibration du bord libre pendant l'éjection
    const wob = flow > 0 ? (u, v) => flow * 0.03 * v * v * Math.sin(2 * Math.PI * 9 * time + 12 * u) * Math.max(0, op.tip.x) : null;
    for (const c of cusps) c.shell.updateOpen((v) => op.at(v), xf, 0.04, wob);
  };
  const valve = {
    meshes: cusps.map((c) => c.shell.mesh),
    setTarget: (o) => { op.target = o; },
    snap: (o, xf) => { op.snap(o); draw(xf, 0); },
    step: (dt, time, xf, dirty, live) => {
      op.step(dt);
      flow = live ? smooth(0.5, 0.9, op.target) : 0;
      const moving = op.moving || flow > 0;
      if (moving || dirty) draw(xf, time);
      return moving;
    },
  };
  valve.snap(0, null);
  return valve;
}

// Construit les quatre valves. makeMat(id, preset) fournit les matériaux (feuillet, cordage) de heart.js.
export function buildValves(valves, makeMat) {
  const out = {};
  for (const [id, d] of Object.entries(valves)) {
    out[id] = d.type === 'av' ? avValve(id, d, makeMat(id, 'valve'), makeMat(id, 'cordage')) : slValve(id, d, makeMat(id, 'valve'));
  }
  return out;
}
