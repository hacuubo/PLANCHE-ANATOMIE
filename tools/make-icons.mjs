// Génère les icônes PNG à partir de icons/icon.svg (coupe 4 cavités) en le faisant dessiner par Edge sans interface
// (tools/lib/edge.mjs) : icon-192 et icon-512 (tuile arrondie, coins transparents), icon-512-maskable (fond plein,
// dessin réduit dans le cercle de sécurité de 80 %), apple-touch-icon (180 px, fond plein : iOS arrondit lui-même).
// Usage : node tools/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { openBrowser } from './lib/edge.mjs';

const svg = readFileSync('icons/icon.svg', 'utf8');
const GROUPE = '<g transform="translate(100 100) scale(.98) translate(-104 -115)">';
if (!svg.includes(GROUPE)) throw new Error('icons/icon.svg : groupe du dessin introuvable');

// fond plein (sans arrondi) et dessin réduit autour du centre
function pleine(echelle) {
  return svg
    .replace(/(<rect id="fond"[^>]*?)rx="44"/, '$1rx="0"')
    .replace(GROUPE, `<g transform="translate(100 100) scale(${echelle}) translate(-100 -100)">${GROUPE}`)
    .replace('</svg>', '</g></svg>');
}
const page = (taille, source) => `<!doctype html><html><body style="margin:0">${source.replace('<svg ', `<svg width="${taille}" height="${taille}" `)}</body></html>`;

const SORTIES = [
  ['icons/icon-192.png', 192, svg],
  ['icons/icon-512.png', 512, svg],
  ['icons/icon-512-maskable.png', 512, pleine(0.86)],
  ['icons/apple-touch-icon.png', 180, pleine(0.92)],
];

const nav = await openBrowser();
try {
  for (const [fichier, taille, source] of SORTIES) {
    const p = await nav.page(taille, taille);
    await p.html(page(taille, source));
    writeFileSync(fichier, await p.png());
    await p.close();
    console.log(fichier);
  }
} finally {
  await nav.close();
}
