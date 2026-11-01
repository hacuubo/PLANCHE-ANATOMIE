# Relecture — Trajet court, cœur du modèle sur la planche (1er novembre 2026)

Captures : `captures/v43-*.jpg`.

## Demande

1. **Durée.** L'animation 1 (trajet) ne dure que 4 à 5 s et s'arrête à l'abord du cœur. On passe à l'animation 2 :
   - TAVI : à l'aorte thoracique descendante ;
   - FOP : à la veine cave inférieure, au niveau hépatique ;
   - pacemaker : à la veine cave supérieure.
2. **Relais.** Le changement de vue est automatique, sans accroc.
3. **Cœur du modèle.** Sur la vue du corps entier, la forme du cœur est celle du modèle, et les vaisseaux fusionnent avec
   l'image du modèle.

## Ce qui a été fait

1. **Cœur du modèle** (js/app.js, `heartPlate`).
   - **Le rendu.**
     - Rendu de face sans perspective, cœur au repos, sans coupe.
     - À l'échelle de la planche : 5,45 unités par cm, un point du modèle (x, y) est en (200 + 5,45·x, 252,9 − 5,45·y).
   - **Les teintes.**
     - Une seconde passe repère les gros vaisseaux. L'aorte et les branches de la crosse sont teintées en rouge, les
       veines caves en bleu, en gardant l'ombrage.
     - Comme sur les planches, les artères pulmonaires sont en bleu et les veines pulmonaires en rouge.
   - **Les extrémités.** Celles des gros vaisseaux du modèle sont mesurées : point, direction et rayon pour l'aorte
     descendante, les veines caves, le tronc brachiocéphalique (carotide et sous-clavière droites), la carotide et la
     sous-clavière gauches.
2. **Raccords** (js/route-intro.js).
   - Les vaisseaux de la planche partent de ces extrémités, avec leur calibre, et passent sous l'image : aorte
     abdominale, veine cave inférieure, carotides, sous-clavières.
   - Les troncs veineux brachiocéphaliques rejoignent la veine cave supérieure du modèle.
   - Les gros vaisseaux de la planche sont élargis à des calibres réels (aorte abdominale ≈ 1,8 cm, veine cave
     inférieure ≈ 2 cm, iliaques).
3. **Trajet court.**
   - Durée : ponction 0,9 s, puis remontée de 3,2 s (TAVI), 2,9 s (FOP) ou 2,8 s (pacemaker), puis fondu de 0,55 s.
   - La vue suit le dispositif, du corps entier jusqu'à l'abord du cœur. Le dispositif s'arrête :
     - TAVI : 1,6 cm dans l'aorte thoracique descendante du modèle ;
     - FOP : dans la veine cave inférieure, sous l'oreillette (niveau du foie) ;
     - pacemaker : dans la veine cave supérieure.
4. **Relais sans accroc** (js/app.js, `fromPlate`, `procCam`).
   - **La caméra 3D se pose sur la planche.** Vue de face, même centre, même échelle, décalage des vues des valves
     compris. La coupe est repoussée hors du cœur, qui apparaît entier comme sur la planche (v43-03, planche à demi
     transparente sur la 3D).
   - **Fondu.** La deuxième partie démarre dessous et la planche s'efface en fondu.
   - **Vers la vue de l'animation.** La caméra glisse en 1,7 s vers la vue de l'animation, la coupe entrant en même
     temps depuis l'extérieur du cœur.
   - **TAVI.** Passage direct au plan de la crosse, sans arrêt de 2 s sur la valve malade (la légende la présente
     d'abord). Le guide entre par l'aorte descendante.

## Vérification (navigateur sans fenêtre, 1400 × 900)

- **TAVI** : le cœur du modèle sur la planche (v43-01), le guide dans l'aorte thoracique descendante (v43-02), puis le
  relais aligné sur la 3D (v43-03).
- **FOP** : la gaine dans la veine cave inférieure (v43-04).
- **Pacemaker** : la gaine dans la veine sous-clavière gauche, au-dessus du cœur du modèle (v43-05).
- **Suite, en temps réel** : la coupe 4 cavités du pacemaker et la coupe bicave du FOP prennent la suite (v43-06).
- **Durée mesurée en temps réel** : ≈ 4,5 s (pacemaker), sur un navigateur sans fenêtre plus lent qu'un écran réel.
- **Erreurs JavaScript** : aucune.
