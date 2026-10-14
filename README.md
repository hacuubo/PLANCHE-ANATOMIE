# Planche d'anatomie — Le cœur

Application web progressive (PWA) destinée à expliquer aux patients l'anatomie du cœur
et de ses vaisseaux, à la manière d'une planche d'atlas : un modèle 3D interactif,
des étiquettes numérotées avec lignes de rappel, et une fiche explicative par structure.

## Fonctions

- **Modèle 3D organique** (three.js), dans le style des animations médicales (type Nucleus) :
  une enveloppe continue (masse ventriculaire, oreillettes et auricules, graisse des sillons,
  aorte avec crosse et ses trois branches, tronc pulmonaire et artères pulmonaires, veines caves,
  quatre veines pulmonaires, ligament artériel) raccordée en douceur et sectionnée « à vif »
  aux extrémités des vaisseaux ; artères coronaires (coronaire droite, tronc commun, IVA,
  circonflexe et leurs branches), grande veine du cœur, veine moyenne et sinus coronaire
  posés sur la surface.
- **Rendu « tissu vivant »** : fibres myocardiques et lobules de graisse en relief procédural,
  film humide satiné, diffusion sous la surface (translucidité), liseré lumineux, occlusion
  ambiante cuite dans le maillage, éclairage de studio sur fond clair.
- **Coupe** (grand axe, frontale, horizontale, profondeur réglable) : cavités, septum,
  anneaux valvulaires, nœud sinusal, nœud atrio‑ventriculaire, faisceau de His.
- **Circulation** : parois translucides et particules suivant le trajet du sang
  (bleu = pauvre en oxygène, rouge = riche en oxygène).
- **Étiquettes** : planche numérotée en deux colonnes avec lignes de rappel ; les étiquettes
  masquées par le modèle sont retirées automatiquement.
- **Fiche** par structure : nom courant, nom anatomique, résumé pour le patient,
  détails, repères chiffrés.
- **Hors ligne** : service worker mettant en cache l'application et les modules three.js.

## Lancer en local

```bash
npx --yes http-server . -p 8765 -c-1
```

Puis ouvrir <http://localhost:8765/>. Fichiers statiques ; three.js est chargé depuis jsDelivr
(version épinglée dans `index.html` et `sw.js`).

### Régénérer le maillage du cœur

L'enveloppe est décrite par une fonction de distance signée dans `js/heart-shape.js`
(positions anatomiques, rayons, raccords, teintes). Après toute modification de ce fichier :

```bash
node tools/build-heart-mesh.mjs
```

L'outil (Node, sans dépendance, ≈ 30 s) extrait la surface par « surface nets », cuit couleurs,
tissus et occlusion ambiante, plaque les coronaires sur la surface et écrit `assets/heart.bin`
(≈ 5 Mo : maillage visuel d'environ 114 000 sommets et maillage simplifié pour le clic).
Vérifier ensuite l'intérieur (épaisseur des parois, septum, faisceau de His dans le septum, piliers dans leur cavité) :

```bash
node tools/check-walls.mjs
```

Incrémenter enfin `VERSION` dans `sw.js` pour que les applications installées se mettent à jour.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page, barre d'outils, panneau |
| `css/style.css` | Styles (palette papier/encre, fond de studio de la scène, étiquettes, panneau mobile en tiroir) |
| `js/data.js` | Contenu pédagogique : structures, textes, ordre de la planche |
| `js/heart-shape.js` | Forme du cœur (fonction de distance), repère local, trajets des coronaires ; partagé avec l'outil de génération |
| `js/heart.js` | Chargement de l'enveloppe, matériau « tissu » (shader), coronaires, structures internes, trajets du sang |
| `assets/heart.bin` | Maillage généré (ne pas modifier à la main) |
| `tools/build-heart-mesh.mjs` | Génère `assets/heart.bin` (`node tools/build-heart-mesh.mjs`) |
| `tools/check-walls.mjs` | Contrôle anatomique de l'intérieur : parois, septum, conduction, piliers |
| `js/app.js` | Scène, coupe (clipping + capuchons stencil), circulation, étiquettes, interface |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |
| `tools/make-icons.mjs` | Régénère les icônes PNG (`node tools/make-icons.mjs`) |

## Repère et unités

Unités en centimètres. Repère monde : +x = gauche du patient, +y = haut, +z = avant.
En vue antérieure, le côté gauche du patient est donc à droite de l'écran, comme sur
une planche d'atlas. La masse ventriculaire est décrite dans un repère local incliné
(axe base → apex), les grands vaisseaux dans le repère monde.

## Processus de relecture

Toute modification anatomique (positions, rapports, textes) doit être relue par un
relecteur indépendant expert en anatomie ; toute modification visuelle par un relecteur
« direction artistique ». Les comptes rendus sont consignés dans `docs/relectures/`.

## Avertissement

Modèle schématique à visée pédagogique ; il ne remplace pas l'avis d'un médecin.
