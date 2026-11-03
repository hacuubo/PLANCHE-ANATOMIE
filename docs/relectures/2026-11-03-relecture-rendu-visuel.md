# Relecture — Rendu visuel, patients et congrès (3 novembre 2026)

## Demande

Améliorer le rendu de tous les modèles, pour qu'il soit aussi beau et compréhensible pour un patient que pour un
cardiologue en congrès. Inventaire de 21 propositions, puis réalisation dans l'ordre convenu, en quatre lots.
Vérifié dans le navigateur intégré, sur une carte graphique Intel UHD 620. Un commit par lot.

## Lot 1 — effet immédiat

| N° | Proposition | Réalisation |
|---|---|---|
| 10 | Éclairage plus contrasté, fond | Clé 1,7 → 2,3, contre-jours 2,1 → 2,6 et 1,4 → 1,7, remplissage 0,9 → 0,6, ambiance 0,95 → 0,7, exposition 1,05 ; fond de studio assombri vers les bords |
| 12 | Silhouette grise des coupes | Supprimée (avec le motif grillagé au-dessus de la crosse) ; moins d'objets à dessiner |
| 13 | Bords de coupe en escalier | FXAA simplifié dans la recomposition des ombres de contact (bords francs seulement) |
| 14 | Cadrage | Toutes les vues centrées au-dessus des boutons du bas ; coupe 5 cavités cadrée pointe comprise ; bouton « Présenter » (plein écran, sans menus) |
| 15 | Repères simples | Légende : cavités et gros vaisseaux sur le cœur entier (masqués quand ils passent derrière) et au centre des cavités ouvertes dans les coupes |

## Lot 2 — crédibilité anatomique

| N° | Proposition | Réalisation |
|---|---|---|
| 1 | Graisse épicardique | Calculée au chargement autour des vaisseaux du cœur (≈ 8 mm à la base, 2 mm à la pointe, bords lobulés, surface soulevée d'au plus 0,5 mm) |
| 3 | Gros vaisseaux | Teintes de tissu (aorte nacrée, veines caves bleu violacé, veines pulmonaires rouge violacé) ; taches noires de la bifurcation du tronc brachio-céphalique retirées (occlusion cuite adoucie) |
| 4 | Valve mitrale | Fermeture en « sourire » plus marquée ; fentes entre P1, P2 et P3 (pli et ombre) ; prolapsus de P2 plus haut (12,5 mm), 3 à 4 cordages rompus ; vue chirurgicale inclinée de 18° depuis le côté de l'aorte |
| 5 | Valve aortique | Calcifications au grain crayeux, mates, sans film humide (au-delà de 2 mm d'épaisseur de cuspide) |
| 8 | Infarctus | Territoire pâle marbré de plages pourpres, cerné d'un liseré rouge ; la graisse des sillons garde sa teinte ; vue Coronaires recadrée plus grande |

## Lot 3 — mode congrès

| N° | Proposition | Réalisation |
|---|---|---|
| 18 | Patient / Expert | Choix dans le menu, ou lien `?public=expert` (jamais retenu d'une visite à l'autre) ; nomenclature française et anglaise, 13 structures de plus |
| 19 | Vues d'imagerie | 8 coupes d'échographie orientées comme l'image, sur les repères réels du modèle ; 6 incidences de coronarographie |
| 20 | Échelle, mesures | Barre d'échelle à la profondeur du centre de la vue ; mesures de l'anneau dans les vues des valves (mitral 33 × 28 mm, 7,1 cm²) et valeurs des variantes |
| 21 | Outils de présentation | Fond sombre, qualité maximale, pointeur laser, image HD (PNG), raccourcis clavier, visite guidée (flèches, télécommande de diaporama) |

Orientations vérifiées à l'écran : parasternale grand axe (VD en haut, pointe à gauche, aorte à droite, OG en bas),
apicale 4 cavités (pointe en haut, VG à droite, oreillettes en bas).

## Lot 4 — finesses

| N° | Proposition | Réalisation |
|---|---|---|
| 2 | Veines du cœur réalistes | En mode Expert : rouge sombre violacé |
| 6 | Oreillettes | Muscles pectinés en relief dans les auricules et sur la paroi latérale de l'oreillette droite ; paroi septale et sinus des veines caves lisses |
| 7 | Ventricules | Grosses trabécules du ventricule droit ; bande modératrice (de la cloison à la base du pilier antérieur, 1,8 cm) |
| 9 | FOP | Microbulles plus fines, brillantes et translucides ; entrée du tunnel soulignée |
| 11 | Myocarde | Nuances lentes, zones un peu plus rouges et plus sombres |
| 16 | Mise en lumière | Un nom de la Légende touché : la structure reste en couleur, le reste s'estompe |
| 17 | Circulation | Flèches dans les coupes, bleu (cœur droit) et rouge (cœur gauche), au rythme du cycle ; éjection montrée seulement si la valve artérielle est dans la coupe |

## Fluidité

Mesurée sur la même carte graphique, après les quatre lots :

- 30 images/s cœur qui bat ;
- 17 images/s pendant une transition ;
- même nombre de programmes de la carte graphique (61), précompilés.

Aucune régression par rapport à la veille.

## Limites et non fait

- Muscles pectinés : dessinés où l'anatomie les place (paroi antérolatérale), que les coupes habituelles retirent ;
  ils se voient peu dans la coupe 5 cavités, dont la paroi postérieure de l'oreillette droite est lisse.
- Abouchement des veines pulmonaires et ostium de l'auricule gauche dans la vue mitrale : non retravaillés. Ils
  demandent de modifier le modèle, ce que le shader seul ne permet pas.
- Mise en regard des vues d'imagerie avec de vraies images d'échographie et d'angiographie : pas d'images libres de
  droits disponibles dans le dépôt.
- Coupe des extrémités des gros vaisseaux (paroi et lumière) : non faite.
- Mesures : valeurs du modèle (anneaux) et des variantes, non des mesures de patient.

## Erreurs JavaScript

Aucune, sur toutes les vues parcourues :

- cœur entier ;
- coupes 5 cavités et apicale 4 cavités ;
- parasternales ;
- valves mitrale et aortique, avec comparaison ;
- coronaires ;
- FOP ;
- coronarographie ;
- téléphone (375 px).
