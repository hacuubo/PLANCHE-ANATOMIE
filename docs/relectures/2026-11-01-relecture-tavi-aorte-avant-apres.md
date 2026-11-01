# Relecture — TAVI : aorte dégagée, valve malade d'abord, avant / après à la fin (1er novembre 2026)

Captures : `captures/v38-*.jpg`.

## Demande

1. Masquer l'artère pulmonaire et voir l'aorte sur sa longueur, pour suivre le guide.
2. Commencer par plus de temps sur la valve pathologique (2 secondes).
3. À la fin, sur la vue du chirurgien, partager l'écran pour montrer de l'autre côté la valve d'avant la TAVI.

## Ce qui a été fait

1. **Aorte dégagée** (js/heart.js, `buildTaviMask`, `addTaviMask`, `setTaviMask`).
   - Dans le plan de la crosse, l'artère pulmonaire droite passait sous la crosse, coupée en travers. Sa lumière violette
     cachait l'aorte ascendante et le guide.
   - **Artère pulmonaire masquée.** Sa lumière est la plus grande pièce de la lumière « veineuse » (≈ 3 150 sommets),
     séparée des veines caves. Elle est reconnue par la structure de l'enveloppe la plus proche de ses points (tronc,
     branches).
   - **Aorte ouverte sur toute sa longueur.** Au-delà de 3,5 cm de la valve, sa moitié tournée vers l'observateur est
     retirée, par rapport à sa ligne centrale. Le guide, puis le cathéter et la valve sertie, se suivent dès l'aorte
     descendante. La racine et l'aorte ascendante restent ouvertes par la coupe, comme avant.
   - **Comment** : un masque en volume (voxels de 1,5 mm), calculé au premier lancement de l'animation.
     - Un voxel appartient à un vaisseau si la surface la plus proche, parmi les lumières des vaisseaux et les cavités,
       est sa lumière, à moins de 1,7 cm (propagation des distances par chanfrein).
     - Le masque couvre la lumière et la paroi, sans toucher l'aorte, les veines caves ou les oreillettes voisines,
       plus proches de leur propre lumière ou cavité.
     - Un premier essai, fondé sur la seule enveloppe, laissait une plaque violette : une partie de la lumière
       pulmonaire est plus proche de la paroi de l'aorte que de la sienne.
   - Le masque s'applique au tissu, aux solides des tranches, aux tranches et au voile de la partie retirée. Il est
     actif de l'entrée dans la vue de la crosse jusqu'à la fin du passage à la vue chirurgicale.
2. **La valve malade d'abord** (js/tavi-anim.js, nouvelle étape 0).
   - « La valve aortique malade : épaissie et calcifiée, elle s'ouvre mal et freine la sortie du sang du cœur. »
   - Pendant 2 s, dans la vue en cours (en principe la vue du chirurgien), cœur qui bat.
   - Ensuite seulement : cœur arrêté, aorte ouverte, artère pulmonaire masquée, passage à la vue de la crosse. Le guide
     part 2,2 s plus tard, comme avant.
   - L'animation compte 8 étapes.
3. **Avant / après** (js/app.js).
   - À l'arrivée sur la vue du chirurgien, la nouvelle valve bat et l'écran se partage :
     - à gauche, « Avant : rétrécissement serré » ;
     - à droite, « Après : TAVI ».
   - Les deux moitiés sont au même instant du cycle et sous le même angle.
   - Dans l'écran partagé de la valve aortique, le côté gauche montre la valve d'avant (rétrécissement serré) quand la
     variante est la TAVI ; la valve normale dans les autres cas.

## Vérification (navigateur sans fenêtre, 1100 × 700)

- Valve malade, 2 s (v38-01).
- Vue de la crosse : artère pulmonaire absente, aorte ouverte de l'aorte descendante à la valve, guide et cathéter
  visibles sur tout le trajet (v38-02).
- Déploiement en plan rapproché, inchangé (v38-03).
- Fin : écran partagé, « Avant : rétrécissement serré » / « Après : TAVI », les deux valves battent (v38-04).
- Erreurs JavaScript : aucune.
- **Reste** : quelques bords irréguliers de tranche entre l'aorte ascendante et l'emplacement de l'artère
  pulmonaire. Ils tiennent à la taille des voxels du masque.
