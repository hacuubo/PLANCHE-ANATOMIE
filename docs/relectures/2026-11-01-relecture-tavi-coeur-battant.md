# Relecture — TAVI à cœur battant (1er novembre 2026)

## Demande

L'animation de la TAVI doit se faire à cœur battant, pour plus de réalisme. Jusqu'ici, le cœur était arrêté en
diastole pendant toute la mise en place.

## Ce qui a été fait

1. **Le cœur bat pendant toute l'animation** (js/app.js, `taviEnter`).
   - Depuis la planche du corps entier, le battement part à la fin du fondu, de la fin de la diastole, pour que le
     relais reste sans saut.
   - Sans la planche, le cœur battait déjà sur la valve malade.
2. **Le matériel suit le battement** (js/tavi-anim.js, js/heart.js).
   - Le guide, le cathéter, la tige, le cône, le ballonnet et l'armature de la valve sont placés au repos.
   - Chacun de leurs points est déplacé par la déformation du battement, dans le shader, comme les tissus.
   - Le guide et le cathéter suivent ainsi l'aorte et le ventricule ; la valve sertie puis déployée suit l'anneau.
   - `addDeform` accepte maintenant :
     - un matériel sans coupe (`'none'`) : le matériel reste entier devant le plan ;
     - un déplacement ramené dans le repère de l'objet, pour les pièces placées par leur matrice (rotation, échelle).
3. **Ouverture de l'aorte.**
   - Le champ qui fend l'aorte en long est lu à la position de repos des tissus.
   - L'ouverture suit ainsi la paroi qui bat, au lieu de glisser sur elle quand la racine descend en systole.
4. **Stimulation ventriculaire rapide**, comme le dit la légende de l'étape.
   - Elle va du début du gonflement du ballonnet à la fin de son dégonflement.
   - Le cœur bat environ trois fois plus vite (≈ 200/min), à 20 % de son amplitude, valve aortique presque fermée.
   - `heart.setBeat` prend une amplitude.

## Vérifications (navigateur sans fenêtre, parcours réel : variante TAVI, planche, relais)

- **Relais depuis la planche.** Le battement démarre au relais, à la fin de l'introduction.
- **Valve sertie.** Captures à deux instants du cycle (v49-02, v49-03) : le cathéter et la valve sertie descendent et
  remontent avec la racine, les cuspides natives s'ouvrent et se ferment autour du cathéter.
- **Stimulation rapide.** Elle est active pendant le gonflement (facteur 1) et nulle avant et après.
- **Fin de l'animation.** La valve déployée reste sur l'anneau, puis le passage à la vue chirurgicale se fait comme
  avant.
- **Erreurs JavaScript.** Aucune.

## Captures

| Fichier | Contenu |
|---|---|
| v49-01-tavi-coeur-battant-crosse.jpg | Vue de la crosse, le cœur bat, montée du matériel |
| v49-02-tavi-valve-sertie-systole.jpg | Valve sertie sur l'anneau, un instant du cycle |
| v49-03-tavi-valve-sertie-diastole.jpg | Même étape, autre instant : le matériel a suivi la racine |
| v49-04-tavi-gonflement-stimulation-rapide.jpg | Gonflement du ballonnet sous stimulation rapide |
| v49-05-tavi-valve-deployee-battant.jpg | Valve déployée, cœur qui bat |
