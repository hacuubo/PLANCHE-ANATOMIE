# Relecture — nom « Cœur 3D », logo, menu compact sur téléphone (31 octobre 2026)

## Demande

- Mettre en ligne le changement de nom et le logo.
- Sur téléphone, le menu déroulé doit prendre moins de place.
- Toucher la scène hors du menu doit le refermer.

## Ce qui a été fait

1. **Nom et logo** (préparés à part, livrés avec ce lot) :
   - titre « Cœur 3D », logo à quatre cavités dans l'en-tête ;
   - icônes de l'application, image d'aperçu des liens (tools/make-og.mjs), manifeste ;
   - couleur de thème du navigateur alignée sur le fond de studio (#EEF2F6) ;
   - titre du README.
2. **Menu sur téléphone** (css/style.css, bloc `max-width: 900px`) :
   - une carte de 236 px en haut à droite, à la hauteur de son contenu, au lieu d'un tiroir de 300 px sur toute la
     hauteur ;
   - les rubriques sans leur ligne d'explication, les sous-rubriques et les boutons resserrés ;
   - la carte s'arrête au-dessus des actions et du cycle, et défile si une page est plus longue.
3. **Toucher hors du menu** (js/app.js) : le menu se referme. Le geste s'arrête là : le cœur ne tourne pas, et le
   bouton touché dessous (Légende, Partager…) n'est pas actionné. Le bouton « Menu » garde son rôle d'ouvrir et de
   fermer.

## Vérification (375 × 812, puis ordinateur)

- Accueil du menu : carte de 236 × 256 px, le cœur reste visible à gauche et dessous.
- Page de la valve mitrale (état, vue, position, Doppler) : 236 × 421 px.
- Glisser sur la scène, menu ouvert : le menu se ferme, la vue ne bouge pas.
- Toucher « Légende », menu ouvert : le menu se ferme, la légende reste éteinte. Au second toucher, elle s'allume.
- Ordinateur : la colonne de droite est inchangée.
- Erreurs JavaScript : aucune.
