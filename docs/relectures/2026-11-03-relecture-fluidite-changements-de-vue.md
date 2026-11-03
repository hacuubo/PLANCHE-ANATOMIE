# Relecture — Fluidité des changements de vue (3 novembre 2026)

## Demande

Le passage d'une rubrique à l'autre (valves, FOP, coronaires, stimulation…) est lent et saccadé quand on montre le
site aux patients. Rendre le site en ligne plus fluide.

## Diagnostic (PC portable, carte graphique Intel UHD 620, fenêtre 1280 × 800)

| Mesure | Résultat |
|---|---|
| Réseau (cardioexplain.com) | modèle compressé : 2,4 Mo en 0,15 s ; pas en cause |
| Une image du cœur, pleine résolution | ≈ 75 à 85 ms (≈ 12 images/s), coût de la carte graphique |
| Pendant une transition entre deux valves | 10 à 11 images/s |
| Première ouverture de la valve aortique | 23 programmes de la carte graphique compilés, image figée 0,88 s |
| Durée d'une transition | 3,6 s, voulue (zoom ralenti pour que le patient suive) |

Le temps se perd sur l'appareil : rendu lourd (matières de tissu, transparences, ombres) et compilation des programmes
de la carte graphique la première fois qu'une rubrique s'affiche.

## Ce qui a été fait (js/app.js)

1. **Qualité adaptative en permanence** (`adaptQuality`). Avant : seulement pendant les animations, jamais sous 1 pixel
   par point. Maintenant :
   - en mouvement (transitions, animations, cœur que l'on fait tourner) : jusqu'à 0,65 pixel par point ;
   - cœur qui bat, caméra immobile : jusqu'à 0,8 ;
   - cœur arrêté et immobile : pleine qualité ;
   - la résolution remonte d'un palier quand l'appareil suit (moins de 19 ms pendant 3 s) ; un palier intenable n'est
     pas retenté avant 30 s ;
   - le niveau « en mouvement » part au moins du niveau « cœur qui bat » : la première transition ne repart pas de la
     pleine résolution.
2. **Programmes précompilés en arrière-plan** (`prewarm`), peu après le chargement : toute la scène, objets cachés
   compris, en version cœur entier et coupe plane, compilée en parallèle par la carte graphique sans bloquer
   l'affichage.

## Mesures après (même PC)

| Mesure | Avant | Après |
|---|---|---|
| Images/s pendant une transition | 10 à 11 | 15 à 23 |
| Cœur qui bat, vue de départ | ≈ 12 | ≈ 20 à 30 |
| Image figée à la première ouverture de la valve aortique | 0,88 s | 0,28 s (2 programmes d'ombres restants) |
| Programmes compilés à l'ouverture des autres rubriques et variantes | jusqu'à 23 | 0 |

- Pendant le mouvement, l'image est un peu moins nette ; elle redevient nette dès l'arrêt.
- Erreurs JavaScript : aucune.

## Non modifié

La durée des transitions (×2, « zoom lent ») : c'est un choix de présentation, à raccourcir seulement si on le
souhaite.
