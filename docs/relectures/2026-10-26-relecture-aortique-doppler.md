# Relecture : vue chirurgicale aortique, Doppler couleur (26 octobre 2026)

Captures : `captures/v29-*.jpg`.

## Demandes

1. Vue chirurgicale aortique : un reliquat rouge, pris pour un morceau de vaisseau, reste dans l'aorte. Par
   ailleurs, plusieurs « ombres » se déplacent au cours du cycle et gênent la lecture.
2. Valvulopathies : pouvoir afficher un mode « couleur » de l'ETT adapté à la vue 3D, pour voir les régurgitations
   pendant le cycle.

## 1. Vue chirurgicale aortique

Chaque élément a été identifié pixel par pixel (masquage objet par objet, lancer de rayons), sur tout le cycle
(v29-01 avant, v29-02 après).

- **Reliquat rouge** : ce n'était pas un vaisseau mais l'intérieur d'une poche de la cavité du VG de BodyParts3D. Elle
  remonte dans un sinus de Valsalva, ≈ 3,5 mm au-dessus de l'anneau. On voyait sa paroi par l'intérieur, et elle
  suivait le battement.
  - **Correction** : la surface des cavités est retirée dans la racine aortique, de 0,15 à 1,05 hauteur de cuspide et
    jusqu'à 0,95 fois le rayon de l'anneau, quand on regarde depuis l'aorte.
  - La vue depuis le ventricule ne change pas : y retirer la poche découvrait, derrière la valve ouverte, la surface
    externe du modèle.
- **Tache grise à côté de l'ostium gauche** :
  - **Cause** : l'intima de la racine est un maillage grossier (triangles de ≈ 3 mm), déformé sommet par sommet.
    L'entonnoir de l'ostium suivait, lui, la déformation exacte de chaque point. Selon l'instant du cycle, les deux
    se décalaient d'≈ 1 mm. Sur un bord, le regard passait alors à côté de l'entonnoir et tombait sur la surface
    externe du cœur, qui passe juste derrière l'intima (tache grise mobile).
  - **Correction** : l'ostium est désormais porté par le triangle d'intima qui le contient. L'application affine qui
    envoie ce triangle de sa position de repos à sa position déformée est recalculée à chaque pose. L'orifice est
    aussi resserré (le trou de l'intima est plus étroit que l'entrée de l'entonnoir) et la surface externe est percée
    à son droit.
  - **Résultat** : un orifice net avec son liseré, la lumière rouge de l'artère au fond, identique à tous les
    instants (v29-03 avant, v29-04 après).
- **« Aiguille » sombre dans l'oreillette droite** : c'était l'orifice du sinus coronaire (disque sombre et valvule de
  Thébésius), vu par la tranche au loin, et qui bougeait avec l'oreillette.
  - **Correction** : il n'est plus montré que dans les coupes et dans les vues qui regardent l'oreillette droite
    (tricuspide, fosse ovale, FOP).
- **Fente sombre en haut à gauche de la coupe** : c'est le sinus transverse du péricarde, l'espace entre l'aorte et
  les oreillettes, qui est anatomique. Elle est conservée.

## 2. Doppler couleur

Un bouton « Doppler couleur » apparaît dans les vues des valves (js/doppler.js), avec une légende sur le côté.

### Conventions

- **Couleurs** : celles de l'ETT en voie apicale, avec la sonde à la pointe du cœur (convention BART). Rouge : le sang
  va vers la sonde ; bleu : il s'en éloigne ; la couleur s'éclaircit quand la vitesse augmente. Seule la composante
  de la vitesse dans l'axe de la sonde compte : un flux perpendiculaire s'éteint.
- **Limite de Nyquist** : ± 0,7 m/s, au-delà de laquelle la couleur se replie.
  - Les jets de fuite et de rétrécissement (2 à 5 m/s), turbulents, donnent une « mosaïque » près de l'orifice :
    repliements et vert de la variance.
  - Leur périphérie, plus lente, garde la couleur du sens du flux.
  - Modèle du jet libre : vitesse maximale sur le premier dixième (cône potentiel), décroissance en 1/distance, profil
    en cloche vers le bord.
  - Les flux normaux restent sous la limite : couleur homogène.
- **Zone de convergence (PISA)** en amont des orifices étroits : coquilles hémisphériques d'isovitesse,
  v = Q / 2πr². Le rayon de repliement est calculé à partir du débit (surface de l'orifice × vitesse), et la couleur
  change à la coquille où v atteint la limite de Nyquist.
- **Chronologie** : celle du cycle du modèle (64/min).
  - Fuites mitrale et tricuspide pendant toute la systole, de la fermeture de la valve à sa réouverture.
  - Fuite aortique pendant toute la diastole, plus forte au début.
  - Remplissage en ondes E et A.
  - Éjection maximale au premier tiers.
  - Cœur arrêté valve fermée ou ouverte : instant représentatif de cette position.

### Flux affichés

Ordres de grandeur : ASE 2017 (quantification des fuites), ESC/EACTS 2021.

| Valve | Variante | Flux |
| --- | --- | --- |
| Toutes | Normale | Remplissage mitral et tricuspide (rouge) ; éjection aortique et pulmonaire (bleue) — v29-12, v29-13 |
| Aortique | Insuffisance | Jet central vers la pointe, ≈ 4 m/s, mosaïque rouge ; petite zone de convergence côté aorte — v29-07 |
| Mitrale | Prolapsus P2 | Jet excentré dirigé vers l'avant (le long du septum interauriculaire et de la racine aortique), opposé au feuillet qui prolabe, ≈ 5 m/s, bleu ; zone de convergence côté ventricule — v29-05 |
| Tricuspide | Anneau dilaté | Jet central vers le fond de l'oreillette droite, ≈ 2,8 m/s, bleu — v29-08 |
| Aortique | Rétrécissement serré | Jet étroit dans l'aorte, ≈ 4,5 m/s ; accélération dans la chambre de chasse — v29-09 |
| Mitrale | Rétrécissement | Jet vers la pointe, ≈ 1,9 m/s ; dôme de convergence côté oreillette, qui se replie (PISA du rétrécissement mitral) — v29-10, v29-11 |
| Pulmonaire | Rétrécissement | Jet dans le tronc pulmonaire, ≈ 4 m/s |

### Rendu

- **Jets** :
  - une enveloppe et un cœur de jet, plus quelques tranches transversales : vu dans l'axe, le jet se remplit ; vu de
    profil, les tranches s'effacent ;
  - les tranches sont dessinées de la plus lointaine à la plus proche de l'œil.
- **Pas de coupe** : les jets sont dessinés en entier, car une fuite part dans la cavité que la coupe a retirée et
  vient vers l'observateur. Leurs parties cachées par les tissus restent visibles en transparence.
- **Écran partagé** : chaque moitié a ses flux, la valve normale à gauche (v29-06).
- **Lien de la vue** : `doppler=1`.
- **Téléphone** : légende compacte (v29-14).

## Vérification

- Vue chirurgicale aortique à 0, 300, 600 et 800 ms : plus de reliquat, ni d'aiguille, ni de tache.
- Ostium gauche en gros plan sur trois instants.
- Vues aortique depuis le ventricule (fermée, ouverte), tricuspide, coupe frontale.
- Doppler :
  - toutes les variantes, côtés C et V ;
  - écran partagé et battement en cours ;
  - lien de la vue et écran de téléphone.
- Console : aucune erreur.
