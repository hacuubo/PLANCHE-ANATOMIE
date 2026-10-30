# Relecture — animation de l'implantation d'une TAVI (30 octobre 2026)

Captures : `captures/v32-*.jpg`.

## Demande

Recréer, sur notre modèle, une animation semblable à la séquence de 1'25 à 2'00 de la vidéo du CHU de Rouen
(« Déroulement d'une intervention TAVI ») : rétablir l'onglet « TAVI » de la valve aortique, avec la mise en place, le
déploiement et le largage de la bioprothèse.

## Séquence de référence (vidéo, 1'25 à 2'00)

| Temps | Étape |
| --- | --- |
| 1'25 | Guide passé par la crosse jusque dans le ventricule ; cathéter bleu de largage avec la valve sertie et un cône jaune à l'avant |
| 1'30 | Franchissement de la valve native calcifiée ; centrage sur l'anneau |
| 1'35 | Gonflement du ballonnet : la prothèse se déploie et plaque la valve malade |
| 1'40 | Dégonflement ; ballonnet et cathéter retirés |
| 1'50 | Retrait du guide |
| 1'55 | Vue de face : la nouvelle valve fonctionne |

## Ce qui a été fait

1. **Onglet « TAVI »** rétabli (bioprothèse à ballonnet de type SAPIEN 3 dans la valve native calcifiée, construite à
   la demande). Le choisir lance l'animation ; un bouton « Voir l'implantation » la relance, « Arrêter »
   l'interrompt.
2. **Vue de l'animation** (js/aortic-view.js, vue L) :
   - le cœur est coupé dans le plan de la crosse aortique, par le centre de la valve ; c'est l'incidence oblique où la
     crosse se déroule à plat, celle de la vidéo ;
   - l'aorte est ouverte sur toute sa longueur (intima entière, sans tranche de sang), et les poches de la cavité du VG
     dans les sinus sont retirées ;
   - le cœur est arrêté en diastole, sans déformation : le matériel et la valve sertie se placent au repos.
3. **Matériel** (js/tavi-anim.js) :
   - guide de ≈ 0,9 mm terminé en boucle dans le ventricule ;
   - cathéter bleu de ≈ 5,5 mm (14 F) et sa tige interne ;
   - cône jaune ;
   - ballonnet translucide ;
   - valve sertie à ≈ 7 mm : armature, jupe et feuillets de la valve finale, sertis par une échelle radiale.
4. **Trajet** : ligne centrale de la lumière aortique (barycentres successifs de la lumière, de la valve jusqu'à
   l'aorte descendante, lissée), puis chambre de chasse et ventricule gauche vers la pointe.
5. **Étapes**, avec une légende au-dessus du cycle et une barre de progression :

   | Étape | Durée | Ce qui se passe |
   | --- | --- | --- |
   | 1 | 4,2 s | Le guide monte et s'enroule dans le VG |
   | 2 | 6 s | Montée de la valve sertie |
   | 3 | 2 s | Centrage sur l'anneau |
   | 4 | 2,6 s | Gonflement : l'armature se déploie, la valve native passe de calcifiée et rétrécie à plaquée contre les sinus |
   | 5 | 5 s | Dégonflement, retrait du cathéter |
   | 6 | 2,8 s | Retrait du guide |
   | 7 | — | Retour à la vue chirurgicale, cœur qui bat : la nouvelle valve s'ouvre et se ferme |

6. **Caméra** : plan large sur la crosse pendant la montée du matériel, rapproché sur la valve pour le positionnement
   et le déploiement, intermédiaire pour les retraits.
7. **Arrêt propre** si l'on change de variante, de valve ou de côté, ou si l'on ouvre la comparaison : le matériel est
   retiré, l'aorte refermée et la valve de la variante choisie remise. Pendant l'animation, le Doppler et l'encart de
   repérage sont masqués.

## Vérification

- Chaque étape capturée (v32-01 à v32-07), y compris sur téléphone (v32-08).
- Arrêt par changement de variante et par le bouton.
- Fin d'animation : vue chirurgicale, battement, valve TAVI.
- Console sans erreur.

Un défaut trouvé pendant les essais : la légende finale disparaissait trop tôt (minuterie). Le délai est maintenant
compté par l'animation, image par image.
