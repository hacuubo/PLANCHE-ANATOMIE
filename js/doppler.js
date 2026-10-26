// Doppler couleur (mode « couleur » de l'ETT), adapté aux vues des valves : les flux à travers la valve regardée sont
// dessinés en volume dans le cœur qui bat, colorés comme à l'échographie.
//   - Sonde à la pointe du cœur (voie apicale, celle des coupes 4 et 5 cavités) : rouge = le sang va vers la sonde,
//     bleu = il s'en éloigne (convention BART) ; plus la vitesse est grande, plus la couleur s'éclaircit (rouge →
//     jaune, bleu → cyan). Seule la composante de la vitesse dans l'axe de la sonde compte : un flux perpendiculaire
//     à l'axe s'éteint.
//   - Limite de Nyquist ± 0,7 m/s : au-delà, la couleur se replie (jaune → cyan) ; un jet de fuite ou de
//     rétrécissement (2 à 5 m/s), turbulent, donne une « mosaïque » (repliements en tous sens, vert de la variance).
//     Les flux normaux (remplissage, éjection) restent sous la limite à l'échelle choisie : couleur homogène.
//   - Zone de convergence (PISA) en amont d'un orifice étroit : coquilles hémisphériques d'isovitesse,
//     v = Q / (2π r²) ; la coquille où v atteint la limite de Nyquist change brusquement de couleur (repliement).
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

const GLSL_V = /* glsl */`
attribute float aS; attribute vec3 aT; attribute float aRad;
varying float vS; varying float vRad; varying vec3 vTw; varying vec3 vR; varying vec3 vW; varying vec3 vNw;`;
const GLSL_F = /* glsl */`
uniform vec3 uProbe; uniform float uTime; uniform float uNq;
uniform float uInt; uniform float uV0; uniform float uTurb; uniform float uKind; uniform float uQ; uniform float uR;
uniform float uAlpha; uniform float uGhost;
varying float vS; varying float vRad; varying vec3 vTw; varying vec3 vR; varying vec3 vW; varying vec3 vNw;
float dHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float dNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dHash(i), dHash(i + vec3(1, 0, 0)), f.x), mix(dHash(i + vec3(0, 1, 0)), dHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(dHash(i + vec3(0, 0, 1)), dHash(i + vec3(1, 0, 1)), f.x), mix(dHash(i + vec3(0, 1, 1)), dHash(i + vec3(1, 1, 1)), f.x), f.y), f.z) * 2.0 - 1.0;
}
// carte BART : x = vitesse / Nyquist, déjà repliée dans [-1, 1]
vec3 bart(float x) {
  if (x >= 0.0) return mix(mix(vec3(0.5, 0.0, 0.03), vec3(0.95, 0.06, 0.03), smoothstep(0.0, 0.5, x)), vec3(1.0, 0.92, 0.3), smoothstep(0.55, 1.0, x));
  float y = -x;
  return mix(mix(vec3(0.0, 0.04, 0.5), vec3(0.05, 0.3, 1.0), smoothstep(0.0, 0.5, y)), vec3(0.5, 1.0, 1.0), smoothstep(0.55, 1.0, y));
}`;
const GLSL_COLOR = /* glsl */`
  {
    vec3 V = normalize(cameraPosition - vW), N = normalize(vNw);
    float facing = abs(dot(N, V)), edge = 1.0 - facing;
    float speed, turb = 0.0, g = 0.0, a = 1.0;
    if (uKind < 1.5 || uKind > 2.5) { // jet (0 : enveloppe turbulente, 1 : laminaire, 3 : tranche) : vitesse maximale
      // à la vena contracta, au cœur du jet (enveloppe : selon le bord apparent ; tranche : selon la distance à l'axe)
      // jet libre : vitesse maximale sur ≈ 1/10 de la longueur (cône potentiel), puis décroissante comme l'inverse de la
      // distance ; profil en cloche vers le bord. Le cœur du jet, au-delà de la limite de Nyquist, se replie (mosaïque) ;
      // la périphérie, plus lente, garde la couleur du sens du flux (fuite aortique rouge, mitrale bleue en voie apicale)
      float e = uKind > 2.5 ? vRad : edge;
      speed = uV0 * (uKind > 0.5 && uKind < 1.5 ? 1.0 - 0.4 * vS : min(1.0, 0.1 / max(vS, 0.01))) * exp(-2.2 * e * e);
      a = smoothstep(0.0, 0.04, vS) * (1.0 - smoothstep(0.8, 1.0, vS));
      if (uKind > 2.5) a *= sqrt(max(0.0, 1.0 - vRad * vRad));
      if (uKind < 0.5 || uKind > 2.5) turb = uTurb * smoothstep(0.04, 0.3, vS);
    } else { // coquille d'isovitesse (PISA) : même vitesse partout, dirigée vers l'orifice
      speed = uQ / (6.2832 * uR * uR);
      a = 0.75;
    }
    float n1 = dNoise(vR * 4.5 - vTw * uTime * 3.0), n2 = dNoise(vR * 9.0 + vec3(3.1, 1.7, 5.3) - vTw * uTime * 5.0);
    speed *= max(0.15, 1.0 + turb * 0.9 * (0.65 * n1 + 0.35 * n2)); // turbulence : vitesses dispersées, sans inversion
    g = turb * smoothstep(0.15, 0.7, abs(n2)) * 0.65;               // variance (turbulence) : vert
    float vt = speed * dot(normalize(vTw), normalize(uProbe - vW)); // composante dans l'axe de la sonde
    float x = vt / uNq, xr = mod(x + 1.0, 2.0) - 1.0;               // repliement au-delà de la limite de Nyquist
    vec3 c = mix(bart(xr), vec3(0.25, 0.95, 0.35), g);
    a *= uAlpha * smoothstep(0.0, 0.12, uInt) * (0.4 + 0.6 * facing) * (0.45 + 0.55 * smoothstep(0.02, 0.14, abs(x)));
    if (uGhost > 0.5) a *= uKind > 1.5 ? 0.18 : 0.4;
    diffuseColor = vec4(c, a);
  }`;

export function createDoppler(heart) {
  const group = new THREE.Group(); group.visible = false;
  heart.root.add(group);
  const shared = { uProbe: { value: heart.landmarks.apex.clone() }, uTime: { value: 0 }, uNq: { value: NYQUIST } };
  // matériau d'un flux (ghost : même flux vu à travers les tissus, très atténué, non coupé)
  const material = (u, ghost) => {
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, depthTest: !ghost, side: THREE.DoubleSide, toneMapped: false });
    const uniforms = { ...shared, ...u, uGhost: { value: ghost ? 1 : 0 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${GLSL_V}`)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vS = aS; vRad = aRad; vTw = normalize(mat3(modelMatrix) * aT); vR = (modelMatrix * vec4(position, 1.0)).xyz; vNw = normalize(mat3(modelMatrix) * normal);')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${GLSL_F}`)
        .replace('#include <color_fragment>', `#include <color_fragment>\n${GLSL_COLOR}`);
    };
    m.customProgramCacheKey = () => 'doppler';
    heart.addDeform(m, 0.38); // le sang suit le battement, comme les parois voisines
    // jets entiers, non coupés : en vue chirurgicale, la fuite part dans l'oreillette ou l'aorte que la coupe a retirée
    // et vient vers l'observateur
    return m;
  };
  // jet le long d'une courbe, rayon r(s) (s : 0 à l'orifice → 1 au bout)
  const jetGeometry = (curve, rad, nS = 64, nA = 28) => {
    const fr = curve.computeFrenetFrames(nS, false), pos = [], nrm = [], aS = [], aT = [], idx = [];
    for (let i = 0; i <= nS; i++) {
      const s = i / nS, P = curve.getPointAt(s), Tg = fr.tangents[i], r = rad(s);
      for (let j = 0; j <= nA; j++) {
        const th = (j / nA) * Math.PI * 2, n = fr.normals[i].clone().multiplyScalar(Math.cos(th)).addScaledVector(fr.binormals[i], Math.sin(th));
        pos.push(P.x + n.x * r, P.y + n.y * r, P.z + n.z * r); nrm.push(n.x, n.y, n.z); aS.push(s); aT.push(Tg.x, Tg.y, Tg.z);
      }
    }
    for (let i = 0; i < nS; i++) for (let j = 0; j < nA; j++) { const a = i * (nA + 1) + j, b = a + nA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1)); g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 3));
    g.setIndex(idx);
    return g;
  };
  // tranches transversales du jet (disques perpendiculaires à l'axe) : vu dans l'axe, le jet se remplit ; vu de profil,
  // elles s'effacent et l'enveloppe prend le relais
  // Deux ordres de dessin (de l'orifice au bout, et l'inverse) : les tranches transparentes sont posées de la plus
  // lointaine à la plus proche de l'observateur (sortSlices).
  const sliceGeometry = (curve, rad, n = 12, nA = 32, nR = 4) => {
    const fr = curve.computeFrenetFrames(n * 4, false), pos = [], nrm = [], aS = [], aT = [], aR = [], tris = [];
    for (let k = 0; k < n; k++) {
      const s = (k + 0.5) / n, i = Math.round(s * n * 4), P = curve.getPointAt(s), Tg = fr.tangents[i], r = rad(s), base = pos.length / 3, t = [];
      for (let a = 0; a <= nR; a++) for (let j = 0; j <= nA; j++) {
        const q = a / nR, th = (j / nA) * Math.PI * 2;
        const v = fr.normals[i].clone().multiplyScalar(Math.cos(th) * q * r).addScaledVector(fr.binormals[i], Math.sin(th) * q * r).add(P);
        pos.push(v.x, v.y, v.z); nrm.push(Tg.x, Tg.y, Tg.z); aS.push(s); aT.push(Tg.x, Tg.y, Tg.z); aR.push(q);
      }
      for (let a = 0; a < nR; a++) for (let j = 0; j < nA; j++) { const p0 = base + a * (nA + 1) + j, p1 = p0 + nA + 1; t.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); }
      tris.push(t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1)); g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 3));
    g.setAttribute('aRad', new THREE.Float32BufferAttribute(aR, 1));
    const fwd = new THREE.Uint16BufferAttribute(tris.flat(), 1), rev = new THREE.Uint16BufferAttribute([...tris].reverse().flat(), 1);
    g.setIndex(fwd);
    g.userData.order = { fwd, rev, mid: curve.getPointAt(0.5), dir: curve.getTangentAt(0.5) };
    return g;
  };
  // demi-sphère d'isovitesse de rayon r, pôle vers l'amont ; vitesse dirigée vers le centre (l'orifice)
  const shellGeometry = (r) => {
    const g = new THREE.SphereGeometry(r, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), n = g.attributes.normal, cnt = n.count;
    const aT = new Float32Array(cnt * 3); for (let k = 0; k < cnt; k++) { aT[k * 3] = -n.getX(k); aT[k * 3 + 1] = -n.getY(k); aT[k * 3 + 2] = -n.getZ(k); }
    g.setAttribute('aT', new THREE.BufferAttribute(aT, 3)); g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(cnt), 1));
    return g;
  };
  // un flux : jet (et coquilles de convergence en amont) ; spec : origin, dir, len, r0, r1, v0 (m/s), turb, laminar,
  // bend (vecteur de courbure : jet excentré qui longe une paroi), time(t) → intensité, pisa : { up, center, q }
  const buildFlow = (f) => {
    const items = [];
    const p0 = f.origin, d = f.dir.clone().normalize(), p2 = p0.clone().addScaledVector(d, f.len);
    if (f.bend) p2.addScaledVector(f.bend, f.len);
    const curve = new THREE.QuadraticBezierCurve3(p0.clone(), p0.clone().addScaledVector(d, f.len * 0.5), p2);
    const rad = (s) => (f.r0 + (f.r1 - f.r0) * Math.pow(s, 0.6)) * (s < 0.06 ? 1.25 - 0.25 * s / 0.06 : 1) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (s - 0.78) / 0.22), 2)));
    const u = { uInt: { value: 0 }, uV0: { value: f.v0 }, uTurb: { value: f.turb ?? 0 }, uKind: { value: f.laminar ? 1 : 0 }, uQ: { value: 0 }, uR: { value: 1 }, uAlpha: { value: f.laminar ? 0.4 : 0.85 } };
    const uc = { ...u, uV0: { value: f.v0 * 1.15 }, uAlpha: { value: f.laminar ? 0.3 : 0.8 } }; // cœur du jet, plus rapide
    const usl = { ...u, uKind: { value: 3 }, uAlpha: { value: f.laminar ? 0.12 : 0.65 } }, slices = sliceGeometry(curve, rad);
    for (const [g, uu, ro] of [[jetGeometry(curve, rad), u, 7], [jetGeometry(curve, (s) => rad(s) * 0.5), uc, 8], [slices, usl, 9]])
      for (const ghost of [false, true]) { const m = new THREE.Mesh(g, material(uu, ghost)); m.renderOrder = ghost ? ro - 2 : ro; m.frustumCulled = false; items.push(m); }
    const us = [u, uc];
    if (f.pisa) {
      const rA = Math.sqrt(f.pisa.q / (2 * Math.PI * NYQUIST)); // rayon où la vitesse atteint la limite de Nyquist
      for (const k of [1.45, 1.0, 0.72]) {
        const r = rA * k, su = { uInt: { value: 0 }, uV0: { value: 0 }, uTurb: { value: 0 }, uKind: { value: 2 }, uQ: { value: f.pisa.q }, uR: { value: r }, uAlpha: { value: 0.5 } };
        const g = shellGeometry(r);
        for (const ghost of [false, true]) {
          const m = new THREE.Mesh(g, material(su, ghost));
          m.position.copy(f.pisa.center); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.pisa.up.clone().normalize());
          m.renderOrder = ghost ? 4 : 5; m.frustumCulled = false; items.push(m);
        }
        us.push(su);
      }
    }
    const grp = new THREE.Group(); items.forEach((m) => grp.add(m));
    return { grp, us, time: f.time, slices };
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
        return [fwd, { origin: at(Hc * 0.74), dir: A.clone().negate(), len: 4.4, r0: 0.3, r1: 0.95, v0: 4, turb: 1, time: T.ar,
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
  let shown = [];
  const flowsOf = (key, variant) => {
    const k = key + ':' + variant;
    if (!cache.has(k)) { const fl = specs(key, variant).map(buildFlow); fl.forEach((f) => group.add(f.grp)); cache.set(k, fl); }
    return cache.get(k);
  };
  let active = false, key = null, variant = 'normale', tNow = 0;
  const sync = () => {
    for (const fl of cache.values()) fl.forEach((f) => { f.grp.visible = false; });
    shown = active && key ? flowsOf(key, variant) : [];
    shown.forEach((f) => { f.grp.visible = true; });
    group.visible = shown.length > 0;
    apply();
  };
  const apply = () => { for (const f of shown) { const v = f.time(tNow); f.us.forEach((u) => { u.uInt.value = v; }); } };
  // tranches dessinées de la plus lointaine à la plus proche de l'œil
  const sortSlices = (eye) => {
    for (const f of shown) {
      const g = f.slices, o = g.userData.order, idx = eye.clone().sub(o.mid).dot(o.dir) > 0 ? o.fwd : o.rev;
      if (g.index !== idx) g.setIndex(idx);
    }
  };
  const probe = new THREE.Vector3();
  return {
    group,
    // vue d'une valve (key : 'aortique', 'mitrale'… ; null : pas de valve) et variante affichée
    setView(k, v) { key = ['aortique', 'pulmonaire', 'mitrale', 'tricuspide'].includes(k) ? k : null; variant = v ?? 'normale'; sync(); },
    setActive(on) { active = on; sync(); },
    // dt : secondes (vitesse du battement comprise, 0 cœur arrêté) ; t : instant du cycle (ms) ; eye : position de la caméra
    update(dt, t, eye) {
      if (!group.visible) return;
      tNow = t; shared.uTime.value += dt;
      shared.uProbe.value.copy(heart.deformPoint(probe.copy(heart.landmarks.apex)));
      apply(); sortSlices(eye);
    },
  };
}
