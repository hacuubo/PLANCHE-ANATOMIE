# Relecture — coupe du FOP, vue chirurgicale pulmonaire, rétrécissement aortique (26 octobre 2026)

Captures : `captures/v28-*.jpg`.

## Demandes

1. FOP : une coupe bicave plus postérieure, qui montre une partie de la fosse ovale et le FOP, avec 4 fois plus de
   bulles pour mieux voir le passage.
2. Valve pulmonaire : retravailler la vue chirurgicale, où plusieurs coupes passaient devant la valve.
3. Rétrécissement aortique : rendre toute la valve dégénérative, avec des bords libres irréguliers et abîmés au lieu
   de bords droits.

## Ce qui a été fait

1. **FOP** (js/heart.js, js/special-views.js) : le tunnel part maintenant du bord supérieur de la fosse, un peu en
   avant (quadrant antéro-supérieur, ≈ 3 mm, Goel 2009). La coupe bicave, qui passe par le milieu du tunnel, est donc
   plus postérieure et traverse aussi la fosse : plancher (septum primum) et limbe apparaissent en coupe. Il y a
   maintenant 1 280 bulles au lieu de 320 : l'oreillette droite est opacifiée et le flot qui traverse le tunnel vers
   l'oreillette gauche se voit nettement (v28-01).
2. **Vue chirurgicale pulmonaire** (js/heart.js, js/aortic-view.js). Dans BodyParts3D, la lumière du tronc
   pulmonaire ne commence qu'en haut des sinus, ≈ 1,1 cm au-dessus de l'anneau. Le centre de la lumière mesuré est
   à 1,2 cm de l'axe à 1 cm de hauteur, puis à ≈ 0,2 cm à partir de 1,8 cm. Ce qui gênait la vue :
   - la racine entre l'anneau et la lumière comptait comme du muscle, et la tranche de myocarde couvrait les
     cuspides ;
   - la surface externe du modèle, repliée entre l'infundibulum et l'aorte, traversait la racine en bande grise
     (v28-02).

   Corrections :
   - un volume creux va de l'anneau au début de la lumière, avec sa paroi interne dessinée comme l'intima des sinus ;
   - la surface externe est retirée à l'intérieur de ce cylindre ;
   - le fond retiré sous la valve monte jusqu'au haut de la paroi des sinus ;
   - la coupe passe à 1,12 hauteur de cuspide au lieu de 0,95.

   La valve se voit maintenant entière, fermée, ouverte et en dôme (v28-03, v28-04).
3. **Rétrécissement aortique dégénératif** (js/aortic-view.js) :
   - **Amas calcaires sur toute la cuspide**, et non plus seulement quelques nodules à la base :
     - gros amas à la base et dans le corps ;
     - traînées le long de la ligne de fermeture ;
     - amas aux commissures ;
     - nodules sur le bord libre.
   - **Bord libre abîmé**, avec une déformation fixe, propre à chaque cuspide :
     - festons irréguliers, à plusieurs échelles ;
     - deux encoches de rétraction par cuspide ;
     - bord épaissi et noueux, d'une teinte de tissu remanié.
   - **Commissures libres**, comme dans l'atteinte dégénérative (non soudées, contrairement à l'atteinte
     rhumatismale).
   - **Orifice** : il reste petit (même ouverture maximale), mais il est devenu irrégulier et étoilé (v28-05 avant,
     v28-06 après).
   - **Valve fermée** : de petites fuites persistent entre les bords rétractés, comme dans la maladie aortique
     mixte fréquente à ce stade (v28-07). Vue ventriculaire : v28-08.
   - **Fiche** (FR, EN) : les amas gagnent le corps des cuspides et le bord libre.
   - **TAVI** : les cuspides natives plaquées par la prothèse gardent leur calcification, sans la déformation du bord.

## Vérification

- Vues pulmonaires C fermée, ouverte et rétrécissement, vue V, systole (300 ms).
- Vue de face du cœur : pas de trou au tronc pulmonaire.
- Coupes frontale et 5 cavités.
- Rétrécissement aortique en vues C et V, fermé et ouvert.
- TAVI fermé et ouvert.
- FOP.
- Console : aucune erreur.
