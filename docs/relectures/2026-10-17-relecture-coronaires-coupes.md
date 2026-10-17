# Relecture — coronaires, tranches de coupe, coupes 5 cavités et 4 valves (17 octobre 2026)

Commit relu : 98906b2. Deux relecteurs indépendants : anatomie cardiaque, direction artistique. Captures :
`captures/v20-*.jpg` (01-02 avant, 03-05 coronaires, 06-07 coupe 5 cavités, 08 et 10-11 tranche, 09 coupe 4 valves,
12 essai de coupe unique par les quatre valves, rejeté).

## Demande

Coronaires « comme dans les références » avec les principales artères visibles (graisse des sillons supprimable),
tranches de coupe réalistes au lieu d'une couleur unie, suppression de la coupe 4 cavités et coupe 5 cavités
améliorée qui traverse les quatre valves (trait de section non droit accepté), compréhensible par un patient.

## Choix soumis à la relecture

Aucune surface lisible ne passe par le centre des quatre valves en ouvrant les cavités : la mitrale, l'aortique et la
pulmonaire sont presque alignées de l'arrière vers l'avant et les voies d'éjection croisent devant les valves
auriculo-ventriculaires (essais : plis à deux plans, toit à facettes, surface courbe — capture 12). D'où deux coupes :
« 5 cavités » (courbe, par la tricuspide, la mitrale et l'aortique) et « 4 valves » (base vue d'en haut). Les deux
relecteurs approuvent ce choix.

## Anatomie

**Bloquant**
1. IVA, sinus coronaire et segments de la coronaire droite recouverts à ≈ 60 % par le myocarde reconstruit :
   « fuseaux » isolés, lisibles comme une artère bouchée. → **Corrigé** : l'enveloppe est creusée dans le volume de
   chaque vaisseau balayé vers l'extérieur (6 mm) ; chaque vaisseau repose au fond d'un sillon ouvert
   (`groove`, tools/build-heart-bp3d.mjs). Modèle régénéré.

**Important**
2. Fibres de la cloison sans rotation (distance à la cavité la plus proche) → **Corrigé** : fraction transmurale du
   VG calculée au générateur, dVG / (dVG + min(dEpi, dVD)), exportée dans la carte 3D ; l'angle passe de + (face
   gauche) à − (face droite), Streeter 1969.
3. Coupe 4 valves : plan incliné laissant le bas des oreillettes (mitrale en partie cachée) ; texte inexact →
   **Corrigé** : chaque valve est coupée dans son propre plan (anneau des valves mitrale et tricuspide, plan
   perpendiculaire à l'axe des sigmoïdes en leur milieu), centres exacts ; README et commentaires réécrits.
4. Calibre constant le long des vaisseaux → **Corrigé** : gonflement proportionnel au rayon local d'origine (IVA
   distale ≈ 2 mm, Dodge 1992).

**Mineur** : commentaires obsolètes (« coupe pliée », « graisse lobulée ») et fiche « sillons » supprimés ou corrigés ;
« à 2 mm près » → « ≈ 2 mm ». Non retenus : légende d'orientation (le modèle est sans texte, à la demande de
l'utilisateur) ; teinte de l'aorte et du tronc pulmonaire (hors du périmètre).

## Direction artistique

Rien de bloquant.
1. Grain des fibres trop fin, fourmillement de loin → **Corrigé** : faisceaux ≈ 0,5 mm, motif estompé quand il
   devient plus fin que le pixel (`fwidth`).
2. Tranche trop saturée à côté de la surface rose → **Corrigé** : muscle et oreillettes désaturés.
3. Coronaires « plastique » → **Corrigé** : rouge 0xb52a25 et bleu 0x34509a, film humide (clearcoat 0,6), moins de
   reflet satiné ; le sillon creusé (point anatomique 1) leur donne l'ombre de contact qui manquait.
4. Segments flottants → corrigé par le point anatomique 1.
5. Cadrage de la coupe 4 valves → **Corrigé** : plus loin (24 cm), moins incliné, cœur sous le panneau des coupes.
Mineur : coupe 5 cavités rapprochée ; endocarde plus large et plus clair. Non retenus : jaune du système de
conduction, lavande des veines caves (hors du périmètre).

## Vérification après corrections

Captures `captures/v21-*.jpg` (modèle régénéré, 9,2 Mo).

- IVA, coronaire droite, IVP et veine moyenne, sinus coronaire et veines de la face inférieure continus (v21-01 à 03).
  Le creusement est limité au myocarde ventriculaire : une première version creusait aussi les auricules et y
  laissait des entailles grises ; corrigé. Quelques centimètres de la coronaire droite restent sous le bord de
  l'oreillette droite, comme sur une pièce réelle.
- Paroi du VG : médiane 8,2 mm, 10 % à 5,3 mm (fond des sillons creusés sous les vaisseaux).
- Cloison : fibres qui changent d'orientation d'une face à l'autre (v21-05) ; tranche désaturée, sans fourmillement.
- Coupe 4 valves : les quatre centres sont exactement sur la surface ; oreillettes retirées jusqu'aux anneaux,
  mitrale entièrement dégagée ; les coronaires apparaissent en section dans les sillons de la base (v21-06).
- Coupe 5 cavités, vue chirurgien, frontale, circulation guidée, gros plans des valves : vérifiés, console sans erreur.
