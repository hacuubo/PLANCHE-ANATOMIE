// Convertit assets/heart.bin du format HRT2 au format compact HRT3 (tools/lib/hrt-codec.mjs), sans régénérer le
// modèle. Le générateur (tools/build-heart-bp3d.mjs) écrit directement du HRT3.
//   node tools/pack-heart.mjs [fichier]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { toHRT3 } from './lib/hrt-codec.mjs';

const file = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'heart.bin');
const src = fs.readFileSync(file), out = toHRT3(src);
fs.writeFileSync(file, out);
const gz = (b) => (zlib.gzipSync(b, { level: 9 }).length / 1048576).toFixed(2);
console.log(`${path.basename(file)} : ${(src.length / 1048576).toFixed(2)} → ${(out.length / 1048576).toFixed(2)} Mo (gzip ${gz(src)} → ${gz(out)} Mo)`);
