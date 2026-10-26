# Relecture — repère des valves, variantes à la demande, retrait du TAVI (26 octobre 2026)

Captures : `captures/v30-*.jpg`.

## Demandes

1. Construire les variantes des valves à la demande, pour alléger le démarrage.
2. Retirer la variante TAVI de la valve aortique.
3. Dans chaque vue de valve, une petite coupe fixe en haut à droite où la valve est entourée, pour situer.

## Ce qui a été fait

1. **Variantes à la demande** (js/aortic-view.js, js/av-views.js) : chaque variante est une fonction qui fabrique sa
   valve à la première demande (choix de la variante, écran partagé). Avant, toutes étaient construites au démarrage.
   - Coûts mesurés sur ordinateur (headless) :

     | Variante | Coût |
     | --- | --- |
     | Rétrécissement aortique serré | 157 ms |
     | Bicuspidie | 37 ms |
     | Insuffisance aortique | 33 ms |
     | Rétrécissement mitral | 30 ms |
     | Rétrécissement pulmonaire | 29 ms |
     | Prolapsus P2 | 22 ms |
     | Anneau tricuspide dilaté | 13 ms |

   - Gain au démarrage : ≈ 0,32 s, plus le TAVI, soit trois à quatre fois plus sur un téléphone.
   - En contrepartie, le premier choix d'une variante coûte ce temps une seule fois. Je n'ai pas ajouté de construction
     en tâche de fond : le rétrécissement serré (0,16 s) aurait provoqué un à-coup pendant l'animation.
2. **TAVI retiré** : la variante, son armature métallique, sa jupe et les cuspides natives plaquées (avec les options
   de cuspide qui ne servaient qu'à elle : rayon d'attache, hauteurs, cuspide plaquée), ainsi que le matériau
   « métal ». Un ancien lien `variante=tavi` ouvre la valve normale.
3. **Repère** (js/app.js, `assets/reperes`) : un encart montre une coupe fixe du cœur où la valve regardée est
   entourée d'un cercle.
   - **Coupes** :
     - mitrale et tricuspide : coupe 4 cavités (v30-01, v30-02) ;
     - aortique : coupe 5 cavités, qui passe par la chambre de chasse et la valve aortique (v30-03) ;
     - pulmonaire : elle n'est dans aucune des coupes 4 ou 5 cavités, d'où une coupe frontale avancée de 2 cm, qui
       passe par la voie d'éjection du VD et le tronc pulmonaire (v30-04).
   - **Images** : pré-rendues depuis l'application elle-même (même rendu, cœur en diastole), JPEG de 360 × 270
     (≈ 12 Ko). Elles ne coûtent rien à l'affichage, contrairement à une seconde vue 3D en direct, et sont gardées
     hors ligne par le service worker.
   - **Cercle** : centre de la valve projeté par la caméra de la coupe, rayon égal à 1,45 fois celui de l'anneau.
   - **Placement** :
     - sur ordinateur : en haut à droite, sous le panneau des réglages, au-dessus de la légende du Doppler ;
     - sur téléphone : en bas à gauche, la légende du Doppler en bas à droite (v30-05) ;
     - masqué en écran partagé (deux vues côte à côte) et dans les rubriques FOP et Coronaires.

## Vérification

- Les quatre valves, avec et sans Doppler.
- Écran partagé.
- Fosse ovale (pas d'encart).
- Toutes les variantes construites à la demande (bicuspidie, rétrécissement serré, prolapsus…), y compris en écran
  partagé.
- Écran de téléphone.
- Console sans erreur.
