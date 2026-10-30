# Planche d'anatomie — Le cœur

Application web progressive (PWA) destinée à expliquer aux patients l'anatomie du cœur
et de ses vaisseaux, à la manière d'une planche d'atlas : un modèle 3D interactif,
une liste numérotée des structures, et une fiche explicative par structure.

## Fonctions

- **Modèle 3D issu de données anatomiques réelles** (BodyParts3D, voir plus bas) : cavités,
  oreillettes et auricules, feuillets valvulaires avec leurs cordages, muscles papillaires,
  arbre coronaire et veines du cœur, gros vaisseaux (aorte et crosse, tronc pulmonaire et artères
  pulmonaires, veines caves, veines pulmonaires). Le myocarde ventriculaire, absent de
  BodyParts3D, est reconstruit autour des cavités réelles, son épaisseur étant calée sur le
  trajet réel des coronaires. À la jonction auriculo-ventriculaire, une lame de tissu relie l'anneau des valves mitrale et
  tricuspide à la paroi là où les cavités de BodyParts3D laissaient une fente ; les muscles papillaires sont
  recalculés en solides fermés (surfaces de coupe sans éclats).
- **Coronaires** comme sur les planches de référence : sillons dégagés de leur graisse, artères en rouge et veines en
  bleu, troncs remis au calibre des atlas (tronc commun ≈ 4,5 mm, IVA proximale et coronaire droite ≈ 3,5 mm, branches
  ≈ 2,4 mm, sinus coronaire ≈ 6 mm), calibre qui diminue vers la périphérie ; débarrassés de la graisse
  sous-épicardique, les vaisseaux reposent dans un sillon évasé du myocarde, enchâssés à mi-hauteur, visibles sur toute
  leur longueur (jamais interrompus) et sans fente de part et d'autre. Visibles : coronaire droite, branche du
  conus, branches ventriculaires et marginales, IVP (interventriculaire postérieure) ; tronc commun, IVA et
  diagonales, circonflexe ; grande veine du cœur, veine interventriculaire antérieure, veine moyenne, petites veines,
  sinus coronaire, qui s'ouvre dans l'oreillette droite par un orifice de ≈ 8 mm bordé de la valvule de Thébésius.
  Les vaisseaux sont coupés au ras de l'endocarde là où la pièce BodyParts3D dépasse dans une cavité (sinus coronaire,
  grande veine du cœur contre l'oreillette gauche) ; la coupe, faite en position de repos, suit la contraction.
  **Ostia coronaires** : chaque artère (tronc commun, coronaire droite) est prolongée à son calibre jusqu'à l'intima
  de son sinus aortique ; l'intima y est percée et l'orifice s'enfonce dans la paroi (vue chirurgicale de la valve
  aortique, repères « Ostium coronaire gauche / droite »). L'ostium est porté par le triangle d'intima qui le contient
  (même déformation que lui, à chaque instant) : trou et entonnoir restent l'un dans l'autre pendant tout le cycle.
  L'orifice du sinus coronaire n'est montré que dans les coupes et les vues qui regardent l'oreillette droite
  (tricuspide, fosse ovale, FOP).
  Contrôlé sur tout le cycle (repos, contraction des oreillettes, systole, diastole) : aucune artère coronaire n'entre
  dans une cavité ni dans l'aorte, la déformation du battement étant une même fonction de l'espace pour la paroi et les
  vaisseaux.
- **Rendu « tissu vivant »** dans le style des animations médicales : fibres myocardiques en relief procédural, film humide satiné, translucidité, liseré lumineux,
  occlusion ambiante cuite dans le maillage, éclairage de studio sur fond clair.
- **Coupe** (profondeur réglable) : **5 cavités** (coupe courbe : plan 5 cavités par la pointe et la valve aortique,
  creusé en pente douce autour des valves mitrale et tricuspide jusqu'au plan 4 cavités, si bien que les trois valves
  sont coupées en leur milieu, à ≈ 2 mm près ; la valve pulmonaire, en avant de l'aorte, n'y figure pas) et
  **frontale** (plan frontal à peine incliné pour contenir l'axe de la racine aortique, placé au centre de la valve
  aortique : cuspides coupées en leur milieu, voie d'éjection et aorte ascendante dans le même plan). Les vues de face
  des valves sont dans « Valves ». Quand une coupe passe
  par la racine aortique ou pulmonaire, celle-ci est ouverte (intima et cuspides visibles) au lieu d'un aplat de sang. **Tranches** (js/cut-surface.js) : muscle rouge sectionné, fibres en hélice dont l'angle tourne dans
  l'épaisseur (cloison comprise, de sa face gauche à sa face droite) (stries ou points selon leur orientation dans la tranche), cloisons entre faisceaux, endocarde nacré,
  épicarde et couche sous-épicardique, paroi des oreillettes, paroi crème des gros vaisseaux ; profondeur lue dans
  une carte 3D de la paroi (voxels de 2 mm) qui suit le battement ; muscles papillaires coupés en travers (fibres le
  long du pilier, en points) ; détail le plus fin des fibres et relief atténués quand ils tombent sous quelques pixels
  (pas de grain scintillant). Lumière des gros vaisseaux : sang sombre et humide, plus profond au centre qu'au bord.
  On y voit cavités, septum, valves et cordages, piliers. Voies de conduction (nœud sinusal, nœud
  atrio‑ventriculaire, faisceau de His placé dans le septum) : masquées pour le moment (`SHOW_CONDUCTION`, js/app.js).
- **Valves** (js/valves.js) : modèle paramétrique calé sur les repères BodyParts3D — feuillets mitraux et
  tricuspides festonnés, cordages tendineux en éventail vers les muscles papillaires (chaque feuillet tenu par
  les deux piliers qui encadrent ses commissures), coaptation mitrale en « sourire » et tricuspide en Y ; ouverts, les
  feuillets forment un entonnoir plus étroit que l'anneau (orifice de 4 à 6 cm² pour un anneau de 7 à 10 cm²) ; cuspides
  aortiques et pulmonaires en poche fermées en Y. **Tissu** : lames épaisses (0,4 à 1,2 mm) à bord libre arrondi,
  base fibreuse rosée, zone claire mince et translucide, zone rugueuse épaissie ; lunules et nodule d'Arantius des
  sigmoïdes ; fibres de collagène radiales, ondulations du bord et lumière traversant les zones minces dessinées
  dans le shader (`VALVE`, js/heart.js). Cordages en trois ordres (tronc, branches, cordages fins évasés à
  l'insertion), inextensibles : tendus valve fermée, ils s'incurvent quand elle s'ouvre, toujours sous les feuillets
  (côté ventricule) : vus de l'oreillette, ils n'apparaissent qu'à travers l'orifice. **Cinétique** : ouverture
  suivant un ressort amorti (léger rebond à la fermeture), bord libre en retard sur la base (ondulation en voile),
  vibration du bord libre dans le flux pendant le battement.
- **Battement** (js/heart.js, `cycle` et `GLSL_DEFORM`) : chronologie d'un adulte à 64/min (940 ms), d'après
  l'échographie (Doppler tissulaire, recommandations ASE/EACVI 2015) et l'IRM de marquage — systole auriculaire
  (droite 15 ms avant la gauche, derniers 20 % du remplissage), fermeture mitrale puis tricuspide, contraction
  isovolumique (35 ms : le VG s'arrondit, brève rotation inverse), ouverture pulmonaire puis aortique, éjection
  (285 ms, rapide puis lente), fermeture aortique puis pulmonaire, relaxation isovolumique (95 ms, détorsion
  commencée), ouverture tricuspide puis mitrale, remplissage rapide (≈ 75 %), diastasis (valves à demi refermées).
  Mouvement autour de l'axe propre du VG : la pointe reste immobile, le plan auriculo-ventriculaire descend vers elle
  (13 mm à l'anneau mitral, ≈ 23 mm sur le bord libre de la tricuspide) et remonte en diastole ; la paroi,
  incompressible, s'épaissit (endocarde ≈ 8 mm vers l'axe, épicarde ≈ 3 mm ; raideur lue dans la carte 3D de la
  paroi, de l'endocarde du VG à l'épicarde et à la face droite de la cloison) ; paroi libre du VD en soufflet vers la
  cloison ; anneau mitral sphinctérien (surface ≈ −25 %) ; racines aortique et pulmonaire non contractées ; torsion : pointe +8,7°, base −4,8°
  (vue de la pointe), pics en fin d'éjection, détorsion pointe d'abord ; la pointe précède la base de 30 ms ; les
  oreillettes se remplissent et s'allongent pendant la systole ventriculaire, se vident puis se contractent en fin de
  diastole. Calculé dans le shader de sommets : tissus, surfaces de coupe, tranches et ombres suivent le même
  mouvement ; valves et cordages côté processeur, à l'identique.
- **Modèle visuel** : plein écran, sans panneau, texte, légende ni nom de structure ; coronaires toujours affichées ;
  battement automatique dès l'ouverture, bouton « Pause » (le cœur reste à l'instant où on l'arrête).
- **Cycle cardiaque** (barre du bas) : curseur sur un cycle de 940 ms, contraction des oreillettes, systole (de la
  fermeture mitrale à la fermeture aortique) et diastole marquées ; glisser arrête le cœur à cet instant, valves
  comprises ; ralenti ¼.
- **Repères** (bouton, à la demande) : côtés du patient, et dans les vues des valves noms des feuillets, des cuspides et
  de l'aorte. **Recentrer** : cadrage de départ de la vue en cours. **Partager** : lien de la vue en cours (valve, côté,
  variante, position ou instant du cycle, coupe, vitesse, repères, comparaison), tenu à jour dans la barre d'adresse et
  rouvert tel quel (par exemple `?valve=mitrale&cote=ventricule&variante=prolapsus&instant=300`).
- **Valves** (vues de face tirées du cœur lui-même, js/aortic-view.js et js/av-views.js) : le bouton « Valves » ouvre
  le choix de la valve sans bouger la vue ; le clic sur le nom de la valve lance le zoom depuis la vue en cours : la
  caméra plonge vers la valve pendant que la coupe descend. Deux côtés, comme en échocardiographie 3D (ASE/EAE,
  Lang 2012) : **C** (chirurgical) depuis l'oreillette ou l'artère, cœur coupé juste au-dessus de l'anneau ou de la
  jonction sino-tubulaire ; **V** (ventriculaire) depuis le ventricule, cœur coupé à mi-ventricule (piliers, cordages,
  face ventriculaire des feuillets) ou dans la chambre de chasse. Même orientation des deux côtés (image en miroir) :
  aorte à 12 h pour la mitrale, feuillet septal à 6 h pour la tricuspide, cuspide coronaire droite à 6 h pour
  l'aortique, cuspide antérieure à 12 h pour la pulmonaire. Les variantes pathologiques prennent la place de la valve dans le cœur et battent avec lui. Choix de la
  variante et de la position (fermée / ouverte) ; pendant le battement, la coupe suit la valve qui descend et remonte
  avec la base. Au retour, la vue et la coupe de départ sont rétablies. Derrière la valve, le fond s'assombrit
  doucement (éclairage frontal du chirurgien) : la valve se détache. **Comparer** : écran partagé, valve normale à
  gauche et valve malade à droite, dans le même cœur, au même instant du cycle et sous le même angle.
  **Repère** : en haut à droite (en bas à gauche sur téléphone), une petite coupe du cœur qui bat, sous un angle fixe,
  où la valve regardée est entourée (le cercle suit la valve) — coupe 4 cavités pour la mitrale et la tricuspide,
  5 cavités pour l'aortique, frontale passant par la voie d'éjection du VD pour la pulmonaire. Séquence de 32 images
  pré-rendues depuis le modèle sur un cycle (`assets/reperes`, planches de 8 × 4, ≈ 270 Ko chacune ; positions du
  cercle : `js/reperes.js`), calée sur l'instant du cœur principal (battement, ralenti, curseur, pause), fondu entre
  deux images voisines. Les variantes pathologiques ne sont construites qu'à leur premier affichage (démarrage plus court
  d'≈ 0,3 s sur ordinateur, davantage sur téléphone).
  **Doppler couleur** (js/doppler.js) : les flux de la valve regardée, en volume dans le cœur qui bat, colorés comme à
  l'ETT en voie apicale (sonde à la pointe) : rouge vers la sonde, bleu en s'éloignant, plus clair quand c'est plus
  rapide ; limite de Nyquist ± 0,7 m/s, au-delà repliement ; jets de fuite et de rétrécissement turbulents en
  « mosaïque » (repliements, vert de la variance) près de l'orifice, couleur du sens du flux à la périphérie (jet
  libre : vitesse maximale sur le premier dixième, puis en 1/distance, profil en cloche) ; zone de convergence (PISA)
  en amont de l'orifice, sang aspiré de plus en plus vite (v = Q / 2πr²), changement de couleur là où v atteint la
  limite de Nyquist. Chronologie du cycle du modèle : fuites mitrale et tricuspide holosystoliques, fuite aortique
  holodiastolique décroissante, remplissage en ondes E et A, éjection maximale au premier tiers. Flux : remplissage
  mitral et tricuspide, éjection aortique et pulmonaire (laminaires, sans repliement) ; insuffisance aortique
  (centrale, ≈ 4 m/s), mitrale par prolapsus de P2 (jet excentré vers l'avant, opposé au feuillet qui prolabe,
  ≈ 5 m/s), tricuspide fonctionnelle (centrale, ≈ 2,8 m/s) ; rétrécissements aortique (≈ 4,5 m/s), mitral
  (≈ 1,9 m/s, dôme de convergence côté oreillette) et pulmonaire. Rendu en **jets de fumée** : bouffées floues et
  grumeleuses qui naissent à l'orifice, s'élargissent, tourbillonnent et s'estompent, chacune colorée par sa vitesse
  réelle ; elles avancent bien moins vite que le sang (quelques dixièmes de seconde pour parcourir le jet) pour que le
  mouvement se lise. Jets entiers (ils sortent de la cavité ouverte vers l'observateur), parties cachées par les tissus
  visibles en transparence ; cœur arrêté : nuage établi à cet instant ; en écran partagé, flux de chaque moitié. Légende sur le côté (lien de la vue : `doppler=1`).
  - **Aortique** : normale, bicuspidie type 1 L-R (Sievers), RAo serré dégénératif (calcifié au stade évolué : amas
    calcaires sur toute la cuspide jusqu'aux commissures, bord libre épaissi, festonné et rétracté par endroits,
    commissures libres, petit orifice irrégulier), insuffisance par dilatation de la
    racine (type I d'El Khoury : cuspides normales, coaptation basse, défaut de fermeture central d'≈ 0,4 cm²), TAVI
    (bioprothèse à ballonnet de type SAPIEN 3, taille 29 : armature en cobalt-chrome de 22,5 mm à cellules en losange
    et grandes cellules hautes, jupe en tissu, feuillets en péricarde bovin, commissures alignées, cuspides natives
    calcifiées plaquées contre les sinus). **Animation de l'implantation** (js/tavi-anim.js), lancée au choix de « TAVI »
    (bouton « Voir l'implantation » pour la revoir, « Arrêter ») : vue dans le plan de la crosse aortique (coupe passant
    par le centre de la valve, aorte ouverte sur toute sa longueur), cœur arrêté en diastole ; guide qui remonte
    l'aorte descendante et la crosse, franchit la valve et s'enroule dans le ventricule gauche (« queue de cochon ») ;
    cathéter bleu (≈ 14 F) avec la valve sertie (≈ 7 mm) sur son ballonnet, déjà dans son sens final (entrée vers le
    ventricule : elle arrive sur l'anneau sans pivoter), et le cône jaune ; centrage sur l'anneau ; gonflement
    (stimulation rapide) : l'armature se déploie et plaque la valve native ; dégonflement et retrait ; retrait du guide ;
    puis directement la vue chirurgicale (bref fondu), la nouvelle valve bat. Caméra : plan large sur la crosse,
    rapproché sur la valve du positionnement jusqu'au retrait du guide ; légende de chaque étape (7) au-dessus du
    cycle. Trajet : ligne centrale de la lumière aortique (barycentres successifs, lissée), puis chambre de chasse et
    ventricule gauche par le milieu de sa cavité, dans la moitié gardée par la coupe (barycentres de tranches de la
    cavité, recentrés par la distance signée à l'endocarde : le guide ne passe ni dans le septum ni devant sa tranche).
    Ouvertes, les cuspides normales restent à distance de la paroi des sinus
    (bord libre à ≈ 0,76 rayon : orifice 41 % plus petit que l'anneau, Lansac 2019) ; à travers l'orifice, on voit la
    chambre de chasse et le ventricule.
  - **Mitrale** (aorte à 12 h, auricule gauche à gauche en vue C) : normale (A1-A3, P1-P3),
    insuffisance par prolapsus de P2 avec rupture de cordage (segment flottant, cordages rompus, brèche de coaptation),
    rétrécissement rhumatismal (commissures soudées, orifice en « bouche de poisson » d'≈ 1 cm², feuillet antérieur
    bombé en diastole, bords libres épaissis, calcifications commissurales, cordages épaissis, soudés et raccourcis).
  - **Pulmonaire** (cuspide antérieure à 12 h ; vue C depuis le tronc pulmonaire, vue V depuis l'infundibulum du VD) :
    normale (cuspides antérieure, droite et gauche), rétrécissement congénital en dôme (commissures soudées, raphés,
    dôme systolique percé d'un orifice central de ≈ 6,5 mm). La racine pulmonaire est creusée de l'anneau au début de la
    lumière du tronc (≈ 1,1 cm plus haut dans BodyParts3D) : ni tranche de muscle ni surface externe repliée devant
    les cuspides ; vue C coupée à 1,12 hauteur de cuspide.
  - **Tricuspide** (feuillet septal en bas) : normale, insuffisance fonctionnelle par
    dilatation de l'anneau (anneau, oreillette et ventricule droits élargis sur la paroi libre par la déformation du
    cœur, feuillets attirés vers le ventricule, défaut de coaptation central).
- **FOP** (js/special-views.js) : **fosse ovale normale** vue de l'oreillette droite (paroi libre retirée) — fosse
  placée sur la zone la plus mince du septum (19 × 16 mm, plancher mince du septum primum, limbe en fer à cheval ouvert
  vers le bas, Naqvi 2018) ; **FOP · test aux bulles** : coupe bicave comme en ETO (OG en haut, veine cave supérieure à
  droite), postérieure : elle passe par la fosse ovale (plancher et limbe en coupe) et par le tunnel, au bord supérieur
  de la fosse, un peu en avant (≈ 3 mm, Goel 2009) ; 1 280 bulles du sérum salé agité arrivent
  par les veines caves et une partie passe dans l'OG pendant la contraction auriculaire et le début de la systole
  (Langholz 1991 ; positivité dans les 3 cycles, ASE/SCAI 2015).
- **Coronaires** (js/special-views.js, js/heart.js) : vue de face du cœur qui bat, **normale** ou **infarctus de
  l'IVA** — occlusion au début de l'IVA 2 (après la 1re diagonale), aval assombri (trouvé par connexité du maillage),
  akinésie des segments 7, 8, 13, 14 et 17 du modèle AHA (ni épaississement, ni mouvement vers le centre, ni torsion),
  territoire plus terne ; comparaison en écran partagé.
- **Sélection** : étiquette au survol et à la sélection, « mode focus » (le reste passe en retrait).
- **Fiche** par structure (français ; traduction anglaise dans `js/data.en.js`).
- **Ombres** : ombres portées (lumière principale, carte d'ombre déformée avec le battement, reçues aussi par
  l'endocarde) et ombres de contact en espace écran (creux, sillons, jonctions valves–anneau, cordages–feuillets,
  piliers–paroi), calculées sur la profondeur de l'image réellement affichée : coupes et battement compris.
- **Hors ligne** : service worker mettant en cache l'application, le modèle et three.js (pas en local, pour que les
  essais tournent toujours sur la dernière version).
- **Chargement** : modèle au format compact HRT3 (≈ 2,2 Mo transférés), barre de progression.

## Lancer en local

```bash
npx --yes http-server . -p 8765 -c-1
```

Puis ouvrir <http://localhost:8765/>. Fichiers statiques ; three.js est chargé depuis jsDelivr
(version épinglée dans `index.html` et `sw.js`).

### Régénérer le modèle

`assets/heart.bin` est produit par `tools/build-heart-bp3d.mjs` (Node, sans dépendance) à partir
des maillages BodyParts3D, qui ne sont pas versionnés dans ce dépôt :

1. Télécharger `partof_BP3D_4.0_obj_99.zip` (62 Mo) depuis la
   [page de téléchargement BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)
   et le décompresser hors du dépôt.
2. Lancer la génération (≈ 30 min) :

```bash
node tools/build-heart-bp3d.mjs <chemin>/partof_BP3D_4.0_obj_99
```

L'outil affiche l'épaisseur obtenue pour le myocarde et la taille du fichier ; il écrit le format compact HRT3
(`tools/lib/hrt-codec.mjs` : normales recalculées dans le navigateur, positions et indices codés en écarts ; un
ancien fichier HRT2 se convertit avec `node tools/pack-heart.mjs`). Incrémenter ensuite
`VERSION` dans `sw.js` pour que les applications installées se mettent à jour.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page, barre d'outils, panneau |
| `css/style.css` | Styles (palette papier/encre, fond de studio de la scène, étiquettes, panneau mobile en tiroir) |
| `js/data.js`, `js/data.en.js` | Contenu pédagogique : structures, textes, ordre de la planche (FR, EN) |
| `js/heart.js` | Chargement du modèle, matériau « tissu » (shader), déformation du cycle cardiaque, conduction, clic et surbrillance |
| `js/valves.js` | Valves paramétriques (feuillets, cordages, cuspides) et leur ouverture |
| `js/special-views.js` | Rubriques FOP (fosse ovale, test aux bulles) et Coronaires (infarctus de l'IVA) |
| `js/doppler.js` | Doppler couleur des vues des valves : flux, fuites, jets de rétrécissement, zones de convergence |
| `js/av-views.js` | Vues C (chirurgicale) et V (ventriculaire) des valves mitrale et tricuspide dans le cœur : coupe, cadrage, variantes pathologiques |
| `js/aortic-view.js` | Vues C et V des valves aortique et pulmonaire dans le cœur : coupe, cadrage, variantes (bicuspide, rétrécie, insuffisante, TAVI ; rétrécissement pulmonaire en dôme) |
| `js/tavi-anim.js` | Animation de l'implantation d'une TAVI (guide, cathéter, valve sertie, ballonnet, déploiement, retraits) |
| `js/contact-shadows.js` | Ombres de contact : occlusion ambiante en espace écran calculée sur la profondeur de l'image affichée ; écran partagé |
| `js/app.js` | Scène, coupes (clipping + capuchons stencil), vues des valves et comparaison, cycle cardiaque, liens, interface |
| `assets/heart.bin` | Modèle généré (ne pas modifier à la main) |
| `assets/reperes/` | Coupes de repérage des vues des valves (4 cavités, 5 cavités, frontale), rendues depuis l'application |
| `tools/build-heart-bp3d.mjs` | Génère `assets/heart.bin` à partir de BodyParts3D |
| `tools/lib/` | Distance aux maillages, extraction de surface (« surface nets »), lecture BodyParts3D, repères des valves, format compact du modèle, pilotage d'Edge pour les captures |
| `tools/pack-heart.mjs` | Convertit `assets/heart.bin` au format compact HRT3 |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |
| `tools/make-icons.mjs` | Régénère les icônes PNG (`node tools/make-icons.mjs`) |

## Repère et unités

Unités en centimètres. Repère monde : +x = gauche du patient, +y = haut, +z = avant.
En vue antérieure, le côté gauche du patient est donc à droite de l'écran, comme sur
une planche d'atlas. Les coordonnées BodyParts3D (mm ; y vers l'arrière, z vers le haut) sont
converties à la lecture (`tools/lib/bp3d-heart.mjs`).

## Source des données et licence

Géométrie : **BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0
International** ([licence](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)).
Les fichiers OBJ de 2011 portent encore l'ancienne mention CC BY-SA 2.1 Japon ; la page de licence
actuelle de la base indique CC BY 4.0. Le modèle de ce dépôt est une œuvre dérivée (pièces lissées
et ré-extraites, coronaires remises au calibre des atlas, myocarde ventriculaire, tronc brachio-céphalique et ligament artériel
reconstruits) ; l'attribution figure aussi dans l'application, au pied du panneau.

## Processus de relecture

Toute modification anatomique (positions, rapports, textes) doit être relue par un
relecteur indépendant expert en anatomie ; toute modification visuelle par un relecteur
« direction artistique ». Les comptes rendus sont consignés dans `docs/relectures/`.

## Avertissement

Modèle à visée pédagogique ; il ne remplace pas l'avis d'un médecin.
