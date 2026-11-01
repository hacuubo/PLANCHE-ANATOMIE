# Relecture — Corps entier en verre, vaisseaux de BodyParts3D (1er novembre 2026)

Captures : `captures/v45-*.jpg`.

## Demande

- **Le style.** Une direction artistique comme l'exemple fourni : corps humain translucide sur fond bleu nuit,
  squelette visible, vaisseaux rouges et bleus. Elle remplace entièrement celle de la partie 1 des cinématiques, jugée
  « dessin de maternelle ».
- **La place des vaisseaux.** Tous les vaisseaux à leur place : la version précédente avait les veines jugulaires en
  dehors du cou.

## Ce qui a été fait

1. **Le corps de BodyParts3D** (tools/build-body-bp3d.mjs).
   - **Source.** `partof_BP3D_4.0_obj_99.zip`, téléchargé depuis
     [dbarchive.biosciencedbc.jp](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/). C'est la même source
     que le cœur, sous licence CC BY 4.0.
   - **Repère.** Pièces lues dans le repère du cœur, avec la même conversion que tools/build-heart-bp3d.mjs. Le corps
     (172 cm) tombe exactement autour du modèle, sans recalage.
   - **Pièces retenues.**
     - Peau, squelette (260 os) et reins.
     - Vaisseaux de la grande circulation : 165 artères, sans les intracrâniennes, pulmonaires et coronaires ; veines
       caves, iliaques, troncs brachiocéphaliques, jugulaire interne et sous-clavière droites, céphaliques, basiliques.
   - **Veines absentes de BodyParts3D, reconstruites sur l'anatomie du modèle.**
     - Jugulaire interne, sous-clavière et humérale gauches : symétriques des droites, par le plan médian du corps.
     - Veines fémorales : en dedans de l'artère au trigone fémoral, en arrière dans le canal des adducteurs.
     - Veines poplitées : en arrière de l'artère. Veines tibiales : le long de leurs artères.
     - Grandes saphènes : sous la peau réelle, en avant de la malléole médiale, face médiale du genou, jusqu'à la veine
       fémorale.
     - Jugulaires externes : sous la peau du cou, jusqu'à la veine sous-clavière.
     - Veines rénales : de la veine cave inférieure au hile, la gauche devant l'aorte.
   - **Résultat.** Les vaisseaux sont à leur place anatomique ; les jugulaires sont dans le cou (v45-05).
   - **Trajets des dispositifs.** Ils suivent les lignes centrales des vaisseaux réels. Les tranches de deux pièces qui
     se chevauchent sont écartées, ce qui supprime le retour en arrière à la jonction fémorale–iliaque.
2. **Le rendu** (js/app.js, `renderPlate`).
   - **Organes opaques.** Le cœur, les vaisseaux et les reins, avec la lumière de la scène. Rouge et bleu en dégradés
     d'atlas, halo léger autour des vaisseaux.
   - **Moignons du modèle.** Sous le cœur, ceux de l'aorte et de la veine cave sont retirés ; les mêmes vaisseaux de
     BodyParts3D prennent le relais, sans bord découpé.
   - **Peau et squelette en verre bleuté.**
     - Translucides, plus denses et plus clairs sur les bords (effet de Fresnel), éclairés doucement par le haut.
     - Dessinés seulement là où aucun organe n'est devant eux : les côtes passent devant le cœur, comme dans l'exemple.
   - **Fond bleu nuit** pour la planche. Légende et bouton « Passer » en verre sombre, étiquettes claires.
   - **Images livrées toutes faites.** Corps entier à 10 px/cm (438 Ko) et tronc à 36 px/cm (1,4 Mo), avec leur
     description (cadrage du corps entier, trajets).
3. **Simplification** (js/route-intro.js). La silhouette dessinée et le réseau tracé à la main sont retirés. Le module
   affiche la planche livrée, le dispositif et l'aiguille.

## Vérification (navigateur sans fenêtre, 1400 × 900)

- **TAVI** : le corps entier et la ponction fémorale droite (v45-01), le tronc avec les reins et les vaisseaux
  viscéraux (v45-02), le thorax et le cœur (v45-03), le relais aligné sur la 3D (v45-06).
- **FOP** : la gaine dans la veine fémorale puis la veine cave (v45-04).
- **Pacemaker** : le cou, avec les jugulaires internes et externes à leur place, et la veine sous-clavière gauche
  (v45-05).
- **Erreurs JavaScript** : aucune.
