# Relecture : vue chirurgicale de la valve aortique (normale, bicuspidie type 1 L-R, RAo serré dégénératif)

- Date : 17 octobre 2026
- Relecteur : chirurgien cardiaque et échographiste, illustrateur médical et relecteur de code three.js r169, indépendant (aucune modification du code)
- Périmètre : le commit local `2d8c204`, soit :
  - `js/aortic-view.js` (nouveau) ;
  - les options exportées et `bulge` dans `js/valves.js` ;
  - le preset `intima` et les exports `material`, `cycle` et `valveData` dans `js/heart.js` ;
  - le mode de coupe `aortique` dans `js/app.js` ;
  - les boutons dans `index.html` et `css/style.css` ;
  - les fiches `VALVE_AORTIQUE` de `js/data.js` et `js/data.en.js` ;
  - `sw.js` v12.

  Captures `v14-01` à `v14-07`.
- Méthode : je n'ai pas pu lancer l'application. Pour compenser, j'ai :
  - lu l'en-tête de `assets/heart.bin` (valve aortique : R = 1,441 cm, Hc = 1,124 cm, secteurs des cuspides) ;
  - recopié en Node la géométrie de `makeCusp.point`, de `rootR` et du placement des ostia ;
  - calculé l'orientation à l'écran, l'aire des orifices (bord libre projeté sur le plan de l'anneau, avec et sans l'épaisseur de la lame), le relief des nodules, et la visibilité des ostia par lancer de rayons depuis la caméra ;
  - vérifié dans les sources de three r169 le comportement de `CSS2DRenderer` (un parent masqué masque les étiquettes de ses descendants) et de `Raycaster` (aucun test de visibilité).

  Les scripts jetables sont hors du dépôt (`scratchpad/relecture-v14/`).
- Repère : cm ; x vers la gauche du patient, y vers le haut, z vers l'avant.
- Gravité : **BLOQUANT** = trompeur pour un patient, faux anatomiquement ou bug visible sur un parcours courant ; **IMPORTANT** = visible et gênant, ou coût qui dégrade la fluidité sur téléphone ; **SOUHAITABLE** = amélioration.

## 1. Verdict

La vue est une vraie réussite pédagogique, et l'anatomie de base est juste.

- **Nomenclature.** La correspondance BodyParts3D (« Anterior » = coronaire droite, « Left posterior » = coronaire gauche, « Right posterior » = non coronaire) est correcte. Les directions réelles le confirment : le milieu de R pointe vers l'avant (0,96 en z), celui de L vers la gauche et l'arrière, celui de N vers la droite et l'arrière.
- **Orientation.** Elle est cohérente avec un chirurgien à droite du patient : gauche du patient en haut de l'écran, avant du patient à droite. N est en bas à gauche, du côté du chirurgien ; L est en haut, sur le côté opposé ; R est à droite. C'est la disposition des photos opératoires prises par une aortotomie, au réglage près des fils de traction.
- **Bicuspidie.** La géométrie est fidèle à un type 1 L-R de Sievers. La cuspide non coronaire mesure 145° et la cuspide conjointe 215°. Le raphé est placé sur l'ancienne commissure L/R (en haut à droite), l'attache est abaissée à 0,5 Hc au raphé, et la ligne de fermeture est unique.
- **RAo serré.** Le dessin est fidèle au RAo dégénératif : nodules sur la face aortique (vérifié : la face +N, qui porte le relief, est tournée vers l'aorte, +N·A = 0,82), d'abord à la base puis le long de la ligne de fermeture, bord libre épargné, commissures libres.
- **Surfaces simulées.**
  - valve normale ouverte : 3,3 cm², pour « 3 à 4 cm² » dans la fiche ;
  - RAo ouvert (0,18) : 0,72 cm² au bord moyen, **0,51 cm²** en tenant compte de l'épaisseur, pour « < 1 cm² » dans la fiche ;
  - bicuspidie ouverte : 2,0 cm².

Deux défauts sont bloquants. Ce sont deux bugs d'état sur des parcours très probables :
1. Si une structure est sélectionnée (par exemple « Valve aortique » choisie dans la liste) avant d'ouvrir la vue, **toute la vue s'affiche grisée et estompée** par le mode focus (§ B1).
2. **Un simple toucher du modèle dans la vue remplace la fiche de la variante par la présentation générale du cœur.** Sur téléphone, il ouvre en plus le panneau (§ B2).

Côté anatomie, le défaut principal est que **ni les sinus de Valsalva ni les ostia coronaires ne sont visibles**. Ils sont entièrement cachés sous le rebord de la jonction sino-tubulaire, alors que la fiche les décrit (§ I1). Les autres importants concernent :
- le cadrage sur téléphone ;
- le cœur masqué, qui reste calculé pendant le battement ;
- des ombres périmées au changement de variante ;
- la lisibilité des calcifications ;
- les seuils de l'ESC écrits avec « > » au lieu de « ≥ ».

## 2. Bloquants

**B1. La vue aortique hérite du mode focus d'une sélection précédente : racine et cuspides apparaissent grisées** (`js/app.js:152-160` ; `js/heart.js:452`, `:661` ; `js/aortic-view.js:84`, `:106`).

*Cause.* Les matériaux de la vue sont des matériaux « tissu » obtenus par `heart.material('vue-aortique', …)`. Ils partagent donc `focusUniform` et `selUniform` avec le cœur. Or `chooseCut('aortique')` ne désélectionne rien. `focusUniform` reste à 1, et pour ces matériaux `hlF` vaut 0 (`uHi` à 0, `vSid` à 255 ≠ `uSel`). Le shader applique alors `outgoingLight = mix(outgoingLight, lum·0,55 + 0,3, 0,6)` à toute la vue.

*Parcours.* L'utilisateur choisit « Valve aortique » dans la liste (la coupe 4 cavités s'ouvre et la structure est mise en avant), puis clique sur le bouton « Valve aortique ». La valve s'affiche grise et délavée, avec la fiche de la variante. Le bouton de la liste reste actif.

*Correctif* (les deux parties sont utiles) :
```js
// aortic-view.js, après la création des matériaux (avant toute compilation) : uniformes propres à la vue
const intima = heart.material('vue-aortique', 'intima'), valveMat = heart.material('vue-aortique', 'valve');
for (const m of [intima, valveMat]) { m.userData.uniforms.uFocus = { value: 0 }; m.userData.uniforms.uSel = { value: -2 }; }
// (utiliser intima pour la racine, l. 84)

// app.js, syncAorticView(), avant renderAorticFiche() : la vue aortique n'a pas de structure sélectionnée
if (on && state.selected) {
  state.selected = null; heart.setHighlight(null); refreshLabels();
  document.querySelectorAll('.struct-btn.active').forEach((b) => b.classList.remove('active'));
}
```
Le remplacement de `uFocus` et de `uSel` fonctionne parce que `onBeforeCompile` fait `Object.assign(sh.uniforms, uniforms)` sur l'objet même qui est exposé dans `userData.uniforms`. three r169 appelle `onBeforeCompile` pour chaque matériau, même quand le programme compilé est partagé.

**B2. Dans la vue aortique, un toucher ou un clic sur la scène remplace la fiche de la variante par la présentation générale** (`js/app.js:540-546`, `:525-534`).

*Cause.* `pick()` filtre les objets sur `o.parent?.visible`. Toutes les pièces du cœur sont enfants directs de `heart.root`, masqué dans cette vue : `pick()` renvoie donc toujours `null`, et `select(null)` est appelé. `select(null)` exécute `renderFiche(null)`, qui efface `dataset.ao` et affiche l'INTRO. Sur un écran de moins de 900 px, il ouvre en plus le panneau par-dessus la valve. Toucher la valve est le geste le plus naturel sur téléphone ; le patient perd l'explication qu'il lisait.

*Correctif.*
```js
labelRenderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
  downPos = null;
  if (moved > 6 || isAoMode()) return; // vue aortique : rien à sélectionner, la fiche de la variante reste affichée
  …
});
// pointermove : if (isAoMode()) { labelRenderer.domElement.style.cursor = 'grab'; return; }
```
Option : rendre les cuspides cliquables (lancer de rayons sur `aoView.variants[aoView.variant].cusps`) pour mettre en avant l'étiquette touchée.

## 3. Importants

| # | Fichier : ligne | Problème | Correctif |
|---|---|---|---|
| I1 | `js/aortic-view.js:37`, `:43-47`, `:92-102` ; `app.js:185` | **Sinus de Valsalva et ostia coronaires invisibles.** La racine se rétrécit au-dessus des sinus jusqu'à la jonction (0,98 R = 1,41 cm à HS = 1,29 cm), puis reste tubulaire jusqu'au bord coupé (HT = 1,69 cm). Or les ostia sont placés à h = 1,03 cm, sur une paroi de rayon 1,60 cm : sous ce rebord. Le lancer de rayons depuis la caméra donne **0 % du disque visible** pour les deux ostia, et la paroi des sinus est elle aussi entièrement cachée. Une inclinaison de la caméra ne suffit pas : 8 % visible à 40° vers N pour R, 0 % pour L. Même sans le rebord, l'ostium serait vu par la tranche, avec un diamètre apparent de 0,4 mm. Les captures le confirment : aucun ostium visible. Or la fiche normale dit que les orifices coronaires « s'ouvrent dans les sinus droit et gauche », et les cuspides sont nommées d'après eux. | Représenter l'aortotomie **écartée par les fils de traction** : pas de surplomb au-dessus du milieu des sinus, paroi évasée dans les sinus seulement (les commissures restent sur l'anneau), bord coupé au niveau de la jonction : `const hm = HS * 0.5, base = R * (1 + 0.2 * Math.sin(Math.PI * Math.min(h, hm) / HS) * lobe(th)); return h <= hm ? base : base + lobe(th) * Math.tan(0.6) * (h - hm);` et `HT = HS`. Ostia de rayon 0,2 cm (4 mm), liseré plus contrasté (`0xc98f86`), petite étiquette « Ostium coronaire gauche / droit ». Vérifié par le même calcul : **100 % visibles**, diamètre apparent 2,8 mm (3,0 mm avec une caméra inclinée de 15° vers N). Marquer la jonction sino-tubulaire par une bande d'intima plus claire vers h ≈ 0,9 HS, puisque le rebord disparaît. |
| I2 | `app.js:185` ; `css/style.css:223-227` ; `v14-07` | **Téléphone : le panneau des coupes couvre le haut de la racine.** La rangée des coupes, celle des variantes et celle de la phase descendent jusqu'à y ≈ 415 px sur 975. La caméra vise le centre du canevas (y ≈ 495) avec un rayon apparent d'environ 125 px. Le haut de la racine passe donc sous le panneau, et l'étiquette L l'affleure. Le bouton actif est tronqué (« Valve aortiqu »). Réserve : `v14-07` a été prise pendant l'animation de caméra (vue oblique, repère « D ← patient → G »), et le cadrage final reste à confirmer. | Comme `flowOffset()`, décaler la projection en vue aortique : `camera.setViewOffset(w, h, 0, -(toolsBottom - 70) / 2, w, h)`, la hauteur étant mesurée sur `.tools` (à appeler dans `syncAorticView` et dans `resize`, et à effacer en sortie). Mettre les variantes et la phase sur une seule rangée avec des libellés courts (voir S4). Au choix d'une coupe : `btn.scrollIntoView({ inline: 'nearest', block: 'nearest' })`. |
| I3 | `app.js:754`, `:763` | **Cœur masqué recalculé à chaque image pendant le battement en vue aortique.** `heart.setBeat()` lève `deformDirty` à chaque image et `heart.stepValves()` redessine les quatre valves cachées (lames, cordages, `deformPoint` par sommet). C'est le coût mesuré lors de la relecture précédente, dépensé pour rien : sur téléphone, plusieurs millisecondes par image. `occludeLabels` lance aussi des rayons sur le cœur caché. | `const ao = isAoMode();` puis `if (state.battement && !ao) heart.setBeat(…)` et `if (state.coupe && !ao && heart.stepValves(…))`. À la sortie de la vue, `restPose()` (déjà appelé par `chooseCut`) ou le battement suivant remettent la pose. |
| I4 | `app.js:658-661` ; `aortic-view.js:250`, `:266` | **Ombres périmées au changement de variante.** `setVariant` redessine les lames à l'image suivante (`dirty`), mais `step()` ne renvoie vrai que si la valve bouge. À l'arrêt, `shadowMap.needsUpdate` n'est donc jamais levé, et la carte d'ombre garde les cuspides de la variante précédente : ombre en Y projetée sur une bicuspidie, ou l'inverse, jusqu'à la prochaine action. | Dans le gestionnaire `[data-ao]` : `renderer.shadowMap.needsUpdate = true;`. La carte est rendue après le `draw` de la même image. Ou bien faire renvoyer à `step()` `moving \|\| wasDirty`. |
| I5 | `aortic-view.js:220-227` ; `heart.js` (fibres du define `VALVE`) ; `v14-05`, `v14-06` | **RAo : les calcifications se lisent mal ; le motif dominant est un Y jaune safran.** La teinte de base `[0,86, 0,75, 0,57]`, épargnée sur le bord libre (v > 0,82), dessine un Y saturé qui évoque un épaississement de la ligne de fermeture. Les nodules (relief calculé de 3,7 à 5,5 mm, 37 à 55 % de la surface au-delà de 0,6 mm) restent pâles et sans modelé : vue dans l'axe, éclairage d'en haut, assombrissement de bord faible (`0,25·k·(1−k)·4·0,5` ≤ 0,125). De plus, les fibres radiales du shader `VALVE` passent sur le calcaire, qui devrait être granuleux et mat. | Cuspide fibreuse moins jaune `[0.88, 0.80, 0.66]`, bord libre de la même teinte (pas plus vive). Calcaire `[0.95, 0.94, 0.90]` avec un liseré d'ombre au pied du nodule : `ao -= 0.35 * smoothstep(0.02, 0.08, calc) * (1 - smoothstep(0.08, 0.2, calc))`. Faire porter au canal `vparam.z` (épaisseur) l'épaisseur plus le relief, pour que la translucidité et les fibres s'effacent sur les nodules (`thin` → 0). Ou bien ajouter dans le shader `VALVE` un poids « calcaire » (attribut `tis.x` inutilisé par les lames) qui annule `fib` et augmente la rugosité. |
| I6 | `js/data.js:341`, `:345` ; `js/data.en.js:344`, `:348` | **Seuils du RAo serré inexacts.** Les recommandations ESC/EACTS 2021 définissent le RAo serré à gradient élevé par Vmax **≥** 4 m/s et un gradient moyen **≥** 40 mmHg, avec une surface < 1 cm² (ou < 0,6 cm²/m²). La fiche écrit « plus de 4 m/s », « supérieur à 40 mmHg », et les pastilles « > 4 m/s », « > 40 mmHg ». « Avec » laisse aussi croire que les trois critères sont toujours réunis, alors qu'il existe des RAo serrés à bas gradient. | FR : « Le rétrécissement est dit serré quand la surface d'ouverture est inférieure à 1 cm² ; le plus souvent, le sang y passe à au moins 4 m/s et le gradient de pression moyen atteint au moins 40 mmHg à l'échographie. » Pastilles : `'Surface < 1 cm²', 'Vitesse max ≥ 4 m/s', 'Gradient moyen ≥ 40 mmHg'`. EN : « …area is below 1 cm²; usually the jet reaches at least 4 m/s and the mean gradient at least 40 mmHg… », `'Peak velocity ≥ 4 m/s', 'Mean gradient ≥ 40 mmHg'`. |

## 4. Souhaitables

1. **Repère d'orientation** (`app.js:735-741`). Le texte générique « D ← patient → G » s'affiche pendant l'animation de caméra (`v14-01`, `v14-02` et `v14-07` le montrent ; à confirmer pour les deux premières, qui paraissent cadrées). Il est faux dans cette vue, où l'axe gauche-droite du patient est vertical à l'écran. Écrire le texte de la vue dès l'appel de `viewForCut('aortique')`, et le rendre explicite : « Vue depuis l'aorte · en haut : gauche du patient · à droite : avant ». Reprendre la même phrase dans l'aide de la fiche (`app.js:170`).
2. **Légende** (`index.html:80-90`). En vue aortique, elle liste « Vaisseaux à sang riche en oxygène », « Graisse des sillons », « Système électrique »… qui n'y figurent pas. La classe `is-ao` est posée sur la scène mais aucune règle CSS ne l'utilise. Ajouter `.scene.is-ao .legend-item { display: none; }` et, au besoin, une entrée « Calcium » pour le RAo.
3. **Raphé** (`aortic-view.js:187-188`). Son intensité croît vers le bord libre (0,35 à la paroi, 1 à partir de v = 0,75). Or le raphé est le plus marqué à son origine, sur la commissure rudimentaire, et s'estompe vers le bord libre quand il est incomplet. Ses calcifications débutent aussi plutôt près de la base. Proposition : `raphe = gauss(u - ur, 0.035) * (1 - 0.6 * smooth(0.5, 1, v))` et `calc` centré sur v = 0,2 et v = 0,45.
4. **Libellés pour les patients** (`index.html:69-71`). Remplacer « RAo serré dégénératif » par « Rétrécissement aortique » et « Bicuspidie 1 L-R » par « Valve bicuspide ». Le détail technique reste dans le titre de la fiche. Une rangée plus courte règle aussi I2.
5. **Fiche bicuspidie** (`data.js:332`). « Un avis familial peut être proposé » est peu clair. Écrire plutôt : « Une échographie peut être proposée aux parents, frères, sœurs et enfants, car la bicuspidie est parfois héréditaire. » « ≈ 3 bicuspidies sur 4 » peut devenir « environ 7 sur 10 » (Sievers : L-R ≈ 71 % de l'ensemble). Mentionner que le raphé dessiné est « ici partiellement calcifié ».
6. **Fiche RAo** (`data.js:343`). Nuancer « Le traitement est le remplacement de la valve » en « Quand il donne des symptômes ou fatigue le cœur, on remplace la valve… ». Expliquer TAVI : « une prothèse posée par un cathéter, sans ouvrir le thorax ».
7. **Diamètre de l'anneau.** Le modèle a R = 1,441 cm, soit un anneau de **2,9 cm**, alors que la fiche annonce « ≈ 2 à 2,5 cm ». Soit mettre la racine à l'échelle dans la vue (×0,8, valve normale ouverte alors ≈ 2,1 cm², à recaler avec `R * 0.12`), soit écrire « 2 à 3 cm ».
8. **Terminologie.** La fiche « Valve aortique » de la planche parle de « valvules semi-lunaires » (`data.js:124`), la nouvelle vue de « cuspides ». Harmoniser (« cuspides (valvules) semi-lunaires »). Ajouter dans cette fiche un bouton « Voir la valve comme le chirurgien » qui appelle `chooseCut('aortique')`.
9. **Valve normale fermée** (`aortic-view.js:133`). Le décalage de 0,02 cm de chaque bord libre vers sa cuspide laisse 0,4 mm entre les surfaces moyennes, alors que l'épaisseur cumulée des bords est de 0,23 mm. On obtient une fente réelle de 0,17 mm sur les trois branches du Y, vue comme un trait sombre qui donne sur le ventricule. Ramener le décalage à 0,01 cm pour que les cuspides se touchent.
10. **Bouton Fermée / Ouverte pendant le battement** (`app.js:662-665`). Il est ignoré sans signe visible. Le griser (`aria-disabled`) tant que le battement est actif.
11. **Zoom** (`app.js:48`). `minDistance = 8` empêche de s'approcher à moins de 8 cm, ce qui limite l'examen du raphé et des nodules. En vue aortique, autoriser 5 cm.
12. **Coût des normales** (`valves.js:183`). `computeVertexNormals()` recalcule toute la lame (2 655 sommets) à chaque image de mouvement, pour quatre lames à relief. Comme le relief est fixe, précalculer la perturbation de normale (gradient de `bulge` en u et v) et l'ajouter à `nrm` sur la face supérieure seule.
13. **Accessibilité.** Poser `aria-pressed` sur les boutons `data-ao` et `data-ao-phase`, et annoncer le changement de fiche (`aria-live="polite"` sur `#fiche` en vue aortique).
14. **Ouverture de la bicuspidie.** Le milieu de la corde étant à 0,29 R du centre, côté N, l'orifice se loge presque entièrement dans la moitié non coronaire. La cuspide conjointe ne dépasse le centre que de 0,13 R. Une « bouche de poisson » mieux centrée, plus fidèle aux images d'échographie, s'obtient avec `Fo` décalé de `−0.15 R · Wv` pour la cuspide N et un demi-petit axe de 0,5 R pour la cuspide conjointe.

## 5. Vérifié et exact

- **Repères.** E1 × E2 = +A : les secteurs tournent dans le sens direct autour de l'axe. Les normales calculées de la paroi interne pointent vers l'axe, le bord coupé regarde la caméra, et la face +N des lames est la face aortique (+N·A = 0,82 au ventre de la valve fermée, 0,93 à v = 0,3 en ouverture 0,18). Le relief des nodules et du raphé est donc bien sur la face aortique.
- **Écran.** Haut = (0,84, 0,54, 0,07), soit la gauche du patient ; droite = (0, −0,12, 0,99), soit l'avant. R est à (0,98 ; −0,19), L à (−0,40 ; 0,92), N à (−0,67 ; −0,75) : conforme aux captures et à la position d'un chirurgien à droite du patient.
- **Bicuspidie type 1 L-R.**
  - cuspide N de 145°, cuspide conjointe de 215° ;
  - raphé à u = 0,53 de la cuspide conjointe, sur l'ancienne commissure L/R (gauche-avant), attache abaissée à 0,5 Hc au raphé ;
  - même ligne de fermeture pour les deux cuspides, décalées de 0,25 mm chacune vers leur côté ; jeu restant 0,025 mm, sans interpénétration ;
  - deux commissures orientées droite-avant → gauche-arrière, cohérentes avec une fusion L-R.
- **RAo.** Six nodules basaux (v 0,10 à 0,42) et trois sur la ligne de fermeture (v 0,60 à 0,74), bord libre épargné au-delà de v = 0,82, commissures libres (u 0,15 à 0,85). Le tirage est reproductible (générateur de Park-Miller). Les cuspides sont épaissies à 1,1-1,4 mm, et l'orifice est étoilé à trois branches, de 0,51 cm² en tenant compte de l'épaisseur.
- **Surfaces.** Valve normale ouverte : 3,3 cm², conforme à la fiche ; RAo : < 1 cm², conforme ; valve fermée : 0,06 à 0,09 cm² de jeu résiduel une fois l'épaisseur prise en compte (voir S9 pour la valve normale).
- **Cache des formes.** `point(u, v, open)` est linéaire en `open` (`Fc.lerp(Fo, open)` et termes de ventre linéaires) : `Shell.cache` reste valable pour des ouvertures maximales de 0,85 et 0,18.
- **Mouvement.** Consigne `cycle(phase + 0,02).sl` × maximum de la variante, même phase que le cœur, ressorts sigmoïdes (14 et 9 Hz). La vibration du bord libre n'apparaît qu'en battement et que valve ouverte (0,3 mm). Chaque variante garde son propre état d'ouverture.
- **Enchaînements.**
  - sortie par « Coupe » désactivée : retour au cœur et à sa fiche ;
  - entrée en circulation : passage par `chooseCut('grand-axe')`, puis retour à la vue aortique à la sortie ;
  - les boutons de coupe sont masqués pendant la circulation (`.scene.is-flow .cut-tools`), donc pas de passage direct circulation → vue aortique ;
  - une sélection dans la liste ramène à la coupe 4 cavités et à la bonne fiche ;
  - aucun plan de coupe sur les matériaux de la vue (`cut = false`, aussi pour le matériau `interior` des lames).
- **Étiquettes CSS2D.** Celles du cœur sont bien masquées : `CSS2DRenderer` r169 appelle `hideObject` sous un parent invisible. Celles de la vue suivent `setVisible` et la variante, avec `pointer-events: none`.
- **Ombres et occlusion.** La racine et les lames projettent et reçoivent les ombres. La carte d'ombre, 2 048 texels sur 32 cm (0,16 mm par texel), est assez fine pour la valve. Les ombres de contact traitent la vue comme le reste de la scène.
- **Service worker.** `VERSION` v12 et `./js/aortic-view.js` dans `SHELL`. Les dépendances (`three`, `CSS2DRenderer.js`) sont déjà en cache. `data.en.js` n'est pas chargé par l'application, donc son absence du cache est sans effet.
- **Fiches.** Les contenus sont exacts et le ton adapté :
  - prévalence de la bicuspidie (1 à 2 %), malformation congénitale la plus fréquente ;
  - dilatation de l'aorte ascendante et surveillance échographique ;
  - calcification et rétrécissement, possible fuite ;
  - RAo dégénératif : début à la base sur la face aortique, commissures non soudées, symptômes (essoufflement, douleur thoracique, malaise), remplacement chirurgical ou TAVI décidé en équipe.

  Seuls les seuils sont à corriger (I6).

## Corrections appliquées (17 octobre 2026)

| Point | Correction | Vérification |
|---|---|---|
| B1 | Matériaux de la vue avec leurs propres uniformes `uFocus` / `uSel` (`isolate`) ; en entrant dans la vue, la sélection du cœur est effacée. | Valve aortique choisie dans la liste puis vue ouverte : rendu normal, non grisé (v15-01). |
| B2 | `pointerup` et `pointermove` ignorés en vue aortique. | La fiche de la variante reste affichée. |
| I1 | Aortotomie écartée : paroi évasée au-dessus du milieu des sinus (`tan 0,6`), bord coupé à la jonction sino-tubulaire ; ostia de 2 mm de rayon, liseré contrasté, étiquettes. | Sinus en trèfle et ostia visibles (v15-01). |
| I2 | Décalage de projection sous le panneau des réglages (`flowOffset`), libellés raccourcis (« Bicuspidie L-R », « Rétrécissement serré »), bouton actif ramené dans la vue. | — |
| I3 | Battement et valves du cœur masqué non recalculés en vue aortique. | — |
| I4 | `shadowMap.needsUpdate` au changement de variante. | — |
| I5 | RAo : cuspide `[0,88 ; 0,80 ; 0,66]`, calcaire `[0,95 ; 0,94 ; 0,90]`, ombre au pied des nodules ; relief compté dans l'épaisseur, fibres effacées sur le calcaire épais (shader `VALVE`). | Nodules crayeux en relief (v15-02, v15-03). |
| I6 | Seuils : surface < 1 cm² ; « le plus souvent » Vmax ≥ 4 m/s et gradient moyen ≥ 40 mmHg (FR/EN). | — |
| Souhaitables | Fiche normale : « Trois cuspides, trois sinus » au lieu du diamètre de l'anneau (2,9 cm dans le modèle) ; « échographie proposée aux proches parents » au lieu d'« avis familial ». | — |
