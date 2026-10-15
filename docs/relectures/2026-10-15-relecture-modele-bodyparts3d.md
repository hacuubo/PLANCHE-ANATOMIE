# Relecture : modèle reconstruit à partir de BodyParts3D

- Date : 15 octobre 2026
- Relecteur : anatomiste et directeur artistique en illustration médicale, indépendant (aucune modification du code)
- Périmètre : `tools/build-heart-bp3d.mjs` (sections 2 à 9), `tools/lib/bp3d-heart.mjs`, en-tête de `assets/heart.bin` (relu avec Node), `js/heart.js`, `js/app.js`, `js/data.js`. Captures `v6-01` à `v6-06`, comparées à `v5-01` et à deux images de référence Nucleus (vue extérieure, coupe).
- Limites : je n'ai pas pu lancer l'application et les captures font 800 px de large. Pour compenser, j'ai agrandi les captures et lu l'en-tête du binaire (ancres, conduction, trajets). J'ai aussi mesuré la profondeur des coronaires sur les OBJ BodyParts3D, avec un script jetable placé hors du dépôt.
- Repère : coordonnées de l'application en cm (x vers la gauche du patient, y vers le haut, z vers l'avant).
- Gravité : **BLOQUANT** = trompeur pour un patient ou contredit la fiche ; **IMPORTANT** = visible et gênant ; **SOUHAITABLE** = rapproche du rendu Nucleus.

## 1. Verdict

Le gain anatomique est net par rapport à v5. Les rapports des gros vaisseaux sont réels, le VD occupe la face avant, la dominance droite est réelle et l'arbre coronaire est complet. L'épaisseur reconstruite des parois est cohérente avec la fiche (voir § 5). En revanche, **trois défauts sont bloquants** :
- la coupe « Grand axe » n'est pas lisible ;
- deux étiquettes désignent la mauvaise structure ;
- le trajet du sang depuis la veine cave supérieure est cassé (point manquant).

L'écart esthétique avec Nucleus tient surtout à la base du cœur (un manchon de muscle sur la racine aortique), aux moignons de vaisseaux pulmonaires et aux oreillettes facettées vues de dos. La teinte et la finesse du réseau coronaire sont déjà proches.

## 2. Bloquants

**B1. La coupe « Grand axe » ne montre pas les quatre cavités** (v6-05). Le plan contient l'axe du cœur et passe à 0,4 cm de `BASE`, le milieu des valves mitrale et tricuspide. Or ces deux valves sont à ± 1,8 cm de part et d'autre de ce plan : la mitrale en arrière, la tricuspide en avant. La coupe passe donc par la cloison et la chambre de chasse. Résultat à l'écran :
- de grandes plages roses pleines ;
- des cavités réduites à des fentes ;
- des nodules crème épars (voir I9) ;
- aucun trajet oreillette → valve → ventricule visible.

Correctif :
- dans la section 7, calculer `N4 = norm(cross(AXIS, mitral − tricus))`, soit ≈ (0,18 ; 0,93 ; 0,32). C'est le plan « 4 cavités » de l'échographie, proche de l'horizontale et incliné d'environ 20° ;
- l'exporter dans `frame` ;
- dans `app.js`, faire passer `CUT_MODES['grand-axe']` par `BASE` avec la normale `N4` (valeur par défaut 0), puis orienter la caméra selon `N4`, la pointe en bas (vecteur haut de la caméra = −AXIS).

Nucleus montre une coupe frontale avec les quatre cavités : c'est une licence artistique, qu'aucun plan frontal d'un vrai cœur ne permet.

**B2. Deux étiquettes pointent au mauvais endroit** (v6-04, ancres lues dans `heart.bin`) :

| Étiquette | Ancre actuelle | Cause | Correctif |
|---|---|---|---|
| 30 « Sinus coronaire » | (2,0 ; −2,8 ; **+4,5**), sur la face antérieure du VD, près de la pointe. Le sinus est **postérieur**. | `MAP` range la petite veine, la veine marginale droite et la veine postérieure du VG sous `sinus-coronaire` ; `anchorFrom` choisit ensuite le centre des sommets tournés vers l'avant. Un clic sur la veine marginale droite ouvre d'ailleurs la fiche « Sinus coronaire ». | Créer l'identifiant `veines-cardiaques` (« Autres veines du cœur ») pour ces trois veines. Calculer l'ancre du sinus sur la seule pièce `Coronary sinus`. |
| 24 « Artère coronaire droite » | (1,7 ; −1,9 ; 5,1) : une branche ventriculaire au milieu du VD | Même règle, appliquée à toutes les branches de la CD | Section 9 : ancres de `coronaire-droite` et `iva` calculées sur `Trunk of right coronary artery` et `Trunk of anterior interventricular…` seulement. |

**B3. Le trajet VCS → OD n'a pas de point de départ** (v6-06 : aucune particule dans la VCS). La pièce VCS culmine à y ≈ 8,9. Le filtre `svc.filter(p => p[1] > 11.5)` est donc vide, et `meanOf([])` renvoie NaN, écrit `null` dans `heart.bin` (`flowPaths[0].points[0]`). Le trajet part alors de l'origine, à l'intérieur du cœur. Correctif :
- `svcTop` calculé comme `ivcTop` (les 0,8 cm les plus hauts de la pièce) ;
- faire échouer `meanOf` sur une liste vide ;
- dans le même passage, filtrer `descMid` avec `z < −2.5`. Aujourd'hui, la tranche y ∈ [1 ; 3] mêle aorte ascendante et descendante : le point (1,1 ; 2,0 ; −4,1) tombe dans l'OG, au lieu de z ≈ −5,5.

## 3. Importants

| # | Structure / capture | Problème | Correctif |
|---|---|---|---|
| I1 | Racine aortique et base (v6-01, v6-05) | Le myocarde est un décalage de 0,35 à 0,8 cm autour de **toute** la cavité, y compris au-dessus des anneaux. On voit un manchon rose autour de la racine aortique en coupe, un voile rose sur l'aorte ascendante de face et un rebord plat d'où sort le TP. Or la racine aortique est fibreuse ; seul l'infundibulum du VD est musclé jusqu'à la valve pulmonaire. | Section 5, `core()` : `myo = max(myo, …)` avec des cylindres de 2 cm de rayon au-dessus de chaque valve artérielle (axe = centre de la valve → centre du vaisseau, coupure 0,1 cm au-dessus du centre). Faire de même au-dessus des anneaux mitral et tricuspide, côté oreillettes. |
| I2 | Tronc brachio-céphalique (section 2) | Il **existe** dans BodyParts3D : `FJ3417.obj`, *Brachiocephalic artery* (FMA3932), présent dans `partof_BP3D_4.0_obj_99`. Les carotide et subclavière droites sont rangées sous `tronc-brachio-cephalique` : l'étiquette 14 pointe sur la bifurcation (ancre au-dessus de `J`). L'union par `Math.min` y laisse des taches sombres (v6-04, v6-03). | Ajouter `[/^Brachiocephalic artery$/, 'vaisseau', 'tronc-brachio-cephalique']` à `MAP`, supprimer `BCT`/`bctSDF`, donner aux deux branches droites leur propre identifiant et raccorder par `smin(…, 0.3)`. |
| I3 | Faisceau de His (section 9) | Nœud AV → `septum[0]` = **3,4 cm** (normal : 1 à 2 cm). `septum[0]` tombe dans le septum de sortie, entre les valves aortique et pulmonaire. La polyligne « his » couvre ensuite tout le septum et double la branche gauche. Les niveaux zigzaguent (y −0,71 puis +0,06). | `his: [AV_NODE, septum[0]]`, avec `septum[0]` choisi sur la crête musculaire la plus proche du nœud (score + 0,3 × distance au nœud, sans le terme −0,05a). Imposer ensuite une progression monotone vers la pointe. Contrôler dans le journal que la longueur est ≤ 2 cm. |
| I4 | Veine le long de l'IVA (v6-01) | BodyParts3D n'a pas de veine interventriculaire antérieure, or la fiche « Grande veine du cœur » dit qu'elle « remonte le long de l'IVA ». | La reconstruire : tube r 0,12, décalé de 0,25 cm à gauche de l'axe de l'IVA, du tiers inférieur jusqu'au sillon AV où il rejoint la grande veine. Sinon, corriger la fiche. |
| I5 | Veines et artères pulmonaires (v6-02, v6-03) | Les veines pulmonaires gauches sortent en 4 à 5 moignons ivoire qui évoquent des os ; la fiche annonce deux veines de chaque côté. L'APG forme une « écharpe » plate jusqu'aux branches lobaires. | `TRIM['veines-pulmonaires'] = S.OGw.query(…) − 1.8` (avant la division). APD et APG coupées par une sphère de 4,5 cm centrée sur `ptTop` plutôt que par un plan en x. |
| I6 | Cadrage (v6-01) | Le cœur remplit le cadre : branches de la crosse sous la barre d'outils, VCI et pointe contre la légende. | `viewDistance` 38 → ≈ 44 ; recentrer `CENTER` (app.js l. 42) sur les nouvelles bornes. |
| I7 | Oreillettes vues de dos (v6-03) | Faces planes et arêtes : les maillages de paroi réduits à 99 % survivent au lissage de Taubin. | Échantillonner `od` et `og` sur une grille floutée (σ ≈ 0,3 cm), comme `VG0`. |
| I8 | Tronc de la CD (v6-01, v6-04) | On ne l'identifie pas dans le sillon AV droit, où l'on ne voit qu'une couture pâle : seules les branches du VD sont visibles. Or c'est l'artère que les fiches citent le plus. | Union myocarde/OD `smin(…, 0.5)` → 0,2 (le raccord comble le sillon). Ajouter au journal le pourcentage de l'axe des troncs enfoui à plus de 0,1 cm. |
| I9 | Graisse (section 4, v6-05) | `fatPts` est décalé de 0,28 cm *vers la cavité* : la graisse se loge sous l'artère, dans le muscle. En coupe, on voit des nodules crème au milieu du myocarde, sans vaisseau visible. | Décalage 0,28 → 0,1, rayon 0,25 → 0,3. `fatSolid = max(fatSDF, field, −myo)`, pour que la graisse ne soit jamais coupée dans le muscle. |
| I10 | Contrôle des parois | `tools/check-walls.mjs` a été supprimé : plus aucune mesure automatique des épaisseurs. | Le porter sur le nouveau modèle : VG, paroi libre du VD, septum, oreillettes, mesurés le long des normales des cavités, avec résultats dans le journal de build. |

## 4. Souhaitables

1. **`APEX`** est calculé avec `thick()` et non avec l'épaisseur réelle (`max(thick, 0.35 + 0.45·wLV)`). La pointe est donc placée ≈ 0,4 cm sous la surface, et la zone « apex » est décentrée.
2. **Nœud sinusal.** Le décalage fixe (−0,6 ; −0,3 ; 0,5) le place à 0,78 cm de l'axe de la VCS, de rayon 1,1 cm, donc en partie dans la lumière. Mieux vaut le projeter sous l'épicarde, sur le sillon terminal (champ ≈ −0,15). Vérifier aussi que le nœud AV ne fait pas saillie dans l'OD (perle jaune parmi les cordages en v6-05) : `S.ODc.query(AV_NODE) > 0.3`.
3. **Ancre « Sillons »** à z = −4,2 : elle est cachée en vue antérieure. Dans `anchorFrom`, passer le terme −0,3·z à −1,0·z.
4. **Trajet n° 5.** Il monte à y = 15,2, alors que la carotide droite est coupée à 14,5 : les particules sortent du vaisseau.
5. **VCS.** Elle ne mesure que 3,5 cm, pour 7 cm dans la fiche. On peut ajouter la pièce *Right brachiocephalic vein* (FJ3583), coupée à y ≈ 12.
6. **Rapprochement de Nucleus :**
   - coronaires un peu moins saturées ;
   - plis sombres d'occlusion ambiante entre aorte et TP à adoucir (`smin` 0,15 entre les assemblages) ;
   - transition de couleur muscle/vaisseau plus courte (0,09 → 0,05 dans `attributes`).
7. **Circulation.** Les cinq trajets s'emmêlent en vue antérieure : proposer une vue oblique antérieure gauche par défaut en mode circulation.

## 5. Vérifié et exact

- **Repère et rapports.** La conversion BodyParts3D → application est correcte :
  - TP en avant de l'aorte ascendante ; APD en arrière de l'aorte ascendante et de la VCS ;
  - APG en avant de l'aorte descendante ; aorte descendante à gauche et en arrière de l'OG ;
  - VD sur la face antérieure ; auricule droite sur la racine aortique ;
  - axe (0,81 ; −0,32 ; 0,49) : pointe en bas, en avant et à gauche, conforme à la fiche. Le cœur est un peu horizontal, comme chez un sujet couché : à conserver.
- **Épaisseurs** (mesure sur les OBJ, distance entre la surface des vaisseaux et la cavité la plus proche) :

  | Vaisseaux | Distance médiane (10e–90e centile) |
  |---|---|
  | Diagonales | 0,90 cm (0,84–0,96) |
  | Circonflexe | 0,90 cm (0,83–0,99) |
  | Branches postérieures du VG | 0,89 cm |
  | Branches du VD | 0,33 cm (0,27–0,58) |

  Le VG reconstruit fait donc ≈ 0,8–0,95 cm et le VD ≈ 0,35–0,55 cm, ce qui est conforme aux 8–12 mm et 3–5 mm de la fiche. Le plancher VG de 0,8 cm n'agit que sur 10 à 15 % des points.
- **Dominance droite.** L'IVP et les branches postérieures du VG naissent de la CD (pièces réelles), conforme à la fiche.
- **Ligament artériel.** De l'origine de l'APG à la concavité de la crosse, au niveau de la subclavière gauche, Ø 0,34 cm, ≈ 0,9 cm : il relie bien les deux vaisseaux en vue gauche (v6-02).
- **Nœud AV.** Placé 0,8 cm du côté des oreillettes par rapport au centre de la tricuspide, entre l'ostium du sinus coronaire et la valve septale : compatible avec le triangle de Koch.
- **Attribution.** La mention CC BY 4.0 de BodyParts3D figure dans la note de bas de page (`index.html` l. 91) et dans le README.

## 6. Corrections appliquées (15 octobre 2026)

| Point | Correction | Vérification |
|---|---|---|
| Bloquant 1 | Coupe « Grand axe » sur le plan quatre cavités `N4 = norm(cross(AXIS, mitrale − tricuspide))`, exporté dans `frame.cut4`. La caméra se place face au plan à l'ouverture de la coupe. | Oreillettes, ventricules, valves mitrale et tricuspide avec cordages visibles (v7-02). |
| Bloquant 2 | Identifiant `petites-veines-cardiaques` (veine postérieure du VG, petite veine, veines marginales), avec fiches FR et EN. Ancres de la CD, de l'IVA et du sinus calculées sur leurs troncs. | La CD pointe dans le sillon AV droit, le sinus est masqué en vue de face (v7-03). |
| Bloquant 3 | `svcTop` = haut réel de la VCS ; `meanOf` lève une erreur sur une liste vide ; `descMid` filtré à `z < −2,5`. | Particules dans la VCS (v7-04). |
| Base | Myocarde retiré dans des cylindres au-dessus des valves aortique et pulmonaire, et vers les oreillettes (`BASE_CUTS`). | Plus de manchon rose sur la racine aortique (v7-01). |
| TBC | Pièce réelle `FJ3417` (*Brachiocephalic artery*) ; reconstruction supprimée. | v7-01, v7-03. |
| His | Niveau septal à 5 % de l'axe ; tronc nœud AV → crête septale ≈ 1,5 cm ; branches tirées de points septaux lissés ; le tronc ne double plus la branche gauche. | — |
| Veine IVA | Portion antérieure de la grande veine reconstruite le long de l'IVA, côté VG, raccordée à la pièce BodyParts3D. | v7-03. |
| Vaisseaux pulmonaires | Coupes resserrées : veines `|x − 0,6| < 4,1`, APD `x > −4,9`, APG `x < 5,0`. | — |
| Cadrage | Recul de caméra 38 → 44 ; carotide et subclavières coupées plus bas. | v7-01. |
| Oreillettes | Lissage de l'enveloppe 6 → 10 itérations. | — |
| Graisse | Centrée à l'épicarde ; solide de coupe limité à l'extérieur du muscle. | — |
| Contrôle des parois | Le générateur affiche l'épaisseur mesurée depuis chaque cavité ; plancher VG porté à ≈ 1 cm. | Voir la ligne finale du journal de génération. |

Restent ouverts : position fine de la pointe et du nœud sinusal, ancre « Sillons », vue par défaut du mode circulation, finitions de rendu (§ 4).
