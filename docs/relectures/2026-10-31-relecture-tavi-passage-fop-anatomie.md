# Relecture — TAVI : passage continu vers la vue chirurgicale ; FOP : anatomie et fermeture (31 octobre 2026)

Captures : `captures/v36-*.jpg`.

## Demande

1. Animation de la TAVI : après le déploiement, partir de la même image et aller vers la vue chirurgicale
   progressivement, sans coupure.
2. Fermeture du FOP : être plus précis anatomiquement. Le disque gauche se déployait au-delà des limites de
   l'oreillette gauche, ce qui n'est pas valide. Mieux représenter le FOP et son tunnel, pour faire comprendre la
   fermeture.

## TAVI : passage continu (js/app.js, `taviToSurgical` ; js/tavi-anim.js)

- **Avant** : un changement direct de vue, avec un bref fondu.
- **Maintenant** :
  - la caméra tourne de la vue de la crosse vers la vue chirurgicale, en ≈ 3,8 s ;
  - le plan de coupe tourne avec elle, toujours face au regard et juste devant la valve. Sa distance à la valve va de
    0 (coupe de la crosse, qui passe par la valve) à 1,35 cm (coupe chirurgicale, au-dessus des cuspides) ;
  - la valve reste dégagée tout du long, pendant que le ventricule et l'aorte ouverts se referment.
- **Charnière écartée** : une première version faisait pivoter le plan autour de la droite commune aux deux coupes,
  au-dessus de la valve. À mi-parcours, la valve passait derrière du tissu.
- **Prothèse** : celle de l'animation reste à l'image jusqu'à l'arrivée (`held`). La valve finale, de même forme,
  prend alors sa place (`release`), puis le cœur se remet à battre.
- **Captures** : v36-01 → v36-04.

## FOP : anatomie (js/heart.js)

**Ancienne représentation.** Un tube rond oblique à travers la cloison, peu lisible en coupe.

**Nouvelle représentation** (Goel 2009 ; Hara 2005) :

- **Septum primum** : le plancher de la fosse se prolonge côté OG en un **rabat** mince (≈ 0,8 mm, pâle). Il chevauche
  le **septum secundum** (limbe) au-delà du bord supérieur de la fosse, sans y être soudé.
- **Tunnel** : entre les deux, une **fente plate**, d'≈ 12 mm de long, ≈ 9 mm de large et ≈ 2,4 mm de haut.
  - Elle s'ouvre dans l'OD par la fosse, et dans l'OG au bord libre du rabat (trou dans l'endocarde de l'OG).
  - Elle suit l'axe des veines caves (bord supérieur de la fosse, vers la VCS) : elle est dans le plan de la coupe
    bicave, qui la montre dans toute sa longueur, comme en ETO.
  - La première version, orientée en avant (antéro-supérieure), sortait du plan de coupe : on la voyait en perspective,
    à côté de la tranche.
- **En coupe**, de l'OD à l'OG : le limbe, la fente, le rabat.
  - Fente et rabat sont des volumes creux : il n'y a pas de tranche de muscle à leur place.
  - Leurs faces ont été orientées vers l'extérieur : sinon le rendu des coupes les ignorait.
  - Les niveaux sont mesurés sur l'endocarde de l'OG.
- **Fermeture** : la fente s'écrase progressivement, le rabat pris contre le limbe (`setPFOClosure`, de 0 à 1). Le trou
  dans l'OG se referme.
- **Noms** : septum primum (rabat), septum secundum (limbe), tunnel du FOP.
  - Ils s'affichent avec le bouton Repères, et d'office pendant la première étape de l'animation.
  - L'ancienne étiquette « FOP » est remplacée par « Tunnel du FOP ».
- **Captures** : v36-06 → v36-08.

## FOP : fermeture (js/pfo-closure.js)

**Défaut mesuré.**

- Le disque gauche s'ouvrait à moins d'1 mm de la paroi de l'OG, la moitié de son bord jusqu'à 7 mm hors de la
  cavité (v36-05).
- L'ancien point d'ouverture était fixe, au-delà du débouché du tunnel.

**Corrections :**

1. **Point d'ouverture du disque gauche choisi par calcul.**
   - Une recherche sur une grille de points au-delà du débouché du tunnel retient celui où le disque ouvert (18 mm, dans
     l'axe de la gaine) a la plus grande marge.
   - Cette marge est la distance signée à l'endocarde de l'OG (positive dans la cavité).
   - Marge obtenue : 2,1 mm au bord du disque ouvert. Elle reste positive pendant toute la traction (v36-09).
2. **Trajet de la gaine.**
   - Veine cave inférieure, OD, abord de la fosse par en dessous, tunnel, OG.
   - Elle reste dans les cavités, sauf dans le tunnel.
3. **Disques conformés à la cloison** quand ils s'y appliquent, comme le treillis souple d'une vraie prothèse.
   - La cloison n'est pas plane : côté OD, elle bombe en avant de la fosse. Un disque droit plat y entrait jusqu'à
     4,8 mm.
   - Leurs points reculent le long de leur axe là où la cloison avance. Le recul est mesuré sur leurs sommets en
     3 passes, et plafonné à 3,5 mm.
   - Résultat : le disque gauche ne pénètre plus (+0,3 mm) ; le disque droit forme une légère cuvette et pénètre de
     0,9 mm au plus.
   - Sans plafond, des passes répétées le creusaient en entonnoir.
4. **Étapes (7).**
   - Nouvelle première étape : le FOP en gros plan, avec ses noms.
   - La fente s'écrase pendant l'application du disque droit.
   - Le dernier plan est rapproché sur la prothèse (vue « Fermeture du FOP » à 10 cm au lieu de 13).
5. **Défaut corrigé au passage.** Pour les étiquettes masquées, `syncMarks` donnait `undefined` au lieu de `false`, ce
   qui laissait des étiquettes affichées (« Oreillette droite », « Oreillette gauche »). three.js ne masque une
   étiquette que si sa visibilité vaut exactement `false`.

**Captures** : v36-09, v36-10 (fin, test aux bulles négatif), v36-11 (téléphone).

## Vérification

- **Marges anatomiques** mesurées à chaque étape (distance signée aux oreillettes) :
  - disque gauche : ouvert, il est dans l'OG ; appliqué, il est sur la cloison ;
  - disque droit : appliqué, il pénètre de 0,9 mm au plus ;
  - gaine : dans les cavités.
- **Passage TAVI** : capturé à intervalles réguliers. La prothèse est à l'image tout du long. À la fin : vue
  chirurgicale, valve finale, aorte refermée, battement.
- **Ensemble** :
  - vues FOP : test aux bulles, fosse normale ;
  - arrêt et relance des deux animations ;
  - lien direct `?valve=fermeture` ;
  - téléphone.
- **Erreurs JavaScript.** Aucune.
