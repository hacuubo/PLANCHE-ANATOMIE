# Relecture : circulation guidée, coupes 5 cavités et vue chirurgien

- Date : 17 octobre 2026
- Relecteur : cardiologue-échographiste, illustrateur médical et relecteur de code three.js, indépendant (aucune modification du code)
- Périmètre : le commit local `90cb471`.
  - Retrait du mode Étiquettes (planche numérotée) : `index.html`, `css/style.css`, `js/app.js`, `README.md`.
  - Circulation guidée : `FLOW_STEPS`, `updateFlow`, `showStep`, panneau des étapes, `setCirculation` (`js/app.js:266-397`).
  - Coupes « 5 cavités » et « Vue chirurgien », caméra avec cible et verticale animées : `js/app.js:119-156`, `:488-518`.
  - `heart.landmarks` et `setPose` : `js/heart.js:566-618`.
  - Captures `v10-01` à `v10-05`.
- Limites : je n'ai pas pu lancer l'application et les captures font 800 px de large. Pour compenser, j'ai :
  - lu l'en-tête de `assets/heart.bin` (repère `frame`, `valves`, `anchors`, `flowPaths`) ;
  - recalculé les plans 4 et 5 cavités et la vue chirurgien (position « horaire » des repères à l'écran) ;
  - projeté les points des trajets avec la caméra de `flowView`, puis cherché quelle cavité coupée se trouve sous chaque flèche à l'écran (sommets de `cavites` du côté gardé, à moins de 1 cm du plan) ;
  - vérifié dans le source de three r169 (`OrbitControls.js`) que les champs `_quat` et `_quatInverse` existent.

  Ces scripts jetables sont placés hors du dépôt. Les points marqués « à confirmer » relèvent du raisonnement sur le code, sans capture probante.
- Repère : coordonnées de l'application en cm (x vers la gauche du patient, y vers le haut, z vers l'avant).
- Gravité :
  - **BLOQUANT** : trompeur pour un patient, faux anatomiquement ou bug visible ;
  - **IMPORTANT** : visible et gênant ;
  - **SOUHAITABLE** : finition.

## 1. Verdict

Le commit est propre et la géométrie est juste.
- **Retrait des étiquettes.** Il ne reste aucune référence cassée : plus de `state.etiquettes`, de `.planche` / `.plabel`, ni de `layoutPlanche`. Il ne reste que quelques résidus inoffensifs (§ 4).
- **Trajets des étapes.** Les indices de `FLOW_STEPS` correspondent tous aux bons points de `flowPaths` (`build-heart-bp3d.mjs:474-480`). Exemple : l'étape 2 va de `odC` à `vd` en passant par `tricus` ; l'étape 7 va de `lvLow` à `asc` en passant par `lvot` et `aortic`.
- **Coupe 5 cavités.** C'est bien une apicale 5 cavités :
  - le plan contient la pointe et le centre de la valve aortique ;
  - il est basculé de 22° vers l'avant par rapport au plan 4 cavités ;
  - la chambre de chasse du VG est dans le plan (point `lvot` à −0,16 cm), et elle fait 13° avec lui ;
  - la valve pulmonaire est retirée (+2,4 cm).
- **Vue chirurgien.** Elle respecte la convention de l'ETO 3D :
  - caméra placée dans l'oreillette gauche et dirigée vers le VG ;
  - aorte à 12 h par construction ;
  - commissure antérolatérale à 9 h, donc à gauche de l'écran ;
  - septum interauriculaire, nœud AV et tricuspide à droite.

Deux défauts sont bloquants pour un outil d'éducation thérapeutique :
1. **Les textes des étapes 2 et 6 font dire que c'est la contraction de l'oreillette qui ouvre la valve.** C'est faux, et trompeur pour les patients en fibrillation auriculaire (§ B1).
2. **En coupe 4 cavités, les flèches d'éjection passent à l'écran sur l'oreillette gauche.** Les voies d'éjection sont hors du plan et les flèches sont dessinées sans test de profondeur. L'éjection du VG (étape 7) ressemble à une fuite mitrale, et celle du VD (étape 3) traverse le VG puis l'OG (§ B2).

## 2. Bloquants

**B1. « L'oreillette se contracte : la valve s'ouvre » (étapes 2 et 6, `js/app.js:274-275` et `:282-283`).**

*Problème.*
- Les valves auriculo-ventriculaires s'ouvrent **passivement**, dès que la pression du ventricule qui se relâche passe sous celle de l'oreillette.
- Environ 70 à 80 % du remplissage se fait à ce moment (onde E). La contraction de l'oreillette n'apporte que les 20 à 30 % restants, en fin de diastole (onde A).
- Le texte actuel inverse la cause. Or la fibrillation auriculaire est l'un des premiers motifs d'éducation thérapeutique. Un patient en FA en déduira que, sans contraction de ses oreillettes, le sang ne passe plus dans ses ventricules. C'est faux et anxiogène.

*Correctif (textes et poses).*
```js
// étape 2
{ titre: "De l'oreillette au ventricule droit", texte: "Le ventricule droit se relâche : la valve tricuspide s'ouvre et le sang de l'oreillette droite descend dans le ventricule. À la fin, l'oreillette se contracte pour le remplir complètement.",
  seg: [[0, 2, 6]], focus: 'valve-tricuspide', pose: { atr: 0.4, ven: 0, av: 1, sl: 0 } },
// étape 6
{ titre: "De l'oreillette au ventricule gauche", texte: "Le ventricule gauche se relâche : la valve mitrale s'ouvre et le sang de l'oreillette gauche descend dans le ventricule. À la fin, l'oreillette se contracte pour le remplir complètement.",
  seg: [[2, 2, 4]], focus: 'valve-mitrale', pose: { atr: 0.4, ven: 0, av: 1, sl: 0 } },
```
`atr` passe de 0,8 à 0,4 : la contraction auriculaire devient un complément, pas le moteur.

**B2. Flèches d'éjection projetées sur l'oreillette gauche en coupe 4 cavités** (étapes 3 et 7, v10-02).

*Diagnostic.*
- Les flèches et couloirs sont dessinés sans test de profondeur (`overlayMat`, `js/app.js:294`), alors que les voies d'éjection sont **devant** le plan 4 cavités :
  - VG : `lvot` à +1,54 cm, `aortic` à +2,80 cm, `asc` à +4,17 cm ;
  - VD : `rvot` à +3,44 cm, `pulmo` à +4,52 cm.
- Vues de `flowView`, d'en haut et de face, ces voies d'éjection se projettent sur les cavités postérieures. J'ai projeté les points des trajets et identifié la cavité coupée située dessous :

| Étape | Point du trajet | Cavité coupée sous la flèche à l'écran |
|---|---|---|
| 7 (éjection VG) | milieu `aortic`→`asc`, puis `asc` | **oreillette gauche** (59 et 95 sommets, aucun autre) |
| 3 (éjection VD) | milieu `vd`→`rvot` | **ventricule gauche** (138 sommets) |
| 3 | `pulmo`, puis milieu `pulmo`→`ptTop` | **oreillette gauche** et ventricule gauche |

- Sur v10-02, les flèches rouges de l'étape 7 remontent du VG, passent sur la valve mitrale et finissent au-dessus d'elle, dans l'oreillette gauche, alors que le texte dit « la valve mitrale se ferme ». Pour un patient, c'est l'image d'une **insuffisance mitrale**. À l'étape 3, du sang bleu traverse le VG puis l'OG, comme dans une communication interventriculaire.

*Correctif.* Donner à chaque étape sa coupe et son cadrage. J'ai vérifié les deux propositions par le même calcul :
- **étape 7 en « 5 cavités »** (caméra `goDir(N5)`) : de `lvLow` à `aortic`, toutes les flèches restent sur le VG ;
- **étapes 3 et 4 en coupe frontale à z = 2,0** (vue antérieure, paroi libre du VD retirée) : de `vd` à `pulmo`, toutes les flèches restent sur le VD, puis le tronc pulmonaire sort du cœur.

```js
// FLOW_STEPS : champ optionnel « coupe » (mode, profondeur) ; par défaut 4 cavités
{ titre: 'Le ventricule droit éjecte le sang', …, coupe: ['frontale', 2.0] },
{ titre: 'Vers les poumons', …, coupe: ['frontale', 2.0] },
{ titre: 'Le ventricule gauche éjecte le sang', …, seg: [[2, 4, 6]], coupe: ['cinq-cavites'] },   // s'arrête à la valve aortique
{ titre: 'Vers tout le corps', …, seg: [[2, 6, 10], [4, 2, 4]], coupe: ['cinq-cavites'] },       // de la racine aortique jusqu'à l'aorte descendante
// showStep(i), après la mise à jour du texte
const [mode, depth] = st.coupe ?? ['grand-axe'];
if (mode !== state.modeCoupe || depth !== undefined) {
  document.querySelectorAll('[data-cut]').forEach((x) => x.classList.toggle('active', x.dataset.cut === mode));
  setCutMode(mode, depth);
}
flowViewFor(mode);   // grand-axe : flowView() actuel ; cinq-cavites : goDir(N5, { target: … }) ; frontale : goDir(new THREE.Vector3(0, -0.03, 1), { target: … })
```
- Le saut de plan est instantané. Si on le trouve brutal, on peut le masquer par un fondu de 150 ms de `canvasWrap` (opacité).
- Il faut alors réécrire la phrase « en coupe 4 cavités » du README (l. 35-38).

## 3. Importants

| # | Fichier : ligne | Problème | Correctif |
|---|---|---|---|
| I1 | `js/app.js:520-528` | **« Coupe » pendant la circulation.** Le bouton Coupe reste actif dans le groupe « Modes ». Un clic retire la coupe mais garde la circulation : flèches dessinées par-dessus un cœur fermé, valves masquées (`cutOnly`), alors que les textes parlent des valves. C'est l'inverse de ce qu'attend l'utilisateur, qui pense changer de mode. | En tête de `toggle` : `if (name === 'coupe' && state.circulation && value === undefined) { flow.prev = { coupe: true, mode: state.modeCoupe }; toggle('circulation', false); return; }` On quitte la circulation et on garde la coupe en cours. |
| I2 | `js/app.js:378`, `css/style.css:215` (v10-05) | **Téléphone : le panneau des étapes cache le bas du cœur.** En portrait, `viewDistance() × 0,92` vaut environ 105 cm, mais `controls.maxDistance = 60` (l. 51) ramène la caméra à 60 cm. La pointe (`apex`, 67 % de la hauteur) et l'entrée de la VCI (66 %) passent sous le panneau, qui commence vers 65 % et descend plus bas quand le texte fait 4 lignes (étape 7). Les flèches des étapes 2, 6 et 7 près de la pointe sont masquées. Le décalage fixe de la cible (−2,4 cm) ne compense pas. | Décaler la projection plutôt que la cible : `function frameFlow() { const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight, ph = state.circulation ? flowUI.offsetHeight + 16 : 0; if (ph) camera.setViewOffset(w, h, 0, ph / 2, w, h); else camera.clearViewOffset(); }`. L'appeler dans `showStep` (après le texte), dans `setCirculation` et dans `resize`. Supprimer le `−2,4` de `flowView`. Ajouter dans `resize` : `controls.maxDistance = Math.max(60, viewDistance() * 1.1)`. Le raycasting et `project()` tiennent compte du décalage. |
| I3 | `css/style.css:220`, `js/app.js:289` | **Avertissement masqué sur téléphone.** Sur téléphone (≤ 700 px), le support le plus probable des patients, la note « les deux moitiés du cœur se contractent en même temps » est masquée. Le patient comprend alors que le cœur droit se contracte, puis le gauche. | Supprimer `.fg-note { display: none; }` et n'afficher la note qu'aux étapes 1 et 5 : `flowUI.querySelector('.fg-note').hidden = !(i === 0 \|\| i === 4)`. Variante : l'intégrer au texte de l'étape 5 (« … Pendant ce temps, le côté droit fait exactement la même chose. »). |
| I4 | `js/app.js:290`, `:323`, `:366-372` | **Défilement trop rapide, sans annonce.** La lecture automatique change d'étape toutes les **7 s**, alors que les textes font 25 à 35 mots, soit 10 à 14 s de lecture pour un patient âgé ou peu lecteur. Le texte change avant d'être lu. Rien n'est annoncé aux lecteurs d'écran : pas de `role`, pas d'`aria-live`, et les points de progression ne sont pas masqués. | Durée de l'étape `st.dur = Math.max(9, st.texte.split(/\s+/).length / 2.5)` (en s) ; ou démarrer en pause (`setPlaying(false)` à l'entrée), le bouton ▶ invitant à lancer. Panneau : `role="region" aria-label="Circulation du sang, étape par étape"` ; zone titre + texte en `aria-live`, réglée sur `"off"` pendant la lecture automatique et sur `"polite"` en pause (modèle de carrousel ARIA APG) ; `aria-hidden="true"` sur `.fg-dots` ; respecter `prefers-reduced-motion` (démarrer en pause, caméra `instant`). |
| I5 | `js/app.js:440`, `:527`, `:146` | **Structure sélectionnée invisible en vue chirurgien.** Après un passage par la vue chirurgien, choisir dans la liste une structure « de coupe » (nœud sinusal, valve pulmonaire, faisceau de His…) rouvre la coupe dans ce mode : caméra dans l'OG et oreillettes retirées. La structure sélectionnée n'est pas visible : le nœud sinusal est à −3,0 cm, donc côté retiré. Si la coupe est déjà ouverte en vue chirurgien, sélectionner ces structures ne montre rien. | Dans `select`, avant d'ouvrir la coupe : `if (id && STRUCTURES[id].coupe && (state.modeCoupe === 'chirurgien' \|\| !state.coupe) && id !== 'valve-mitrale') chooseCut('grand-axe');`. À terme, prévoir une coupe préférée par structure dans `data.js`. |
| I6 | `js/app.js:131`, `:134`, `:109` | **Vue chirurgien : feuillets flottants si l'on enfonce le curseur.** Le plan intérieur est décalé de 1,5 cm quelle que soit la profondeur. Au minimum du curseur (`c − 2,5`, on ne garde que ce qui est à plus de 2,5 cm sous l'anneau), les feuillets, cordages et cuspides restent dessinés jusqu'à 1,0 cm sous l'anneau. Ils flottent alors au-dessus de la tranche du VG, comme le défaut I7 de la relecture précédente. | Dans `syncInterior` : `const off = state.modeCoupe === 'chirurgien' ? (cutPlane.constant >= CUT_MODES.chirurgien.def - 0.05 ? 1.5 : 0.15) : interiorOff; interiorPlane.constant = cutPlane.constant + off;`. Le gestionnaire du curseur appelle déjà `syncInterior`, via `updateCapPlanes`. |

## 4. Souhaitables

1. **Transitions de pose dans l'ordre physiologique** (`js/app.js:345-348`).
   - *Problème.* Les quatre grandeurs rejoignent la cible au même rythme, avec une constante de temps de 0,25 s. Entre les étapes 2 et 3, la tricuspide se ferme pendant que la pulmonaire s'ouvre et que le ventricule se contracte : pendant environ 0,3 s, valve auriculo-ventriculaire et valve sigmoïde sont toutes deux à moitié ouvertes. Le texte annonce pourtant une séquence (« la tricuspide se ferme, la pulmonaire s'ouvre »).
   - *Correctif.* Avancer d'abord les grandeurs qui ferment ou relâchent, puis les autres :
     ```js
     // tant qu'une valve se ferme encore, les autres grandeurs attendent (fermeture → contraction → ouverture)
     const closingValve = ['av', 'sl'].some((k) => st.pose[k] < flow.pose[k] - 0.05);
     for (const key of ['atr', 'ven', 'av', 'sl']) {
       const isClosingValve = (key === 'av' || key === 'sl') && st.pose[key] < flow.pose[key];
       if (closingValve && !isClosingValve) continue;
       … // interpolation actuelle
     }
     ```
2. **Pose de départ de la circulation** (`js/app.js:318`, `:386`).
   - *Problème.* `flow.pose` repart toujours de la pose de repos. Depuis la vue chirurgien (mitrale fermée) ou en plein battement, la mitrale s'ouvre d'un coup puis se referme.
   - *Correctif.* Dans `heart.js`, mémoriser la dernière pose (`setPose` : `current = { ...c }`) et l'exposer (`get pose() { return current; }`), puis écrire `flow.pose = { ...heart.pose }`. Exporter aussi `REPOS`, aujourd'hui recopié deux fois dans `app.js`.
3. **Sortie de la circulation** (`js/app.js:395`). Si la coupe d'avant était déjà la 4 cavités, la caméra reste sur le cadrage de la circulation, avec une cible décalée de 2,4 cm : les rotations se font alors autour d'un point bas. Ajouter `else if (flow.prev.coupe) viewForCut(flow.prev.mode);`.
4. **Étape 8** (`js/app.js:287`). Le texte parle de « l'aorte descendante », mais les flèches s'arrêtent à `descTop`, en haut de celle-ci. Prolonger jusqu'à `descMid` : `[2, 7, 10]` (déjà inclus dans B2).
5. **Étape 1.** Ajouter, si l'on veut être complet : « … et par le sinus coronaire, le sang qui a nourri le cœur lui-même ».
6. **Vue chirurgien : rotation de 20° liée au modèle** (à confirmer sur une capture plus grande).
   - Avec l'aorte à 12 h, j'obtiens :
     - commissure antérolatérale à 9,0 h ;
     - commissure postéro-médiane à **1,5 h** ;
     - nœud AV et oreillette droite vers 1,5 h ;
     - pointe de l'auricule gauche vers 10,9 h. Ce point est la pointe extérieure de l'auricule, pas son orifice.
   - La ligne de coaptation monte donc d'environ 22° vers la droite au lieu d'être un « sourire » horizontal. La cause est connue : le feuillet antérieur est centré à 21° de la direction aortique (relecture précédente).
   - Je garderais l'aorte à 12 h, car c'est la convention de l'ASE et de l'EACVI. Il faudrait le dire dans la fiche de la mitrale, ou bien orienter la verticale perpendiculairement à la ligne commissurale, ce qui place l'aorte vers 12 h 40.
   - Profondeur par défaut : `c + 0,4` retire l'oreillette juste au-dessus de l'anneau, si bien que l'orifice de l'auricule gauche, principal repère d'orientation du chirurgien, n'est pas visible. Essayer `def: c + 1.0`.
7. **Vue chirurgien en portrait** (`js/app.js:146`). À 17 cm et en format 0,46, la largeur visible n'est que d'environ 4,5 cm : l'anneau mitral (3,3 cm) remplit l'écran et l'aorte sort du cadre. Prendre `dist: 17 * Math.max(1, 0.8 / camera.aspect)`.
8. **Repère d'orientation** (`js/app.js:648`). Le texte « aorte en haut » reste affiché après une rotation manuelle. L'afficher seulement si la caméra regarde encore à peu près dans l'axe : `camera.getWorldDirection(v).dot(VMI.axis) > 0.9`.
9. **Orientation des coupes « échographiques »** (`grand-axe`, `cinq-cavites`). La verticale de la caméra est `+y`, donc la pointe est **en bas**, les oreillettes en haut et le VG à droite. C'est une orientation anatomique, défendable pour des patients, mais elle est inversée par rapport à l'écran d'échographie (pointe en haut, convention ASE). Le préciser dans l'infobulle (« présentée pointe en bas ») ou proposer « comme à l'écho » avec `up = −axe du VG`.
10. **Accessibilité des boutons de coupe** (`js/app.js:152`). Ajouter `x.setAttribute('aria-pressed', String(x.dataset.cut === mode))`. Sur téléphone, la rangée `.seg` défile sans aucun signe visible (`scrollbar-width: none`, l. 216) et « Horizontale » est hors champ : ajouter un dégradé à droite (`mask-image: linear-gradient(90deg, #000 85%, transparent)`).
11. **Code mort laissé par le retrait des particules et de la planche** :
    - `heart.js:392` : commentaire « mode translucide » ;
    - `heart.js:406`, `:421`, `:434-435`, `:446` : paramètre et `userData.flowOpacity` ;
    - `heart.js:593` et `build-heart-bp3d.mjs:475-479` : `speed` des trajets ;
    - `app.js:414` : `labels[id].coupe` ;
    - `app.js:252`, `:262` : `localAnterior()` (toutes les coupes ont maintenant une normale) ;
    - `heart.landmarks.base`, non utilisé.
12. **Textes non traduits.** `FLOW_STEPS` et `FLOW_NOTE` sont écrits en dur en français dans `app.js`, alors que le contenu pédagogique vit dans `data.js` et `data.en.js`. Les déplacer (`export const CIRCULATION = [...]`).
13. **Dépendance à three r169** (`js/app.js:495`). `setCameraUp` écrit dans les champs internes `_quat` et `_quatInverse` d'OrbitControls. Ils existent bien en r169 (vérifié dans le source), et la version est figée (`sw.js:3`). Si la vérification échoue, prévenir dans la console (`else console.warn(...)`) pour ne pas tourner faux sans bruit lors d'une future montée de version.
14. **Captures `v10-01` et `v10-02` à refaire.** On y voit les réglages de coupe et la légende « Valves / Système électrique » pendant la circulation, alors que `css/style.css:116-118` les masque. Elles sont antérieures à la feuille de style finale.

## 5. Vérifié et exact

- **Retrait des étiquettes** :
  - plus aucune référence à `etiquettes`, `planche`, `plabel`, `leaders` ou `layoutPlanche` dans le HTML, le CSS, le JS ou le README ;
  - `ORDRE` sert encore aux numéros de la liste et des fiches ;
  - l'étiquette flottante au survol et à la sélection fonctionne seule (`refreshLabels`, `occludeLabels`).
- **Trajets.** Les 8 étapes reprennent les bonnes portions de `flowPaths` :
  1. VCS et VCI jusqu'au centre de l'OD ;
  2. de l'OD au VD, par la tricuspide ;
  3. du VD au sommet du tronc pulmonaire ;
  4. APD et APG ;
  5. veines pulmonaires droites et gauches jusqu'au centre de l'OG ;
  6. de l'OG au VG, par la mitrale ;
  7. du VG à l'aorte ascendante ;
  8. crosse et tronc brachio-céphalique.

  Aucun index ne dépasse la longueur des trajets (13, 12, 12, 12 et 5 points).
- **Poses des étapes 3 et 7.** AV fermées, sigmoïdes ouvertes, ventricule contracté : cohérent avec le texte. Étapes 1 et 5 : remplissage auriculaire valves fermées, une simplification acceptable.
- **Plan 5 cavités** :
  - il contient la pointe (écart 0,00 cm) et le centre aortique (0,00) ;
  - il est basculé de 22,2° par rapport au plan 4 cavités, autour d'un axe parallèle à la direction tricuspide → mitrale ;
  - la chambre de chasse est dans le plan ;
  - les oreillettes sont gardées derrière le plan (OG −1,5 cm, OD −1,4 cm) ;
  - le feuillet mitral antérieur est à environ 0,9 cm derrière la coupe, visible dans le VG ouvert ;
  - normale orientée comme la coupe 4 cavités, caméra du côté retiré.
- **Vue chirurgien** :
  - plan perpendiculaire à l'axe mitral, côté ventriculaire gardé (`axe · (p − centre) ≥ −0,4`) ;
  - caméra à `centre − 17 · axe`, du côté de l'OG, vers le VG ;
  - verticale = direction aortique projetée sur ce plan, donc aorte à 12 h ;
  - sens gauche-droite correct : commissure antérolatérale et veines pulmonaires gauches à gauche, septum et OD à droite ;
  - aucune cuspide aortique ni tricuspide ne flotte à la profondeur par défaut (cuspides aortiques ≥ +0,18 cm, anneau tricuspide ≥ +0,26 cm) ;
  - mitrale fermée au repos (`restPose`), rouverte en quittant le mode ;
  - pas de fantôme dans ce mode.
- **Caméra.** `goDir`, `stepCamAnim` et `setCameraUp` interpolent ensemble la position, la cible et la verticale. `_quat` et `_quatInverse` d'OrbitControls r169 sont recalculés à chaque image, ce qui garde les rotations cohérentes. La verticale ne passe jamais par un vecteur nul : le produit scalaire entre +y et la verticale du chirurgien vaut 0,57.
- **Enchaînements** :
  - Battement pendant la circulation : la circulation se ferme et la coupe d'avant est restaurée ;
  - Circulation pendant le Battement : le battement s'arrête ;
  - entrée en circulation sans coupe : la coupe s'ouvre en 4 cavités ;
  - sortie : la coupe et le mode d'avant sont restaurés, et `restPose` est appelée après le passage de `state.circulation` à `false`.
- **Pas d'erreur de zone morte temporelle (TDZ).** `flowUI`, `frame`, `camAnim` et `state` sont déclarés avant toute exécution réelle des fonctions qui les utilisent.
- **Pas de fuite mémoire.** Géométries et écouteurs sont créés une seule fois, sans allocation par image dans `updateFlow`.
- **Onglet en arrière-plan.** `dt` est plafonné à 0,1 s, donc pas de saut d'étapes au retour.
- **Rendu des flèches.**
  - `instanceColor` est créé avant le premier rendu (`updateFlow` précède `render`).
  - Les chevrons sont orientés à l'écran avec correction du rapport largeur/hauteur.
  - Les flèches au-delà de la longueur du trajet ont une échelle nulle.
- **Performances** : au plus 96 instances, deux projections par flèche ; valves recalculées seulement pendant le changement de pose (environ 1,6 s par étape) ; ombres une image sur trois.
- **Service worker** : `planche-coeur-v8`, `SHELL` inchangé (aucun nouveau fichier).

## Corrections appliquées (17 octobre 2026)

| Point | Correction | Vérification |
|---|---|---|
| B1 | Étapes 2 et 6 : « Le ventricule … se relâche : la valve … s'ouvre et le sang de l'oreillette … descend dans le ventricule. À la fin, l'oreillette se contracte pour achever de le remplir. » ; `atr` 0,8 → 0,4. | v11-01 |
| B2 | Champ `coupe` par étape, appliqué dans `showStep` : étapes 3-4 en coupe frontale à z = 2,0 vue de face, étapes 7-8 en « 5 cavités » ; trajets `[[2,4,6]]` (étape 7) et `[[2,6,10],[4,2,4]]` (étape 8). | Flèches dans le VD puis le tronc pulmonaire (v11-02), dans le VG puis l'aorte (v11-03, v11-04). |
| I1 | « Coupe » pendant la circulation : on quitte la circulation en gardant la coupe en cours. | État vérifié en console. |
| I2 | Cœur remonté par `camera.setViewOffset` (hauteur du panneau), cible au centre du cœur ; `controls.maxDistance = max(60, viewDistance × 1,1)`. | Cœur entier au-dessus du panneau sur téléphone (v11-05). |
| I3 | Note « les deux moitiés… » visible sur téléphone, affichée aux étapes 1 et 5. | v11-05 |
| I4 | Durée d'étape `max(9 s, mots / 2,5)` (+ 4 s avec la note) ; panneau `role="region"`, texte en `aria-live` (off en lecture, polite en pause), points `aria-hidden`, départ en pause si `prefers-reduced-motion`. | — |
| I5 | Sélection d'une structure de coupe depuis la vue chirurgien (hors valves mitrale, tricuspide, aortique) : retour à la coupe 4 cavités. | — |
| I6 | Vue chirurgien : décalage de 1,5 cm du plan des valves seulement à la profondeur par défaut, sinon 0,15 cm. | — |
| Souhaitable | Une valve ne s'ouvre qu'une fois l'autre presque fermée lors des changements d'étape. | — |

Restent ouverts : pose de départ reprise de la pose courante, inclinaison de la ligne de coaptation mitrale (modèle), orientation pointe en haut des coupes échographiques, code mort mineur (`flowOpacity`, `speed`, `labels.coupe`, `localAnterior`).
