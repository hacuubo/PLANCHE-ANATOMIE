# Relecture — interface : menu à droite, nouveau thème (31 octobre 2026)

Captures : `captures/v37-*.jpg`.

## Demande

- Ne plus tout regrouper en haut de l'écran, ce qui faisait un pâté. À la place, un menu à droite.
- Changer le thème : des rectangles avec une couleur de fond.
- Rubriques : plan en coupe, valves, FOP, coronaires.
  - Un clic sur l'une efface le reste et fait place à ses sous-rubriques (pour la coupe : 5 cavités, frontale).
  - Une flèche permet de revenir en arrière.
- Pause, recentrer, légende et partager restent en bas, au-dessus du cycle cardiaque.
- En haut de l'écran, le titre change avec ce qu'on choisit (valve, FOP, coronaires), et aussi avec la valve choisie
  (mitrale, tricuspide…).
- Une valve pathologique met directement le double écran (valve pathologique et valve normale), sauf pour les
  animations (TAVI, fermeture du FOP).

## Ce qui a été fait

1. **Menu à droite** (`nav#menu`, index.html ; js/app.js, `syncMenu`).
   - Sur ordinateur : une colonne de 290 px, la scène occupe le reste.
   - Sur téléphone : un tiroir qui glisse de la droite, ouvert par le bouton « Menu » en haut. Il se referme quand on
     choisit une vue.
   - **Accueil** : quatre rectangles de couleur, chacun avec une ligne d'explication.

     | Rubrique | Couleur |
     | --- | --- |
     | Plan en coupe | bleu |
     | Valves | rouge |
     | FOP | violet |
     | Coronaires | orange |

   - **Sous-rubriques**, dans la couleur de leur rubrique (l'élément choisi est en plein) :

     | Rubrique | Sous-rubriques |
     | --- | --- |
     | Plan en coupe | 5 cavités, Frontale, profondeur |
     | Valves | les quatre valves ; pour la valve choisie : son état (normale, pathologies, TAVI), la vue (chirurgien, ventricule), la position (fermée, ouverte), le Doppler couleur, et le bouton de l'animation pour la TAVI |
     | FOP | fosse ovale normale, test aux bulles, fermeture (avec son bouton) |
     | Coronaires | normale, infarctus |

   - **Flèche « Retour »** :
     - de la valve à la liste des valves, sans quitter la vue (un autre choix passe directement d'une valve à l'autre) ;
     - de la liste, ou d'une autre rubrique, à l'accueil, cœur entier.
   - La page affichée découle de l'état de la vue, si bien que le menu reste juste après un lien partagé ou une
     transition.
2. **Titre en haut de l'écran** :
   - à l'accueil : le nom de l'application ;
   - sinon : la rubrique et le détail, par exemple « Plan en coupe · Coupe frontale », « Valve mitrale · Prolapsus P2 ·
     vue du chirurgien », « FOP · Fermeture du FOP », « Coronaires · Infarctus (IVA) ».
   - Sur téléphone, titre et détail tiennent sur une ligne. Le bouton d'installation devient « Installer ».
3. **Actions en bas**, au-dessus du cycle : Pause, Recentrer, **Légende** (ex-« Repères »), Partager. Sur téléphone, elles
   se réduisent à leur icône.
4. **Écran partagé automatique** (`autoCompare`).
   - Choisir une pathologie, ou arriver sur une valve dont la pathologie est restée choisie, ouvre l'écran partagé :
     valve normale à gauche, malade à droite. « Normale » rend l'écran entier.
   - Pas pour la TAVI (animation), ni pour le FOP.
   - Appliqué aussi à l'infarctus des coronaires, même principe (normal contre malade). À retirer si ce n'est pas
     souhaité.
   - Le bouton « Comparer » disparaît.
5. **Thème** :
   - fond de studio bleu-gris, encre marine (#14213A, direction artistique de Cœur 3D) ;
   - rectangles à coins à peine arrondis (6 px) au lieu des pilules ;
   - même style pour les légendes, le cycle, les étiquettes de l'écran partagé et le repère.
6. **Cadrage des vues des valves**. Il ne tient plus compte d'un panneau en haut : la valve est centrée au-dessus des
   actions et du cycle. Le repère passe sous les noms de l'écran partagé.

## Vérification

- **Parcours complet sur ordinateur** :
  - accueil ;
  - plan en coupe (5 cavités, frontale) ;
  - valves : liste, mitrale, prolapsus (écran partagé), retour à la liste, aortique, TAVI (sans écran partagé) ;
  - FOP et fermeture ;
  - coronaires et infarctus ;
  - légende ;
  - retour à l'accueil.
- **Téléphone** : tiroir fermé, ouvert, choix d'une valve, pathologie (le tiroir se referme, écran partagé).
- **Lien direct** `?valve=tricuspide&variante=dilatation` : écran partagé, menu sur la valve, titre juste.
- **Non-régression** : animations TAVI et fermeture du FOP (arrêt, relance, changement de vue).
- **Erreurs JavaScript.** Aucune.
- **En-tête de la page**. Le changement de nom en cours (titre « Cœur 3D », logo, icônes, manifeste) n'est pas compris
  dans ce lot ; le titre du haut est piloté par le script, sans toucher à cet en-tête.
