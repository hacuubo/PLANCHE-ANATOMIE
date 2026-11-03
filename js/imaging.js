// Vues d'imagerie (mode Expert, rubrique Imagerie) : coupes standard d'échographie, placées sur les repères réels du
// modèle (pointe, centres des valves), et incidences de coronarographie.
//
// Échographie : chaque coupe est un plan, vu du côté de la sonde, avec l'orientation habituelle de l'image
// (ASE / EACVI, Lang 2015 ; ETO : Hahn 2013) :
//   - parasternale grand axe : plan pointe – mitrale – aorte ; paroi antérieure (VD) en haut, pointe à gauche, aorte
//     à droite ;
//   - parasternales petit axe (aortique : perpendiculaire à la racine aortique ; mitrale, piliers : perpendiculaires à
//     l'axe du VG), vues depuis la pointe ;
//     antérieur en haut, gauche du patient à droite de l'écran (VD en haut à gauche) ;
//   - apicale 4 cavités : plan pointe – mitrale – tricuspide ; pointe en haut, VG à droite, oreillettes en bas ;
//     apicale 5 cavités : même vue, plan basculé vers l'aorte (chambre de chasse et valve aortique) ;
//   - ETO mi-œsophagienne 4 cavités : même plan, vu depuis l'œsophage (oreillettes en haut, VG à droite) ;
//     mi-œsophagienne grand axe : plan de la parasternale grand axe, oreillette gauche en haut.
// Le plan de coupe retire la partie située entre la sonde et le plan ; la caméra regarde la tranche de face.
// Coronarographie : caméra à la place du détecteur (amplificateur de brillance), cœur entier ; OAD : vers la droite du
// patient, OAG : vers sa gauche ; crâniale : vers la tête, caudale : vers les pieds.
import * as THREE from 'three';

const ANT = new THREE.Vector3(0, 0, 1), LEFT = new THREE.Vector3(1, 0, 0), HEAD = new THREE.Vector3(0, 1, 0);

export function buildImagingViews(LM) {
  const apex = LM.apex.clone(), M = LM.valves['valve-mitrale'].center.clone(), T = LM.valves['valve-tricuspide'].center.clone();
  const Ao = LM.valves['valve-aortique'].center.clone(), base = LM.base.clone();
  const AV = M.clone().add(T).multiplyScalar(0.5), axis = apex.clone().sub(base).normalize(); // axe du VG, vers la pointe
  const normalOf = (a, b, c) => new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
  // plan de normale n passant par P0 ; U : haut voulu, R : droite voulue (directions du monde, ramenées dans le plan)
  const plane = (key, name, n, P0, U, R, target, distK) => {
    const u = U.clone().projectOnPlane(n).normalize(), r = R.clone().projectOnPlane(n).projectOnPlane(u).normalize();
    const z = new THREE.Vector3().crossVectors(r, u); // vers l'observateur (côté de la sonde)
    const normal = z.clone().negate(); // on garde ce qui est derrière le plan
    const def = Math.round(z.dot(P0) * 100) / 100;
    return { key, name, kind: 'echo', normal, def, cam: { dir: z, up: u, target: target.clone(), distK } };
  };
  const plaxN = normalOf(apex, M, Ao), a4cN = normalOf(apex, M, T), a5cN = normalOf(apex, Ao, AV);
  const lvMid = apex.clone().lerp(AV, 0.55);
  const echo = [
    plane('echo-plax', 'Parasternale grand axe', plaxN, Ao, ANT, Ao.clone().sub(apex), apex.clone().lerp(Ao, 0.5), 0.72),
    // niveau aortique : plan perpendiculaire à la racine aortique (cuspides en « Y »), et non à l'axe du VG
    plane('echo-psax-ao', 'Petit axe, valve aortique', LM.valves['valve-aortique'].axis.clone().normalize(), Ao, ANT, LEFT, Ao, 0.62),
    plane('echo-psax-mv', 'Petit axe, valve mitrale', axis, M.clone().addScaledVector(axis, 0.6), ANT, LEFT, M.clone().addScaledVector(axis, 0.6), 0.62),
    plane('echo-psax-pm', 'Petit axe, piliers', axis, M.clone().lerp(apex, 0.45), ANT, LEFT, M.clone().lerp(apex, 0.45), 0.62),
    plane('echo-a4c', 'Apicale 4 cavités', a4cN, AV, apex.clone().sub(AV), M.clone().sub(T), apex.clone().lerp(AV, 0.62), 0.8),
    plane('echo-a5c', 'Apicale 5 cavités', a5cN, Ao, apex.clone().sub(AV), M.clone().sub(T), apex.clone().lerp(AV, 0.62), 0.8),
    plane('echo-me4c', 'ETO 4 cavités (mi-œsophage)', a4cN, AV, AV.clone().sub(apex), M.clone().sub(T), apex.clone().lerp(AV, 0.62), 0.8),
    plane('echo-melax', 'ETO grand axe (mi-œsophage)', plaxN, Ao, ANT.clone().negate(), Ao.clone().sub(apex), apex.clone().lerp(Ao, 0.5), 0.72),
  ];
  echo.forEach((e) => { e.mid = lvMid; });
  const proj = (key, name, lr, cc) => {
    const a = THREE.MathUtils.degToRad(lr), b = THREE.MathUtils.degToRad(cc);
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(Math.cos(b)).addScaledVector(HEAD, Math.sin(b)).normalize();
    return { key, name, kind: 'angio', dir, up: HEAD.clone().projectOnPlane(dir).normalize() };
  };
  const angio = [
    proj('angio-oad30', 'OAD 30°', -30, 0),
    proj('angio-oad-caud', 'OAD 30° caudale 20°', -30, -20),
    proj('angio-oag45', 'OAG 45°', 45, 0),
    proj('angio-oag-cran', 'OAG 45° crâniale 20°', 45, 20),
    proj('angio-araignee', 'OAG 45° caudale 30° (araignée)', 45, -30),
    proj('angio-face-cran', 'Face crâniale 30°', 0, 30),
  ];
  return { echo, angio };
}
