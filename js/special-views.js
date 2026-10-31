// Rubriques FOP et Coronaires : vues tirées du cœur lui-même, sur le même modèle que les vues des valves (js/app.js,
// goValve) — caméra, coupe, variantes, repères.
//
// FOP (foramen ovale perméable) :
//   - « Fosse ovale normale » : septum interauriculaire vu de l'oreillette droite (paroi libre retirée) : fosse ovale
//     (plancher mince, septum primum), limbe en fer à cheval (septum secundum), abouchement des veines caves ;
//   - « FOP · test aux bulles » : coupe bicave des deux oreillettes, comme en ETO (≈ 90–110°, oreillette gauche en
//     haut, veine cave supérieure à droite), postérieure : elle passe par la fosse ovale (plancher, limbe) et par le
//     tunnel du FOP à son bord antéro-supérieur. Schéma du test aux bulles : le sérum salé agité arrive par les veines
//     caves et opacifie l'oreillette droite ; à chaque cycle, quand la pression de l'oreillette droite dépasse celle
//     de la gauche (contraction auriculaire, début de systole ; Langholz 1991), des bulles passent par le tunnel du FOP
//     dans l'oreillette gauche. Test positif : bulles dans l'OG dans les 3 cycles qui suivent l'opacification de l'OD
//     (Silvestry, ASE/SCAI 2015) ;
//   - « Fermeture du FOP » : même coupe bicave ; animation de la fermeture percutanée par une prothèse à double disque
//     (js/pfo-closure.js).
// Coronaires (vue de face du cœur qui bat) :
//   - « Normale » ;
//   - « Infarctus (IVA) » : IVA occluse à partir de l'IVA moyenne (après la 1re diagonale), aval assombri (pas de
//     sang : TIMI 0) ; segments 7, 8, 13, 14 et 17 du modèle AHA (Cerqueira 2002) akinétiques (ni épaississement, ni
//     rapprochement vers le centre ; ASE/EACVI 2015), myocarde infarci plus terne.
import * as THREE from 'three';

export function buildFOPViews(heart) {
  const fo = heart.fossa;
  if (!fo) return {};
  const make = (key, title, side, pfo) => {
    const view = {
      key, title, group: 'fop', phase: null, compare: false,
      variantList: [['normale', title]], variant: 'normale', setVariant() {},
      sides: { C: side },
      active: false,
      activate(on) { view.active = on; heart.setPFO(on && pfo); view.onActivate?.(on, pfo); },
    };
    return view;
  };
  // fosse ovale vue de l'OD : regard de l'OD vers l'OG, coupe parallèle au septum 1,4 cm devant la fosse
  const fosse = make('fosse', 'Fosse ovale normale', {
    camDir: fo.n.clone().negate(), center: fo.F.clone(), dist: 9, up: fo.up.clone(),
    cut: { normal: fo.n.clone(), def: -fo.n.dot(fo.F) + 1.4 }, interior: 0.4,
    orient: 'Vue depuis l’oreillette droite · <b>veine cave supérieure en haut</b>',
  }, false);
  // coupe bicave par le tunnel du FOP : plan qui contient l'axe des veines caves et la normale au septum
  const cav = fo.svc.clone().sub(fo.ivc); cav.addScaledVector(fo.n, -cav.dot(fo.n)).normalize();
  const fwd = new THREE.Vector3().crossVectors(fo.n, cav).normalize(); // vu ainsi : OG en haut, VCS à droite
  const T1 = fo.tunnel[1];
  const bicave = () => ({
    camDir: fwd.clone().negate(), center: T1.clone().addScaledVector(fo.n, -0.6), dist: 13, up: fo.n.clone(),
    cut: { normal: fwd.clone(), def: -fwd.dot(T1) }, interior: 0.6,
    orient: 'Coupe bicave, comme en ETO · <b>oreillette gauche en haut, veine cave supérieure à droite</b>',
  });
  const fop = make('fop', 'FOP · test aux bulles', bicave(), true);
  // fermeture percutanée (prothèse à double disque) : même coupe ; animation de la mise en place (js/pfo-closure.js)
  const fermeture = make('fermeture', 'Fermeture du FOP', bicave(), true);
  return { fosse, fop, fermeture };
}

export function buildCoronaryView(heart) {
  let current = 'normale';
  // cadrage : le VG entier, de la base à la pointe, vu de face et un peu de la gauche (paroi antérieure et IVA de face)
  const { apex, base } = heart.landmarks, mid = base.clone().lerp(apex, 0.45);
  const dir = new THREE.Vector3(0.45, 0.1, 1).normalize();
  const view = {
    key: 'coronaires', title: 'Coronaires', group: 'coro', phase: null, compare: true, noFog: true,
    variantList: [['normale', 'Normale'], ['idm', 'Infarctus (IVA)']],
    get variant() { return current; },
    setVariant(name) { current = name; if (view.active) view.activate(true); },
    // vue de face du cœur entier (comme la vue d'ouverture), sans coupe (plan rejeté loin devant le cœur)
    sides: { C: { camDir: dir.clone(), center: mid, dist: 29, up: new THREE.Vector3(0, 1, 0),
      cut: { normal: dir.clone().negate(), def: 60 }, interior: 0,
      orient: 'Vue antérieure gauche · <b>IVA de face, pointe en bas</b>' } },
    active: false,
    activate(on) { view.active = on; heart.setInfarct(on && current === 'idm'); },
    // écran partagé : moitié gauche normale, moitié droite infarctus (null : rétablit la variante choisie)
    applyHalf(i) { heart.setInfarct(i === null ? current === 'idm' : i === 1); },
  };
  return view;
}

// Bulles du test (sérum salé agité) : sphères blanches qui suivent un trajet dans les cavités (position de repos,
// déformée par le battement). Sans FOP, elles traversent l'OD vers la tricuspide et le VD ; avec FOP, une partie
// attend à l'entrée du tunnel et passe dans l'OG pendant la fenêtre où la pression de l'OD dépasse celle de l'OG.
export function createBubbles(heart) {
  const fo = heart.fossa;
  if (!fo) return { update() {}, setActive() {}, mesh: null };
  const N = 1280; // opacification dense de l'oreillette droite, passage bien visible dans l'oreillette gauche
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8c97a3, emissiveIntensity: 0.45, roughness: 0.22, metalness: 0 });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), mat, N);
  mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 2;
  heart.root.add(mesh);
  const V = (a) => new THREE.Vector3(...a);
  const tvd = heart.valveData['valve-tricuspide'], mvd = heart.valveData['valve-mitrale'];
  const TV = V(tvd.center), TVa = V(tvd.axis).normalize(), MV = V(mvd.center), MVa = V(mvd.axis).normalize();
  const [T0, T1, T2] = fo.tunnel;
  const rnd = (s) => (Math.random() * 2 - 1) * s;
  const jit = (p, s) => p.clone().add(new THREE.Vector3(rnd(s), rnd(s), rnd(s)));
  let pfo = false, active = false;
  const B = [];
  // trajets : depuis une veine cave, à travers l'OD ; avec FOP, vers le tunnel puis l'OG, la mitrale et le VG
  const spawn = (b, initial) => {
    const fromSVC = Math.random() < 0.4, inlet = jit(fromSVC ? fo.svc : fo.ivc, 0.35);
    b.cross = pfo && Math.random() < 0.22;
    const pts = b.cross
      ? [inlet, jit(fo.ra.clone().lerp(T0, 0.5), 0.4), T0.clone(), T1.clone(), T2.clone(), jit(fo.la, 0.5), jit(MV, 0.4), MV.clone().addScaledVector(MVa, 1.6)]
      : [inlet, jit(fo.ra, 0.7), jit(TV, 0.4), jit(TV.clone().addScaledVector(TVa, 1.8), 0.4)];
    b.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    b.len = b.curve.getLength();
    b.gate = 1; // fraction du trajet à l'entrée du tunnel (bulles qui passent par le FOP)
    if (b.cross) { // fraction de longueur jusqu'à T0
      const seg = [pts[0], pts[1], pts[2]]; let l = 0; for (let k = 1; k < seg.length; k++) l += seg[k].distanceTo(seg[k - 1]);
      b.gate = Math.min(0.9, l / b.len);
    }
    b.t = initial ? Math.random() * 0.8 : 0;
    b.speed = (1.4 + Math.random() * 0.8) / b.len; // ≈ 1,4 à 2,2 cm/s : le contraste remplit l'OD en un à deux cycles
    b.size = 0.035 + Math.random() * 0.035;
    b.waiting = false;
  };
  for (let i = 0; i < N; i++) { B.push({}); spawn(B[i], true); }
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  return {
    mesh,
    setActive(on, withPFO) { active = on; mesh.visible = on; if (withPFO !== pfo) { pfo = withPFO; B.forEach((b) => spawn(b, true)); } },
    // dt : secondes (déjà multipliées par la vitesse du battement), phase : instant du cycle (0–1), running : cœur qui bat
    update(dt, phase, running) {
      if (!active) return;
      const shunt = phase > 0.02 && phase < 0.28; // contraction auriculaire et début de systole : P(OD) > P(OG)
      for (let i = 0; i < N; i++) {
        const b = B[i];
        if (running) {
          if (b.cross && b.t < b.gate && b.t + b.speed * dt >= b.gate && !shunt) b.waiting = true; // attend à l'entrée du tunnel
          if (b.waiting && shunt) b.waiting = false;
          if (!b.waiting) b.t += b.speed * dt * (b.cross && b.t >= b.gate && b.t < b.gate + 0.15 ? 2.2 : 1); // le jet traverse vite
          if (b.t >= 1) spawn(b, false);
        }
        b.curve.getPointAt(Math.min(1, b.t), p);
        heart.deformPoint(p, 0.38);
        const s = b.size * (b.t > 0.92 ? (1 - b.t) / 0.08 : 1); // les bulles s'effacent dans les ventricules
        m4.compose(p, q, sc.setScalar(Math.max(0.001, s)));
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
