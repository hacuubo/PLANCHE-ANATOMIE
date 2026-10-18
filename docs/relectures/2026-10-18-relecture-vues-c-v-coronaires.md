# Relecture — vues C/V des valves, valve aortique, sinus coronaire, coronaires, simplification (18 octobre 2026)

Relecture indépendante du code (three.js) et recherche bibliographique indépendante. Captures : `captures/v23-*.jpg`.

## Demande

1. Corriger les fragments au bord de l'anneau tricuspide et l'anneau bleu du sinus coronaire.
2. Pour chaque valve, une vue intraventriculaire opposée à la vue chirurgicale : choix « C » / « V ».
3. Valve aortique, vue chirurgicale : les cuspides disparaissent en systole et le ventricule ne se voit pas à travers
   la valve.
4. Supprimer « Circulation ».
5. Supprimer les coupes « 4 valves », « Vue chirurgien » et « Horizontale ».
6. Trop de « vide » au contact des coronaires, notamment de l'IVA.
7. Toutes les modifications avec un appui scientifique.

## Appui scientifique

- **Orientation des vues de face** (EAE/ASE, Lang 2012, *Eur Heart J Cardiovasc Imaging* 13:1) : mitrale, aorte à
  12 h quelle que soit la perspective (oreillette ou ventricule) ; tricuspide, feuillet septal à 6 h des deux côtés ;
  aortique, cuspide coronaire droite à 6 h, côté aorte comme côté chambre de chasse. La perspective ventriculaire
  montre les cordages des trois ordres et la face ventriculaire des feuillets.
- **Valve aortique ouverte** : au maximum d'ouverture, la surface délimitée par les bords libres est 41,5 ± 5,5 % plus
  petite que celle de l'anneau (Lansac 2019, sonomicrométrie) ; les sinus de Valsalva permettent l'ouverture complète
  sans que la cuspide touche la paroi (tourbillons des sinus, Bellhouse et Talbot 1969). Aucune mesure directe de
  l'écart cuspide-paroi n'a été trouvée : écart prudent de ≈ 3 mm.
- **Feuillets auriculo-ventriculaires en diastole** : orifice mitral de 4 à 6 cm² pour un anneau de 7 à 10 cm² ; anneau
  tricuspide de 8,6 ± 2 cm² en fin de diastole : les feuillets ouverts forment un entonnoir, sans ventre au-delà de
  l'anneau.
- **Sinus coronaire** : orifice de 8,1 ± 1,5 × 7,7 ± 1,7 mm (100 cœurs), entre l'orifice de la veine cave inférieure
  et l'anneau tricuspide (base du triangle de Koch) ; valvule de Thébésius présente dans 86 % des cœurs.
- **Coronaires** : troncs sous l'épicarde dans les sillons interventriculaire et auriculo-ventriculaire ; graisse
  au-dessus de l'IVA de 5 à 7 mm en scanner ; débarrassé de sa graisse, un cœur normal montre des artères au ras de la
  surface. Ponts myocardiques (IVA surtout) : 22 % en scanner, d'où des segments brièvement recouverts.

## Ce qui a été fait

1. **Fragments tricuspides** : c'était la base des feuillets aperçue sous un rebord crénelé du plancher de l'oreillette.
   L'orifice creusé entre oreillette et ventricule (cylindre de 0,85 fois le rayon de l'anneau) était plus étroit que
   l'anneau sur le versant septal. Il suit désormais l'ellipse et la selle de l'anneau (0,5 mm en dedans), la lame de
   jonction a une épaisseur constante de 3 mm, et le nœud AV, qui affleurait dans l'orifice élargi, est maintenu sous
   l'endocarde. Les feuillets ouverts n'ont plus de ventre au-delà de l'anneau (entonnoir). Capture v23-04.
   Avec l'orifice élargi, le plancher restait percé par endroits sous la mitrale ouverte (peau trop mince entre
   oreillette et ventricule) : la lame de jonction fait désormais tout le tour des deux anneaux, au moins 4 mm de
   large, comme l'anneau fibreux auquel s'attachent les feuillets. Aux commissures mitrales, le fond de l'oreillette
   BodyParts3D restait plus de 6 mm au-dessus de l'anneau : une pellicule percée recouvrait le bord des feuillets.
   L'orifice se prolonge maintenant côté oreillette jusqu'à 2,2 cm en cône (le vestibule qui s'évase au-dessus de
   l'anneau). Captures v23-05 et v23-06.
2. **Sinus coronaire** : la partie de la pièce BodyParts3D située dans l'oreillette droite est masquée au pixel près ;
   à sa place, un orifice de 8 mm bordé de la valvule de Thébésius, posé sur l'endocarde. Capture v23-04.
3. **Vues C / V** (js/av-views.js, js/aortic-view.js, js/app.js) : V coupe le cœur à mi-ventricule (mitrale,
   tricuspide) ou dans la chambre de chasse (aortique) et regarde vers l'oreillette ou l'aorte ; mêmes orientations que
   la vue C (image en miroir), passage de l'une à l'autre en tournant autour de la valve. Captures v23-05 à v23-15 ; coupe frontale v23-16.
4. **Valve aortique** : la lumière artérielle se fermait juste à la base des cuspides et cachait le ventricule ; ce fond
   est retiré. Ouvertes, les cuspides gardent leur bord libre à 0,76 rayon (au lieu de se plaquer contre la paroi),
   ventre à peine bombé ; intima de la racine plus rosée pour que les cuspides crème s'en détachent. Orientation ASE
   (cuspide coronaire droite à 6 h). Vue V : coupe 1 cm sous la valve, dans la chambre de chasse, au-dessus des
   piliers. Un disque rose uni y masquait une partie des cuspides : le maillage des cavités était ouvert au bord de sa
   boîte d'extraction (oreillette droite, vers la veine cave supérieure), si bien que le comptage du stencil prenait
   pour du muscle le sang vu à travers cette ouverture. Les cavités sont maintenant fermées au bord de la boîte ; le
   compteur du stencil part de 128 et la tranche n'est posée que si le compte est positif (deux creux qui se
   chevauchent, cavité et lumière aortique, ne font plus apparaître de muscle).
5. **Circulation** et **coupes 4 valves, vue chirurgien, horizontale** supprimées (interface, code, styles, trajets
   du sang du générateur). Restent les coupes 5 cavités et frontale ; les vues de face des valves passent par
   « Valves ».
6. **Vide autour des coronaires** : la cause principale était le champ de distance réunissant tous les vaisseaux, dont
   le signe vient d'un remplissage de voxels de 2,5 mm : les poches fermées entre l'IVA, sa veine et la diagonale y
   étaient classées « dans un vaisseau » et creusées, laissant les vaisseaux en l'air au-dessus d'une gorge de 6 à
   10 mm. Le sillon est maintenant calculé avec la distance non signée, évasé (demi-largeur r + h/2, pas de fente sous
   l'équateur du vaisseau), et l'union des distances aux deux ventricules est plus douce (sillon interventriculaire
   moins creux). Mesuré au générateur (`--profil`) puis vérifié à l'écran : captures v23-01 (avant) et v23-02 (après).

## Code (relecteur)

**Bloquant**
1. Version du service worker inchangée : les applications installées auraient gardé l'ancienne interface → **Corrigé**.
2. Modèle à régénérer pour que le sillon évasé prenne effet → **Fait** (plusieurs reconstructions, voir ci-dessus).

**Important**
3. Orifice du sinus visible avec les coronaires masquées, ou hors coupe → **Corrigé** (visible avec la coupe et les
   coronaires).

**Mineur** : seuil commun entre le shader et le placement de l'orifice, lecture hors carte sans découpe, orifice posé
au-dessus de l'endocarde, pas d'ombre de la partie masquée, code mort et commentaires obsolètes de la circulation,
passe du calque d'interface sautée quand il est vide → **Corrigés**. Non retenus : le côté C/V reste celui choisi
d'une valve à l'autre (voulu) ; les poses des racines aortique et pulmonaire en systole restent calculées sur la
position de repos pour l'ouverture de la tranche (écart sans effet visible).

## Vérification

Modèle régénéré (9,6 Mo ; paroi VG médiane 8,1 mm, VD 2,9 mm). Vues C et V des trois valves, fermées et ouvertes ;
coupe frontale ; coupe 5 cavités (tranche courbe, avec le nouveau compteur du stencil) ; face antérieure (IVA) ;
console sans erreur. Maillage des cavités contrôlé fermé (aucune arête libre). Rendu d'une image : 4 à 6 ms.
