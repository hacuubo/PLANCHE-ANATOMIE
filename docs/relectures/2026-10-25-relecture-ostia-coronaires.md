# Relecture — ostia coronaires, coronaires et voies de conduction (25 octobre 2026)

Captures : `captures/v26-*.jpg` (v26-00 avant, v26-01 et v26-02 après).

## Demandes

1. Les vaisseaux coronaires sont parfois visibles depuis l'intérieur des cavités (aorte, oreillette gauche) : leur
   trajet doit suivre la contraction du myocarde.
2. Masquer les voies de conduction (en jaune) pour le moment.
3. Valve aortique en vue chirurgicale : marquer avec précision les ostia coronaires, dans la continuité des artères
   coronaires droite et gauche déjà présentes.

## Mesures

- **Coronaires et contraction** : position de chaque sommet des vaisseaux testée contre la surface des cavités et des
  lumières de l'aorte et des gros vaisseaux, au repos, au pic de la contraction des oreillettes, en systole et en
  diastole (déformation du battement appliquée aux deux). Aucune artère coronaire n'entre dans une cavité ni dans
  l'aorte, à aucun instant : la déformation est une même fonction de l'espace pour la paroi et les vaisseaux. Seuls le
  sinus coronaire (59 points, déjà masqués dans l'oreillette droite) et la grande veine du cœur (4 points contre
  l'oreillette gauche) dépassaient l'endocarde.
- Ce qui se voyait depuis l'oreillette gauche et l'aorte : l'artère circonflexe, la grande veine du cœur et le tronc
  commun dans leurs sillons, hors des cavités, découverts par la coupe (graisse épicardique retirée).
- **Extrémités des artères** (repère de la valve aortique) : tronc commun à 1,6 cm au-dessus de l'anneau, au-dessus de
  la cuspide coronaire gauche, à 1,8 mm de l'intima ; coronaire droite à 1,9 cm, au-dessus de la cuspide coronaire
  droite, à 4,1 mm de l'intima. Calibre de l'extrémité ≈ 4 mm.

## Ce qui a été fait

1. **Coronaires** : tous les vaisseaux sont coupés au ras de l'endocarde là où ils dépassent dans une cavité, en
   position de repos, si bien que la coupe suit la contraction.
2. **Voies de conduction** (nœuds sinusal et auriculo-ventriculaire, faisceau de His) masquées partout ; un réglage
   (`SHOW_CONDUCTION`, js/app.js) les rétablit.
3. **Ostia coronaires** (js/heart.js) : chaque artère est prolongée à son calibre, de son extrémité au point le plus
   proche de l'intima ; l'intima y est percée et l'ostium apparaît comme un orifice : entonnoir rouge sombre qui
   s'enfonce dans la paroi (lumière de l'artère), fond sombre, fin liseré. Ostium gauche dans le sinus coronaire
   gauche, ostium droit dans le sinus coronaire droit (à 6 h, au-dessus de la cuspide coronaire droite). Ils suivent
   le battement et apparaissent dans les repères (« Ostium coronaire gauche / droite »). La coupe de la vue
   chirurgicale (aortotomie transverse) est remontée à 2 hauteurs de cuspide (≈ 2,25 cm au-dessus de l'anneau), au-dessus
   de la jonction sino-tubulaire et des ostia.

Remarque : dans BodyParts3D, les deux artères naissent haut (1,6 et 1,9 cm au-dessus de l'anneau, à hauteur de la
jonction sino-tubulaire) ; les ostia sont placés là, dans leur continuité exacte, et non à la hauteur moyenne des
séries anatomiques (≈ 1 à 1,3 cm, Ribeiro 2013).

## Vérification

Vue chirurgicale fermée, ouverte, en systole, avec repères, avec TAVI ; vue depuis la chambre de chasse ; vue de face
du cœur (continuité des artères) ; coupes 5 cavités et frontale sans voies de conduction ; console sans erreur.
