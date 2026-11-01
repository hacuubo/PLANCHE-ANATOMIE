# Relecture — Fluidité des animations (1er novembre 2026)

## Demande

Gagner en fluidité pendant la lecture des animations. Les cinq pistes proposées sont retenues :
1. calcul du masque de la TAVI en arrière-plan ;
2. préparation de chaque animation pendant la partie 1 ;
3. qualité adaptative ;
4. planche plus légère ;
5. petits gains.

## Mesures avant (navigateur sans fenêtre, rendu logiciel, plus lent qu'un vrai écran)

| Étape | Coût |
|---|---|
| Préparation de la TAVI, en un bloc au passage en 3D (dont 11 à 19 s pour le champ en volume) | 11,5 à 20 s |
| Plus longue image mesurée pendant la TAVI | 4,6 s |
| Préparation de la fermeture du FOP, au passage en 3D | ≈ 0,9 s |
| Mise à jour des animations à chaque image | < 0,1 ms |

Le reste du temps va au rendu par la carte graphique.

## Ce qui a été fait

1. **Champ de la TAVI dans un worker** (js/tavi-mask-core.js, js/tavi-mask-worker.js).
   - Le calcul est réécrit en JavaScript pur, sans three.js, pour tourner hors du fil principal : un million de voxels,
     distances par chanfrein, ligne centrale, gouttière.
   - Il est lancé peu après le chargement, quand le navigateur est libre, et revient par transfert, sans copie.
   - À défaut de worker, il se fait sur place.
2. **Préparation pendant la partie 1** (js/app.js, `playIntro` ; `prepare()` de chaque animation).
   - Le matériel de l'animation se construit au début du trajet, la planche restant un instant sur sa première image
     immobile.
   - Pour la TAVI, cette construction attend la fin du calcul du champ. Si le calcul n'est pas fini, la planche démarre
     tout de suite et le relais l'attend, le dispositif restant à l'abord du cœur.
   - Le passage en 3D n'a plus rien à construire.
3. **Qualité adaptative** (js/app.js, `adaptQuality`).
   - Pendant une animation, si les images dépassent 22 ms en moyenne, la résolution du rendu baisse par paliers :
     2 → 1,5 → 1,25 → 1 pixel par point, avec une seconde de mesure entre deux paliers.
   - Les ombres se recalculent alors deux fois moins souvent.
   - La pleine qualité revient dès la fin de l'animation.
4. **Planche** (js/route-intro.js).
   - Les images sont dans des calques HTML à leur taille d'origine, déplacés et mis à l'échelle par une transformation
     que la carte graphique applique sans redessiner l'image : le navigateur ne redimensionne plus 1,4 Mo d'image à
     chaque instant du zoom.
   - Sur téléphone, une image du tronc plus légère (22 px/cm, 713 Ko au lieu de 1,4 Mo).
5. **Petits gains.**
   - La scène 3D n'est pas dessinée tant que la planche la recouvre entièrement.
   - Fermeture du FOP : la recherche des distances aux parois des oreillettes passe par une grille de cases de 4 mm
     (préparation 0,76 → 0,43 s, mêmes résultats).

## Mesures après (même navigateur)

| Mesure | Avant | Après |
|---|---|---|
| Plus longue image, TAVI | 4,6 s (et 11 à 20 s de calcul d'un bloc) | ≈ 0,5 s |
| Plus longue image, FOP | ≈ 0,9 s, au passage en 3D | 0,43 s, sur la première image immobile de la planche |
| Plus longue image, pacemaker | — | ≈ 0,2 s |

- **TAVI.** Les images d'environ 0,5 s qui restent correspondent à la première mise en place du matériel et à la
  première compilation de quelques matières. Elles sont gonflées par le rendu logiciel ; sur un vrai écran, elles sont
  bien plus courtes.
- **Qualité adaptative**, vérifiée sur un écran simulé à 2 pixels par point : paliers 2 → 1,5 → 1,25 → 1 pendant
  l'animation, retour à 2 à la fin.
- **Planche** : calques calés sous le tracé du guide ; image légère choisie sur téléphone.
- **Résultats inchangés** : trajets et marges de la fermeture du FOP identiques. Guide à 1,5 mm des parois, disque
  gauche à 2 mm.
- **Erreurs JavaScript** : aucune.
