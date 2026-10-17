// Génère icons/og-image.png (1200 × 630), l'image des aperçus de lien (Open Graph, réseaux, messageries).
// 1. Fait dessiner le cœur en coupe 5 cavités par l'appli elle-même (Edge sans interface, tools/lib/edge.mjs),
//    interface masquée et fond transparent, en haute densité (fenêtre portrait : cœur entier dans le cadre).
// 2. Compose la carte : fond studio, logo (icons/icon.svg sans sa tuile), titre, boutons Coupe / Valves /
//    Circulation, adresse du site ; le cœur est recadré sur ses pixels opaques et placé à droite.
// Usage : servir le dépôt (npx --yes http-server . -p 8765 -c-1) puis node tools/make-og.mjs [adresse locale]
import { readFileSync, writeFileSync } from 'node:fs';
import { openBrowser, sleep } from './lib/edge.mjs';

const APP = process.argv[2] || 'http://localhost:8765/';
const SITE = 'cardioexplain.com';

const icone = readFileSync('icons/icon.svg', 'utf8');
const marque = icone.replace(/<rect id="fond"[^>]*\/>/, '').replace('viewBox="0 0 200 200"', 'viewBox="36 30 128 140" width="40" height="44"');

const nav = await openBrowser();
try {
  // 1. rendu du cœur
  const app = await nav.page(700, 1000, 2); // en portrait, l'appli recule la caméra : le cœur entre en entier
  await app.goto(APP);
  await app.waitFor('document.querySelector("#scene.ready")');
  await app.eval('document.querySelector("[data-toggle=coupe]").click()');
  await sleep(9000);
  await app.eval(`(() => {
    const s = document.createElement('style');
    s.textContent = '.topbar,.tools,.bottombar,.labels{visibility:hidden!important}'
      + '.scene,body{background:none!important}body::before{display:none!important}';
    document.head.appendChild(s);
  })()`);
  await sleep(600);
  const rendu = (await app.png()).toString('base64');
  await app.close();

  // 2. composition
  const carte = await nav.page(1200, 630, 1);
  await carte.html(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&family=Source+Serif+4:wght@600&display=swap">
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative; color: #14213a;
    font-family: 'Source Sans 3', sans-serif;
    background: radial-gradient(110% 100% at 72% 50%, #f6f8fb 0%, #e3e9f0 50%, #cdd7e3 100%); }
  .coeur { position: absolute; right: 30px; top: 35px; width: 560px; height: 560px; }
  .coeur img { position: absolute; }
  .texte { position: absolute; left: 64px; top: 64px; bottom: 64px; width: 560px; display: flex; flex-direction: column; gap: 28px; }
  .marque { display: flex; align-items: center; gap: 12px; font-family: 'Source Serif 4', serif; font-weight: 600; font-size: 28px; }
  h1 { margin: 0; font-family: 'Source Serif 4', serif; font-weight: 600; font-size: 58px; line-height: 1.03; letter-spacing: -1px; }
  .boutons { display: flex; gap: 8px; }
  .boutons span { border-radius: 999px; padding: 9px 18px; font-size: 17px; font-weight: 600; background: #fff; border: 1px solid #b9c4d3; }
  .boutons span:first-child { background: #14213a; border-color: #14213a; color: #fff; }
  .site { margin-top: auto; font-size: 22px; font-weight: 600; color: #34405a; }
</style></head><body>
  <div class="coeur"><img id="rendu" alt="" src="data:image/png;base64,${rendu}"></div>
  <div class="texte">
    <div class="marque">${marque}Planche cœur</div>
    <h1>Le cœur en 3D, pour l’expliquer aux patients.</h1>
    <div class="boutons"><span>Coupe</span><span>Valves</span><span>Circulation</span></div>
    <div class="site">${SITE}</div>
  </div>
  <script>
    // recadrage sur les pixels opaques du cœur (les vaisseaux fantômes, translucides, ne comptent pas)
    const img = document.getElementById('rendu');
    img.decode().then(() => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const { data } = g.getImageData(0, 0, c.width, c.height);
      let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2)
        if (data[(y * c.width + x) * 4 + 3] > 230) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 - x0 < 200 || y1 - y0 < 200) { window.pret = "vide"; return; } // contexte WebGL perdu : rendu vide
      const k = 540 / Math.max(x1 - x0, y1 - y0);
      img.style.width = c.width * k + 'px';
      img.style.left = (280 - (x0 + x1) / 2 * k) + 'px';
      img.style.top = (280 - (y0 + y1) / 2 * k) + 'px';
      window.pret = true;
    });
  </script>
</body></html>`);
  await carte.waitFor('window.pret');
  if (await carte.eval('window.pret') === 'vide') throw new Error('Rendu du cœur vide (contexte WebGL perdu ?)');
  await sleep(300);
  writeFileSync('icons/og-image.png', await carte.png());
  await carte.close();
  console.log('icons/og-image.png');
} finally {
  await nav.close();
}
