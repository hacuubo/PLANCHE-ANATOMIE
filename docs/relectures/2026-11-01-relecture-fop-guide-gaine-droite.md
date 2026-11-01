# Relecture — Fermeture du FOP : guide, puis gaine droite dans le tunnel (1er novembre 2026)

Captures : `captures/v46-*.jpg`.

## Demande

- **Pas d'angulation dans le canal.** Le passage dans le tunnel du FOP ne doit pas couder le matériel.
- **L'ordre réel des gestes.** L'animation commence par un guide, puis une gaine qui ne se coude pas dans le canal, puis
  le déploiement de la prothèse.

## Ce qui a été fait (js/pfo-closure.js)

1. **Un guide d'abord** (étape 2, 4 s).
   - Guide de 0,035 pouce (0,9 mm), gris métal.
   - Il remonte la veine cave inférieure, traverse l'oreillette droite et passe tout droit dans le tunnel, jusque dans
     l'oreillette gauche, son bout souple recourbé en J (v46-01).
2. **La gaine sur le guide** (étape 3, 4,5 s).
   - La gaine de largage (8 F) glisse sur le guide jusque dans l'oreillette gauche (v46-02).
   - Le guide est ensuite retiré (v46-04).
3. **Matériel dans l'axe du tunnel.**
   - Le trajet suit l'axe du tunnel, de l'entrée dans la fosse au débouché dans l'oreillette gauche.
   - L'abord dans l'oreillette droite prolonge cet axe vers l'arrière ; la sortie le prolonge vers l'avant.
   - Le point d'ouverture du disque gauche est choisi dans ce prolongement, toujours à distance des parois.
   - Guide et gaine traversent ainsi le canal en ligne droite, sans coude (gros plan v46-03).
   - La seule courbe est un arc doux dans l'oreillette droite, depuis la veine cave inférieure, tangent à l'axe du
     tunnel. L'ancien trajet abordait la fosse par en dessous et se coudait à l'entrée puis à la sortie du tunnel.
4. **Déploiement de la prothèse.** Inchangé, avec un pas de décalage :
   - disque gauche ouvert dans l'axe de la gaine (v46-05), tiré contre la cloison ;
   - disque droit ;
   - largage.
5. **Barre de progression et caméra.**
   - La barre compte une étape de plus (8).
   - Les plans de caméra sont décalés d'autant : plan large pendant le guide et la gaine.
6. **Première partie (trajet depuis la ponction).** Le dispositif qui remonte la veine fémorale et la veine cave est
   désormais le guide (gris, fin) et non la gaine, pour s'enchaîner avec la deuxième partie.

## Vérification (navigateur sans fenêtre, 1400 × 900)

- Guide, gaine et guide retiré, en plan large (v46-01, v46-02) et en gros plan sur le tunnel (v46-03, v46-04).
- Disque gauche ouvert dans l'oreillette gauche (v46-05).
- **Erreurs JavaScript** : aucune.
