# Planche d'anatomie — Le cœur

Application web progressive (PWA) destinée à expliquer aux patients l'anatomie du cœur
et de ses vaisseaux, à la manière d'une planche d'atlas : un modèle 3D interactif,
des étiquettes numérotées avec lignes de rappel, et une fiche explicative par structure.

## Fonctions

- **Modèle 3D procédural** (three.js) : masse ventriculaire, oreillettes et auricules,
  aorte avec crosse et ses trois branches, tronc pulmonaire et artères pulmonaires,
  veines caves, quatre veines pulmonaires, ligament artériel, sillons comblés de graisse,
  artères coronaires (coronaire droite, tronc commun, IVA, circonflexe) et sinus coronaire.
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

Puis ouvrir <http://localhost:8765/>. Aucune étape de construction : fichiers statiques,
three.js est chargé depuis jsDelivr (version épinglée dans `index.html` et `sw.js`).

## Organisation

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page, barre d'outils, panneau |
| `css/style.css` | Styles (palette papier/encre, étiquettes, panneau mobile en tiroir) |
| `js/data.js` | Contenu pédagogique : structures, textes, ordre de la planche |
| `js/heart.js` | Construction du modèle 3D (repère local du cœur, profils, vaisseaux) |
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
