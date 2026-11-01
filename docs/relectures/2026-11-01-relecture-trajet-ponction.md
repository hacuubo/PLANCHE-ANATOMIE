# Relecture — Trajet depuis la ponction, première partie des animations (1er novembre 2026)

Captures : `captures/v41-*.jpg`.

## Demande

Montrer chaque animation de pose de dispositif en deux parties.

- **Première partie, nouvelle.**
  - Une image d'un corps standard, avec le réseau artériel et veineux de la grande circulation (pas de circulation
    pulmonaire), à partir d'un exemple à sublimer.
  - Le cœur reste immobile.
  - On voit le dispositif progresser dans les vaisseaux, du point de ponction jusqu'au cœur.
- **Deuxième partie.** L'animation déjà en ligne, qui démarre à l'arrivée au cœur.
- **Exigences.** Un réseau veineux et artériel précis et agréable à regarder.
- **Abords.**
  - TAVI : artère fémorale droite.
  - FOP : veine fémorale droite.
  - Pacemaker : veine sous-clavière gauche.

## Ce qui a été fait

1. **Planche du corps entier** (js/route-intro.js). Dessin vectoriel original : l'exemple fourni est une image de
   banque d'images, il n'est pas repris.
   - **Le corps.**
     - Vue de face, côté droit du patient à gauche de l'écran (comme le repère « D ← patient → G » du bas).
     - Silhouette aux proportions d'un adulte (7,5 têtes), peau dégradée, ombre douce.
     - Repères discrets : clavicules, ligaments inguinaux, ombilic.
   - **Les artères (rouge).**
     - Aorte : ascendante, crosse, thoracique puis abdominale, à gauche de la ligne médiane, bifurcation à l'ombilic.
     - Branches de la crosse : tronc brachiocéphalique, carotides, sous-clavières.
     - Tête et cou : carotides interne et externe, faciale, temporale superficielle.
     - Membres supérieurs : axillaire, humérale, radiale, ulnaire, arcade palmaire, digitales.
     - Abdomen et bassin : rénales, iliaques communes, internes et externes.
     - Membres inférieurs : fémorale et fémorale profonde, poplitée, tibiales, fibulaire, pédieuse.
   - **Les veines (bleu).**
     - Veines caves supérieure et inférieure, celle-ci à droite de l'aorte.
     - Troncs brachiocéphaliques, le gauche plus long et oblique, devant les branches de la crosse.
     - Cou : jugulaires interne et externe.
     - Membres supérieurs : sous-clavières et axillaires (en avant des artères), basilique, céphalique, médiane du
       coude, réseau de la main.
     - Abdomen et bassin : rénales (la gauche devant l'aorte), iliaques.
     - Membres inférieurs : veine fémorale en dedans de l'artère, grande saphène, tibiales, arcade du pied.
   - **Le cœur.**
     - Immobile, oreillette droite au bord droit, pointe en bas à gauche, sillons coronaires.
     - L'aorte thoracique passe derrière lui.
   - **Le dessin des vaisseaux.** Lignes centrales lissées, de largeur décroissante vers la périphérie, avec un liseré
     et un reflet.
2. **Animation (≈ 10 à 13 s).**
   - **Ponction.** L'aiguille entre dans le vaisseau. Un anneau pulse au point de ponction, avec une étiquette.
   - **Remontée.**
     - Le dispositif remonte le vaisseau jusqu'au cœur, sur sa ligne centrale, avec un bout lumineux.
     - Le dispositif garde une épaisseur constante à l'écran et un halo clair.
     - Il passe derrière le cœur.
   - **Les trois trajets.**
     - TAVI (guide gris) : artère fémorale droite, iliaque commune, aorte abdominale puis thoracique, crosse, valve
       aortique.
     - FOP (gaine bleue) : veine fémorale droite, iliaque commune, veine cave inférieure, oreillette droite.
     - Pacemaker (gaine de la sonde) : veine sous-clavière gauche, tronc brachiocéphalique gauche, veine cave
       supérieure, oreillette droite.
   - **Cadrage.** Le corps entier, puis le point de ponction, puis la tête du dispositif avec le cœur, puis le cœur
     en plein cadre.
3. **Transition vers la deuxième partie** (js/app.js).
   - Au plongeon sur le cœur, l'animation déjà en ligne démarre sous la planche, qui s'efface en fondu (v41-05).
   - La barre de progression compte le trajet comme première étape.
   - Légende de l'étape : la ponction, puis le trajet.
   - Bouton « Passer ». « Arrêter » interrompt l'introduction. Changer de vue l'arrête.
   - La vue de départ (choix de « TAVI », d'« Implantation pacemaker », de « Fermeture du FOP », ou lien partagé)
     joue les deux parties.

## Vérification (navigateur sans fenêtre, 1400 × 900 et téléphone 390 × 844)

- **TAVI** : ponction fémorale droite (v41-01), guide dans l'aorte abdominale (v41-02), puis enchaînement sur la
  valve malade en 3D (v41-05).
- **FOP** : la gaine dans la veine cave inférieure (v41-03).
- **Pacemaker** : la gaine dans la veine sous-clavière gauche et le tronc brachiocéphalique gauche (v41-04).
- **Téléphone** : le corps entier tient en hauteur ; trajet du FOP (v41-06).
- **Fin de l'introduction** : la deuxième partie démarre ; écran partagé de la TAVI et fin des autres animations
  inchangés.
- **Erreurs JavaScript** : aucune.
