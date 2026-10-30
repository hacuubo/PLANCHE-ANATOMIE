# Relecture — Doppler en jets de fumée, repère animé, vitesses (30 octobre 2026)

Captures : `captures/v31-*.jpg`.

## Demandes

1. Supprimer la vitesse ½× ; garder 1× et ¼×.
2. Le repère qui situe la valve doit être en mouvement : orientation fixe, mais la systole suit celle de la maquette,
   la valve toujours entourée. Il doit être présent sur téléphone comme sur ordinateur.
3. Doppler couleur : le flux jaillit comme un laser ; le matérialiser comme un jet de fumée, que le patient se
   représente mieux.

## Ce qui a été fait

1. **Vitesses** : 1× et ¼× seulement. Un ancien lien `vitesse=0.5` ouvre à vitesse réelle.
2. **Repère animé** (js/app.js, js/reperes.js, `assets/reperes`) :
   - **Séquence** : 32 images de la coupe (4 cavités, 5 cavités ou frontale) sur un cycle, pré-rendues depuis
     l'application, caméra fixe.
   - **Synchronisation** : la séquence est calée sur l'instant du cœur principal (battement, ralenti ¼×, curseur du
     cycle, pause). Valve figée ouverte ou fermée : instant représentatif de cette position.
   - **Fluidité** : fondu entre deux images voisines, pour un mouvement fluide même au ralenti.
   - **Cercle** : son centre est mesuré à chaque image, il suit donc la valve qui descend et remonte avec la base
     (v31-01, v31-02).
   - **Ce qui ne coûte rien** : aucun second rendu 3D (planches d'images, ≈ 270 Ko par coupe, gardées hors ligne).
   - **Affichage** : sur ordinateur (en haut à droite) et sur téléphone (en bas à gauche), et désormais aussi en écran
     partagé.
3. **Doppler en jets de fumée** (js/doppler.js) : les tubes colorés sont remplacés par des nuages de bouffées.
   - **Bouffées** : floues, au bord effiloché et grumeleux. Elles naissent à l'orifice, s'élargissent en s'éloignant,
     tourbillonnent (davantage dans un jet turbulent) et s'estompent.
   - **Couleur** : chaque bouffée prend la couleur Doppler de sa vitesse réelle, selon les mêmes règles qu'avant. Le
     jet de fuite garde ainsi sa mosaïque près de l'orifice et la couleur du sens du flux plus loin.
   - **Zone de convergence** : un nuage aspiré vers l'orifice, de plus en plus vite (v = Q / 2πr²), qui change de
     couleur là où la vitesse atteint la limite de Nyquist.
   - **Vitesse d'animation** : les bouffées avancent bien moins vite que le sang (≈ 0,4 s pour parcourir le jet) pour
     que le mouvement se lise. À chaque systole (fuite mitrale) ou diastole (fuite aortique), un nouveau panache part.
     Cœur arrêté : nuage établi à cet instant.
   - **Correction au passage** : le jet de la fuite aortique part maintenant du bas des cuspides fermées, côté
     ventricule ; il partait au-dessus.
   - Captures v31-03 à v31-08.

## Vérification

- Fuites aortique, mitrale, tricuspide ; rétrécissements aortique et mitral ; flux normaux.
- À l'arrêt et pendant le battement ; écran partagé à l'arrêt et en mouvement.
- Repère animé à plusieurs instants, sur les quatre valves.
- Deux boutons de vitesse ; console sans erreur.
