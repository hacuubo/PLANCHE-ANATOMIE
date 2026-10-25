// Format compact du modèle (assets/heart.bin, HRT3) : même contenu que HRT2, codé pour que la compression gzip du
// serveur porte mieux (≈ 2,6 Mo transférés au lieu de 5,1) :
//   - normales retirées : recalculées dans le navigateur à partir des triangles (identiques, cosinus moyen 0,9999) ;
//   - positions quantifiées (16 bits) codées en écart au sommet précédent, octets faibles puis octets forts ;
//   - indices codés en écart au plus grand indice déjà vu (+1), zigzag, puis entiers de longueur variable (7 bits).
// En-tête : 'HRT3', longueur de l'en-tête JSON, longueur totale du fichier (barre de progression du chargement).
// Décodage : js/heart.js (loadHeartData).

const zz = (d) => (d << 1) ^ (d >> 31);

export function encodePositions(q) {
  const n = q.length, out = new Uint8Array(n * 2);
  for (let i = 0; i < n; i++) { const d = (q[i] - (i >= 3 ? q[i - 3] : 0)) & 0xffff; out[i] = d & 255; out[n + i] = d >> 8; }
  return out;
}

export function encodeIndices(idx) {
  const out = []; let hi = 0;
  for (const i of idx) {
    let v = zz(hi - i) >>> 0;
    while (v >= 0x80) { out.push((v & 0x7f) | 0x80); v >>>= 7; }
    out.push(v);
    if (i + 1 > hi) hi = i + 1;
  }
  return Uint8Array.from(out);
}

// HRT2 (Buffer) → HRT3 (Buffer). Les autres tableaux (couleurs, tissus, structures, carte de la paroi) sont recopiés.
export function toHRT3(buf) {
  const magic = buf.toString('ascii', 0, 4);
  if (magic === 'HRT3') return buf;
  if (magic !== 'HRT2') throw new Error(`format ${magic} inattendu`);
  const hl = buf.readUInt32LE(4), header = JSON.parse(buf.toString('utf8', 8, 8 + hl)), base = 8 + hl;
  const arr = (T, [off, len]) => new T(buf.buffer.slice(buf.byteOffset + base + off, buf.byteOffset + base + off + len * T.BYTES_PER_ELEMENT));
  const chunks = []; let offset = 0;
  const push = (typed) => { const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength); const pad = (4 - (b.length % 4)) % 4; const at = offset; chunks.push(b, Buffer.alloc(pad)); offset += b.length + pad; return [at, typed.length]; };
  const meshes = header.meshes.map((m) => {
    const { pos, nor, idx, idx32, ...rest } = m;
    const out = { ...rest, idx32, icount: idx[1] };
    out.pos = push(encodePositions(arr(Uint16Array, pos)));
    out.idx = push(encodeIndices(arr(idx32 ? Uint32Array : Uint16Array, idx)));
    for (const k of ['col', 'tis', 'sid']) if (m[k]) out[k] = push(arr(Uint8Array, m[k]));
    return out;
  });
  const vols = {};
  for (const [k, v] of Object.entries(header.volumes || {})) vols[k] = { ...v, data: push(arr(Uint8Array, v.data)) };
  const h3 = { ...header, version: 3, meshes, volumes: vols };
  const hb = Buffer.from(JSON.stringify(h3), 'utf8'), hpad = (4 - ((12 + hb.length) % 4)) % 4;
  const pre = Buffer.alloc(12); pre.write('HRT3', 0, 'ascii'); pre.writeUInt32LE(hb.length + hpad, 4);
  const body = Buffer.concat([hb, Buffer.alloc(hpad, 0x20), ...chunks]);
  pre.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([pre, body]);
}
