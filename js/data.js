// Contenu pédagogique — Planche d'anatomie du cœur
// Chaque structure : nom courant, nom anatomique (Terminologia Anatomica), groupe,
// résumé destiné au patient, détails pour aller plus loin, repères chiffrés.
// Toute modification de fond doit être relue par l'agent « anatomiste ».

export const GROUPES = [
  { id: 'cavites',    titre: 'Cavités du cœur' },
  { id: 'valves',     titre: 'Valves (visibles en coupe)' },
  { id: 'vaisseaux',  titre: 'Grands vaisseaux' },
  { id: 'coronaires', titre: 'Vascularisation du cœur' },
  { id: 'conduction', titre: 'Système électrique (visible en coupe)' },
];

export const STRUCTURES = {
  /* ───────────── Cavités ───────────── */
  'oreillette-droite': {
    nom: 'Oreillette droite', latin: 'Atrium dextrum', groupe: 'cavites', couleur: '#3e519e',
    resume: "Première cavité que traverse le sang qui revient du corps, pauvre en oxygène. Elle le reçoit des deux veines caves, puis le pousse dans le ventricule droit à travers la valve tricuspide.",
    details: [
      "Forme le bord droit du cœur. Sa paroi est fine (2 mm environ) car la pression y est basse.",
      "Reçoit la veine cave supérieure (en haut), la veine cave inférieure (en bas) et le sinus coronaire (sang veineux du cœur lui‑même).",
      "Sa cloison avec l'oreillette gauche (septum interatrial) porte la fosse ovale, vestige du passage qui existait avant la naissance.",
      "Abrite le nœud sinusal, le « chef d'orchestre » électrique du cœur.",
    ],
    chiffres: ['Pression moyenne : 2 à 6 mmHg', 'Paroi : ≈ 2 mm'],
  },
  'auricule-droite': {
    nom: 'Auricule droite', latin: 'Auricula dextra', groupe: 'cavites', couleur: '#3e519e',
    resume: "Petit prolongement de l'oreillette droite, en forme de pavillon, qui vient recouvrir en avant la racine de l'aorte.",
    details: [
      "Sa paroi interne est tapissée de muscles pectinés, de petits reliefs musculaires.",
      "Contrairement à l'auricule gauche, elle est large et à base d'implantation étendue.",
    ],
  },
  'ventricule-droit': {
    nom: 'Ventricule droit', latin: 'Ventriculus dexter', groupe: 'cavites', couleur: '#3e519e',
    resume: "Pompe qui envoie le sang pauvre en oxygène vers les poumons par le tronc pulmonaire. C'est lui qui forme la plus grande partie de la face avant du cœur, juste derrière le sternum.",
    details: [
      "Reçoit le sang de l'oreillette droite par la valve tricuspide et l'éjecte par la valve pulmonaire.",
      "Sa paroi est mince (3 à 5 mm) : les poumons sont proches et la résistance à vaincre est faible.",
      "Sa chambre d'entrée est hérissée de trabécules charnues ; sa chambre de sortie (infundibulum ou cône artériel) est lisse et monte vers la valve pulmonaire.",
      "Trois muscles papillaires retiennent les feuillets de la valve tricuspide par des cordages.",
    ],
    chiffres: ['Pression systolique : ≈ 25 mmHg', 'Paroi : 3 à 5 mm'],
  },
  'oreillette-gauche': {
    nom: 'Oreillette gauche', latin: 'Atrium sinistrum', groupe: 'cavites', couleur: '#c43a33',
    resume: "Cavité située à l'arrière du cœur. Elle reçoit le sang riche en oxygène venant des poumons par les quatre veines pulmonaires et le transmet au ventricule gauche par la valve mitrale.",
    details: [
      "Forme l'essentiel de la base (face postérieure) du cœur, en avant de l'œsophage.",
      "Sa paroi interne est lisse, sauf dans l'auricule gauche.",
      "Les orifices des veines pulmonaires sont la zone traitée lors d'une ablation de fibrillation atriale.",
    ],
    chiffres: ['Pression moyenne : 6 à 12 mmHg', 'Paroi : ≈ 3 mm'],
  },
  'auricule-gauche': {
    nom: 'Auricule gauche', latin: 'Auricula sinistra', groupe: 'cavites', couleur: '#c43a33',
    resume: "Petit diverticule en forme de doigt qui part de l'oreillette gauche et vient border, par la gauche, l'origine du tronc pulmonaire.",
    details: [
      "Son intérieur est tapissé de muscles pectinés et son col est étroit.",
      "En cas de fibrillation atriale, le sang y stagne : c'est là que se forment la plupart des caillots responsables d'AVC, d'où l'intérêt des anticoagulants ou de sa fermeture.",
    ],
  },
  'ventricule-gauche': {
    nom: 'Ventricule gauche', latin: 'Ventriculus sinister', groupe: 'cavites', couleur: '#c43a33',
    resume: "La pompe principale : elle propulse le sang riche en oxygène dans l'aorte vers tout le corps. Sa paroi est trois fois plus épaisse que celle du ventricule droit, car la pression à produire est bien plus forte.",
    details: [
      "Forme la pointe (apex) et le bord gauche du cœur, ainsi que la plus grande partie de sa face inférieure.",
      "Reçoit le sang de l'oreillette gauche par la valve mitrale et l'éjecte par la valve aortique.",
      "Deux muscles papillaires (antérolatéral et postéro-médian) retiennent la valve mitrale par des cordages tendineux.",
      "À chaque battement, il éjecte environ 70 mL, soit un peu plus de la moitié de son contenu : c'est la « fraction d'éjection », normalement ≥ 55 %.",
    ],
    chiffres: ['Pression systolique : ≈ 120 mmHg', 'Paroi : 8 à 12 mm', 'Volume en fin de remplissage : ≈ 120 mL'],
  },
  'septum-interventriculaire': {
    nom: 'Septum interventriculaire', latin: 'Septum interventriculare', groupe: 'cavites', couleur: '#b25048', coupe: true,
    resume: "Cloison musculaire épaisse qui sépare les deux ventricules. Elle bombe dans le ventricule droit et fait partie de la pompe gauche.",
    details: [
      "Presque entièrement musculaire ; seule une petite zone en haut, sous la valve aortique, est fine et fibreuse (septum membraneux).",
      "Le faisceau de His et ses branches y cheminent pour conduire l'influx électrique aux ventricules.",
      "Ses deux tiers antérieurs sont irrigués par les branches septales de l'artère interventriculaire antérieure.",
    ],
  },
  'apex': {
    nom: 'Apex (pointe du cœur)', latin: 'Apex cordis', groupe: 'cavites', couleur: '#b25048',
    resume: "La pointe du cœur, formée par le ventricule gauche. Elle est dirigée en bas, en avant et à gauche.",
    details: [
      "Se projette dans le 5ᵉ espace intercostal gauche, un peu en dedans de la ligne passant par le milieu de la clavicule : c'est là qu'on perçoit le « choc de pointe » à chaque battement.",
    ],
  },

  /* ───────────── Valves ───────────── */
  'valve-tricuspide': {
    nom: 'Valve tricuspide', latin: 'Valva atrioventricularis dextra', groupe: 'valves', couleur: '#e8d3a2', coupe: true,
    resume: "Porte à trois feuillets entre l'oreillette droite et le ventricule droit. Elle s'ouvre pour laisser passer le sang vers le ventricule et se ferme pour l'empêcher de refluer.",
    details: [
      "Trois feuillets : antérieur, septal et postérieur, retenus par des cordages tendineux fixés aux muscles papillaires.",
      "C'est la plus grande des quatre valves (orifice de 3,5 à 4 cm de diamètre).",
    ],
  },
  'valve-pulmonaire': {
    nom: 'Valve pulmonaire', latin: 'Valva trunci pulmonalis', groupe: 'valves', couleur: '#e8d3a2', coupe: true,
    resume: "Valve de sortie du ventricule droit, à l'entrée du tronc pulmonaire. Trois petites poches en demi‑lune se gonflent pour la fermer.",
    details: [
      "Trois valvules semi‑lunaires (antérieure, droite et gauche), sans cordages.",
      "C'est la plus haute et la plus antérieure des quatre valves.",
    ],
    chiffres: ['Diamètre : ≈ 2,5 cm'],
  },
  'valve-mitrale': {
    nom: 'Valve mitrale', latin: 'Valva atrioventricularis sinistra (bicuspidalis)', groupe: 'valves', couleur: '#e8d3a2', coupe: true,
    resume: "Porte à deux feuillets entre l'oreillette gauche et le ventricule gauche. Son nom vient de sa ressemblance avec la mitre d'un évêque.",
    details: [
      "Deux feuillets : antérieur (ou aortique) et postérieur (ou mural), retenus par des cordages fixés aux deux muscles papillaires du ventricule gauche.",
      "Son feuillet antérieur est en continuité fibreuse avec la valve aortique.",
      "Les fuites (insuffisance) ou le rétrécissement de cette valve sont parmi les maladies valvulaires les plus fréquentes.",
    ],
    chiffres: ['Surface d’ouverture normale : 4 à 6 cm²'],
  },
  'valve-aortique': {
    nom: 'Valve aortique', latin: 'Valva aortae', groupe: 'valves', couleur: '#e8d3a2', coupe: true,
    resume: "Valve de sortie du ventricule gauche, à l'entrée de l'aorte. Située au centre du cœur, elle s'ouvre et se ferme environ 100 000 fois par jour.",
    details: [
      "Trois valvules semi‑lunaires (coronaire droite, coronaire gauche et non coronaire).",
      "Juste au‑dessus de chaque valvule, un renflement de l'aorte (sinus de Valsalva) ; les deux artères coronaires naissent de deux de ces sinus.",
      "Son rétrécissement avec l'âge (sténose aortique) est la maladie valvulaire la plus souvent traitée après 70 ans ; elle peut l'être par remplacement chirurgical ou par cathéter (TAVI).",
    ],
    chiffres: ['Diamètre : 2 à 2,5 cm'],
  },

  /* ───────────── Grands vaisseaux ───────────── */
  'aorte': {
    nom: 'Aorte', latin: 'Aorta : pars ascendens, arcus, pars descendens', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "La plus grosse artère du corps. Elle naît du ventricule gauche, monte (aorte ascendante), se recourbe vers la gauche (crosse) puis descend le long de la colonne vertébrale (aorte descendante) pour distribuer le sang oxygéné à tout l'organisme.",
    details: [
      "Aorte ascendante : 5 cm de long, 3 cm de diamètre ; elle donne les deux artères coronaires à sa naissance.",
      "Crosse de l'aorte : enjambe la bifurcation du tronc pulmonaire et la bronche gauche ; elle donne trois branches vers la tête et les bras.",
      "Aorte descendante : descend à gauche de la colonne, en arrière de l'oreillette gauche et de l'œsophage, puis traverse le diaphragme vers l'abdomen.",
    ],
    chiffres: ['Débit au repos : ≈ 5 L/min', 'Diamètre : ≈ 3 cm à la racine'],
  },
  'tronc-brachio-cephalique': {
    nom: 'Tronc brachio‑céphalique', latin: 'Truncus brachiocephalicus', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "Première branche de la crosse aortique. Elle se divise rapidement en artère carotide commune droite (vers la tête) et artère subclavière droite (vers le bras droit).",
    details: ["Longue de 4 à 5 cm, elle se divise derrière l'articulation entre le sternum et la clavicule droite."],
  },
  'carotide-commune-gauche': {
    nom: 'Artère carotide commune gauche', latin: 'A. carotis communis sinistra', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "Deuxième branche de la crosse ; elle monte dans le cou pour irriguer la moitié gauche de la tête et du cerveau.",
    details: ["Contrairement à la droite, elle naît directement de l'aorte."],
  },
  'subclaviere-gauche': {
    nom: 'Artère subclavière gauche', latin: 'A. subclavia sinistra', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "Troisième branche de la crosse ; elle passe sous la clavicule gauche vers le bras gauche.",
    details: ["Elle donne l'artère vertébrale gauche, qui participe à l'irrigation de l'arrière du cerveau."],
  },
  'tronc-pulmonaire': {
    nom: 'Tronc pulmonaire', latin: 'Truncus pulmonalis', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "Gros vaisseau qui part du ventricule droit et emmène le sang pauvre en oxygène vers les poumons. Avec ses deux branches, c'est la seule artère du corps à transporter du sang « bleu ».",
    details: [
      "Long de 5 cm, large de 3 cm. Il naît en avant de l'aorte, passe à sa gauche, puis se divise sous la crosse aortique en artères pulmonaires droite et gauche.",
      "La pression y est basse (≈ 25/10 mmHg) : c'est la « petite circulation ».",
    ],
  },
  'artere-pulmonaire-droite': {
    nom: 'Artère pulmonaire droite', latin: 'A. pulmonalis dextra', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "Branche droite du tronc pulmonaire, elle rejoint le poumon droit.",
    details: ["Plus longue que la gauche, elle passe en arrière de l'aorte ascendante et de la veine cave supérieure."],
  },
  'artere-pulmonaire-gauche': {
    nom: 'Artère pulmonaire gauche', latin: 'A. pulmonalis sinistra', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "Branche gauche du tronc pulmonaire, elle rejoint le poumon gauche.",
    details: ["Plus courte, elle passe en avant de l'aorte descendante et est reliée à la crosse aortique par le ligament artériel."],
  },
  'ligament-arteriel': {
    nom: 'Ligament artériel', latin: 'Ligamentum arteriosum', groupe: 'vaisseaux', couleur: '#e8a846',
    resume: "Petit cordon fibreux entre l'artère pulmonaire gauche et la crosse aortique : c'est le vestige du canal artériel, un raccourci qui existait avant la naissance, quand les poumons ne servaient pas encore.",
    details: ["Le canal se ferme dans les premiers jours de vie. S'il reste ouvert (persistance du canal artériel), on peut le fermer par cathéter."],
  },
  'veine-cave-superieure': {
    nom: 'Veine cave supérieure', latin: 'Vena cava superior', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "Grosse veine qui ramène dans l'oreillette droite le sang de la tête, du cou, des bras et du thorax.",
    details: ["Longue de 7 cm, sans valvule, elle s'abouche au toit de l'oreillette droite. Les sondes de stimulateur cardiaque (pacemaker) passent par elle."],
  },
  'veine-cave-inferieure': {
    nom: 'Veine cave inférieure', latin: 'Vena cava inferior', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "Grosse veine qui ramène dans l'oreillette droite le sang de tout le bas du corps : jambes, bassin, abdomen.",
    details: ["Elle traverse le diaphragme et s'abouche à la partie basse et postérieure de l'oreillette droite, après un court trajet dans le thorax."],
  },
  'veines-pulmonaires': {
    nom: 'Veines pulmonaires', latin: 'Venae pulmonales', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "Quatre veines (deux de chaque poumon) qui ramènent le sang riche en oxygène dans l'oreillette gauche. Ce sont les seules veines du corps à transporter du sang « rouge ».",
    details: [
      "Une veine supérieure et une veine inférieure de chaque côté, de 1 à 1,5 cm de diamètre, sans valvule.",
      "Leur abouchement dans l'oreillette gauche est le point de départ habituel de la fibrillation atriale : on l'isole électriquement lors d'une ablation.",
    ],
  },

  /* ───────────── Coronaires ───────────── */
  'coronaire-droite': {
    nom: 'Artère coronaire droite', latin: 'A. coronaria dextra', groupe: 'coronaires', couleur: '#c43a33',
    resume: "Naît de l'aorte juste au‑dessus de la valve aortique et chemine dans le sillon entre l'oreillette droite et le ventricule droit, qu'elle contourne pour atteindre la face inférieure du cœur.",
    details: [
      "Irrigue le ventricule droit, la paroi inférieure du ventricule gauche et, le plus souvent, les deux nœuds du système électrique.",
      "Chez 70 à 85 % des personnes, elle donne l'artère interventriculaire postérieure (« dominance droite »).",
      "Son occlusion provoque un infarctus inférieur, souvent accompagné d'un ralentissement du cœur.",
    ],
  },
  'tronc-commun': {
    nom: 'Tronc commun (coronaire gauche)', latin: 'A. coronaria sinistra', groupe: 'coronaires', couleur: '#c43a33',
    resume: "Court segment (0,5 à 2 cm, un centimètre en moyenne) qui naît de l'aorte, passe entre le tronc pulmonaire et l'auricule gauche, et se divise en deux grosses artères : l'interventriculaire antérieure et la circonflexe.",
    details: ["À lui seul, il irrigue la majeure partie du ventricule gauche : son rétrécissement est traité en priorité."],
  },
  'iva': {
    nom: 'Artère interventriculaire antérieure (IVA)', latin: 'Ramus interventricularis anterior', groupe: 'coronaires', couleur: '#c43a33',
    resume: "Descend sur la face avant du cœur, dans le sillon qui sépare les deux ventricules, jusqu'à la pointe. C'est l'artère la plus importante du cœur.",
    details: [
      "Donne des branches diagonales vers la paroi avant‑gauche du ventricule gauche et des branches septales vers la cloison interventriculaire.",
      "Irrigue près de la moitié du muscle du ventricule gauche. Son occlusion provoque l'infarctus antérieur, le plus étendu.",
    ],
  },
  'circonflexe': {
    nom: 'Artère circonflexe', latin: 'Ramus circumflexus', groupe: 'coronaires', couleur: '#c43a33',
    resume: "Contourne le bord gauche du cœur en passant sous l'auricule gauche, dans le sillon entre l'oreillette et le ventricule gauches.",
    details: [
      "Donne les artères marginales (obtuses) qui irriguent la paroi latérale du ventricule gauche.",
      "Chez environ 10 % des personnes, elle donne l'artère interventriculaire postérieure (« dominance gauche ») ; chez d'autres, les deux coronaires se partagent la face inférieure (« codominance »).",
    ],
  },
  'grande-veine-cardiaque': {
    nom: 'Grande veine du cœur', latin: 'Vena cardiaca magna', groupe: 'coronaires', couleur: '#a194b6',
    resume: "Principale veine de la face avant du cœur. Elle naît près de la pointe, remonte le long de l'artère interventriculaire antérieure, puis contourne le bord gauche du cœur avec l'artère circonflexe pour se jeter dans le sinus coronaire.",
    details: [
      "Elle draine le sang veineux de la plus grande partie du ventricule gauche et de la partie antérieure de la cloison.",
      "En chemin, elle reçoit la veine marginale gauche, qui descend le long du bord gauche du cœur.",
      "Elle se prolonge par le sinus coronaire, en arrière du cœur ; une petite valvule marque souvent leur jonction.",
    ],
  },
  'veine-cardiaque-moyenne': {
    nom: 'Veine cardiaque moyenne', latin: 'Vena cardiaca media', groupe: 'coronaires', couleur: '#a194b6',
    resume: "Veine de la face inférieure du cœur. Elle remonte de la pointe dans le sillon interventriculaire postérieur, à côté de l'artère interventriculaire postérieure, et se jette dans le sinus coronaire près de son abouchement.",
    details: [
      "Elle draine la face inférieure des deux ventricules et la partie postérieure de la cloison.",
      "Elle accompagne l'artère interventriculaire postérieure, le plus souvent une branche de la coronaire droite.",
    ],
  },
  'petites-veines-cardiaques': {
    nom: 'Autres veines du cœur', latin: 'Venae cordis', groupe: 'coronaires', couleur: '#a194b6',
    resume: "Petites veines qui ramènent le sang de la face arrière du ventricule gauche et des bords droit et gauche du cœur. Elles se jettent dans le sinus coronaire ou dans la grande veine du cœur.",
    details: [
      "La veine postérieure du ventricule gauche draine la face arrière du ventricule gauche.",
      "La petite veine du cœur suit la coronaire droite dans le sillon entre l'oreillette et le ventricule droits ; les veines marginales longent les bords du cœur.",
      "Les sondes de resynchronisation (stimulateur « triple chambre ») sont souvent placées dans l'une de ces veines, par le sinus coronaire.",
    ],
  },
  'sinus-coronaire': {
    nom: 'Sinus coronaire', latin: 'Sinus coronarius', groupe: 'coronaires', couleur: '#3e519e',
    resume: "Grosse veine de la face arrière du cœur qui collecte le sang veineux du muscle cardiaque et le déverse dans l'oreillette droite.",
    details: [
      "Long de 3 à 5 cm, dans le sillon atrio‑ventriculaire postérieur. Il reçoit la grande veine cardiaque (qui accompagne l'IVA puis la circonflexe), la veine cardiaque moyenne et la petite veine cardiaque.",
      "Draine environ deux tiers du sang veineux du cœur. Les sondes de resynchronisation (pacemaker triple chambre) y sont introduites.",
    ],
  },


  /* ───────────── Conduction ───────────── */
  'noeud-sinusal': {
    nom: 'Nœud sinusal', latin: 'Nodus sinuatrialis (Keith et Flack)', groupe: 'conduction', couleur: '#f3c23b', coupe: true,
    resume: "Le « pacemaker » naturel : un amas de cellules dans la paroi de l'oreillette droite, à l'arrivée de la veine cave supérieure, qui déclenche spontanément chaque battement.",
    details: ["Fréquence de repos : 60 à 100 battements par minute, modulée par le système nerveux (effort, émotion, sommeil)."],
  },
  'noeud-av': {
    nom: 'Nœud atrio‑ventriculaire', latin: 'Nodus atrioventricularis (Aschoff‑Tawara)', groupe: 'conduction', couleur: '#f3c23b', coupe: true,
    resume: "Seul point de passage électrique entre les oreillettes et les ventricules. Il freine l'influx d'un dixième de seconde pour laisser le temps aux oreillettes de se vider.",
    details: [
      "Situé dans la cloison entre les deux oreillettes, au plancher de l'oreillette droite, juste en avant de l'entrée du sinus coronaire (triangle de Koch).",
      "Si le nœud sinusal tombe en panne, il peut prendre le relais à 40‑60 battements par minute.",
    ],
  },
  'faisceau-his': {
    nom: 'Faisceau de His et branches', latin: 'Fasciculus atrioventricularis', groupe: 'conduction', couleur: '#f3c23b', coupe: true,
    resume: "Câble électrique qui traverse la cloison fibreuse séparant les oreillettes des ventricules, descend le long du haut de la cloison interventriculaire et se divise en une branche droite et une branche gauche, puis en un fin réseau (fibres de Purkinje) qui fait contracter les deux ventricules de façon coordonnée.",
    details: ["Un « bloc de branche » sur l'électrocardiogramme signifie que l'une de ces branches conduit mal."],
  },
};

// Ordre d'affichage et numéros des structures (liste du panneau, style atlas).
export const ORDRE = [
  'oreillette-droite', 'auricule-droite', 'ventricule-droit', 'oreillette-gauche', 'auricule-gauche', 'ventricule-gauche', 'apex', 'septum-interventriculaire',
  'valve-tricuspide', 'valve-pulmonaire', 'valve-mitrale', 'valve-aortique',
  'aorte', 'tronc-brachio-cephalique', 'carotide-commune-gauche', 'subclaviere-gauche',
  'tronc-pulmonaire', 'artere-pulmonaire-droite', 'artere-pulmonaire-gauche', 'ligament-arteriel',
  'veine-cave-superieure', 'veine-cave-inferieure', 'veines-pulmonaires',
  'coronaire-droite', 'tronc-commun', 'iva', 'circonflexe', 'grande-veine-cardiaque', 'veine-cardiaque-moyenne', 'petites-veines-cardiaques', 'sinus-coronaire',
  'noeud-sinusal', 'noeud-av', 'faisceau-his',
];

export const INTRO = {
  titre: 'Le cœur et ses vaisseaux',
  texte: "Le cœur est une pompe musculaire de la taille d'un poing (environ 12 cm de haut, 250 à 350 g) logée au milieu du thorax, entre les deux poumons, derrière le sternum et un peu à gauche. Il est enveloppé d'un sac à double paroi, le péricarde. Il comporte quatre cavités : deux oreillettes qui reçoivent le sang, deux ventricules qui l'éjectent. Le côté droit envoie le sang vers les poumons, le côté gauche vers le reste du corps.",
  conseil: "Touchez une structure du modèle, ou choisissez‑la dans la liste, pour afficher son explication. Faites tourner le cœur avec le doigt ou la souris ; pincez pour zoomer.",
};

// Vue chirurgicale de la valve aortique (js/aortic-view.js) : fiche de chaque variante
export const VALVE_AORTIQUE = {
  normale: {
    titre: 'Valve aortique normale',
    sousTitre: 'Vue du chirurgien, depuis l’aorte',
    texte: "La valve aortique sépare le ventricule gauche de l'aorte. Elle compte trois cuspides fines et souples, nommées d'après les artères coronaires qui naissent juste au-dessus d'elles : coronaire droite, coronaire gauche et non coronaire. Chacune est logée dans un renflement de l'aorte, le sinus de Valsalva.",
    details: [
      "À chaque battement, les trois cuspides s'ouvrent en grand triangle et laissent passer le sang du ventricule gauche vers l'aorte.",
      "Puis elles se referment en dessinant un « Y » : le sang ne revient pas vers le cœur.",
      "Les orifices des deux artères coronaires, qui nourrissent le muscle cardiaque, s'ouvrent dans les sinus droit et gauche.",
    ],
    chiffres: ['Surface d’ouverture : 3 à 4 cm²', 'Trois cuspides, trois sinus'],
  },
  bicuspide: {
    titre: 'Bicuspidie aortique type 1 L-R',
    sousTitre: 'Fusion des cuspides coronaires gauche et droite',
    texte: "La valve n'a que deux cuspides fonctionnelles au lieu de trois : depuis la naissance, les cuspides coronaires gauche et droite sont soudées en une seule, plus grande. Leur ligne de soudure forme une crête, le raphé. C'est la malformation cardiaque congénitale la plus fréquente ; la forme L-R (type 1 de la classification de Sievers) est de loin la plus courante.",
    details: [
      "La valve s'ouvre en « bouche de poisson » (orifice allongé) au lieu d'un grand triangle, et se ferme sur une seule ligne.",
      "Avec les années, elle peut s'épaissir et se calcifier, souvent d'abord le long du raphé, et se rétrécir ; elle peut aussi fuir.",
      "L'aorte ascendante peut se dilater : une échographie régulière permet de surveiller la valve et l'aorte.",
      "La bicuspidie est parfois héréditaire : une échographie peut être proposée aux proches parents (parents, frères et sœurs, enfants).",
    ],
    chiffres: ['1 à 2 % de la population', 'Type L-R : ≈ 3 bicuspidies sur 4'],
  },
  rao: {
    titre: 'Rétrécissement aortique serré dégénératif',
    sousTitre: 'Valve tricuspide calcifiée',
    texte: "Avec l'âge, les cuspides de la valve aortique s'épaississent et se chargent de calcium. Les amas calcaires apparaissent d'abord à leur base, sur la face tournée vers l'aorte, puis gagnent le corps des cuspides, la ligne de fermeture et le bord libre, qui devient épais, irrégulier et rétracté par endroits. Les cuspides restent séparées, mais devenues rigides, elles ne s'ouvrent plus qu'en un petit orifice irrégulier : le cœur doit forcer pour éjecter le sang.",
    details: [
      "Le rétrécissement est dit serré quand la surface d'ouverture est inférieure à 1 cm² ; le plus souvent, le jet de sang atteint au moins 4 m/s et le gradient de pression moyen au moins 40 mmHg à l'échographie.",
      "Il peut entraîner un essoufflement à l'effort, des douleurs dans la poitrine ou des malaises.",
      "Le traitement est le remplacement de la valve, par chirurgie ou par voie percutanée (TAVI), décidé par l'équipe cardiologique.",
    ],
    chiffres: ['Surface < 1 cm²', 'Vitesse max ≥ 4 m/s', 'Gradient moyen ≥ 40 mmHg'],
  },
};

// Vue chirurgicale de la valve mitrale (js/av-views.js)
export const VALVE_MITRALE = {
  normale: {
    titre: 'Valve mitrale normale',
    sousTitre: 'Vue du chirurgien, depuis l’oreillette gauche',
    texte: "La valve mitrale sépare l'oreillette gauche du ventricule gauche. Elle a deux feuillets : l'antérieur, grand et souple, tourné vers l'aorte, et le postérieur, plus court, découpé en trois festons appelés P1, P2 et P3 (les zones du feuillet antérieur qui leur font face sont A1, A2 et A3). Des cordages tendineux relient le bord des feuillets aux piliers du ventricule et les empêchent de se retourner.",
    details: [
      "Quand le ventricule se relâche, les feuillets s'ouvrent et le sang de l'oreillette remplit le ventricule.",
      "Quand il se contracte, ils se ferment en dessinant une ligne en forme de sourire : le sang part vers l'aorte et ne reflue pas vers les poumons.",
      "En vue « chirurgien », l'aorte est en haut et l'auricule gauche à gauche, comme le chirurgien la voit en ouvrant l'oreillette gauche.",
    ],
    chiffres: ['Surface d’ouverture : 4 à 6 cm²', 'Deux feuillets, deux piliers'],
  },
  prolapsus: {
    titre: 'Insuffisance mitrale par prolapsus de P2',
    sousTitre: 'Rupture de cordage, feuillet postérieur flottant',
    texte: "Un ou plusieurs cordages qui retenaient le milieu du feuillet postérieur (P2) se sont rompus. Ce segment n'est plus tenu : à chaque contraction, il remonte au-dessus de l'anneau et son bord se retourne dans l'oreillette. Les deux feuillets ne se rejoignent plus en regard de P2, et une partie du sang reflue vers l'oreillette gauche et les poumons.",
    details: [
      "C'est la forme la plus fréquente d'insuffisance mitrale « dégénérative », liée à une fragilité du tissu de la valve ; P2 est le segment le plus souvent atteint.",
      "Le reflux fatigue le cœur : essoufflement, fatigue, palpitations (fibrillation auriculaire) ; la rupture d'un cordage peut aussi survenir brutalement.",
      "L'insuffisance est dite sévère, à l'échographie, quand l'orifice de fuite atteint au moins 40 mm² ou le volume qui reflue au moins 60 mL par battement.",
      "Lorsqu'elle est possible, la réparation de la valve est le traitement de référence (résection du segment ou nouveaux cordages artificiels, anneau) ; une réparation par voie percutanée peut être proposée à certains patients.",
    ],
    chiffres: ['Orifice de fuite ≥ 40 mm²', 'Volume régurgité ≥ 60 mL', 'P2 : segment le plus touché'],
  },
};

// Vue chirurgicale de la valve tricuspide (js/av-views.js)
export const VALVE_TRICUSPIDE = {
  normale: {
    titre: 'Valve tricuspide normale',
    sousTitre: 'Vue depuis l’oreillette droite',
    texte: "La valve tricuspide sépare l'oreillette droite du ventricule droit. Elle a trois feuillets : antérieur (le plus grand), postérieur et septal, ce dernier fixé sur la cloison entre les deux ventricules. Comme la mitrale, elle est retenue par des cordages et des piliers ; c'est la plus grande des quatre valves du cœur.",
    details: [
      "Elle s'ouvre quand le ventricule droit se relâche et se ferme en Y quand il se contracte, pour que le sang parte vers les poumons sans refluer vers les veines.",
      "Le feuillet septal est présenté en bas ; l'orifice du sinus coronaire, qui ramène le sang des veines du cœur, s'ouvre tout près, dans l'oreillette droite.",
    ],
    chiffres: ['Surface d’ouverture : 7 à 9 cm²', 'Trois feuillets'],
  },
  dilatation: {
    titre: 'Insuffisance tricuspide par dilatation de l’anneau',
    sousTitre: 'Insuffisance « fonctionnelle » : feuillets normaux',
    texte: "Les feuillets sont normaux, mais l'anneau sur lequel ils sont attachés s'est élargi, surtout du côté de la paroi libre du ventricule (le côté du septum, fixé, se dilate peu). Les feuillets, devenus trop courts pour cet orifice et attirés vers le ventricule, ne se rejoignent plus au centre : le sang reflue vers l'oreillette droite et les veines.",
    details: [
      "C'est la forme la plus fréquente d'insuffisance tricuspide. Elle accompagne la dilatation des cavités droites : maladie d'une valve du cœur gauche, hypertension pulmonaire, fibrillation auriculaire au long cours.",
      "Elle peut donner des jambes gonflées, un gros foie, une fatigue, puis une surcharge des veines.",
      "Elle est dite sévère quand l'orifice de fuite atteint au moins 40 mm². Lors d'une chirurgie du cœur gauche, une réparation de la tricuspide (le plus souvent un anneau) est recommandée si la fuite est sévère ; elle peut aussi être envisagée pour une fuite moins importante quand l'anneau est dilaté (au moins 40 mm, ou plus de 21 mm/m²).",
      "Traitements : diurétiques, anneau prothétique chirurgical, ou techniques percutanées chez certains patients.",
    ],
    chiffres: ['Anneau ≥ 40 mm', 'Orifice de fuite ≥ 40 mm²'],
  },
};
