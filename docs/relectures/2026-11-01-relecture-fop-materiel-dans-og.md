# Relecture — Fermeture du FOP : matériel dans l'oreillette gauche (1er novembre 2026)

Captures : `captures/v47-*.jpg`.

## Demande

Rendre le geste anatomiquement plausible :
- **le guide** se courbe une fois dans l'oreillette gauche, sans en dépasser les limites ;
- **la gaine**, une fois en place, ne dépasse pas non plus les limites de l'oreillette ;
- **le retrait du guide** par la gaine devient une étape, avant le déploiement ;
- **le premier temps du déploiement** (disque gauche) se fait entièrement à l'intérieur de l'oreillette gauche.

## Ce qui a été fait (js/pfo-closure.js)

1. **La géométrie, mesurée sur le modèle au repos.**
   - Au débouché du tunnel, l'axe du tunnel bute sur la paroi de l'oreillette gauche : à 3 mm, on est déjà hors de
     l'oreillette, car le tunnel longe la cloison.
   - La place libre est vers le centre de l'oreillette, à ≈ 125° de cet axe.
   - Le centre de l'oreillette est à 2,5 cm du débouché, et à 1 cm de la paroi la plus proche.
   - C'est pourquoi les versions précédentes, qui prolongeaient l'axe du tunnel, sortaient de l'oreillette.
2. **Le guide se recourbe une fois, dès le débouché.**
   - Un arc régulier, tangent à l'axe du tunnel, tourne jusqu'à viser le centre de l'oreillette.
   - Le rayon est choisi pour que l'arc reste dans l'oreillette (2,8 mm).
   - Le guide file ensuite tout droit vers le centre, et son bout souple fait un J.
   - Il reste partout dans l'oreillette, à 1,5 mm au moins des parois (distance signée à l'endocarde, au repos) (v47-01,
     gros plan v47-02).
   - Dans le tunnel, il reste droit et ne se coude pas ; dans l'oreillette droite, un seul arc doux depuis la veine cave.
3. **La gaine** glisse sur le guide, droite dans le tunnel. Elle s'arrête dans l'oreillette gauche, sur l'axe du guide,
   au point où le disque gauche pourra s'ouvrir sans toucher les parois (v47-03).
4. **Nouvelle étape : « On retire le guide par la gaine »** (2,5 s, v47-04).
5. **Disque gauche.** Poussé hors de la gaine, il s'ouvre entièrement dans l'oreillette gauche, avec 2 mm de marge
   avec les parois au plus près (v47-05, v47-06). Il est ensuite tiré contre la cloison, comme avant.
6. **Barre de progression et caméra.** La barre compte 9 étapes. Les plans de caméra sont décalés de 2 s, avec le plan
   large pendant le guide, la gaine et le retrait du guide.

## Vérification (navigateur sans fenêtre, 1400 × 900)

| Mesure | Résultat |
|---|---|
| Marge du guide dans l'oreillette gauche, au plus près | 1,5 mm |
| Marge du disque gauche ouvert, au plus près | 2 mm |

- Captures du guide, de la gaine, du retrait du guide et du disque gauche ouvert dans l'oreillette (v47-01 à v47-06).
- **Erreurs JavaScript** : aucune.
