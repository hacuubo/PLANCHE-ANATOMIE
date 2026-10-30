// Doppler couleur (mode « couleur » de l'ETT), adapté aux vues des valves : les flux à travers la valve regardée sont
// dessinés en volume dans le cœur qui bat, comme des jets de fumée colorés à la manière de l'échographie.
//   - Sonde à la pointe du cœur (voie apicale, celle des coupes 4 et 5 cavités) : rouge = le sang va vers la sonde,
//     bleu = il s'en éloigne (convention BART) ; plus la vitesse est grande, plus la couleur s'éclaircit (rouge →
//     jaune, bleu → cyan). Seule la composante de la vitesse dans l'axe de la sonde compte : un flux perpendiculaire
//     à l'axe s'éteint.
//   - Limite de Nyquist ± 0,7 m/s : au-delà, la couleur se replie (jaune → cyan) ; un jet de fuite ou de
//     rétrécissement (2 à 5 m/s), turbulent, donne une « mosaïque » (repliements en tous sens, vert de la variance).
//     Les flux normaux (remplissage, éjection) restent sous la limite à l'échelle choisie : couleur homogène.
//   - Zone de convergence (PISA) en amont d'un orifice étroit : le sang y accélère vers l'orifice, v = Q / (2π r²)
//     (vitesse égale sur chaque demi-sphère centrée sur l'orifice) ; là où v atteint la limite de Nyquist, la couleur
//     change brusquement (repliement).
// Chronologie : celle du cycle du modèle (heart.cycle, adulte à 64/min) — fuite mitrale et tricuspide pendant toute la
// systole (holosystolique, de la fermeture de la valve auriculo-ventriculaire à sa réouverture), fuite aortique
// pendant toute la diastole, plus forte au début (protodiastolique) ; remplissage en deux ondes E et A ; éjection
// maximale au premier tiers. Ordres de grandeur : vitesse de la fuite mitrale ≈ 5 m/s, aortique ≈ 4 m/s, tricuspide
// ≈ 2,8 m/s ; rétrécissement aortique serré ≥ 4 m/s, mitral ≈ 2 m/s (recommandations ASE 2017 sur la quantification
// des fuites valvulaires ; ESC/EACTS 2021).
import * as THREE from 'three';

export const NYQUIST = 0.7; // m/s
const P_MS = 940;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrap = (t) => ((t % P_MS) + P_MS) % P_MS;
// fenêtre [a, b] (ms, éventuellement à cheval sur la fin du cycle), fronts de r ms ; x : position dans la fenêtre (0 → 1)
const span = (t, a, b, r = 20) => {
  t = wrap(t); const len = wrap(b - a), x = wrap(t - a);
  if (x > len) return { on: 0, x: 0 };
  return { on: sm(0, r, x) * (1 - sm(len - r, len, x)), x: x / len };
};
const gauss = (t, c, w) => { const d = Math.min(Math.abs(wrap(t) - c), P_MS - Math.abs(wrap(t) - c)); return Math.exp(-((d / w) ** 2)); };
// intensités (0 → 1) au temps t (ms) ; instants des ouvertures et fermetures : heart.js (cycle)
const T = {
  mitral: (t) => span(t, 590, 175).on * Math.min(1, 0.15 + gauss(t, 650, 60) + 0.62 * gauss(t, 110, 45)),
  tricuspid: (t) => span(t, 555, 185).on * Math.min(1, 0.15 + gauss(t, 620, 60) + 0.62 * gauss(t, 100, 45)),
  aortic: (t) => { const s = span(t, 210, 495); return s.on * Math.sin(Math.PI * Math.pow(s.x, 0.7)); },
  pulmonary: (t) => { const s = span(t, 205, 520); return s.on * Math.sin(Math.PI * Math.pow(s.x, 0.75)); },
  as: (t) => { const s = span(t, 210, 495); return s.on * (0.35 + 0.65 * Math.sin(Math.PI * s.x)); }, // pic plus tardif
  ms: (t) => span(t, 590, 175).on * Math.min(1, 0.7 + 0.3 * gauss(t, 650, 80) + 0.35 * gauss(t, 110, 45)), // flux continu
  mr: (t) => { const s = span(t, 175, 590, 15); return s.on * (0.7 + 0.3 * Math.sin(Math.PI * s.x)); },
  tr: (t) => { const s = span(t, 185, 555, 15); return s.on * (0.7 + 0.3 * Math.sin(Math.PI * s.x)); },
  ar: (t) => { const s = span(t, 495, 210, 15); return s.on * (1 - 0.4 * s.x); },
};
// instant représentatif d'une vue figée (valve ouverte ou fermée, cœur arrêté hors du cycle)
export const restTime = (phase, open) => (phase === 'av' ? (open ? 650 : 330) : (open ? 300 : 650));

// Rendu « fumée » : chaque flux est un nuage de bouffées floues (particules) qui naissent à l'orifice, s'élargissent,
// tourbillonnent et s'estompent ; chaque bouffée prend la couleur Doppler de sa vitesse (repliement, variance). La zone
// de convergence est un nuage aspiré vers l'orifice, de plus en plus vite (v = Q / 2πr²) : la couleur change là où la
// vitesse atteint la limite de Nyquist. Les bouffées vont bien moins vite que le sang (quelques dixièmes de seconde
// pour parcourir le jet, au lieu de quelques centièmes) : le mouvement reste lisible ; la couleur, elle, vient de la
// vitesse réelle. Bouffées cachées par les tissus : visibles en transparence.
const GLSL_V = /* glsl */`
uniform float uScale;
attribute vec3 color; attribute float aAlpha; attribute float aSize; attribute float aSeed;
varying vec3 vC; varying float vA; varying float vSeed;
void main() {
  vC = color; vA = aAlpha; vSeed = aSeed;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
}`;
const GLSL_F = /* glsl */`
uniform float uGhost;
varying vec3 vC; varying float vA; varying float vSeed;
float h21(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0; float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  // bouffée de fumée : masse floue au bord effiloché, grumeleuse (bruit propre à chaque bouffée, tournée au hasard)
  float c = cos(vSeed * 6.283), s = sin(vSeed * 6.283); vec2 q = mat2(c, -s, s, c) * p * 2.1 + vSeed * 37.0;
  float n = 0.62 * vn(q) + 0.38 * vn(q * 2.3 + 5.1);
  float a = vA * smoothstep(1.0, 0.15, sqrt(r2) + 0.35 * (n - 0.5)) * (0.45 + 0.9 * n) * (uGhost > 0.5 ? 0.25 : 1.0);
  gl_FragColor = vec4(vC, a);
}`;
// carte BART (même que l'échographe) : x = vitesse / Nyquist, déjà repliée dans [-1, 1]
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const bart = (x) => {
  if (x >= 0) return mixc(mixc([0.5, 0, 0.03], [0.95, 0.06, 0.03], sm(0, 0.5, x)), [1, 0.92, 0.3], sm(0.55, 1, x));
  const y = -x;
  return mixc(mixc([0, 0.04, 0.5], [0.05, 0.3, 1], sm(0, 0.5, y)), [0.5, 1, 1], sm(0.55, 1, y));
};
const GREEN = [0.25, 0.95, 0.35];
const fold = (x) => ((((x + 1) % 2) + 2) % 2) - 1; // repliement au-delà de la limite de Nyquist

export function createDoppler(heart) {
  const group = new THREE.Group(); group.visible = false;
  heart.root.add(group);
  const scale = { value: 800 };
  const material = (ghost) => new THREE.ShaderMaterial({
    uniforms: { uScale: scale, uGhost: { value: ghost ? 1 : 0 } }, vertexShader: GLSL_V, fragmentShader: GLSL_F,
    transparent: true, depthWrite: false, depthTest: !ghost,
  });
  const matMain = material(false), matGhost = material(true);
  const probe = new THREE.Vector3(), tmp = new THREE.Vector3(), toP = new THREE.Vector3();
  const rnd = (a = 1) => (Math.random() * 2 - 1) * a;

  // un flux : spec (origin, dir, len, r0, r1, v0, turb, laminar, bend, time, pisa : { center, up, q }) → nuage
  const buildFlow = (f) => {
    const d = f.dir.clone().normalize(), p2 = f.origin.clone().addScaledVector(d, f.len);
    if (f.bend) p2.addScaledVector(f.bend, f.len);
    const curve = new THREE.QuadraticBezierCurve3(f.origin.clone(), f.origin.clone().addScaledVector(d, f.len * 0.5), p2);
    const NS = 48, fr = curve.computeFrenetFrames(NS, false), pts = curve.getSpacedPoints(NS);
    const rad = (s) => f.r0 + (f.r1 - f.r0) * Math.pow(s, 0.6);
    const nJ = f.laminar ? 320 : 560, nP = f.pisa ? 200 : 0, n = nJ + nP;
    const J = Array.from({ length: nJ }, () => ({ alive: false })), Pz = Array.from({ length: nP }, () => ({ alive: false }));
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), alp = new Float32Array(n), siz = new Float32Array(n), seed = new Float32Array(n);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1)); geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setDrawRange(0, 0);
    const grp = new THREE.Group();
    for (const [m, ro] of [[matMain, 7], [matGhost, 6]]) { const o = new THREE.Points(geo, m); o.frustumCulled = false; o.renderOrder = ro; grp.add(o); }
    // PISA : rayon où la vitesse atteint la limite de Nyquist ; le nuage naît 1,8 fois plus loin
    const rA = f.pisa ? Math.sqrt(f.pisa.q / (2 * Math.PI * NYQUIST)) : 0, R0 = rA * 1.8, up = f.pisa ? f.pisa.up.clone().normalize() : null;
    const kP = R0 ** 3 / (3 * 0.55); // dr/dt = −kP / r² : ≈ 0,55 s du bord du nuage à l'orifice
    const transit = f.laminar ? 0.5 : 0.38; // durée de parcours du jet par une bouffée (s, vitesse réelle du battement)
    let accJ = 0, accP = 0;
    const frame = (s) => Math.min(NS, Math.max(0, Math.round(s * NS)));
    const spawnJ = (b) => {
      const a = Math.random() * Math.PI * 2, q = Math.sqrt(Math.random()) * 0.85;
      Object.assign(b, { alive: true, s: 0, x: Math.cos(a) * q, y: Math.sin(a) * q, vx: 0, vy: 0, jit: rnd(), sz: 0.75 + Math.random() * 0.5, seed: Math.random() });
    };
    const spawnP = (b) => {
      let dirv; do { dirv = new THREE.Vector3(rnd(), rnd(), rnd()); } while (dirv.lengthSq() > 1 || dirv.lengthSq() < 0.05 || dirv.dot(up) < 0.15 * dirv.length());
      Object.assign(b, { alive: true, r: R0 * (0.85 + Math.random() * 0.15), u: dirv.normalize(), sz: 0.8 + Math.random() * 0.4, seed: Math.random() });
    };
    // avance du nuage (dt en s, intensité du flux) ; le battement accéléré ou ralenti agit sur dt
    const step = (dt, I) => {
      accJ += (I * nJ / (transit * 1.15)) * dt;
      for (const b of J) {
        if (b.alive) {
          b.s += dt / transit * (1.6 - 1.2 * b.s); // rapide à l'orifice, ralentit en s'éloignant
          const tb = (f.turb ?? 0) * 3 + 0.6; // tourbillons : plus forts dans un jet turbulent, croissent avec la distance
          b.vx += rnd(tb * 9) * dt * (0.3 + b.s); b.vy += rnd(tb * 9) * dt * (0.3 + b.s); b.vx *= 0.92; b.vy *= 0.92;
          b.x += b.vx * dt; b.y += b.vy * dt; const l = Math.hypot(b.x, b.y); if (l > 1.15) { b.x *= 1.15 / l; b.y *= 1.15 / l; }
          if (Math.random() < dt * 6) b.jit = Math.max(-1, Math.min(1, b.jit + rnd(0.8))); // vitesses qui changent : mosaïque vivante
          if (b.s >= 1) b.alive = false;
        } else if (accJ >= 1) { accJ -= 1; spawnJ(b); }
      }
      accJ = Math.min(accJ, 3);
      if (!nP) return;
      accP += (I * nP / 0.55) * dt;
      for (const b of Pz) {
        if (b.alive) { b.r -= kP / (b.r * b.r) * dt; if (b.r < 0.1) b.alive = false; }
        else if (accP >= 1) { accP -= 1; spawnP(b); }
      }
      accP = Math.min(accP, 3);
    };
    // positions, couleurs, tailles, opacités dans les attributs (repère du cœur au repos ; translation du battement à part)
    const write = () => {
      let k = 0;
      toP.copy(probe);
      for (const b of J) {
        if (!b.alive) continue;
        const i = frame(b.s), r = rad(b.s), P = pts[i], N = fr.normals[i], B = fr.binormals[i], Tg = fr.tangents[i];
        tmp.copy(P).addScaledVector(N, b.x * r).addScaledVector(B, b.y * r);
        pos[k * 3] = tmp.x; pos[k * 3 + 1] = tmp.y; pos[k * 3 + 2] = tmp.z;
        // vitesse réelle : maximale sur le premier dixième du jet, puis en 1/distance ; en cloche vers le bord
        const e2 = b.x * b.x + b.y * b.y, turb = f.turb ?? 0;
        let v = f.v0 * (f.laminar ? 1 - 0.4 * b.s : Math.min(1, 0.1 / Math.max(b.s, 0.01))) * Math.exp(-1.6 * e2);
        v *= Math.max(0.15, 1 + turb * 0.55 * b.jit);
        const vt = v * Tg.dot(tmp.sub(toP).negate().normalize()), x = vt / NYQUIST;
        let c = bart(fold(x));
        if (turb && b.s < 0.6 && b.jit > 0.55) c = mixc(c, GREEN, 0.55 * turb); // variance (turbulence)
        col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
        siz[k] = (r * (0.7 + 0.7 * b.s) + 0.06) * b.sz; seed[k] = b.seed;
        alp[k] = (f.laminar ? 0.2 : 0.34) * sm(0, 0.06, b.s) * (1 - sm(0.65, 1, b.s)) * (0.35 + 0.65 * sm(0.02, 0.15, Math.abs(x)));
        k++;
      }
      for (const b of Pz) {
        if (!b.alive) continue;
        tmp.copy(f.pisa.center).addScaledVector(b.u, b.r);
        pos[k * 3] = tmp.x; pos[k * 3 + 1] = tmp.y; pos[k * 3 + 2] = tmp.z;
        const v = f.pisa.q / (2 * Math.PI * b.r * b.r), vt = -v * b.u.dot(tmp.sub(toP).negate().normalize()), x = vt / NYQUIST;
        const c = bart(fold(x));
        col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
        siz[k] = (0.12 + 0.22 * b.r / R0) * b.sz; seed[k] = b.seed;
        alp[k] = 0.3 * sm(R0, R0 * 0.8, b.r) * sm(0.08, 0.25, b.r);
        k++;
      }
      geo.setDrawRange(0, k);
      for (const a of ['position', 'color', 'aAlpha', 'aSize', 'aSeed']) geo.attributes[a].needsUpdate = true;
    };
    const reset = () => { J.forEach((b) => { b.alive = false; }); Pz.forEach((b) => { b.alive = false; }); accJ = accP = 0; geo.setDrawRange(0, 0); };
    return { grp, step, write, reset, time: f.time, anchor: f.origin.clone(), warm: null };
  };

  // flux de chaque valve et variante (géométrie de la valve : heart.valveData ; axes orientés dans le sens du flux normal)
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const specs = (key, variant) => {
    const id = { aortique: 'valve-aortique', pulmonaire: 'valve-pulmonaire', mitrale: 'valve-mitrale', tricuspide: 'valve-tricuspide' }[key];
    const d = id && heart.valveData[id];
    if (!d) return [];
    const C = V3(d.center), A = V3(d.axis).normalize(), at = (h) => C.clone().addScaledVector(A, h);
    if (key === 'aortique' || key === 'pulmonaire') {
      const R = d.radius, Hc = d.height, aortic = key === 'aortique';
      const fwd = { origin: at(Hc * 0.25), dir: A, len: 3.4, r0: R * 0.62, r1: R * 0.78, v0: 0.62, laminar: true, time: aortic ? T.aortic : T.pulmonary };
      if (aortic && variant === 'ia') // fuite centrale (type I), vers la pointe ; convergence côté aorte
        return [fwd, { origin: at(Hc * 0.45), dir: A.clone().negate(), len: 4.4, r0: 0.3, r1: 0.95, v0: 4, turb: 1, time: T.ar,
          pisa: { center: at(Hc * 0.8), up: A, q: 0.35 * 4 } }];
      if (aortic && variant === 'rao') // jet étroit et rapide dans l'aorte ; accélération dans la chambre de chasse
        return [{ origin: at(Hc * 0.92), dir: A, len: 4.2, r0: 0.26, r1: 0.85, v0: 4.5, turb: 1, time: T.as,
          pisa: { center: at(Hc * 0.62), up: A.clone().negate(), q: 0.7 * 4.5 } }];
      if (!aortic && variant === 'stenose')
        return [{ origin: at(Hc * 1.4), dir: A, len: 4.2, r0: 0.3, r1: 0.95, v0: 4, turb: 1, time: T.pulmonary,
          pisa: { center: at(Hc * 1.1), up: A.clone().negate(), q: 0.6 * 4 } }];
      return [fwd];
    }
    const mitral = key === 'mitrale', Rm = (d.radii[0] + d.radii[1]) / 2;
    const ant = mitral ? heart.landmarks.valves['valve-aortique'].center.clone().sub(C).projectOnPlane(A).normalize() : null; // vers l'aorte
    const Cc = mitral ? C.clone().addScaledVector(ant, -0.05 * Rm) : C.clone();
    const fwd = { origin: Cc.clone().addScaledVector(A, 0.35), dir: A, len: 3.6, r0: Rm * 0.62, r1: Rm * 0.72, v0: 0.6, laminar: true, time: mitral ? T.mitral : T.tricuspid };
    if (mitral && variant === 'prolapsus') { // fuite en regard de P2, jet excentré dirigé vers l'avant (le long du septum
      // interauriculaire et de la racine aortique), opposé au feuillet qui prolabe ; convergence côté ventricule
      const o = Cc.clone().addScaledVector(ant, -0.28 * Rm).addScaledVector(A, -0.12);
      return [fwd, { origin: o, dir: A.clone().negate().addScaledVector(ant, 0.55), bend: ant.clone().multiplyScalar(0.35), len: 4.4, r0: 0.28, r1: 0.9, v0: 5, turb: 1, time: T.mr,
        pisa: { center: o.clone().addScaledVector(A, 0.12), up: A, q: 0.4 * 5 } }];
    }
    if (mitral && variant === 'rhumatismal') // orifice étroit au bout des feuillets : jet rapide vers la pointe ; dôme de
      // convergence côté oreillette (PISA du rétrécissement mitral)
      return [{ origin: Cc.clone().addScaledVector(A, 1.0), dir: A, len: 4.4, r0: 0.5, r1: 1.0, v0: 1.9, turb: 0.8, time: T.ms,
        pisa: { center: Cc.clone().addScaledVector(A, 0.75), up: A.clone().negate(), q: 1.05 * 1.9 } }];
    if (!mitral && variant === 'dilatation') // fuite centrale (feuillets attirés dans le ventricule) vers le fond de l'OD
      return [fwd, { origin: C.clone().addScaledVector(A, 0.42), dir: A.clone().negate(), len: 3.8, r0: 0.38, r1: 1.0, v0: 2.8, turb: 0.9, time: T.tr,
        pisa: { center: C.clone().addScaledVector(A, 0.5), up: A, q: 0.5 * 2.8 } }];
    return [fwd];
  };

  const cache = new Map();
  const flowsOf = (k, v) => {
    const id = k + ':' + v;
    if (!cache.has(id)) { const fl = specs(k, v).map(buildFlow); fl.forEach((f) => group.add(f.grp)); cache.set(id, fl); }
    return cache.get(id);
  };
  // live : flux simulés (en écran partagé, ceux de la valve normale aussi) ; show : flux affichés
  let active = false, key = null, variant = 'normale', both = false, live = [];
  const show = (name) => {
    const vis = active && key ? flowsOf(key, name) : [];
    for (const fl of cache.values()) fl.forEach((f) => { f.grp.visible = vis.includes(f); });
    group.visible = live.length > 0;
  };
  const sync = () => {
    const want = active && key ? [...flowsOf(key, variant), ...(both && variant !== 'normale' ? flowsOf(key, 'normale') : [])] : [];
    for (const f of want) if (!live.includes(f)) { f.reset(); f.warm = null; }
    live = want;
    show(variant);
  };
  return {
    group,
    // vue d'une valve (k : 'aortique', 'mitrale'… ; null : pas de valve), variante affichée ; compare : écran partagé
    setView(k, v, compare = false) { key = ['aortique', 'pulmonaire', 'mitrale', 'tricuspide'].includes(k) ? k : null; variant = v ?? 'normale'; both = compare; sync(); },
    setActive(on) { active = on; sync(); },
    show, // écran partagé : flux de la moitié dessinée (sans remise à zéro)
    // dt : secondes (vitesse du battement comprise ; 0 : cœur arrêté) ; t : instant du cycle (ms) ; camera et height
    // (hauteur de l'image en pixels) : taille apparente des bouffées
    update(dt, t, camera, height) {
      if (!group.visible) return;
      scale.value = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      probe.copy(heart.landmarks.apex);
      for (const f of live) {
        if (dt > 0) { f.step(Math.min(dt, 0.05), f.time(t)); f.warm = null; }
        else if (f.warm !== t) { // cœur arrêté : nuage établi à cet instant (1,5 s de flux simulées)
          f.reset(); const I = f.time(t);
          for (let i = 0; i < 60; i++) f.step(1 / 40, I);
          f.warm = t;
        } else continue;
        f.write();
        f.grp.position.copy(heart.deformPoint(tmp.copy(f.anchor))).sub(f.anchor); // le flux suit la valve qui bat
      }
    },
  };
}
