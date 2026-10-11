# Corrections appliquées après les relectures du 11 octobre 2026

Référence : `2026-10-11-anatomie.md` (anatomiste) et `2026-10-11-direction-artistique.md` (DA).
Captures après corrections : `captures/v2-*`.

## Relecture anatomique

| # | Gravité | État | Ce qui a été fait |
|---|---|---|---|
| 1 | CRITIQUE | Appliqué | VG `ellipsoid(2.0, 2.9, 1.9)` centré (1,0 ; −3,0 ; −0,6) ; VD `bentEllipsoid(3.2, 2.6, 0.8, R 2.85, −45°)` pivot décalé de 0,75 cm à droite et 0,3 cm en avant. Croissant VD ≈ 1,6 cm, paroi libre 0,4–0,8 cm, septum 0,6–1,0 cm, paroi VG ≈ 1,0–1,2 cm (vérifié en coupes grand axe, frontale et horizontale). Les valeurs du relecteur (3,4 × 2,8 × 0,9) faisaient sortir la cavité de la masse en avant ; réduites en conséquence. |
| 2 | IMPORTANT | Appliqué | Aorte ascendante reculée à droite et en arrière ; racine du TP à (1,45 ; 1,9 ; 2,15) local, trajet par (1,3 ; 6,0 ; 0,7) ; bifurcation à (1,6 ; 7,5 ; −1,4). Plus d'interpénétration. VCS déplacée à x = −3,8, z = −1,6 ; APD reculée pour passer derrière. |
| 3 | IMPORTANT | Appliqué | Crosse relevée de 0,9 cm et reculée ; APG abaissée ; ligament tracé de (2,4 ; 8,3 ; −2,05) à (2,35 ; 8,85 ; −2,9), r 0,2 : ≈ 0,5 cm visibles entre APG et crosse. |
| 4 | IMPORTANT | Appliqué | Tronc commun : points proposés par le relecteur (origine postéro‑gauche, passage entre TP et auricule gauche, arrivée `surf(0.02, 38°)`) ; IVA et circonflexe repartent de ce point. |
| 5 | IMPORTANT | Appliqué | Branche gauche du His plaquée sur la face septale du VG (points recalculés pour la nouvelle cavité). |
| 6 | IMPORTANT | Appliqué | Ancre de l'aorte sur sa face antérieure (−1,7 ; 5,6 ; 0,95) ; le test d'occultation ignore désormais les maillages de la structure elle‑même (c'était la cause des étiquettes manquantes en vue postérieure). |
| 7 | IMPORTANT | Appliqué | Ostium du sinus coronaire en (−2,6 ; 0,3 ; −0,5) local, rayon 0,28 → 0,48, décalé à 0,55 de la surface. |
| 8 | MINEUR | Différé | Inclinaison de l'axe (apex (4,3 ; −4,7 ; 2,6)) : demande de recalculer toutes les positions locales ; à faire dans une passe dédiée. |
| 9 | MINEUR | Appliqué | VCS raccourcie (départ y = 12). |
| 10–17 | MINEUR | Appliqué | Textes : pression OG 6–12 mmHg ; tronc commun 0,5–2 cm, entre TP et auricule gauche ; codominance ; auricule gauche « vient border » ; faisceau de His traversant la cloison fibreuse ; sténose aortique « la plus souvent traitée » ; latin de l'aorte ; nœud AV dans la cloison interatriale. |
| 18 | MINEUR | Appliqué | Couvert par #4. |

Structures manquantes proposées (muscles papillaires, bande modératrice, fosse ovale, septum interatrial, grande veine cardiaque, péricarde, repère sternal) : non ajoutées dans cette passe, à planifier.

## Relecture direction artistique

| # | État | Ce qui a été fait |
|---|---|---|
| P1‑1 | Appliqué (partiel) | Ombres douces PCFSoft 2048², bias/normalBias/radius, `clipShadows` sur les matériaux. GTAO non ajouté (post‑traitement, à évaluer sur tablette). |
| P1‑2 | Appliqué | `NeutralToneMapping`, exposition 1,0, lumières 1,6 / 0,45 / 0,5 / hémisphère 0,3, environnement 0,35. |
| P1‑3 | Appliqué | Myocarde `#b25048` roughness 0,74 ; oreillettes `#c98078` 0,70 ; artères 0,55 ; veines 0,6 ; graisse 0,88 ; coronaires au jeton « sang riche ». Pas de sheen (MeshStandard conservé). |
| P1‑4 | Appliqué | Contour par coque inversée 0,045 cm `#3a2b26`, clippé comme le matériau d'origine, masqué en mode circulation. |
| P1‑5 | Appliqué | Lumière colorée (artère `#7a2522`, veine `#2a3870`) + anneau de paroi (20 % artères, 12 % veines). |
| P1‑6 | Appliqué | Chiffre encre dès que la luminance de la pastille dépasse 0,35 (valves, graisse, conduction) ; six jetons de couleur partagés CSS / `COL` / `data.js`. |
| P1‑7 | Appliqué (variante) | Source Sans 3 (400/600/700) et Source Serif 4 (600) chargées depuis Google Fonts ; chiffres tabulaires. Auto‑hébergement (téléchargement de fichiers) laissé à l'approbation. |
| P1‑8 | Appliqué | Étiquettes 14 px, pastilles 22 px, boutons ≥ 40 px, 44 px sous `(pointer: coarse)`, zone tactile élargie des étiquettes. |
| P1‑9 | Appliqué | Barre basse unique : légende + « D ← patient → G », conservée sur mobile ; entrées contextuelles (valves et système électrique en coupe, particules en circulation). |
| P2‑1 | Appliqué (partiel) | Recul caméra ×1,2 en mode planche, étiquettes opaques ; colonnes calculées sur la boîte projetée non faites. |
| P2‑2 | Appliqué | Numéros seuls au bout des lignes sous 700 px. |
| P2‑3 | Appliqué | Halo papier sous les lignes de rappel, trait encre 0,8 px, coude 14 px. |
| P2‑4 | Appliqué (partiel) | Capuchon `#a3463f`, endocarde `#5e2222`, contour de coupe par la coque ; hachures non faites. |
| P2‑5 | Appliqué | Valves : anneau 0,08 + disque plat + commissures (3, ou 2 pour la mitrale). |
| P2‑6 | Appliqué | Partie retirée suggérée en fantôme (encre à 7 %). |
| P2‑7 | Appliqué | Parois 0,30 une seule face, capuchons masqués, capsules orientées non éclairées, 90 par trajet, exposition −10 %. |
| P2‑8 | Appliqué (écart) | Six jetons ; les pastilles des cavités droites restent bleues et gauches rouges (choix pédagogique : côté droit = sang pauvre en oxygène). |
| P2‑9 | Appliqué (partiel) | Oreillettes plus claires ; graisse enfoncée dans le sillon ; pas de section elliptique ni de normal map. |
| P2‑10 | Appliqué | Icônes SVG inline, séparation modes / options, coche sur les options actives. |
| P2‑11 | Appliqué | Outils de coupe en flux sous la barre d'outils. |
| P2‑12 | Appliqué | `--line-strong` sur les bordures interactives, `:focus-visible`. |
| P2‑13 | Appliqué | Panneau `clamp(300px, 32vw, 380px)`. |
| P3‑1 | Appliqué (partiel) | Battement désactivé par défaut ; l'échelle reste appliquée au pivot entier. |
| P3‑2, P3‑3, P3‑4, P3‑5, P3‑8 | Appliqué | Légende contextuelle, étiquette flottante basculée près du bord droit, filet sous le cartouche, grain papier, ouverture de la section de la structure sélectionnée (sans défilement). |
| P3‑6, P3‑7, P3‑9 | Différé | Icône « planche », étiquettes sur deux lignes, bouton « Explications ». |

## Point de régression corrigé en cours de route

Le regroupement des capuchons de coupe comparait la couleur du myocarde sectionné à une valeur codée en dur ; le changement de palette séparait la masse de ses cavités en deux passes de stencil et faisait disparaître les cavités. Corrigé (`COL.myocardeCoupe` importé dans `app.js`).
