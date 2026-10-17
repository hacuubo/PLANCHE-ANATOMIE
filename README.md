# Planche d'anatomie — Le cœur

Application web progressive (PWA) destinée à expliquer aux patients l'anatomie du cœur
et de ses vaisseaux, à la manière d'une planche d'atlas : un modèle 3D interactif,
une liste numérotée des structures, et une fiche explicative par structure.

## Fonctions

- **Modèle 3D issu de données anatomiques réelles** (BodyParts3D, voir plus bas) : cavités,
  oreillettes et auricules, feuillets valvulaires avec leurs cordages, muscles papillaires,
  arbre coronaire et veines du cœur, gros vaisseaux (aorte et crosse, tronc pulmonaire et artères
  pulmonaires, veines caves, veines pulmonaires). Le myocarde ventriculaire, absent de
  BodyParts3D, est reconstruit autour des cavités réelles, son épaisseur étant calée sur le
  trajet réel des coronaires ; la graisse des sillons suit les troncs coronaires.
- **Rendu « tissu vivant »** dans le style des animations médicales : fibres myocardiques et
  lobules de graisse en relief procédural, film humide satiné, translucidité, liseré lumineux,
  occlusion ambiante cuite dans le maillage, éclairage de studio sur fond clair.
- **Coupe** (profondeur réglable) : coupes échographiques **4 cavités** et **5 cavités** (la 4 cavités basculée
  vers l'avant autour de la pointe, jusqu'à la valve aortique : chambre de chasse du VG et racine aortique), **vue
  chirurgien** (petit axe de la mitrale comme en ETO 3D : oreillettes retirées au-dessus de l'anneau, valve vue
  depuis l'oreillette gauche, aorte à 12 h, mitrale fermée au repos pour montrer la coaptation), frontale et
  horizontale. On y voit cavités, septum, valves et
  cordages, piliers, nœud sinusal, nœud atrio‑ventriculaire, faisceau de His placé dans le septum.
- **Valves** (js/valves.js) : modèle paramétrique calé sur les repères BodyParts3D — feuillets mitraux et
  tricuspides festonnés, cordages tendineux en éventail vers les muscles papillaires (chaque feuillet tenu par
  les deux piliers qui encadrent ses commissures), coaptation mitrale en « sourire » et tricuspide en Y, cuspides
  aortiques et pulmonaires en poche fermées en Y. **Tissu** : lames épaisses (0,4 à 1,2 mm) à bord libre arrondi,
  base fibreuse rosée, zone claire mince et translucide, zone rugueuse épaissie ; lunules et nodule d'Arantius des
  sigmoïdes ; fibres de collagène radiales, ondulations du bord et lumière traversant les zones minces dessinées
  dans le shader (`VALVE`, js/heart.js). Cordages en trois ordres (tronc, branches, cordages fins évasés à
  l'insertion), inextensibles : tendus valve fermée, ils s'incurvent quand elle s'ouvre. **Cinétique** : ouverture
  suivant un ressort amorti (léger rebond à la fermeture), bord libre en retard sur la base (ondulation en voile),
  vibration du bord libre dans le flux pendant le battement.
- **Battement** : cycle cardiaque physiologique (≈ 64/min) — systole auriculaire, contraction isovolumique
  (fermeture mitrale et tricuspide), éjection (ouverture aortique et pulmonaire), relaxation, remplissage.
  Raccourcissement base → pointe, épaississement des parois, réduction des cavités (fraction d'éjection apparente
  ≈ 50 %) et torsion, calculés dans le shader de sommets : tous les tissus, les surfaces de coupe et les ombres
  suivent le même mouvement. Le ventricule se vide pendant l'éjection et se remplit après l'ouverture des valves
  mitrale et tricuspide.
- **Circulation** : parcours guidé du sang en 8 étapes (veines caves → oreillette droite → ventricule droit →
  poumons → veines pulmonaires → oreillette gauche → ventricule gauche → aorte), en coupe 4 cavités vue de face et
  d'en haut. Flèches animées dans le sens du sang (bleu = pauvre en oxygène, rouge = riche), valves dans la position
  de chaque étape, texte simple, lecture automatique ou pas à pas.
- **Sélection** : étiquette au survol et à la sélection, « mode focus » (le reste passe en retrait).
- **Fiche** par structure (français ; traduction anglaise dans `js/data.en.js`).
- **Hors ligne** : service worker mettant en cache l'application, le modèle et three.js.

## Lancer en local

```bash
npx --yes http-server . -p 8765 -c-1
```

Puis ouvrir <http://localhost:8765/>. Fichiers statiques ; three.js est chargé depuis jsDelivr
(version épinglée dans `index.html` et `sw.js`).

### Régénérer le modèle

`assets/heart.bin` est produit par `tools/build-heart-bp3d.mjs` (Node, sans dépendance) à partir
des maillages BodyParts3D, qui ne sont pas versionnés dans ce dépôt :

1. Télécharger `partof_BP3D_4.0_obj_99.zip` (62 Mo) depuis la
   [page de téléchargement BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)
   et le décompresser hors du dépôt.
2. Lancer la génération (≈ 15 à 20 min) :

```bash
node tools/build-heart-bp3d.mjs <chemin>/partof_BP3D_4.0_obj_99
```

L'outil affiche l'épaisseur obtenue pour le myocarde et la taille du fichier. Incrémenter ensuite
`VERSION` dans `sw.js` pour que les applications installées se mettent à jour.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page, barre d'outils, panneau |
| `css/style.css` | Styles (palette papier/encre, fond de studio de la scène, étiquettes, circulation guidée, panneau mobile en tiroir) |
| `js/data.js`, `js/data.en.js` | Contenu pédagogique : structures, textes, ordre de la planche (FR, EN) |
| `js/heart.js` | Chargement du modèle, matériau « tissu » (shader), déformation du cycle cardiaque, conduction, trajets du sang, clic et surbrillance |
| `js/valves.js` | Valves paramétriques (feuillets, cordages, cuspides) et leur ouverture |
| `js/app.js` | Scène, coupes (clipping + capuchons stencil), circulation guidée, étiquettes, interface |
| `assets/heart.bin` | Modèle généré (ne pas modifier à la main) |
| `tools/build-heart-bp3d.mjs` | Génère `assets/heart.bin` à partir de BodyParts3D |
| `tools/lib/` | Distance aux maillages, extraction de surface (« surface nets »), lecture BodyParts3D, repères des valves |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |
| `tools/make-icons.mjs` | Régénère les icônes PNG (`node tools/make-icons.mjs`) |

## Repère et unités

Unités en centimètres. Repère monde : +x = gauche du patient, +y = haut, +z = avant.
En vue antérieure, le côté gauche du patient est donc à droite de l'écran, comme sur
une planche d'atlas. Les coordonnées BodyParts3D (mm ; y vers l'arrière, z vers le haut) sont
converties à la lecture (`tools/lib/bp3d-heart.mjs`).

## Source des données et licence

Géométrie : **BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0
International** ([licence](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)).
Les fichiers OBJ de 2011 portent encore l'ancienne mention CC BY-SA 2.1 Japon ; la page de licence
actuelle de la base indique CC BY 4.0. Le modèle de ce dépôt est une œuvre dérivée (pièces lissées
et ré-extraites, myocarde ventriculaire, graisse, tronc brachio-céphalique et ligament artériel
reconstruits) ; l'attribution figure aussi dans l'application, au pied du panneau.

## Processus de relecture

Toute modification anatomique (positions, rapports, textes) doit être relue par un
relecteur indépendant expert en anatomie ; toute modification visuelle par un relecteur
« direction artistique ». Les comptes rendus sont consignés dans `docs/relectures/`.

## Avertissement

Modèle à visée pédagogique ; il ne remplace pas l'avis d'un médecin.
