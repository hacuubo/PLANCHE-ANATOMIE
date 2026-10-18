# Relecture — cordages, vues des valves, jonction tricuspide, coupe frontale, battement (18 octobre 2026)

Deux relecteurs indépendants : physiologie cardiaque (cinétique du battement, simulée numériquement sur le modèle) et
code three.js (vues des valves, coupes, cordages). Captures : `captures/v22-*.jpg`.

## Demande

1. Cordages mitraux et tricuspides : valve ouverte en vue chirurgien, ils ne doivent pas apparaître par-dessus les
   feuillets (ils sont dessous).
2. Vues centrées de chaque valve et de leurs pathologies tirées du modèle de base, avec un zoom depuis la vue en cours.
3. Vue chirurgien : « trou » au niveau de la tricuspide, désunion entre la paroi et l'anneau en avant et contre le septum.
4. Coupe frontale : la valve aortique n'est pas bien coupée.
5. Systole plus physiologique (épaississement des parois, de la pointe vers la base, tous les temps du cycle), d'après
   une recherche précise.

## Ce qui a été fait

1. **Cordages** (js/valves.js) : chaque point de cordage est maintenu sous la face ventriculaire du feuillet qui occupe
   sa direction ; détendus, ils s'incurvent vers la paroi et la pointe. Les traits roses vus « sur » les feuillets
   venaient en fait des muscles papillaires, maillages BodyParts3D ouverts (852 et 1 656 arêtes libres) qui
   trompaient le comptage des surfaces de coupe : ils sont désormais recalculés en solides fermés au générateur.
   Captures v22-02 (tricuspide ouverte), v22-04.
2. **Vues des valves** (js/av-views.js, js/aortic-view.js, js/app.js) : plus de maquette séparée ; le cœur lui-même
   est coupé au-dessus de l'anneau (ou de la jonction sino-tubulaire), la caméra plonge depuis la vue en cours pendant
   que la coupe descend ; au retour, vue et coupe de départ rétablies. Les variantes (prolapsus de P2, anneau
   tricuspide dilaté, bicuspidie, rétrécissement) prennent la place de la valve dans le cœur et battent avec lui ;
   la dilatation élargit anneau, oreillette et ventricule droits par la déformation du cœur. Captures v22-01 à 08.
3. **Jonction tricuspide** (tools/build-heart-bp3d.mjs) : les cavités BodyParts3D de l'oreillette et du ventricule se
   chevauchent au-delà de l'anneau ; une lame de tissu relie désormais l'anneau à la paroi la plus proche (32 % du
   tour de la tricuspide, 19 % de la mitrale). Plus de fente vers le ventricule (v22-01 contre v21).
4. **Coupe frontale** : plan à peine incliné (≈ 6°) pour contenir l'axe de la racine aortique, placé au centre de la
   valve ; la racine est ouverte (intima et cuspides visibles au lieu d'un aplat de sang). Capture v22-09.
5. **Battement** (js/heart.js) : chronologie et amplitudes d'après le Doppler tissulaire (n = 974), les recommandations
   ASE/EACVI 2015 et l'IRM de marquage — voir le commentaire de `cycle()` et le README. Captures v22-10 et v22-11.

## Physiologie (relecteur 1)

**Bloquant**
1. Carte de la paroi lue avec un demi-voxel d'écart côté processeur (valves, cordages) → **Corrigé**.

**Important**
2. Voxels hors du cœur à la raideur de l'endocarde : plis de la déformation, coronaires enfoncées de 5 mm en systole
   → **Corrigé** au générateur (hors du cœur : raideur de l'épicarde), modèle régénéré.
3. Inversion de la déformation dans la tranche trop imprécise (q99 7,6 mm) → **Corrigé** : 4 pas.
4. Détorsion trop rapide (96 % avant l'ouverture mitrale) → **Corrigé** : ≈ 45 % pendant la relaxation isovolumique.
5. VD qui n'éjecte presque pas (FE 27 %) → **Corrigé** : mouvement en soufflet de la paroi libre, réservoir auriculaire
   réduit.
6. Axe du VG décentré (épaississement inégal) → **Corrigé** : axe par le centre de la cavité du VG ; K_ENDO 0,38.
7. Anneaux : mitral −16 % seulement, aortique qui se contractait → **Corrigé** : contraction sphinctérienne de l'anneau
   mitral ; racines aortique et pulmonaire exclues de la contraction et de la torsion.

**Mineur** (tous corrigés) : profil d'éjection (débit maximal au premier tiers), contraction isovolumique vraiment
isovolumique, contraction isovolumique du VD (tricuspide 185 ms, pulmonaire 205 ms), délai électromécanique des
oreillettes et contraction auriculaire plus ample, valve pulmonaire non entraînée par la torsion, amortissement de la
descente côté tricuspide. Vérifié juste : sens de la torsion, pointe immobile, MAPSE 13 mm, TAPSE 23 mm, ordre et durée
des temps du cycle.

## Code (relecteur 2)

**Bloquant**
1. Vue aortique : la surface « sang » de l'aorte ascendante pouvait recouvrir la valve (coupe au-dessus du cylindre
   ouvert) → **Corrigé** : racine ouverte jusqu'à 1,8 hauteur de valve (v22-06).

**Important**
2. Coupe fixe pendant le battement (la valve s'éloigne de 13 à 23 mm) → **Corrigé** : la coupe suit le centre déformé
   de la valve.
3. Deux recompilations des matériaux au début et à la fin de chaque plongée → **Corrigé** (une seule).
4. Coût des cordages par image → **Corrigé** : profils des feuillets calculés une fois par image.

**Mineur** : dilatation tricuspide progressive pendant les transitions, caméra de retour juste après la circulation
guidée, retour progressif à la coupe d'origine, panneau des valves refermé au retour → **Corrigés**. Non retenus :
correspondance des colonnes des feuillets (vérifiée exacte : l'échantillonnage inclut la marge des commissures) ;
ombre et voile de la partie du sinus coronaire masquée dans l'oreillette (invisible en pratique). Chevauchement
lumière / cavité dans les tranches : vérifié sur la coupe frontale par les voies d'éjection, sans artéfact (v22-09).

## Vérification après corrections

Modèle régénéré (9,7 Mo). Vues tricuspide (fermée, ouverte, anneau dilaté), mitrale (normale, prolapsus), aortique
(normale, bicuspide ouverte, rétrécissement) ; retour à la vue de départ ; coupe frontale ; coupe 5 cavités en fin de
diastole et fin d'éjection ; circulation guidée et battement : console sans erreur.
