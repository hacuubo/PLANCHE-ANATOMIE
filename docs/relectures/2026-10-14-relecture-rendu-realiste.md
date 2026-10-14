# Relecture : rendu réaliste « type Nucleus » (enveloppe SDF)

- Date : 14 octobre 2026
- Relecteur : anatomiste et directeur artistique en illustration médicale, indépendant (aucune modification du code)
- Périmètre : `js/heart-shape.js`, `js/heart.js`, `js/app.js`, `css/style.css`, `index.html` ; captures `v4-00…09` ; trois images de référence tirées de *Anatomy of the Heart* (Nucleus Medical Media, 2013 : vue extérieure, coupe, cœur dans le thorax) ; contrôle du rendu servi en local (vues postérieure, gauche, inférieure, coupe grand axe, sélection, position des étiquettes mesurée dans le DOM).
- Gravité : **BLOQUANT** = trompeur pour un patient ou contredit la fiche, à corriger avant diffusion ; **IMPORTANT** = visible et gênant ; **SOUHAITABLE** = rapproche du rendu Nucleus.

## 1. Verdict

Le saut par rapport à v4-00 est net. On a une seule masse organique, des raccords doux, une peau satinée, des vaisseaux ivoire et un fond de studio clair. En vue extérieure, l'ambiance est proche de la référence Nucleus. L'anatomie reprise du modèle relu est conservée : aorte à droite et en arrière du tronc pulmonaire, crosse et ses trois branches dans l'ordre, artère pulmonaire droite sous la crosse, dominance droite, sinus coronaire au plancher de l'OD. Restent **trois bloquants** : la coupe, le décalage des étiquettes flottantes et l'auricule gauche invisible. S'y ajoutent des codes couleur que plus aucune légende n'explique. Le principal écart esthétique avec Nucleus tient à la **graisse** (trop présente, croûteuse) et au **réseau coronaire** (trop épais, trop pauvre en ramifications). La teinte d'ensemble est déjà juste.

## 2. Bloquants

**B1. La coupe montre un bloc plein, pas un cœur creux** (v4-06, confirmé en local, mode « Grand axe » par défaut). L'enveloppe SDF est un solide unique coiffé en couleur muscle (`solids.push({ mesh: envelope, cap: 'myo' })`, `heart.js` l. 409). Les cavités restent les anciens ellipsoïdes (`heart.js` l. 445-470). Elles apparaissent comme de petites fenêtres sombres dans une grande tranche saumon uniforme. Trois défauts en découlent :
- le VG est fermé à 1 cm sous la lumière aortique et le VD n'atteint pas la valve pulmonaire, car le cône artériel est plein. Le message « le VG éjecte dans l'aorte » n'est donc pas visible ;
- la paroi libre du VD reste à ≈ 0,7-0,8 cm, alors que la fiche indique 3 à 5 mm ;
- la graisse des sillons et la paroi des gros vaisseaux sont coupées comme du muscle.

La référence Nucleus (image de coupe) montre au contraire de grandes cavités, un VD mince, des piliers et des valves ivoire. Correctifs (repère local, à vérifier en coupe horizontale y = −2) :
1. Pour la cavité VG, passer de `ellipsoid(2.0, 2.9, 1.9)` à ≈ `ellipsoid(2.3, 3.2, 2.1)`. Pour la cavité VD, passer de `bentEllipsoid(3.2, 2.6, 0.75, 2.85, −45°)` à ≈ `(3.6, 3.0, 1.0, 2.95, −45°)`. Objectifs : paroi VG ≈ 1,0 cm, paroi libre VD 0,4-0,5 cm, septum 0,8-1 cm.
2. Ajouter deux solides `hole: true` : la chambre de chasse du VG, tube r ≈ 0,9 du sommet du VG `(0.9, −0.6, −0.3)` à la valve aortique `(−0.25, 1.1, 0.55)` ; l'infundibulum du VD, tube r ≈ 1,0 de `(−0.4, −1.0, 1.9)` à la valve pulmonaire `(1.45, 1.5, 2.15)`. Le trajet OD → VD → TP et OG → VG → aorte devient alors continu dans le plan grand axe.
3. Plus tard : une couleur de coupe pour la graisse (`COL.graisseCoupe` existe déjà, mais aucun solide `cap: 'fat'` ne l'utilise).

**B2. Les étiquettes flottantes ne pointent pas sur leur structure** (v4-08 « Ventricule gauche », v4-09, mesuré en local). three r169 écrit en style en ligne `translate(-50%,-50%)`, ce qui écrase le `translate(10px,-50%)` de `.label`. La pastille est donc **centrée** sur l'ancre, et le trait `::before` pointe 70 à 90 px à gauche. Mesure : pastille de 528 à 674 px, ancre à 601 px, trait à 518 px. Résultat : « Ventricule gauche » désigne l'IVA. Correctif dans `app.js`, à la création des étiquettes : `obj.center.set(0, 0.5)`, et `obj.center.set(1, 0.5)` quand `flip` est actif. Dans `css/style.css`, remplacer le `transform` de `.label` par `margin-left: 10px`, et utiliser `margin-right: 10px` pour `.label.flip`.

**B3. L'auricule gauche est quasi invisible** (v4-02, v4-08 étiquette 5, sélection en local : un liseré de ≈ 1 cm derrière la racine du TP). `AUR_G_PTS` (r 0,82 → 0,44, raccord `k = 0.4`) est noyée entre le coussinet de graisse `center [2.1, 0.9, 1.25]`, la graisse du sillon AV gauche, le cône et le TP. Sa pointe `(2.5, 1.1, 2.5)` est même *à l'intérieur* de la racine du TP. Or c'est un repère majeur des atlas (vue antérieure et gauche) et un sujet patient fréquent (fibrillation atriale, fermeture de l'auricule). Correctif dans `heart-shape.js` :
- `AUR_G_PTS = [[2.6, 2.0, −1.2], [3.6, 1.9, 0.3], [3.8, 1.6, 1.7], [3.0, 1.3, 2.7]]` ;
- `r: (t) => 1.0 − 0.4 * t` et raccord `k` 0,4 → 0,25 ;
- coussinet `[2.1, 0.9, 1.25]` réduit à `radii [0.5, 0.3, 0.45]`.

L'auricule doit déborder à gauche du TP et recouvrir l'origine de la circonflexe. Teinte un peu plus soutenue que le ventricule (`oreillette` 0xd28f86 → 0xc98479) pour qu'elle se lise comme un lobe distinct.

## 3. Importants

| # | Structure / capture | Problème | Correctif |
|---|---|---|---|
| I1 | Gros vaisseaux, légende (v4-01, v4-02) | Le code ivoire chaud = sang riche / ivoire froid = sang pauvre n'est expliqué nulle part : hors circulation, la légende n'affiche que « Artères coronaires » et « Graisse ». L'écart `artere` 0xf0e1d4 / `arterePulm` 0xe2dde8 / `veine` 0xdad8e6 est faible : on le voit côte à côte, pas sur une veine cave isolée. La fiche du TP parle de « sang bleu ». | Renforcer légèrement les teintes : `artere` 0xf3dac6, `veinePulm` 0xf1dccb, `arterePulm` et `veine` ≈ 0xd5daf0. Ajouter deux pastilles `not-flow` dans `index.html` : « Vaisseaux : sang riche en oxygène / sang pauvre ». |
| I2 | Grande veine du cœur et veine moyenne (v4-02, v4-03) | Le trait mauve qui longe l'IVA n'est pas légendé. Un clic dessus ouvre la fiche « Sinus coronaire », car les deux tracés portent `id: 'sinus-coronaire'` (`heart-shape.js` l. 477-478). | Ajouter la pastille « Veines du cœur » (`COL.veineCard` #a194b6). Créer les identifiants `grande-veine-cardiaque` et `veine-cardiaque-moyenne`, avec deux fiches courtes, ou renommer la fiche en « Veines du cœur et sinus coronaire ». |
| I3 | Orientation (vue postérieure en local) | « **D** ← patient → **G** » est un texte fixe. En vue postérieure, l'aorte descendante apparaît à gauche de l'écran sous la mention « D ». Défaut préexistant, mais trompeur. | Dans `goView` : postérieure → « G ← patient → D » ; latérales → « arrière ← → avant » ou « avant ← → arrière » ; masquer la mention dès que l'on fait tourner librement. |
| I4 | Graisse autour de l'auricule droite et au bas de l'IVA (v4-03, v4-02) | Plaques crème bosselées au contraste fort : un patient y voit une croûte ou de l'athérome. Nucleus ne montre presque pas de graisse. | `billow` 0,1 → 0,04 ; poids du relief de la graisse dans `tissueDetail` `fat * fatH * 2.0` → `0.8` ; `mix(0.84, 1.07, fatH)` → `mix(0.93, 1.03, fatH)` ; `graisse` 0xf0dcb8 → 0xf0d8c0 ; rayons des deux ellipsoïdes de graisse × 0,7. |
| I5 | Jonction cône / tronc pulmonaire (v4-01, v4-02) | Dégradé rose → blanc sur ≈ 2 cm : la zone paraît surexposée et l'on ne sait pas où finit le ventricule. Cause : la chaîne du cône va jusqu'à `PT_ROOT_L`, coaxiale au TP, avec un raccord `assembly(0.75)`. | Arrêter le cône 0,6 cm plus bas (dernier point `vlerp(PT_ROOT_L, surf(0.12, 22, −1.0), 0.3)`). Raccord du TP 0,75 → 0,4. Petit renflement sinusal à la racine : `r: (t) => t < 0.06 ? 1.55 : 1.45 − 0.1 * t`. |
| I6 | Silhouette des vaisseaux sur le fond (v4-02 : VCS, VCI) | Ivoire froid sur gris-bleu très clair, contraste ≈ 1,05 : 1 : les veines caves s'effacent sur téléphone. | Fond de `.scene` : `radial-gradient(75% 70% at 45% 42%, #fbfcfd 0%, #e2e8ef 45%, #c4ced9 100%)`. Liseré : `uRim` 0,32 → 0,45 pour l'enveloppe. |
| I7 | Dossier `captures/` | v4-04, intitulée « face postérieure », est en réalité la vue **gauche**. v4-05, « côté droit », est la vue **postérieure**. v4-03 à v4-09 montrent l'ancienne légende rouge/bleu hors mode circulation. | Refaire ces captures après les corrections, avec les bons noms. |

## 4. Souhaitables (écart avec Nucleus, par rendement décroissant)

1. **Réseau coronaire plus fin et plus riche.** Chez Nucleus, les coronaires sont des filets rose-rouge à peine en relief, très ramifiés sur toute la surface. Ici on a une vingtaine de branches et des tubes brillants. Correctifs :
   - doubler les `twigs` (diagonales, marginales, branches du VD) avec `r0` 0,035-0,05 ;
   - enfoncer les tubes : dans `coronaryPaths`, `off = rr(t) * 0.55` → `0.35` ;
   - `coroA` : `clearcoat` 0,1 et couleur 0xc25e60.

   Garder l'IVA, la CD et la Cx nettement lisibles pour le patient.
2. **Teinte du muscle plus rosée, moins orangée** (la référence tire vers le rose-magenta) : `ventricule` 0xdf9f92 → 0xe2a09e ; diffusion du muscle `vec3(1.0, 0.58, 0.52)` → `vec3(1.0, 0.55, 0.60)`.
3. **Contre-jour plus franc.** Le halo clair de la silhouette est la signature de Nucleus : `rim` 1,6 → 2,1 et `rim2` 1,1 → 1,4 (`app.js` l. 61-64), avec `uRim` (I6).
4. **Surbrillance en « mode focus ».** Le voile doré `hlCol (1.0, 0.68, 0.22)` se confond avec la graisse crème et l'ivoire. Mieux vaut atténuer et désaturer le reste (× 0,7, saturation −40 %) et garder la couleur naturelle de la structure choisie, avec le liseré. C'est le procédé de Nucleus, qui estompe en blanc tout ce qui n'est pas le sujet.
5. **Silhouette plus conique.** Bord aigu du VD plus net, face diaphragmatique plus plate (le cœur actuel est un peu « ballon ») : `PROFIL` → `[3.6, 4.0, 4.15, 4.1, 3.9, 3.6, 3.15, 2.6, 1.95, 1.1, 0]`, `Z_SCALE` 0,86 → 0,8. Il faut ensuite régénérer `heart.bin`.
6. **Limites VD/VG qui suivent les sillons** (`ventricleRegion`). La limite est fixe à 24° alors que la graisse du sillon descend de 22° à 12°, et à −165° alors que le sillon postérieur va de −168° à −158°. Dans la moitié inférieure, la surbrillance du VD déborde de 0,3-0,4 cm au-delà de l'IVA. Proposition : `th < 24 − 10 * t` et `th > −167 + 9 * t`. Supprimer aussi la règle `t < 0.08 && th < 65`, qui classe en VD la base antérieure du VG, sous l'auricule gauche (le cône a déjà son propre identifiant).
7. *(optionnel)* Une branche rétroventriculaire gauche de la CD au-delà de la croix, typique de la dominance droite.

## 5. Vérifié et exact

- Rapports des gros vaisseaux inchangés depuis la relecture du 11/10 : TP en avant et à gauche de l'aorte, sans interpénétration en vue antérieure ; APD derrière l'aorte ascendante et la VCS ; aorte descendante à gauche et en arrière (contrôlé en vue postérieure locale) ; quatre veines pulmonaires ivoire chaud, à lumière « artérielle » cohérente.
- Coronaires :
  - le tronc commun naît du sinus postéro-gauche et passe derrière le TP ;
  - l'IVA va jusqu'à l'apex, avec diagonales vers le VG ;
  - la Cx suit le sillon AV gauche jusqu'à 148° ;
  - la CD suit le sillon AV droit, puis l'IVP part de la croix (dominance droite, conforme à la fiche) ;
  - la branche du nœud sinusal est présente.
- Veines : la grande veine longe l'IVA à sa gauche puis le sillon AV gauche ; la veine moyenne suit l'IVP ; le sinus coronaire s'abouche en avant et en dedans de la VCI. Le cône artériel prolonge bien la partie haute et gauche du VD, au contact du sillon interventriculaire antérieur.
- Extrémités sectionnées creuses (paroi + lumière sombre) sur les vaisseaux de rayon ≥ 0,7 cm, pleines sur les petits : rendu propre (APG en vue gauche).
- Ambiance générale (fond clair, tone mapping neutre, ombres douces, occlusion ambiante cuite) : conforme à la référence ; pas de moiré sur le grain des fibres à distance.

## 6. Corrections appliquées (14 octobre 2026)

| Point | Correction | Vérification |
|---|---|---|
| B1 | Cavités VG `ellipsoid(2.3, 3.2, 2.1)` et VD `bentEllipsoid(3.6, 3.0, 1.0, 2.95, −45°)` ; chambres de chasse creuses VG → valve aortique (r 0,9) et VD → valve pulmonaire (r 1,0). | Coupe grand axe : cavités ouvertes sur leurs valves (v4-04). |
| B2 | `obj.center` (0 ; 0,5), ou (1 ; 0,5) si l'étiquette est retournée ; `margin-left` à la place du `transform` CSS. | « Ventricule gauche » et « Auricule gauche » pointent sur leur structure (v4-05, v4-06). |
| B3 | `AUR_G_PTS` proposés, rayon 1,0 − 0,4t, raccord 0,25, coussinet réduit, teinte 0xc98479. | Lobe nettement visible en vue gauche (v4-02). |
| I1 | Teintes renforcées (0xf3dac6 / 0xf1dccb / 0xd5daf0) ; deux pastilles de légende « Vaisseaux à sang riche / pauvre en oxygène ». | v4-01. |
| I2 | Pastille « Veines du cœur ». Identifiants des veines non séparés : à faire avec une fiche dédiée. | — |
| I4 | Graisse adoucie (`billow` 0,04, relief × 0,8, teinte 0xf0d8c0, coussinets × 0,7). | v4-01. |
| I5 | Cône arrêté 0,6 cm plus bas, raccord du TP 0,4, renflement sinusal. | v4-01. |
| I6 | Fond assombri, `uRim` 0,45 sur l'enveloppe. | v4-01. |
| I7 | Captures refaites et renommées (v4-01 à v4-06). | — |
| S2, S3, S6 | Muscle plus rosé (0xe2a09e, diffusion 1,0/0,55/0,60) ; contre-jours 2,1 et 1,4 ; limites VD/VG qui suivent les sillons. | — |

Restent ouverts : I2 (fiches distinctes pour les veines du cœur), I3 (mention D/G selon la vue), S1 (réseau coronaire plus fin), S4 (surbrillance « mode focus »), S5 (silhouette plus conique), S7.

## 7. Points restants traités (14 octobre 2026, seconde passe)

| Point | Correction | Vérification |
|---|---|---|
| I2 | Fiches et identifiants distincts « Grande veine du cœur » et « Veine cardiaque moyenne » (FR et EN), regroupés avec le sinus coronaire dans la planche. | Clic et étiquette n° 28 (v5-02, v5-04). |
| I3 | Repère d'orientation calculé depuis la caméra : « D ← → G » de face, « G ← → D » de dos, « Avant ← → Arrière » de profil. | Contrôlé sur les vues antérieure, postérieure et gauche. |
| S1 | Vingt-neuf petites branches supplémentaires (r 0,035–0,05), enfoncées à 35 % du diamètre ; troncs à 50 % ; artères 0xc25e60, vernis 0,1. | v5-01. |
| S4 | Mode focus : la structure choisie garde sa couleur avec un liseré clair, le reste s'estompe en gris clair désaturé. | v5-02, v5-04. |
| S5 | `PROFIL` et `Z_SCALE` 0,8 proposés. | v5-01. |
| S6 | Limites VD/VG qui suivent les sillons (déjà appliqué en première passe). | — |
| S7 | Branche rétroventriculaire gauche de la CD au-delà de la croix. | — |
| B1.3 | Couleur crème de la graisse dans les surfaces de coupe (solides « fat »). | v5-03. |

**Effet de bord traité.** La silhouette plus conique amincissait les parois. Les cavités ont donc été réajustées par recherche sous contraintes, et le nouvel outil `tools/check-walls.mjs` le vérifie :

| Paroi | Épaisseur |
|---|---|
| VG | 0,75 à 1,35 cm (médiane) |
| VD paroi libre | 0,32 à 0,66 cm |
| Septum | ≥ 0,88 cm |
| Oreillettes | 0,23 à 0,31 cm |

L'outil a aussi révélé un défaut antérieur. Le faisceau de His et sa branche gauche couraient dans la cavité du VG, et non dans le septum. Ils sont désormais au milieu du septum et, pour la branche gauche, sous l'endocarde septal du VG. Les bases des piliers et la bande modératrice sont ramenées sur la paroi.

**Synchronisation anglaise.** Les corrections de texte de la relecture anatomique du 11/10 n'avaient pas été reportées dans `js/data.en.js`. Elles l'ont été, ainsi que les couleurs : pressions de l'OG, auricule gauche, sténose aortique, tronc commun, codominance, nœud AV et faisceau de His.
