# Relecture — rubrique Stimulation, implantation d'un pacemaker ; valves sans « Position » (1er novembre 2026)

## Demande

1. Supprimer le choix « Ouverte » / « Fermée » des valves.
2. Ajouter une rubrique **Stimulation** au menu, avec une sous-rubrique **Stimulation de branche gauche**.
   - Elle lance une animation d'une vingtaine de secondes, « Implantation pacemaker ».
   - Elle se joue dans la coupe 4 cavités du modèle, que le lecteur ne peut pas tourner.
3. Première sonde : la stimulation de branche gauche.
   - Elle arrive par la veine cave supérieure, passe l'oreillette droite et la valve tricuspide, tourne dans le
     ventricule droit et se place perpendiculaire au septum.
   - Elle se pose à la jonction du 1er et du 2e tiers en partant de la jonction auriculo-ventriculaire.
   - Elle est vissée, toujours perpendiculaire, jusqu'aux 3/4 de l'épaisseur du septum, et sa progression se voit
     dans le plan de coupe.
4. Deuxième sonde, la première restant en place : elle se pose sur la paroi latérale de l'oreillette droite en
   amorçant un virage dans l'oreillette.
5. Diamètres et aspect des sondes calés sur des références, l'ensemble en accord avec le battement.

## Ce qui a été fait

1. **Valves.**
   - Le choix « Position » est retiré : la valve bat avec le cœur.
   - « Pause » ou le curseur du cycle l'arrêtent à un instant donné.
   - Le paramètre `position` d'un ancien lien est encore lu.
2. **Menu** (index.html, js/app.js).
   - Cinquième rubrique, **Stimulation**, en vert (#2E8A7C), qui ouvre la coupe 4 cavités.
   - Sa sous-rubrique, **Stimulation de branche gauche**, lance l'animation, avec un bouton « Voir l'implantation » /
     « Arrêter ».
   - Sur téléphone, le menu se referme au lancement.
   - Titre du haut : « Stimulation · Implantation pacemaker » pendant l'animation.
   - Lien direct : `?valve=stim`.
3. **Vue** (js/pacing-anim.js, `buildPacingView`). Toutes les mesures sont faites sur le modèle, au repos.
   - **Plan 4 cavités** : il passe par la pointe et les centres des valves mitrale et tricuspide. Les oreillettes sont
     en haut et le VG à droite. Le regard est incliné de 25° vers la base, pour que la veine cave supérieure, qui
     arrive vers l'observateur, se lise de biais.
   - **Vue fixe** : la caméra de la vue ne répond plus au doigt ni à la souris.
   - **Cible** :
     - la face droite du septum est repérée par les sommets du VD tournés vers le VG, à moins de 2,2 cm de lui, dans
       le plan ;
     - abscisse le long du grand axe, de la charnière septale de la tricuspide (0) à la pointe (8,8 cm) ;
     - cible au premier tiers ;
     - direction perpendiculaire au septum, dans le plan.
   - **Épaisseur du septum** à cet endroit, le long de cette direction, jusqu'à l'endocarde du VG : ≈ 9 mm. La
     profondeur de vissage est de 3/4, soit ≈ 6,8 mm.
   - **Paroi latérale de l'OD** : le bord de l'oreillette du côté droit du patient, dans le plan, au tiers inférieur
     de sa hauteur.
4. **Animation** (≈ 20 s, légende de chaque étape) : le cœur bat du début à la fin.
   1. **La cible** (3 s) : la ligne du septum en pointillés de la jonction AV à la pointe, ses tiers marqués, un
      anneau ambré sur la cible.
   2. **La gaine et la sonde** (5 s).
      - Trajet : veine cave supérieure, oreillette droite, centre de la tricuspide.
      - Dans le VD, la gaine descend puis tourne pour finir sur 1,25 cm dans l'axe perpendiculaire au septum.
      - La caméra se rapproche du septum.
   3. **Le vissage** (4,5 s).
      - La sonde avance de 6,8 mm dans le septum, dans le plan de coupe ; elle se voit sur la tranche.
      - Elle fait ≈ 7 tours, que le liseré de la sonde rend visibles.
   4. **Retrait de la gaine** (2,5 s), par la veine cave ; la caméra recule.
   5. **La sonde auriculaire** (5 s).
      - Elle descend au plancher de l'OD, s'y recourbe en crosse et remonte vers la paroi latérale, qu'elle aborde
        perpendiculairement.
      - Sa vis sort en tournant (2,5 tours).
      - La caméra est sur l'oreillette.
   6. **Fin** : les deux sondes en place suivent le battement ; la caméra cadre les deux sondes.
5. **Accord avec le battement.**
   - Chaque point de la gaine, des sondes et des repères est déplacé par la déformation du cœur (`heart.deformPoint`),
     depuis sa position au repos.
   - La coupe de la vue ne suit que le centre de la vue. Près du plan, les points gardent donc leur hauteur au repos
     par rapport à la coupe, sans quoi ils passaient sous la tranche en systole. Loin du plan, dans la veine cave,
     la déformation s'applique entière.
6. **Matériel**, à l'échelle du modèle (1 unité = 1 cm).

   | Pièce | Modèle | Diamètre | Détails |
   | --- | --- | --- | --- |
   | Sonde ventriculaire | Medtronic SelectSecure 3830 | 4,1 F (1,4 mm) | sans lumière, vis fixe de 1,8 mm, électrode annulaire ≈ 1 cm en arrière, silicone gris clair |
   | Gaine de pose | Medtronic C315HIS | 7 F (2,4 mm) extérieur, 5,4 F intérieur | bleu marine, repère radio-opaque au bout |
   | Sonde auriculaire | Medtronic CapSureFix Novus 5076 | 6 F (≈ 2 mm) | vis rétractable de 1,8 mm, silicone blanc |

7. **Légende** (bouton) : oreillette droite, ventricule droit, oreillette gauche, ventricule gauche, septum
   interventriculaire, veine cave supérieure.

## Références

- Medtronic, SelectSecure 3830 (fiche produit) : corps de 4,1 F (1,4 mm), vis fixe.
- Medtronic, cathéter de pose C315 (fiche produit) : 7 F extérieur (2,4 mm), 5,4 F intérieur. FDA 510(k) K101885.
- Medtronic, CapSureFix Novus 5076 (Product Performance) : corps de 6,0 F. Vis de ≈ 1,8 mm (brevet US7027876).
- Huang et al., *A beginner's guide to permanent left bundle branch pacing*, Heart Rhythm 2019 : technique de
  l'abord, sonde perpendiculaire au septum, vissage profond.
- La jonction du 1er et du 2e tiers et les 3/4 de l'épaisseur sont la consigne de la demande. Je ne les ai pas
  retrouvés tels quels dans les sources consultées : la profondeur se juge en salle sur l'impédance, les battements
  de fixation et l'aspect du QRS.

## Vérification

- **Parcours sur ordinateur** :
  - accueil, rubrique Stimulation (coupe 4 cavités, vue fixe), sous-rubrique (animation) ;
  - images arrêtées à 2, 7, 10, 11, 12,4, 17,4, 18,5 et 20 s ;
  - légende ; retour à l'accueil.
- **Téléphone** (375 × 812) : menu, rubrique, sous-rubrique (le menu se referme), plan rapproché du vissage.
- **Valve mitrale** : plus de choix « Position » (pages : La valve, Vue).
- **Trajets** : distance à l'endocarde contrôlée le long des deux sondes, qui restent dans les cavités jusqu'à leur
  point d'ancrage.
- **Défaut corrigé en cours de route** : les tubes étaient orientés vers l'intérieur, si bien que la moitié de la
  sonde tournée vers l'observateur n'était pas dessinée. Dans le septum, on ne voyait qu'un fil.
- **Erreurs JavaScript** : aucune.
