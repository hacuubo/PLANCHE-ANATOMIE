// Images sources des icônes et écrans de démarrage natifs (iOS et Android), dessinées par Edge sans interface
// à partir de icons/icon.svg (même procédé que tools/make-icons.mjs). Écrit app/assets/*.png, que
// « npx @capacitor/assets generate » décline ensuite dans toutes les tailles des projets ios/ et android/.
// Usage (depuis le dossier du site) : node app/scripts/make-native-assets.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { openBrowser } from '../../tools/lib/edge.mjs';

const svg = readFileSync('icons/icon.svg', 'utf8');
const GROUPE = '<g transform="translate(100 100) scale(.98) translate(-104 -115)">';
if (!svg.includes(GROUPE)) throw new Error('icons/icon.svg : groupe du dessin introuvable');
const FOND_PAGE = '#e8edf3'; // background_color du manifeste, repris par capacitor.config.json

// fond plein sans arrondi (iOS et Android découpent eux-mêmes), dessin ramené à « echelle » autour du centre
const pleine = (echelle, sansDessin = false) => {
  let s = svg.replace(/(<rect id="fond"[^>]*?)rx="44"/, '$1rx="0"');
  if (sansDessin) return s.replace(/<g transform="translate\(100 100\) scale\(\.98\)[\s\S]*<\/svg>/, '</svg>');
  return s.replace(GROUPE, `<g transform="translate(100 100) scale(${echelle}) translate(-100 -100)">${GROUPE}`).replace('</svg>', '</g></svg>');
};
const page = (taille, source, fond = '#000', logo = taille) =>
  `<!doctype html><html><body style="margin:0;width:${taille}px;height:${taille}px;background:${fond};display:grid;place-items:center">` +
  source.replace('<svg ', `<svg width="${logo}" height="${logo}" `) + '</body></html>';

const SORTIES = [
  ['icon-only.png', 1024, page(1024, pleine(0.92))],             // iOS (1024, opaque) et anciennes icônes Android
  ['icon-foreground.png', 1024, page(1024, pleine(0.6))],        // Android adaptative : dessin dans la zone sûre (66/108)
  ['icon-background.png', 1024, page(1024, pleine(1, true))],    // Android adaptative : fond dégradé seul
  ['splash.png', 2732, page(2732, svg, FOND_PAGE, 640)],         // tuile arrondie au centre, fond de l'appli
  ['splash-dark.png', 2732, page(2732, svg, FOND_PAGE, 640)],
];

mkdirSync('app/assets', { recursive: true });
const nav = await openBrowser();
try {
  for (const [fichier, taille, html] of SORTIES) {
    const p = await nav.page(taille, taille);
    await p.html(html);
    writeFileSync(`app/assets/${fichier}`, await p.png());
    await p.close();
    console.log(`app/assets/${fichier}`);
  }
} finally {
  await nav.close();
}
