# Relecture — TAVI en transparence, gaine du pacemaker rigide (1er novembre 2026)

Captures : `captures/v39-*.jpg`.

## Demande

1. **TAVI.**
   - Des coupes nettes au niveau de l'aorte, sans les irrégularités de la version précédente.
   - Ne pas changer la coupe : mettre seulement en transparence l'artère pulmonaire et la partie antérieure de l'aorte
     thoracique, pour voir cheminer le guide.
2. **Pacemaker.** La gaine n'est pas souple. Seule la sonde prend la forme du passage par la tricuspide, une fois la
   gaine retirée.

## Ce qui a été fait

1. **TAVI** (js/heart.js, `buildTaviMask`, `addTaviMask`).
   - **La coupe est celle d'avant.**
     - Mêmes solides et mêmes tranches : la crosse et la racine sont coupées net, comme dans l'animation d'origine.
     - L'aorte n'est plus ouverte par un retrait de sa moitié avant.
   - **Transparence.**
     - L'artère pulmonaire, et la paroi antérieure de l'aorte thoracique au-delà de l'aorte ascendante, sont dessinées
       en voile clair (opacité 0,24) au lieu du tissu opaque.
     - On voit à travers le guide, puis le cathéter et la valve sertie, dès l'aorte descendante, et l'intima de la
       paroi postérieure.
     - La tranche de l'artère pulmonaire est écartée, transparente elle aussi. Les autres tranches ne changent pas.
   - **Limites nettes.**
     - Le champ en volume (voxels de 1,5 mm) garde, pour chaque vaisseau, une marge signée : l'écart entre la distance
       à sa lumière et la distance à la plus proche autre lumière ou cavité, et, pour l'aorte, la position devant sa
       ligne centrale.
     - Interpolée entre voxels, la limite est lisse (bissectrice entre deux lumières, plan de la ligne centrale) au lieu
       des marches d'escalier de la version précédente.
2. **Pacemaker** (js/pacing-anim.js).
   - **La gaine est rigide.** Elle garde sa forme préformée. Elle ne suit que le déplacement de son bout contre le
     septum, réparti le long de la gaine (rien à l'entrée de la veine cave). La sonde qu'elle contient suit la gaine.
   - **La sonde est souple.**
     - Au-delà du bout de la gaine, elle suit le battement point par point.
     - Pendant le retrait de la gaine, elle est libérée du bout vers l'arrière. Elle passe alors sur son propre trajet :
       une légère réserve dans l'oreillette, le centre de la tricuspide, une courbe douce dans le ventricule droit,
       jusqu'au même point d'ancrage, perpendiculaire au septum.
   - Le manchon, la vis et l'électrode annulaire sont posés d'après l'axe de la sonde ainsi calculé.

## Vérification (navigateur sans fenêtre, 1100 × 700)

- **TAVI** :
  - le guide dans la crosse et l'aorte descendante transparente (v39-01) ;
  - le cathéter et la valve sertie dans l'aorte descendante (v39-02) ;
  - tranches de la crosse et de la racine identiques à la coupe d'origine ;
  - fin en écran partagé avant / après, inchangée.
- **Pacemaker** :
  - gaine en place pendant le vissage (v39-03) ;
  - gaine en retrait dans l'oreillette, sonde déjà sur son propre trajet dans le ventricule (v39-04) ;
  - sonde libre (v39-05).
- **Erreurs JavaScript** : aucune.
