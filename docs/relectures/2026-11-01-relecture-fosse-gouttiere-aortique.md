# Relecture — Fosse ovale pendant le cycle, aorte en gouttière (1er novembre 2026)

Captures : `captures/v42-*.jpg`.

## Demande

1. **Fosse ovale.** Dans le modèle, elle n'est pas en rapport avec les structures voisines pendant le cycle : la
   continuité est rompue. Tout doit être harmonieux.
2. **TAVI.**
   - Supprimer la rupture de continuité de la partie postérieure de l'aorte, qui paraît sectionnée en deux.
   - Une même teinte sur tout le trajet de l'aorte.
   - Ne garder que la partie postérieure du « tuyau d'arrosage ».

## Ce qui a été fait

1. **Fosse ovale** (js/heart.js).
   - **La cause.**
     - Le plancher, la paroi de la dépression et le limbe étaient posés par une matrice de rotation.
     - La déformation du battement ajoute aux coordonnées du maillage un déplacement calculé dans le repère du cœur.
     - Sur une pièce tournée, ce déplacement partait dans une autre direction : plancher et limbe se décalaient l'un de
       l'autre et du septum au cours du cycle (v42-01, trois instants).
   - **La correction.** Le placement est intégré à la géométrie. Les trois pièces se déforment avec le septum, d'un seul
     tenant, à tout instant du cycle (v42-02).
   - **Le même défaut, corrigé au passage.** La racine pulmonaire (volume creux et paroi interne) et l'orifice du sinus
     coronaire avaient le même défaut. Vérifiés dans les vues tricuspide et pulmonaire.
2. **TAVI, aorte en gouttière** (js/heart.js).
   - **Seule la moitié postérieure reste.** Le voile transparent de la moitié antérieure est supprimé, et l'ouverture va
     maintenant de la valve à l'aorte descendante.
   - **Une seule teinte, sans rupture.**
     - L'intima de BodyParts3D est en deux pièces, l'aorte ascendante d'un côté, la crosse et l'aorte descendante de
       l'autre. Elles sont fendues à leur jonction et de teintes différentes : c'était la section en deux.
     - Dans le tronc de l'aorte, elle est remplacée par une gouttière lisse : un demi-tube postérieur le long de la ligne
       centrale.
     - La gouttière épouse la lumière mesurée tous les 2,5 mm : demi-largeur de chaque côté dans le plan de l'ouverture,
       où ses bords rejoignent la tranche de la paroi, et profondeur vers l'arrière.
   - **Les branches de la crosse** (tronc brachiocéphalique, carotide, sous-clavière) gardent la coupe d'origine. Seul le
     tronc de l'aorte est ouvert.
   - **L'artère pulmonaire**, sa racine comprise, est retirée et non plus en transparence. Son voile éclaircissait
     l'aorte ascendante, et la paroi de sa racine y dessinait un rectangle.

## Vérification (navigateur sans fenêtre, 1600 × 1000)

- **Fosse ovale** : continue aux trois instants du cycle (v42-02).
- **TAVI** :
  - gouttière continue et d'une seule teinte de la valve à l'aorte descendante, guide dans la crosse (v42-03) ;
  - cathéter et valve sertie (v42-04) ;
  - déploiement à la racine (v42-05) ;
  - écran partagé de fin inchangé.
- **Vues tricuspide et pulmonaire** : orifice du sinus coronaire et racine pulmonaire en place.
- **Erreurs JavaScript** : aucune.
