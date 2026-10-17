# Relecture : vues chirurgicales des valves mitrale et tricuspide, zoom de repérage

- Date : 17 octobre 2026
- Relecteur : chirurgien cardiaque et échographiste, illustrateur médical et relecteur de code three.js r169, indépendant (aucune modification du code)
- Périmètre : le commit local `022a693`, soit :
  - `js/av-views.js` (nouveau) : vues mitrale (normale, prolapsus de P2 avec rupture de cordage) et tricuspide (normale, dilatation de l'anneau) ;
  - `js/valves.js` : `avValve` exportée, options `prolapse`, `dilate`, `gap` et `tether` ;
  - `js/aortic-view.js` : interface commune des vues ;
  - `js/app.js` : mode « Valves », zoom de repérage (`goValve`, `runSteps`, `stepTrans`, `applyCam`, `fadeHeart`), suppression du mode de coupe « aortique » ;
  - fiches `VALVE_MITRALE` et `VALVE_TRICUSPIDE` (`js/data.js`, `js/data.en.js`) ;
  - `index.html`, `css/style.css`, `sw.js` v14, README.

  Captures `v16-01` à `v16-08`.
- Méthode : je n'ai pas pu lancer l'application. Pour compenser, j'ai :
  - lu l'en-tête de `assets/heart.bin` (anneaux, secteurs des feuillets, têtes des piliers, ancres) ;
  - exécuté en Node une **copie** de `js/valves.js` (three remplacé par une cale minimale), avec les options des deux variantes pathologiques ;
  - calculé l'orientation à l'écran de chaque vue (base caméra de `lookAt`, `up` de la vue), la position des étiquettes, la hauteur et le recul du segment P2, le défaut de coaptation et les diamètres de l'anneau tricuspide ;
  - rejoué à la main les enchaînements de `goValve` avec la coupe, la circulation, le battement, la sélection et les vues.

  Les scripts jetables sont hors du dépôt (`scratchpad/relecture-v16/`).
- Repère : cm ; x vers la gauche du patient, y vers le haut, z vers l'avant.
- Gravité : **BLOQUANT** = trompeur pour un patient, faux anatomiquement ou bug visible sur un parcours courant ; **IMPORTANT** = visible et gênant, ou coût qui dégrade la fluidité sur téléphone ; **SOUHAITABLE** = amélioration.

## 1. Verdict

L'ensemble est solide. Le zoom de repérage est une très bonne idée pédagogique : le patient voit la valve à sa place dans un cœur translucide, puis plonge vers elle. Les orientations des deux vues sont justes, parce qu'elles découlent de la géométrie réelle et non d'un miroir choisi à la main.

- **Mitrale (vue du chirurgien).**
  - L'écran a la droite du patient à droite, la valve aortique à 12 h et l'auricule gauche à 9-10 h : c'est la convention de l'ETO 3D (*surgeon's view*).
  - P1 est à 7,8 h, du côté de la commissure antérolatérale et de l'auricule ; P3 est à 2,7 h, du côté postéro-médial.
  - Le trou de l'auricule est à 9,6 h ; l'ancre de l'auricule dans le modèle est à 10,9 h.
- **Tricuspide (depuis l'oreillette droite, feuillet septal à 6 h).**
  - Le feuillet antérieur est à 10 h, le postérieur à 2 h et le septal à 6 h.
  - Le sinus coronaire est à 3,5-4 h, contre la commissure postéro-septale, comme il se doit.
  - Le nœud AV tombe à 5 h, au-dessus du feuillet septal.
- **Insuffisance tricuspide fonctionnelle.** L'anneau passe de 3,19 × 2,62 cm à 3,81 × 3,31 cm, et le versant septal ne s'élargit que de 5 %. Le défaut de coaptation central mesure environ 6,8 mm, et la tente se creuse de 3 mm. C'est cohérent avec une IT sévère et avec le seuil chirurgical de 40 mm.
- **Fiches.** Les seuils ESC 2021 sont exacts : IM primaire sévère avec ERO ≥ 40 mm² ou VR ≥ 60 mL ; IT sévère avec ERO ≥ 40 mm² ; anneau tricuspide ≥ 40 mm ou > 21 mm/m². Le ton convient aux patients.
- **Pas de régression.** Les valves du cœur, appelées sans options, gardent exactement leur géométrie : `scaleAt` = 1, décalage de coaptation 0,04 cm, `tether` = 0.

Un défaut est bloquant, et il touche le cœur du sujet : **le « feuillet flottant » P2 ne flotte pas**. Son bord libre reste au niveau de l'anneau et recule vers la paroi postérieure, au lieu de se retourner dans l'oreillette (§ B1). Le dessin évoque un feuillet rétracté, alors que la fiche décrit (justement) un bord qui « se retourne dans l'oreillette ».

Les points importants sont :
- des actions acceptées pendant la transition de retour, qui laissent la coupe sans sa valve ;
- la valve cible translucide dans un passage d'une valve à l'autre ;
- l'anneau de repérage vu presque par la tranche pour la mitrale et la tricuspide ;
- l'étiquette « Aorte » par-dessus la barre d'outils ;
- la phrase sur l'annuloplastie tricuspide ;
- les cordages rompus dessinés en peigne.

## 2. Bloquants

**B1. Le segment P2 « flottant » n'est ni soulevé au-dessus de l'anneau ni retourné : il recule vers la paroi** (`js/valves.js:293`, `:299-301` ; `js/av-views.js:100` ; capture `v16-05`).

*Mesures* (valve fermée, u = 0,5 de P2, copie exécutée de `avValve`) :

| | Normale | Prolapsus actuel |
|---|---|---|
| Bord libre par rapport au point d'anneau en regard (+ = côté ventricule) | +0,84 cm | **+0,09 cm** |
| Bord libre par rapport au plan du centre de l'anneau | +0,64 cm | −0,11 cm |
| Distance du bord libre à l'axe (dans le plan) | 0,42 cm | **0,74 cm** |
| Milieu du feuillet (v = 0,5) par rapport à l'anneau | +0,20 cm | +0,01 cm |

*Cause.* Deux éléments se combinent :
- le déplacement `(−A·lift + tmpD·0,32)·fl` porte une composante **radiale vers l'extérieur** (`tmpD` est la direction de l'anneau) : le bord s'éloigne de la ligne de coaptation et se rapproche de la paroi postérieure ;
- le rebord d'accolement `lip` (`:293`) reste tourné vers le ventricule (+A, jusqu'à 0,44 cm) et annule la moitié de `lift` = 0,75.

Résultat : le bord libre finit à l'aplomb de l'anneau, et une brèche en croissant s'ouvre entre A2 et P2. C'est l'aspect d'un P2 **restreint ou rétracté** (type IIIb de Carpentier) ou d'une fente, pas d'un *flail*. Un feuillet flottant se signale au contraire par :
- un bord libre qui monte franchement dans l'oreillette (pointe auriculaire), à plusieurs millimètres au-dessus de l'anneau ;
- sa face ventriculaire et sa zone rugueuse tournées vers l'observateur ;
- un ou des cordages rompus qui fouettent à la pointe.

La fiche (`data.js:365`, `data.en.js:368`) décrit le bon mécanisme, mais l'image ne le montre pas.

*Correctif* (vérifié sur la copie exécutée) :
```js
// valves.js:293 — sur le segment flottant, le rebord d'accolement se retourne vers l'oreillette
const lip = Math.max(0, (v - vc) / (1 - vc)) * 0.28 * h * (1 - 2 * flailBell(L, u));
// valves.js:301 — soulèvement vers l'oreillette, pointe légèrement ramenée vers l'axe (elle « déborde » vers A2)
if (fl > 0) { cx += (-A.x * pro.lift - tmpD.x * 0.15) * fl; cy += (-A.y * pro.lift - tmpD.y * 0.15) * fl; cz += (-A.z * pro.lift - tmpD.z * 0.15) * fl; }
```
Avec `lift` = 0,75, la pointe de P2 passe à **0,79 cm au-dessus de l'anneau**, à 0,27 cm de l'axe ; le corps (v = 0,7) est au niveau de l'anneau. Avec `lift` = 1,0 (`av-views.js:100`), la pointe monte à environ 1 cm. En projection, il reste 0,6 cm entre la pointe de P2 et le bord de A2 : l'orifice de fuite reste visible, mais il est maintenant **sous** un bord retourné vers l'observateur, ce qui est l'image attendue. À vérifier à l'écran : pas d'interpénétration avec A2, et ombre portée de la pointe sur l'orifice.

## 3. Importants

| # | Fichier : ligne | Problème | Correctif |
|---|---|---|---|
| I1 | `app.js:637-650`, `:731-733`, `:771`, `:786`, `:575`, `:885` | **Actions acceptées pendant une transition, état incohérent à l'arrivée.** Pendant le retour (`goValve(null)`), `state.valve` vaut déjà `null`, donc « Coupe », un bouton de vue ou une structure de la liste s'exécutent aussitôt. Trois effets en découlent. (a) **La valve quittée disparaît de la coupe.** `applyClipping` rend visibles les `cutOnly`, valves comprises, puis le `onEnd` du retour (`:575`) exécute `showHeartValve(V0, false)`. Exemple : on quitte la mitrale, on touche « Coupe » dans les 2,4 s, et la coupe 4 cavités n'a plus de valve mitrale jusqu'au prochain `applyClipping`. Pendant ce temps, le cœur est translucide alors que les capuchons de coupe sont opaques. (b) **Saut de caméra.** `goDir` mémorise `camAnim.from` au moment du clic, mais `stepCamAnim` est suspendu pendant `trans` (`:885`). À la fin, la caméra revient d'un coup à l'ancienne position, puis repart. Le `onEnd` réactive aussi « Face antérieure » alors que l'utilisateur a choisi une autre vue. (c) **Pendant l'aller**, `select(id)` modifie déjà `state.selected`, la surbrillance, la fiche et le bouton actif avant d'appeler `goValve`, qui sort aussitôt (`if (trans) return`). La sélection reste donc active, invisible, sous la vue de la valve. | Mettre en file la dernière action plutôt que de l'ignorer ou de l'exécuter : `let pending = null;` puis, au début de `select`, de `toggle` (sauf `battement` et `coronaires`), de `goView` et de `chooseCut`, `if (trans) { pending = () => <même appel>; return; }`. Dans `runSteps`, à la fin : `const p = pending; pending = null; p?.();`. En défense : `onEnd` du retour → `showHeartValve(V0, state.coupe)`. Dans `stepTrans`, à la fin, si `camAnim` existe : `camAnim.from.copy(camera.position); camAnim.tFrom.copy(controls.target); camAnim.uFrom.copy(camera.up); camAnim.t = 0;`. |
| I2 | `app.js:471-474`, `:550-551` | **D'une valve à l'autre, la valve cible reste translucide.** À la 1re étape (sortie de V0), `fadeHeart(0.28·e, V0)` rend la valve V1 du cœur transparente à 0,28. Aux étapes 2 et 3, V1 passe dans `keep` : `setOpacity` ne la touche plus et elle **reste à 0,28** jusqu'au `fadeHeart(1)` final. Le repérage montre donc une valve fantôme, perdue dans un cœur fantôme. | Dans `fadeHeart`, rétablir explicitement l'opacité de la valve gardée : `setOpacity(keep, 1);` après le `setOpacity` du reste. |
| I3 | `app.js:499`, `:492` ; capture `v16-08` | **Mitrale et tricuspide : l'anneau lumineux et la valve sont vus presque par la tranche.** `ctxCam` ajoute `(0 ; 0,195 ; 1,3)` à `camDir`. L'angle entre la normale de l'anneau et la direction de la caméra vaut alors **79°** pour la mitrale et **76°** pour la tricuspide (45° pour l'aortique). L'anneau devient une ellipse d'aplatissement 0,19 à 0,25, c'est-à-dire un trait, et la valve se voit de profil. Sur `v16-08`, on ne distingue pas d'anneau autour de la tricuspide. « Entourée » n'est pas tenu. | Anneau toujours face à la caméra : dans `animate`, `if (markerOn) marker.quaternion.copy(camera.quaternion);`, et supprimer le `lookAt` (`:492`). Pour voir la valve de trois quarts plutôt que de profil, pondérer davantage `camDir` : `dir: v.camDir.clone().multiplyScalar(1.4).add(new THREE.Vector3(0, 0.2, 1)).normalize()`. On obtient 46° pour la mitrale (vue d'en haut, par le toit de l'OG) et 46° pour la tricuspide (vue de droite, par l'OD), ce qui montre aussi au patient de quel côté on va regarder. |
| I4 | `av-views.js:111` ; `css/style.css:72` ; capture `v16-05` | **L'étiquette « Aorte » est collée au bord haut, par-dessus la barre d'outils, et pas à 12 h.** Elle est ancrée au bord extérieur du plancher (`s` = 1), à y ≈ 0,95 de la demi-hauteur. Avec le décalage de projection, elle tombe dans le panneau des réglages. `CSS2DRenderer` (r169, `sortObjects`) donne aux étiquettes un `z-index` de 1 à N ; or `.labels` ne crée pas de contexte d'empilement. L'étiquette la plus proche (z = 6) passe donc **devant** `.tools` (z = 5), comme on le voit sur `v16-05`. De plus, elle est ancrée sur `tAnt` (11,3 h) et non dans l'axe de l'aorte (12 h). | `.labels { position: absolute; inset: 0; z-index: 1; }` : les étiquettes restent sous les outils (5) et sous le tiroir mobile (10). Ancrer l'étiquette dans l'axe `up`, plus près de l'anneau : `label('Aorte (en arrière)', C.clone().addScaledVector(up, R * 1.45).addScaledVector(atrialSide, 0.5))`, ce qui donne y ≈ 0,6. « En arrière » évite que le patient prenne le plancher rose pour l'aorte. |
| I5 | `data.js:395`, `data.en.js:398` | **Indication de l'annuloplastie tricuspide inexacte et ambiguë.** « Un anneau est posé sur la tricuspide si son anneau mesure au moins 40 mm » fait d'un seuil une règle. Dans les recommandations ESC/EACTS 2021, la réparation est **recommandée** (classe I) en cas d'IT sévère au cours d'une chirurgie du cœur gauche. Elle est **à envisager** (IIa) en cas d'IT légère ou modérée avec anneau dilaté (≥ 40 mm ou > 21 mm/m²). Le double « anneau » (prothèse et anneau valvulaire) prête à confusion, et « mm/m² » n'est pas expliqué. | FR : « Elle est dite sévère quand l'orifice de fuite atteint au moins 40 mm². Lors d'une opération du cœur gauche, le chirurgien répare aussi la tricuspide si la fuite est sévère, et souvent quand la fuite est moindre mais que la base de la valve est dilatée (au moins 40 mm, ou plus de 21 mm par m² de surface corporelle) : il y pose un anneau prothétique. » EN : « …During left-sided heart surgery, the surgeon also repairs the tricuspid valve if the leak is severe, and often when it is milder but the valve base is enlarged (at least 40 mm, or more than 21 mm per m² of body surface area), by implanting a prosthetic ring. » |
| I6 | `valves.js:323`, `:365-369` ; capture `v16-05` | **Cordages rompus en peigne, et toujours dirigés vers l'oreillette.** Toutes les insertions marginales du segment (`flailBell` > 0,5) sont rompues, soit **7 cordages**. Ce sont 7 bâtonnets droits, parallèles et régulièrement espacés, longs de 0,5 cm, qui partent en éventail vers l'anneau postérieur. On dirait une frange, pas un cordage rompu, alors que l'étiquette dit « cordage rompu » au singulier. Leur bout libre est calculé à `−0,3·A + 0,42·radial` quelle que soit la phase : en diastole, quand P2 pend dans le ventricule, ils restent pointés vers le haut et vers la paroi, au lieu de suivre le flux vers le ventricule. | N'en rompre que 2 ou 3 (par exemple `torn = … && flailBell > 0.5 && (k % 3 === 1)`, `k` étant l'indice de l'insertion) ; les autres insertions de P2 sont simplement absentes, puisque P2 n'est plus tenu. Les allonger (0,7 à 0,9 cm) et leur donner une courbure propre : point milieu décalé de `lineDirR·0,15·sin(…)`, dessiné en 3 tronçons comme les autres. Faire suivre la phase au bout libre : `const s = 1 - 2 * openAt(1);` (`openAt` est le paramètre de `rawChords`) puis `e = p + A·(−0,3·s) + radial·0,42·(0,5 + 0,5·s)`, de façon qu'en systole il flotte dans l'oreillette et qu'en diastole il pende dans le ventricule. |

## 4. Souhaitables

1. **Valve du cœur pendant le repérage** (`app.js:550`, `:556`). Elle est montrée dans son dernier état dessiné : ouverte à 0,9 si la coupe n'a jamais été ouverte (`snap(0.9)`), alors que la vue s'ouvre « Fermée ». Au fondu, le patient voit une valve ouverte se changer en valve fermée. Elle reste aussi figée si le cœur bat pendant le retour. Dans `onStart`, appeler `heart.valves[V.heartValveId].snap(valveOpen ? 1 : 0, heart.deformPoint)`.
2. **Battement actif à l'entrée** (`app.js:888`, `:153`). `restPose()` sort aussitôt si `state.battement` est vrai : le cœur translucide se fige à une phase quelconque, parfois en pleine systole. En mode Valves, appeler `heart.setBeat(null)` sans condition.
3. **Sinus coronaire de la variante dilatée** (`av-views.js:128-130`). Le trou est placé une fois pour toutes sur le plancher de la valve **normale**. Le plancher de la variante dilatée est plus bas à cet endroit : le disque noir flotte 2,5 mm au-dessus, et paraît plus grand sur `v16-07`. Créer le trou et l'étiquette par variante, dans la boucle, avec `floorPoint(v.valve, tPS, 0.55)`.
4. **Décalage de projection** (`app.js:421-427`, `:581-592`). `syncValveUI()` applique ou retire `setViewOffset` dès le début de la transition, et l'image saute d'une demi-hauteur de panneau. Interpoler le décalage dans `stepTrans`, de 0 à `top/2` pendant la plongée et dans l'autre sens au retour.
5. **Mouvement réduit et temps de lecture.** Le repérage dure 2,9 s (3,8 s d'une valve à l'autre) et n'accorde aucune pause au cœur translucide. Ajouter une étape fixe d'environ 0,8 s après le repérage (`dur: 0.8, to: () => ctxCam(V1)`). Sous `prefers-reduced-motion`, réduire les durées à 0,3 s ou passer au fondu seul. Pendant la plongée, afficher au-dessus de l'étiquette : « on regarde depuis l'oreillette gauche ».
6. **Texte d'orientation figé** (`app.js:873`). « Aorte en haut » reste affiché même après que l'utilisateur a fait tourner la vue. Revenir au texte générique au-delà de 25° d'écart avec `camDir`, et proposer un bouton « Recentrer » qui rejoue `closeCam`.
7. **Rotation de l'écran** (`app.js:822`). En vue de valve, `resize` ne recalcule pas la distance de `closeCam` (`portrait()`). En passant de paysage à portrait, la valve déborde. Si `state.valve && !trans`, réappliquer `closeCam` (instantanément ou avec `goDir`).
8. **Têtes des piliers mitraux** (en-tête de `heart.bin`, `tools/build-heart-bp3d.mjs`). Elles sont à 11,9 h (angle 2,03 rad, sous le milieu du feuillet antérieur, côté aorte) et à 7,5 h. La relecture précédente les plaçait à 2,92 et −0,23 rad ; le calcul de la « tête la plus auriculaire » les a déplacées. Valve ouverte, le patient les voit dans la vue, et les cordages de la moitié postéro-médiale convergent sous A2. Attendu : sous les commissures, vers 9 h (AL) et 2-4 h (PM). Prendre l'angle du centroïde du pilier, ou ramener chaque tête vers l'angle de sa commissure.
9. **A2 à 11,3 h.** Le milieu du feuillet antérieur est à 20° de l'aorte, `up` étant pris sur le centre de la valve aortique. On peut l'accepter (modèle BodyParts3D), ou prendre `up` sur `dir(tAnt)` pour aligner A2, la continuité mitro-aortique et 12 h.
10. **Festons de P1-P3 peu lisibles** valve fermée et normale (`v16-04`). Les fentes interscallopaires ne se voient presque pas, et le patient ne retrouve pas « trois festons ». Creuser les fentes près du bord libre (`0.74 + 0.26·…` → `0.6 + 0.4·…` dans `prof`) ou ajouter un pli d'ombre dans `shadeLeaflet` aux u = 1/3 et 2/3 du feuillet postérieur.
11. **IT fonctionnelle.**
    - Les feuillets s'étirent avec l'anneau (`point` suit `annulus`) : ils paraissent plus grands, alors que la fiche les dit « trop courts ». Écrire plutôt « trop petits pour cet orifice ».
    - Le défaut de coaptation est identique pour les trois feuillets (0,34 cm). On peut le faire croître avec la dilatation locale (`gap · (scaleAt(th) − 1) / dil`), ce qui l'excentre vers la paroi libre.
    - Dessiner en pointillé l'anneau normal dans la variante dilatée : la comparaison serait immédiate.
12. **Étiquettes pathologiques valve ouverte.** « Défaut de coaptation » et « P2 prolabé » flottent au-dessus d'un orifice ouvert. Les masquer quand `op.base.x` > 0,5, ou montrer à la place « (valve ouverte) ».
13. **Fiches** (`data.js:350-399`, idem EN).
    - Préfixer les pastilles : « IM sévère : orifice de fuite ≥ 40 mm² », « IT sévère : … », « Anneau dilaté : ≥ 40 mm ». Sinon, le patient lit ses propres valeurs.
    - Prolapsus : ajouter qu'« un feuillet flottant suffit à classer la fuite comme sévère », et donner un repère d'alerte (« un essoufflement brutal doit faire consulter »).
    - IT : réordonner « Le sang qui reflue gonfle les veines : jambes et ventre gonflés, gros foie, fatigue ». Ajouter aux traitements « traiter la cause (valve du cœur gauche, rythme) ».
14. **Téléphone.** `#valve-tools` occupe trois rangées sous 400 px : regrouper « Fermée / Ouverte » avec les variantes, ou passer les variantes dans un menu. En portrait, la distance ×2 révèle le bord du plancher (anneau rose sur fond gris) : prolonger le plancher (`s` jusqu'à 1,6) ou assombrir sa périphérie.
15. **Première plongée.** `pilMat` (`av-views.js:72`, `MeshPhysicalMaterial` sans clé de cache partagée) et les `MeshBasicMaterial` des trous se compilent à la première apparition, ce qui peut créer un à-coup au milieu de la plongée sur téléphone. Appeler `renderer.compileAsync(scene, camera)` au démarrage, vues visibles et opacité nulle.
16. **Deux « vues chirurgien » de la mitrale.** La coupe « Vue chirurgien » et Valves › Mitrale coexistent sans lien. Ajouter dans la fiche de la coupe un bouton « Voir en gros plan » (`goValve('mitrale')`), ou retirer la coupe.
17. **Accessibilité.** `aria-pressed` sur `[data-valve]`, `[data-variant]` et `[data-vphase]` ; annonce `aria-live="polite"` de la valve atteinte à la fin du zoom.
18. **Capture `v16-06` périmée.** Les étiquettes de la tricuspide normale y sont près du centre et se chevauchent, ce qui correspond à `v` = 0,45. Le code actuel (`v` = 0,18) les place à 85 % du rayon, comme sur `v16-07` (positions recalculées : à quelques pixels près). La refaire pour le dossier.

## 5. Vérifié et exact

- **Orientation de la vue mitrale.** Droite de l'écran = (−0,80 ; −0,59 ; 0,02), soit la droite du patient ; haut = (−0,40 ; 0,57 ; 0,71). Positions à l'écran :
  - valve aortique à 12,0 h ;
  - commissure antérolatérale (choisie du côté +x) à 9,1 h, postéro-médiale à 1,4 h ;
  - P1 à 7,8 h, P3 à 2,7 h (`p1First` correct) ;
  - auricule gauche à 9,6 h (trou) et 10,9 h (ancre du modèle).

  Le texte « Vue depuis l'oreillette gauche · aorte en haut » est exact.
- **Orientation de la vue tricuspide.** Septal à 6,0 h (choisi), antérieur à 10,2 h, postérieur à 2,3 h ; commissure antéro-septale à 7,9 h, postéro-septale à 4,1 h (`tPS` = `sep.t0`, écart 0,0002 rad avec `post.t1`) ; sinus coronaire à 3,5-4,1 h, nœud AV à 5,1 h. Ce sont les relations anatomiques attendues : sinus coronaire et triangle de Koch du côté de la commissure postéro-septale.
- **Variante dilatée.**
  - `scaleAt` vaut 1,05 au septum et 1,32 sur la paroi libre ; anneau de 3,19 × 2,62 → 3,81 × 3,31 cm.
  - Bords libres à 0,34 cm de l'axe (au lieu de 0,04 cm), soit environ 6,8 mm de défaut central, qui se referme vers les commissures (0,3·`gap`).
  - Tente de 0,56-0,77 → 0,86-1,07 cm.
  - L'étiquette « Anneau dilaté » est sur la paroi libre (2,3 h).
- **Interface commune** (`aortic-view.js`). `key`, `camDir`, `focus`, `dist`, `variantList`, `orient` et `showLabels` sont cohérents. Les étiquettes respectent `labelsOn` et sont masquées sous un parent invisible (`CSS2DRenderer` r169).
- **Matériaux des vues.** `isolate` (uniformes `uFocus` et `uSel` propres) est appliqué à `valve`, `cordage` et `intima`. `fadeHeart` exclut `viewMats`. `setOpacity(…, 1)` remet `transparent`, `opacity` et `depthWrite` à leurs valeurs d'origine : aucun matériau « tissu » n'était transparent au départ. Le `fadeHeart(1)` final rétablit `castShadow` (`castSaved`).
- **Enchaînements sans transition en cours.** Coupe, circulation, vues et liste des structures passent par `goValve(null, after)`. Le battement anime la valve affichée (`cycle(phase + 0,02).av`). La circulation et la coupe sont fermées avant l'entrée. `pointerup` et `pointermove` sont ignorés en vue de valve, et la fiche de la variante reste affichée.
- **Mode de coupe « aortique » supprimé proprement** : plus aucune référence à `aoView`, `isAoMode`, `data-ao` ni `ao-tools`.
- **Service worker** : `VERSION` v14, `./js/av-views.js` dans `SHELL`. `data.en.js` n'est pas chargé par l'application.
- **Fiches.** Contenus exacts :
  - nomenclature A1-A3 / P1-P3 ;
  - P2, segment le plus souvent atteint ;
  - réparation de référence, TEER pour certains patients ;
  - IT fonctionnelle, forme la plus fréquente, associée aux valvulopathies gauches, à l'HTAP et à la FA ;
  - surfaces (4-6 cm² et 7-9 cm²) ;
  - seuils ESC 2021 rappelés au § 1.

  Seule la phrase de I5 est à reprendre.

## Corrections appliquées (17 octobre 2026)

| Point | Correction | Vérification |
|---|---|---|
| B1 | Segment prolabé : zone d'accolement retournée vers l'oreillette (`lip × (1 − 2·flailBell)`), soulèvement `lift` 1,0 cm, léger écart (0,14 cm) de la ligne de fermeture pour garder la brèche visible. | Bord de P2 retourné dans l'oreillette, brèche en croissant visible (v17-01). |
| I1 | Actions demandées pendant une transition (valve, coupe, circulation, vues, sélection) mises en file d'attente et exécutées à la fin ; `camAnim` annulé en fin de transition ; valve quittée remise selon l'état de la coupe. | — |
| I2 | `setOpacity(keep, 1)` : la valve à situer reste opaque d'une valve à l'autre. | — |
| I3 | Anneau de repérage face à l'observateur ; vue de repérage `camDir·1,4 + (0 ; 0,2 ; 1)`. | v17-02 |
| I4 | `.labels { z-index: 1 }` (étiquettes sous la barre d'outils) ; étiquette « Aorte (en arrière) » ancrée vers 12 h. | v17-03 |
| I5 | Fiche tricuspide (FR/EN) : réparation recommandée si la fuite est sévère, à envisager si l'anneau est dilaté (≥ 40 mm ou > 21 mm/m²). | — |
| I6 | 2 à 3 cordages rompus, plus longs et courbés, bout libre dans l'oreillette valve fermée et dans le ventricule valve ouverte. | v17-01 |
| Souhaitables | Valve du cœur montrée fermée pendant le repérage ; cœur remis en pose de repos (plus figé en systole) ; orifice du sinus coronaire placé sur l'anneau de chaque variante ; transitions raccourcies si `prefers-reduced-motion` ; pas de temps des transitions borné à 0,25 s ; capture périmée v16-06 retirée. | — |
