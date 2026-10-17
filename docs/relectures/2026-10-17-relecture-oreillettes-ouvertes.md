# Relecture : oreillettes ouvertes des vues mitrale et tricuspide

- Date : 17 octobre 2026
- Relecteur : chirurgien cardiaque, anatomiste, illustrateur médical et relecteur de code three.js r169, indépendant (aucune modification du code)
- Périmètre : le commit local `d3ccc90`, soit :
  - `js/av-views.js` : le « plancher » annulaire est remplacé par une oreillette ouverte procédurale (`atrium(valve)`, `wallAt`, tableau de repères `F`) ; caméra recalée (`dist` 13 / 14,5, `center` à 0,6 cm côté oreillette) ;
  - `README.md` ; `sw.js` v16.

  Captures `v18-01` (OG, mitrale), `v18-02` (OD, tricuspide normale), `v18-03` (OD, anneau dilaté).
- Méthode : je n'ai pas pu lancer l'application. Pour compenser, j'ai :
  - lu l'en-tête de `assets/heart.bin` (centres, axes, `e1`/`e2`, rayons et secteurs des feuillets) ;
  - recopié en Node `angleOf`, le placement des repères `F` et `wallAt`, puis calculé la position « horaire » de chaque repère à l'écran (base caméra `lookAt` avec le `up` de la vue) ;
  - mesuré le relief au bord coupé (s = 1) par rapport à l'épaisseur `WALL`, les écarts entre repères, l'enroulement des triangles et les normales qui en résultent ;
  - estimé le cadrage (fov 32°, `setViewOffset` de `app.js:424-426`) ;
  - agrandi les captures pour examiner le bord coupé, les orifices et les muscles pectinés.

  Les scripts jetables sont hors du dépôt (`scratchpad/relecture-v18/`).
- Repère : cm ; x vers la gauche du patient, y vers le haut, z vers l'avant.
- Gravité : **BLOQUANT** = trompeur pour un patient, faux anatomiquement ou bug visible sur un parcours courant ; **IMPORTANT** = visible et gênant, ou coût qui dégrade la fluidité sur téléphone ; **SOUHAITABLE** = amélioration.

## 1. Verdict

C'est un vrai progrès. L'anneau rose posé à plat devient une cavité qui a de la profondeur, et les repères parlent au chirurgien comme au patient. Le choix de dériver chaque repère des directions réelles du patient (x, y, z), projetées dans le plan de la valve, est le bon : les relations anatomiques sont justes **sans miroir choisi à la main**. Je les ai recalculées (§ 5) :

- **OG, vue du chirurgien** :
  - aorte à 12 h, auricule gauche à 9,4 h, contre la commissure antérolatérale (9,1 h) ;
  - veines pulmonaires gauches à 6,6-7,5 h, droites à 4,5 h, toutes en arrière (le postérieur pur tombe à 6,1 h) ;
  - fosse ovale à 1,8 h, du côté droit du chirurgien.
- **OD, feuillet septal à 6 h** :
  - sinus coronaire à 3,6 h, contre la commissure postéro-septale (4,1 h) ;
  - veine cave inférieure à 2,2 h, du même côté que le sinus coronaire ;
  - veine cave supérieure à 6,6 h, près de l'aorte (5,7 h) ;
  - fosse ovale à 5,2 h, entre la VCS et le sinus coronaire ;
  - auricule droite à 8,7 h, entre l'antérieur (10 h) et le supérieur (7 h) ;
  - muscles pectinés sur la paroi libre antérolatérale (8 h → 1 h) ;
  - les deux extrémités de la crête terminale près de la VCS/auricule (8,2 h) et de la VCI (1,3 h).

  Pivotée de 90° pour mettre le septal à gauche, cette disposition est celle de la vue opératoire classique par atriotomie droite (VCS à gauche, VCI et sinus coronaire en bas, feuillet antérieur en haut).

Aucun point n'est bloquant. Cinq points importants :

- un orifice déborde à travers le bord coupé, à la VCI ;
- les normales du bord coupé sont faussées, ce qui produit un liseré sombre au lieu d'une tranche de muscle ;
- les deux veines pulmonaires droites se confondent en une seule tache ;
- des orifices et des étiquettes sortent du champ ou passent sous la barre d'orientation ;
- les muscles pectinés sont sous-échantillonnés et dessinent un froissé plutôt qu'un peigne.

## 2. Bloquants

Aucun.

## 3. Importants

| # | Fichier : ligne | Problème | Correctif |
|---|---|---|---|
| I1 | `av-views.js:68`, `:84`, `:127-129` ; capture `v18-02` (en haut à droite) | **La VCI traverse le bord coupé.** La VCI est à `s` = 0,8, avec `ry` = 0,75 et `depth` = 0,6. Au bord (s = 1), sa gaussienne repousse encore la paroi interne de **0,357 cm**, plus que `WALL` = 0,25. Sur **14 des 180 segments**, l'anneau intérieur du bord passe donc à l'extérieur de l'anneau extérieur : la bande du bord coupé se retourne (triangles inversés), et la tache sombre de l'orifice « mord » la tranche. On le voit sur `v18-02` : encoche noire dans le bord. La VCS est limite : 0,187 cm pour 0,25, il reste une tranche de 0,6 mm. Le défaut persiste dans la variante dilatée. | 1. Abaisser les orifices des veines caves, ce qui est aussi plus juste : la VCI s'ouvre dans la partie basse et postérieure de l'OD. `:67` VCS `s: 0.6` ; `:68` VCI `s: 0.62` ; `:70` valvule d'Eustachi `s: ivc.s - 0.18`. 2. En défense, amortir tout relief positif près de la coupe, en fin de `wallAt` (`:98`) : `if (disp > 0) disp *= 1 - 0.8 * smooth(0.85, 1, s);`. Avec ces valeurs, le relief au bord tombe à 0,02 cm (VCI) et 0,01 cm (VCS). |
| I2 | `av-views.js:124`, `:127-129`, `:134` ; captures `v18-01` à `v18-03` (liseré sombre le long du bord) | **Bord coupé : sommets partagés et enroulements opposés, d'où des normales fausses.** Avec `E1 × E2 = +A` (vérifié dans `heart.bin` pour les deux valves), l'ordre `(a, c2, b)` de la paroi interne (`:124`) donne une normale **vers l'extérieur** de la cavité. Le bord (`:129`, ordre `(a, b, c2)`) est tourné vers l'observateur. Le `DoubleSide` rattrape l'éclairage de la paroi seule. Mais le bord réutilise les sommets de la dernière rangée de la paroi (`inTop`), et ses triangles sont 4 fois plus grands. `computeVertexNormals`, pondéré par l'aire, donne donc à cette rangée une normale presque égale à `atrialSide`. Une fois retournée pour la face arrière, elle pointe à l'opposé de la caméra : **dernière rangée sombre**, d'où le trait foncé. La tranche, elle, prend la teinte de l'endocarde et ne se lit pas comme du muscle coupé. Enfin, l'anneau extérieur `j = 0` (`:127`) est créé mais jamais indexé (181 sommets morts). | Paroi interne tournée vers la cavité : `:124` `idx.push(a, b, c2, b, dd, c2);` (normale `−H·E1` à θ = 0, soit vers l'axe). Tranche avec ses propres sommets, de teinte « myocarde coupé » : remplacer `:126-129` par :<br>`const rimIn = pos.length / 3;`<br>`for (let i = 0; i <= nT; i++) { const th = (i / nT) * 2 * Math.PI; const { r } = point(th, 1, 0, P); point(th, 1, wallAt(th, 1, r).disp, P); push(P, [0.6, 0.27, 0.25], 0.8); }`<br>`const rimOut = pos.length / 3;`<br>`for (let i = 0; i <= nT; i++) { point((i / nT) * 2 * Math.PI, 1, WALL, P); push(P, [0.6, 0.27, 0.25], 0.8); }`<br>`for (let i = 0; i < nT; i++) { const a = rimIn + i, b = a + 1, c2 = rimOut + i, dd = c2 + 1; idx.push(a, b, c2, b, dd, c2); }`<br>L'ordre `(a, b, c2)` donne `−WALL·A`, soit vers l'observateur. Sur les photos opératoires, la tranche d'une atriotomie est rouge sombre et mate. Elle doit trancher sur l'endocarde, pâle et brillant. |
| I3 | `av-views.js:58`, `:158` ; capture `v18-01` (une seule tache à droite) | **Les deux veines pulmonaires droites n'en font qu'une.** `W(−0,6 ; 0,3 ; −1)` (RSPV) est presque parallèle à l'axe mitral : sa composante dans le plan vaut 0,34, d'où un angle mal défini. RSPV et RIPV tombent toutes deux à 4,5 h. Leurs centres sont à **0,60 cm** l'un de l'autre, pour un rayon de gaussienne de 0,5 × 0,42 cm, et les deux taches se confondent. Le README et le commentaire annoncent « quatre orifices ». Or, en vue chirurgicale (ETO 3D), la VPSD est contre le septum (3-4 h) et la VPID plus bas (4,5-5 h). | Ancrer les veines droites entre le septum et le postérieur, ce qui est robuste au modèle : `const tS = angleOf(septDir), tPo = angleOf(W(0, 0, -1)), k = wrapA(tPo - tS);` puis RSPV `th: tS + 0.35 * k, s: 0.62` (3,2 h) et RIPV `th: tS + 0.65 * k, s: 0.45` (4,6 h). Garder `angleOf(W…)` pour les veines gauches (7,5 h et 6,6 h). `:158` : moyenne d'angles sûre, `L[0].th + wrapA(L[1].th - L[0].th) / 2` (idem pour `Rv`). |
| I4 | `av-views.js:57-74`, `:155-158`, `:209` ; `app.js:424-426`, `:507` ; captures `v18-01` (VP gauches coupées en bas), `v18-03` (« Veine cave supérieure » sous la barre d'orientation) | **Orifices et étiquettes hors champ.** La paroi monte de 2,5-2,7 cm vers la caméra et s'évase de 45-50 % : par la perspective, le bord est agrandi d'environ 25 %. Le haut du bord est à 3,26 cm de l'axe (mitrale, grand axe), alors que la demi-hauteur utile est d'environ 2,4 cm, une fois retirés la barre d'outils (≈ 85 px) et la barre d'orientation. `setViewOffset` descend de plus l'image d'une demi-barre d'outils, si bien que **le bas du champ perd le plus**. Or c'est là que sont les veines pulmonaires (6-7 h) et la VCS (6,6 h). Sur `v18-03`, l'anneau dilaté (×1,32 sur la paroi libre) écarte encore les repères : l'étiquette VCS passe sous la barre d'orientation. L'étiquette « Aorte (en arrière) » (`s` = 1) est collée sous la barre d'outils. Sur téléphone, les outils sur trois rangées aggravent le problème. | Accepter que le **bord** soit rogné, comme sur un champ opératoire, mais garder **repères et étiquettes** dans le champ : 1. abaisser les repères hauts (VP `s` ≤ 0,62, VCS 0,6, VCI 0,62, auricule droite 0,55 ; voir I1 et I3) ; 2. ancrer les étiquettes plus bas et plus près de l'axe : `:155` `atr.at(f.th, Math.min(f.s, 0.5), 0.6)`, `:158` `atr.at(…, 0.5, 0.9)`, `:186` `atr.at(angleOf(up), 0.75, 0.4)` ; 3. reculer un peu la caméra, `dist: mitral ? 14 : 16` (la variante dilatée tient alors dans le champ). Avec 1 et 2, les ancrages restent à moins de 2,4 cm de l'axe, sous 0,72 de la demi-hauteur à 12-13,6 cm. À contrôler à l'écran en 800 × 545 et en 390 × 844. |
| I5 | `av-views.js:90-96`, `:102` ; captures `v18-02`, `v18-03` | **Muscles pectinés sous-échantillonnés : froissé au lieu d'un peigne.** La phase `off·33` donne une longueur d'onde de 0,19 rad, soit environ 5,5 sommets avec `nT` = 180. `pow(sin, 5 à 8)` réduit chaque crête à environ 1,4 sommet : les colonnes tombent entre les sommets, se cassent et se fondent en vermicelles irréguliers. Sur les captures, on voit des « chips » froissés le long de la paroi libre. On n'y reconnaît pas les colonnes charnues parallèles qui partent en éventail de la crête terminale vers le vestibule, typiques des photos d'OD ouverte. | Côté OD seulement, doubler la résolution angulaire : `const nT = mitral ? 180 : 360` (17 k triangles par oreillette, négligeable). Élargir les crêtes : exposant `2 + 1.5 * (0.5 + 0.5 * Math.sin(off * 5 + 2))`, fréquence `off * 26`. Garder la modulation d'épaisseur. Pour l'éventail, faire croître légèrement la fréquence vers le vestibule : `ph = off * (26 + 6 * (1 - s)) + …`. |

## 4. Souhaitables

1. **Fosse ovale vue de l'OG** (`av-views.js:64`, `:86`). Le type `fossa` ajoute un limbe annulaire en relief, et la teinte pâle et brillante fait une **cloque blanche** (`v18-01`). Vue de l'OG, la fosse n'a pas de limbe. Le septum primum y est plat, un peu translucide, parfois bordé d'un pli en croissant (bord libre de la valve du foramen ovale), en avant et en haut. Pour l'OG : pas d'anneau, `depth` 0, `pale` × 0,5, et éventuellement un `ridge` fin en arc côté aorte.
2. **Fosse ovale vue de l'OD** (`:73`, `:86`). Le limbe est un anneau complet de 1 mm. Le vrai limbe est un **fer à cheval** saillant (2-3 mm), ouvert en bas vers la VCI et la valvule d'Eustachi, autour d'une fosse franchement creusée (3-4 mm). Pondérer l'anneau par l'angle : `0.25 * Math.exp(…) * (0.5 + 0.5 * Math.cos(phi - phiIVC))`, où `phi` est l'angle local autour du centre de la fosse ; porter `depth` à 0,3.
3. **Crête terminale** (`:94`). Ses deux branches descendent jusqu'à s = 0,2. Celle de 8,2 h arrive ainsi juste au-dessus de la commissure antéro-septale, où il n'y a pas de crête. La crête part en haut de la face antérieure de la VCS et descend vers la VCI et la valvule d'Eustachi, à distance du vestibule. Branche « VCS » limitée à s > 0,45 ; branche « VCI » de 0,3 à 0,7, épaisse de 3-4 mm (`0.1` → `0.14`).
4. **Triangle de Koch et nœud AV** (`:71-72`). Le commentaire place le sinus coronaire « à la base du triangle de Koch », mais rien ne montre le triangle. C'est le repère de sécurité du chirurgien (points de l'anneau d'annuloplastie, risque de bloc AV), et il explique au patient le pacemaker qu'on pose parfois après une chirurgie tricuspide. Ajouter un léger relief linéaire (tendon de Todaro), de la valvule d'Eustachi vers la commissure antéro-septale. Ajouter une étiquette « Triangle de Koch (nœud AV) » à `th = tPS + 0.55 * wrapA(sep.t1 - tPS)`, `s` = 0,15.
5. **« Veine cave supérieure » en bas de l'image.** C'est exact dans cette convention (le supérieur se projette à 7 h quand le septal est à 6 h). Mais un patient peut s'en étonner. Compléter `orient` (`:206`) : « Vue depuis l'oreillette droite · septum en bas · tête du patient vers le bas », ou ajouter une phrase dans la fiche.
6. **Pas de paroi externe** (`:125`). Le commentaire annonce une « paroi externe », mais seule la tranche existe. Si l'utilisateur fait tourner la vue (`controls` réactivés, `minDistance` 8), l'oreillette est une coque sans épaisseur, et les orifices y font des bosses. Ajouter une surface épicardique décalée de `WALL` (sans les repères), ou limiter l'orbite en vue de valve à environ 60° autour de `camDir`.
7. **Couture à θ = 0** (`:112-124`). Les sommets `i = 0` et `i = nT` sont dupliqués, et leurs normales sont calculées d'un seul côté. La couture tombe à 11,4 h pour l'OD, en pleine zone pectinée, et à 8 h pour l'OG, sur la crête de l'auricule. Après `computeVertexNormals`, moyenner les normales des deux colonnes de chaque rangée.
8. **Poids de tissu** (`:110`). `tis = (0, 1, 0)` classe la paroi en « vaisseau » : relief très lisse, rugosité ×0,85. Pour l'OD, `(0, 0.3, 1)` donne les plis fins de la paroi auriculaire du shader ; pour l'OG, `(0, 0.7, 0.4)`.
9. **Angles paramétriques et géométriques** (`:46`). `angleOf` renvoie un angle géométrique, alors que `valve.annulus(th)` est paramétré sur une ellipse (`ra`/`rb` = 1,19 pour la mitrale). L'écart atteint 5°, sans conséquence visible. Pour être exact : `Math.atan2(ra * Math.sin(phi), rb * Math.cos(phi))`, avec `ra`, `rb` = `d.radii`.
10. **Réalisme, par comparaison avec les photographies opératoires.**
    - L'endocarde de l'OG est plus pâle, blanc rosé à beige nacré, que le saumon actuel (`base`, `:100`) ; celui de l'OD est plus fin et laisse voir un muscle plus rouge sous les pectinés.
    - Ombre plus marquée au fond, près de l'anneau (`ao` 0,45 au lieu de 0,55 à s = 0).
    - L'orifice de l'auricule gauche est un peu petit : 1,1 × 0,7 cm, contre environ 2 × 1,5 cm en réalité (`rx` 0,75, `ry` 0,5).
    - Les orifices veineux gagneraient une lèvre nette (léger `ridge` circulaire à `rho` ≈ 1) plutôt qu'un dégradé seul.
11. **Téléphone : densité d'étiquettes.** La vue mitrale compte 11 étiquettes. Sous 420 px, « Veines pulmonaires gauches » et « droites » chevauchent P1 et P3. Utiliser des libellés courts (« V. pulmonaires G / D ») ou ne garder que les repères principaux (aorte, auricule, feuillets), les autres apparaissant au toucher.

## 5. Vérifié et exact

- **Base de calcul.** `E1 × E2 = +A` pour les deux valves ; `E1 ⟂ E2 ⟂ A` (écarts inférieurs à 10⁻³). `angleOf` est cohérent avec `dirOf`.
- **Positions à l'écran, mitrale** (droite de l'écran = droite du patient, haut = aorte) :

  | Repère | Heure |
  |---|---|
  | Aorte | 12,0 |
  | A2 (milieu du feuillet antérieur) | 11,3 |
  | Commissure antérolatérale | 9,1 |
  | Auricule gauche | 9,4 |
  | VPS gauche | 7,5 |
  | VPI gauche | 6,6 |
  | VPS droite / VPI droite | 4,6 / 4,5 (voir I3) |
  | Fosse ovale (septum) | 1,8 |
  | Commissure postéro-médiale | 1,4 |
  | Postérieur pur | 6,1 |
  | Supérieur pur | 10,5 |

  La crête entre l'auricule et la VPS gauche (crête « Coumadin ») est à sa place.
- **Positions à l'écran, tricuspide** (septal à 6 h) :

  | Repère | Heure |
  |---|---|
  | Feuillet antérieur | 10,2 |
  | Feuillet postérieur | 2,3 |
  | Feuillet septal | 6,0 |
  | Commissure antéro-septale | 7,9 |
  | Commissure postéro-septale | 4,1 |
  | Sinus coronaire | 3,6 |
  | VCI | 2,2 |
  | VCS | 6,6 |
  | Fosse ovale | 5,2 |
  | Auricule droite | 8,7 |
  | Aorte (derrière la paroi) | 5,7 |
  | Centre de la paroi libre | 10,7 |
  | Crête terminale | 8,2 et 1,3 |

  Ce sont les relations anatomiques attendues :
  - sinus coronaire entre la VCI et la commissure postéro-septale ;
  - fosse ovale entre la VCS et le sinus coronaire ;
  - VCS contre la racine aortique ;
  - auricule et pectinés sur la paroi antérolatérale, vestibule lisse (s < 0,18-0,32).
- **Valvule d'Eustachi** : pli horizontal sous la VCI, du côté de l'anneau. C'est juste.
- **Variante dilatée** : l'oreillette suit l'anneau de la variante (`valve.annulus`), et les étiquettes sont recalculées par variante. « Anneau dilaté » est à 10,8 h, sur la paroi libre.
- **Charnière** : liseré pâle de 1,5 mm (s < 0,06). La base de la paroi coïncide exactement avec la ligne d'insertion des feuillets (même `annulus`), sans jour.
- **Coût** : environ 8,9 k sommets et 16,9 k triangles par oreillette, 4 oreillettes ; `wallAt` est évalué une fois au chargement. C'est négligeable, même sur téléphone. Le matériau `intima` est partagé et isolé (`isolate`), donc aucune nouvelle compilation de shader.
- **Étiquettes** : masquées avec la variante (`setVisible`), sous la barre d'outils (`.labels` z-index 1). L'étiquette « Aorte (en arrière) » est commune aux variantes, ce qui est correct puisque le prolapsus ne modifie pas l'anneau.
- **Service worker** : `VERSION` v16, `./js/av-views.js` dans `SHELL`. **README** : à jour et exact.

## Corrections appliquées (17 octobre 2026)

| Point | Correction | Vérification |
|---|---|---|
| I1 | Veines caves abaissées (`s` 0,60 et 0,62), valvule d'Eustachi sous la veine cave inférieure ; relief atténué près du bord coupé (`disp × (1 − 0,8·smooth(0,85 ; 1 ; s))`). | Plus d'encoche dans la tranche (v19-02). |
| I2 | Endocarde tourné vers l'intérieur (`a, b, c2`) ; tranche du bord coupé avec ses propres sommets, couleur de muscle sectionné. | Liseré sombre remplacé par une tranche rouge (v19-01, v19-02). |
| I3 | Veines pulmonaires droites réparties entre le septum et l'arrière (`tS + 0,35·k` et `tS + 0,65·k`) ; moyenne d'angles sûre pour les étiquettes. | Quatre orifices distincts (v19-01). |
| I4 | Repères hauts abaissés (`s` ≤ 0,62), étiquettes ancrées plus bas, aorte à `s` 0,75, caméra reculée (14 / 16). | Tous les repères dans le champ (v19-01, v19-02). |
| I5 | Oreillette droite : 360 segments ; crêtes pectinées plus larges et fréquence variable. | v19-02 |
| Souhaitable | Fosse ovale vue de l'oreillette gauche sans limbe et moins pâle. | v19-01 |
