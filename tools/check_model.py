"""Contrôle du modèle du cœur : maillages fermés (solides de coupe), différences avec l'ancien modèle,
cloison interauriculaire (creux du sillon) et abouchement des veines caves.
Comparer deux versions du modèle après une régénération (tools/build-heart-bp3d.mjs) :
  node tools/hrt-export.mjs <ancien heart.bin> <dossier A> ; node tools/hrt-export.mjs assets/heart.bin <dossier B>
  python tools/check_model.py <dossier A> <dossier B>
Dépendances : numpy, scipy, trimesh, rtree (pip install numpy scipy trimesh rtree)."""
import json, sys
import numpy as np
import trimesh
from scipy.spatial import cKDTree

def load(d):
    idx = json.load(open(f"{d}/index.json"))
    out = {}
    for m in idx["meshes"]:
        p = np.fromfile(f"{d}/{m['name']}.pos", dtype=np.float32).reshape(-1, 3)
        t = np.fromfile(f"{d}/{m['name']}.idx", dtype=np.uint32).reshape(-1, 3)
        sid = np.fromfile(f"{d}/{m['name']}.sid", dtype=np.uint8) if m["sid"] else None
        out[m["name"]] = (trimesh.Trimesh(p, t, process=False), sid)
    return out, idx["ids"]

old, ids = load(sys.argv[1])
new, ids2 = load(sys.argv[2])
print("== maillages (sommets ancien → nouveau, fermé, écart max à l'ancien en mm)")
for name in new:
    m = new[name][0]
    mm = trimesh.Trimesh(m.vertices, m.faces); mm.merge_vertices(digits_vertex=4)  # sommets soudés pour l'étanchéité
    o = old.get(name)
    if o is None:
        print(f"  {name}: nouveau"); continue
    d, _ = cKDTree(o[0].vertices).query(m.vertices)
    print(f"  {name:32s} {len(o[0].vertices):6d} → {len(m.vertices):6d}  arêtes libres={int((np.unique(np.sort(mm.edges, axis=1), axis=0, return_counts=True)[1] == 1).sum()):4d}  écart max {d.max()*10:6.2f}  >0,5 mm : {(d > 0.05).mean()*100:5.1f} %")

# cloison : le long de la normale au septum, autour de la fosse, nombre de faces de l'enveloppe entre les deux
# endocardes (2 = creux du sillon ; 0 = cloison pleine)
def septum_gap(meshes, label):
    cav, sid = meshes["cavites"]
    v = cav.vertices
    ra, la = v[sid == ids.index("oreillette-droite")], v[sid == ids.index("oreillette-gauche")]
    d, j = cKDTree(la).query(ra)
    thin = d < d.min() + 0.25
    F, Q = ra[thin].mean(0), la[j[thin]].mean(0)
    n = (Q - F) / np.linalg.norm(Q - F); M = (F + Q) / 2
    up = np.array([0, 1, 0.]) - n * n[1]; up /= np.linalg.norm(up); ant = np.cross(up, n)
    env = meshes["enveloppe"][0]
    origins, dirs, cells = [], [], []
    for u in np.arange(-2, 2.01, 0.25):
        for w in np.arange(-2, 2.01, 0.25):
            origins.append(M + ant * u + up * w - n * 0.6); dirs.append(n); cells.append((u, w))
    loc, ray, _ = env.ray.intersects_location(np.array(origins), np.array(dirs), multiple_hits=True)
    cnt = np.zeros(len(origins), int)
    for p, r in zip(loc, ray):
        t = np.dot(p - origins[r], n)
        if 0.3 < t < 1.0: cnt[r] += 1  # entre les deux endocardes (≈ ±0,3 cm autour du milieu)
    gap = [(c, k) for c, k in zip(cells, cnt) if k >= 2]
    r = [np.hypot(*c) for c, _ in gap]
    print(f"== cloison ({label}) : {len(gap)} points de la grille (pas 2,5 mm, ±2 cm) avec le creux du sillon ;"
          f" le plus proche de la fosse à {min(r) if r else float('nan'):.2f} cm")
septum_gap(old, "ancien"); septum_gap(new, "nouveau")

# veines caves : sommets de la cavité étiquetés veine cave, étendue en y
cav, sid = new["cavites"]
for name in ("veine-cave-superieure", "veine-cave-inferieure", "oreillette-droite"):
    k = ids.index(name); p = cav.vertices[sid == k]
    if len(p): print(f"== cavité « {name} » : {len(p)} sommets, y de {p[:,1].min():.2f} à {p[:,1].max():.2f}")
    else: print(f"== cavité « {name} » : aucun sommet")
