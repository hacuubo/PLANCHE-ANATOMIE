# Relecture — animation de la fermeture du FOP (31 octobre 2026)

Captures : `captures/v34-*.jpg`.

## Demande

Ajouter à la rubrique FOP un onglet « Fermeture du FOP ». Il porte une animation reconstituée sur notre modèle
d'après la séquence de 4'29 à 4'41 de la vidéo du Centre hospitalier de Haguenau, « Fermeture du FOP ».

## Séquence de référence (vidéo, 4'29 à 4'41)

| Temps | Image | Étape |
| --- | --- | --- |
| 4'29 | Vue depuis l'OG, veines pulmonaires visibles | La gaine bleue a franchi le FOP. « On commence par déployer le disque gauche. » |
| 4'31 | Même vue | Le disque gauche (treillis tressé) sort de la gaine et s'ouvre |
| 4'33 | Même vue | « Ensuite on le plaque contre le FOP » |
| 4'36 | Coupe de la cloison | Disque gauche plaqué, gaine dans l'OD |
| 4'37 | Vue depuis l'OD | La gaine arrive de la veine cave inférieure. « Puis on libère le disque droit. » |
| 4'40 | Même vue | Disque droit ouvert contre la cloison ; prothèse en place |

## Ce qui a été fait

1. **Onglet « Fermeture du FOP »**, troisième vue de la rubrique FOP. Il reprend la coupe bicave de « FOP · test aux
   bulles », tunnel compris.
   - Ouvrir l'onglet lance l'animation.
   - « Voir la fermeture » la relance, « Arrêter » l'interrompt.
   - Changer d'onglet retire le matériel.
2. **Matériel** (js/pfo-closure.js) :
   - gaine bleue d'≈ 2,6 mm (8 F), à bout radio-opaque ;
   - câble de largage ;
   - prothèse à double disque de type Amplatzer PFO Occluder 25 mm :
     - disque gauche de 18 mm et disque droit de 25 mm ;
     - treillis tressé en spirale sur tissu de polyester (texture dessinée) ;
     - col court et moyeux.
   - Repliés dans la gaine, les disques sont allongés. Ils s'ouvrent en sortant.
3. **Trajet** :
   - veine cave inférieure ;
   - oreillette droite ;
   - entrée du tunnel du FOP, puis le tunnel lui-même ;
   - oreillette gauche.
4. **Pose** :
   - les deux disques sont centrés sur le milieu du tunnel, de part et d'autre de la cloison ;
   - chacun est contre une face de la cloison. Ces faces sont mesurées par lancer de rayons depuis le milieu du tunnel :
     endocarde de l'OD à 0,8 mm, de l'OG à 4,6 mm ;
   - le col traverse le tunnel. Au largage, le tunnel est refermé, écrasé entre les disques. Le changement se fait
     derrière le disque droit.
5. **Étapes**, avec une légende et une barre de progression :

   | Étape | Durée | Ce qui se passe |
   | --- | --- | --- |
   | 1 | 5 s | La gaine remonte la veine cave inférieure, traverse l'OD, passe par le FOP et débouche dans l'OG |
   | 2 | 3,5 s | Le disque gauche sort de la gaine et s'ouvre |
   | 3 | 2,8 s | Il est tiré contre la cloison |
   | 4 | 4 s | La gaine recule dans l'OD et libère le disque droit |
   | 5 | 3 s | Largage : le câble est dévissé, puis retiré avec la gaine |
   | 6 | — | Coupe bicave, cœur qui bat. La prothèse suit la cloison et le test aux bulles de contrôle est négatif : les bulles restent à droite |

6. **Caméra** :
   - coupe bicave pendant la montée de la gaine ;
   - inclinaison côté OG (disque gauche de trois quarts, comme dans la vidéo) ;
   - inclinaison côté OD pour le disque droit ;
   - retour à la coupe pour le résultat.
7. **Interface** :
   - la légende et le bouton de l'animation sont partagés avec la TAVI ;
   - sur téléphone, l'onglet actif d'une barre d'onglets qui défile est ramené au milieu. Avant, « Fermeture du FOP »
     et certaines variantes des valves restaient coupés.

## Vérification

- **Captures.** Chaque étape (v34-01 à v34-06) et le téléphone (v34-07), ouvert directement par le lien
  `?valve=fermeture`, qui lance l'animation.
- **Comportements testés** :
  - arrêt par le bouton, puis relance ;
  - passage à « FOP · test aux bulles » en cours d'animation : matériel retiré, tunnel et bulles du FOP rétablis ;
  - fermeture de la rubrique.
- **Erreurs JavaScript.** Aucune.
