# Relecture — valve pulmonaire et nouvelles pathologies (25 octobre 2026)

Vue de face de la valve pulmonaire (côtés Chirurgien et Ventricule) et quatre variantes : rétrécissement pulmonaire
en dôme, insuffisance aortique, TAVI, rétrécissement mitral rhumatismal. Recherche bibliographique indépendante, essais
en local, relecture indépendante du code. Captures : `captures/v25-*.jpg`.

## Appui scientifique

- **Valve pulmonaire** : cuspides antérieure, droite et gauche (Terminologia Anatomica) ; la droite et la gauche font
  face à l'aorte, l'antérieure à rien. Affichage de face recommandé : **cuspide antérieure à 12 h quelle que soit la
  perspective** (EAE/ASE, Lang 2012, *JASE* 25:3). Anneau adulte ≈ 2,1 cm²/m² (≈ 22 mm).
- **Rétrécissement pulmonaire en dôme** : forme la plus fréquente (40 à 60 %) ; commissures soudées, raphés, dôme
  mobile en systole percé d'un orifice habituellement central, d'une tête d'épingle à quelques millimètres ; tronc
  pulmonaire souvent dilaté. Sévère au-delà de 4 m/s (64 mmHg) (Baumgartner 2009, EAE/ASE). Forme dysplasique (Noonan)
  à part : cuspides épaisses sans fusion commissurale.
- **Insuffisance aortique** : classification d'El Khoury (Boodhwani 2009), type I = cuspides normales, dilatation de
  la jonction sino-tubulaire, des sinus ou de l'anneau, défaut de coaptation et jet central ; IA importante : orifice
  régurgitant ≥ 0,30 cm², vena contracta > 6 mm (Zoghbi 2017, ESC 2021). Hauteur de coaptation normale 9 à 10 mm.
  L'aspect de face en triangle central découle de la géométrie à trois cuspides (non décrit tel quel dans les
  sources).
- **Rétrécissement mitral rhumatismal** : RM significatif ≤ 1,5 cm² (ESC 2021), serré < 1 cm² (EAE/ASE 2009) ; fusion
  commissurale, épaississement partant des bords libres, cordages épaissis, raccourcis et soudés, calcification
  tardive (Kemaloğlu Öz 2020) ; dôme diastolique du feuillet antérieur en « crosse de hockey », orifice en « bouche
  de poisson » en petit axe (ASE) ; score de Wilkins (mobilité, épaississement, atteinte sous-valvulaire,
  calcifications ; Wilkins 1988).
- **TAVI** : SAPIEN 3 (expansion par ballonnet) : armature courte en cobalt-chrome, feuillets en péricarde bovin
  intra-annulaires, jupes interne et externe en PET ; tailles 20 à 29 mm, hauteur 22,5 mm pour la 29 (FDA). Les
  cuspides natives calcifiées sont repoussées contre les sinus ; risque d'obstruction coronaire si l'ostium est bas
  ou le sinus étroit (Ribeiro 2013, Komatsu 2019). Evolut (auto-expansible, nitinol, supra-annulaire) non représentée.

## Ce qui a été fait

1. **Valve pulmonaire** (js/aortic-view.js, généralisé aux deux valves sigmoïdes) : vue C depuis le tronc pulmonaire,
   vue V depuis l'infundibulum du VD ; cuspides reconnues par leur position (la plus éloignée de l'aorte est
   l'antérieure ; droite et gauche selon le côté du patient) ; repères. Le tronc pulmonaire de BodyParts3D n'est pas
   dans l'axe de la valve et sa lumière ne commence qu'en haut des sinus : la coupe C passe juste au-dessus des
   cuspides (gardées entières), la racine pulmonaire est ouverte comme l'aortique (lumière, intima, fond retiré).
   Captures v25-01 et v25-02.
2. **Rétrécissement pulmonaire en dôme** : cuspides épaissies, raphés le long des commissures soudées, dôme systolique
   percé d'un orifice central de ≈ 6,5 mm (≈ 0,33 cm²). Capture v25-03.
3. **Insuffisance aortique (type I)** : cuspides normales, coaptation abaissée, bord libre de chaque cuspide écarté de
   2,8 mm au centre : orifice triangulaire d'≈ 0,4 cm². Capture v25-04.
4. **TAVI** : armature de 22,5 mm (taille 29 pour cet anneau de 28,8 mm), cellules en losange, grandes cellules en
   haut, montants de commissure alignés sur les commissures natives, jupe en tissu sur le tiers bas, feuillets en
   péricarde (fermeture en Y), cuspides natives calcifiées plaquées contre les sinus ; l'armature est coupée avec les
   parois. Captures v25-05 (ouverte) et v25-06 (fermée).
5. **Rétrécissement mitral rhumatismal** : orifice ovale de 1,8 × 0,76 cm (≈ 1,07 cm²), commissures soudées, feuillet
   antérieur bombé vers le ventricule, postérieur peu mobile, bords libres épaissis, calcifications commissurales,
   cordages deux fois plus épais, soudés (ramification près du feuillet). Captures v25-07 (oreillette) et v25-08
   (ventricule).

Non représenté : la dilatation post-sténotique du tronc pulmonaire et la dilatation de la racine aortique (elles
demanderaient de déformer les gros vaisseaux) ; seule leur conséquence sur la valve est montrée.

Comparaison en écran partagé disponible pour toutes les variantes (capture v25-09 : valve normale et TAVI).

## Relecture du code (relecteur indépendant)

Rien de grave. Vérifié numériquement dans l'application : interpolation ouverte / fermée exacte pour toutes les
nouvelles formes (dôme, cuspides plaquées, défaut de coaptation, rétrécissement mitral), identification des cuspides
pulmonaires (antérieure = « Left anterior » de BodyParts3D, la plus éloignée de l'aorte ; droite et gauche selon le
côté du patient), repères aortiques inchangés, pièces fixes et armature de la TAVI affichées et redessinées avec la
valve (écran partagé compris), tricuspide inchangée, liens vers les nouvelles variantes.

Points mineurs, tous **corrigés** :
- chaque lumière n'ouvrait pas que sa propre racine (croissant de lumière aortique ouvert à côté de la racine
  pulmonaire) → racine désignée par lumière (aorte : racine aortique ; tronc pulmonaire : racine pulmonaire) ;
- fond du tronc pulmonaire retiré trop largement (paroi du tronc, plus étroit que ses sinus) → limité à 0,75 rayon ;
- TAVI : cuspides natives qui traversaient l'armature et la jupe → armature à 0,88 rayon, natives amincies et plaquées
  à 0,975 rayon ; montants de commissure posés sur la colonne de nœuds la plus proche ; trame de la jupe inopérante
  retirée ; pièces fixes redessinées seulement quand le cœur se déforme ;
- rétrécissement mitral : sommets du bord libre écrasés en un point aux commissures → bord libre réparti d'une
  commissure à l'autre le long du feuillet.

## Vérification

Vues C et V de la valve pulmonaire (normale et rétrécie, fermée et ouverte, repères) ; insuffisance aortique ; TAVI
ouverte, fermée, de biais et en comparaison ; rétrécissement mitral côtés oreillette et ventricule ; non-régression de
la valve aortique normale et des coupes 5 cavités et frontale ; console sans erreur.
