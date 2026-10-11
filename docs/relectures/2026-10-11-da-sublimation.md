# Passe « sublimation » de la direction artistique — Planche d'anatomie du cœur

- Date : 11 octobre 2026
- Intervenant : direction artistique (cette fois avec droit de modification du code)
- Référence visée : planches peintes d'atlas (type Netter) — chair rose-rouge dégradée, oreillettes mauves,
  graisse épicardique orange-jaune lobulée, vaisseaux rouge profond / bleu marine au reflet peint, dégradés « aquarelle »,
  contours fins, étiquettes serif.
- Fichiers modifiés : `js/heart.js`, `js/app.js`, `css/style.css`, `js/data.js` (propriété `couleur` uniquement),
  `icons/icon.svg`, `tools/make-icons.mjs` (+ PNG régénérés).
- Non modifié : positions, formes et trajets anatomiques (aucune coordonnée touchée), `js/data.en.js` (il n'utilise pas
  encore les six jetons de couleur : à aligner lors de la passe de traduction), `.gitignore`, `sw.js`, dépendances.
- Captures avant / après : `captures/v3-01…04-avant-*.jpg` et `captures/v3-01…04-apres-*.jpg`
  (rendu WebGL composé sur le fond papier, 900 × 762, vue bureau).
- Méthode : navigateur intégré (onglet dédié), captures du canvas à pleine résolution via `toDataURL` (le navigateur
  intégré réduit l'affichage des grandes fenêtres émulées), mesures de couleur au pixel, chronométrage `requestAnimationFrame`.

---

## 1. Diagnostic de départ (captures `*-avant-*`)

| Zone | Constat |
| --- | --- |
| Vaisseaux | Reflets spéculaires durs (clearcoat 0,3, roughness 0,45, environnement 0,35) : tubes en plastique brillant, pas de « lavis » vers les bords. |
| Myocarde | Aplat saumon uniforme : la texture aquarelle (±7 %, 256 px, somme d'octaves qui se concentre autour du milieu) était invisible ; aucun dégradé base → apex. |
| Graisse | Lobules en « pilules » bombées, orange saturé, lavis insuffisant pour marquer les creux. |
| Vaisseaux coupés | Lumière presque noire (`0x6e1a1c` / `0x1f2b60`) : l'aorte et le tronc pulmonaire sectionnés redevenaient des « trous ». |
| Fantôme | Encre à 7 % : lisible, mais les recouvrements (crosse + branches + VCS) s'additionnaient jusqu'à ≈ 20 %. |
| Circulation | Les lobules de graisse et les coronaires à 0,30 d'opacité formaient une « bouillie » orangée au-dessus des trajets. |
| Légende | Pastille « Graisse des sillons » beige (`#e5d2a6`) alors que le modèle est orange ; valves `#efe3d3` (crème) alors que les feuillets sont nacrés gris-bleu. |
| Icône | Cœur « cardio » générique avec tracé ECG (identité application santé, pas planche). |

---

## 2. Modifications

### 2.1 Matières (`js/heart.js`)

**Lavis de bord (`painterly`)** — avant : `diffuse *= mix(1, edge, fres)` avec `fres = (1−n·v)^2.2`, `edge` 0,68 (organique) / 0,78 (vaisseaux), éclaircissement central +5 %.
Après : le lavis **fonce et sature** (mélange vers `c²/max(c)` à 45 %, comme le pigment qui s'accumule au bord d'une plage d'aquarelle), `edge` 0,58 (organique) / 0,52 (vaisseaux), exposant 1,7 / 2,0, éclaircissement central +14 % en `(n·v)²`. Chaque matériau peut surcharger `edge` (endocarde 0,72, graisse 0,52, valves 0,80, cordages 0,88, lumières des vaisseaux coupés 0,80).

**Texture aquarelle (`watercolorTexture`)** — avant : 256 px, 3 octaves (4, 9, 21), amplitude 0,93–1,00, une seule texture partagée sans réglage d'échelle.
Après : 512 px, 5 octaves (3, 6, 13, 37, 83 : plages larges + nuages + grain de pigment), **contraste ré-étiré** (×2,6 autour du milieu) puis amplitude 0,82–1,03, anisotropie 4, **répétition par géométrie** (`repeat`) : masse 7 × 3, oreillettes 2 × 1, endocarde 2 × 2, graisse 1 × 3, piliers 1 × 2, capuchons de coupe 14 × 14. La fonction est exportée pour les capuchons dans `app.js`.

**Dégradé peint par couleurs de sommets (`tintGradient`, nouveau)** — la masse ventriculaire reçoit un attribut `color` (aucun sommet déplacé) : base et face antérieure du VD claires (×1,06), charge vers l'apex (−0,16·t²) et la face postéro-gauche (−0,08), plus un bruit à 2 %. Le facteur agit davantage sur vert/bleu que sur rouge : la chair qui fonce rougit au lieu de grisonner. `myoMat.vertexColors = true`. Note : pendant cette passe, une modification concurrente (hors périmètre DA) a fondu l'infundibulum dans la géométrie de la masse (`conusLift`) à la place du tube rapporté ; le cône artériel hérite donc automatiquement du dégradé et de la texture, et la « couture » visible sur les captures « avant » a disparu (vérifié sur les captures « après » finales).

**Matériaux (`mkMat`)** :

| Paramètre | Avant | Après |
| --- | --- | --- |
| roughness par défaut | 0,62 | 0,66 |
| vaisseaux (`physical`) | clearcoat 0,30, clearcoatRoughness 0,40, roughness 0,45 | clearcoat 0,12, clearcoatRoughness 0,60, specularIntensity 0,55, envMapIntensity 0,70, roughness 0,58 (coronaires 0,62) |
| organiques | envMapIntensity 1 | envMapIntensity 0,45 |
| myocarde | roughness 0,74 | 0,80 + couleurs de sommets |
| oreillettes | roughness 0,72 | 0,70, edge 0,60 |
| graisse | roughness 0,90 | 0,95, edge 0,52 |
| valves / cordages | roughness 0,42 / 0,55 | 0,48 / 0,50 (lavis quasi nul) |
| conduction | emissive 0,45, roughness 0,40 | 0,40 / 0,50 |
| lobules de graisse | ellipsoïde 0,46 × 0,26 × 0,36 | 0,52 × 0,22 × 0,42 (plus larges et plus plats, dans la tolérance ±20 %) |

**Palette `COL`** (ton moyen ; le lavis fonce les bords, la clé éclaircit les faces tournées vers l'œil) :

| Jeton | Avant | Après | Pourquoi |
| --- | --- | --- | --- |
| myocarde | `0xc2605a` | `0xd16c62` | le lavis plus fort baisse la moyenne ; on remonte le ton moyen pour retrouver la chair rose-rouge (mesuré à l'écran ≈ `#ad4e44` à mi-ombre, `#b55042` en lumière) |
| myocardeCoupe | `0xd98f88` | `0xd68c85` | tranche rosée, désormais texturée |
| endocarde | `0xb86864` | `0xc1746f` | fond des cavités plus rose, moins brun |
| papillaire | `0xb0524f` | `0xb3564f` | — |
| artere / veinePulm / coronaire | `0xb52a2e` / `0xb8302f` | `0xbb3533` | un seul rouge « sang riche » |
| veine / arterePulm / veineCard | `0x2f4290` | `0x344a9a` | bleu marine un peu moins sombre (le lavis assombrit déjà les bords) |
| graisse / graisseCoupe | `0xe9a53f` / `0xf0b650` | `0xe8a846` / `0xeeb858` | jaune-orange mat, aligné sur le jeton CSS |
| valve / cordage | `0xdde6ea` / `0xf1f4f5` | `0xe3e8ea` / `0xf3f5f5` | nacré, aligné sur le jeton CSS |
| lumenArtere / lumenVeine | `0x6e1a1c` / `0x1f2b60` | `0xa63a3a` / `0x3b4c92` | lumière du vaisseau coupé lisible (plus sombre que la paroi, pas noire) |
| paroiArtere / paroiVeine | `0x9a2326` / `0x283877` | `0x8e2426` / `0x263676` | l'anneau de paroi reste le plus sombre |

### 2.2 Scène, lumières, contour, coupe, circulation (`js/app.js`)

| Élément | Avant | Après |
| --- | --- | --- |
| Environnement (RoomEnvironment) | 0,35 | 0,22 |
| Clé | `0xfff1e0`, 1,6, position (5, 10, 12), ombre radius 4, normalBias 0,03 | `0xfff0dc`, 1,9, position (7,5 ; 11 ; 9) — plus latérale, le volume des ventricules se modèle en vue de face —, ombre radius 7, normalBias 0,035 |
| Remplissage | `0xe4ebff`, 0,45 | `0xdfe7ff`, 0,70 |
| Contre-jour | blanc, 0,5 | `0xfff6ea`, 0,3 (il produisait les hautes lumières blanches des tubes) |
| Hémisphère | ciel `0xfaf4ea`, sol `0x7a5a4e`, 0,3 | sol `0x6e4e44`, 0,5 |
| Tone mapping | Neutral, exposition 1,0 | inchangé (teintes fidèles à la légende) |
| Contour (coque inversée) | `0x4a2a28`, opacité 0,60, 0,035 cm | `0x3e2522`, opacité 0,68, 0,035 cm |
| Fantôme de la partie retirée | `0x2b2420`, 0,07 | `0x4a3a33`, 0,045 (les recouvrements restent sous 15 %) |
| Capuchons de coupe | aplat, roughness 0,8 | texture aquarelle (répétition 14), roughness 0,85, envMapIntensity 0,4 |
| Mode circulation | opacité 0,30 pour tout | 0,30 par défaut, oreillettes 0,26, graisse 0,10, coronaires et sinus coronaire 0,14 (`userData.flowOpacity`) |
| Planche | pas vertical 24 px (bureau) / 20 px (mobile) pour des étiquettes de 30 px : boîtes qui se touchaient (2 chevauchements mesurés par vue) | 31 px / 22 px |

### 2.3 Interface (`css/style.css`, `js/data.js`)

Jetons alignés sur le rendu : `--sang-pauvre` `#43589f` → `#3e519e` (mesuré à l'écran `#3049a1` en lumière, `#273d8a` en demi-teinte), `--graisse` `#e5d2a6` → `#e8a846`, `--valve` `#efe3d3` → `#e3e8ea`. Les mêmes valeurs remplacent la propriété `couleur` des structures concernées dans `js/data.js` (9 bleues, 2 graisse, 4 valves). La règle « chiffre encre si la luminance dépasse 0,35 » conserve le chiffre sombre sur la graisse (luminance ≈ 0,46) et les valves ; `#3e519e` garde le chiffre blanc (contraste ≈ 7 : 1).

### 2.4 Icône (`icons/icon.svg`, `tools/make-icons.mjs`)

Nouvelle icône « planche » : silhouette anatomique au trait d'encre `#2b2420` sur papier `#f4efe6`, crosse aortique rouge, tronc pulmonaire bleu, oreillette mauve, aplat rouge `#b8433c` sur les ventricules, sillon interventriculaire en graisse, pastille « 1 » serif avec ligne de rappel. `make-icons.mjs` redessine la même composition (courbes de Bézier échantillonnées, distances aux polylignes, suréchantillonnage 3 × 3, zone de sécurité maskable à 74 %) ; PNG 192 / 512 / 512 maskable régénérés (`node tools/make-icons.mjs`, ≈ 2 min).

---

## 3. Vérifications

- `node --check` sur `heart.js`, `app.js`, `data.js` après chaque série de modifications ; console sans erreur hormis
  l'avertissement du service worker propre au navigateur intégré.
- Coupe : grand axe (profondeurs 0,4 et −1,5), frontale (0,2 et −1,5), horizontale en vue de dessus (0 et −2,5).
  Capuchons graisse / muscle / oreillettes / lumières sans z-fighting, cavités et piliers lisibles, fantôme discret.
  Le système de stencil (clés `cap`, trous, `innerGeo` invisibles) n'a pas été touché : les couleurs de sommets ne
  concernent que le matériau visible.
- Vue antérieure, postérieure, côté gauche sans coupe ; mode circulation ; mode planche en vue antérieure et
  postérieure (bureau 1280 px : 15 et 13 étiquettes, colonnes hors de la figure — bord droit de la colonne gauche
  à 237 / 286 px, bord gauche de la colonne droite à 614 / 663 px pour une scène de 900 px ; 1000 px : passage en
  pastilles seules car la scène fait moins de 700 px ; mobile 375 px : pastilles seules au bout des lignes).
- Couleurs mesurées au pixel après rendu (tone mapping neutre) : aorte `#c82620` en lumière / `#b61f15` en
  demi-teinte, veine cave `#3049a1` / `#273d8a`, oreillette `#8e6e96`, graisse `#a26e15` dans un creux : la légende
  (`#c43a33`, `#3e519e`, `#e8a846`) correspond aux tons moyens.
- Performance dans le navigateur intégré (fenêtre 1280 × 820, scène 900 × 762, dpr 1) : 140 appels de dessin /
  163 k triangles sans coupe, 409 / 579 k en coupe, 59 / 174 k en circulation — **identiques à avant** (aucun
  passage de rendu ajouté ; la texture 512 px et l'attribut couleur sont négligeables). Les temps mesurés
  (≈ 50 ms/image en continu, ≈ 69 ms en coupe) sont ceux du navigateur intégré, dont le rendu WebGL n'est pas
  représentatif d'un portable (il affichait déjà ≈ 24 i/s avant les modifications) ; à re-mesurer sur la machine cible.

## 4. Ce qui n'a pas été fait, et pourquoi

- **Occlusion ambiante (GTAOPass)** : non ajoutée. Le passage normal/profondeur du GTAO rend la scène avec un
  matériau de substitution, ce qui casse le système de coupe : les maillages de stencil (`colorWrite: false`) et les
  plans capuchons de 60 cm seraient dessinés en pleines normales, et le fantôme (plan inversé) et les parois clipées
  par matériau ne le seraient plus. Il faudrait isoler ces objets par calques pendant la passe de normales et gérer
  un `WebGLRenderTarget` avec stencil dans l'`EffectComposer`. À envisager dans une passe dédiée, bureau seulement.
- **Hachures sur la tranche de coupe** : écartées (risque de moiré à l'échelle des capuchons et sur mobile) ;
  la texture aquarelle suffit à casser l'aplat.
- **Liseré d'encre au bord des capuchons de coupe** : non fait (voir recommandations).

## 5. Recommandations pour la suite

1. Mesurer les temps d'image sur le portable et la tablette cibles (`renderer.info`, rAF) ; si besoin, réduire la
   carte d'ombre à 1024² sous `(pointer: coarse)`.
2. Aligner `js/data.en.js` sur les six jetons de couleur.
3. Étudier une AO en calques (bureau uniquement) une fois la coupe stabilisée.
4. Pour la coupe, envisager un liseré d'encre au bord des capuchons (second plan stencil légèrement décalé, encre
   à 40 %) : c'est le dernier détail qui sépare la tranche actuelle d'une planche imprimée.
5. Les lobules de graisse restent des ellipsoïdes distincts ; une passe de modelage (fusion en coussinet continu le
   long du sillon, hors tolérance ±20 % de cette passe) rapprocherait encore la graisse des planches.

## 6. Suite immédiate (après la passe DA)

- **Infundibulum fondu dans la masse** : la recommandation n° 2 a été appliquée dans la foulée. Le tube rapporté est supprimé ;
  la `ParametricGeometry` de la masse reçoit un soulèvement gaussien (`conusLift`, centré sur θ = 30°, ρ = 2,9 cm, sommet
  ≈ y = 1,9) qui modèle le cône artériel jusqu'à la racine du tronc pulmonaire. Plus de « couture » en vue de face ;
  la détection du clic attribue cette zone au ventricule droit. La racine du tronc pulmonaire et la valve pulmonaire
  n'ont pas bougé.
