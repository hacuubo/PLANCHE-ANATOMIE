// Tranche de coupe du muscle cardiaque : au lieu d'un aplat, la surface coupée montre le tissu comme sur une pièce
// anatomique sectionnée ou en animation médicale :
//   - fibres myocardiques en hélice : leur angle tourne dans l'épaisseur de la paroi (≈ +60° sous l'endocarde,
//     circulaires au milieu, ≈ −60° sous l'épicarde ; dans la cloison, de la face gauche à la face droite ;
//     Streeter 1969). Sur la tranche, une fibre couchée dans le plan dessine une strie, une fibre qui le traverse un
//     point : d'où les bandes caractéristiques de la paroi coupée ;
//   - faisceaux séparés par de fines cloisons (périmysium), relief léger qui accroche la lumière, surface humide ;
//   - endocarde : liseré nacré le long des cavités ; épicarde : fine pellicule claire et couche sous-épicardique plus
//     sombre ; paroi des oreillettes plus mince et désordonnée ; paroi des gros vaisseaux crème, en lames.
// L'épaisseur vient de la carte 3D de la paroi (assets/heart.bin, voxels de 2 mm). Pendant le battement, la tranche
// lit cette carte au point d'origine du tissu (déformation inverse), si bien que l'endocarde reste sur le bord de la
// cavité quand le muscle s'épaissit.
import * as THREE from 'three';
import { GLSL_DEFORM } from './heart.js';

// déformation du battement avec une raideur variable (paramètre au lieu de l'uniforme)
const DEFORM_K = GLSL_DEFORM.replace('uniform float uDK; ', '').replace('vec3 heartDeform(vec3 p) {', 'vec3 heartDeform(vec3 p, float uDK) {');

const SECTION_GLSL = /* glsl */`
varying vec3 vW;
uniform sampler3D uVol; uniform vec3 uVolMin; uniform vec3 uVolScale; uniform vec3 uVolHalf; uniform float uVolOn;
uniform vec3 uCapT; uniform vec3 uCapB;
${DEFORM_K}
float sh13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float sh12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float svn2(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sh12(i), sh12(i + vec2(1, 0)), u.x), mix(sh12(i + vec2(0, 1)), sh12(i + vec2(1, 1)), u.x), u.y); }
float svn3(vec3 p) { vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(sh13(i), sh13(i + vec3(1,0,0)), u.x), mix(sh13(i + vec3(0,1,0)), sh13(i + vec3(1,1,0)), u.x), u.y),
             mix(mix(sh13(i + vec3(0,0,1)), sh13(i + vec3(1,0,1)), u.x), mix(sh13(i + vec3(0,1,1)), sh13(i + vec3(1,1,1)), u.x), u.y), u.z); }
vec4 volAt(vec3 p) {
  vec3 t = (p - uVolMin) * uVolScale + uVolHalf;
  if (uVolOn < 0.5 || any(lessThan(t, vec3(0.0))) || any(greaterThan(t, vec3(1.0)))) return vec4(0.4, 0.4, 0.5, 1.0); // hors carte : gros vaisseau
  return textureLod(uVol, t, 0.0); // pas de mipmaps : lecture sans dérivées (appelée dans une boucle)
}
// motif des fibres dans un carreau : q = coordonnées locales (x le long des fibres), el = allongement des stries
float fiberTile(vec2 q, float el, vec2 seed) {
  q += seed * 17.0;
  float along = mix(18.0, 2.5, el), across = 18.0; // faisceaux ≈ 0,5 mm
  float a = svn2(vec2(q.x * along, q.y * across));
  float b = svn2(vec2(q.x * along * 2.1 + 5.0, q.y * across * 2.3 + 3.0));
  // cloisons entre faisceaux (≈ 1,3 mm), ondulées
  float sep = abs(sin(q.y * 48.0 + 2.0 * svn2(vec2(q.x * 2.0, q.y * 6.0))));
  sep = mix(1.0, smoothstep(0.0, 0.18, sep), mix(0.35, 0.8, el));
  return (0.62 * a + 0.38 * b) * sep;
}
`;

// Matériau de la tranche « myo » (muscle, oreillettes, paroi des vaisseaux). color : teinte de base (sRGB).
export function sectionMaterial(heart, { stencil, rank }) {
  const W = heart.wall, D = heart.deformUniforms;
  const u = {
    uVol: { value: W ? W.texture : null }, uVolOn: { value: W ? 1 : 0 },
    uVolMin: { value: W ? W.min.clone() : new THREE.Vector3() },
    uVolScale: { value: W ? new THREE.Vector3(1 / (W.step * W.n.x), 1 / (W.step * W.n.y), 1 / (W.step * W.n.z)) : new THREE.Vector3(1, 1, 1) },
    uVolHalf: { value: W ? new THREE.Vector3(0.5 / W.n.x, 0.5 / W.n.y, 0.5 / W.n.z) : new THREE.Vector3() },
    uCapT: { value: new THREE.Vector3(1, 0, 0) }, uCapB: { value: new THREE.Vector3(0, 1, 0) },
    uDB: D.uDB, uDA: D.uDA, uDL: D.uDL, uDC: D.uDC, uDAt: D.uDAt, uDRA: D.uDRA, uDLA: D.uDLA, uDOn: { value: 1 },
  };
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.5, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.24, specularIntensity: 0.45,
    sheen: 0.12, sheenRoughness: 0.5, sheenColor: 0xff9c8c, envMapIntensity: 0.45,
    ...stencil, polygonOffset: true, polygonOffsetFactor: -rank, polygonOffsetUnits: -rank,
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${SECTION_GLSL}\nfloat gSecH;`)
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
  {
    // point d'origine du tissu (avant déformation) : deux pas de déformation inverse, raideur selon la profondeur
    vec3 p0 = vW; vec4 vol = volAt(p0);
    for (int it = 0; it < 2; it++) {
      float f0 = clamp(vol.g / max(vol.g + vol.r, 0.02), 0.0, 1.0);
      p0 = vW - (heartDeform(p0, mix(0.26, 0.05, f0)) - p0);
      vol = volAt(p0);
    }
    // r : profondeur sous l'épicarde, g : distance à l'endocarde, b : fraction transmurale du VG (cloison comprise),
    // a : code de tissu (0 ventricule, 0,5 oreillette, 1 gros vaisseau)
    float dEpi = vol.r * 2.55, dEndo = vol.g * 2.55;
    float wVes = smoothstep(0.7, 0.95, vol.a), wAtr = (1.0 - wVes) * smoothstep(0.2, 0.45, vol.a);
    float frac = vol.b; // 0 endocarde du VG → 1 épicarde ou face droite de la cloison
    // direction des fibres : hélice autour du grand axe, angle de +60° (endocarde) à −60° (épicarde)
    vec3 q = p0 - uDB; vec3 rr = q - uDA * dot(q, uDA);
    vec3 eT = normalize(cross(uDA, rr) + vec3(1e-4));
    float alpha = radians(mix(62.0, -58.0, frac));
    vec3 F = cos(alpha) * eT + sin(alpha) * uDA;
    // normale de la tranche au pixel (plan ou surface courbe), tournée vers l'observateur
    vec3 capN = normalize(cross(dFdx(vW), dFdy(vW)));
    if (dot(capN, cameraPosition - vW) < 0.0) capN = -capN;
    vec3 F2 = F - capN * dot(F, capN);
    float inPlane = length(F2);                   // 1 : fibre couchée dans la tranche (strie) ; 0 : la traverse (point)
    float el = smoothstep(0.25, 0.95, inPlane);
    float phi = atan(dot(F2, uCapB), dot(F2, uCapT));
    // carreaux de 3,5 mm orientés selon les fibres, fondus deux à deux (pas de distorsion loin de l'origine)
    vec2 uv = vec2(dot(p0, uCapT), dot(p0, uCapB)) / 0.35;
    vec2 c0 = floor(uv - 0.5), fr = uv - 0.5 - c0; vec2 wB = fr * fr * (3.0 - 2.0 * fr);
    float cs = cos(phi), sn = sin(phi); mat2 R = mat2(cs, -sn, sn, cs);
    float acc = 0.0, wsum = 0.0, w2 = 0.0;
    for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
      vec2 c = c0 + vec2(i, j);
      float w = (i == 0 ? 1.0 - wB.x : wB.x) * (j == 0 ? 1.0 - wB.y : wB.y);
      vec2 lq = R * ((uv - c - 0.5) * 0.35);
      acc += w * (fiberTile(lq, el, vec2(sh12(c), sh12(c + 7.3))) - 0.5); wsum += w; w2 += w * w;
    }
    float fib = clamp(0.5 + acc / sqrt(max(w2, 1e-3)), 0.0, 1.0);
    fib = mix(fib, 0.5, smoothstep(0.015, 0.06, length(fwidth(uv)) * 0.35)); // vu de loin : pas de fourmillement
    float mot = svn3(p0 * 1.6 + 4.0);
    // oreillettes : faisceaux entrecroisés, plus fins et désordonnés
    float atrN = 0.6 * svn3(p0 * vec3(22.0, 9.0, 22.0)) + 0.4 * svn3(p0 * 40.0 + 3.0);
    // paroi vasculaire : lames élastiques (crème), très fines
    float vesN = 0.5 + 0.5 * sin(dEpi * 160.0 + 3.0 * svn3(p0 * 5.0));
    // teintes (linéaires) : muscle rouge profond nuancé, endocarde nacré, épicarde clair, sous-épicarde plus brun
    vec3 musDeep = vec3(0.20, 0.035, 0.03), musLight = vec3(0.46, 0.10, 0.08);
    vec3 mus = mix(musDeep, musLight, fib) * (0.88 + 0.24 * mot);
    mus = mix(mus, mus * vec3(0.95, 0.78, 0.72), smoothstep(0.6, 0.95, frac));         // couche sous-épicardique, plus brune
    mus = mix(mus, mus * vec3(1.3, 1.25, 1.2), 1.0 - smoothstep(0.0, 0.25, dEndo));  // sous-endocarde, plus clair
    vec3 atr = mix(vec3(0.25, 0.045, 0.04), vec3(0.50, 0.11, 0.09), atrN);
    vec3 ves = mix(vec3(0.62, 0.45, 0.32), vec3(0.78, 0.62, 0.47), vesN);
    vec3 col = mix(mix(mus, atr, wAtr), ves, wVes);
    float endo = (1.0 - smoothstep(0.03, 0.09, dEndo)) * (1.0 - wVes);              // endocarde nacré, lisible à l'échelle du cœur
    col = mix(col, vec3(0.78, 0.45, 0.42), endo * 0.85);
    float epi = 1.0 - smoothstep(0.015, 0.05, dEpi);                                  // épicarde, pellicule claire
    col = mix(col, vec3(0.66, 0.4, 0.34), epi * 0.7 * (1.0 - wVes));
    diffuseColor.rgb = col;
    gSecH = mix(mix(fib, atrN, wAtr), vesN * 0.4, wVes) * (1.0 - endo);
  }`)
      .replace('#include <normal_fragment_maps>', /* glsl */`#include <normal_fragment_maps>
  { // relief des faisceaux : la tranche n'est pas un plan lisse
    vec2 dH = vec2(dFdx(gSecH), dFdy(gSecH)) * 0.03;
    vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
    vec3 R1 = cross(sy, normal), R2 = cross(normal, sx);
    float det = dot(sx, R1);
    vec3 g = sign(det) * (dH.x * R1 + dH.y * R2);
    normal = normalize(abs(det) * normal - g);
  }`);
  };
  mat.customProgramCacheKey = () => 'tranche-paroi';
  mat.userData.section = u;
  return mat;
}
// Repère de la tranche : deux tangentes fixes (motif des fibres en carreaux). Plan : tangentes du plan ; surface
// courbe : axes de l'écran de la coupe (la surface est une hauteur au-dessus de ce plan).
export function setSectionFrame(mat, t, b) {
  const u = mat.userData.section; if (!u) return;
  u.uCapT.value.copy(t).normalize(); u.uCapB.value.copy(b).normalize();
}
export function setSectionPlane(mat, normal) {
  const n = normal.clone().normalize(), a = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const t = new THREE.Vector3().crossVectors(a, n).normalize();
  setSectionFrame(mat, t, new THREE.Vector3().crossVectors(n, t));
}
