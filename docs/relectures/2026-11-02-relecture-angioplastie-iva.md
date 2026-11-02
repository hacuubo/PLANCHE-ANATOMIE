# Relecture — Angioplastie coronaire de l'IVA : infarctus et lésion serrée (2 novembre 2026)

## Demande

Deux animations réalistes d'angioplastie coronaire dans la rubrique Coronaires, toutes deux sur l'IVA :
1. un infarctus du myocarde ;
2. une lésion coronaire serrée.

Le vaisseau artériel doit être défini avec précision, ainsi que la succession des gestes, avec des références
scientifiques valides.

## Références retenues

- **Recommandations ESC 2023, syndromes coronaires aigus** (Byrne et al., Eur Heart J 2023 ; 44 : 3720).
  - Voie radiale et stent actif en routine.
  - Pas d'aspiration systématique du thrombus.
  - Délai du diagnostic à l'ouverture de l'artère inférieur à 120 min.
  - Double anti-agrégation plaquettaire de 12 mois par défaut.
  - Messages essentiels : <https://www.escardio.org/static-file/Escardio/Guidelines/Products/Slide%20sets/2023%20Gls/Essential%20Messages_2023%20ACS.pdf>
- **Recommandations ESC 2024, syndromes coronaires chroniques** (Vrints et al., Eur Heart J 2024 ; 45 : 3415).
  - FFR ou iFR pour les sténoses intermédiaires.
  - IVUS ou OCT pour les lésions complexes.
  - Double anti-agrégation plaquettaire de 6 mois par défaut.
  - Messages essentiels : <https://escardio.org/static-file/Escardio/Guidelines/Products/Essential%20Messages/2024%20EM/Essential%20Messages_2024%20CCS.pdf>
- **Essai TOTAL** (Jolly et al., N Engl J Med 2015) : aspiration systématique du thrombus sans bénéfice.
- **Grades de flux TIMI** (TIMI Study Group, N Engl J Med 1985 ; 312 : 932) : 0 = aucun passage, 3 = flux normal.
- **Paroi coronaire.**
  - Média ≈ 0,2 mm (Konishi et al., PLOS ONE 2023) : <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10065270/>
  - IVA à 1 cm de son origine : intima ≈ 0,16 mm, média ≈ 0,22 mm, adventice ≈ 0,17 mm (micrométrie d'autopsie).
- **Plaque vulnérable** : chape fibreuse inférieure à 65 µm sur un cœur nécrotique (Burke et al., N Engl J Med 1997 ;
  Virmani et al., Arterioscler Thromb Vasc Biol 2000) : <https://pmc.ncbi.nlm.nih.gov/articles/PMC3888649>
- **Remodelage positif** de la paroi sous la plaque (Glagov et al., N Engl J Med 1987).
- **Calibre de l'IVA** : ≈ 3,3 mm proximale, ≈ 2,7 mm moyenne, en angiographie quantitative (Dodge et al., Circulation
  1992 ; série de Katmandou, 2023).
- **Stents actifs** : mailles de 60 à 81 µm selon les modèles (Orsiro 60/80 µm, Synergy 74 µm, Xience 81 µm, données
  des fabricants).
- **Déroulé de l'angioplastie** :
  1. accès radial ;
  2. anticoagulation ;
  3. sonde guide (EBU/XB pour l'IVA) ;
  4. guide de 0,014 pouce poussé loin en aval ;
  5. prédilatation ;
  6. stent ;
  7. post-dilatation au ballon non compliant ;
  8. retrait du matériel.

## Ce qui a été fait

### 1. Deux animations (js/pci-anim.js), d'environ 45 s, à cœur battant

**« Infarctus (IVA) »** : angioplastie primaire. Bouton « Voir l'angioplastie » ; la vue statique de l'infarctus en
écran partagé est conservée.

| Étape | Ce qu'on voit |
|---|---|
| 0 | Territoire antérieur akinétique, IVA sans sang en aval de l'occlusion |
| 1 | Coronarographie : le produit de contraste remplit le tronc commun, la circonflexe et la 1re diagonale, puis s'arrête net dans l'IVA (TIMI 0) |
| 2 | Plongée sur l'IVA : plaque rompue, thrombus occlusif ; les globules sont arrêtés contre le caillot |
| 3 | Guide de 0,36 mm à travers le caillot, loin en aval |
| 4 | Ballon de 2,5 mm : le caillot est tassé, le sang repasse (reperfusion) ; l'IVA retrouve sa couleur en aval |
| 5 | Stent actif 3 × 18 mm, déployé à ≈ 12 atm |
| 6 | Retrait du ballon |
| 7 | Contrôle (TIMI 3), retrait du guide ; retour au cœur entier, le contraste passe jusqu'à la pointe |
| 8 | Délai, stent actif, double anti-agrégation plaquettaire |

**« Lésion serrée (IVA) »** : angioplastie programmée, lancée au choix de la vue.

| Étape | Ce qu'on voit |
|---|---|
| 0 | Angor d'effort |
| 1 | Coronarographie : contraste dans toute l'IVA (TIMI 3), rétrécissement d'environ 75 % ; FFR/iFR évoquées pour les lésions intermédiaires |
| 2 | Plaque stable (chape épaisse, cœur lipidique, calcifications), remodelage positif ; le sang accélère dans le rétrécissement |
| 3 | Passage du guide |
| 4 | Prédilatation : la plaque se tasse, retour élastique partiel |
| 5 | Stent 3 × 20 mm |
| 6 | Post-dilatation au ballon non compliant (≈ 18 atm) ; IVUS ou OCT évoqués |
| 7 | Contrôle |
| 8 | Stent actif, double anti-agrégation plaquettaire de 6 mois, facteurs de risque |

### 2. L'artère du gros plan

- **Tracé.**
  - L'artère est construite sur la ligne centrale du tronc de l'IVA du modèle. Ce tronc est la plus grande pièce du
    maillage, qui réunit aussi les diagonales et les septales ; on suit son axe pas à pas, puis on lisse.
  - Le calibre est mesuré sur le maillage : 3,5 à 4,5 mm de diamètre externe.
- **Gros plan.**
  - L'artère est fendue en long : on retire sa moitié avant.
  - Un plan de coupe face au regard, posé à la profondeur de son axe là où il est le plus enfoui, montre le myocarde
    autour d'elle. Dans le modèle, l'IVA est à moitié enchâssée dans le muscle.
  - Sous le gros plan, l'IVA du modèle est effacée par des capsules le long de la ligne centrale, dans le shader des
    coronaires.
- **Paroi en coupe**, avec des textures dessinées :
  - intima ;
  - limitantes élastiques interne et externe, en liserés clairs ;
  - média : cellules musculaires lisses coupées en travers ;
  - adventice : tissu lâche et vasa vasorum.
- **Plaque.**
  - Chape de collagène, cœur lipidique avec ses cristaux de cholestérol, calcifications.
  - Dans l'infarctus : rupture de la chape et thrombus, tête blanche puis corps rouge à stries de fibrine.
- **Compression.** La plaque se tasse et la paroi s'étire selon le rayon imposé par le ballon ou le stent.

### 3. Correction de la vue « Infarctus (IVA) » (js/heart.js)

- **Défaut.** Le point d'occlusion, moyenne des sommets à cette hauteur, tombait sur la 1re diagonale. Le tronc de
  l'IVA en aval restait rouge, et c'étaient des branches qui étaient assombries.
- **Correction.** L'occlusion est posée sur le tronc. En aval, le tronc au-delà et les branches nées sous l'occlusion
  sont privés de sang.

### 4. Coronarographie (js/heart.js)

- Chaque sommet du réseau gauche (tronc commun, IVA, circonflexe) porte sa distance à l'ostium du tronc commun.
- Le front du produit de contraste avance depuis cet ostium, figuré en blanc argenté.
- Il s'arrête à l'occlusion tant que l'IVA est bouchée.

## Vérifications (navigateur sans fenêtre)

- **Déroulé** : les deux animations, de l'étape 0 à la fin, sans erreur JavaScript.
- **Arrêt en cours de route** : retour à la vue normale, plan de coupe, produit de contraste et distance de la caméra
  rétablis.
- **Vue aortique** : inchangée.
- **Globules** : dans ce navigateur, chaque image n'avance que de 0,1 s, d'où leur amas au départ ; dans un vrai
  navigateur, ils s'écoulent.
- **Hors périmètre** : la première partie des autres animations (trajet depuis la ponction sur la planche du corps
  entier) n'est pas faite pour l'angioplastie. Le trajet radial demanderait les artères du membre supérieur dans la
  planche ; il est seulement indiqué dans les légendes.

## Captures

| Fichier | Contenu |
|---|---|
| v51-01-infarctus-iva-aval-sans-sang.jpg | Vue « Infarctus » corrigée : le tronc de l'IVA sans sang en aval de l'occlusion |
| v51-02-idm-coronarographie-timi0.jpg | Coronarographie : le contraste s'arrête dans l'IVA (TIMI 0) |
| v51-03-idm-plaque-rompue-thrombus.jpg | Plaque rompue et thrombus, avec les noms |
| v51-04-idm-guide-traverse-caillot.jpg | Le guide traverse le caillot |
| v51-05-idm-ballon-reperfusion.jpg | Ballon gonflé : reperfusion |
| v51-06-idm-stent-deploye.jpg | Stent déployé |
| v51-07-idm-controle-timi3.jpg | Contrôle : le contraste passe jusqu'à la pointe |
| v51-08-stenose-coronarographie.jpg | Lésion serrée : coronarographie |
| v51-09-stenose-plaque-stable.jpg | Plaque stable : chape, cœur lipidique, calcifications |
| v51-10-stenose-predilatation.jpg | Prédilatation |
| v51-11-stenose-stent.jpg | Stent déployé |
| v51-12-stenose-ballon-non-compliant.jpg | Post-dilatation au ballon non compliant |
| v51-13-stenose-resultat.jpg | Résultat |
