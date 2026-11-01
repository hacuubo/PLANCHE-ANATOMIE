# Relecture — Fermeture du FOP : gaine rectiligne, tunnel fin, veines caves creuses (1er novembre 2026)

## Demande

1. De l'entrée dans l'OD à son arrêt dans l'OG, la gaine doit être plus rectiligne : aucun virage de plus de 30°.
2. Le foramen ovale doit être dessiné plus finement, comme sur une coupe anatomique : rabat mince du septum primum
   qui chevauche le septum secundum épais, fente oblique entre les deux. L'aspect précédent était grossier.
3. Dans les vues de l'oreillette droite, les abouchements des veines caves ne doivent pas paraître « pleins » : ils
   doivent évoquer un tuyau vide à l'intérieur de la veine.

## Ce qui n'allait pas

- **Coupe grossière.** Dans le modèle, les parois des deux oreillettes sont séparées par le sillon interauriculaire
  (la surface externe s'enfonce entre elles). En coupe, cela laissait autour de la fosse un creux sombre, où l'on
  voyait de face le rabat et la paroi de la fosse, comme des rectangles roses (capture v48-01).
- **Gaine coudée.** Au débouché du tunnel, l'axe butait sur la paroi de l'OG. Le guide et la gaine tournaient d'environ
  125° pour rejoindre le centre de l'oreillette.

## Ce qui a été fait

1. **Tunnel** (js/heart.js, bloc de la fosse).
   - Fente plate et oblique, d'environ 7 mm de long, 8 mm de large et 2 mm de haut. Elle part du fond de la fosse,
     juste sous le plancher, et débouche dans l'OG.
   - Du côté de l'OG, elle est bordée par le prolongement mince du plancher (septum primum), qui finit en bord libre.
     Du côté de l'OD, elle est bordée par le septum secundum, épais.
   - Son axe est la ligne qui vient de la veine cave inférieure, à 24° de l'axe de la veine. Il est choisi parmi les
     lignes qui passent par la fosse au bord supérieur, avec le plus de place dans l'OG au-delà du débouché.
   - La fente ouvre la paroi de la fosse et l'endocarde de l'OG à son passage, avec la même forme de lentille dans le
     shader. L'ancienne ouverture ronde a été remplacée.
   - Elle s'élargit de moitié quand le matériel la traverse et s'écrase à la fermeture.
2. **Cloison pleine en coupe** (js/heart.js, js/cut-surface.js).
   - Le sillon est comblé par un solide de coupe, relevé entre ses deux faces le long de la normale au septum, sur une
     grille de 0,8 mm, dans un disque de 2,4 cm autour de la fosse.
   - La tranche y est du muscle d'oreillette plein. L'endocarde y est trois fois plus fin : sinon la paroi mince de
     l'OG paraissait pâle sur toute son épaisseur et semblait décollée du disque gauche.
   - Le creux de la fosse suit maintenant le profil de sa paroi, et non plus un cylindre.
3. **Trajet du matériel** (js/pfo-closure.js).
   - Guide et gaine montent la veine cave, s'inclinent une seule fois à sa sortie (24°, arc de 2 cm de rayon), puis
     vont tout droit à travers l'OD, la fosse et le tunnel, jusque dans l'OG.
   - **Plus grand virage de la gaine, mesuré sur 1 cm de long, de la veine cave à son arrêt dans l'OG : 24,2°.**
   - Seul le guide se recourbe dans l'OG, une fois, vers le centre de l'oreillette, avec un bout en J, à 2,2 mm au
     moins des parois.
   - Le disque gauche sort dans l'axe de la gaine puis s'oriente en s'ouvrant, presque parallèle à la cloison.
   - L'arrêt de la gaine (2 mm après le débouché) et l'axe du disque sont choisis pour que le disque ouvert, de 18 mm,
     tienne entièrement dans l'OG : marge de 1,3 mm à plat. Sur cette ligne droite, un disque perpendiculaire à la gaine
     ne tenait nulle part, avec un débord de 2 à 6 mm.
4. **Veines caves creuses** (js/heart.js, js/special-views.js, vues Fosse ovale normale, FOP et Fermeture).
   - Les veines n'ont pas de tranche de sang.
   - L'endocarde de l'OD est ouvert au droit de chaque abouchement. On retire le « dôme » qui fermait la veine : les
     faces tournées dans l'axe de la veine, dans le cylindre de sa lumière. Chaque abouchement est repéré sur le
     maillage simplifié par structure.
   - On voit l'intérieur de la veine, un tuyau vide (capture v48-09). Les coupes ne changent pas.

## Vérifications (navigateur sans fenêtre)

- **Animation complète.** Les neuf étapes ont été capturées. Aucune erreur JavaScript.
- **Coupe frontale générale.** Elle est inchangée hors de la rubrique FOP : sang dans les veines, cloison normale.
- **Fin de l'animation.** Les deux disques sont plaqués de part et d'autre de la cloison, vérifié par des repères au
  milieu du tunnel et sur chaque face.
- **Trait rouge près de la VCI.** Il était déjà présent avant ces changements : c'est la tranche d'une artère coupée.
- **Préparation de la fermeture.** Environ 0,74 s, contre 0,43 s auparavant, à cause de la recherche de l'axe du
  disque. Elle se fait toujours pendant la première image de la planche.

## Captures

| Fichier | Contenu |
|---|---|
| v48-01-fop-avant-tunnel-grossier.jpg | Avant : creux du sillon, rabat et paroi vus de face |
| v48-02-fop-apres-cloison-pleine.jpg | Après : cloison pleine, fente oblique, rabat mince au-dessus |
| v48-03-fop-gros-plan-noms.jpg | Premier plan de l'animation, avec les noms |
| v48-04-test-aux-bulles.jpg | Test aux bulles par le nouveau tunnel |
| v48-05-guide-droit.jpg | Guide droit de la veine cave à l'OG |
| v48-06-gaine-droite-dans-og.jpg | Gaine droite, arrêtée dans l'OG |
| v48-07-disque-gauche-dans-og.jpg | Disque gauche ouvert dans l'OG |
| v48-08-fop-ferme.jpg | FOP fermé, cœur qui bat |
| v48-09-veine-cave-sup-creuse.jpg | Veine cave supérieure vue de l'OD : tuyau creux |
