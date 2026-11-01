// Première partie des animations de pose de dispositifs (TAVI, fermeture du FOP, stimulateur) : le trajet, du point de
// ponction à l'abord du cœur, sur une planche du corps entier — grande circulation seule (artères en rouge, veines en
// bleu, pas de circulation pulmonaire), cœur immobile. L'aiguille ponctionne le vaisseau, le dispositif le remonte, la
// vue suit sa progression ; en 4 à 5 s, à l'abord du cœur (aorte thoracique descendante, veine cave inférieure au
// niveau du foie, veine cave supérieure), la deuxième partie (animation 3D) prend le relais : la caméra 3D se pose
// exactement sur le cadrage de la planche, qui s'efface en fondu.
//
// Planche : vue de face, côté droit du patient à gauche de l'écran, sur fond bleu nuit. Repère : K = 5,45 unités par cm ;
// un point de la scène (x, y en cm) est en (OX + K·x, OY − K·y). La planche est une image rendue en 3D par js/app.js
// (renderPlate, livrée toute faite dans assets/planche/) : corps de BodyParts3D en verre bleuté (peau, squelette),
// vaisseaux de la grande circulation à leur place anatomique, reins, et le cœur du modèle. Sa description donne les
// images, le cadrage du corps entier et les trajets des dispositifs (lignes centrales des vaisseaux, en unités).
//   TAVI      artère fémorale droite → iliaque commune → aorte abdominale → aorte thoracique descendante ;
//   FOP       veine fémorale droite → iliaque commune → veine cave inférieure, au niveau du foie ;
//   pacemaker veine sous-clavière gauche → tronc veineux brachiocéphalique gauche → veine cave supérieure.

const NS = 'http://www.w3.org/2000/svg';
const K = 5.45, OX = 200, OY = 252.9;

// Ligne centrale lissée : Catmull-Rom sur toutes les composantes, n points par segment
function spline(P, closed = false, n = 10) {
  const N = P.length, at = (i) => (closed ? P[(i + N) % N] : P[Math.max(0, Math.min(N - 1, i))]), out = [];
  for (let i = 0; i < (closed ? N : N - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, j) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  if (!closed) out.push(P[N - 1].slice());
  return out;
}
const f1 = (v) => Math.round(v * 10) / 10;

export const ROUTES = {
  tavi: {
    dur: 3.2, color: '#3a414b', width: 2.4, side: -1, needle: [-12, 34], zoom: [620, 175],
    label: ['Ponction', 'artère fémorale droite'],
    text: 'Ponction de l’artère fémorale droite, au pli de l’aine : le guide remonte l’artère iliaque et l’aorte abdominale jusqu’à l’aorte thoracique.',
  },
  fop: {
    dur: 2.9, color: '#3a414b', width: 2.4, side: -1, needle: [-12, 34], zoom: [620, 165],
    label: ['Ponction', 'veine fémorale droite'],
    text: 'Ponction de la veine fémorale droite, au pli de l’aine : le guide remonte la veine iliaque et la veine cave inférieure jusqu’au foie.',
  },
  pm: {
    dur: 2.8, color: '#2c3a6b', width: 3.6, side: 1, needle: [16, 28], zoom: [380, 150],
    label: ['Ponction', 'veine sous-clavière gauche'],
    text: 'Ponction de la veine sous-clavière gauche, sous la clavicule : la sonde, dans sa gaine, rejoint le tronc veineux brachiocéphalique gauche puis la veine cave supérieure.',
  },
};

const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent?.appendChild(e); return e; };
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// Planche : les images (corps entier, puis le tronc, plus fin, par-dessus) dans des calques HTML sous le SVG : chacune
// garde sa taille d'origine et suit le cadrage par une transformation (translation, échelle) que la carte graphique
// applique sans la redessiner ; sur téléphone, la variante plus légère du tronc
function buildPlate(svg, layer, plate) {
  el('defs', {}, svg).innerHTML = '<filter id="ri-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>';
  const mobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
  const imgs = plate.images.filter((im) => !im.media || im.media === (mobile ? 'mobile' : 'desktop')).map((im) => {
    const img = new Image(); img.decoding = 'async'; img.alt = ''; img.src = im.url; layer.appendChild(img);
    const [x0, x1, y0, y1] = im.rect;
    return { img, x: OX + K * x0, y: OY - K * y1, w: (x1 - x0) * K, h: (y1 - y0) * K };
  });
  const device = el('g', {}, svg);
  const fx = el('g', {}, svg); // aiguille, point de ponction, bout du dispositif, étiquette
  return { device, fx, imgs, routes: plate.routes, heart: plate.heart, full: plate.full };
}

export function createRouteIntro(host, hooks = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'route-intro hidden';
  wrap.innerHTML = '<div class="ri-legend"><span class="ri-a">Artères</span><span class="ri-v">Veines</span></div><button type="button" class="ri-skip">Passer ›</button>';
  const svg = el('svg', { class: 'ri-svg', 'aria-hidden': 'true' }), layer = document.createElement('div');
  layer.className = 'ri-plate';
  wrap.prepend(layer, svg);
  host.appendChild(wrap);
  let P = null; // planche, construite au premier lancement (l'image du cœur est rendue à ce moment)
  let halo, line, ring, needle, shaft, hub, tipGlow, tip, tag, lead, t1, t2;
  const build = () => {
    P = buildPlate(svg, layer, hooks.plate());
    const { device, fx } = P;
    // dispositif : halo clair puis corps ; bout lumineux ; aiguille ; anneau de ponction ; étiquette
    halo = el('path', { fill: 'none', stroke: '#fff', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', opacity: 0.9 }, device);
    line = el('path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, device);
    ring = el('circle', { fill: 'none', stroke: '#f2b23a', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 }, fx);
    needle = el('g', {}, fx);
    shaft = el('line', { stroke: '#8d949d', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 }, needle);
    hub = el('line', { stroke: '#f2b23a', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 6 }, needle);
    tipGlow = el('circle', { fill: '#fff', opacity: 0.85, filter: 'url(#ri-glow)' }, fx);
    tip = el('circle', { fill: '#fff', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 2 }, fx);
    tag = el('g', {}, fx);
    lead = el('line', { stroke: '#14213a', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', opacity: 0.55 }, tag);
    t1 = el('text', { class: 'ri-t1' }, tag); t2 = el('text', { class: 'ri-t2' }, tag);
  };

  let kind = null, R = null, S = null, cum = null, t = 0, playing = false, done = null, cam = null, handed = false, ready = true, held = false;
  const T_PUNCT = 0.9, T_FADE = 0.55;
  const prepare = (k) => {
    if (!P) build();
    kind = k; R = ROUTES[k];
    S = spline(P.routes[k], false, 12); cum = [0];
    for (let i = 1; i < S.length; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
    line.setAttribute('stroke', R.color); line.setAttribute('stroke-width', R.width);
    halo.setAttribute('stroke-width', R.width + 3.4); tip.setAttribute('stroke', R.color);
    t1.textContent = R.label[0]; t2.textContent = R.label[1];
    for (const e of [t1, t2]) e.setAttribute('text-anchor', R.side < 0 ? 'end' : 'start');
    cam = { x: P.full.cx, y: P.full.cy, h: P.full.h }; handed = false;
  };
  // point du trajet à l'abscisse s (unités), et trajet jusqu'à s
  const pointAt = (s) => {
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const f = Math.min(1, Math.max(0, (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1)));
    return [lerp(S[i - 1][0], S[i][0], f), lerp(S[i - 1][1], S[i][1], f), i];
  };
  const upTo = (s) => { const [x, y, i] = pointAt(s); return `M${S.slice(0, i).map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}L${f1(x)} ${f1(y)}`; };
  const tHand = () => T_PUNCT + R.dur; // relais : la deuxième partie démarre, la planche s'efface
  let view = null; // cadrage courant (centre, hauteur en unités, hauteur en pixels)

  function render(dt) {
    const W = Math.max(1, wrap.clientWidth), H = Math.max(1, wrap.clientHeight), asp = W / H;
    const Ltot = cum[cum.length - 1], site = S[0], end = S[S.length - 1];
    const pT = ease((t - T_PUNCT) / R.dur), sLen = (t < T_PUNCT ? 0 : Math.max(0.0001, pT)) * Ltot;
    const [tx, ty] = pointAt(sLen);
    // cadrage visé : corps entier, puis le point de ponction, puis la tête du dispositif et l'abord du cœur
    let goal;
    if (t < T_PUNCT) { const e = ease(t / T_PUNCT); goal = { x: lerp(P.full.cx, lerp(P.full.cx, site[0], 0.35), e), y: lerp(P.full.cy, lerp(P.full.cy, site[1], 0.35), e), h: lerp(P.full.h, R.zoom[0], e) }; }
    else { const a = lerp(0.2, 0.55, pT); goal = { x: lerp(tx, lerp(end[0], P.heart[0], 0.5), a), y: lerp(ty, lerp(end[1], P.heart[1], 0.5), a), h: Math.exp(lerp(Math.log(R.zoom[0]), Math.log(R.zoom[1]), pT)) }; }
    if (!handed) { // après le relais, le cadrage ne bouge plus (la caméra 3D s'y est posée)
      const k = dt < 0 ? 1 : 1 - Math.exp(-dt * 4.5);
      cam.x += (goal.x - cam.x) * k; cam.y += (goal.y - cam.y) * k; cam.h = Math.exp(Math.log(cam.h) + (Math.log(goal.h) - Math.log(cam.h)) * k);
    }
    const h = cam.h, w = h * asp;
    svg.setAttribute('viewBox', `${f1(cam.x - w / 2)} ${f1(cam.y - h / 2)} ${f1(w)} ${f1(h)}`);
    const sc = H / h, vx = cam.x - w / 2, vy = cam.y - h / 2; // calques des images : même cadrage
    for (const L of P.imgs) {
      const nw = L.img.naturalWidth, nh = L.img.naturalHeight; if (!nw) continue;
      if (!L.sized) { L.img.style.width = nw + 'px'; L.img.style.height = nh + 'px'; L.sized = true; }
      L.img.style.transform = `translate(${((L.x - vx) * sc).toFixed(2)}px, ${((L.y - vy) * sc).toFixed(2)}px) scale(${((L.w * sc) / nw).toFixed(5)}, ${((L.h * sc) / nh).toFixed(5)})`;
    }
    view = { cx: cam.x, cy: cam.y, h, H };
    const u = h / H; // unités par pixel
    // ponction : aiguille qui entre, anneau qui pulse
    const pin = ease((t - 0.1) / 0.55), out = ease((t - T_PUNCT - 0.2) / 0.4);
    const [nx, ny] = R.needle, nl = Math.hypot(nx, ny), dx = nx / nl, dy = ny / nl, L0 = 30 * u * 1.4, depth = lerp(14 * u, 0, pin);
    const ax = site[0] + dx * depth, ay = site[1] + dy * depth;
    shaft.setAttribute('x1', f1(ax)); shaft.setAttribute('y1', f1(ay)); shaft.setAttribute('x2', f1(ax + dx * L0)); shaft.setAttribute('y2', f1(ay + dy * L0));
    hub.setAttribute('x1', f1(ax + dx * L0)); hub.setAttribute('y1', f1(ay + dy * L0)); hub.setAttribute('x2', f1(ax + dx * (L0 + 12 * u))); hub.setAttribute('y2', f1(ay + dy * (L0 + 12 * u)));
    needle.setAttribute('opacity', f1((t < 0.1 ? t / 0.1 : 1) * (1 - out)));
    const rp = (t * 1.6) % 1;
    ring.setAttribute('cx', f1(site[0])); ring.setAttribute('cy', f1(site[1])); ring.setAttribute('r', f1((5 + 16 * rp) * u));
    ring.setAttribute('opacity', f1((1 - rp) * (1 - ease((t - T_PUNCT) / 0.5))));
    // dispositif et son bout
    const show = t >= T_PUNCT;
    for (const e of [line, halo, tip, tipGlow]) e.style.display = show ? '' : 'none';
    if (show) {
      const d = upTo(sLen);
      line.setAttribute('d', d); halo.setAttribute('d', d);
      tip.setAttribute('cx', f1(tx)); tip.setAttribute('cy', f1(ty)); tip.setAttribute('r', f1(3.2 * u));
      tipGlow.setAttribute('cx', f1(tx)); tipGlow.setAttribute('cy', f1(ty)); tipGlow.setAttribute('r', f1(7 * u));
    }
    // étiquette de la ponction (taille constante à l'écran), pendant la ponction
    const fs = 15 * u, ox = site[0] + R.side * 26 * u, oy = site[1] - 8 * u;
    t1.setAttribute('x', f1(ox)); t1.setAttribute('y', f1(oy - fs * 0.15)); t1.setAttribute('font-size', f1(fs * 0.82));
    t2.setAttribute('x', f1(ox)); t2.setAttribute('y', f1(oy + fs * 1.0)); t2.setAttribute('font-size', f1(fs));
    lead.setAttribute('x1', f1(site[0] + R.side * 5 * u)); lead.setAttribute('y1', f1(site[1])); lead.setAttribute('x2', f1(ox - R.side * 4 * u)); lead.setAttribute('y2', f1(oy + fs * 0.2));
    tag.setAttribute('opacity', f1(ease(t / 0.3) * (1 - ease((t - T_PUNCT - 0.2) / 0.5))));
    // fondu sur la deuxième partie
    wrap.style.opacity = String(1 - ease((t - tHand()) / T_FADE));
  }
  function finish() {
    playing = false; done = null;
    wrap.classList.add('hidden'); host.classList.remove('intro-on');
  }
  const handoff = () => { handed = true; const cb = done; done = null; cb?.(view); }; // la deuxième partie démarre sous la planche
  wrap.querySelector('.ri-skip').addEventListener('click', () => { if (playing && !handed) { t = tHand(); render(-1); if (ready) handoff(); } });
  return {
    get playing() { return playing; },
    get kind() { return kind; },
    get covering() { return playing && !handed; }, // la planche couvre encore toute la scène (avant le fondu)
    // joue la première partie du trajet « k » ; onDone(view) au relais : cadrage de la planche à ce moment
    // ({ cx, cy, h } en unités, H en pixels) et repère du modèle (K, OX, OY), pour y poser la caméra 3D
    // ready : promesse de la préparation de la deuxième partie ; le relais l'attend (le dispositif reste à l'abord du cœur)
    play(k, onDone, readyP = null) {
      wrap.classList.remove('hidden'); host.classList.add('intro-on');
      prepare(k); t = 0; playing = true; done = onDone;
      ready = !readyP; readyP?.then(() => { if (kind === k) ready = true; });
      wrap.style.opacity = '1';
      hooks.caption?.(kind, R.text);
      render(-1);
    },
    update(dt) {
      if (!playing || held) return; // tenue : la planche reste sur son image (préparation de la deuxième partie)
      t += dt;
      if (!handed && !ready && t > tHand()) t = tHand(); // préparation pas finie : on attend à l'abord du cœur
      render(dt);
      if (!handed && ready && t >= tHand()) handoff();
      if (t >= tHand() + T_FADE) finish();
    },
    stop() { if (!playing) return; done = null; held = false; finish(); },
    hold(v) { held = v; },
    seek(s) { if (playing) { t = s; render(-1); } }, // débogage
    frame: { K, OX, OY },
  };
}
