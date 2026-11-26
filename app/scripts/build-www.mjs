// Copie le site (dossier parent) dans app/www pour l'application iOS / Android,
// en remplaçant tout ce qui venait d'Internet par des fichiers embarqués :
//   - three.js (cdn.jsdelivr.net)  → www/vendor/three/
//   - polices Source Sans 3 / Source Serif 4 (fonts.googleapis.com) → www/vendor/fonts/
// Le site lui-même n'est pas modifié. Usage : npm run www (depuis app/).
import { cp, mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(APP, '..');
const WWW = join(APP, 'www');
const NM = join(APP, 'node_modules');

const SITE_FILES = ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets', 'icons'];
const THREE_FILES = [
  'build/three.module.js',
  'examples/jsm/controls/OrbitControls.js',
  'examples/jsm/renderers/CSS2DRenderer.js',
  'examples/jsm/environments/RoomEnvironment.js',
];
// police → graisses et styles réellement employés par css/style.css et index.html
const FONTS = {
  'source-sans-3': ['400', '600', '700'],
  'source-serif-4': ['400', '600', '400-italic'],
};
const SUBSETS = ['latin', 'latin-ext']; // français et anglais

await rm(WWW, { recursive: true, force: true });
await mkdir(WWW, { recursive: true });

// 1. le site
for (const f of SITE_FILES) await cp(join(SITE, f), join(WWW, f), { recursive: true });

// 2. three.js
for (const f of THREE_FILES) {
  await mkdir(dirname(join(WWW, 'vendor/three', f)), { recursive: true });
  await cp(join(NM, 'three', f), join(WWW, 'vendor/three', f));
}
await cp(join(NM, 'three/LICENSE'), join(WWW, 'vendor/three/LICENSE'));

// 3. polices : on ne garde que les blocs @font-face latin / latin-ext, en woff2
let fontCss = '/* Source Sans 3 et Source Serif 4, licence SIL Open Font License 1.1 (fontsource) */\n';
await mkdir(join(WWW, 'vendor/fonts/files'), { recursive: true });
for (const [font, variants] of Object.entries(FONTS)) {
  for (const v of variants) {
    const css = await readFile(join(NM, '@fontsource', font, `${v}.css`), 'utf8');
    const blocks = css.split(/(?=\/\* )/).filter((b) => SUBSETS.some((s) => b.startsWith(`/* ${font}-${s}-`) && /-(normal|italic) \*\//.test(b.split('\n')[0]) && b.startsWith(`/* ${font}-${s}-${v.replace('-italic', '')}-`)));
    if (blocks.length !== SUBSETS.length) throw new Error(`police ${font} ${v} : ${blocks.length} blocs trouvés`);
    for (const b of blocks) {
      const file = b.match(/url\(\.\/files\/([^)]+\.woff2)\)/)[1];
      await cp(join(NM, '@fontsource', font, 'files', file), join(WWW, 'vendor/fonts/files', file));
      fontCss += b.replace(/src: [^;]+;/, `src: url(./files/${file}) format('woff2');`).trimEnd() + '\n\n';
    }
  }
  await cp(join(NM, '@fontsource', font, 'LICENSE'), join(WWW, 'vendor/fonts', `LICENSE-${font}`));
}
await writeFile(join(WWW, 'vendor/fonts/fonts.css'), fontCss);

// 4. index.html : adresses locales (chaque remplacement doit avoir lieu)
let html = await readFile(join(WWW, 'index.html'), 'utf8');
const swap = (re, by, what) => {
  const before = html;
  html = html.replace(re, by);
  if (html === before) throw new Error(`index.html : ${what} introuvable`);
};
swap(/[ \t]*<link rel="preconnect"[^>]*>\r?\n/g, '', 'preconnect');
swap(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="vendor/fonts/fonts.css">', 'feuille Google Fonts');
swap(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.169\.0\//g, './vendor/three/', 'importmap three.js');
await writeFile(join(WWW, 'index.html'), html);

// 5. contrôle : plus aucune ressource chargée depuis Internet
const leaks = [];
async function scan(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!p.includes('vendor')) await scan(p); continue; }
    if (!/\.(html|css|js|json|webmanifest)$/.test(e.name)) continue;
    const t = await readFile(p, 'utf8');
    for (const m of t.matchAll(/(?:src=|href=|url\(|from |import\(|fetch\()\s*["'`]?(https?:\/\/[^"'`)\s]+)/g)) {
      if (!/<a [^>]*$/.test(t.slice(Math.max(0, m.index - 200), m.index)) && !/rel="canonical"|property="og:/.test(t.slice(Math.max(0, m.index - 60), m.index))) leaks.push(`${relative(WWW, p)} → ${m[1]}`);
    }
  }
}
await scan(WWW);
if (leaks.length) { console.error('Ressources encore chargées depuis Internet :\n' + leaks.join('\n')); process.exit(1); }
console.log('www/ prêt : site copié, three.js et polices embarqués, aucune ressource distante.');
