// Génère assets/planche/ : la planche du corps entier de l'introduction des animations de pose (js/route-intro.js) —
// réseau de la grande circulation et cœur du modèle rendus ensemble en 3D (js/app.js, heartPlate) — en deux images
// WebP (corps entier, tronc plus fin) et leur description (planche.json : emprise de chaque image en cm, extrémités des
// gros vaisseaux du modèle). L'appli les charge au démarrage au lieu de faire ce rendu au premier lancement.
// À relancer après toute modification du modèle, du réseau (vesselNetwork) ou du rendu de la planche.
// Usage : servir le dépôt (npx --yes http-server . -p 8765 -c-1) puis node tools/make-plate.mjs [adresse locale]
import { writeFileSync, mkdirSync } from 'node:fs';
import { openBrowser } from './lib/edge.mjs';

const APP = process.argv[2] || 'http://localhost:8765/';
const NAMES = ['corps', 'tronc'];

const nav = await openBrowser();
try {
  const app = await nav.page(900, 700, 1);
  await app.goto(APP + '?planche=' + Date.now());
  await app.waitFor('document.querySelector("#scene.ready") && window.__planche', 300000);
  const plate = await app.eval('window.__planche.renderPlate("image/webp")');
  mkdirSync('assets/planche', { recursive: true });
  const images = plate.images.map((im, i) => {
    const src = `${NAMES[i]}.webp`, buf = Buffer.from(im.url.split(',')[1], 'base64');
    writeFileSync(`assets/planche/${src}`, buf);
    console.log(`assets/planche/${src}`, Math.round(buf.length / 1024), 'Ko');
    return { src, rect: im.rect };
  });
  const r2 = (v) => (Array.isArray(v) ? v.map(r2) : typeof v === 'number' ? Math.round(v * 1000) / 1000 : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, r2(x)])));
  writeFileSync('assets/planche/planche.json', JSON.stringify({ images, ends: r2(plate.ends) }, null, 1) + '\n');
  console.log('assets/planche/planche.json');
} finally { await nav.close(); }
