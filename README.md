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
  trajet réel des coronaires.
- **Coronaires** comme sur les planches de référence : sillons dégagés de leur graisse, artères en rouge et veines en
  bleu, troncs remis au calibre des atlas (tronc commun ≈ 4,5 mm, IVA proximale et coronaire droite ≈ 3,5 mm, branches
  ≈ 2,4 mm, sinus coronaire ≈ 6 mm), calibre qui diminue vers la périphérie ; le myocarde reconstruit est creusé
  sous chaque vaisseau, visible sur toute sa longueur (jamais interrompu). Visibles : coronaire droite, branche du
  conus, branches ventriculaires et marginales, IVP (interventriculaire postérieure) ; tronc commun, IVA et
  diagonales, circonflexe ; grande veine du cœur, veine interventriculaire antérieure, veine moyenne, petites veines,
  sinus coronaire.
- **Rendu « tissu vivant »** dans le style des animations médicales : fibres myocardiques en relief procédural, film humide satiné, translucidité, liseré lumineux,
  occlusion ambiante cuite dans le maillage, éclairage de studio sur fond clair.
- **Coupe** (profondeur réglable) : **5 cavités** (coupe courbe : plan 5 cavités par la pointe et la valve aortique,
  creusé en pente douce autour des valves mitrale et tricuspide jusqu'au plan 4 cavités, si bien que les trois valves
  sont coupées en leur milieu, à ≈ 2 mm près ; la valve pulmonaire, en avant de l'aorte, n'y figure pas), **4 valves**
  (base du cœur vue d'en haut, l'avant en haut de l'écran : chaque valve coupée dans son plan — mitrale et tricuspide
  à l'anneau, oreillettes retirées jusqu'à lui ; aortique et pulmonaire perpendiculairement à leur axe, cuspides vues
  de dessus), **vue
  chirurgien** (petit axe de la mitrale comme en ETO 3D : oreillettes retirées au-dessus de l'anneau, valve vue
  depuis l'oreillette gauche, aorte à 12 h, mitrale fermée au repos pour montrer la coaptation), frontale et
  horizontale. **Tranches** (js/cut-surface.js) : muscle rouge sectionné, fibres en hélice dont l'angle tourne dans
  l'épaisseur (cloison comprise, de sa face gauche à sa face droite) (stries ou points selon leur orientation dans la tranche), cloisons entre faisceaux, endocarde nacré,
  épicarde et couche sous-épicardique, paroi des oreillettes, paroi crème des gros vaisseaux ; profondeur lue dans
  une carte 3D de la paroi (voxels de 2 mm) qui suit le battement. On y voit cavités, septum, valves et
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
- **Modèle visuel** : plein écran, sans panneau, texte, légende, nom de structure ni repère d'orientation ; coronaires
  toujours affichées ; battement automatique dès l'ouverture, bouton « Pause ».
- **Valves** (gros plans chirurgicaux, js/aortic-view.js et js/av-views.js) : le bouton « Valves » ouvre le choix de la
  valve sans bouger la vue ; le clic sur le nom de la valve l'entoure d'un anneau et lance le zoom (≈ 6 s). Choix
  de la variante et de la position (fermée / ouverte), animation avec le battement, fiche par variante.
  **Zoom de repérage** : la caméra montre d'abord le cœur translucide avec la valve à sa place, entourée et nommée,
  puis plonge vers elle jusqu'à la vue chirurgicale ; d'une valve à l'autre, elle ressort et tourne autour du cœur.
  - **Aortique** (depuis l'aorte, chirurgien à droite du patient) : normale, bicuspidie type 1 L-R (Sievers), RAo
    serré dégénératif.
  - Mitrale et tricuspide : oreillette ouverte comme après atriotomie (paroi qui remonte de l'anneau, bord coupé
    épais) ; l'anneau n'est qu'une fine ligne de charnière. Oreillette gauche : endocarde lisse, veines pulmonaires,
    auricule gauche et sa crête, fosse ovale. Oreillette droite : veines caves et valvule d'Eustachi, sinus coronaire,
    fosse ovale et limbe, muscles pectinés et crête terminale, auricule droite.
  - **Mitrale** (depuis l'oreillette gauche, aorte à 12 h, auricule gauche à gauche) : normale (A1-A3, P1-P3),
    insuffisance par prolapsus de P2 avec rupture de cordage (segment flottant, cordages rompus, brèche de coaptation).
  - **Tricuspide** (depuis l'oreillette droite, feuillet septal en bas, sinus coronaire) : normale, insuffisance
    fonctionnelle par dilatation de l'anneau (paroi libre dilatée, feuillets attirés vers le ventricule, défaut de
    coaptation central).
- **Circulation** : parcours guidé du sang en 8 étapes (veines caves → oreillette droite → ventricule droit →
  poumons → veines pulmonaires → oreillette gauche → ventricule gauche → aorte), en coupe 5 cavités vue de face et
  d'en haut. Flèches animées dans le sens du sang (bleu = pauvre en oxygène, rouge = riche), valves dans la position
  de chaque étape, texte simple, lecture automatique ou pas à pas.
- **Sélection** : étiquette au survol et à la sélection, « mode focus » (le reste passe en retrait).
- **Fiche** par structure (français ; traduction anglaise dans `js/data.en.js`).
- **Ombres** : ombres portées (lumière principale, carte d'ombre déformée avec le battement, reçues aussi par
  l'endocarde) et ombres de contact en espace écran (creux, sillons, jonctions valves–anneau, cordages–feuillets,
  piliers–paroi), calculées sur la profondeur de l'image réellement affichée : coupes et battement compris.
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
| `js/av-views.js` | Vues chirurgicales des valves mitrale et tricuspide (normales et pathologiques) |
| `js/aortic-view.js` | Vue chirurgicale de la valve aortique : racine aortique et variantes (normale, bicuspide, rétrécie) |
| `js/contact-shadows.js` | Ombres de contact : occlusion ambiante en espace écran calculée sur la profondeur de l'image affichée |
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
et ré-extraites, coronaires remises au calibre des atlas, myocarde ventriculaire, tronc brachio-céphalique et ligament artériel
reconstruits) ; l'attribution figure aussi dans l'application, au pied du panneau.

## Processus de relecture

Toute modification anatomique (positions, rapports, textes) doit être relue par un
relecteur indépendant expert en anatomie ; toute modification visuelle par un relecteur
« direction artistique ». Les comptes rendus sont consignés dans `docs/relectures/`.

## Avertissement

Modèle à visée pédagogique ; il ne remplace pas l'avis d'un médecin.
