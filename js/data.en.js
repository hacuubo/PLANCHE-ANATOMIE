// Educational content — Anatomical plate of the heart (English version)
// Each structure: common name, anatomical name (Terminologia Anatomica), group,
// patient-oriented summary, further details, key figures.
// Scientific translation of js/data.js. Object keys (ids) and property names
// are deliberately kept identical to the French file so that this one is a
// drop-in replacement for the 3D model (js/heart.js) and the UI.
// Any substantive change must be reviewed by the "anatomist" agent.

export const GROUPES = [
  { id: 'cavites',    titre: 'Heart chambers' },
  { id: 'valves',     titre: 'Valves (visible in cross-section)' },
  { id: 'vaisseaux',  titre: 'Great vessels' },
  { id: 'coronaires', titre: 'Blood supply of the heart' },
  { id: 'conduction', titre: 'Conduction system (visible in cross-section)' },
];

export const STRUCTURES = {
  /* ───────────── Chambers ───────────── */
  'oreillette-droite': {
    nom: 'Right atrium', latin: 'Atrium dextrum', groupe: 'cavites', couleur: '#3e519e',
    resume: "The first chamber reached by oxygen-poor blood returning from the body. It receives this blood from the two venae cavae, then pushes it into the right ventricle through the tricuspid valve.",
    details: [
      "Forms the right border of the heart. Its wall is thin (about 2 mm) because the pressure inside is low.",
      "Receives the superior vena cava (above), the inferior vena cava (below) and the coronary sinus (venous blood from the heart itself).",
      "Its partition with the left atrium (interatrial septum) bears the fossa ovalis, the remnant of an opening that existed before birth.",
      "Houses the sinoatrial node, the electrical “conductor” of the heart.",
    ],
    chiffres: ['Mean pressure: 2–6 mmHg', 'Wall thickness: ≈ 2 mm'],
  },
  'auricule-droite': {
    nom: 'Right auricle (right atrial appendage)', latin: 'Auricula dextra', groupe: 'cavites', couleur: '#3e519e',
    resume: "A small, ear-shaped extension of the right atrium that overlaps the front of the aortic root.",
    details: [
      "Its inner wall is lined with pectinate muscles, small muscular ridges.",
      "Unlike the left auricle, it is broad and has a wide base of attachment.",
    ],
  },
  'ventricule-droit': {
    nom: 'Right ventricle', latin: 'Ventriculus dexter', groupe: 'cavites', couleur: '#3e519e',
    resume: "The pump that sends oxygen-poor blood to the lungs through the pulmonary trunk. It forms most of the anterior surface of the heart, directly behind the sternum.",
    details: [
      "Receives blood from the right atrium through the tricuspid valve and ejects it through the pulmonary valve.",
      "Its wall is thin (3–5 mm): the lungs are close by and the resistance to overcome is low.",
      "Its inflow chamber is ridged with trabeculae carneae; its outflow chamber (infundibulum, or conus arteriosus) is smooth and rises toward the pulmonary valve.",
      "Three papillary muscles hold the leaflets of the tricuspid valve by means of chordae tendineae.",
    ],
    chiffres: ['Systolic pressure: ≈ 25 mmHg', 'Wall thickness: 3–5 mm'],
  },
  'oreillette-gauche': {
    nom: 'Left atrium', latin: 'Atrium sinistrum', groupe: 'cavites', couleur: '#c43a33',
    resume: "A chamber located at the back of the heart. It receives oxygen-rich blood from the lungs through the four pulmonary veins and passes it on to the left ventricle through the mitral valve.",
    details: [
      "Forms most of the base (posterior surface) of the heart, in front of the esophagus.",
      "Its inner wall is smooth, except within the left auricle.",
      "The openings of the pulmonary veins are the area treated during ablation of atrial fibrillation.",
    ],
    chiffres: ['Mean pressure: 6–12 mmHg', 'Wall thickness: ≈ 3 mm'],
  },
  'auricule-gauche': {
    nom: 'Left auricle (left atrial appendage)', latin: 'Auricula sinistra', groupe: 'cavites', couleur: '#c43a33',
    resume: "A small finger-shaped pouch arising from the left atrium that borders the origin of the pulmonary trunk on its left side.",
    details: [
      "Its interior is lined with pectinate muscles and its neck is narrow.",
      "In atrial fibrillation, blood stagnates here: this is where most of the clots responsible for stroke form, hence the value of anticoagulants or of closing the appendage.",
    ],
  },
  'ventricule-gauche': {
    nom: 'Left ventricle', latin: 'Ventriculus sinister', groupe: 'cavites', couleur: '#c43a33',
    resume: "The main pump: it propels oxygen-rich blood into the aorta and on to the entire body. Its wall is three times thicker than that of the right ventricle, because the pressure it must generate is far higher.",
    details: [
      "Forms the apex and the left border of the heart, as well as most of its inferior surface.",
      "Receives blood from the left atrium through the mitral valve and ejects it through the aortic valve.",
      "Two papillary muscles (anterolateral and posteromedial) hold the mitral valve by means of chordae tendineae.",
      "With each beat it ejects about 70 mL, slightly more than half of its contents: this is the “ejection fraction”, normally ≥ 55%.",
    ],
    chiffres: ['Systolic pressure: ≈ 120 mmHg', 'Wall thickness: 8–12 mm', 'End-diastolic volume: ≈ 120 mL'],
  },
  'septum-interventriculaire': {
    nom: 'Interventricular septum', latin: 'Septum interventriculare', groupe: 'cavites', couleur: '#b25048', coupe: true,
    resume: "A thick muscular partition separating the two ventricles. It bulges into the right ventricle and functions as part of the left-sided pump.",
    details: [
      "Almost entirely muscular; only a small area at the top, beneath the aortic valve, is thin and fibrous (membranous septum).",
      "The bundle of His and its branches run through it to carry the electrical impulse to the ventricles.",
      "Its anterior two-thirds are supplied by the septal branches of the anterior interventricular artery.",
    ],
  },
  'apex': {
    nom: 'Apex (tip of the heart)', latin: 'Apex cordis', groupe: 'cavites', couleur: '#b25048',
    resume: "The tip of the heart, formed by the left ventricle. It points downward, forward and to the left.",
    details: [
      "Projects onto the fifth left intercostal space, slightly medial to the midclavicular line: this is where the “apex beat” is felt with each heartbeat.",
    ],
  },

  /* ───────────── Valves ───────────── */
  'valve-tricuspide': {
    nom: 'Tricuspid valve', latin: 'Valva atrioventricularis dextra', groupe: 'valves', couleur: '#e8d3a2', coupe: true,
    resume: "A three-leaflet gate between the right atrium and the right ventricle. It opens to let blood pass into the ventricle and closes to prevent it from flowing back.",
    details: [
      "Three leaflets: anterior, septal and posterior, held by chordae tendineae attached to the papillary muscles.",
      "It is the largest of the four valves (orifice 3.5–4 cm in diameter).",
    ],
  },
  'valve-pulmonaire': {
    nom: 'Pulmonary valve', latin: 'Valva trunci pulmonalis', groupe: 'valves', couleur: '#e8d3a2', coupe: true,
    resume: "The outlet valve of the right ventricle, at the entrance to the pulmonary trunk. Three small half-moon-shaped pockets fill with blood to close it.",
    details: [
      "Three semilunar cusps (anterior, right and left), without chordae.",
      "It is the highest and most anterior of the four valves.",
    ],
    chiffres: ['Diameter: ≈ 2.5 cm'],
  },
  'valve-mitrale': {
    nom: 'Mitral valve', latin: 'Valva atrioventricularis sinistra (bicuspidalis)', groupe: 'valves', couleur: '#e8d3a2', coupe: true,
    resume: "A two-leaflet gate between the left atrium and the left ventricle. Its name comes from its resemblance to a bishop's miter.",
    details: [
      "Two leaflets: anterior (or aortic) and posterior (or mural), held by chordae attached to the two papillary muscles of the left ventricle.",
      "Its anterior leaflet is in fibrous continuity with the aortic valve.",
      "Leakage (regurgitation) or narrowing (stenosis) of this valve are among the most common valvular diseases.",
    ],
    chiffres: ['Normal orifice area: 4–6 cm²'],
  },
  'valve-aortique': {
    nom: 'Aortic valve', latin: 'Valva aortae', groupe: 'valves', couleur: '#e8d3a2', coupe: true,
    resume: "The outlet valve of the left ventricle, at the entrance to the aorta. Located at the center of the heart, it opens and closes about 100,000 times a day.",
    details: [
      "Three semilunar cusps (right coronary, left coronary and non-coronary).",
      "Just above each cusp lies a bulge of the aortic wall (sinus of Valsalva); the two coronary arteries arise from two of these sinuses.",
      "Its narrowing with age (aortic stenosis) is the valvular disease most often treated after the age of 70; this can be done by surgical replacement or by catheter (TAVI).",
    ],
    chiffres: ['Diameter: 2–2.5 cm'],
  },

  /* ───────────── Great vessels ───────────── */
  'aorte': {
    nom: 'Aorta', latin: 'Aorta (ascendens, arcus, descendens)', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "The largest artery in the body. It arises from the left ventricle, ascends (ascending aorta), curves to the left (aortic arch) and then descends along the spine (descending aorta) to distribute oxygenated blood to the whole organism.",
    details: [
      "Ascending aorta: 5 cm long, 3 cm in diameter; it gives off the two coronary arteries at its origin.",
      "Aortic arch: straddles the bifurcation of the pulmonary trunk and the left main bronchus; it gives off three branches to the head and arms.",
      "Descending aorta: runs down to the left of the spine, behind the left atrium and the esophagus, then passes through the diaphragm into the abdomen.",
    ],
    chiffres: ['Resting cardiac output: ≈ 5 L/min', 'Diameter: ≈ 3 cm at the root'],
  },
  'tronc-brachio-cephalique': {
    nom: 'Brachiocephalic trunk', latin: 'Truncus brachiocephalicus', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "The first branch of the aortic arch. It soon divides into the right common carotid artery (to the head) and the right subclavian artery (to the right arm).",
    details: ["4–5 cm long, it divides behind the joint between the sternum and the right clavicle."],
  },
  'carotide-commune-gauche': {
    nom: 'Left common carotid artery', latin: 'A. carotis communis sinistra', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "The second branch of the arch; it ascends in the neck to supply the left half of the head and brain.",
    details: ["Unlike its right counterpart, it arises directly from the aorta."],
  },
  'subclaviere-gauche': {
    nom: 'Left subclavian artery', latin: 'A. subclavia sinistra', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "The third branch of the arch; it passes beneath the left clavicle toward the left arm.",
    details: ["It gives off the left vertebral artery, which contributes to the blood supply of the back of the brain."],
  },
  'tronc-pulmonaire': {
    nom: 'Pulmonary trunk', latin: 'Truncus pulmonalis', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "A large vessel that leaves the right ventricle and carries oxygen-poor blood to the lungs. Together with its two branches, it is the only artery in the body that carries “blue” blood.",
    details: [
      "5 cm long, 3 cm wide. It arises in front of the aorta, passes to its left, then divides beneath the aortic arch into the right and left pulmonary arteries.",
      "Pressure here is low (≈ 25/10 mmHg): this is the pulmonary, or “lesser”, circulation.",
    ],
  },
  'artere-pulmonaire-droite': {
    nom: 'Right pulmonary artery', latin: 'A. pulmonalis dextra', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "The right branch of the pulmonary trunk; it runs to the right lung.",
    details: ["Longer than the left, it passes behind the ascending aorta and the superior vena cava."],
  },
  'artere-pulmonaire-gauche': {
    nom: 'Left pulmonary artery', latin: 'A. pulmonalis sinistra', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "The left branch of the pulmonary trunk; it runs to the left lung.",
    details: ["Shorter, it passes in front of the descending aorta and is connected to the aortic arch by the ligamentum arteriosum."],
  },
  'ligament-arteriel': {
    nom: 'Ligamentum arteriosum', latin: 'Ligamentum arteriosum', groupe: 'vaisseaux', couleur: '#e8a846',
    resume: "A small fibrous cord between the left pulmonary artery and the aortic arch: it is the remnant of the ductus arteriosus, a shortcut that existed before birth, when the lungs were not yet in use.",
    details: ["The duct closes within the first days of life. If it stays open (patent ductus arteriosus), it can be closed by catheter."],
  },
  'veine-cave-superieure': {
    nom: 'Superior vena cava', latin: 'Vena cava superior', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "A large vein that returns blood from the head, neck, arms and chest to the right atrium.",
    details: ["7 cm long and valveless, it opens into the roof of the right atrium. Pacemaker leads are passed through it."],
  },
  'veine-cave-inferieure': {
    nom: 'Inferior vena cava', latin: 'Vena cava inferior', groupe: 'vaisseaux', couleur: '#3e519e',
    resume: "A large vein that returns blood from the entire lower body (legs, pelvis, abdomen) to the right atrium.",
    details: ["It passes through the diaphragm and, after a short course in the chest, opens into the lower posterior part of the right atrium."],
  },
  'veines-pulmonaires': {
    nom: 'Pulmonary veins', latin: 'Venae pulmonales', groupe: 'vaisseaux', couleur: '#c43a33',
    resume: "Four veins (two from each lung) that return oxygen-rich blood to the left atrium. They are the only veins in the body that carry “red” blood.",
    details: [
      "One superior and one inferior vein on each side, 1–1.5 cm in diameter, without valves.",
      "Their openings into the left atrium are the usual site of origin of atrial fibrillation: they are electrically isolated during ablation.",
    ],
  },

  /* ───────────── Coronary vessels ───────────── */
  'coronaire-droite': {
    nom: 'Right coronary artery', latin: 'A. coronaria dextra', groupe: 'coronaires', couleur: '#c43a33',
    resume: "Arises from the aorta just above the aortic valve and runs in the groove between the right atrium and the right ventricle, which it follows around to reach the inferior surface of the heart.",
    details: [
      "Supplies the right ventricle, the inferior wall of the left ventricle and, in most people, both nodes of the conduction system.",
      "In 70–85% of people it gives off the posterior interventricular artery (“right dominance”).",
      "Its occlusion causes an inferior myocardial infarction, often accompanied by a slowing of the heart rate.",
    ],
  },
  'tronc-commun': {
    nom: 'Left main coronary artery (left main stem)', latin: 'A. coronaria sinistra', groupe: 'coronaires', couleur: '#c43a33',
    resume: "A short segment (0.5–2 cm, about one centimeter on average) that arises from the aorta, passes between the pulmonary trunk and the left auricle, and divides into two large arteries: the anterior interventricular (left anterior descending) artery and the circumflex artery.",
    details: ["On its own it supplies most of the left ventricle: narrowing of this segment is treated as a priority."],
  },
  'iva': {
    nom: 'Anterior interventricular artery (LAD)', latin: 'Ramus interventricularis anterior', groupe: 'coronaires', couleur: '#c43a33',
    resume: "Descends on the anterior surface of the heart, in the groove separating the two ventricles, down to the apex. It is the most important artery of the heart.",
    details: [
      "Gives off diagonal branches to the anterolateral wall of the left ventricle and septal branches to the interventricular septum.",
      "Supplies nearly half of the left ventricular muscle. Its occlusion causes anterior myocardial infarction, the most extensive type.",
    ],
  },
  'circonflexe': {
    nom: 'Circumflex artery', latin: 'Ramus circumflexus', groupe: 'coronaires', couleur: '#c43a33',
    resume: "Curves around the left border of the heart, passing beneath the left auricle, in the groove between the left atrium and the left ventricle.",
    details: [
      "Gives off the (obtuse) marginal arteries, which supply the lateral wall of the left ventricle.",
      "In about 10% of people it gives off the posterior interventricular artery (“left dominance”); in others, the two coronary arteries share the inferior surface (“codominance”).",
    ],
  },
  'grande-veine-cardiaque': {
    nom: 'Great cardiac vein', latin: 'Vena cardiaca magna', groupe: 'coronaires', couleur: '#a194b6',
    resume: "The main vein of the front of the heart. It begins near the apex, runs up alongside the anterior interventricular artery, then curves around the left border of the heart with the circumflex artery to drain into the coronary sinus.",
    details: [
      "It drains venous blood from most of the left ventricle and the front part of the septum.",
      "Along the way it receives the left marginal vein, which runs down the left border of the heart.",
      "It continues as the coronary sinus at the back of the heart; a small valve often marks the junction.",
    ],
  },
  'veine-cardiaque-moyenne': {
    nom: 'Middle cardiac vein', latin: 'Vena cardiaca media', groupe: 'coronaires', couleur: '#a194b6',
    resume: "A vein on the inferior surface of the heart. It runs up from the apex in the posterior interventricular groove, beside the posterior interventricular artery, and drains into the coronary sinus near its opening.",
    details: [
      "It drains the inferior surface of both ventricles and the back part of the septum.",
      "It accompanies the posterior interventricular artery, most often a branch of the right coronary artery.",
    ],
  },
  'petites-veines-cardiaques': {
    nom: 'Other cardiac veins', latin: 'Venae cordis', groupe: 'coronaires', couleur: '#a194b6',
    resume: "Small veins that return blood from the back of the left ventricle and from the right and left borders of the heart. They drain into the coronary sinus or into the great cardiac vein.",
    details: [
      "The posterior vein of the left ventricle drains the back of the left ventricle.",
      "The small cardiac vein follows the right coronary artery in the groove between the right atrium and right ventricle; the marginal veins run along the borders of the heart.",
      "Cardiac resynchronization leads (biventricular, or “triple-chamber”, pacemakers) are often placed in one of these veins, through the coronary sinus.",
    ],
  },
  'sinus-coronaire': {
    nom: 'Coronary sinus', latin: 'Sinus coronarius', groupe: 'coronaires', couleur: '#3e519e',
    resume: "A large vein on the posterior surface of the heart that collects venous blood from the heart muscle and empties it into the right atrium.",
    details: [
      "3–5 cm long, lying in the posterior atrioventricular groove. It receives the great cardiac vein (which accompanies the LAD and then the circumflex artery), the middle cardiac vein and the small cardiac vein.",
      "Drains about two-thirds of the heart's venous blood. Resynchronization leads (biventricular, or “triple-chamber”, pacemakers) are introduced through it.",
    ],
  },
  'sillons': {
    nom: 'Sulci (grooves) of the heart', latin: 'Sulcus coronarius, sulci interventriculares', groupe: 'coronaires', couleur: '#e8a846',
    resume: "Grooves on the surface of the heart, filled with fat, in which the coronary arteries and veins run. They mark the boundaries between the chambers.",
    details: [
      "The coronary (atrioventricular) sulcus encircles the heart between the atria and the ventricles.",
      "The anterior and posterior interventricular sulci separate the two ventricles and meet near the apex.",
    ],
  },

  /* ───────────── Conduction system ───────────── */
  'noeud-sinusal': {
    nom: 'Sinoatrial node', latin: 'Nodus sinuatrialis (Keith and Flack)', groupe: 'conduction', couleur: '#f3c23b', coupe: true,
    resume: "The heart's natural pacemaker: a cluster of cells in the wall of the right atrium, at the entrance of the superior vena cava, that spontaneously triggers each heartbeat.",
    details: ["Resting rate: 60–100 beats per minute, modulated by the autonomic nervous system (exertion, emotion, sleep)."],
  },
  'noeud-av': {
    nom: 'Atrioventricular node', latin: 'Nodus atrioventricularis (Aschoff‑Tawara)', groupe: 'conduction', couleur: '#f3c23b', coupe: true,
    resume: "The only electrical pathway between the atria and the ventricles. It delays the impulse by about a tenth of a second to give the atria time to empty.",
    details: [
      "Located in the partition between the two atria, in the floor of the right atrium, just in front of the opening of the coronary sinus (triangle of Koch).",
      "If the sinoatrial node fails, it can take over at 40–60 beats per minute.",
    ],
  },
  'faisceau-his': {
    nom: 'Bundle of His and bundle branches', latin: 'Fasciculus atrioventricularis', groupe: 'conduction', couleur: '#f3c23b', coupe: true,
    resume: "An electrical cable that crosses the fibrous partition separating the atria from the ventricles, runs down the upper part of the interventricular septum and divides into a right and a left bundle branch, then into a fine network (Purkinje fibers) that makes the two ventricles contract in a coordinated way.",
    details: ["A “bundle branch block” on the electrocardiogram means that one of these branches is conducting poorly."],
  },
};

// Display order in the numbered plate (atlas style).
export const ORDRE = [
  'oreillette-droite', 'auricule-droite', 'ventricule-droit', 'oreillette-gauche', 'auricule-gauche', 'ventricule-gauche', 'apex', 'septum-interventriculaire',
  'valve-tricuspide', 'valve-pulmonaire', 'valve-mitrale', 'valve-aortique',
  'aorte', 'tronc-brachio-cephalique', 'carotide-commune-gauche', 'subclaviere-gauche',
  'tronc-pulmonaire', 'artere-pulmonaire-droite', 'artere-pulmonaire-gauche', 'ligament-arteriel',
  'veine-cave-superieure', 'veine-cave-inferieure', 'veines-pulmonaires',
  'coronaire-droite', 'tronc-commun', 'iva', 'circonflexe', 'grande-veine-cardiaque', 'veine-cardiaque-moyenne', 'petites-veines-cardiaques', 'sinus-coronaire', 'sillons',
  'noeud-sinusal', 'noeud-av', 'faisceau-his',
];

export const INTRO = {
  titre: 'The heart and its vessels',
  texte: "The heart is a muscular pump about the size of a fist (roughly 12 cm tall, 250–350 g) housed in the middle of the chest, between the two lungs, behind the sternum and slightly to the left. It is enclosed in a double-walled sac, the pericardium. It has four chambers: two atria that receive blood and two ventricles that eject it. The right side sends blood to the lungs, the left side to the rest of the body.",
  conseil: "Tap a structure on the model, or pick it from the list, to display its explanation. Rotate the heart with your finger or the mouse; pinch to zoom.",
};

// Surgical view of the aortic valve (js/aortic-view.js): description of each variant
export const VALVE_AORTIQUE = {
  normale: {
    titre: 'Normal aortic valve',
    sousTitre: 'Surgeon’s view, from the aorta',
    texte: "The aortic valve separates the left ventricle from the aorta. It has three thin, pliable cusps, named after the coronary arteries that arise just above them: right coronary, left coronary and non-coronary. Each sits in a bulge of the aortic root, the sinus of Valsalva.",
    details: [
      "With each heartbeat, the three cusps open into a wide triangle and let blood pass from the left ventricle into the aorta.",
      "They then close in a “Y” shape, so that blood does not flow back into the heart.",
      "The openings of the two coronary arteries, which supply the heart muscle, lie in the right and left sinuses.",
    ],
    chiffres: ['Valve area: 3–4 cm²', 'Annulus diameter: ≈ 2–2.5 cm'],
  },
  bicuspide: {
    titre: 'Bicuspid aortic valve, type 1 L-R',
    sousTitre: 'Fusion of the left and right coronary cusps',
    texte: "The valve has only two functional cusps instead of three: since birth, the left and right coronary cusps have been fused into a single, larger cusp. Their line of fusion forms a ridge, the raphe. This is the most common congenital heart defect; the L-R form (type 1 of the Sievers classification) is by far the most frequent.",
    details: [
      "The valve opens like a “fish mouth” (an elongated orifice) instead of a wide triangle, and closes along a single line.",
      "Over the years it may thicken and calcify, often first along the raphe, and become narrowed; it may also leak.",
      "The ascending aorta may dilate: regular echocardiography is used to monitor the valve and the aorta.",
      "Family screening may be offered, as bicuspid valves are sometimes inherited.",
    ],
    chiffres: ['1–2% of the population', 'L-R type: ≈ 3 in 4 bicuspid valves'],
  },
  rao: {
    titre: 'Severe degenerative aortic stenosis',
    sousTitre: 'Calcified tricuspid valve',
    texte: "With age, the cusps of the aortic valve thicken and become loaded with calcium. Calcified nodules first appear at their base, on the side facing the aorta, then spread along the line of closure. The cusps remain separate, but having become stiff, they open only to a small orifice: the heart has to work harder to eject blood.",
    details: [
      "Stenosis is called severe when the valve area is less than 1 cm², with a fast jet of blood (over 4 m/s) and a mean pressure gradient above 40 mmHg on echocardiography.",
      "It may cause breathlessness on exertion, chest pain or fainting spells.",
      "Treatment is valve replacement, either by surgery or by a catheter-based procedure (TAVI), decided by the heart team.",
    ],
    chiffres: ['Valve area < 1 cm²', 'Peak velocity > 4 m/s', 'Mean gradient > 40 mmHg'],
  },
};
