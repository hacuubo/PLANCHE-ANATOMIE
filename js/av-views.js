// Vues des valves auriculo-ventriculaires, tirées du cœur lui-même ; la caméra plonge depuis la vue en cours jusqu'à la
// valve. C (chirurgicale) : cœur coupé juste au-dessus de l'anneau (oreillette retirée), valve vue depuis l'oreillette ;
// V (ventriculaire) : cœur coupé à mi-ventricule, valve vue depuis le ventricule — piliers, cordages en trois ordres
// et face ventriculaire des feuillets (perspective ventriculaire de l'ETO 3D ; même orientation que la vue C : aorte
// à 12 h pour la mitrale, feuillet septal à 6 h pour la tricuspide, Lang 2012). Les variantes pathologiques
// remplacent la valve du cœur à sa place (heart.useValve) et battent avec lui.
//
// Valve mitrale (vue du chirurgien, comme en ETO 3D « surgeon's view » : aorte à 12 h, auricule gauche à gauche) :
//   - normale : feuillet antérieur (A1-A3) et feuillet postérieur festonné (P1, P2, P3), fermeture en « sourire » ;
//   - rétrécissement mitral rhumatismal : commissures soudées, feuillets épaissis surtout au bord libre (fibrose,
//     nodules calcaires aux commissures), orifice diastolique ovale central en « bouche de poisson » (≈ 1 cm² ;
//     normal 4–6 cm², serré < 1,5 cm², ESC 2021), feuillet antérieur bombé vers le ventricule en diastole (« crosse
//     de hockey »), feuillet postérieur peu mobile ; cordages épaissis, soudés et raccourcis (score de Wilkins) ;
//   - insuffisance mitrale par prolapsus de P2 avec rupture de cordage : le segment P2 n'est plus retenu, il se
//     soulève au-dessus de l'anneau et son bord libre se retourne dans l'oreillette à chaque fermeture (feuillet
//     flottant) ; les cordages rompus flottent dans l'oreillette ; défaut de coaptation en regard de P2, par où le
//     sang reflue. C'est la forme la plus fréquente d'insuffisance mitrale dégénérative.
// Valve tricuspide (vue depuis l'oreillette droite, feuillet septal en bas — présentation habituelle en 3D) :
//   - normale : feuillets antérieur, postérieur et septal, fermeture en Y ;
//   - insuffisance par dilatation de l'anneau (fonctionnelle) : l'anneau, l'oreillette et le ventricule droits
//     s'élargissent sur la paroi libre (le versant septal, fixé, se dilate peu : heart.setDilation) ; les feuillets,
//     normaux, ne se rejoignent plus et sont attirés vers le ventricule : défaut de coaptation central.
import * as THREE from 'three';
import { avValve, mix, smooth, ENDO } from './valves.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
export const DILATATION = 0.32; // allongement relatif de l'anneau sur la paroi libre

export function buildAVView(heart, kind) {
  const mitral = kind === 'mitrale';
  const id = mitral ? 'valve-mitrale' : 'valve-tricuspide';
  const d = heart.valveData[id];
  const C = V(d.center), A = V(d.axis).normalize(); // A : de l'oreillette vers le ventricule
  const E1 = V(d.e1), E2 = V(d.e2);
  const dirOf = (th) => new THREE.Vector3().copy(E1).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th));
  // variantes construites à leur première demande (démarrage plus court) : variants[nom] = options de la valve
  const variants = {}, built = {};
  const make = (opts) => opts;
  const valveOf = (name) => {
    if (!variants[name]) return null;
    return (built[name] ??= heart.addValve(id, avValve(id, d, heart.material(id, 'valve'), heart.material(id, 'cordage'), variants[name])));
  };
  let up, dilation = {};
  if (mitral) {
    up = heart.landmarks.valves['valve-aortique'].center.clone().sub(C).projectOnPlane(A).normalize(); // aorte à 12 h
    variants.prolapsus = make({ prolapse: { leaflet: /Posterior/, u0: 0.37, u1: 0.63, lift: 1.0, ruptured: true } });
    // rétrécissement rhumatismal : feuillets fibreux, épais (bord libre surtout), opaques ; calcifications commissurales
    const comm = (u, v) => (Math.exp(-((u / 0.09) ** 2)) + Math.exp(-(((1 - u) / 0.09) ** 2))) * Math.exp(-(((v - 0.85) / 0.15) ** 2));
    variants.rhumatismal = make({
      rheum: { a: 0.9, b: 0.38, dome: 0.32 }, // ovale de 1,8 × 0,76 cm : ≈ 1,07 cm²
      cordScale: 1.9, cordFuse: 1,
      shade: (u, v) => {
        let c = mix(ENDO, [0.9, 0.84, 0.72], smooth(0.02, 0.18, v));
        c = mix(c, [0.94, 0.9, 0.8], smooth(0.55, 0.9, v));                 // bord libre fibreux, blanchâtre
        c = mix(c, [0.96, 0.95, 0.9], Math.min(1, comm(u, v) * 1.2));       // calcaire aux commissures
        return [...c, 0.6 + 0.35 * smooth(0, 0.35, v) - 0.2 * comm(u, v)];
      },
      thick: (u, v) => 0.08 * (1 - smooth(0, 0.15, v)) + 0.07 + 0.14 * smooth(0.5, 0.95, v) + 0.08 * comm(u, v),
      bulge: (u, v) => 0.1 * comm(u, v),
    });
  } else {
    const sep = d.leaflets.find((l) => /Septal/.test(l.name));
    up = dirOf((sep.t0 + sep.t1) / 2).projectOnPlane(A).normalize().negate(); // feuillet septal en bas (6 h)
    // anneau élargi par la déformation du cœur (parois et valve ensemble) ; défaut de coaptation et feuillets attirés
    // vers le ventricule portés par la valve
    variants.dilatation = make({ gap: 0.12, tether: 0.3 });
    dilation = { dilatation: DILATATION };
  }
  let current = 'normale';
  const view = {
    key: kind, title: mitral ? 'Valve mitrale' : 'Valve tricuspide', heartValveId: id, phase: 'av',
    variantList: mitral ? [['normale', 'Normale'], ['prolapsus', 'Prolapsus P2'], ['rhumatismal', 'Rétrécissement']] : [['normale', 'Normale'], ['dilatation', 'Anneau dilaté']],
    // C (chirurgicale) : caméra côté oreillette, dans l'axe de la valve ; on garde le côté ventriculaire, la coupe passe
    //   7 mm au-dessus de l'anneau (oreillette ouverte comme après atriotomie) ;
    // V (ventriculaire) : caméra dans le ventricule, regard vers l'oreillette (perspective ventriculaire de l'ETO 3D) ;
    //   on garde le côté auriculaire, la coupe passe 4 cm sous l'anneau, à mi-ventricule : piliers, cordages et face
    //   ventriculaire des feuillets. Même verticale que la vue chirurgicale : image en miroir, comme en échographie.
    sides: {
      C: { camDir: A.clone().negate(), center: C.clone(), dist: mitral ? 11 : 12, up, cut: { normal: A.clone(), def: -A.dot(C) + 0.7 }, interior: 1.5,
        orient: mitral ? 'Vue depuis l’oreillette gauche · <b>aorte en haut</b>' : 'Vue depuis l’oreillette droite · <b>septum en bas</b>' },
      V: { camDir: A.clone(), center: C.clone().addScaledVector(A, 1.2), dist: mitral ? 12 : 13, up, cut: { normal: A.clone().negate(), def: A.dot(C) + 4.0 }, interior: 1.5,
        orient: mitral ? 'Vue depuis le ventricule gauche · <b>aorte en haut</b>' : 'Vue depuis le ventricule droit · <b>septum en bas</b>' },
    },
    get variant() { return current; },
    valveFor: (name) => valveOf(name) ?? heart.valves[id], // objet valve d'une variante (normale : celle du cœur)
    dilationOf: (name) => dilation[name] ?? 0,
    get dilation() { return dilation[current] ?? 0; }, // dilatation de la variante (transitions progressives)
    setVariant(name) { current = name; if (view.active) view.activate(true); },
    active: false,
    // pose la variante choisie dans le cœur (on = false : valve normale)
    activate(on) {
      view.active = on;
      heart.useValve(id, on ? valveOf(current) : null);
      if (!mitral) heart.setDilation(on ? dilation[current] ?? 0 : 0);
    },
  };
  return view;
}
