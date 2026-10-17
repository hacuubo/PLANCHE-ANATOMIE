# Relecture : valves réalistes (lames épaisses, ressorts) et ombres de contact

- Date : 17 octobre 2026
- Relecteur : anatomiste, illustrateur médical et relecteur de code three.js/WebGL, indépendant (aucune modification du code)
- Périmètre : les commits locaux `cc91d22` (valves : `Shell`, profils d'épaisseur et de teinte, `Spring`/`Opening`, cordages en trois niveaux, define `VALVE` du shader tissu, `setPose`/`stepValves`) et `94d10ea` (`js/contact-shadows.js`, branchement dans `js/app.js`, `cav.receiveShadow`, `sw.js`). Captures `v12-01` à `v12-08`, comparées à `v9-01`. Référence visée : animations Nucleus (« Heart valves », « Cardiac cycle »).
- Méthode : je n'ai pas pu lancer l'application. Pour compenser, j'ai :
  - exécuté `js/valves.js` (copie conforme), `cycle()` et `deformPoint` de `js/heart.js` dans Node, avec les repères réels de `assets/heart.bin`, sur plusieurs battements à 60, 30, 20 et 15 images/s ;
  - mesuré la position des feuillets fermés par rapport à l'anneau, l'écart de coaptation, l'étirement des cordages et le coût processeur par image ;
  - comparé pixel à pixel `v12-02` (sans ombres de contact) et `v12-03` (avec) ;
  - vérifié dans les sources de three r169 (`WebGLRenderer`, `WebGLTextures`, `WebGLLights`) les points de comportement cités.

  Les scripts jetables sont placés hors du dépôt. Les points marqués « à confirmer » relèvent du raisonnement sur le code, sans capture probante.
- Repère : coordonnées de l'application en cm. « Phase » = fraction du cycle de 940 ms (64/min).
- Gravité : **BLOQUANT** = trompeur pour un patient, faux anatomiquement ou bug visible ; **IMPORTANT** = visible et gênant (ou coût qui dégrade la fluidité sur téléphone) ; **SOUHAITABLE** = rapproche du rendu Nucleus.

## 1. Verdict

Les deux commits vont dans le bon sens. Les feuillets ont enfin une épaisseur et un bord libre arrondi. La zone claire, la zone rugueuse, les lunules et le nodule d'Arantius sont aux bons endroits, avec des épaisseurs plausibles (0,45 mm en zone claire, 1,1 mm en zone rugueuse, 1,45 mm au nodule). Les fibres et la translucidité donnent la matière d'un tissu conjonctif. Le code WebGL est propre :
- l'orientation des triangles de `Shell` et de `Cords` correspond aux normales posées à la main, donc `DoubleSide`/`faceDirection` ne les retourne pas ;
- la profondeur MSAA est bien résolue dans la `DepthTexture` (formats DEPTH24_STENCIL8 identiques) ;
- la tonalité n'est appliquée qu'une fois, à la recomposition ;
- `setViewOffset` est pris en compte par `uProjInv` ;
- le ressort, sous-échantillonné à 240 Hz, reste stable à 15 images/s.

Trois défauts sont bloquants :
1. **L'inertie des valves casse la chronologie du cycle**, que la relecture précédente avait validée. La mitrale et la tricuspide sont encore ouvertes à 30 % quand l'aortique s'ouvre. Pendant l'éjection, leurs bords se décollent de 1,2 mm, ce qui ressemble à une fuite. Les sigmoïdes se rouvrent de 7 % en diastole (§ B1).
2. **Les valves auriculo-ventriculaires fermées sont dessinées en prolapsus.** Le feuillet mitral antérieur bombe de 3,9 mm au-dessus de la ligne des charnières (critère échographique de prolapsus : plus de 2 mm), et de 4,6 mm au rebond (§ B2).
3. **Hors ligne, l'application ne démarre plus** : `Pass.js`, importé par `contact-shadows.js`, n'est pas dans le cache du service worker (§ B3).

Côté ombres de contact, l'effet lui-même est discret. Le pipeline, lui, change l'image entière : elle est **plus claire** avec les ombres que sans. Sur `v12-02`/`v12-03`, 56 % des pixels gagnent plus de 4 niveaux (+8 à +10 sur les feuillets) et seuls 4,5 % s'assombrissent. Trois autres effets sont à corriger : un léger flou dû à une taille de cible fausse, un liseré clair aux silhouettes et un surcoût par image (§ I1 à I4). Le coût processeur des valves a triplé : 7,2 ms par image contre 2,1 ms avant, sur ce PC (§ I5).

## 2. Bloquants

**B1. Le ressort des valves retarde la fermeture d'environ 90 ms et fait rebondir les feuillets à travers la ligne de coaptation** (`js/valves.js:58-73`, `:314`, `:384` ; `js/heart.js:611-626`).

*Mesure* (copie conforme de `Spring`/`Opening` et de `cycle()`, 60 images/s, régime établi ; « bord » = `op.at(1)`, « brut » = valeur avant écrêtage) :

| Temps (ms) | Consigne AV | Bord AV | Brut AV | Consigne sigmoïdes | Bord sigmoïdes |
|---|---|---|---|---|---|
| 133 | 0,08 | **0,94** | 0,94 | 0 | 0 |
| 167 | 0 | **0,72** | 0,72 | 0 | 0 |
| 200 | 0 | **0,30** | 0,30 | 0,87 | 0,03 |
| 267 | 0 | −0,06 | **−0,26** | 1 | 0,84 |
| 400 à 467 | 0 | **+0,05 à +0,06** | | 1 | 0,93 |
| 533 | 0 | 0 | | 0 | **0,54** |
| 733 | 0,91 | 1,04 | 1,27 | 0 | **+0,07** |

*Conséquences.*
- La contraction isovolumique disparaît : à 200 ms, la mitrale et la tricuspide sont encore ouvertes à 30 % quand les sigmoïdes s'ouvrent. De même, l'aortique n'est fermée qu'à 583 ms, alors que la mitrale commence à s'ouvrir à 545 ms.
- Le dépassement (−0,26, écrêté à −0,06) pousse les feuillets **au-delà** de la position fermée, vers l'oreillette, avec des cordages plus longs que leur longueur de repos. Or ce sont précisément les cordages qui empêchent ce mouvement.
- Le rebond rouvre la coaptation pendant l'éjection : l'écart entre le bord postérieur et le feuillet antérieur passe de 1,04 mm (contact, épaisseurs cumulées ≈ 0,9 mm) à 2,09 mm, soit **une fente de 1,2 mm qui évoque une insuffisance mitrale**. Les sigmoïdes se rouvrent de 7 % en début de diastole, ce qui évoque une insuffisance aortique.
- Pour un patient, voir les deux valves ouvertes en même temps ou une valve qui « fuit » est trompeur.

*Correctif.* Ressorts plus raides et mieux amortis, contact des feuillets à la fermeture, consigne anticipée de 2 % du cycle (19 ms) pour compenser le retard résiduel :
```js
// valves.js, classe Spring
step(target, dt) {
  dt = Math.min(dt, 0.1); // onglet revenu au premier plan
  const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
  for (let i = 0; i < n; i++) {
    this.v += (this.w * this.w * (target - this.x) - 2 * this.z * this.w * this.v) * h; this.x += this.v * h;
    if (this.x < 0) { this.x = 0; if (this.v < 0) this.v *= -0.15; } // feuillets en contact : petit rebond vers l'ouverture
  }
}
// Opening.at : borne basse 0 au lieu de −0,06
at(v) { return Math.min(1.04, Math.max(0, this.base.x + (this.tip.x - this.base.x) * Math.pow(v, 1.5))); }
// valves.js:314 et :384
const op = new Opening([12, 0.75], [8, 0.65], 0.9);   // auriculo-ventriculaire
const op = new Opening([14, 0.75], [9, 0.65], 0);     // sigmoïde
// heart.js:626 : les valves reçoivent la consigne 19 ms en avance (leur inertie la rattrape)
const setBeat = (phase) => {
  if (phase === null) return setPose(REPOS);
  const c = cycle(phase), a = cycle((phase + 0.02) % 1);
  return setPose({ ...c, av: a.av, sl: a.sl });
};
```
*Résultat simulé* (60 et 20 images/s) :
- valves AV fermées à 167 ms (ouverture des sigmoïdes : 178 ms) ;
- sigmoïdes fermées à 533 ms (ouverture AV : 545 ms) ;
- aucune image où les deux valves sont ouvertes ;
- réouverture parasite inférieure à 0,003 ;
- le retard du bord libre (20 à 30 ms) et le léger dépassement à l'ouverture (≤ 1,04) sont conservés.

**B2. Valves AV fermées en prolapsus** (`js/valves.js:251-255` ; `v12-07`, crochet du feuillet postérieur au-dessus de l'anneau).

*Mesure.* Surface moyenne des feuillets fermés (ouverture 0), hauteur au-dessus de la ligne des charnières (points hauts de la selle, `saddle` = 2 mm) :

| Valve | Antérieur | Postérieur | Septal | Avec le rebond actuel (−0,06) |
|---|---|---|---|---|
| Mitrale | **3,9 mm** | 2,3 mm | — | 4,6 / 2,7 mm |
| Tricuspide | **3,7 mm** | 2,2 mm | 2,1 mm | 4,3 / 2,7 / 2,5 mm |

En échographie, un déplacement de plus de 2 mm au-delà du plan de l'anneau définit le **prolapsus valvulaire mitral**. En coupe 4 cavités, les charnières visibles sont les points bas de la selle, et le dôme paraît alors encore plus haut (environ 6 mm). Une valve normale, fermée, est au contraire en légère « tente » : le point de coaptation se trouve 5 à 6 mm sous l'anneau, côté ventricule, et le corps des feuillets reste au niveau de l'anneau. La relecture précédente demandait un bombement plus marqué (`belly` 0,3·h) pour la lisibilité. C'était une erreur, que je corrige ici : la lisibilité doit venir du pli de coaptation, pas d'un dôme.

*Correctif* (`valves.js:251-255`) : bombement réduit, coaptation en tente, zone d'accolement un peu moins pendante.
```js
const vc = 0.7, w = smooth(0, vc, v), belly = 0.1 * L.height * Math.sin(Math.PI * Math.min(1, v / vc)) * Math.pow(Math.sin(Math.PI * u), 0.5);
const lip = Math.max(0, (v - vc) / (1 - vc)) * 0.28 * h;
// … puis, dans cx, cy, cz : A.? * (0.2 * w + lip) au lieu de A.? * (0.08 * w + lip)
```
*Résultat simulé :* antérieur mitral 1,0 mm, postérieur 0,5 mm, tricuspide 0,2 à 1,0 mm au-dessus des charnières (1,4 mm au plus si l'on garde un rebond). Le bord libre descend à 6 à 9 mm sous l'anneau (zone de coaptation de 5 à 10 mm, normale). Une fois B1 corrigé, la borne 0 de `at()` supprime en plus le dépassement vers l'oreillette.

**B3. Hors ligne, l'application ne démarre plus** (`sw.js:4-12`, `js/contact-shadows.js:12`).
- `contact-shadows.js` importe `three/addons/postprocessing/Pass.js` (pour `FullScreenQuad`), mais `SHELL` ne le pré-cache pas.
- À la première visite, les modules sont chargés avant que le service worker ne contrôle la page : `Pass.js` n'est donc pas non plus mis en cache à l'exécution.
- Scénario visé par l'éducation thérapeutique : le patient installe l'application, puis l'ouvre sans réseau en salle d'attente. L'import statique échoue, `app.js` ne s'exécute pas et la page reste vide.
- C'est une régression : les trois autres modules complémentaires sont bien dans `SHELL`.

*Correctif :* ajouter `THREE + 'examples/jsm/postprocessing/Pass.js',` à `SHELL` et passer `VERSION` à `planche-coeur-v11`, dans le même commit que les autres correctifs (une seule mise en ligne). Variante plus robuste : remplacer `FullScreenQuad` par un `Mesh(new PlaneGeometry(2, 2))` rendu avec une `OrthographicCamera`, soit dix lignes et aucune dépendance supplémentaire.

## 3. Importants

| # | Fichier : ligne | Problème | Correctif |
|---|---|---|---|
| I1 | `js/contact-shadows.js:109-115` | **Taille de la cible différente de celle du canevas.** `Math.round(w × pr)` contre `Math.floor(w × pr)` dans `renderer.setSize` (three r169). Avec un rapport de pixels fractionnaire (Windows à 125 % ou 150 %, téléphones plafonnés à 1,5), la cible a un pixel de plus que le canevas. La recomposition rééchantillonne alors toute l'image avec un décalage qui croît de 0 à 1 texel d'un bord à l'autre : au centre de l'écran, chaque pixel est la moyenne de deux. On obtient un **léger flou vertical ou horizontal au milieu de l'image** (à confirmer sur une capture en taille réelle ; `v12-08` paraît plus douce que `v9-01`). De plus, `uAOTexel = 2 / W` est faux quand W est impair. | `const s = this.renderer.getDrawingBufferSize(new THREE.Vector2()); this.target.setSize(s.x, s.y); const aw = Math.max(1, s.x >> 1), ah = Math.max(1, s.y >> 1); this.aoTarget.setSize(aw, ah); this.aoMat.uniforms.uTexel.value.set(1 / s.x, 1 / s.y); this.composeMat.uniforms.uAOTexel.value.set(1 / aw, 1 / ah);` (le paramètre `(w, h)` devient inutile). |
| I2 | `js/contact-shadows.js:69-83` | **Liseré clair aux silhouettes** (fond transparent, `alpha: true`). Après la résolution MSAA, un pixel de bord contient (couleur × couverture, couverture), c'est-à-dire une valeur prémultipliée. La tonalité puis l'encodage sRGB sont appliqués à cette valeur prémultipliée. Or sRGB(c·x) est bien plus grand que c·sRGB(x) : pour une couverture de 0,5, on obtient environ 0,32 au lieu de 0,23 sur le vert du myocarde. Le pixel de bord devient plus clair que l'objet et que le fond, d'où un trait pâle d'un pixel tout autour du cœur et des structures coupées. Le mécanisme est certain ; il se voit davantage sur le fond bleuté de la vue chirurgien. | Repasser en couleur non prémultipliée avant la tonalité, puis reprémultiplier : `vec4 col = texture2D(tColor, vUv); float a = col.a; col.rgb /= max(a, 1e-4); … col.rgb *= mix(1.0, ao, uStrength); gl_FragColor = col; #include <tonemapping_fragment> #include <colorspace_fragment> gl_FragColor.rgb *= a;`. Garder `NoBlending`, puisque le canevas est prémultiplié. |
| I3 | `js/app.js:96` ; `contact-shadows.js:121-123` | **L'image est plus claire avec les ombres de contact.** Mesure `v12-02` → `v12-03` : feuillet 232/197/163 → 241/206/168 ; paroi 240/172/169 → 248/179/172 ; 56 % des pixels plus clairs, 4,5 % plus sombres. Cause : le voile « fantôme » (`opacity` 0,05, couleur `0x5a3f42`, une couche par surface traversée) était mélangé dans le tampon 8 bits **sRGB après tonalité**. Il l'est maintenant dans la cible HalfFloat **linéaire avant tonalité**, et son effet perçu est à peu près divisé par deux. Conséquences : le voile garde moins bien la silhouette, et la comparaison avec/sans ne mesure pas l'occlusion. | Pour toute comparaison, couper l'effet avec `contact.composeMat.uniforms.uStrength.value = 0` plutôt qu'avec `contact.enabled = false` : même pipeline, seule l'occlusion change. Ensuite, recaler le fantôme pour retrouver l'aspect d'avant (`opacity` ≈ 0,09, à ajuster à l'œil sur la coupe 4 cavités). |
| I4 | `contact-shadows.js:96`, `:121-122`, `:134-139` ; `app.js:22`, `:69` | **Surcoût par image du pipeline**, en plus des passes elles-mêmes. (a) La passe du calque d'interface (`camera.layers.set(1)`) ne voit pas les lumières, qui sont sur le calque 0 : `projectObject` ne pousse une lumière que si `layers.test` réussit. Le nombre de lumières passe de 5 à 0 puis de 0 à 5 à chaque image, `lights.state.version` change deux fois, et **chaque matériau éclairé repasse par `getProgram`** à l'image suivante : paramètres, clé de programme, recâblage des uniformes et `uniformsList = null`. Ce n'est pas une recompilation, mais un coût processeur net pour une trentaine de matériaux physiques. (b) La résolution MSAA recopie aussi le **stencil**. Three le déconseille lui-même : c'est lent avec ANGLE/Direct3D, donc sur ce PC Windows (#27799). Le stencil ne sert qu'aux capuchons, pendant la passe. (c) `renderer.clear()` (l. 122) double l'effacement automatique d'une cible MSAA HalfFloat. (d) Le canevas garde `antialias: true` et `stencil: true` : un tampon MSAA et un stencil plein écran inutiles, puisque seul un quad plein écran y est dessiné. | (a) `[key, fill, rim, rim2, hemi].forEach((l) => l.layers.enableAll());` dans `app.js`. L'état d'éclairage est alors identique dans les deux passes, et la carte d'ombre n'est pas recalculée, puisque `needsUpdate` est consommé par la première passe. (b) `this.target.resolveStencilBuffer = false;` juste après la création de la cible (propriété présente dans r169). (c) Supprimer la ligne 122. (d) `new THREE.WebGLRenderer({ antialias: false, alpha: true, stencil: false, … })`, à condition que le repli `enabled = false` dessine aussi dans une cible (sinon garder l'anticrénelage du canevas). |
| I5 | `js/valves.js:119-156`, `:236-257`, `:291-338`, `:365-381` ; `app.js:709` | **Coût processeur des valves multiplié par 3,5.** Mesuré dans Node (même moteur que Chrome) pendant le battement en coupe : **7,2 ms par image contre 2,1 ms** pour la version précédente, soit environ 1,4 ms par valve sigmoïde et 2 ms par valve AV. Sur un téléphone, il faut compter 3 à 5 fois plus, soit 20 à 35 ms : la coupe en battement passe sous 30 images/s avant même le rendu. Toutes les valves sont redessinées à chaque image, car `deformDirty` est vrai à chaque image du battement. Chaque sommet appelle `point()` (trois `dir()` normalisés, l'anneau, `coapt` qui recalcule l'anneau), puis `deformPoint`. Les cordages allouent plus de 500 `Vector3` par valve AV et par image (ramasse-miettes). | 1. **Précalculer** les positions fermée et ouverte de chaque sommet au constructeur : `point(u, v, open)` est **linéaire en `open`** pour les deux types de valves. Par image, il reste un mélange `P0 + (P1 − P0)·at(v)`, environ 10 fois moins cher. Même chose pour les points d'insertion des cordages. 2. Laisser le GPU déformer les lames (`deformOn: true`, `deformK: 0.1`, `customDepthMaterial` déjà prévu) : le processeur ne redessine alors une valve que si elle bouge. Les valves AV fermées en systole et les sigmoïdes fermées en diastole ne coûtent plus rien. 3. Sigmoïdes : grille 24 × 14 au lieu de 34 × 22. 4. Remplacer `Math.hypot` par `Math.sqrt(x*x+y*y+z*z)` dans `Shell.update` (−10 %). 5. Réutiliser des tableaux de `Vector3` préalloués dans `rawChords` et `draw`. |
| I6 | `js/valves.js:298`, `:302`, `:310`, `:326` | **Les cordages ne sont toujours pas inextensibles.** Distance actuelle / longueur de repos (mesurée valve fermée, cœur relâché) : mitrale ouverte (1) de 0,39 à 1,12 ; tricuspide ouverte de 0,38 à **1,38** ; fin de systole de 0,82 à 1,13. Causes : (a) le point de ramification `B = H.lerp(moyenne des insertions, 0,36)` se déplace avec les feuillets, donc le tronc mesure de 57 % à 94 % de sa longueur de repos ; de même pour `Bc` ; (b) avec une flèche plafonnée à 12 % de L0, un cordage ramené à 40 % de sa longueur paraît simplement **raccourci**, pas détendu ; (c) en position ouverte, certains bords tricuspides s'éloignent de leur pilier de 38 % au-delà de la longueur du cordage, qui est alors dessiné tendu et allongé. | 1. Tronc et branches de longueur fixe : `B = H + normalize(moyenne − H) · Ltronc` et `Bc = B + normalize(moyenne(grappe) − B) · Lbranche`, longueurs mesurées valve fermée (ils pivotent sans changer de longueur). 2. Ajuster la pose ouverte (`sail`, `inw`, `valves.js:243-244`) pour que chaque cordage fin reste entre 0,85 et 1,0 × L0. Chez Nucleus, les cordages restent presque droits en diastole et suivent les feuillets. 3. Ajouter au chargement, en mode débogage, un contrôle qui affiche le rapport minimal et maximal sur un cycle (mon script en donne le modèle). 4. Prendre comme longueur de repos le maximum entre « fermée, relâchée » et « fermée, fin de systole », pour que les cordages restent tendus pendant toute la systole. |
| I7 | `js/valves.js:27-30` ; `js/heart.js:204-216` ; `v12-02`, `v12-06`, `v12-07` | **Feuillets jaune beurre, uniformément lumineux.** `CLAIRE [0,86, 0,76, 0,60]` et `RUGUEUSE [0,86, 0,71, 0,48]`, multipliés par `trTint (1, 0,82, 0,64)`, ramènent la teinte « beurre » qui avait été corrigée vers l'ivoire. La teinte est très proche de la « Graisse des sillons » (légende `#eed8a8` contre `#e8d3a2`). La translucidité est ajoutée pour **les quatre lumières directionnelles, sans ombre ni occlusion**, y compris les deux contre-jours (intensités 2,1 et 1,4) placés derrière le cœur, que la paroi postérieure devrait masquer. Résultat : des feuillets qui « s'allument » de l'intérieur, sans modelé ni ombre propre (v12-02). | Teintes : `CLAIRE [0.93, 0.88, 0.80]`, `RUGUEUSE [0.91, 0.82, 0.68]`, `NODULE [0.95, 0.91, 0.82]`, `trTint vec3(1.0, 0.9, 0.82)`. Translucidité : clé seule, atténuée par l'occlusion : `float back = clamp(-dot(normal, directionalLights[0].direction), 0.0, 1.0); reflectedLight.directDiffuse += directionalLights[0].color * diffuseColor.rgb * trTint * back * (0.25 + 0.75 * thin) * uTrans * ao;` (la lumière 0 est celle qui porte l'ombre, car three range en premier les lumières qui projettent une ombre). `uTrans` 0,55 → 0,35. Idéalement, multiplier aussi par l'ombre de la clé, en reprenant l'appel `getShadow(…)` de `lights_fragment_begin` de r169 avec `directionalLightShadows[0]`. |

## 4. Souhaitables

1. **Repli sans flottants** (`contact-shadows.js:95-96`). Une cible 8 bits **linéaire** produit des aplats dans les ombres et écrête toutes les hautes lumières (vernis, `clearcoat`) avant la tonalité : ce n'est pas « la même image ». Si ni `EXT_color_buffer_float` ni `EXT_color_buffer_half_float` n'est disponible, mettre `this.enabled = false` (rendu direct).
2. **Le chemin `enabled = false` perd les flèches de la circulation** (`contact-shadows.js:118`) : elles sont sur le calque 1, que la caméra ne voit pas par défaut. Écrire `camera.layers.enable(this.overlayLayer); renderer.render(scene, camera); camera.layers.mask = mask;`.
3. **Échantillonnage de la profondeur à la frontière des texels** (`contact-shadows.js:28-35`). En demi-résolution, `vUv` tombe exactement entre deux texels pleine résolution, et le filtre `Nearest` choisit l'un ou l'autre selon l'arrondi. `dx` ou `dy` peuvent alors être nuls, d'où la garde « normale indéterminée » et des points sans occlusion (à confirmer). Centrer : `vec2 uv0 = (floor(vUv / uTexel) + 0.5) * uTexel;` et l'utiliser partout à la place de `vUv`.
4. **Réglage de l'effet.** Les cordages (0,3 mm) occupent trop peu d'échantillons pour assombrir les feuillets : l'ombre de contact à leurs pieds est à peine visible. Essayer `radius` 0,35 et `intensity` 4 en coupe, et un rayon plus grand en vue externe (sillons). Le motif 4 × 4 n'est pas « annulé exactement », car les échantillons du flou tombent à 0,25 texel des centres et les poids bilatéraux varient ; le résultat reste acceptable.
5. **Redimensionnement** : chaque événement de `ResizeObserver` (animation du tiroir mobile) détruit et réalloue la cible MSAA HalfFloat. Ne réallouer que si la taille entière change (three le fait déjà), et retarder d'une image pendant les transitions. Ajouter une méthode `dispose()` (cibles, matériaux, quads).
6. **Commissures des sigmoïdes** (`valves.js:369-374`). Ouvertes, les cuspides se décollent de la paroi aux commissures : le bord latéral va de la paroi (R) à 0,84 R, soit 2,3 mm (aorte) et 2,6 mm (pulmonaire), et laisse une fenêtre triangulaire où l'on voit l'intérieur creux de la lame. Fermées, le bord libre rejoint la commissure 1,7 mm sous elle. Correctif, avec `c = (1 − sin πu)^4` : `Fo` = `C + tD·R·(0.84 + 0.16·c) + A·Hc·(1.02 − 0.07·c)` et `Fc` = hauteur `Hc·(0.8 + 0.06·(1 − s) + 0.15·s⁴)`.
7. **Orientation des fibres des cuspides** (`heart.js:173-175`). Dans les cuspides sigmoïdes, les faisceaux de collagène sont **circonférentiels** : ils vont d'une commissure à l'autre, parallèles au bord libre, et c'est l'aspect caractéristique en transillumination ou chez Nucleus. Le shader les dessine radiaux pour les quatre valves. Ajouter un uniforme `uCusp` et, pour les cuspides, permuter les axes : `vnoise(vec3(vPar.x * 4.0, vPar.y * 70.0, 0.5))`. Pour les feuillets AV, les fibres radiales dans le prolongement des cordages sont justes. Exprimer aussi `u` en longueur d'arc (`u · span · R`), sinon les fibres du feuillet postérieur mitral sont 1,7 fois plus larges que celles de l'antérieur.
8. **Vibration diastolique des feuillets AV** (`valves.js:319`). Un frémissement à 7 Hz du feuillet mitral antérieur en diastole est le signe échographique classique d'une **insuffisance aortique** (Austin Flint). Une valve normale décrit seulement les ondes E et A, déjà présentes dans `cycle()`. Supprimer `wob` pour les valves AV et le garder, discret, pour les sigmoïdes : le frémissement systolique fin des cuspides aortiques est normal.
9. **Tricuspide plus fine** que la mitrale (feuillets plus minces et plus translucides) : passer un facteur d'épaisseur 0,75 à `Shell` pour la tricuspide.
10. **Pied des cordages** (`valves.js:304`, `:334`) : l'évasement occupe le dernier tiers du cordage, ce qui donne une « carotte » de 3 à 5 mm. L'éventail réel mesure environ 1 mm. Ajouter un quatrième tronçon court (les 8 derniers % de la longueur) qui porte seul l'évasement.
11. **Terminologie des cordages** (`valves.js:14-16`, `README.md:30`). En anatomie, les « ordres » désignent le **site d'insertion** : 1er ordre au bord libre, 2e ordre sur la face ventriculaire de la zone rugueuse, 3e ordre (basaux) à la base du feuillet postérieur, depuis la paroi. Tronc, branches et ramuscules sont des niveaux de ramification. Les cordages de 3e ordre manquent, comme les cordages septaux directs de la tricuspide (déjà signalés). Écrire « cordages ramifiés (tronc, branches, cordages fins) de 1er et 2e ordre ».
12. **Légende** : `--graisse #eed8a8` et `--valve #e8d3a2` sont presque identiques. Une fois I7 appliqué, passer les valves à `#efe6d4` (ivoire) pour les distinguer de la graisse.
13. **Coupe de la lame par `interiorPlane`** : la tranche d'un feuillet coupé montre l'intérieur creux (deux faces sans capuchon). C'est peu visible à 0,5 à 1 mm d'épaisseur ; si besoin, ajouter un capuchon stencil comme pour les solides.

## 5. Vérifié et exact

- **`Shell`** : faces supérieure (a, b, c) et inférieure (a, c, b), et bandeau du bord libre, ont une orientation géométrique conforme aux normales posées (+N, −N, puis N + T et T − N au bord). Avec `DoubleSide`, `faceDirection` ne retourne que les faces vues de l'intérieur (lame coupée), ce qui est correct. Les normales par différences centrées sont recalculées après la vibration.
- **`Cords`** : la normale géométrique (τ × t) est radiale vers l'extérieur, conforme aux normales posées. Le changement de repère quand |t.y| > 0,9 ne fait que tourner les anneaux aux jonctions.
- **Épaisseurs** : base AV 1,2 mm, zone claire 0,45 mm, zone rugueuse 1,1 mm, amincissement aux commissures (× 0,75) ; cuspide 0,35 mm, lunules 0,23 mm, nodule 1,45 mm ; la translucidité suit l'épaisseur (`vPar.z`). Insertions des cordages au bord libre (1er ordre) et à v = 0,6, sur la face ventriculaire (2e ordre). Chaque feuillet est tenu par les deux piliers qui encadrent ses commissures.
- **Coaptation mitrale fermée** : écart de 1,04 mm entre les surfaces moyennes, pour environ 0,9 mm d'épaisseur cumulée : les feuillets se touchent sans scintillement.
- **Ressort** : intégration semi-implicite sous-échantillonnée (ω·h ≤ 0,18), stable de 15 à 60 images/s. `dirty` est levé dès que `uDC`/`uDAt` changent et consommé une fois par image. `setPose` ne fait plus que fixer les consignes.
- **Ombres de contact, three r169** :
  - profondeur et stencil du tampon MSAA en DEPTH24_STENCIL8, comme la `DepthTexture` ; profondeur résolue par `blitFramebuffer` ;
  - `clearStencil()` des capuchons agit sur le tampon MSAA lié ;
  - pendant le rendu dans la cible, `toneMapping` vaut `NoToneMapping` et la sortie est linéaire ; tonalité Neutral, `toneMappingExposure` (fixé à chaque `refreshMaterial`) et encodage sRGB appliqués une seule fois, à la recomposition ;
  - aucune texture n'est lue et écrite dans la même passe ;
  - `setViewOffset` est pris en compte par `uProjInv` (seuls `[0][0]` et `[1][1]` servent au rayon) ;
  - la première passe consomme `shadowMap.needsUpdate`, donc la seconde ne recalcule pas la carte d'ombre ;
  - le lancer de rayons et les étiquettes CSS ne dépendent pas du pipeline.
- **Endocarde receveur d'ombres** : `BackSide`, dont la normale est retournée dans le shader. Le `normalBias` décale donc vers l'intérieur de la cavité, du côté de la lumière : pas d'acné attendue.
- **`sw.js`** : `VERSION` v10, `contact-shadows.js` présent dans `SHELL` (seul `Pass.js` manque, voir B3).

## Corrections appliquées (17 octobre 2026)

| Point | Correction | Vérification |
|---|---|---|
| B1 | Ressorts plus raides (AV base 12 Hz / ζ 0,75, bord 8 Hz / 0,65 ; sigmoïdes 14 / 0,75 et 9 / 0,65), contact à la fermeture dans `Spring.step` (x ≥ 0, rebond × −0,15), pas de temps plafonné à 0,1 s, borne basse de `at()` à 0, consigne des valves prise sur `cycle(phase + 0,02)`. | Plus de réouverture ni de dépassement au-delà de la fermeture. |
| B2 | Valves AV fermées en tente : `belly` 0,1·hauteur, `A·(0,2·w + lip)`, `lip` 0,28·h. | Valves fermées sous le plan de l'anneau (v13-01). |
| B3 | `contact-shadows.js` n'importe plus `Pass.js` : triangle plein écran interne. Service worker v11. | Plus de dépendance hors cache. |
| I1 | Cibles dimensionnées sur `getDrawingBufferSize()` ; texel d'occlusion = 1 / taille réelle. | — |
| I2 | Tonalité appliquée à la couleur dé-prémultipliée, puis re-prémultipliée. | — |
| I3 | Voile de la partie retirée 0,05 → 0,09. | — |
| I4 | Lumières sur tous les calques ; `resolveStencilBuffer = false` ; effacements en double supprimés ; canevas sans antialiasing (MSAA dans la cible). | — |
| I5 | Formes fermée et ouverte précalculées par lame (`Shell.cache`, `updateOpen`) ; `Math.sqrt` ; grille des sigmoïdes 26 × 16. La déformation des lames reste faite par le processeur. | — |
| I6 | Tronc et branches de longueur fixe (mesurée valve fermée) ; seuls les cordages fins se détendent. Le contrôle en mode débogage n'est pas fait. | Cordages tendus en systole, légèrement incurvés en diastole (v13-02). |
| I7 | Teintes ivoire (`CLAIRE` 0,92/0,86/0,75, `RUGUEUSE` 0,90/0,80/0,64) ; translucidité par la seule lumière principale, multipliée par l'occlusion ; `uTrans` 0,35. | v13-01, v13-02. |

Souhaitables non traités dans ce lot : repli sans flottants plus fin, commissures et fibres circonférentielles des cuspides, déformation des lames par le GPU, terminologie des ordres de cordages.
