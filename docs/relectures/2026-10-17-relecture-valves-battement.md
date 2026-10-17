# Relecture : valves paramétriques et battement physiologique

- Date : 17 octobre 2026
- Relecteur : anatomiste, directeur artistique en illustration médicale et relecteur de code three.js, indépendant (aucune modification du code)
- Périmètre : les commits locaux `ffba51c` (étape 1 : `js/valves.js`, `tools/lib/valve-landmarks.mjs`, sections « 8 bis » et « 8 ter » de `tools/build-heart-bp3d.mjs`, matériaux de `js/heart.js`, `interiorPlane` de `js/app.js`) et `8f70813` (étape 2 : `GLSL_DEFORM`, `heartDeform`, `deformPoint`, `cycle()`, `setBeat()`, boucle d'animation, `update(open, xf)`). Captures `v8-01` à `v8-05`, comparées à `v7-02`. Référence visée : animation Nucleus « Heart anatomy / cardiac cycle ».
- Limites : je n'ai pas pu lancer l'application et les captures font 800 px de large. Pour compenser, j'ai :
  - lu l'en-tête de `assets/heart.bin` (repères `valves`, `frame`) ;
  - calculé le nombre d'enroulement (winding number) de l'enveloppe et des cavités le long des axes valvulaires ;
  - exécuté `js/valves.js` et une copie conforme de `deformPoint` / `cycle()` dans Node, sur tout le cycle (longueur des cordages, déplacements, coaptation).

  Ces scripts jetables sont placés hors du dépôt. Les points marqués « à confirmer » relèvent du raisonnement sur le code, sans capture probante.
- Repère : coordonnées de l'application en cm (x vers la gauche du patient, y vers le haut, z vers l'avant).
- Gravité : **BLOQUANT** = trompeur pour un patient, faux anatomiquement ou bug visible ; **IMPORTANT** = visible et gênant ; **SOUHAITABLE** = rapproche du rendu Nucleus.

## 1. Verdict

Le saut par rapport à v7 est réel. En diastole (v8-02), on lit enfin des valves auriculo-ventriculaires : des feuillets crème suspendus à l'anneau, des cordages blancs en éventail et des piliers. L'anatomie de base est juste :
- 2 feuillets mitraux et 3 tricuspides, festons P1-P3 ;
- feuillet mitral antérieur tourné vers la valve aortique (22° d'écart, rideau mitro-aortique de 4,4 mm) ;
- anneau mitral en selle, orienté correctement ;
- 3 cuspides sigmoïdes par valve, bien nommées et bien placées (cuspide antérieure = coronaire droite, en avant ; non coronaire en arrière et à droite) ;
- chaque pilier mitral alimente les deux feuillets.

La chronologie des **valves** est correcte : la mitrale et la tricuspide se ferment (phase 0,12 à 0,16) avant l'ouverture des sigmoïdes (0,17 à 0,21). La déformation processeur est identique, ligne à ligne, à celle du shader. La matrice du modèle est l'identité (pivot +CENTER, racine −CENTER) et la raideur des têtes de piliers est la même (0,15). **Les cordages ne se détachent donc jamais réellement des piliers ni des feuillets.**

Trois défauts restent bloquants :
1. **Une bande de « muscle coupé » ferme les orifices mitral et tricuspide en coupe.** Elle masque les valves fermées en systole : c'est elle qui fait « flotter » les cordages sur v8-03. Elle laisse aussi croire au patient qu'un mur sépare l'oreillette du ventricule (§ B1).
2. **Un clic dans une cavité coupée provoque une erreur JavaScript.** Or, dans la coupe par défaut, un clic sur la valve mitrale aboutit précisément là (§ B2).
3. **Les ombres sont calculées sur le cœur au repos.** Pendant le battement, la face éclairée passe dans sa propre ombre à chaque systole (§ B3).

Côté physiologie, le défaut principal est le déphasage du **mouvement ventriculaire** par rapport aux valves (§ I1). Le ventricule commence à se relâcher alors que la valve aortique est encore ouverte. Il se regonfle ensuite presque entièrement pendant que les quatre valves sont fermées, puis reste immobile pendant le remplissage.

## 2. Bloquants

**B1. Une bande opaque de « tranche de muscle » barre les orifices mitral et tricuspide** (v8-02, v8-03, et déjà v7-02 : bandeau rose pâle à bords droits sous les oreillettes, précédé d'une fente sombre).

*Diagnostic.* J'ai calculé le nombre d'enroulement de `enveloppe` et de `cavites`, depuis le centre paramétrique de chaque valve, le long de son axe :

| Position sur l'axe (cm, + = vers le ventricule) | −0,5 | −0,25 | 0 → +1,25 (mitrale) / 0 → +1,0 (tricuspide) | ≥ +1,5 |
|---|---|---|---|---|
| Dans une cavité | oui | **non** (mitrale) | oui | oui |
| Dans l'enveloppe | oui | **non** | **non** | oui |
| Compte de stencil « myo » (enveloppe − cavité) | 0 | 0 → fente sombre | **−1 → capuchon dessiné** | 0 |

Le test `NotEqualStencilFunc` (`js/app.js:152`) dessine donc la tranche de muscle sur 1 à 1,25 cm de hauteur, en travers de l'entrée des ventricules. Deux causes :
- **Les cylindres de `baseCut` partent du centre brut de la valve.** Dans `tools/build-heart-bp3d.mjs:66-78`, `VC.mitral` et `VC.tricus` sont les barycentres des maillages BodyParts3D (feuillets + cordages), situés environ 1,5 cm plus bas que l'anneau. Le myocarde ventriculaire est ainsi retiré dans le premier centimètre du ventricule.
- **L'enveloppe ne contient pas toujours les cavités** (`field`, l. 246-256). De plus, les cavités BodyParts3D de l'oreillette et du ventricule ne se touchent pas à l'orifice (l. 295).

*Conséquences.*
- En systole (v8-03), les feuillets fermés sont au niveau de l'anneau, donc derrière ce capuchon. On ne voit que la partie inférieure des cordages, qui semblent sortir de la bande et ne mener nulle part (VD surtout).
- La partie des valves située devant le plan de coupe (mitrale : centre à +0,68 cm devant le plan) est dessinée par-dessus la tranche. Elle forme la grande nappe jaune continue de v8-03.

*Correctif (génération du modèle).*
1. **Ouvrir les orifices AV dans les cavités** :
   - calculer les modèles `avModel` de la section 8 ter **avant** la section 6 (ils ne dépendent que de `cav`, `S` et des pièces) ;
   - ajouter, pour chaque valve AV, un cylindre d'orifice à la réunion des cavités :
   ```js
   const orifice = (v) => { const Rm = (v.radii[0] + v.radii[1]) / 2; return (x, y, z) => {
     const q = v3.sub([x, y, z], v.center), al = v3.dot(q, v.axis), r = v3.len(v3.sub(q, v3.mul(v.axis, al)));
     return Math.max(r - 0.85 * Rm, Math.abs(al - 0.3) - 0.9); }; };   // de −0,6 à +1,2 cm le long de l'axe
   const ORI = [orifice(AV.mitrale), orifice(AV.tricuspide)];
   const cavField = (x, y, z) => Math.min(S.VG.query(x, y, z, 2), S.VD.query(x, y, z, 2), S.OGc.query(x, y, z, 2), S.ODc.query(x, y, z, 2), ...ORI.map((f) => f(x, y, z)));
   ```
2. **Garantir « cavités ⊂ enveloppe »** : définir `cavField` avant `field`, puis terminer `field` par `return Math.min(f, cavField(x, y, z) + 0.12);`.
3. **Corriger `BASE_CUTS`** : les cylindres mitral et tricuspide doivent partir du **centre paramétrique** de l'anneau, avec un décalage de 0,1 cm (au lieu de `VC.*` + 0,35).
4. **Ajouter un contrôle au journal de génération** : la part des sommets de `cavites`, décalés de 1 mm vers l'intérieur, pour laquelle `field < 0`. Elle doit valoir 100 %.

*Vérification immédiate, sans régénérer.* Dans la console, en coupe Grand axe, exécuter :
`__planche.scene.children.filter((o) => o.userData.capKey === 'myo').forEach((c) => (c.visible = false))`. La bande doit disparaître et les feuillets fermés réapparaître.

**B2. Un clic dans une cavité coupée provoque une erreur, et les valves vues devant la tranche ne sont pas cliquables.**
- `js/heart.js:471-473` donne au maillage des cavités l'identifiant `'cavites'`, et `pickId` (`heart.js:571`) le renvoie tel quel. Or `'cavites'` n'est pas une clé de `STRUCTURES`. Le clic aboutit donc à `select('cavites')`, puis `renderFiche` → `numHtml` → `STRUCTURES[id].couleur`. Résultat : TypeError, fiche non mise à jour et tiroir mobile non ouvert. Ce défaut existait déjà, mais l'étape 1 l'aggrave.
- `js/app.js:390` (et `:558` pour les étiquettes) écarte tout impact où `cutPlane.distanceToPoint(h.point) < 0`. Or les feuillets, cordages et piliers restent **dessinés** jusqu'à `interiorPlane`, 1,6 cm plus loin. Dans la coupe par défaut, le centre de la mitrale est à +0,68 cm du côté retiré : un clic sur la valve mitrale traverse la valve, touche la paroi du fond de la cavité et déclenche l'erreur. On ne peut pas ouvrir la fiche « Valve mitrale » en cliquant dessus.

*Correctif :*
```js
// heart.js, bloc des cavités
cav.userData.sid = sid;
// heart.js:571
const pickId = (mesh, p, face) => mesh.userData.proxy ? ids[proxySid[face.a]] : mesh.userData.sid ? ids[mesh.userData.sid[face.a]] : mesh.userData.id;
// app.js:390 (et de même app.js:558)
const plane = h.object.material.userData?.interior ? interiorPlane : cutPlane;
if (state.coupe && plane.distanceToPoint(h.point) < 0) continue;
// app.js:363, en tête de select()
if (id && !STRUCTURES[id]) id = null;
```

**B3. Les ombres sont calculées sur la géométrie au repos** (`js/heart.js:112`, `:403` ; `js/app.js:591`).
- `onBeforeCompile` ne s'applique pas au matériau de profondeur de l'ombre. Three r169 utilise son propre `MeshDepthMaterial`, et `customDepthMaterial` n'est jamais renseigné.
- L'enveloppe (`castShadow` et `receiveShadow`, l. 434) projette donc l'ombre du cœur **au repos**. En systole, la paroi déformée recule de 2 à 2,5 mm vers l'axe (k = 0,07 × rayon ≈ 3,5 cm), alors que le `normalBias` ne vaut que 0,35 mm. La face éclairée par la lampe principale passe dans sa propre ombre à chaque battement, et ce plongeon dans le sombre est cadencé. Il en va de même pour les piliers (k = 0,15) et pour l'ombre des parois sur les valves.
- Le mécanisme est certain ; son ampleur est à confirmer en vue de face, battement actif (comparer les phases 0,3 et 0,75).

*Correctif :* un matériau de profondeur déformé par matériau de tissu.
```js
// heart.js, dans tissue(), après la création de m
if (deformOn) m.userData.depthMat = addDeformTo(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), deformU, deformK);
// heart.js, avant le return de buildHeart
root.traverse((o) => { if (o.isMesh && o.material?.userData?.depthMat) o.customDepthMaterial = o.material.userData.depthMat; });
```
Three r169 recopie `side` et `clippingPlanes` du matériau d'origine sur le matériau d'ombre choisi. Sinon, les synchroniser dans `applyClipping`.

## 3. Importants

| # | Structure / capture | Problème | Correctif |
|---|---|---|---|
| I1 | Cycle, `js/heart.js:537-543` | La chronologie des valves est bonne, **pas celle du ventricule**. `ven` atteint 1 dès 0,30, se relâche de 0,37 à 0,53 alors que l'aortique est encore ouverte jusqu'à 0,42. Il retombe de 0,59 à 0,09 pendant la relaxation isovolumique (0,44 → 0,50, quatre valves fermées), puis vaut 0 pendant tout le remplissage rapide : le ventricule se regonfle sans que le sang entre, puis reste figé quand la mitrale s'ouvre. Autres écarts : éjection de 211 ms au lieu d'environ 300 ms à 64/min (Weissler), systole mécanique de 258 ms au lieu de 350 à 380 ms, contraction isovolumique d'environ 28 ms au lieu de 40 à 60 ms. | Remplacer `cycle` par la version ci-dessous. Elle donne une systole auriculaire de 0 à 112 ms, une fermeture AV à 0,11-0,15, une contraction isovolumique d'environ 45 ms, une éjection d'environ 295 ms, une relaxation isovolumique d'environ 70 ms, puis le remplissage rapide et le diastasis. Le volume diminue pendant l'éjection et augmente pendant le remplissage. Voir le code après le tableau. |
| I2 | Ombres, `js/app.js:205-216` et `:504` | Depuis `shadowMap.autoUpdate = false`, ni le changement de mode de coupe (`setCutMode`) ni le curseur de profondeur ne demandent de nouvelles ombres. Avec `clipShadows`, la partie retirée continue de projeter son ombre (ou l'ombre manque), jusqu'au prochain `toggle`. | Ajouter `renderer.shadowMap.needsUpdate = true;` dans `setCutMode` et dans le gestionnaire `input` du curseur. |
| I3 | Contraction auriculaire, `heart.js:106-109` et `:528-530` | Le choix du centre `dRA < dLA ? uDRA : uDLA` est discontinu. À l'apogée de la systole auriculaire, deux points distants de 0,2 mm de part et d'autre du plan médiateur s'écartent de **3,6 mm** (valeur mesurée) : un pli ou une déchirure dans le septum interauriculaire et la racine aortique, qui sont tous deux dans la zone (`wAt` ≈ 0,8 à 1). De plus, le masque `s < 0,1` (le long de l'axe du VG) inclut la base des ventricules : la chambre d'admission du VD se contracte avec l'oreillette. | Mélange continu : `float wR = smoothstep(-0.8, 0.8, dLA - dRA); vec3 d = wR * (o - uDRA) + (1.0 - wR) * (o - uDLA); return o - d * (0.08 * uDAt * wAt);` (même chose dans `deformPoint`). Pour l'enveloppe et les cavités, prendre le poids auriculaire dans l'attribut `tis.z` (oreillette = 1), qui existe déjà, au lieu de `s`. |
| I4 | Cordages, `js/valves.js:171-183` | Les cordages sont des cylindres droits recalculés à chaque image entre la tête et le feuillet. Ils **s'allongent et raccourcissent comme des élastiques**. Mesures : branches tricuspides de 0,34 à 1,22 cm (× 3,5), longueur totale +46 % en systole ; mitrale × 1,8 par branche, +27 % au total. Un cordage est inextensible : tendu en systole, détendu (courbe) en diastole. | Mémoriser une longueur de repos par branche, mesurée valve fermée au premier `update(0, xf)`. Si la distance courante est plus petite, dessiner la branche en 3 tronçons sur une courbe de Bézier quadratique : point milieu décalé de `0.5·sqrt(L0² − d²)` vers l'oreillette (−A) et vers l'axe. Prévoir `new Cords(nSeg * 3, …)`. |
| I5 | Coaptation, `valves.js:114-117` et `:139-143` | **Mitrale** : la ligne de coaptation est un segment droit, et les deux zones d'accolement (`lip`) sont dans le même plan. 22 des 80 sommets du bord antérieur sont à moins de 0,2 mm du bord postérieur, d'où un scintillement (z-fighting) à la fermeture. **Tricuspide** : tous les bords libres convergent vers un cercle de 0,05 à 0,26 cm de rayon autour du centre, et les zones d'accolement forment un petit tube central qui pend dans le VD. Il n'y a pas de fermeture en Y, contrairement à ce qu'annonce l'en-tête du fichier. | Mitrale : ligne en « sourire », `Cc + lineDir·s − dirAnt·0,2·Rm·(1 − (s / 0,85Rm)²)`, avec `Cc` décalé de 0,05·Rm seulement ; zone d'accolement antérieure décalée de +0,03 cm selon `dirAnt` et zone postérieure de −0,03 cm. Tricuspide : reprendre le schéma des sigmoïdes. Dans `point`, passer `u` à `coapt` ; pour `u < 0,5`, aller vers `C + dir(L.t0)·0,8·R·(1 − 2u)`, sinon vers `C + dir(L.t1)·0,8·R·(2u − 1)`. Les feuillets voisins se rejoignent alors sur trois rayons. |
| I6 | Cordages tricuspides, `valves.js:156-160`, `valve-landmarks.mjs:85-88` | Chaque point d'insertion est rattaché au pilier le plus proche **en angle**. Résultats : le bord septal du feuillet antérieur est rattaché au pilier septal, à 82° de là (cordages en travers, sous le feuillet) ; tout le feuillet septal pend au seul pilier septal. La « tête » est le point du pilier le plus proche du centre de l'anneau, pas sa pointe : le pilier postérieur se retrouve à 34° de l'antérieur (angles 0,25 et 0,83 rad), loin de la commissure postéro-septale (2,45 rad). | Rattacher chaque feuillet aux **deux piliers qui encadrent ses commissures** (mitrale : AL + PM pour chaque feuillet ; tricuspide : antérieur ← antérieur + septal/conal, postérieur ← antérieur + postérieur, septal ← postérieur + septal). Ajouter des **cordages directs depuis la paroi septale** pour le feuillet septal : c'est un signe distinctif de la tricuspide. Tête du pilier = sommet le plus « auriculaire » (`min` de `dot(p − center, axis)`), pas le plus proche du centre. Vérifier ensuite l'angle du pilier postérieur. |
| I7 | Plan intérieur, `app.js:105-108` et `:194` (v8-03, v8-04) | Dans une tranche de 1,6 cm devant la coupe, les piliers, cordages et valves sont dessinés **par-dessus la surface de coupe**, alors que leur paroi est retirée. Effets : des colonnes musculaires et des feuillets flottent devant la tranche. En coupe horizontale (v8-04), les cuspides aortiques et pulmonaires apparaissent en grands pétales au-dessus de la section du VG. | Ramener le décalage à 0,6 cm. Le réserver aux valves et cordages, et au seul mode Grand axe. Couper les piliers au plan `cutPlane` en les déclarant comme solides de stencil (`solids.push({ mesh, hole: false, cap: 'myo', k: 0.15 })`) : leur section est alors bouchée comme le reste du muscle. |
| I8 | Piliers, `heart.js:23` et `:417`, `build-heart-bp3d.mjs:358-387` (v8-02, v8-03) | Les piliers du VD ne se distinguent pas de la paroi trabéculée : couleur `0xc35e67` contre `0xc9636d` × relief pour l'endocarde. Les cordages semblent finir dans le mur, alors que la pointe des piliers est libre dans la cavité, à 2 à 9 mm de la paroi (mesuré). Autour du pilier, les trabécules poussent la paroi de la cavité jusqu'à 3,2 mm vers le sang, alors que le pilier n'est gonflé que de 0,7 mm : son corps est englouti. | Exclure les trabécules à moins de 0,4 cm des piliers (`w *= smoothstep(0.15, 0.4, dPilier)`). Couleur des piliers `0xd06f76`, plus claire que l'endocarde, `rim` 0,3. Assombrir la base des piliers par occlusion ambiante (attribut `col`, comme les feuillets). |
| I9 | Amplitude, `heart.js:415-417` et `:470` ; fiche VG (`data.js:71`) | Rayon de l'endocarde −18 % (k = 0,18) et raccourcissement d'environ 12 % : fraction d'éjection apparente d'environ 41 %, alors que la fiche annonce « normalement ≥ 55 % ». L'épaississement pariétal n'est que d'environ 15 % (normal : 30 à 50 %). L'anneau tricuspide descend de 0,38 cm et le mitral de 0,72 cm : c'est l'inverse de la physiologie (TAPSE ≈ 2 cm > MAPSE ≈ 1,3 cm), parce que la tricuspide est à s = −0,31 sur l'axe du VG. | Cavités k = 0,27, piliers et têtes de cordages 0,24 (même valeur pour le GPU et le CPU), enveloppe 0,05, `desc` 0,13 → 0,15·L. Pour s < 0, atténuer `desc` avec `clamp(1 + s / 0.9)` au lieu de `/ 0.55`, afin que l'anneau tricuspide descende d'environ 0,6 à 0,8 cm. |
| I10 | Légende et pastilles, `css/style.css:20`, `data.js:94/102/111/121`, `data.en.js:97/105/114/124` | Les valves sont désormais crème-jaune, mais la légende « Valves » et les pastilles numérotées restent gris bleuté (`#e3e8ea`). | `--valve: #e8d3a2` et `couleur: '#e8d3a2'` pour les quatre valves (contraste du chiffre : `numHtml` passera automatiquement en encre). |
| I11 | Service worker, `sw.js:2` | `VERSION` est passée à v6 à l'étape 1, mais pas à l'étape 2. Ce n'est pas grave tant que les deux commits partent ensemble (origin est à `1ec6fb5`). En revanche, tout test local fait entre les deux étapes a servi le `app.js`, `heart.js` et `valves.js` de l'étape 1 (cache d'abord). `SHELL` contient bien `js/valves.js`. | Passer à `planche-coeur-v7` dans le même commit que les correctifs de ce rapport. Une seule mise en ligne pour l'ensemble. |

Code proposé pour I1 (`heart.js:537-543`) :
```js
const cycle = (ph) => {
  const atr = ph < 0.12 ? Math.sin(Math.PI * ph / 0.12) ** 2 : 0;
  // forme pendant la contraction isovolumique (20 %), volume pendant l'éjection (80 %)
  const contr = 0.2 * sm(0.13, 0.2, ph) + 0.8 * sm(0.2, 0.5, ph);
  // relâchement : un peu pendant la relaxation isovolumique, surtout pendant le remplissage rapide
  const relax = 0.15 * sm(0.52, 0.6, ph) + 0.85 * sm(0.6, 0.74, ph);
  const ven = contr * (1 - relax);
  const av = Math.min(1, Math.max(0, 1 - sm(0.11, 0.15, ph) + sm(0.58, 0.63, ph))) * (0.82 + 0.18 * Math.max(atr, sm(0.6, 0.66, ph) * (1 - sm(0.72, 0.84, ph))));
  const sl = sm(0.19, 0.22, ph) * (1 - sm(0.5, 0.53, ph));
  return { atr, ven, av, sl };
};
```

## 4. Souhaitables

Pour rapprocher le rendu de Nucleus (par ordre d'effet visuel) :

1. **Feuillets.**
   - Couleur : moins beurre, plus ivoire. `CREME [0.95, 0.89, 0.78]`, `BORD [0.93, 0.85, 0.7]` ; garder la base rosée (`ENDO`).
   - Épaisseur : doubler la nappe (décalage de 0,04 cm à la base, 0,1 cm au bord libre et dans la zone rugueuse) et fermer le bord. On obtient alors le liseré clair du bord libre que l'on voit chez Nucleus.
   - Stries fibreuses radiales : bruit étiré dans la direction anneau → bord libre, `bump` 0,05 → 0,15.
   - Légère transparence (`opacity` 0,9, `depthWrite` conservé, rendu après les opaques).
2. **Cordages.**
   - Nucleus en montre environ deux fois plus, en trois ordres (tronc, branches, ramuscules), avec un petit « pied » triangulaire à l'insertion.
   - Proposition : tronc de rayon 0,06 cm, branches de 0,03, ramuscules de 0,018 ; `nA = span / 0.22` ; trois insertions par branche au bord libre.
   - Ombres : `castShadow = true` (aujourd'hui `false`) et `receiveShadow = true` sur feuillets et cordages, une fois B3 corrigé.
   - Section : `radial` 6 → 8, pour éviter les facettes de près.
3. **Valve fermée lisible.**
   - Feuillets légèrement bombés vers l'oreillette : `belly` 0,2 → 0,3·h.
   - Pli d'occlusion ambiante sombre le long de la ligne de coaptation (v > 0,65). Aujourd'hui, la mitrale fermée se lit comme une plaque.
4. **Inertie.** Ouverture filtrée par un ressort amorti (`o += (cible − o)·k` avec un léger dépassement de 5 %) et faible ondulation du bord libre pendant l'éjection pour les sigmoïdes. C'est la « vie » des valves chez Nucleus.
5. **Festons P1-P3.** Modulation 0,22 → 0,45, avec des fentes plus marquées entre les festons, encore visibles quand la valve est fermée.
6. **Mode ralenti pédagogique.** Bouton « Ralenti » (20 à 30/min) et légende de phase (« Les valves mitrale et tricuspide se ferment », « Le ventricule éjecte le sang »…). Nucleus ralentit le cycle pour l'expliquer.
7. **Cohérence pendant le battement.**
   - Les normales ne sont pas déformées (torsion jusqu'à 7°), ce qui reste invisible.
   - Ancres d'étiquettes et clic sur le maillage au repos : écart jusqu'à 0,9 cm à la base. Déformer les ancres par `deformPoint` toutes les 4 images.
8. **Performance.**
   - `setBeat` met à jour valves et cordages à chaque image même hors coupe, où ils sont invisibles : passer un indicateur `valves: state.coupe`.
   - `point()` alloue un vecteur par sommet (`tmpA.clone()`, `valves.js:130`) : réutiliser un temporaire.
9. **Fiche VG** (`data.js:70`, `data.en.js:73`) : « antérolatéral et postéro-médian », plutôt que « antérieur et postérieur », pour coller à la nomenclature échographique que les patients entendront.
10. **Contraction auriculaire.** En systole auriculaire, faire gonfler légèrement les ventricules (`uDC` = −0,05) : c'est l'onde A du remplissage.

## 5. Vérifié et exact

- **Mitrale.**
  - Feuillet antérieur sur 130°, postérieur sur 230° avec 3 festons.
  - Hauteurs : 2,35 et 1,57 cm.
  - Commissures en `+E1` (antérolatérale, à gauche) et `−E1` (postéro-médiane).
  - Selle : points hauts en avant et en arrière.
  - Ligne de coaptation reportée vers l'arrière (le feuillet antérieur couvre environ 2/3 de l'orifice).
- **Piliers mitraux** : 2, presque diamétralement opposés (angles −0,23 et 2,92 rad), chacun alimentant les deux feuillets (frontières d'attribution à 1,35 et 4,49 rad). Les noms BodyParts3D des deux pièces (« Anterolateral head of lateral… », « Lateral papillary… ») sont trompeurs, mais ils ne sont pas affichés.
- **Tricuspide** :
  - feuillet antérieur en face de la paroi libre ;
  - feuillet septal du côté du septum (37° d'écart avec la direction mitrale) ;
  - 3 piliers, conformément à la fiche du VD.
- **Sigmoïdes.**
  - Ligne d'attache en croissant (basse au milieu, haute aux commissures), fermeture en Y, nodule central, poche bombée vers le ventricule quand la valve est fermée.
  - Aortique : cuspide antérieure (coronaire droite) en avant ; postérieure gauche (coronaire gauche) à gauche et en arrière ; postérieure droite (non coronaire) à droite et en arrière.
  - Continuité mitro-aortique sous les cuspides gauche et non coronaire, conforme à la fiche.
- **Valves au cours du cycle.**
  - La mitrale et la tricuspide sont fermées avant que les sigmoïdes s'ouvrent.
  - Les sigmoïdes sont fermées (0,44) avant que les valves AV ne commencent à se rouvrir (0,48 ; à moitié ouvertes vers 0,52), soit une relaxation isovolumique de 40 à 75 ms.
  - Semi-fermeture des valves AV en diastasis (0,82), ouverture complète aux ondes E et A.
  - Pas de saut entre phase 1 et phase 0.
- **Déformation.**
  - `deformPoint` reproduit `heartDeform` terme à terme.
  - Même k pour les têtes de piliers (0,15).
  - Descente de l'anneau mitral : 0,72 cm (physiologique).
  - Torsion : base −4°, pointe +7°, dans le bon sens vu depuis la pointe.
  - Les stencils de coupe et le fantôme suivent la déformation, et la texture procédurale reste attachée au tissu (`vObj` non déformé).
- **Service worker** : `SHELL` contient `./js/valves.js` ; version v6 cohérente avec l'état d'origin.
- **Fiches** : les nombres de feuillets, de cuspides et de piliers, la continuité mitro-aortique et l'absence de cordages pour les sigmoïdes sont cohérents avec le modèle (FR et EN).

## 6. Corrections appliquées (17 octobre 2026)

| Point | Correction | Vérification |
|---|---|---|
| B1 | Repères des valves calculés en tête du générateur. Cylindre d'orifice (0,85 × rayon de l'anneau, de −0,6 à +1,2 cm) ajouté à la réunion des cavités. Cylindres `BASE_CUTS` mitral et tricuspide partant du centre de l'anneau (décalage 0,1 cm). Enveloppe ⊇ cavités : `min(f, cavField − 0,12)`. Le rapport proposait `+ 0,12`, qui ne garantit pas l'inclusion : le contrôle donnait 98,3 %. Contrôle ajouté au journal. | Plus de bande de muscle sous les oreillettes : les valves fermées sont visibles en systole (v9-03). |
| B2 | `cav.userData.sid` et `pickId` qui renvoie l'oreillette ou le ventricule touché ; test des impacts sur `interiorPlane` pour les structures intérieures (`isCutAway`) ; `select()` ignore un identifiant sans fiche. | Les quatre cavités renvoient leur identifiant ; `select('cavites')` ne lève plus d'erreur. |
| B3 | `customDepthMaterial` déformé (même raideur que le tissu) pour chaque maillage déformé. Sous-classe `DeformDepthMaterial` qui garde la déformation quand three clone le matériau pour les ombres coupées. | 17 maillages concernés ; aucune erreur de shader. Fluidité non remesurée (fenêtre de test masquée). |
| I1 | Nouveau `cycle()` du rapport : contraction pendant l'éjection, relâchement pendant le remplissage, éjection ≈ 295 ms. | — |
| I2 | `shadowMap.needsUpdate` dans `setCutMode` et au curseur de profondeur. | — |
| I3 | Centres des oreillettes mélangés en continu (`smoothstep(dLA − dRA)`), en GLSL et dans `deformPoint`. Le poids `tis.z` n'est pas repris : le masque reste le niveau sur l'axe. | — |
| I4 | Longueur de repos de chaque cordage mesurée valve fermée. Plus court, il est dessiné en 3 tronçons sur une courbe de Bézier (flèche ≤ 12 % de la longueur, pour éviter les boucles). | Cordages légèrement incurvés en diastole, tendus en systole. |
| I5 | Mitrale : ligne de coaptation en « sourire », zones d'accolement décalées de ± 0,3 mm. Tricuspide : fermeture en Y le long des rayons des commissures. Corrigé aussi : l'ancienne fonction `coapt` écrasait le point d'anneau (`tmpA`), d'où la nappe plate de la mitrale fermée. | Dômes fermés lisibles (v9-03). |
| I6 | Chaque feuillet est tenu par les deux piliers les plus proches de ses commissures. Tête du pilier = moyenne des 4 % de points les plus proches de l'oreillette. Cordages septaux directs : non faits. | — |
| I7 | Plan intérieur décalé de 0,6 cm, en coupe Grand axe seulement ; les piliers sont coupés avec le muscle (solides de stencil) et n'ont plus de fantôme. | — |
| I8 | Pas de trabécules à moins de 0,4 cm des piliers ; piliers `0xd06f76`, `rim` 0,3. | — |
| I9 | Cavités k 0,26, piliers et têtes de cordages 0,24, surface 0,05, descente 0,15·L, atténuation `/0,9`. Déplacement radial plafonné à 2,8 cm de l'axe, sinon la paroi libre du VD s'épaissirait d'un facteur 3. | — |
| I10 | `--valve` et pastilles des valves en `#e8d3a2` (FR et EN). | Légende crème (v9-02). |
| I11 | `sw.js` : `planche-coeur-v7`. | — |
| Souhaitables | Fait : feuillets plus ivoire, cordages qui portent des ombres, mise à jour des valves seulement en coupe, plus d'allocation par sommet, fiche VG « antérolatéral et postéro-médian ». Reste : double épaisseur des feuillets, cordages de 3e ordre, inertie, mode ralenti, ancres déformées. | — |
