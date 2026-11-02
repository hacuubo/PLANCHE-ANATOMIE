# Relecture — Cloison et veines caves corrigées dans le modèle ; trous de l'AP ; fin de la TAVI (2 novembre 2026)

## Demandes

1. Corriger la cloison interauriculaire et les veines caves dans le modèle lui-même, et non plus au chargement.
2. Deux « trous » sur la vue extérieure du cœur, à la jonction infundibulum droit / artère pulmonaire.
3. TAVI : au retour vers la vue chirurgicale, avant l'écran partagé avant/après, la valve aortique était cachée par
   l'aorte.

## 1. Modèle (tools/build-heart-bp3d.mjs, régénéré : environ 30 min)

- **Cloison.** Dans BodyParts3D, les parois des deux oreillettes sont séparées par le sillon interauriculaire, environ
  2,6 mm de vide entre elles.
  - Le champ qui définit l'enveloppe le comble là où les deux cavités sont à moins de 4,5 mm l'une et l'autre, dans un
    disque de 2,4 cm autour de la fosse ovale.
  - La fosse est repérée comme dans js/heart.js : zone où les deux cavités sont le plus proches.
  - La carte de paroi qui colore les tranches est recalculée avec ce changement.
- **Veines caves.**
  - La cavité de l'oreillette droite se prolonge dans la lumière de chaque veine cave, 0,3 mm en dedans de l'intima,
    avec un raccord arrondi.
  - La boîte des cavités monte jusqu'au bout de la veine cave supérieure.
  - Ces sommets portent le nom de la veine. Le centre de l'oreillette (déformation du battement) et la fosse restent
    calculés sur l'oreillette seule.
- **Retiré du chargement.**
  - Le comblement calculé dans le navigateur à chaque chargement.
  - La découpe des dômes des veines caves dans le shader.
  - Dans la tranche de la cloison, la correction du sillon. Seul l'endocarde plus fin près de la fosse est gardé.

### Contrôle (Python : numpy, scipy, trimesh — tools/check_model.py)

| Maillage | Ancien → nouveau (sommets) | Arêtes libres | Écart à l'ancien |
|---|---|---|---|
| Enveloppe | 83 522 → 82 271 | 0 | 0,1 % des sommets à plus de 0,5 mm (cloison) |
| Cavités | 68 449 → 73 050 | 0 | 0,00 mm hors des abouchements (ventricules, OG, OD) |
| Lumières, coronaires, piliers | identiques | inchangé | 0,00 mm |

- **Cloison.** Le creux du sillon est présent sur 102 points de la grille autour de la fosse dans l'ancien modèle, sur
  13 dans le nouveau. Le plus proche est à 1,35 cm de la fosse, hors de la zone corrigée.
- **Veines caves.** La cavité se prolonge dans la VCS jusqu'à y = 8,7 et dans la VCI jusqu'à y = −6,3.
- **Taille.** Le fichier fait 5,54 Mo.

## 2. Trous à la base de l'artère pulmonaire (js/heart.js)

- **Cause.** Ils ne venaient pas du modèle. Le shader retire la surface externe dans un cylindre à l'intérieur de la
  racine pulmonaire, pour dégager la vue chirurgicale de la valve pulmonaire (surface repliée entre l'infundibulum et
  l'aorte). Ce cylindre perçait aussi la paroi vue de dehors.
- **Correction.** Le retrait ne se fait plus que lorsque la caméra regarde depuis le tronc pulmonaire, comme pour
  l'aorte.

## 3. Fin de la TAVI (js/app.js, js/heart.js)

- **Cause.** Pendant le retour vers la vue chirurgicale, le plan de coupe pivote. La tranche de paroi qui longe
  l'ouverture « en long » de l'aorte n'était pas coupée par ce plan, pas plus que la gouttière et la face interne de la
  paroi postérieure. Dans la vue de la crosse, elles sont derrière le plan ; quand il pivote, la tranche dessinait une
  bande de paroi en travers de la valve.
- **Correction.** La tranche, la gouttière et la face interne sont coupées par le plan de la vue.
- **Cœur battant.** Pendant ce passage, la coupe suit maintenant la valve qui bat, comme dans les autres vues.
  L'animation se fait à cœur battant depuis la version précédente.
- **Vérifié à cœur arrêté.** Le défaut existait aussi cœur arrêté : il n'était pas dû au battement.

## Vérifications (navigateur sans fenêtre et navigateur intégré)

- **Vue extérieure** : plus de trous à la base de l'AP.
- **Vues FOP** : cloison pleine en coupe, tunnel inchangé (axe à 23° de la veine cave).
- **Fermeture du FOP** : gaine à 23° au plus, disque gauche dans l'OG.
- **VCS vue de l'OD** : tuyau ouvert.
- **Coupe frontale** : normale.
- **TAVI** : vue de la crosse intacte ; en fin de passage vers la vue chirurgicale, la valve est entièrement visible.
- **Erreurs JavaScript** : aucune.

## Captures

| Fichier | Contenu |
|---|---|
| v50-01-ap-trous-avant.jpg | Avant : deux trous à la jonction infundibulum / AP |
| v50-02-ap-trous-corriges.jpg | Après |
| v50-03-cloison-pleine-modele.jpg | Coupe bicave du FOP avec le nouveau modèle |
| v50-04-vcs-ouverte-modele.jpg | Veine cave supérieure vue de l'OD : la cavité se prolonge dans la veine |
| v50-05-tavi-bande-avant.jpg | Avant : bande de paroi en travers de la valve, fin du passage vers la vue chirurgicale |
| v50-06-tavi-valve-visible.jpg | Après : même instant, valve entièrement visible |
| v50-07-fop-gaine-nouveau-modele.jpg | Fermeture du FOP avec le nouveau modèle |
| v50-08-coupe-frontale.jpg | Coupe frontale générale, inchangée |
