# Relecture — Réseau vasculaire du corps entier en 3D (1er novembre 2026)

Captures : `captures/v44-*.jpg`.

## Demande

La planche du corps entier ressemble plus à un dessin qu'à une planche anatomique. Il faut :
- l'améliorer à partir de références fiables trouvées sur internet et recoupées ;
- que l'ensemble des vaisseaux fusionne avec l'image du cœur, au milieu ;
- un rouge et un bleu plus travaillés, proches de ceux des livres d'anatomie ;
- un résultat professionnel.

## Références recoupées

| Repère | Valeur retenue | Sources |
|---|---|---|
| Bifurcation aortique | L4 (≈ 70 % des cas ; L4-L5) | StatPearls, *Anatomy, Abdomen and Pelvis, Aorta* ([NBK560486](https://ncbi.nlm.nih.gov/books/NBK560486)) ; étude cadavérique thaïe et étude IRM ([Folia Morphologica](https://api.core.ac.uk/oai/oai:czasopisma.viamedica.pl:article/68879)) |
| Formation de la veine cave inférieure | L5, à droite de la ligne médiane | StatPearls ([Arteries and Veins](https://dev2.statpearls.com/articlelibrary/viewarticle/32326)) |
| Tronc cœliaque, mésentérique supérieure, rénales, mésentérique inférieure | T12, L1, L1-L2, L3 | [Radiopaedia](https://radiopaedia.org/articles/abdominal-aorta-1?lang=gb) ; étude cadavérique ([Folia Morphologica 2011](https://journals.viamedica.pl/folia_morphologica/article/view/19284)) ; étude de 300 cas ([JCDR](https://jcdr.net/articles/PDF/17062/59567_CE(Vi)_F[SH]_PF1(AG_KM)_PFA(AG_KM)_PN(KM).pdf)) |
| Bifurcation carotidienne | Bord supérieur du cartilage thyroïde, C4 (souvent C3-C4) | Études TDM ([Surg Radiol Anat](https://link.springer.com/article/10.1007/s00276-008-0337-2), [EJRNM](https://link.springer.com/10.1186/s43055-023-01171-1), [PMC11246274](https://pmc.ncbi.nlm.nih.gov/articles/PMC11246274)) |
| Division de l'artère humérale | Col du radius, dans la fosse du coude (85 à 97 % des cas) | [Descriptive study on bifurcation of the brachial artery](https://ir.lib.pdn.ac.lk/handle/20.500.14444/4009) ; [Translational Research in Anatomy 2022](https://doaj.org/article/ae63e42e9c3d48cd960fb11a168ba3cc) |
| Division de l'artère poplitée | Tibiale antérieure et tronc tibio-fibulaire, puis tibiale postérieure et fibulaire | [Gross anatomy of the central and peripheral arterial system](https://clasi.edvance360.com/upload/readingsohs/media/html/15/I_17783_F/Chapter1GrossAnatomyofthecentralandperipheralarterial.pdf) |
| Grande saphène | Devant la malléole médiale, face médiale de la jambe, jonction saphéno-fémorale ≈ 3,7 cm en dehors du tubercule pubien | [Kenhub](https://www.kenhub.com/en/library/anatomy/great-saphenous-vein) ; [PMC9872368](https://pmc.ncbi.nlm.nih.gov/articles/PMC9872368) ; [F1000Research 15-349](https://f1000research.com/articles/15-349/v1) |
| Veines du membre supérieur | Céphalique par le sillon delto-pectoral ; basilique et humérales formant l'axillaire au bord inférieur du grand rond | [Cephalic vein](https://en.wikipedia.org/wiki/Cephalic_vein) ; [Taylor & Francis, Upper limb](https://taylorandfrancis.com/knowledge/medicine-and-healthcare/cardiology/axillary-vein/) |
| Calibres artériels | Aorte sous-rénale ≈ 1,7-2 cm ; iliaque commune ≈ 0,9 ; fémorale ≈ 0,8-1 ; poplitée ≈ 0,7 ; jambières ≈ 0,4 ; radiale et ulnaire ≈ 0,2 ; humérale ≈ 0,45 | [MRA, artères des membres inférieurs (PMC6010244)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6010244) ; [aorte (Florence)](https://flore.unifi.it/bitstream/2158/782197/1/Chapter%2022%20%28Aorta%29%20F.pdf) ; [radiale et ulnaire](https://brieflands.com/articles/ijr-12904.html) |
| Calibres veineux | Veine cave inférieure ≈ 2,1-2,5 cm | [Aorta, its branches & the IVC](https://open-exam-prep.com/study-guides/arrt-sonography/abd-vasculature/aorta-ivc) ; [étude TDM soudanaise](https://repository.sustech.edu/handle/123456789/22303) |

Les niveaux vertébraux sont placés sur la planche (corps de 175 cm, 5,45 unités par cm) :

| Vertèbre | T12 | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|---|
| Niveau sur la planche | 340 | 352 | 366 | 396 | 414 | 430 |

## Ce qui a été fait

1. **Rendu en 3D, comme un atlas** (js/app.js, `heartPlate`).
   - **Un seul rendu.** Les vaisseaux du corps ne sont plus dessinés à plat. Chaque vaisseau est un tube 3D le long de
     sa ligne centrale, à son calibre, rendu dans la même image que le cœur du modèle : même lumière, mêmes matières.
   - **Raccords.** Les vaisseaux du tronc partent des extrémités des gros vaisseaux du modèle.
     - Pendant ce rendu, l'aorte descendante et la veine cave inférieure du modèle sont coupées net par un plan
       horizontal.
     - Le tube part de la section, au même calibre : le raccord est invisible (v44-03).
   - **Rouge et bleu travaillés.**
     - L'ombrage est traduit en dégradés, le même pour le cœur et pour le corps :
       - rouge : ombre bordeaux, rouge franc, reflet rosé ;
       - bleu : ombre marine, bleu, reflet clair.
     - Le rouge va au sang oxygéné : aorte et ses branches, veines pulmonaires.
     - Le bleu va au sang pauvre en oxygène : veines, artères pulmonaires.
   - **Reins en 3D.** Le droit est plus bas que le gauche, le hile en dedans, et les vaisseaux rénaux y aboutissent
     (v44-02).
   - **Ombre portée** douce sur la peau.
2. **Réseau anatomique** (js/route-intro.js, `vesselNetwork`).
   - **Calage.** Le réseau est calé sur les repères et les calibres ci-dessus.
   - **Branches ajoutées, côté artères.**
     - Viscérales : tronc cœliaque et ses trois branches (splénique sinueuse), mésentérique supérieure et ses branches,
       mésentérique inférieure, gonadiques.
     - Bassin et cuisse : iliaques internes et leurs branches, épigastrique inférieure, circonflexes, fémorale profonde.
     - Genou et pied : géniculées, tronc tibio-fibulaire, fibulaire, arquée.
     - Tête et cou : vertébrales, thyroïdienne supérieure, linguale, maxillaire.
     - Membre supérieur : thoraco-acromiale, thoracique latérale, humérale profonde, interosseuse, arcade palmaire
       profonde.
   - **Branches ajoutées, côté veines.** Humérales, médiane de l'avant-bras, réseau dorsal de la main, fémorale
     profonde, affluents de la grande saphène, saphène accessoire, gonadiques.
   - **Profondeurs.** Elles donnent les bons croisements :
     - troncs brachiocéphaliques devant les branches de la crosse ;
     - veines sous-clavières devant les artères ;
     - veine rénale gauche entre l'aorte et la mésentérique supérieure ;
     - veine iliaque commune gauche derrière l'artère iliaque commune droite ;
     - veines superficielles devant les profondes.
3. **Images livrées toutes faites** (assets/planche/, tools/make-plate.mjs).
   - Deux images WebP : le corps entier à 10 px/cm (184 Ko) et le tronc à 36 px/cm (441 Ko), pour les plans rapprochés.
   - Elles sont chargées au démarrage : l'introduction démarre sans calcul.
   - L'outil est à relancer après toute modification du modèle, du réseau ou du rendu. À défaut d'images, le rendu se
     fait au premier lancement.

## Vérification (navigateur sans fenêtre, 1400 × 900)

- **Planche** :
  - corps entier (v44-01) ;
  - tronc, reins et branches viscérales (v44-02) ;
  - cœur et raccords (v44-03).
- **Trajets** : FOP (v44-04), pacemaker (v44-05).
- **Relais** : la vue 3D se superpose toujours à la planche (v44-06).
- **Lancement** : le clic sur « TAVI » démarre l'introduction en ≈ 0,3 s ; le rendu en direct prenait 15 s.
- **Erreurs JavaScript** : aucune.
