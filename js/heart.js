// Modèle 3D du cœur — unités en centimètres.
// Repère monde : +x = gauche du patient, +y = haut, +z = avant (vers l'observateur en vue antérieure).
//
// Géométrie issue de BodyParts3D (Database Center for Life Science, licence CC BY 4.0), préparée hors ligne par
// tools/build-heart-bp3d.mjs dans assets/heart.bin :
//   - enveloppe continue : myocarde ventriculaire (reconstruit autour des cavités réelles, épaisseur calée sur le trajet
//     réel des coronaires), oreillettes et auricules, gros vaisseaux ; sillons sans graisse : les coronaires restent
//     visibles comme sur les planches de référence ;
//   - cavités et lumière des vaisseaux en solides fermés (surfaces de coupe), carte 3D de la paroi (tranches) ;
//   - pièces réelles : coronaires et veines du cœur, feuillets valvulaires avec leurs cordages, muscles papillaires ;
//   - repères : axe du cœur, système de conduction placé dans le septum réel, ancres d'étiquettes.
// Rendu « tissu vivant » : fibres musculaires, film humide, translucidité, occlusion ambiante cuite.
import * as THREE from 'three';
import { buildValves } from './valves.js';

// Couleurs des structures internes et du sang dans les coupes (sRGB) ; tranche du muscle : js/cut-surface.js
export const COL = {
  myocarde: 0xe2a09e,
  endocarde: 0xc7646b,       // paroi interne des cavités (trabéculée), rose soutenu
  endoOreillette: 0xc8737a,
  papillaire: 0xd06f76,
  valve: 0xeed7a6,           // feuillets et cuspides : crème jaune translucide (animation médicale)
  cordage: 0xf8f2e6,         // cordages tendineux : blanc nacré
  conduction: 0xf3c23b,
  coronaire: 0xb52a25,       // artères coronaires : rouge (convention des atlas)
  veineCard: 0x34509a,       // veines du cœur : bleu
  lumenArtere: 0xb0585b, lumenVeine: 0x857a9c,
};

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/* ─────────── matériau « tissu » ─────────── */
// MeshPhysicalMaterial + relief procédural (dérivées écran), translucidité enveloppante, liseré lumineux,
// occlusion ambiante et surbrillance de sélection. uTis = poids [graisse, vaisseau, oreillette, occlusion]
// pour les maillages sans attributs ; l'enveloppe fournit ces poids par sommet (attributs « col » et « tis »).
const GLSL_COMMON = /* glsl */`
varying vec3 vObj;
varying vec4 vTis;
varying vec3 vCol;
varying float vSid;
varying float vInfW; uniform float uInfTint; uniform float uOccl;
#ifdef OCCL
varying float vOccl;
#endif
uniform float uSel;
uniform float uHi;
uniform float uBump;
uniform float uSSS;
uniform float uRim;
uniform float uFocus;
#ifdef VALVE
varying vec3 vPar; uniform float uTrans;
#endif
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
// Relief et modulation de teinte selon le tissu (p en cm, repère de l'objet)
float tissueDetail(vec3 p, vec4 t, out float tint) {
  float fat = t.x, ves = t.y, atr = t.z;
  float mus = clamp(1.0 - fat - ves, 0.0, 1.0);
  float lod = clamp(length(fwidth(p)) * 9.0, 0.0, 1.0); // atténue le grain fin quand on s'éloigne (pas de moiré)
  // fibres myocardiques : bruit étiré le long d'une direction oblique (hélice simplifiée)
  vec3 q = vec3(dot(p, vec3(0.62, -0.70, 0.35)), dot(p, vec3(-0.55, -0.15, 0.82)), dot(p, vec3(0.56, 0.70, 0.45)));
  float f1 = vnoise(vec3(q.x * 1.2, q.y * 12.0, q.z * 12.0));
  float f2 = vnoise(vec3(q.x * 2.4 + 7.0, q.y * 26.0, q.z * 26.0));
  float fib = mix(0.62 * f1 + 0.38 * f2, 0.5, lod * 0.8);
  float mot = vnoise(p * 1.1 + 3.0);
  // oreillettes : plis fins de la paroi mince
  float wr = vnoise(vec3(p.x * 4.5, p.y * 8.0, p.z * 4.5));
  float muscH = mix(fib, 0.45 * fib + 0.55 * wr, atr);
  // graisse : lobules arrondis (plus utilisée : les sillons n'ont plus de graisse)
  float lob = 1.0 - abs(2.0 * vnoise(p * 3.2) - 1.0);
  float fatH = mix(0.72 * lob + 0.28 * vnoise(p * 9.0), lob, lod);
  // paroi vasculaire : très lisse
  float vesH = vnoise(p * 4.0);
  tint = mus * mix(0.76, 1.1, muscH) * (0.9 + 0.2 * mot) + fat * mix(0.93, 1.03, fatH) + ves * (0.95 + 0.08 * vesH);
  return mus * muscH * 0.8 + fat * fatH * 0.8 + ves * vesH * 0.25;
}
vec3 perturbN(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
  vec3 vSigmaX = normalize(dFdx(surf_pos.xyz));
  vec3 vSigmaY = normalize(dFdy(surf_pos.xyz));
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

// Déformation du cycle cardiaque, appliquée à tous les tissus dans le shader de sommets (et, à l'identique, aux
// valves et cordages côté processeur : deformPoint). Valeurs de référence (adulte, 64/min) : IRM et échographie, voir
// cycle() plus bas.
// Repère : axe propre du ventricule gauche, de sa base uDB (centre de sa cavité dans la tranche basale) vers la pointe uDA,
// longueur uDL ; plan auriculo-ventriculaire uDAV (passe par les centres des valves mitrale, tricuspide et aortique,
// normale vers la pointe), pointe à uDApx de ce plan ; uDRV : côté du ventricule droit.
//   uDR  (base, pointe) : réduction des cavités, 0 fin de diastole → 1 fin d'éjection. La pointe précède la base de
//        30 ms (activation de la pointe et de la cloison d'abord). Paroi incompressible : l'endocarde avance beaucoup
//        plus que l'épicarde (raideur lue dans la carte 3D de la paroi : K_ENDO sous l'endocarde du VG → K_EPI à
//        l'épicarde et sur la face droite de la cloison) — la paroi s'épaissit (≈ 9 → 14 mm) ; paroi libre du VD en
//        soufflet vers la cloison (≈ 5 mm) ; anneau mitral sphinctérien (surface ≈ −25 %) ; racines aortique et
//        pulmonaire (uDAo, uDPu) exclues de la contraction et de la torsion : elles descendent avec la base ;
//   uDLg : descente du plan auriculo-ventriculaire vers la pointe, immobile (13 mm à l'anneau mitral, ≈ 23 mm sur le
//        bord libre de la tricuspide) ; les oreillettes s'allongent derrière lui ;
//   uDTw (base, pointe) : rotation en degrés autour de l'axe du VG (vue de la pointe : base horaire, pointe antihoraire) ;
//   uDAt (droite, gauche) : contraction auriculaire ; uDRes : remplissage des oreillettes (réservoir) ;
//   uDDil : dilatation de l'anneau tricuspide et des cavités voisines (vue « anneau dilaté »), autour de uDTc / uDTa,
//        le versant septal (uDTs) restant fixe.
export const K_ENDO = 0.38, K_EPI = 0.10;
// sinus coronaire masqué à moins de CS_CLIP cm de l'endocarde, du côté de l'oreillette (shader et orifice)
const CS_CLIP = 0.2;
export const GLSL_DEFORM = /* glsl */`
uniform vec3 uDB; uniform vec3 uDA; uniform float uDL; uniform vec4 uDAV; uniform float uDApx; uniform vec3 uDRV;
uniform vec2 uDR; uniform float uDLg; uniform vec2 uDTw; uniform vec2 uDAt; uniform float uDRes;
uniform vec3 uDRA; uniform vec3 uDLA; uniform float uDK; uniform float uDOn;
uniform float uDDil; uniform vec3 uDTc; uniform vec3 uDTa; uniform vec3 uDTs;
uniform vec3 uDMc; uniform vec3 uDMa; uniform vec3 uDAo; uniform vec3 uDPu; uniform vec3 uDAoA;
uniform sampler3D uVol; uniform vec3 uVolMin; uniform vec3 uVolScale; uniform vec3 uVolHalf; uniform float uVolOn;
uniform float uInf; uniform vec3 uInfAnt; uniform vec3 uInfSep;
// Territoire akinétique d'une occlusion de l'IVA moyenne (modèle AHA à 17 segments, Cerqueira 2002) : segments 7
// (antérieur moyen) et 8 (antéroseptal moyen), 13 (antérieur apical), 14 (septal apical) et 17 (apex). Angle autour de
// l'axe du VG : 0 au centre de la paroi antérieure, + vers la cloison (l'IVA court à +30°, sur l'insertion antérieure
// du VD) ; s : 0 à la base, 1 à la pointe. 0 hors du territoire, 1 dedans, transition de quelques millimètres.
float infarctW(vec3 p) {
  if (uInf <= 0.0) return 0.0;
  vec3 q = p - uDB; float al = dot(q, uDA), s = al / uDL; vec3 r = q - uDA * al; float lr = max(length(r), 1e-3);
  float th = degrees(atan(dot(r, uInfSep), dot(r, uInfAnt)));
  float mid = smoothstep(0.30, 0.38, s) * (1.0 - smoothstep(0.62, 0.70, s)) * smoothstep(-40.0, -25.0, th) * (1.0 - smoothstep(85.0, 100.0, th));
  float api = smoothstep(0.62, 0.70, s) * smoothstep(-55.0, -40.0, th) * (1.0 - smoothstep(130.0, 145.0, th));
  float apx = smoothstep(0.84, 0.94, s);
  return uInf * max(max(mid, api), apx) * (1.0 - smoothstep(2.9, 3.7, lr)); // paroi du VG et cloison, pas la paroi libre du VD
}
// carte 3D de la paroi : r profondeur sous l'épicarde, g distance à l'endocarde, b fraction transmurale du VG, a tissu
vec4 wallAt(vec3 p) {
  vec3 t = (p - uVolMin) * uVolScale + uVolHalf;
  if (uVolOn < 0.5 || any(lessThan(t, vec3(0.0))) || any(greaterThan(t, vec3(1.0)))) return vec4(0.4, 0.4, 0.5, 1.0); // hors carte : gros vaisseau
  return textureLod(uVol, t, 0.0);
}
vec3 heartDeform(vec3 p) {
  if (uDDil > 0.0) {
    vec3 qt = p - uDTc; float at = dot(qt, uDTa); vec3 rt = qt - uDTa * at; float lt = max(length(rt), 1e-3);
    float free = 1.0 - 0.85 * max(0.0, dot(rt / lt, uDTs));
    p += rt / lt * uDDil * free * min(lt, 1.8) * exp(-at * at / 2.25) * smoothstep(0.2, 1.0, lt) * (1.0 - smoothstep(3.0, 5.0, lt));
  }
  vec3 q = p - uDB; float al = dot(q, uDA); float s = al / uDL; vec3 r = q - uDA * al;
  float sc = clamp(s, 0.0, 1.0), lr = max(length(r), 1e-3);
  float dAV = dot(p, uDAV.xyz) - uDAV.w;                  // > 0 : côté ventricules
  // racines aortique et pulmonaire : elles descendent avec la base mais ne se contractent pas (elles s'élargissent un peu)
  float wRoot = smoothstep(1.0, 1.8, length(p - uDAo)) * smoothstep(1.0, 1.8, length(p - uDPu));
  float wV = smoothstep(-0.3, 0.3, dAV) * (1.0 - smoothstep(1.05, 1.3, s)) * wRoot;
  // racine aortique et départ des coronaires (ostia, tronc commun, coronaire droite) : un seul bloc. Ni l'expansion ni
  // la contraction des oreillettes voisines ne s'y appliquent, et la descente est celle de la racine : les ostia restent
  // sur la paroi et les artères ne pénètrent jamais dans l'aorte, à tout instant du cycle.
  vec3 qa = p - uDAo; float aa = dot(qa, uDAoA), ra = length(qa - uDAoA * aa);
  float wAoZ = (1.0 - smoothstep(2.2, 3.2, ra)) * smoothstep(-1.2, -0.4, aa) * (1.0 - smoothstep(3.2, 4.2, aa));
  float k = uVolOn > 0.5 ? mix(${K_ENDO.toFixed(3)}, ${K_EPI.toFixed(3)}, wallAt(p).b) : uDK;
  float wI = 1.0 - infarctW(p); // akinésie : ni rapprochement vers l'axe, ni épaississement, ni torsion
  // descente de la base : maximale au plan auriculo-ventriculaire, nulle à la pointe, amortie dans les oreillettes
  float wRV = smoothstep(1.5, 4.0, dot(r, uDRV)) * (1.0 - wAoZ);
  float desc = uDLg * (1.3 + 1.0 * wRV) * (dAV >= 0.0 ? 1.0 - clamp(dAV / uDApx, 0.0, 1.0) : clamp(1.0 + dAV / (3.0 + 1.5 * wRV), 0.0, 1.0));
  // rétrécissement radial vers l'axe du VG (déplacement plafonné à 3,2 cm de l'axe : paroi libre du VD)
  float cR = mix(uDR.x, uDR.y, sc), shape = wV * wI * (0.65 + 0.35 * sin(3.14159 * sc));
  float rad = 1.0 - k * cR * shape * min(1.0, 3.2 / lr);
  float ang = wV * wI * radians(mix(uDTw.x, uDTw.y, sc));
  vec3 rr = (r * cos(ang) + cross(uDA, r) * sin(ang)) * rad;
  vec3 o = uDB + uDA * (al + desc) + rr;
  // paroi libre du VD : mouvement en soufflet vers la cloison (≈ 5 mm)
  o -= uDRV * (0.5 * smoothstep(3.0, 4.5, dot(r, uDRV)) * cR * shape);
  // anneau mitral : contraction sphinctérienne (surface ≈ −25 %)
  vec3 qm = p - uDMc; float am = dot(qm, uDMa); vec3 rm = qm - uDMa * am;
  o -= rm * (0.08 * uDR.x * exp(-am * am / 0.64) * (1.0 - smoothstep(2.0, 3.2, length(rm))));
  float dRA = length(p - uDRA), dLA = length(p - uDLA);
  // centres des deux oreillettes mélangés en continu (pas de pli dans le septum interauriculaire)
  float wR = smoothstep(-0.8, 0.8, dLA - dRA);
  vec3 dd = wR * (o - uDRA) + (1.0 - wR) * (o - uDLA);
  float wAt = (1.0 - smoothstep(-0.6, 0.2, dAV)) * (1.0 - smoothstep(2.6, 4.2, min(dRA, dLA))) * (1.0 - wAoZ);
  return o - dd * (0.14 * mix(uDAt.y, uDAt.x, wR) - 0.03 * uDRes) * wAt;
}
`;
const DEFORM_VERTEX = 'if (uDOn > 0.5) { vec4 wpD = modelMatrix * vec4(transformed, 1.0); transformed += heartDeform(wpD.xyz) - wpD.xyz; }';
// Coupe courbe (coupe 5 cavités, js/app.js) : surface z = h(x, y) dans un repère (uCutX, uCutY, uCutV) d'origine uCutO,
// vue depuis +uCutV. h mêle un plan de fond (uCutAB) et quatre plans locaux (uCutP, centrés en uCutC) :
// h = (fond + Σ k·wᵢ·planᵢ) / (1 + Σ k·wᵢ), wᵢ = exp(−(d/σ)^e), σ = uCutS.x, e = uCutS.y, k = uCutS.z.
// Décalée de uCutOff (profondeur). On garde ce qui est derrière la surface (cutField ≥ 0). Testée dans tous les
// matériaux coupés : tissus, passes de stencil, voile de la partie retirée, ombres. uCutOn = 0 : pas de coupe courbe.
export const cutU = {
  uCutOn: { value: 0 }, uCutO: { value: new THREE.Vector3() }, uCutX: { value: new THREE.Vector3(1, 0, 0) },
  uCutY: { value: new THREE.Vector3(0, 1, 0) }, uCutV: { value: new THREE.Vector3(0, 0, 1) }, uCutAB: { value: new THREE.Vector3() },
  uCutC: { value: [0, 1, 2, 3].map(() => new THREE.Vector2()) }, uCutP: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uCutS: { value: new THREE.Vector3(1.3, 4, 80) },
  uCutOff: { value: 0 }, uCutOffI: { value: 0.6 },
};
const GLSL_CUT = /* glsl */`
uniform float uCutOn; uniform vec3 uCutO; uniform vec3 uCutX; uniform vec3 uCutY; uniform vec3 uCutV; uniform vec3 uCutAB;
uniform vec2 uCutC[4]; uniform vec3 uCutP[4]; uniform vec3 uCutS; uniform float uCutOff;
varying vec3 vCutW;
float cutField(vec3 p, float extra) {
  vec3 q = p - uCutO; vec2 xy = vec2(dot(q, uCutX), dot(q, uCutY));
  float h = uCutAB.x + uCutAB.y * xy.x + uCutAB.z * xy.y, ws = 1.0;
  for (int i = 0; i < 4; i++) {
    float w = uCutS.z * exp(-pow(length(xy - uCutC[i]) / uCutS.x, uCutS.y));
    h += w * (uCutP[i].x + uCutP[i].y * xy.x + uCutP[i].z * xy.y); ws += w;
  }
  return h / ws + uCutOff + extra - dot(q, uCutV);
}
`;
const CUT_VERTEX = 'vCutW = (modelMatrix * vec4(transformed, 1.0)).xyz;';
// Racines aortique et pulmonaire : cylindre de chaque racine (centre et rayon uHoleC, axe et hauteur uHoleA), prolongé
// vers le ventricule (la racine descend avec la base pendant la systole). Les coupes y ouvrent la lumière : intima
// visible, cuspides entières au lieu d'un aplat de sang (js/app.js).
export const GLSL_ROOTS = /* glsl */`
uniform vec4 uHoleC[2]; uniform vec4 uHoleA[2]; uniform vec3 uHoleCw[2]; // uHoleCw : centres suivant le battement
uniform float uRootSel; // racine concernée : 0 aortique, 1 pulmonaire, −1 les deux
uniform vec4 uOst[2]; uniform vec3 uOstN[2]; // ostia coronaires : centre et rayon, axe (vers le sang) ; rayon < 0 : absent
bool inOstium(vec3 p) {
  for (int i = 0; i < 2; i++) {
    if (uOst[i].w <= 0.0) continue;
    vec3 q = p - uOst[i].xyz; float a = dot(q, uOstN[i]);
    if (abs(a) < 0.25 && length(q - uOstN[i] * a) < uOst[i].w) return true;
  }
  return false;
}
bool inRoot(vec3 p, float grow) {
  for (int i = 0; i < 2; i++) {
    if (uRootSel > -0.5 && abs(float(i) - uRootSel) > 0.5) continue; // chaque lumière n'ouvre que sa racine
    vec3 q = p - uHoleC[i].xyz; float al = dot(q, uHoleA[i].xyz);
    if (al > -1.5 && al < uHoleA[i].w && length(q - uHoleA[i].xyz * al) < uHoleC[i].w + grow) return true;
  }
  return false;
}
// même test pour un point du monde déformé (tranches de sang à la coupe) : la racine descend avec la base pendant la
// systole (jusqu'à ≈ 7 mm), le cylindre la suit, sans quoi un croissant de la tranche de sang réapparaissait contre la paroi
bool inRootW(vec3 p, float grow) {
  for (int i = 0; i < 2; i++) {
    if (uRootSel > -0.5 && abs(float(i) - uRootSel) > 0.5) continue;
    vec3 q = p - uHoleCw[i]; float al = dot(q, uHoleA[i].xyz);
    if (al > -1.5 && al < uHoleA[i].w && length(q - uHoleA[i].xyz * al) < uHoleC[i].w + grow) return true;
  }
  return false;
}
// fond de la lumière artérielle, fermée à la base des cuspides : retiré, on voit le ventricule à travers la valve.
// Aorte : jusqu'à 1,5 mm au-dessus de l'anneau ; tronc pulmonaire : sa lumière (BodyParts3D) ne commence qu'en haut des
// sinus (≈ 1,1 cm au-dessus de l'anneau), d'où un fond retiré jusqu'à la hauteur des cuspides (uHoleA.w = 1,8 hauteur
// de cuspide) ; au centre de la racine seulement (les parois des sinus sont au-delà de 0,9 rayon ; tronc pulmonaire
// plus étroit que ses sinus : 0,75 rayon, sa paroi reste)
bool inRootFloor(vec3 p) {
  for (int i = 0; i < 2; i++) {
    if (uRootSel > -0.5 && abs(float(i) - uRootSel) > 0.5) continue;
    vec3 q = p - uHoleC[i].xyz; float al = dot(q, uHoleA[i].xyz);
    float top = i == 1 ? uHoleA[i].w * 0.64 : 0.15, rr = i == 1 ? 0.97 : 0.9; // pulmonaire : jusqu au haut de la paroi des sinus (cylindre)
    if (al > -1.5 && al < top && length(q - uHoleA[i].xyz * al) < uHoleC[i].w * rr) return true;
  }
  return false;
}
`;
const cutDiscard = (test) => `#include <clipping_planes_fragment>\n  if (uCutOn > 0.5 && ${test}) discard;`;
// Ajoute la déformation à un matériau quelconque (stencil des coupes, fantôme) : uniformes partagés + raideur k.
export function addDeformTo(mat, shared, k, cut = 'keep') {
  const uniforms = { ...shared, uDK: { value: k }, uDOn: { value: 1 }, ...cutU };
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${GLSL_DEFORM}\nvarying vec3 vCutW;`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${DEFORM_VERTEX}\n${CUT_VERTEX}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${GLSL_CUT}`)
      .replace('#include <clipping_planes_fragment>', cutDiscard(cut === 'ghost' ? 'cutField(vCutW, 0.0) >= 0.0' : 'cutField(vCutW, 0.0) < 0.0'));
  };
  const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => key() + '|deform-' + cut;
  return mat;
}

// Matériau de profondeur des ombres, déformé. three clone le matériau pour les ombres coupées (clipShadows) :
// la copie doit garder la déformation.
class DeformDepthMaterial extends THREE.MeshDepthMaterial {
  copy(src) { super.copy(src); this.onBeforeCompile = src.onBeforeCompile; this.customProgramCacheKey = src.customProgramCacheKey; return this; }
}

function patchShader(sh) {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', `#include <common>
      ${GLSL_DEFORM}
      varying vec3 vCutW;
      varying vec3 vObj; varying vec4 vTis; varying vec3 vCol; varying float vSid;
      varying float vInfW;
      uniform vec4 uTis;
      #ifdef OCCL
      attribute float occl; varying float vOccl;
      #endif
      #ifdef ENVELOPPE
      attribute vec4 col; attribute vec4 tis;
      #endif
      #ifdef VALVE
      attribute vec3 vparam; varying vec3 vPar;
      #endif
      `)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vObj = position;
      vInfW = infarctW((modelMatrix * vec4(position, 1.0)).xyz);
      #ifdef OCCL
      vOccl = occl;
      #endif
      #ifdef VALVE
      vPar = vparam;
      #endif
      #ifdef ENVELOPPE
      vCol = pow(col.rgb, vec3(2.2)); vTis = vec4(tis.xyz, col.a); vSid = floor(tis.w * 255.0 + 0.5);
      #else
      vCol = vec3(1.0); vTis = uTis; vSid = -10.0;
      #endif
      ${DEFORM_VERTEX}
      ${CUT_VERTEX}`);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\n${GLSL_CUT}\nuniform float uCutExtra;\n#if defined(CAVCLIP) || defined(CORONAIRE)\nuniform sampler3D uVol; uniform vec3 uVolMin; uniform vec3 uVolScale; uniform vec3 uVolHalf;\n#endif\n#ifdef RACINES\n${GLSL_ROOTS}\n#endif\n#ifdef FOSSE\nuniform vec3 uFosC; uniform vec3 uFosN; uniform vec3 uFosU; uniform vec3 uFosAB;\n#endif\n#ifdef PULROOT\nuniform vec4 uPulR; uniform vec4 uPulA;\n#endif\n#ifdef AOROOT\nuniform vec4 uAoR; uniform vec4 uAoA;\n#endif\n#ifdef OSTENV\nuniform vec4 uOst[2]; uniform vec3 uOstN[2];\n#endif`)
    .replace('#include <clipping_planes_fragment>', cutDiscard('cutField(vCutW, uCutExtra) < 0.0') + '\n  #ifdef CAVCLIP\n  { vec3 tc = (vObj - uVolMin) * uVolScale + uVolHalf;\n    if (all(greaterThan(tc, vec3(0.0))) && all(lessThan(tc, vec3(1.0)))) { vec4 wc = textureLod(uVol, tc, 0.0);\n    if (wc.g * 2.55 < ' + CS_CLIP.toFixed(2) + ' && wc.r * 2.55 > 0.02) discard; } }\n  #endif\n  #ifdef CORONAIRE\n  { vec3 tc = (vObj - uVolMin) * uVolScale + uVolHalf;\n    if (all(greaterThan(tc, vec3(0.0))) && all(lessThan(tc, vec3(1.0)))) { vec4 wc = textureLod(uVol, tc, 0.0);\n    if (wc.g * 2.55 < 0.05 && wc.r * 2.55 > 0.02) discard; } }\n  #endif\n  #ifdef RACINES\n  if (!inRoot(vObj, 0.4) || inRootFloor(vObj) || inOstium(vObj)) discard;\n  #endif\n  #ifdef PULROOT\n  { vec3 q = vObj - uPulR.xyz; float al = dot(q, uPulA.xyz); if (al > 0.0 && al < uPulA.w && length(q - uPulA.xyz * al) < uPulR.w) discard; }\n  #endif\n  #ifdef OSTENV\n  for (int i = 0; i < 2; i++) { if (uOst[i].w <= 0.0) continue; vec3 q = vObj - uOst[i].xyz; float a = dot(q, uOstN[i]);\n    if (a > -0.45 && a < 0.25 && length(q - uOstN[i] * a) < uOst[i].w * 1.45) discard; }\n  #endif\n  #ifdef AOROOT\n  { vec3 q = vObj - uAoR.xyz; float al = dot(q, uAoA.xyz); if (dot(cameraPosition - uAoR.xyz, uAoA.xyz) > uAoA.w && al > 0.15 * uAoA.w && al < 1.05 * uAoA.w && length(q - uAoA.xyz * al) < uAoR.w) discard; }\n  #endif\n  #ifdef FOSSE\n  { vec3 q = vObj - uFosC; float d = dot(q, uFosN);\n    if (abs(d) < uFosAB.z) { float x = dot(q, uFosU) / uFosAB.x, y = dot(q, cross(uFosN, uFosU)) / uFosAB.y; if (x * x + y * y < 1.0) discard; } }\n  #endif')
    .replace('#include <color_fragment>', `#include <color_fragment>
      float dTint;
      float dH = tissueDetail(vObj, vTis, dTint);
      #ifdef VALVE
      {
        // feuillet : fibres de collagène radiales (de l'anneau au bord libre), fines ondulations parallèles au bord,
        // grain nodulaire de la zone rugueuse ; fondus quand ils deviennent plus fins qu'un pixel
        vec2 g = fwidth(vPar.xy);
        float lodF = clamp(g.x * 55.0, 0.0, 1.0), lodC = clamp(g.y * 60.0, 0.0, 1.0);
        float f1 = vnoise(vec3(vPar.x * 70.0, vPar.y * 4.0, 0.5));
        float f2 = vnoise(vec3(vPar.x * 150.0 + 7.0, vPar.y * 7.0, 3.0));
        float fib = mix(smoothstep(0.28, 0.72, 0.6 * f1 + 0.4 * f2), 0.5, lodF); // contraste étiré : faisceaux nets
        fib = mix(fib, 0.5, smoothstep(0.18, 0.3, vPar.z)); // calcaire épais : plus de fibres visibles
        float rough = smoothstep(0.6, 0.9, vPar.y);
        float crimp = mix(0.5 + 0.5 * sin(vPar.y * 110.0 + 5.0 * vnoise(vec3(vPar.x * 12.0, 1.0, 2.0))), 0.5, lodC);
        float nod = vnoise(vec3(vPar.x * 28.0, vPar.y * 20.0, 9.0));
        dH = 0.55 * fib + 0.25 * crimp * (0.3 + 0.7 * rough) + 0.3 * nod * rough;
        dTint = 0.8 + 0.3 * fib - 0.1 * rough * nod + 0.05 * crimp * rough;
      }
      #endif
      diffuseColor.rgb *= vCol * dTint;
      // myocarde infarci : terne, plus pâle et grisâtre (Michaud 2020) ; artère occluse : sombre, sans sang (TIMI 0)
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.6, 0.62) + vec3(0.16, 0.14, 0.12), 0.85 * vInfW * uInfTint);
      #ifdef OCCL
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.03, 0.035), 0.9 * vOccl * uOccl);
      #endif`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = perturbN(-vViewPosition, normal, vec2(dFdx(dH), dFdy(dH)) * uBump, faceDirection);`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor * mix(1.0, 1.25, vTis.x) * mix(1.0, 0.85, vTis.y) * (1.12 - 0.24 * dTint), 0.08, 1.0);`)
    .replace('#include <aomap_fragment>', `float hlF = max(uHi, 1.0 - step(0.5, abs(vSid - uSel)));
    {
      float ao = vTis.w;
      reflectedLight.indirectDiffuse *= ao;
      reflectedLight.indirectSpecular *= mix(0.3, 1.0, ao);
      reflectedLight.directDiffuse *= mix(0.55, 1.0, ao);
      reflectedLight.directSpecular *= mix(0.45, 1.0, ao);
      // diffusion sous la surface : la lumière « enveloppe » le relief et rougit les zones d'ombre douce
      vec3 sssTint = mix(mix(vec3(1.0, 0.55, 0.6), vec3(1.0, 0.78, 0.45), vTis.x), vec3(1.0, 0.86, 0.8), vTis.y);
      #if NUM_DIR_LIGHTS > 0
      for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
        float ndl = dot(normal, directionalLights[i].direction);
        float wrap = clamp((ndl + 0.6) / 1.6, 0.0, 1.0) - clamp(ndl, 0.0, 1.0);
        reflectedLight.directDiffuse += directionalLights[i].color * diffuseColor.rgb * sssTint * max(wrap, 0.0) * uSSS * ao;
      }
      #endif
      #ifdef VALVE
      {
        float thin = 1.0 - clamp(vPar.z / 0.12, 0.0, 1.0);
        vec3 trTint = vec3(1.0, 0.9, 0.82);
        #if NUM_DIR_LIGHTS > 0
        // lumière principale seulement (les contre-jours rendraient le feuillet lumineux de l'intérieur)
        float back = clamp(-dot(normal, directionalLights[0].direction), 0.0, 1.0);
        reflectedLight.directDiffuse += directionalLights[0].color * diffuseColor.rgb * trTint * back * (0.25 + 0.75 * thin) * uTrans * ao;
        #endif
        totalEmissiveRadiance += diffuseColor.rgb * trTint * 0.02 * thin * uTrans * ao; // lueur diffuse du tissu mince
      }
      #endif
      float fres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
      totalEmissiveRadiance += (diffuseColor.rgb * sssTint + vec3(0.25 * vTis.y)) * fres * uRim * ao;
      // sélection : la structure garde sa couleur naturelle, un liseré clair et chaud la détache
      totalEmissiveRadiance += hlF * (diffuseColor.rgb * 0.1 + pow(fres, 0.8) * vec3(1.0, 0.9, 0.72) * 0.9);
    }
    #include <aomap_fragment>`)
    .replace('#include <opaque_fragment>', `// mode focus : tout ce qui n'est pas sélectionné s'estompe vers un gris clair désaturé (procédé des animations médicales)
    if (uFocus > 0.5 && hlF < 0.5) {
      float lum = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
      outgoingLight = mix(outgoingLight, vec3(lum) * 0.55 + vec3(0.3, 0.31, 0.33), 0.6);
    }
    #include <opaque_fragment>`);
}

/* ─────────── utilitaires géométriques ─────────── */
function ellipsoid(rx, ry, rz, seg = 48) {
  const g = new THREE.SphereGeometry(1, seg, seg);
  g.scale(rx, ry, rz);
  return g;
}
// Tube fermé à rayon variable le long d'une courbe Catmull-Rom (disques terminaux : surface close pour le stencil).
export function tubeGeometry(points, radiusFn, segs = 64, radial = 20) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  const rOf = (t) => (typeof radiusFn === 'function' ? radiusFn(t) : radiusFn);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    const r = rOf(t);
    const nn = frames.normals[i], bb = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      const cx = -Math.cos(ang), cy = Math.sin(ang);
      N.set(cx * nn.x + cy * bb.x, cx * nn.y + cy * bb.y, cx * nn.z + cy * bb.z).normalize();
      pos.push(P.x + r * N.x, P.y + r * N.y, P.z + r * N.z);
      nor.push(N.x, N.y, N.z);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j, c = b + 1, d = a + 1;
      idx.push(a, b, d, b, c, d);
    }
  }
  const T0 = curve.getTangentAt(0), T1 = curve.getTangentAt(1), P0 = curve.getPointAt(0), P1 = curve.getPointAt(1);
  const c0 = pos.length / 3; pos.push(P0.x, P0.y, P0.z); nor.push(-T0.x, -T0.y, -T0.z);
  const c1 = pos.length / 3; pos.push(P1.x, P1.y, P1.z); nor.push(T1.x, T1.y, T1.z);
  for (let j = 0; j < radial; j++) {
    idx.push(c0, j, j + 1);
    const e = segs * (radial + 1) + j;
    idx.push(c1, e + 1, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.userData.curve = curve;
  return g;
}

// Fusionne des géométries indexées (position, normale) en une seule.
function mergeIndexed(geos) {
  let nv = 0, ni = 0;
  geos.forEach((g) => { nv += g.attributes.position.count; ni += g.index.count; });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, ov * 3);
    nor.set(g.attributes.normal.array, ov * 3);
    const src = g.index.array;
    for (let i = 0; i < src.length; i++) idx[oi + i] = src[i] + ov;
    ov += g.attributes.position.count; oi += src.length;
    g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  m.computeBoundingSphere();
  return m;
}

/* ─────────── lancer de rayons accéléré (grille régulière) ─────────── */
// Le maillage simplifié sert au clic et au masquage des étiquettes (jusqu'à 32 rayons toutes les 4 images) :
// une grille de cases de 0,6 cm limite chaque rayon à quelques centaines de triangles au lieu de 35 000.
function buildRayGrid(geo, cell = 0.6) {
  const pos = geo.attributes.position.array, idx = geo.index.array;
  geo.computeBoundingBox();
  const min = geo.boundingBox.min.clone().subScalar(0.05), max = geo.boundingBox.max.clone().addScalar(0.05);
  const n = [Math.ceil((max.x - min.x) / cell), Math.ceil((max.y - min.y) / cell), Math.ceil((max.z - min.z) / cell)];
  const cellOf = (v, k) => Math.min(n[k] - 1, Math.max(0, Math.floor((v - min.getComponent(k)) / cell)));
  const ntri = idx.length / 3;
  const ranges = new Int32Array(ntri * 6);
  const count = new Uint32Array(n[0] * n[1] * n[2] + 1);
  for (let t = 0; t < ntri; t++) {
    for (let k = 0; k < 3; k++) {
      const a = pos[idx[t * 3] * 3 + k], b = pos[idx[t * 3 + 1] * 3 + k], c = pos[idx[t * 3 + 2] * 3 + k];
      ranges[t * 6 + k] = cellOf(Math.min(a, b, c), k); ranges[t * 6 + 3 + k] = cellOf(Math.max(a, b, c), k);
    }
    for (let z = ranges[t * 6 + 2]; z <= ranges[t * 6 + 5]; z++) for (let y = ranges[t * 6 + 1]; y <= ranges[t * 6 + 4]; y++) for (let x = ranges[t * 6]; x <= ranges[t * 6 + 3]; x++) count[(z * n[1] + y) * n[0] + x + 1]++;
  }
  for (let i = 1; i < count.length; i++) count[i] += count[i - 1];
  const items = new Uint32Array(count[count.length - 1]);
  const fill = count.slice();
  for (let t = 0; t < ntri; t++) {
    for (let z = ranges[t * 6 + 2]; z <= ranges[t * 6 + 5]; z++) for (let y = ranges[t * 6 + 1]; y <= ranges[t * 6 + 4]; y++) for (let x = ranges[t * 6]; x <= ranges[t * 6 + 3]; x++) items[fill[(z * n[1] + y) * n[0] + x]++] = t;
  }
  return { pos, idx, min, n, cell, start: count, items };
}
const _inv = new THREE.Matrix4(), _ray = new THREE.Ray(), _p = new THREE.Vector3();
function gridRaycast(raycaster, intersects) {
  const G = this.userData.grid;
  _inv.copy(this.matrixWorld).invert();
  _ray.copy(raycaster.ray).applyMatrix4(_inv);
  const o = _ray.origin, d = _ray.direction;
  // entrée dans la boîte de la grille
  const lo = [G.min.x, G.min.y, G.min.z], hi = [lo[0] + G.n[0] * G.cell, lo[1] + G.n[1] * G.cell, lo[2] + G.n[2] * G.cell];
  const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z];
  let t0 = 0, t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(D[k]) < 1e-12) { if (O[k] < lo[k] || O[k] > hi[k]) return; continue; }
    let a = (lo[k] - O[k]) / D[k], b = (hi[k] - O[k]) / D[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  if (t0 > t1) return;
  const cellIdx = [0, 1, 2].map((k) => Math.min(G.n[k] - 1, Math.max(0, Math.floor((O[k] + D[k] * (t0 + 1e-6) - lo[k]) / G.cell))));
  const step = D.map((v) => (v > 0 ? 1 : -1));
  const tMax = [0, 1, 2].map((k) => (Math.abs(D[k]) < 1e-12 ? Infinity : (lo[k] + (cellIdx[k] + (D[k] > 0 ? 1 : 0)) * G.cell - O[k]) / D[k]));
  const tDelta = D.map((v) => (Math.abs(v) < 1e-12 ? Infinity : G.cell / Math.abs(v)));
  const seen = new Set(), hits = [];
  const { pos, idx } = G;
  for (;;) {
    const c = (cellIdx[2] * G.n[1] + cellIdx[1]) * G.n[0] + cellIdx[0];
    for (let s = G.start[c]; s < G.start[c + 1]; s++) {
      const t = G.items[s];
      if (seen.has(t)) continue;
      seen.add(t);
      // Möller–Trumbore, faces avant seulement (comme THREE.Mesh avec un matériau FrontSide)
      const ia = idx[t * 3] * 3, ib = idx[t * 3 + 1] * 3, ic = idx[t * 3 + 2] * 3;
      const e1x = pos[ib] - pos[ia], e1y = pos[ib + 1] - pos[ia + 1], e1z = pos[ib + 2] - pos[ia + 2];
      const e2x = pos[ic] - pos[ia], e2y = pos[ic + 1] - pos[ia + 1], e2z = pos[ic + 2] - pos[ia + 2];
      const px = D[1] * e2z - D[2] * e2y, py = D[2] * e2x - D[0] * e2z, pz = D[0] * e2y - D[1] * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (det < 1e-12) continue;
      const inv = 1 / det;
      const tx = O[0] - pos[ia], ty = O[1] - pos[ia + 1], tz = O[2] - pos[ia + 2];
      const u = (tx * px + ty * py + tz * pz) * inv;
      if (u < 0 || u > 1) continue;
      const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
      const v = (D[0] * qx + D[1] * qy + D[2] * qz) * inv;
      if (v < 0 || u + v > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (tt <= 0) continue;
      hits.push([tt, t]);
    }
    const k = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
    if (tMax[k] > t1) break;
    cellIdx[k] += step[k];
    if (cellIdx[k] < 0 || cellIdx[k] >= G.n[k]) break;
    tMax[k] += tDelta[k];
  }
  for (const [tt, t] of hits) {
    _p.copy(d).multiplyScalar(tt).add(o).applyMatrix4(this.matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(_p);
    if (distance < raycaster.near || distance > raycaster.far) continue;
    intersects.push({ distance, point: _p.clone(), object: this, face: { a: idx[t * 3], b: idx[t * 3 + 1], c: idx[t * 3 + 2] }, faceIndex: t });
  }
}


/* ─────────── chargement (assets/heart.bin, format HRT2) ─────────── */
// Lecture en flux : progression connue dès les premiers octets (longueur totale inscrite dans l'en-tête HRT3), même
// quand le serveur compresse le fichier (la longueur annoncée par HTTP est alors celle du fichier compressé).
async function fetchModel(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`assets/heart.bin : ${res.status}`);
  if (!res.body || !onProgress) return res.arrayBuffer();
  const reader = res.body.getReader(), parts = [];
  let got = 0, total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); got += value.length;
    if (!total && got >= 12) {
      const head = parts.length === 1 ? parts[0] : new Uint8Array(parts.flatMap((p) => [...p.subarray(0, 12)]).slice(0, 12));
      const dv = new DataView(head.buffer, head.byteOffset, 12);
      total = String.fromCharCode(head[0], head[1], head[2], head[3]) === 'HRT3' ? dv.getUint32(8, true) : Number(res.headers.get('content-length')) || 0;
    }
    if (total) onProgress(Math.min(1, got / total));
  }
  const buf = new Uint8Array(got);
  let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
  return buf.buffer;
}
// Format compact HRT3 (tools/lib/hrt-codec.mjs) : positions en écarts, indices en entiers de longueur variable
function decodePositions(src, n) {
  const q = new Uint16Array(n);
  for (let i = 0; i < n; i++) q[i] = ((i >= 3 ? q[i - 3] : 0) + (src[i] | (src[n + i] << 8))) & 0xffff;
  return q;
}
function decodeIndices(src, count, wide) {
  const out = wide ? new Uint32Array(count) : new Uint16Array(count);
  let p = 0, hi = 0;
  for (let k = 0; k < count; k++) {
    let v = 0, s = 0, b;
    do { b = src[p++]; v |= (b & 0x7f) << s; s += 7; } while (b & 0x80);
    v >>>= 0;
    const i = hi - ((v >>> 1) ^ -(v & 1));
    out[k] = i; if (i + 1 > hi) hi = i + 1;
  }
  return out;
}
async function loadHeartData(onProgress) {
  const buf = await fetchModel(new URL('../assets/heart.bin', import.meta.url), onProgress);
  const dv = new DataView(buf);
  const magic = String.fromCharCode(...new Uint8Array(buf, 0, 4));
  if (magic !== 'HRT2' && magic !== 'HRT3') throw new Error(`assets/heart.bin : format ${magic} inattendu`);
  const v3f = magic === 'HRT3', h0 = v3f ? 12 : 8;
  const hl = dv.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, h0, hl)));
  const base = h0 + hl;
  const view = (Type, [off, len]) => new Type(buf, base + off, len);
  const { min, size } = header.bounds;
  const geos = {};
  for (const m of header.meshes) {
    const q = v3f ? decodePositions(view(Uint8Array, m.pos), m.pos[1] / 2) : view(Uint16Array, m.pos), p = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) { const k = i % 3; p[i] = min[k] + (q[i] / 65535) * size[k]; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setIndex(new THREE.BufferAttribute(v3f ? decodeIndices(view(Uint8Array, m.idx), m.icount, m.idx32) : m.idx32 ? view(Uint32Array, m.idx) : view(Uint16Array, m.idx), 1));
    if (m.nor) g.setAttribute('normal', new THREE.BufferAttribute(view(Int16Array, m.nor), 3, true));
    else g.computeVertexNormals(); // HRT3 : normales recalculées (pondérées par l'aire, comme au générateur)
    if (m.col) g.setAttribute('col', new THREE.BufferAttribute(view(Uint8Array, m.col), 4, true));
    if (m.tis) g.setAttribute('tis', new THREE.BufferAttribute(view(Uint8Array, m.tis), 4, true));
    g.computeBoundingSphere();
    geos[m.name] = { geometry: g, sid: m.sid ? view(Uint8Array, m.sid) : null, meta: m };
  }
  // carte 3D de la paroi (voxels de 2 mm) : profondeur sous l'épicarde, distance à l'endocarde, paroi vasculaire, oreillette
  let wall = null;
  const W = header.volumes?.paroi;
  if (W) {
    const tex = new THREE.Data3DTexture(new Uint8Array(view(Uint8Array, W.data)), W.n[0], W.n[1], W.n[2]);
    tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType;
    tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.unpackAlignment = 1; tex.needsUpdate = true;
    wall = { texture: tex, min: v3(W.min), n: v3(W.n), step: W.step };
  }
  return { header, geos, wall };
}

/* ─────────── construction ─────────── */
export async function buildHeart(onProgress) {
  const { header, geos, wall } = await loadHeartData(onProgress);
  const ids = header.ids;
  const F = header.frame;
  // repère local du cœur : x = gauche locale, y = vers la base (−axe), z = avant local, origine au centre de la base
  const M = new THREE.Matrix4().makeBasis(v3(F.v), v3(F.axis).negate(), v3(F.u)).setPosition(v3(F.base));
  const root = new THREE.Group();
  root.name = 'coeur';

  const registry = {};        // id → { meshes: [], anchor: Vector3 (monde) }
  const materials = [];       // matériaux visibles (clipping, mode translucide)
  const tissueMats = [];      // matériaux « tissu » (surbrillance, mode focus)
  const solids = [];          // { mesh, hole, cap } pour les surfaces de coupe (stencil)
  const cutOnly = [];         // objets visibles seulement en coupe
  const selUniform = { value: -1 };
  // repère du battement (voir GLSL_DEFORM) : axe propre du VG, plan auriculo-ventriculaire, côté du VD
  const deformU = (() => {
    const VL = header.valves, apex = v3(F.apex);
    const M = v3(VL['valve-mitrale'].center), T = v3(VL['valve-tricuspide'].center), Ao = v3(VL['valve-aortique'].center);
    const n = new THREE.Vector3().crossVectors(T.clone().sub(M), Ao.clone().sub(M)).normalize();
    if (n.dot(apex.clone().sub(M)) < 0) n.negate();
    // axe du VG : du centre de sa cavité dans la tranche basale (0 à 1,5 cm sous le plan auriculo-ventriculaire) à la pointe
    const B = (() => {
      const cp = geos.cavites.geometry.attributes.position, cs = geos.cavites.sid, c = new THREE.Vector3(), p = new THREE.Vector3(); let k = 0;
      for (let i = 0; i < cs.length; i++) { if (ids[cs[i]] !== 'ventricule-gauche') continue; p.fromBufferAttribute(cp, i); const d = p.dot(n) - n.dot(M); if (d > 0 && d < 1.5) { c.add(p); k++; } }
      return k ? c.multiplyScalar(1 / k) : M.clone().add(Ao).multiplyScalar(0.5);
    })(), A = apex.clone().sub(B).normalize();
    const rv = T.clone().sub(B).projectOnPlane(A).normalize();
    return {
      uDB: { value: B }, uDA: { value: A }, uDL: { value: apex.distanceTo(B) },
      uDAV: { value: new THREE.Vector4(n.x, n.y, n.z, n.dot(M)) }, uDApx: { value: n.dot(apex) - n.dot(M) }, uDRV: { value: rv },
      uDR: { value: new THREE.Vector2() }, uDLg: { value: 0 }, uDTw: { value: new THREE.Vector2() }, uDAt: { value: new THREE.Vector2() }, uDRes: { value: 0 },
      uDRA: { value: new THREE.Vector3() }, uDLA: { value: new THREE.Vector3() },
      uDDil: { value: 0 }, uDTc: { value: T.clone() }, uDTa: { value: v3(VL['valve-tricuspide'].axis).normalize() },
      uDMc: { value: M.clone() }, uDMa: { value: v3(VL['valve-mitrale'].axis).normalize() }, uDAo: { value: Ao.clone() }, uDAoA: { value: v3(VL['valve-aortique'].axis).normalize() }, uDPu: { value: v3(VL['valve-pulmonaire'].center) },
      uDTs: { value: (() => { const d = VL['valve-tricuspide'], s = d.leaflets.find((l) => /Septal/.test(l.name)), t = (s.t0 + s.t1) / 2; return v3(d.e1).multiplyScalar(Math.cos(t)).addScaledVector(v3(d.e2), Math.sin(t)).normalize(); })() },
      uVol: { value: wall ? wall.texture : null }, uVolOn: { value: wall ? 1 : 0 },
      uVolMin: { value: wall ? wall.min.clone() : new THREE.Vector3() },
      uVolScale: { value: wall ? new THREE.Vector3(1 / (wall.step * wall.n.x), 1 / (wall.step * wall.n.y), 1 / (wall.step * wall.n.z)) : new THREE.Vector3(1, 1, 1) },
      uVolHalf: { value: wall ? new THREE.Vector3(0.5 / wall.n.x, 0.5 / wall.n.y, 0.5 / wall.n.z) : new THREE.Vector3() },
      // infarctus de l'IVA (vue Coronaires) : territoire akinétique, teinte, artère occluse ; fosse ovale
      uInf: { value: 0 }, uInfAnt: { value: new THREE.Vector3(1, 0, 0) }, uInfSep: { value: new THREE.Vector3(0, 1, 0) }, uInfTint: { value: 0 }, uOccl: { value: 0 },
      uFosC: { value: new THREE.Vector3() }, uFosN: { value: new THREE.Vector3(0, 0, 1) }, uFosU: { value: new THREE.Vector3(0, 1, 0) }, uFosAB: { value: new THREE.Vector3(1, 1, -1) },
    };
  })();
  const focusUniform = { value: 0 };
  const rootU = (() => {
    const z = ['valve-aortique', 'valve-pulmonaire'].map((id) => {
      const d = header.valves[id], a = v3(d.axis).normalize();
      // au-dessus de la coupe des vues de la valve (aortique : 2 hauteurs de cuspide, au-dessus des ostia coronaires ;
      // pulmonaire : 0,95)
      return [new THREE.Vector4(d.center[0], d.center[1], d.center[2], d.radius * 0.97), new THREE.Vector4(a.x, a.y, a.z, d.height * (id === 'valve-aortique' ? 2.2 : 1.8))];
    });
    return { uHoleC: { value: z.map((x) => x[0]) }, uHoleA: { value: z.map((x) => x[1]) },
      uHoleCw: { value: z.map((x) => new THREE.Vector3(x[0].x, x[0].y, x[0].z)) },
      // intérieur de la racine pulmonaire (de l'anneau au début de la lumière du tronc) : la surface externe du modèle,
      // repliée entre l'infundibulum et l'aorte, y passait et barrait la vue chirurgicale de la valve
      uPulR: { value: (() => { const d = header.valves['valve-pulmonaire']; return new THREE.Vector4(d.center[0], d.center[1], d.center[2], d.radius * 0.97); })() },
      uPulA: { value: (() => { const d = header.valves['valve-pulmonaire'], a = v3(d.axis).normalize(); return new THREE.Vector4(a.x, a.y, a.z, d.height * 1.15); })() },
      // sinus aortiques (de 0,15 à 1,05 hauteur de cuspide) : la cavité du VG de BodyParts3D y remonte en poches, au-dessus
      // des cuspides, dont on voyait la paroi rouge flotter dans l'aorte en vue chirurgicale. Retirées seulement quand on
      // regarde depuis l'aorte (vue depuis le ventricule inchangée)
      uAoR: { value: (() => { const d = header.valves['valve-aortique']; return new THREE.Vector4(d.center[0], d.center[1], d.center[2], d.radius * 0.95); })() },
      uAoA: { value: (() => { const d = header.valves['valve-aortique'], a = v3(d.axis).normalize(); return new THREE.Vector4(a.x, a.y, a.z, d.height); })() },
      uOst: { value: [new THREE.Vector4(0, 0, 0, -1), new THREE.Vector4(0, 0, 0, -1)] }, uOstN: { value: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1)] } };
  })();
  const depthCache = new Map();
  const deformedDepth = (k) => {
    if (!depthCache.has(k)) depthCache.set(k, addDeformTo(new DeformDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), deformU, k, 'keep'));
    return depthCache.get(k);
  };

  const tissue = (color, { tis = [0, 0, 0, 1], envelope = false, valve = false, cavClip = false, coro = false, occl = false, fossa = false, pulroot = false, aoroot = false, ostia = false, roots = false, rootSel = -1, trans = 0, bump = 0.22, sss = 0.32, rim = 0.12, deformK = K_EPI, deformOn = true, ...rest } = {}) => {
    const m = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.5, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.32, specularIntensity: 0.45,
      sheen: 0.5, sheenRoughness: 0.55, sheenColor: 0xffe2dc, envMapIntensity: 0.8, side: THREE.DoubleSide, ...rest,
    });
    if (envelope) m.defines = { ...m.defines, ENVELOPPE: '' };
    if (valve) m.defines = { ...m.defines, VALVE: '' };
    if (cavClip) m.defines = { ...m.defines, CAVCLIP: '' };
    if (coro) m.defines = { ...m.defines, CORONAIRE: '' };
    if (occl) m.defines = { ...m.defines, OCCL: '' };
    if (fossa) m.defines = { ...m.defines, FOSSE: '' };
    if (pulroot) m.defines = { ...m.defines, PULROOT: '' };
    if (aoroot) m.defines = { ...m.defines, AOROOT: '' };
    if (ostia) m.defines = { ...m.defines, OSTENV: '' };
    if (roots) m.defines = { ...m.defines, RACINES: '' };
    const uniforms = {
      uSel: envelope ? selUniform : { value: -1 }, uHi: { value: 0 }, uTis: { value: new THREE.Vector4(...tis) },
      uBump: { value: bump }, uSSS: { value: sss }, uRim: { value: rim }, uFocus: focusUniform,
      ...deformU, uDK: { value: deformK }, uDOn: { value: deformOn ? 1 : 0 }, uTrans: { value: trans },
      ...cutU, uCutExtra: { value: 0 }, ...rootU, uRootSel: { value: rootSel },
    };
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, uniforms); patchShader(sh); };
    m.customProgramCacheKey = () => ['tissu', valve && 'valve', envelope && 'enveloppe', cavClip && 'cavite', coro && 'coronaire', occl && 'occlusion', fossa && 'fosse', pulroot && 'racpulm', aoroot && 'racao', ostia && 'ostia', roots && 'racine'].filter(Boolean).join('-');
    m.userData.uniforms = uniforms;
    m.userData.baseColor = new THREE.Color(color);
    materials.push(m); tissueMats.push(m);
    return m;
  };
  const interior = (m) => { m.userData.interior = true; m.userData.uniforms.uCutExtra = cutU.uCutOffI; return m; };
  const matCache = new Map();
  const PRESETS = {
    // feuillets et cuspides : couleur et ombrage par sommet (js/valves.js), film humide brillant, translucidité modérée
    valve: () => interior(tissue(0xffffff, { envelope: true, valve: true, trans: 0.35, deformOn: false, sss: 0.25, rim: 0.12, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.09, bump: 1.1, sheen: 0.08, sheenColor: 0xfff2dc, sheenRoughness: 0.4, envMapIntensity: 0.55 })),
    cordage: () => interior(tissue(COL.cordage, { tis: [0, 1, 0, 1], deformOn: false, sss: 0.6, rim: 0.3, roughness: 0.26, clearcoat: 0.75, clearcoatRoughness: 0.1, bump: 0.03, sheen: 0.1 })),
    // piliers : plus clairs que l'endocarde trabéculé, pour se détacher de la paroi ; coupés comme le reste du muscle
    // intima de la racine aortique (vue de la valve aortique) : couleur et occlusion par sommet
    intima: () => tissue(0xffffff, { envelope: true, deformOn: false, sss: 0.45, rim: 0.1, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.15, bump: 0.12, sheen: 0.1 }),
    papillaire: () => tissue(COL.papillaire, { deformK: K_ENDO, roughness: 0.42, clearcoat: 0.45, bump: 0.35, sss: 0.45, rim: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    conduction: () => tissue(COL.conduction, { deformK: 0.12, tis: [0, 1, 0, 1], emissive: 0xffb300, emissiveIntensity: 0.35, roughness: 0.45, sss: 0.2 }),
    // vaisseaux coronaires : la partie qui dépasse de l'endocarde dans une cavité (grande veine du cœur contre
    // l'oreillette gauche ; sinus coronaire, voir aussi CAVCLIP) est coupée en position de repos (vObj) : la coupe
    // suit la contraction
    coroA: (id) => tissue(COL.coronaire, { coro: true, occl: id === 'iva', tis: [0, 1, 0, 1], roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.14, bump: 0.1, sss: 0.45, rim: 0.12, sheen: 0.08, sheenColor: 0xff8a7a }),
    // sinus coronaire : la pièce BodyParts3D se prolonge dans l'oreillette droite ; masquée au-delà de son orifice
    coroV: (id) => tissue(COL.veineCard, { cavClip: id === 'sinus-coronaire', coro: true, tis: [0, 1, 0, 1], roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.14, bump: 0.08, sss: 0.35, rim: 0.12, sheen: 0.08, sheenColor: 0xb8c8ff }),
  };
  const matFor = (id, preset) => {
    const key = `${id}|${preset}`;
    if (!matCache.has(key)) matCache.set(key, PRESETS[preset](id));
    return matCache.get(key);
  };
  const reg = (id) => (registry[id] ??= { meshes: [], anchor: null });
  const register = (id, mesh) => { mesh.userData.id = id; root.add(mesh); reg(id).meshes.push(mesh); return mesh; };

  /* ── Enveloppe continue ── */
  // ostia : la surface externe passe juste sous l'intima au départ des coronaires et cachait une partie de l'entonnoir
  const envMat = tissue(0xffffff, { envelope: true, fossa: true, pulroot: true, ostia: true, rim: 0.45 }); // fossa : la surface externe s'enfonce dans le sillon interauriculaire, ouverte à la fosse ovale
  const envelope = new THREE.Mesh(geos.enveloppe.geometry, envMat);
  envelope.userData.envelope = true;
  envelope.castShadow = true; envelope.receiveShadow = true;
  root.add(envelope);
  solids.push({ mesh: envelope, hole: false, cap: 'myo', k: K_EPI });
  // maillage simplifié invisible : clic et masquage des étiquettes
  const proxySid = geos.proxy.sid;
  const proxy = new THREE.Mesh(geos.proxy.geometry, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.userData.proxy = true;
  proxy.userData.id = 'enveloppe';
  proxy.userData.grid = buildRayGrid(geos.proxy.geometry);
  proxy.raycast = gridRaycast;
  root.add(proxy);
  for (const [id, a] of Object.entries(header.anchors)) reg(id).anchor = v3(a);

  // Solides invisibles des coupes : lumière des vaisseaux (sang)
  const hidden = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  for (const [name, cap] of [['lumiere-artere', 'artere'], ['lumiere-veine', 'veine']]) {
    const m = new THREE.Mesh(geos[name].geometry, hidden);
    m.renderOrder = -2;
    root.add(m);
    solids.push({ mesh: m, hole: false, cap, k: 0.03 });
    // la lumière n'est pas du muscle : creux dans la tranche de paroi (le sang la recouvre, sauf dans les racines)
    solids.push({ mesh: m, hole: true, cap: 'myo', k: 0.03 });
  }
  // intima des racines aortique et pulmonaire : paroi interne visible quand une coupe ouvre la racine (le tronc
  // pulmonaire est dans la lumière « veineuse », sang pauvre en oxygène)
  {
    for (const [name, rootSel] of [['lumiere-artere', 0], ['lumiere-veine', 1]]) {
      const m = new THREE.Mesh(geos[name].geometry, tissue(0xdba4a0, { roots: true, rootSel, side: THREE.BackSide, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.15, bump: 0.1, sss: 0.45, rim: 0.1 }));
      m.receiveShadow = true;
      root.add(m); cutOnly.push(m);
    }
  }
  // Racine pulmonaire : la lumière du tronc (BodyParts3D) ne commence qu'en haut des sinus (≈ 1,1 cm au-dessus de
  // l'anneau) ; entre l'anneau et elle, la racine comptait comme du muscle et sa tranche recouvrait les cuspides dans
  // les coupes. Volume creux de l'anneau au début de la lumière (cylindre au rayon de l'anneau), et sa face interne
  // dessinée comme l'intima des sinus.
  if (header.valves['valve-pulmonaire']) {
    const d = header.valves['valve-pulmonaire'], Cp = v3(d.center), Ap = v3(d.axis).normalize(), h0 = -0.25, h1 = d.height * 1.15;
    const basis = new THREE.Matrix4().makeBasis(...(() => { const x = new THREE.Vector3(1, 0, 0).projectOnPlane(Ap).normalize(); return [x, Ap, new THREE.Vector3().crossVectors(x, Ap)]; })());
    const place = (m) => { m.matrixAutoUpdate = false; m.matrix.copy(basis).setPosition(Cp.clone().addScaledVector(Ap, (h0 + h1) / 2)); return m; };
    const solid = place(new THREE.Mesh(new THREE.CylinderGeometry(d.radius * 1.0, d.radius * 1.0, h1 - h0, 48, 1, false), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })));
    solid.renderOrder = -2; root.add(solid);
    solids.push({ mesh: solid, hole: true, cap: 'myo', k: 0.03 });
    const wallM = place(new THREE.Mesh(new THREE.CylinderGeometry(d.radius * 1.0, d.radius * 1.0, h1 - h0, 64, 1, true), tissue(0xdba4a0, { side: THREE.BackSide, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.15, bump: 0.1, sss: 0.45, rim: 0.1 })));
    wallM.receiveShadow = true; root.add(wallM); cutOnly.push(wallM);
  }

  /* ── Cavités (paroi interne, visibles en coupe ; « trou » unique pour les surfaces de coupe) ── */
  {
    const g = geos.cavites.geometry, sid = geos.cavites.sid, n = sid.length;
    const fromFile = !!g.attributes.col;
    const col = new Uint8Array(n * 4), tis = new Uint8Array(n * 4);
    const ventr = new THREE.Color(COL.endocarde), atr = new THREE.Color(COL.endoOreillette);
    for (let i = 0; i < n; i++) {
      const isAtr = ids[sid[i]].startsWith('oreillette');
      const c = isAtr ? atr : ventr;
      col[i * 4] = Math.round(Math.pow(c.r, 1 / 2.2) * 255); col[i * 4 + 1] = Math.round(Math.pow(c.g, 1 / 2.2) * 255); col[i * 4 + 2] = Math.round(Math.pow(c.b, 1 / 2.2) * 255); col[i * 4 + 3] = 255;
      tis[i * 4 + 2] = isAtr ? 255 : 0; tis[i * 4 + 3] = sid[i];
    }
    if (!fromFile) { g.setAttribute('col', new THREE.BufferAttribute(col, 4, true)); g.setAttribute('tis', new THREE.BufferAttribute(tis, 4, true)); }
    // endocarde : film humide brillant sur le relief des trabécules
    const cavMat = tissue(0xffffff, { envelope: true, fossa: true, aoroot: true, deformK: K_ENDO, side: THREE.BackSide, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.18, bump: 0.25, sss: 0.55, rim: 0.08 });
    const cav = new THREE.Mesh(g, cavMat);
    cav.userData.id = 'cavites';
    cav.userData.sid = sid; // clic : cavité touchée (oreillette ou ventricule)
    cav.userData.leaf = true;
    cav.receiveShadow = true; // endocarde : ombres portées des valves, cordages et piliers
    root.add(cav);
    solids.push({ mesh: cav, hole: true, cap: 'myo', k: K_ENDO });
    cutOnly.push(cav);
  }

  /* ── Pièces BodyParts3D : coronaires, veines du cœur, valves, piliers ── */
  for (const [name, { geometry, meta }] of Object.entries(geos)) {
    if (!meta.role) continue;
    if (meta.role === 'coronaire' || meta.role === 'veine') {
      const mesh = register(meta.id, new THREE.Mesh(geometry, matFor(meta.id, meta.role === 'veine' ? 'coroV' : 'coroA')));
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.grid = buildRayGrid(geometry, 0.4);
      mesh.raycast = gridRaycast;
    } else {
      // muscle papillaire : solide fermé, légèrement gonflé au générateur pour se détacher, colonne charnue, devant
      // l'endocarde trabéculé (sa surface coïncide sinon avec la paroi creusée autour de lui)
      const mesh = new THREE.Mesh(geometry, matFor(meta.id, 'papillaire'));
      mesh.castShadow = true;
      register(meta.id, mesh);
      cutOnly.push(mesh);
      // tranche propre (fibres longitudinales, js/cut-surface.js) : la carte de la paroi les place dans la cavité
      solids.push({ mesh, hole: false, cap: 'pilier', k: K_ENDO });
    }
  }

  /* ── Valves et appareil sous-valvulaire (modèle paramétrique, js/valves.js) ── */
  const valves = header.valves ? buildValves(header.valves, matFor) : {};
  // Une seule valve affichée par orifice : la valve normale, ou une variante pathologique posée à sa place dans le
  // même cœur (vues des valves : js/av-views.js, js/aortic-view.js). Visibles seulement en coupe (showValves).
  const extraValves = new Map(); // valve supplémentaire (comparaison) → orifice
  const shown = { ...valves }, variants = Object.fromEntries(Object.keys(valves).map((id) => [id, [valves[id]]]));
  let valvesOn = false;
  const syncValves = () => { for (const [id, list] of Object.entries(variants)) for (const v of list) for (const m of v.meshes) m.visible = valvesOn && v === shown[id]; };
  const addValve = (id, v) => { for (const mesh of v.meshes) { register(id, mesh); mesh.userData.leaf = true; } variants[id].push(v); syncValves(); return v; };
  for (const [id, v] of Object.entries(valves)) for (const mesh of v.meshes) { register(id, mesh); mesh.userData.leaf = true; }
  syncValves();
  // centres des oreillettes (contraction auriculaire)
  {
    const cp = geos.cavites.geometry.attributes.position, cs = geos.cavites.sid, acc = { 'oreillette-droite': [new THREE.Vector3(), 0], 'oreillette-gauche': [new THREE.Vector3(), 0] };
    for (let i = 0; i < cs.length; i++) { const a = acc[ids[cs[i]]]; if (a) { a[0].x += cp.getX(i); a[0].y += cp.getY(i); a[0].z += cp.getZ(i); a[1]++; } }
    deformU.uDRA.value.copy(acc['oreillette-droite'][0]).multiplyScalar(1 / Math.max(1, acc['oreillette-droite'][1]));
    deformU.uDLA.value.copy(acc['oreillette-gauche'][0]).multiplyScalar(1 / Math.max(1, acc['oreillette-gauche'][1]));
  }
  // même déformation que GLSL_DEFORM, côté processeur (valves, cordages) ; carte de la paroi lue comme par le GPU
  // canal ch de la carte (0 profondeur sous l'épicarde, 1 distance à l'endocarde, 2 fraction transmurale, 3 tissu)
  const wallCh = (() => {
    if (!wall) return null;
    const D = wall.texture.image.data, [nx, ny, nz] = [wall.n.x, wall.n.y, wall.n.z], mn = wall.min, st = wall.step;
    let c = 2;
    const at = (i, j, k) => D[((Math.min(nz - 1, Math.max(0, k)) * ny + Math.min(ny - 1, Math.max(0, j))) * nx + Math.min(nx - 1, Math.max(0, i))) * 4 + c] / 255;
    return (p, ch, out = 0.5) => {
      c = ch;
      const fx = (p.x - mn.x) / st, fy = (p.y - mn.y) / st, fz = (p.z - mn.z) / st; // voxel i au point min + i·pas
      if (fx < -0.5 || fy < -0.5 || fz < -0.5 || fx > nx - 0.5 || fy > ny - 0.5 || fz > nz - 0.5) return out;
      const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz), u = fx - i, v = fy - j, w = fz - k;
      const L = (a, b, t) => a + (b - a) * t;
      return L(L(L(at(i, j, k), at(i + 1, j, k), u), L(at(i, j + 1, k), at(i + 1, j + 1, k), u), v),
        L(L(at(i, j, k + 1), at(i + 1, j, k + 1), u), L(at(i, j + 1, k + 1), at(i + 1, j + 1, k + 1), u), v), w);
    };
  })();
  const wallB = wallCh && ((p) => wallCh(p, 2));
  // Orifice du sinus coronaire dans l'oreillette droite : la pièce BodyParts3D, masquée dans la cavité (CAVCLIP), y
  // laisse un orifice ovale de ≈ 8 mm (8,1 × 7,7 mm, n = 100), bordé en bas par la valvule de Thébésius (86 % des
  // cœurs), entre l'orifice de la veine cave inférieure et l'anneau tricuspide (base du triangle de Koch). Placé là
  // où le vaisseau franchit l'endocarde, face à la cavité.
  if (wallCh && registry['sinus-coronaire']) {
    const ins = [], outs = [], p = new THREE.Vector3();
    for (const m of registry['sinus-coronaire'].meshes) {
      const pa = m.geometry.attributes.position;
      for (let k = 0; k < pa.count; k++) {
        p.fromBufferAttribute(pa, k);
        const g = wallCh(p, 1, 1) * 2.55, r = wallCh(p, 0, 0) * 2.55;
        if (g < CS_CLIP && r > 0.02) ins.push(p.clone()); else if (g > CS_CLIP + 0.06) outs.push(p.clone());
      }
    }
    // sommets intérieurs les plus proches de la partie extérieure (le maillage est grossier : ≈ 3 mm entre sommets)
    const dOut = ins.map((q) => Math.min(...outs.map((o) => o.distanceTo(q))));
    const dMin = Math.min(...dOut), rim = ins.filter((q, k) => dOut[k] < dMin + 0.3);
    if (rim.length >= 2 && dMin < 0.8) {
      const O = rim.reduce((a, q) => a.add(q), new THREE.Vector3()).multiplyScalar(1 / rim.length);
      // normale : vers la cavité (la distance à l'endocarde décroît)
      const e = 0.15, gr = (dx, dy, dz) => wallCh(new THREE.Vector3(O.x + dx, O.y + dy, O.z + dz), 1, 1);
      const nrm = new THREE.Vector3(gr(-e, 0, 0) - gr(e, 0, 0), gr(0, -e, 0) - gr(0, e, 0), gr(0, 0, -e) - gr(0, 0, e)).normalize();
      const os = new THREE.Group();
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.4, 40), tissue(0x3a1215, { deformK: K_EPI, roughness: 0.6, sss: 0.1, rim: 0, bump: 0 }));
      hole.scale.set(1, 0.95, 1);
      const valve = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 10, 40, Math.PI), tissue(0xd6a19c, { deformK: K_EPI, roughness: 0.4, clearcoat: 0.5, bump: 0.1 }));
      valve.rotation.z = Math.PI; // demi-anneau : la valvule borde la moitié inférieure de l'orifice
      os.add(hole, valve);
      // posé sur l'endocarde : on avance vers la cavité jusqu'à la surface (distance à l'endocarde nulle), + 0,8 mm
      let t = 0; while (t < 1.5 && wallCh(new THREE.Vector3().copy(O).addScaledVector(nrm, t), 1, 1) * 2.55 > 0.005) t += 0.02;
      os.position.copy(O).addScaledVector(nrm, t + 0.08);
      os.lookAt(O.clone().add(nrm));
      hole.userData.id = valve.userData.id = 'sinus-coronaire'; hole.userData.ostium = valve.userData.ostium = true;
      for (const m of [hole, valve]) Object.assign(m.material, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      reg('sinus-coronaire').meshes.push(hole, valve);
      // la partie masquée du sinus ne projette pas d'ombre dans l'oreillette
      for (const m of registry['sinus-coronaire'].meshes) if (!m.userData.ostium) m.castShadow = false;
      root.add(os);
      cutOnly.push(hole, valve);
    }
  }
  // Ostia coronaires (vue chirurgicale de la valve aortique) : chaque artère coronaire de BodyParts3D s'arrête dans
  // la paroi de la racine aortique, au-dessus de sa cuspide (tronc commun : sinus coronaire gauche ; coronaire droite :
  // sinus coronaire droit). Elle est prolongée, à son calibre, de son extrémité au point le plus proche de l'intima, et
  // l'ostium est posé là : orifice sombre bordé d'un liseré clair, tourné vers la lumière. L'ostium est ainsi dans la
  // continuité exacte de l'artère. Déformés comme la paroi (même fonction du battement).
  const ostia = {}, ostFrames = [];
  if (header.valves['valve-aortique'] && geos['lumiere-artere']) {
    const d = header.valves['valve-aortique'], C = v3(d.center), A = v3(d.axis).normalize();
    const lg = geos['lumiere-artere'].geometry, lp = lg.attributes.position, li = lg.index.array, tris = [];
    for (let t = 0; t < li.length; t += 3) { // triangles de la lumière autour de la racine
      const a = new THREE.Vector3().fromBufferAttribute(lp, li[t]), b = new THREE.Vector3().fromBufferAttribute(lp, li[t + 1]), c = new THREE.Vector3().fromBufferAttribute(lp, li[t + 2]);
      const q = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(C), al = q.dot(A);
      if (al > -0.5 && al < 3.5 && q.addScaledVector(A, -al).length() < 2.6) tris.push(new THREE.Triangle(a, b, c));
    }
    const cp = new THREE.Vector3();
    const closest = (p) => { let best = { d: 1e9 }; for (const T of tris) { T.closestPointToPoint(p, cp); const dd = cp.distanceTo(p); if (dd < best.d) best = { d: dd, p: cp.clone(), n: T.getNormal(new THREE.Vector3()), T }; } return best; };
    for (const [id, side] of [['tronc-commun', 'gauche'], ['coronaire-droite', 'droite']]) {
      if (!registry[id] || !tris.length) continue;
      const pts = [];
      for (const m of registry[id].meshes) { const pa = m.geometry.attributes.position; for (let k = 0; k < pa.count; k++) pts.push(new THREE.Vector3().fromBufferAttribute(pa, k)); }
      // extrémité proximale : sommets les plus proches de l'intima (près de la racine)
      const near = pts.filter((p) => p.distanceTo(C) < 3.5 && p.clone().sub(C).dot(A) > -0.5);
      if (!near.length) continue;
      let P0 = near[0], bd = 1e9;
      for (let i = 0; i < near.length; i += near.length > 3000 ? 3 : 1) { const r = closest(near[i]).d; if (r < bd) { bd = r; P0 = near[i]; } }
      const ring = pts.filter((p) => p.distanceTo(P0) < 0.4);
      const Pc = ring.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / ring.length);
      const rEnd = Math.min(0.24, Math.max(0.15, ring.reduce((s, p) => s + p.distanceTo(Pc), 0) / ring.length));
      const hit = closest(Pc), O = hit.p;
      const nIn = O.clone().sub(Pc).normalize(); // de l'artère vers le sang (la normale du maillage grossier est moins sûre)
      if (hit.n.dot(nIn) < 0) hit.n.negate();
      const nSurf = hit.n.clone().lerp(nIn, 0.5).normalize();
      // prolongement de l'artère vers l'intima, à son calibre, jusqu'au fond de l'ostium (l'entonnoir prend le relais :
      // c'est la lumière de l'artère vue depuis l'aorte)
      const depth = Math.max(0.12, Math.min(0.35, hit.d - 0.02)), End = O.clone().addScaledVector(nSurf, -depth);
      const stub = new THREE.Mesh(tubeGeometry([Pc.clone().addScaledVector(nIn, -0.15), Pc.clone().lerp(End, 0.5), End], rEnd, 12, 16), matFor(id, 'coroA'));
      stub.castShadow = true; stub.receiveShadow = true;
      register(id, stub);
      // ostium : l'intima est percée (inOstium) ; par le trou, la lumière de l'artère s'enfonce dans la paroi en
      // entonnoir sombre (paroi interne de l'artère, fond plus sombre) ; liseré clair de l'intima autour de l'orifice.
      // L'entonnoir part sous l'intima, plus large que le trou : vu en biais, le regard ne passe jamais à côté (il
      // tombait sinon, sur un bord, sur la surface externe du cœur, tache grise qui bougeait avec le battement)
      const os = new THREE.Group();
      // porté par le triangle d'intima qui le contient (ostFrames, syncOstia) : l'intima, maillage grossier, est déformée
      // sommet par sommet (linéaire dans chaque triangle) ; déformé point par point, l'entonnoir s'en décalait d'≈ 1 mm
      // pendant le battement et le trou laissait voir, sur un bord, la surface externe du cœur
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(rEnd * 1.3, rEnd * 0.85, depth, 40, 1, true), tissue(0x8e3038, { deformOn: false, roughness: 0.45, clearcoat: 0.5, sss: 0.3, rim: 0, bump: 0.05 }));
      funnel.position.set(0, -depth / 2 - 0.006, 0); // axe Y du cylindre vers le sang, bord haut juste sous l'intima
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(rEnd * 0.88, 32), tissue(0x3a1216, { deformOn: false, roughness: 0.7, sss: 0, rim: 0, bump: 0 }));
      bottom.position.set(0, -depth + 0.01, 0); bottom.rotation.x = -Math.PI / 2; // couvre le bout du prolongement
      const lip = new THREE.Mesh(new THREE.TorusGeometry(rEnd * 0.94, 0.018, 8, 48), tissue(0xe2aca6, { deformOn: false, roughness: 0.38, clearcoat: 0.6, bump: 0.05, sss: 0.4, rim: 0.1 }));
      lip.rotation.x = Math.PI / 2;
      os.add(funnel, bottom, lip);
      os.position.copy(O);
      os.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nSurf);
      os.updateMatrix(); os.matrixAutoUpdate = false;
      { const { a, b, c } = hit.T, e1 = b.clone().sub(a), e2 = c.clone().sub(a), n = e1.clone().cross(e2).normalize();
        const rest = new THREE.Matrix4().makeBasis(e1, e2, n).setPosition(a);
        ostFrames.push({ os, a, b, c, rest: rest.invert(), base: os.matrix.clone() }); }
      for (const m of [funnel, bottom, lip]) { m.userData.id = id; m.userData.ostium = true; reg(id).meshes.push(m); cutOnly.push(m); }
      root.add(os);
      const k = side === 'gauche' ? 0 : 1;
      rootU.uOst.value[k].set(O.x, O.y, O.z, rEnd * 0.94); rootU.uOstN.value[k].copy(nSurf);
      ostia[side] = { point: O.clone(), normal: nSurf.clone(), radius: rEnd, height: O.clone().sub(C).dot(A) };
    }
  }
  /* ── Infarctus de l'IVA (vue Coronaires) ──
     Repère du territoire : l'IVA court sur l'insertion antérieure du VD, entre les segments antérieur et antéroseptal ;
     sa direction moyenne autour de l'axe du VG (tiers moyen) fixe l'angle +30° du modèle à 17 segments. Occlusion :
     juste après la naissance de la 1re diagonale (début de l'IVA 2, IVA moyenne) ; l'aval (IVA moyenne et distale,
     branches nées après) est trouvé par connexité du maillage, la 1re diagonale reste perméable. */
  const infarct = { s0: null, point: null, center: null };
  if (registry.iva) {
    const U = deformU, B = U.uDB.value, A = U.uDA.value, L = U.uDL.value;
    const sOf = (p) => p.clone().sub(B).dot(A) / L, rOf = (p) => { const q = p.clone().sub(B); return q.addScaledVector(A, -q.dot(A)); };
    const mesh = registry.iva.meshes.find((m) => m.geometry.index);
    const g = mesh.geometry, pa = g.attributes.position, nV = pa.count, P = [];
    for (let i = 0; i < nV; i++) P.push(new THREE.Vector3().fromBufferAttribute(pa, i));
    const S = P.map(sOf);
    // direction du sillon interventriculaire antérieur : sommets du tiers moyen proches de leur moyenne angulaire
    const gDir = new THREE.Vector3();
    P.forEach((p, i) => { if (S[i] > 0.25 && S[i] < 0.6) gDir.add(rOf(p).normalize()); });
    gDir.normalize();
    // repère ancré sur l'IVA : elle est à +30° du centre de la paroi antérieure, du côté de la cloison (vers le VD)
    const eP = new THREE.Vector3().crossVectors(A, gDir).normalize(); if (eP.dot(U.uDRV.value) < 0) eP.negate();
    const c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6);
    const eAnt = gDir.clone().multiplyScalar(c30).addScaledVector(eP, -s30).normalize();
    const eSep = gDir.clone().multiplyScalar(s30).addScaledVector(eP, c30).normalize();
    U.uInfAnt.value.copy(eAnt); U.uInfSep.value.copy(eSep);
    // tronc de l'IVA (près du sillon) et branches latérales (diagonales) : la 1re diagonale naît au plus haut
    const angOf = (p) => Math.atan2(rOf(p).dot(eSep), rOf(p).dot(eAnt)) * 180 / Math.PI; // IVA ≈ +30°
    let sD1 = 1;
    P.forEach((p, i) => { const a = angOf(p); if (S[i] > 0.05 && S[i] < 0.8 && a < -5) sD1 = Math.min(sD1, S[i]); });
    const s0 = Math.min(0.55, sD1 + 0.05);
    // point d'occlusion : sommets du tronc à cette hauteur
    const near = P.filter((p, i) => Math.abs(S[i] - s0) < 0.025 && Math.abs(angOf(p) - 30) < 25);
    const O = near.length ? near.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / near.length) : null;
    // aval : composantes connexes une fois retirés les sommets autour de l'occlusion ; une composante est en aval si
    // son sommet le plus haut est sous l'occlusion
    if (O) {
      const parent = new Int32Array(nV).map((_, i) => i), find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      const cut = P.map((p) => p.distanceTo(O) < 0.32), idx = g.index.array;
      for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) {
        const a = idx[t + e], b = idx[t + (e + 1) % 3]; if (cut[a] || cut[b]) continue;
        const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb;
      }
      const top = new Map(); P.forEach((p, i) => { if (cut[i]) return; const r = find(i); top.set(r, Math.min(top.get(r) ?? 9, S[i])); });
      const occl = new Float32Array(nV);
      const ramp = (x) => { const t = Math.min(1, Math.max(0, (x + 0.1) / 0.22)); return t * t * (3 - 2 * t); }; // fondu sur 2 mm
      P.forEach((p, i) => { occl[i] = cut[i] ? ramp(p.clone().sub(O).dot(A)) : (top.get(find(i)) > s0 - 0.01 ? 1 : 0); });
      g.setAttribute('occl', new THREE.BufferAttribute(occl, 1));
      Object.assign(infarct, { s0, sD1, point: O.clone() });
    }
    // centre du territoire, sur l'épicarde : direction moyenne (antérieur-antéroseptal) au tiers apical
    infarct.center = B.clone().addScaledVector(A, L * 0.72).addScaledVector(eAnt.clone().lerp(eSep, 0.4).normalize(), 2.6);
  }
  const setInfarct = (on, { tint = on, occl = on } = {}) => { deformU.uInf.value = on ? 1 : 0; deformU.uInfTint.value = tint ? 1 : 0; deformU.uOccl.value = occl ? 1 : 0; deformDirty = true; };

  /* ── Fosse ovale et foramen ovale perméable (rubrique FOP) ──
     Fosse : dépression postéro-inférieure du septum interauriculaire, là où il est le plus mince (septum primum,
     1 à 2 mm) ; ≈ 19 × 16 mm (Kydd ; Kishve 2021) ; limbe (septum secundum) en fer à cheval ouvert vers le bas
     (Naqvi, McCarthy, Ho 2018). FOP : tunnel entre le bord libre du septum primum et le limbe qui le chevauche, au
     quadrant antéro-supérieur de la fosse, ≈ 12 mm de long et 3 mm de haut (Goel 2009). */
  const fossa = (() => {
    const g = geos.cavites.geometry, cp = g.attributes.position, cs = geos.cavites.sid, RA = [], LA = [];
    for (let i = 0; i < cs.length; i++) { const id = ids[cs[i]]; if (id === 'oreillette-droite') RA.push(new THREE.Vector3().fromBufferAttribute(cp, i)); else if (id === 'oreillette-gauche') LA.push(new THREE.Vector3().fromBufferAttribute(cp, i)); }
    if (!RA.length || !LA.length) return null;
    const LAs = LA.filter((_, i) => i % 3 === 0);
    const near = RA.filter((_, i) => i % 2 === 0).map((p) => { let b = 1e9, bq = null; for (const q of LAs) { const d = p.distanceToSquared(q); if (d < b) { b = d; bq = q; } } return { p, d: Math.sqrt(b), q: bq }; });
    const dmin = Math.min(...near.map((x) => x.d)), thin = near.filter((x) => x.d < dmin + 0.25);
    const mean = (a) => a.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / a.length);
    const F = mean(thin.map((x) => x.p)), Q = mean(thin.map((x) => x.q)), n = Q.clone().sub(F).normalize(); // de l'OD vers l'OG
    const up = new THREE.Vector3(0, 1, 0).projectOnPlane(n).normalize(), ant = new THREE.Vector3().crossVectors(up, n).normalize();
    if (ant.z < 0) ant.negate();
    const a = 0.95, b = 0.8, Mid = F.clone().lerp(Q, 0.5), floorP = Q.clone().addScaledVector(n, -0.08), depth = floorP.clone().sub(F).dot(n);
    // orifice dans l'endocarde des deux oreillettes (le plancher et la paroi de la dépression sont dessinés à part)
    deformU.uFosC.value.copy(Mid); deformU.uFosN.value.copy(n); deformU.uFosU.value.copy(up); deformU.uFosAB.value.set(a, b, F.distanceTo(Q) / 2 + 0.06);
    const basis = new THREE.Matrix4().makeBasis(ant, up, n); // x : antérieur, y : supérieur, z : vers l'OG
    const place = (m, origin) => { m.matrixAutoUpdate = false; m.matrix.copy(basis).setPosition(origin); return m; };
    const grp = new THREE.Group(); root.add(grp);
    const add = (m) => { m.userData.id = 'septum-interauriculaire'; m.receiveShadow = true; grp.add(m); cutOnly.push(m); reg('septum-interauriculaire').meshes.push(m); return m; };
    // plancher (septum primum) : mince, pâle et un peu translucide
    const floorG = new THREE.CircleGeometry(1, 64).scale(b, a, 1);
    const floorM = add(place(new THREE.Mesh(floorG, tissue(0xecc6bf, { deformK: K_ENDO, roughness: 0.4, clearcoat: 0.5, sss: 0.8, rim: 0.15, bump: 0.15, emissive: 0x5a2a28, emissiveIntensity: 0.35 })), floorP));
    floorM.receiveShadow = false;
    // paroi de la dépression, de l'endocarde de l'OD au plancher
    const wallG = new THREE.CylinderGeometry(1, 1, depth, 64, 1, true).rotateX(Math.PI / 2).translate(0, 0, depth / 2).scale(b, a, 1);
    add(place(new THREE.Mesh(wallG, tissue(COL.endoOreillette, { deformK: K_ENDO, roughness: 0.38, clearcoat: 0.55, sss: 0.5, rim: 0.08, bump: 0.2 })), F)).receiveShadow = false;
    // limbe en fer à cheval, ouvert vers le bas (arc de 270°), plus épais en haut (septum secundum)
    const limbG = new THREE.TorusGeometry(1, 0.15, 14, 96, 1.5 * Math.PI).rotateZ(-Math.PI / 2 + Math.PI / 4).scale(b * 1.08, a * 1.08, 1.2);
    add(place(new THREE.Mesh(limbG, tissue(0xc97880, { deformK: K_ENDO, roughness: 0.36, clearcoat: 0.55, sss: 0.5, rim: 0.1, bump: 0.3 })), F.clone().addScaledVector(n, -0.04)));
    // creux de la fosse dans la tranche du septum (coupes) : solide « creux » de l'endocarde de l'OD au plancher
    const holeG = new THREE.CylinderGeometry(1, 1, depth + 0.1, 48, 1, false).rotateX(Math.PI / 2).translate(0, 0, depth / 2 - 0.05).scale(b, a, 1);
    const hole = place(new THREE.Mesh(holeG, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })), F);
    hole.renderOrder = -2; root.add(hole);
    solids.push({ mesh: hole, hole: true, cap: 'myo', k: K_ENDO });
    // tunnel du FOP : du bord antéro-supérieur de la fosse côté OD, sous le limbe, jusqu'à l'OG, 1 cm plus haut
    // au bord supérieur de la fosse, un peu en avant (quadrant antéro-supérieur) : la coupe bicave passe par la fosse et
    // par le tunnel à la fois
    const dAS = up.clone().multiplyScalar(0.92).addScaledVector(ant, 0.38).normalize();
    const rAS = 1 / Math.sqrt((dAS.dot(ant) / b) ** 2 + (dAS.dot(up) / a) ** 2); // bord de l'ellipse dans cette direction
    const T0 = F.clone().addScaledVector(dAS, rAS * 0.85).addScaledVector(n, -0.12);
    const T1 = Mid.clone().addScaledVector(dAS, rAS + 0.45);
    const T2 = Q.clone().addScaledVector(dAS, rAS + 0.95).addScaledVector(n, 0.12);
    const tunG = tubeGeometry([T0, T1, T2], 0.14, 32, 16);
    const tunnel = add(new THREE.Mesh(tunG, tissue(COL.endoOreillette, { deformK: K_ENDO, side: THREE.BackSide, roughness: 0.4, clearcoat: 0.5, sss: 0.5, rim: 0.05, bump: 0.15 })));
    const tunHole = new THREE.Mesh(tunG, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    tunHole.renderOrder = -2; tunHole.visible = false; root.add(tunHole);
    solids.push({ mesh: tunHole, hole: true, cap: 'myo', k: K_ENDO });
    tunnel.userData.pfo = true; tunnel.userData.hidden = true; // affiché avec le FOP seulement (setPFO)
    // atriums : abouchement des veines caves, centres, valves auriculo-ventriculaires (trajet des bulles)
    const yTop = Math.max(...RA.map((p) => p.y)), yBot = Math.min(...RA.map((p) => p.y));
    const svc = mean(RA.filter((p) => p.y > yTop - 0.6)).setY(yTop - 1.6), ivc = mean(RA.filter((p) => p.y < yBot + 0.6)).setY(yBot + 0.9);
    return {
      F, Q, center: Mid, floor: floorP, n, up, ant, a, b, tunnel: [T0, T1, T2], tunnelMesh: tunnel, tunnelHole: tunHole,
      ra: mean(RA), la: mean(LA), svc, ivc,
    };
  })();
  const setPFO = (on) => { if (!fossa) return; fossa.tunnelHole.visible = on; fossa.tunnelMesh.userData.hidden = !on; fossa.tunnelMesh.visible = on; };

  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // même territoire que infarctW (GLSL) ; r : rayon depuis l'axe du VG, s : position le long de l'axe, lr = |r|
  const infarctW = (r, s, lr) => {
    const U = deformU; if (U.uInf.value <= 0) return 0;
    const th = THREE.MathUtils.radToDeg(Math.atan2(r.dot(U.uInfSep.value), r.dot(U.uInfAnt.value)));
    const mid = sm(0.3, 0.38, s) * (1 - sm(0.62, 0.7, s)) * sm(-40, -25, th) * (1 - sm(85, 100, th));
    const api = sm(0.62, 0.7, s) * sm(-55, -40, th) * (1 - sm(130, 145, th));
    return U.uInf.value * Math.max(mid, api, sm(0.84, 0.94, s)) * (1 - sm(2.9, 3.7, lr));
  };
  const tq = new THREE.Vector3(), tr = new THREE.Vector3(), tc = new THREE.Vector3(), tp = new THREE.Vector3();
  // k : raideur de repli quand la carte de la paroi est absente
  const deformPoint = (p, k = 0.1) => {
    const U = deformU, B = U.uDB.value, A = U.uDA.value, L = U.uDL.value, R = U.uDR.value, Tw = U.uDTw.value, At = U.uDAt.value;
    const dil = U.uDDil.value, Lg = U.uDLg.value, Res = U.uDRes.value;
    if (!R.x && !R.y && !Lg && !Tw.x && !Tw.y && !At.x && !At.y && !Res && !dil) return p;
    tp.copy(p);
    if (dil > 0) {
      tq.subVectors(tp, U.uDTc.value); const a = tq.dot(U.uDTa.value); tq.addScaledVector(U.uDTa.value, -a);
      const lt = Math.max(tq.length(), 1e-3), free = 1 - 0.85 * Math.max(0, tq.dot(U.uDTs.value) / lt);
      tp.addScaledVector(tq, (dil * free * Math.min(lt, 1.8) * Math.exp(-a * a / 2.25) * sm(0.2, 1, lt) * (1 - sm(3, 5, lt))) / lt);
    }
    tq.subVectors(tp, B); const al = tq.dot(A), s = al / L, sc = Math.min(1, Math.max(0, s));
    tr.copy(tq).addScaledVector(A, -al); const lr = Math.max(tr.length(), 1e-3);
    const AV = U.uDAV.value, dAV = tp.x * AV.x + tp.y * AV.y + tp.z * AV.z - AV.w;
    const wRoot = sm(1, 1.8, tp.distanceTo(U.uDAo.value)) * sm(1, 1.8, tp.distanceTo(U.uDPu.value));
    const wV = sm(-0.3, 0.3, dAV) * (1 - sm(1.05, 1.3, s)) * wRoot;
    tc.subVectors(tp, U.uDAo.value); const aa = tc.dot(U.uDAoA.value), ra = tc.addScaledVector(U.uDAoA.value, -aa).length();
    const wAoZ = (1 - sm(2.2, 3.2, ra)) * sm(-1.2, -0.4, aa) * (1 - sm(3.2, 4.2, aa)); // racine aortique et départ des coronaires
    const kk = wallB ? K_ENDO + (K_EPI - K_ENDO) * wallB(tp) : k;
    const wI = 1 - infarctW(tr, s, lr); // akinésie (vue Coronaires, infarctus)
    const wRV = sm(1.5, 4, tr.dot(U.uDRV.value)) * (1 - wAoZ);
    const desc = Lg * (1.3 + 1.0 * wRV) * (dAV >= 0 ? 1 - Math.min(1, Math.max(0, dAV / U.uDApx.value)) : Math.min(1, Math.max(0, 1 + dAV / (3 + 1.5 * wRV))));
    const cR = R.x + (R.y - R.x) * sc, shape = wV * wI * (0.65 + 0.35 * Math.sin(Math.PI * sc));
    const rad = 1 - kk * cR * shape * Math.min(1, 3.2 / lr);
    const ang = wV * wI * THREE.MathUtils.degToRad(Tw.x + (Tw.y - Tw.x) * sc);
    tc.crossVectors(A, tr);
    let ox = B.x + A.x * (al + desc) + (tr.x * Math.cos(ang) + tc.x * Math.sin(ang)) * rad;
    let oy = B.y + A.y * (al + desc) + (tr.y * Math.cos(ang) + tc.y * Math.sin(ang)) * rad;
    let oz = B.z + A.z * (al + desc) + (tr.z * Math.cos(ang) + tc.z * Math.sin(ang)) * rad;
    const bel = 0.5 * sm(3, 4.5, tr.dot(U.uDRV.value)) * cR * shape, RVd = U.uDRV.value;
    ox -= RVd.x * bel; oy -= RVd.y * bel; oz -= RVd.z * bel;
    tq.subVectors(tp, U.uDMc.value); const am = tq.dot(U.uDMa.value); tq.addScaledVector(U.uDMa.value, -am);
    const sph = 0.08 * R.x * Math.exp(-am * am / 0.64) * (1 - sm(2, 3.2, tq.length()));
    ox -= tq.x * sph; oy -= tq.y * sph; oz -= tq.z * sph;
    const RA = U.uDRA.value, LA = U.uDLA.value;
    const dRA = tp.distanceTo(RA), dLA = tp.distanceTo(LA), wR = sm(-0.8, 0.8, dLA - dRA);
    const wAt = (1 - sm(-0.6, 0.2, dAV)) * (1 - sm(2.6, 4.2, Math.min(dRA, dLA))) * (1 - wAoZ);
    const f = (0.14 * (At.y + (At.x - At.y) * wR) - 0.03 * Res) * wAt;
    p.set(ox - (wR * (ox - RA.x) + (1 - wR) * (ox - LA.x)) * f, oy - (wR * (oy - RA.y) + (1 - wR) * (oy - LA.y)) * f, oz - (wR * (oz - RA.z) + (1 - wR) * (oz - LA.z)) * f);
    return p;
  };

  // Cycle cardiaque (phase 0 → 1 = un battement, 0 = début de l'onde P). Chronologie d'un adulte à 64/min (940 ms),
  // d'après l'échographie (Doppler tissulaire, n = 974 ; recommandations ASE/EACVI 2015) et l'IRM de marquage :
  //   20–178 ms   systole auriculaire (délai électromécanique ≈ 20 ms après l'onde P, oreillette droite 15 ms avant
  //               la gauche) : le ventricule reçoit ses derniers 20 % de remplissage ;
  //   175 ms      fermeture mitrale, 185 ms fermeture tricuspide ;
  //   175–210 ms  contraction isovolumique (≈ 35 ms) : volume constant, le VG s'arrondit (grand axe un peu plus court,
  //               petit axe un peu plus large), brève rotation inverse ; ouverture pulmonaire à 205 ms, aortique à 210 ;
  //   210–495 ms  éjection (≈ 285 ms) : débit maximal au premier tiers (≈ 70 % du volume éjecté dans la première moitié) ; la paroi
  //               s'épaissit, la base descend vers la pointe immobile (13 mm à gauche, ≈ 23 mm sur le bord libre de la
  //               tricuspide), les oreillettes se remplissent et s'allongent ; torsion : pointe +8,7° (pic 290 ms
  //               après l'onde R), base −4,8° (pic 360 ms) ;
  //   495 ms      fermeture aortique, 520 ms fermeture pulmonaire ;
  //   495–590 ms  relaxation isovolumique (≈ 95 ms) : volume constant, la détorsion commence (pointe d'abord, ≈ 45 %
  //               avant l'ouverture mitrale, le reste pendant l'onde E) ; ouverture tricuspide à 555 ms, mitrale à 590 ;
  //   590–790 ms  remplissage rapide (onde E, ≈ 75 % du remplissage) : la base remonte, la paroi s'amincit ;
  //   790–940 ms  diastasis : remplissage lent (≈ 5 %), valves auriculo-ventriculaires à demi refermées.
  // La pointe précède la base d'environ 30 ms, à la contraction comme au relâchement.
  const P_MS = 940;
  const wrapMs = (t) => ((t % P_MS) + P_MS) % P_MS;
  // éjection (et remplissage rapide) : vitesse nulle au départ, maximale au tiers, nulle à la fin ; 69 % dans la 1re moitié
  const rise = (x) => 1 - (1 - x) ** 3 * (1 + 3 * x);
  // réduction du volume ventriculaire (0 fin de diastole → 1 fin d'éjection)
  const vent = (t) => {
    t = wrapMs(t);
    if (t < 45) return 0.2;
    if (t < 175) return 0.2 * (1 - sm(45, 172, t));
    if (t < 210) return 0;
    if (t < 495) return rise((t - 210) / 285);
    if (t < 590) return 1;
    if (t < 790) return 1 - 0.75 * rise((t - 590) / 200);
    return 0.25 - 0.05 * (t - 790) / 150;
  };
  const bump = (t, a, b) => (t > a && t < b ? Math.sin(Math.PI * (t - a) / (b - a)) ** 2 : 0);
  // rotation (degrés) : montée pendant l'éjection jusqu'au pic, détorsion rapide ensuite ; rotation inverse brève pendant
  // la contraction isovolumique
  const rot = (t, peak, tPeak, tEnd, iso) => {
    t = wrapMs(t);
    const up = sm(205, tPeak, t), down = 1 - sm(tPeak, tEnd, t);
    return peak * (t < tPeak ? up : down) + iso * bump(t, 170, 225);
  };
  // ouverture d'une valve (0 fermée → 1 ouverte) entre deux instants (ms), fronts de ≈ 15 ms
  const win = (t, open, close) => {
    t = wrapMs(t);
    if (open < close) return sm(open - 15, open, t) * (1 - sm(close - 15, close, t));
    return Math.max(sm(open - 15, open, t), 1 - sm(close - 15, close, t));
  };
  // valves auriculo-ventriculaires : grandes ouvertes pendant les ondes E et A, à demi refermées en diastasis
  const avOpen = (t, open, close, dA) => {
    const tt = wrapMs(t);
    const e = sm(open, open + 30, tt) * (1 - sm(700, 790, tt)), a = bump(tt, 20 + dA, 170 + dA);
    return win(tt, open, close) * (0.72 + 0.28 * Math.max(e, a));
  };
  const cycle = (ph) => {
    const t = ph * P_MS, tv = t + 18; // valves : consigne en avance de ≈ 18 ms sur leur réponse (ressort)
    const iso = bump(wrapMs(t), 175, 210);
    const ven = vent(t);
    return {
      ven,
      rad: [vent(t - 15) - 0.03 * iso, vent(t + 15) - 0.03 * iso], // base, pointe (la pointe en avance)
      lg: ven + 0.12 * iso,
      tw: [rot(t, -4.8, 510, 760, 1.0), rot(t, 8.7, 440, 700, -1.5)],
      atr: [bump(wrapMs(t), 20, 165), bump(wrapMs(t), 35, 178)], // délai électromécanique ≈ 20 ms après l'onde P
      res: (() => { const x = wrapMs(t); return x < 175 ? 0.3 * (1 - sm(0, 170, x)) : x < 590 ? sm(175, 590, x) : x < 790 ? 1 - 0.7 * sm(590, 790, x) : 0.3; })(),
      mv: avOpen(tv, 590, 175, 15), tv: avOpen(tv, 555, 185, 0), ao: win(tv, 210, 495), pv: win(tv, 205, 520),
      get av() { return this.mv; }, get sl() { return this.ao; },
    };
  };
  // Pose du cœur. Forme complète : celle de cycle() ; forme simple (vues figées) :
  // { atr, ven, av, sl } — contraction auriculaire, ventriculaire, ouverture des valves AV et sigmoïdes.
  // Les valves reçoivent une consigne d'ouverture ; leur mouvement (ressort amorti, retard du bord libre, vibration)
  // est avancé à chaque image par stepValves.
  let deformDirty = true;
  const VALVE_KEY = { 'valve-mitrale': ['mv', 'av'], 'valve-tricuspide': ['tv', 'av'], 'valve-aortique': ['ao', 'sl'], 'valve-pulmonaire': ['pv', 'sl'] };
  let lastPose = null;
  const setPose = (c) => {
    const U = deformU, v = c.ven ?? 0, at = Array.isArray(c.atr) ? c.atr : [c.atr ?? 0, c.atr ?? 0];
    const rad = c.rad ?? [v, v], tw = c.tw ?? [-4.8 * v, 8.7 * v], lg = c.lg ?? v, res = c.res ?? 0;
    if (U.uDR.value.x !== rad[0] || U.uDR.value.y !== rad[1] || U.uDLg.value !== lg || U.uDTw.value.x !== tw[0] || U.uDTw.value.y !== tw[1]
      || U.uDAt.value.x !== at[0] || U.uDAt.value.y !== at[1] || U.uDRes.value !== res) deformDirty = true;
    U.uDR.value.set(rad[0], rad[1]); U.uDLg.value = lg; U.uDTw.value.set(tw[0], tw[1]); U.uDAt.value.set(at[0], at[1]); U.uDRes.value = res;
    lastPose = c;
    syncRootHoles();
    for (const [id, v2] of Object.entries(shown)) { const [k1, k2] = VALVE_KEY[id]; v2.setTarget(c[k1] ?? c[k2] ?? 0); }
    for (const [v2, id] of extraValves) { const [k1, k2] = VALVE_KEY[id]; v2.setTarget(c[k1] ?? c[k2] ?? 0); }
    return c;
  };
  // dt (s), time (s), live : cœur qui bat → vibration des bords libres. Renvoie vrai si
  // une valve bouge encore.
  const stepValves = (dt, time, live) => {
    let moving = false;
    for (const v of new Set([...Object.values(shown), ...extraValves.keys()])) moving = v.step(dt, time, deformPoint, deformDirty, live) || moving;
    deformDirty = false;
    return moving;
  };
  // centres des racines déformés (cylindres des tranches de sang, inRootW) : déplacement de la racine à la hauteur de la
  // coupe des vues chirurgicales (aortique : 2 hauteurs de cuspide ; pulmonaire : 0,95), là où la tranche de sang est
  // posée — l'anneau descend davantage (≈ 13 mm) que la racine au-dessus de la jonction (≈ 5 mm)
  const rootRef = ['valve-aortique', 'valve-pulmonaire'].map((id, i) => header.valves[id].height * (i ? 0.95 : 2.0));
  const _rr = new THREE.Vector3(), _rd = new THREE.Vector3();
  // ostia : application affine qui envoie le triangle d'intima au repos sur le triangle déformé, appliquée à l'ostium
  const _oa = new THREE.Vector3(), _ob = new THREE.Vector3(), _oc = new THREE.Vector3(), _oM = new THREE.Matrix4();
  function syncOstia() {
    for (const f of ostFrames) {
      deformPoint(_oa.copy(f.a)); deformPoint(_ob.copy(f.b)); deformPoint(_oc.copy(f.c));
      _ob.sub(_oa); _oc.sub(_oa);
      const n = new THREE.Vector3().crossVectors(_ob, _oc).normalize();
      _oM.makeBasis(_ob, _oc, n).setPosition(_oa).multiply(f.rest);
      f.os.matrix.multiplyMatrices(_oM, f.base); f.os.matrixWorldNeedsUpdate = true;
    }
  }
  function syncRootHoles() {
    syncOstia();
    const H = rootU.uHoleC.value, Ax = rootU.uHoleA.value, W = rootU.uHoleCw.value;
    for (let i = 0; i < 2; i++) {
      _rr.set(H[i].x + Ax[i].x * rootRef[i], H[i].y + Ax[i].y * rootRef[i], H[i].z + Ax[i].z * rootRef[i]);
      _rd.copy(_rr); deformPoint(_rd);
      W[i].set(H[i].x, H[i].y, H[i].z).add(_rd.sub(_rr));
    }
  }
  const REPOS = { atr: 0, ven: 0, av: 0.9, sl: 0 };
  const setBeat = (phase) => setPose(phase === null ? REPOS : cycle(phase));
  setBeat(null);
  // Variante affichée pour un orifice (null : valve normale) ; elle reprend la position de la valve qu'elle remplace.
  const useValve = (id, v) => {
    const next = v ?? valves[id];
    if (shown[id] === next) return;
    shown[id] = next; deformDirty = true;
    const [k1, k2] = VALVE_KEY[id];
    next.snap(lastPose ? lastPose[k1] ?? lastPose[k2] ?? 0 : 0, deformPoint);
    syncValves();
  };
  const showValves = (on) => { valvesOn = on; syncValves(); };
  // Comparaison en écran partagé (js/app.js) : une seconde valve du même orifice suit le cycle avec celle affichée
  // (consigne et dynamique), et les deux sont affichées tour à tour, sans recalage, chacune redessinée sur la
  // déformation du cœur de sa moitié d'écran (anneau dilaté ou non).
  const setExtraValves = (list) => { extraValves.clear(); for (const [id, v] of list) { extraValves.set(v, id); const [k1, k2] = VALVE_KEY[id]; v.snap(lastPose ? lastPose[k1] ?? lastPose[k2] ?? 0 : 0, deformPoint); } };
  const showValve = (id, v) => { if (shown[id] !== v) { shown[id] = v; syncValves(); } };
  const redrawValve = (v, time, live = false) => v.step(0, time, deformPoint, true, live);
  // dilatation de l'anneau tricuspide (0 : cœur normal)
  const setDilation = (x) => { if (deformU.uDDil.value !== x) { deformU.uDDil.value = x; deformDirty = true; syncRootHoles(); } };

  /* ── Système de conduction (positions calculées dans le septum réel) ── */
  const C = header.conduction;
  const node = (id, p, r) => {
    const m = register(id, new THREE.Mesh(ellipsoid(r, r * 0.75, r * 0.55), matFor(id, 'conduction')));
    m.position.copy(v3(p));
    // nœud enfoui sous l'endocarde (nœud AV : sommet du triangle de Koch) : s'il affleure dans une cavité, il est
    // repoussé dans la paroi, le long de la pente de la distance à l'endocarde
    if (wallCh && id === 'noeud-av') for (let it = 0; it < 12 && wallCh(m.position, 1, 1) * 2.55 < r * 0.8; it++) {
      const e = 0.1, P0 = m.position, g = (dx, dy, dz) => wallCh(new THREE.Vector3(P0.x + dx, P0.y + dy, P0.z + dz), 1, 1);
      const dir = new THREE.Vector3(g(e, 0, 0) - g(-e, 0, 0), g(0, e, 0) - g(0, -e, 0), g(0, 0, e) - g(0, 0, -e));
      if (dir.lengthSq() < 1e-10) break;
      m.position.addScaledVector(dir.normalize(), 0.05);
    }
    cutOnly.push(m);
    solids.push({ mesh: m, hole: false, cap: 'conduction', k: 0.12 });
  };
  node('noeud-sinusal', C['noeud-sinusal'][0], 0.45);
  node('noeud-av', C['noeud-av'][0], 0.35);
  for (const [key, r] of [['his', (t) => 0.14 - 0.03 * t], ['brancheG', 0.09], ['brancheD', 0.09]]) {
    const m = register('faisceau-his', new THREE.Mesh(tubeGeometry(C[key].map(v3), r, 32, 10), matFor('faisceau-his', 'conduction')));
    cutOnly.push(m);
    solids.push({ mesh: m, hole: false, cap: 'conduction', k: 0.12 });
  }


  // Résolution du clic : structure portée par l'enveloppe (attribut du maillage simplifié) ou par la pièce touchée.
  const pickId = (mesh, worldPoint, face) => (mesh.userData.proxy ? ids[proxySid[face.a]] : mesh.userData.sid ? ids[mesh.userData.sid[face.a]] : mesh.userData.id);
  // Surbrillance : par indice de structure pour l'enveloppe et les cavités, par matériau pour les autres pièces.
  // focus : met le reste en retrait (sélection) ; sans focus, la structure est seulement éclairée
  const setHighlight = (id, { focus = true } = {}) => {
    selUniform.value = id ? ids.indexOf(id) : -1;
    tissueMats.forEach((m) => { m.userData.uniforms.uHi.value = 0; });
    let any = selUniform.value >= 0;
    (id && registry[id] ? registry[id].meshes : []).forEach((mesh) => { const u = mesh.material?.userData?.uniforms; if (u) { u.uHi.value = 1; any = true; } });
    focusUniform.value = any && focus ? 1 : 0; // pas de mise en retrait si rien n'est éclairé (septum, par exemple)
  };

  // Ombres : la carte d'ombre suit le battement (matériau de profondeur déformé, même raideur que le tissu)
  root.traverse((o) => {
    const u = o.isMesh && o.material?.userData?.uniforms;
    if (u && u.uDOn.value > 0.5) o.customDepthMaterial = deformedDepth(u.uDK.value);
  });

  cutOnly.forEach((m) => { m.visible = false; });

  return { root, registry, materials, solids, cutOnly, pickId, setHighlight, envelope, proxy, matrixLocal: M, source: header.source,
    cut4: { normal: v3(F.cut4), point: v3(F.base) }, valves, setBeat, setPose, stepValves, deformPoint, cycle, valveData: header.valves, addValve, useValve, showValves, setDilation, setExtraValves, showValve, redrawValve, ostia,
    infarct, setInfarct, fossa, setPFO,
    material: (key, preset) => matFor(key, preset), // matériaux « tissu » pour d'autres vues (valve aortique)
    // repères pour les coupes échographiques : pointe, base, centre et axe de chaque valve (axe : amont → aval)
    landmarks: { apex: v3(F.apex), base: v3(F.base), valves: Object.fromEntries(Object.entries(header.valves || {}).map(([id, d]) => [id, { center: v3(d.center), axis: v3(d.axis).normalize() }])) }, addDeform: (mat, k, cut) => addDeformTo(mat, deformU, k, cut),
    deformUniforms: deformU, cutUniforms: cutU, rootUniforms: rootU, wall }; // tranches de coupe : déformation du battement et carte 3D de la paroi
}
