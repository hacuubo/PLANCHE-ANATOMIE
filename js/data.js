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
      "Deux muscles papillaires (antérieur et postérieur) retiennent la valve mitrale par des cordages tendineux.",
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
    nom: 'Valve tricuspide', latin: 'Valva atrioventricularis dextra', groupe: 'valves', couleur: '#e3e8ea', coupe: true,
    resume: "Porte à trois feuillets entre l'oreillette droite et le ventricule droit. Elle s'ouvre pour laisser passer le sang vers le ventricule et se ferme pour l'empêcher de refluer.",
    details: [
      "Trois feuillets : antérieur, septal et postérieur, retenus par des cordages tendineux fixés aux muscles papillaires.",
      "C'est la plus grande des quatre valves (orifice de 3,5 à 4 cm de diamètre).",
    ],
  },
  'valve-pulmonaire': {
    nom: 'Valve pulmonaire', latin: 'Valva trunci pulmonalis', groupe: 'valves', couleur: '#e3e8ea', coupe: true,
    resume: "Valve de sortie du ventricule droit, à l'entrée du tronc pulmonaire. Trois petites poches en demi‑lune se gonflent pour la fermer.",
    details: [
      "Trois valvules semi‑lunaires (antérieure, droite et gauche), sans cordages.",
      "C'est la plus haute et la plus antérieure des quatre valves.",
    ],
    chiffres: ['Diamètre : ≈ 2,5 cm'],
  },
  'valve-mitrale': {
    nom: 'Valve mitrale', latin: 'Valva atrioventricularis sinistra (bicuspidalis)', groupe: 'valves', couleur: '#e3e8ea', coupe: true,
    resume: "Porte à deux feuillets entre l'oreillette gauche et le ventricule gauche. Son nom vient de sa ressemblance avec la mitre d'un évêque.",
    details: [
      "Deux feuillets : antérieur (ou aortique) et postérieur (ou mural), retenus par des cordages fixés aux deux muscles papillaires du ventricule gauche.",
      "Son feuillet antérieur est en continuité fibreuse avec la valve aortique.",
      "Les fuites (insuffisance) ou le rétrécissement de cette valve sont parmi les maladies valvulaires les plus fréquentes.",
    ],
    chiffres: ['Surface d’ouverture normale : 4 à 6 cm²'],
  },
  'valve-aortique': {
    nom: 'Valve aortique', latin: 'Valva aortae', groupe: 'valves', couleur: '#e3e8ea', coupe: true,
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
  'sinus-coronaire': {
    nom: 'Sinus coronaire', latin: 'Sinus coronarius', groupe: 'coronaires', couleur: '#3e519e',
    resume: "Grosse veine de la face arrière du cœur qui collecte le sang veineux du muscle cardiaque et le déverse dans l'oreillette droite.",
    details: [
      "Long de 3 à 5 cm, dans le sillon atrio‑ventriculaire postérieur. Il reçoit la grande veine cardiaque (qui accompagne l'IVA puis la circonflexe), la veine cardiaque moyenne et la petite veine cardiaque.",
      "Draine environ deux tiers du sang veineux du cœur. Les sondes de resynchronisation (pacemaker triple chambre) y sont introduites.",
    ],
  },
  'sillons': {
    nom: 'Sillons du cœur', latin: 'Sulcus coronarius, sulci interventriculares', groupe: 'coronaires', couleur: '#e8a846',
    resume: "Rainures à la surface du cœur, comblées de graisse, où cheminent les artères et veines coronaires. Elles marquent la limite entre les cavités.",
    details: [
      "Le sillon coronaire (atrio‑ventriculaire) fait le tour du cœur entre oreillettes et ventricules.",
      "Les sillons interventriculaires antérieur et postérieur séparent les deux ventricules et se rejoignent près de la pointe.",
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

// Ordre d'affichage dans la planche numérotée (style atlas).
export const ORDRE = [
  'oreillette-droite', 'auricule-droite', 'ventricule-droit', 'oreillette-gauche', 'auricule-gauche', 'ventricule-gauche', 'apex', 'septum-interventriculaire',
  'valve-tricuspide', 'valve-pulmonaire', 'valve-mitrale', 'valve-aortique',
  'aorte', 'tronc-brachio-cephalique', 'carotide-commune-gauche', 'subclaviere-gauche',
  'tronc-pulmonaire', 'artere-pulmonaire-droite', 'artere-pulmonaire-gauche', 'ligament-arteriel',
  'veine-cave-superieure', 'veine-cave-inferieure', 'veines-pulmonaires',
  'coronaire-droite', 'tronc-commun', 'iva', 'circonflexe', 'grande-veine-cardiaque', 'veine-cardiaque-moyenne', 'sinus-coronaire', 'sillons',
  'noeud-sinusal', 'noeud-av', 'faisceau-his',
];

export const INTRO = {
  titre: 'Le cœur et ses vaisseaux',
  texte: "Le cœur est une pompe musculaire de la taille d'un poing (environ 12 cm de haut, 250 à 350 g) logée au milieu du thorax, entre les deux poumons, derrière le sternum et un peu à gauche. Il est enveloppé d'un sac à double paroi, le péricarde. Il comporte quatre cavités : deux oreillettes qui reçoivent le sang, deux ventricules qui l'éjectent. Le côté droit envoie le sang vers les poumons, le côté gauche vers le reste du corps.",
  conseil: "Touchez une structure du modèle, ou choisissez‑la dans la liste, pour afficher son explication. Faites tourner le cœur avec le doigt ou la souris ; pincez pour zoomer.",
};
