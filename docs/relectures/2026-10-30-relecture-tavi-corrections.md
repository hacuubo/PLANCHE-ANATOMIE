# Relecture — corrections de l'animation TAVI (30 octobre 2026)

Captures : `captures/v33-*.jpg`.

## Demande

1. Le guide qui franchit la valve reste dans le VG : il ne traverse pas le septum.
2. La bioprothèse ne pivote pas avant le déploiement : elle est déjà sertie sur le guide dans le bon sens.
3. Pas de recul de la caméra hors du cœur après le déploiement : on reste sur la vue, puis on passe directement à la
   vue aortique chirurgicale en fin de procédure pour contempler le résultat.

## Causes

1. **Guide et septum.**
   - Le trajet ventriculaire allait en ligne droite du centre de la valve vers la pointe épicardique.
   - Sa boucle finale sortait de la cavité.
   - Surtout, tout ce segment était dans la moitié du VG retirée par la coupe de la vue L. Le matériel n'est pas
     coupé : il se dessinait devant la tranche du septum et semblait le traverser.
2. **Pivot.**
   - La valve sertie était orientée selon le sens de progression, donc tête-bêche : sortie vers le ventricule.
   - Pendant le centrage, elle était ramenée à sa pose finale, soit un retournement de 180°.
3. **Recul.**
   - Le cadrage reculait à 20 cm pour les retraits.
   - La transition de la vue L à la vue chirurgicale passait en plus par un plan intermédiaire à près de 2 fois la
     distance de la vue L.

## Corrections

1. **Trajet dans le VG** (js/aortic-view.js, `aorticPath`) :
   - ligne centrale de la cavité (barycentres de tranches de l'endocarde du VG le long de son axe), placée 3,5 mm
     derrière le plan de coupe, dans la moitié gardée ;
   - chaque point est recentré grâce à la distance signée à l'endocarde : positive dans la cavité, négative au-delà
     de la paroi. Un point tombé dans le septum ou le VD revient donc dans le VG ;
   - la boucle en « queue de cochon » est de face. Son côté et sa taille (6 à 3,5 mm de rayon) sont choisis pour
     rester le plus loin possible des parois ;
   - ce calcul ne se fait qu'au premier lancement de l'animation, pas au démarrage de l'application.
2. **Valve sertie dans son sens final** (js/tavi-anim.js) :
   - entrée vers le ventricule, sortie vers l'aorte, dès la montée dans l'aorte descendante ;
   - son orientation est transportée le long du guide, sans torsion, depuis sa pose sur l'anneau. Elle arrive donc sur
     l'anneau sans pivoter ;
   - le ballonnet et le cône gardent leur axe le long du guide.
3. **Caméra** :
   - le plan rapproché sur la valve reste du centrage jusqu'au retrait du guide ;
   - à la fin, passage direct à la vue chirurgicale avec un bref fondu, sans transition par l'extérieur du cœur
     (`setValveSide(side, direct)` dans js/app.js).

## Vérification

- **Trajet.** Test d'appartenance à la cavité du VG (rayons) sur 200 points du trajet : tout le segment ventriculaire
  est dans le VG et derrière le plan de coupe. Il passe à 3,5 mm ou plus des parois, sauf au franchissement de
  l'anneau et sur le bas de la boucle (≈ 1 à 2 mm de l'endocarde trabéculé).
- **Captures.**
  - v33-01 : le guide dans le VG ;
  - v33-02 et v33-03 : montée puis centrage, sans pivot ;
  - v33-04 : retrait du guide en plan serré ;
  - v33-05 : vue chirurgicale finale ;
  - v33-06 : téléphone.
- **Erreurs JavaScript.** Aucune sur toute la séquence, la relance et l'arrêt par changement de variante.
