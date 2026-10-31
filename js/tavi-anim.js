// Animation de l'implantation d'une TAVI (bioprothèse aortique à expansion par ballonnet, voie fémorale rétrograde),
// dans le cœur du modèle, vue dans le plan de la crosse aortique (aorte ouverte sur toute sa longueur) :
//   1. le guide rigide remonte l'aorte descendante, passe la crosse, franchit la valve rétrécie et se loge dans le
//      ventricule gauche, son extrémité enroulée (« queue de cochon ») pour ne pas blesser la paroi ;
//   2. le cathéter de largage monte le long du guide : valve sertie sur le ballonnet, cône jaune à l'avant ;
//   3. la valve sertie est centrée sur l'anneau, au milieu de la valve native calcifiée ;
//   4. le ballonnet est gonflé (stimulation cardiaque rapide : le cœur n'éjecte plus pendant quelques secondes) :
//      l'armature se déploie et plaque la valve native contre la paroi ;
//   5. le ballonnet est dégonflé, puis retiré avec le cathéter ; la prothèse reste fixée par sa force radiale ;
//   6. le guide est retiré ;
//   7. passage direct à la vue chirurgicale (sans recul de la caméra) : la nouvelle valve s'ouvre et se ferme à chaque
//      battement.
// Matériel : guide de ≈ 0,9 mm, cathéter de ≈ 5,5 mm (14 F), cône d'introduction, bioprothèse sertie à ≈ 7 mm puis
// déployée à la taille de l'anneau (armature de la valve finale, js/aortic-view.js). Le cœur est arrêté en diastole
// pendant la mise en place (pose sans déformation : le matériel et la valve sertie sont placés au repos).
import * as THREE from 'three';

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const TAVI_STEPS = [
  { d: 4.2, text: 'Un guide fin est poussé depuis l’artère de l’aine, remonte l’aorte, passe la crosse, franchit la valve malade et s’enroule dans le ventricule gauche.' },
  { d: 6.0, text: 'Le long du guide monte la nouvelle valve, sertie sur un ballonnet ; le petit cône jaune ouvre la voie.' },
  { d: 2.0, text: 'Elle est placée au milieu de la valve malade, calcifiée et rétrécie.' },
  { d: 2.6, text: 'Le ballonnet est gonflé quelques secondes, le cœur stimulé très vite pour qu’il n’éjecte plus : l’armature se déploie et plaque la valve malade contre la paroi.' },
  { d: 5.0, text: 'Le ballonnet est dégonflé puis retiré avec le cathéter ; la nouvelle valve reste en place, tenue par son armature.' },
  { d: 2.8, text: 'Le guide est retiré : l’intervention est terminée.' },
  { d: 0, text: 'La nouvelle valve s’ouvre et se ferme à chaque battement.' },
];

export function createTaviAnimation(heart, view, hooks) {
  let built = null, playing = false, t = 0, step = -1, tail = -1; // tail : temps écoulé depuis la fin (légende finale)
  const build = () => {
    const kit = view.taviKit(), curve = kit.path.curve, L = kit.path.length, S = 900;
    const group = new THREE.Group(); group.visible = false; heart.root.add(group);
    const tube = (r, rs, mat) => { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, S, r, rs, false), mat); m.frustumCulled = false; m.userData.rs = rs; group.add(m); return m; };
    const wire = tube(0.045, 8, new THREE.MeshStandardMaterial({ color: 0x4f565f, metalness: 0.7, roughness: 0.3 }));
    const cath = tube(0.27, 20, new THREE.MeshPhysicalMaterial({ color: 0x2c62d3, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
    const shaft = tube(0.09, 10, new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.4 }));
    // portion [u0, u1] (cm le long du trajet) d'un tube
    const range = (m, u0, u1) => {
      const i0 = Math.max(0, Math.floor((u0 / L) * S)), i1 = Math.min(S, Math.ceil((u1 / L) * S)), per = m.userData.rs * 6;
      m.visible = i1 > i0; m.geometry.setDrawRange(i0 * per, Math.max(0, i1 - i0) * per);
    };
    // cône d'introduction (jaune), pointe vers l'avant (+Y local)
    const cone = new THREE.Mesh(new THREE.LatheGeometry([0, 0.12, 0.45, 0.8, 1.05, 1.25].map((y, i) => new THREE.Vector2([0.27, 0.27, 0.24, 0.17, 0.1, 0.05][i], y)), 24),
      new THREE.MeshPhysicalMaterial({ color: 0xf0c23a, roughness: 0.35, clearcoat: 0.6 }));
    group.add(cone);
    // valve sertie / déployée : armature, jupe et feuillets de la valve finale (repère local d'axe Y), matériaux propres
    // (non coupés : le matériel reste entier devant la coupe)
    const metal = new THREE.MeshStandardMaterial({ color: 0xaeb4bc, metalness: 0.85, roughness: 0.28 });
    const tissue = new THREE.MeshStandardMaterial({ color: 0xede5d3, roughness: 0.55, side: THREE.DoubleSide });
    kit.inner.traverse((o) => { if (o.isMesh) { o.material = o.geometry.attributes.col ? tissue : metal; o.frustumCulled = false; } });
    const rig = new THREE.Group(); rig.add(kit.inner); group.add(rig);
    // ballonnet : fuseau translucide, effilé aux deux bouts, à la longueur de la valve + 8 mm
    const bl = kit.height + 0.8, bal = new THREE.Mesh(new THREE.LatheGeometry(Array.from({ length: 17 }, (_, i) => {
      const y = -bl / 2 + (i / 16) * bl, e = Math.abs(y) / (bl / 2);
      return new THREE.Vector2(e < 0.72 ? 1 : Math.sqrt(Math.max(0.0025, 1 - ((e - 0.72) / 0.28) ** 2)) * 0.95 + 0.05, y);
    }), 32), new THREE.MeshPhysicalMaterial({ color: 0xeef3f6, transparent: true, opacity: 0.42, roughness: 0.15, clearcoat: 1, depthWrite: false }));
    bal.renderOrder = 3; group.add(bal);
    // repères le long du trajet : position de la valve déployée
    const samples = curve.getSpacedPoints(S);
    let iv = 0; samples.forEach((p, i) => { if (p.distanceTo(kit.center) < samples[iv].distanceTo(kit.center)) iv = i; });
    const uV = (iv / S) * L, h = kit.height, crimp = 0.36 / kit.Rs; // sertie : ≈ 7 mm de diamètre
    const Y = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), Tg = new THREE.Vector3(), q = new THREE.Quaternion(), qA = new THREE.Quaternion().setFromUnitVectors(Y, kit.axis);
    const qF = new THREE.Quaternion().setFromUnitVectors(Y, kit.axis.clone().negate()); // pièces de révolution sur l'anneau : vers l'avant
    // ballonnet gonflé : à la forme de l'armature déployée, plaquée sur la racine (rayon sous chaque sommet, ballonnet
    // posé sur l'anneau, axe Y local vers le ventricule) ; serti et dégonflé : rond
    const bp = bal.geometry.attributes.position, bBase = Float32Array.from(bp.array), bFr = new Float32Array(bp.count);
    const zc = kit.center.clone().sub(kit.annulus).dot(kit.axis), w = new THREE.Vector3();
    for (let i = 0; i < bp.count; i++) {
      w.set(bBase[3 * i], 0, bBase[3 * i + 2]);
      bFr[i] = w.lengthSq() < 1e-10 ? kit.Rs : kit.frameR(kit.angleOf(w.normalize().applyQuaternion(qF)), zc - bBase[3 * i + 1]);
    }
    let bEff = -1;
    const inflate = (eff) => {
      if (Math.abs(eff - bEff) < 1e-4) return;
      bEff = eff;
      const cr = crimp * kit.Rs;
      for (let i = 0; i < bp.count; i++) { const r = Math.max(cr * 0.85, cr + (1.03 * bFr[i] - cr) * eff); bp.setX(i, bBase[3 * i] * r); bp.setZ(i, bBase[3 * i + 2] * r); }
      bp.needsUpdate = true; bal.geometry.computeVertexNormals();
    };
    const at = (u) => { const f = Math.min(1, Math.max(0, u / L)); curve.getPointAt(f, P); curve.getTangentAt(f, Tg); return f; };
    // orientation de la valve sertie le long du trajet : déjà dans le sens final (sortie, côté aorte, vers l'arrière ;
    // entrée, côté ventricule, vers l'avant), transportée sans torsion depuis sa pose sur l'anneau — elle arrive
    // sur l'anneau sans pivoter
    const tan = samples.map((_, i) => curve.getTangentAt(i / S).negate()), qs = new Array(S + 1), qd = new THREE.Quaternion();
    qs[iv] = new THREE.Quaternion().setFromUnitVectors(kit.axis, tan[iv]).multiply(qA);
    for (let i = iv - 1; i >= 0; i--) qs[i] = qd.setFromUnitVectors(tan[i + 1], tan[i]).clone().multiply(qs[i + 1]);
    for (let i = iv + 1; i <= S; i++) qs[i] = qd.setFromUnitVectors(tan[i - 1], tan[i]).clone().multiply(qs[i - 1]);
    const frameQ = (u, out) => { const x = Math.min(S, Math.max(0, (u / L) * S)), i = Math.min(S - 1, Math.floor(x)); return out.slerpQuaternions(qs[i], qs[i + 1], x - i); };
    // pose d'un objet centré en u sur le trajet, axe le long du trajet (blend : vers la pose exacte sur l'anneau) ;
    // carried : orientation transportée de la valve (sinon axe Y vers l'avant, pour les pièces de révolution)
    const place = (o, u, blend = 0, carried = false) => {
      at(u);
      if (carried) frameQ(u, q); else q.setFromUnitVectors(Y, Tg);
      if (blend > 0) { P.lerp(kit.center, blend); q.slerp(carried ? qA : qF, blend); }
      o.position.copy(P); o.quaternion.copy(q);
    };
    return { kit, group, wire, cath, shaft, cone, rig, bal, range, place, at, L, uV, h, crimp, P, Tg, inflate };
  };
  // état de la scène au temps t (s) depuis le début
  const pose = () => {
    const b = built, { L, uV, h, crimp } = b, starts = [];
    let acc = 0; for (const s of TAVI_STEPS) { starts.push(acc); acc += s.d; }
    const ph = (k) => (TAVI_STEPS[k].d ? Math.min(1, Math.max(0, (t - starts[k]) / TAVI_STEPS[k].d)) : t >= starts[k] ? 1 : 0);
    const k = Math.max(0, starts.findLastIndex((s0) => t >= s0));
    // guide : avance (étape 1), retrait (étape 6)
    const uw = L * (ease(ph(0)) - ease(ph(5)));
    b.range(b.wire, 0, uw);
    // cathéter : centre de la valve sertie (étape 2 : arrivée sur l'anneau ; étape 5 : retrait)
    const uStart = -4, uc = ph(1) < 1 ? uStart + (uV - uStart) * ease(ph(1)) : uV - (uV + 8) * ease((ph(4) - 0.35) / 0.65);
    const blend = ph(1) >= 1 && ph(4) < 0.35 ? ease(ph(2)) : 0; // centrage exact sur l'anneau (étape 3)
    const e = ease(ph(3)), deflate = ease(Math.min(1, ph(4) / 0.3));
    const visible = ph(1) > 0 && ph(4) < 1;
    const uBack = uc - h / 2 - 0.25, uNose = uc + h / 2 + 0.15;
    b.range(b.cath, 0, visible ? uBack : 0);
    b.range(b.shaft, 0, visible ? uNose : 0); // tige interne : visible de la fin du cathéter au cône
    b.cone.visible = visible && uNose > 0.5;
    if (b.cone.visible) b.place(b.cone, uNose);
    // ballonnet : serti avec la valve, gonflé à la forme de l'armature, dégonflé, retiré avec le cathéter
    b.bal.visible = visible && uc > 0;
    b.inflate(e * (1 - deflate));
    if (b.bal.visible) b.place(b.bal, uc, blend);
    // armature : sertie sur le ballonnet jusqu'au gonflement, puis déployée et fixe sur l'anneau
    const deployed = ph(3) > 0;
    b.rig.visible = ph(1) > 0 && k < 6 && (deployed || uc > -h);
    if (deployed) { b.rig.position.copy(built.kit.center); b.rig.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), built.kit.axis); }
    else if (b.rig.visible) b.place(b.rig, uc, blend, true);
    const s = crimp + (1 - crimp) * e;
    b.rig.scale.set(s, 1, s);
    return { k, e };
  };
  // cadrage (vue L) : plan large sur la crosse pendant la montée du matériel, rapproché sur la valve pour le
  // positionnement et le déploiement, puis jusqu'à la fin des retraits (on reste sur la valve ; la fin passe
  // directement à la vue chirurgicale) ; [instant (s), hauteur du centre au-dessus de l'anneau (cm), distance (cm)]
  // — le premier est celui de la vue L (js/aortic-view.js)
  const SHOTS = [[0, 2.6, 30], [7.5, 2.6, 30], [10.2, 0.4, 13]];
  const frameAt = () => {
    let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
    const a = SHOTS[i], b = SHOTS[Math.min(i + 1, SHOTS.length - 1)], f = b === a ? 0 : ease((t - a[0]) / (b[0] - a[0]));
    const k = built.kit;
    return { center: k.annulus.clone().addScaledVector(k.axis, a[1] + (b[1] - a[1]) * f), dist: a[2] * Math.pow(b[2] / a[2], f) };
  };
  const native = (e, k) => (k >= 6 ? 'post' : e > 0.35 ? 'mid' : 'pre');
  let shownValve = null;
  const api = {
    get playing() { return playing; },
    get step() { return step; },
    // lance l'animation (la vue L et le cœur arrêté sont posés par hooks.enter)
    play() {
      built ??= build();
      t = -2.2; step = -1; playing = true; shownValve = null; tail = -1;
      heart.rootUniforms.uOpenAo.value = 1;
      built.group.visible = true;
      pose();
      api.syncValve(0, 0);
      hooks.caption(0, TAVI_STEPS[0].text);
    },
    syncValve(e, k) {
      const which = native(e, k);
      if (which === shownValve) return;
      shownValve = which;
      heart.useValve(view.heartValveId, built.kit[which]);
    },
    // arrêt (autre vue, autre variante) : matériel retiré, aorte refermée ; la valve de la variante est remise par l'appelant
    stop() {
      if (!built) return;
      playing = false; step = -1;
      built.group.visible = false;
      heart.rootUniforms.uOpenAo.value = 0;
      hooks.caption(-1, '');
    },
    // cadrage du moment (vue L) : { center, dist }
    frame: () => frameAt(),
    // instant donné (s) de l'animation en cours (essais, captures)
    seek(x) { if (!playing) return; t = x - 1e-3; api.update(1e-3); },
    // dt : secondes réelles
    update(dt) {
      if (tail >= 0 && (tail += dt) > 9) { tail = -1; if (!playing) hooks.caption(-1, ''); } // légende finale : 9 s
      if (!playing) return;
      t += dt;
      const { k, e } = pose();
      api.syncValve(e, k);
      if (k !== step) {
        step = k; hooks.caption(k, TAVI_STEPS[k].text);
        if (k === 6) { built.group.visible = false; heart.rootUniforms.uOpenAo.value = 0; playing = false; tail = 0; hooks.finish(); }
      }
    },
  };
  return api;
}
