# Relecture — Doppler rouge sang, TAVI plaquée sur la racine (31 octobre 2026)

Captures : `captures/v35-*.jpg`.

## Demande

1. Retirer le cadre qui présente les vitesses du Doppler.
2. Passer la fumée du Doppler en rouge sang, pour qu'elle parle aux patients.
3. Faire épouser à la prothèse TAVI déployée les contours du culot aortique : jusqu'ici, c'était approximatif.

## Doppler

- **Légende retirée** : élément, styles et mise à jour.
- **Fumée rouge sang** :
  - rouge sombre pour un flux lent, rouge vif pour un jet rapide (de 0,2 à 4 m/s) ;
  - les jets turbulents (fuites, rétrécissements) ont des bouffées plus ou moins vives, plus denses et grumeleuses ;
  - les couleurs de l'échographe (rouge et bleu selon le sens par rapport à la sonde, repliement, vert de la
    variance) sont abandonnées : elles demandaient une légende ;
  - la zone de convergence garde sa forme, un nuage aspiré vers l'orifice, et s'avive en approchant de l'orifice.
- **Infobulle** du bouton mise à jour.
- **Captures** : v35-07 (insuffisance aortique), v35-08 (rétrécissement serré).

## TAVI : prothèse plaquée sur la racine

**Cause.**

- La prothèse était un cylindre parfait de 1,27 cm de rayon, centré sur l'axe théorique de la valve.
- Or la racine de ce cœur n'est ni ronde ni centrée. À l'anneau, la paroi est à 0,85 cm de l'axe d'un côté et à
  1,45 cm de l'autre (mesure par lancer de rayons).
- Résultat :
  - vue du ventricule, l'armature entrait de près de 4 mm dans la paroi d'un côté et restait à distance de l'autre
    (v35-01) ;
  - vue de l'aorte, elle ne touchait pas la racine (v35-03).

**Correction** (js/aortic-view.js) :

1. **Profil de la lumière**, de la chambre de chasse au haut des sinus :
   - distance de l'axe au bord de l'espace sanguin, sur 24 angles × 13 hauteurs ;
   - ce bord est celui des volumes « creux » des coupes : lumière de l'aorte, cavité du VG et ses poches dans les
     sinus ;
   - calcul fait une fois, au premier affichage de la TAVI : ≈ 0,35 s (contre 7 s pour une version naïve). Les
     triangles proches de la racine sont rangés par secteur et par niveau, et les intersections calculées
     directement ;
   - les ostia coronaires et l'orifice mitral sont bornés.
2. **Forme régulière** :
   - à chaque hauteur, cercle décentré et ovalisé (harmoniques 0 à 2 du tour), lissé le long de l'axe. C'est la
     forme d'une armature à ballonnet dilatée dans un anneau ovale et excentré ;
   - un lissage local, essayé d'abord, donnait un contour polygonal irrégulier.
3. **Déformation de la prothèse déployée** :
   - l'armature est placée 1,1 mm en dedans de la paroi, contre les cuspides natives calcifiées, elles-mêmes contre la
     paroi ;
   - les feuillets suivent à proportion, la jupe et les cuspides natives se placent entre l'armature et la paroi ;
   - même forme pour la valve finale, pour l'armature de l'animation (sertie puis dilatée) et pour les cuspides natives
     plaquées pendant le déploiement : aucun saut à la fin.
4. **Ballonnet** (js/tavi-anim.js) : gonflé à la forme de l'armature déployée, et non plus en cylindre. Il revient à
   une forme ronde, serti puis dégonflé.

**Captures** :

- v35-01 → v35-02 : vue du ventricule, avant → après ;
- v35-03 → v35-04 : vue du chirurgien, avant → après ;
- v35-05 : ballonnet gonflé ;
- v35-06 : prothèse en place après retrait.

## Vérification

- **Captures** :
  - animation TAVI complète ;
  - valve fermée et ouverte : les feuillets coaptent en Y ;
  - vues chirurgien et ventricule ;
  - Doppler sur insuffisance et rétrécissement ;
  - téléphone (v35-09).
- **Erreurs JavaScript.** Aucune.
