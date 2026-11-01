# Relecture — TAVI, aorte fendue en long (1er novembre 2026)

Captures : `captures/v40-*.jpg`.

## Demande

Sur l'animation de la TAVI, la transparence antérieure de l'aorte doit être continue, comme un tuyau coupé dans la
longueur. Dans la version précédente, on voyait encore, en avant, les tranches du plan de coupe, qui gênaient la vue
(v40-01, ancienne version).

## Ce qui a été fait

1. **Aorte fendue sur toute sa longueur** (js/heart.js, `buildTaviMask`, `addTaviMask`).
   - **Une ouverture qui suit l'aorte.**
     - La surface d'ouverture passe par la ligne centrale de l'aorte, perpendiculaire à la direction d'observation.
       Le plan de coupe, lui, passait devant l'aorte ascendante et coupait la crosse en biais.
     - Près de la valve (entre 1,2 et 3 cm), la surface rejoint progressivement le plan de coupe de la vue, qui passe
       par le centre de la valve : la racine reste coupée comme avant.
   - **Moitié antérieure en voile continu.**
     - La moitié retirée reste dessinée en voile clair, d'un seul tenant, de la racine à l'aorte descendante.
     - Le voile n'est plus tranché par le plan de coupe.
   - **Tranches.**
     - Dans le territoire de l'aorte, les tranches du plan de coupe sont écartées.
     - La tranche de la paroi est posée sur la surface d'ouverture (ruban `taviRibbon`, js/app.js), le long des deux
       bords du tuyau.
     - Le compte du stencil suit la même surface.
   - **Fente du maillage.** L'intima de l'aorte présentait une fente à la jonction de l'aorte ascendante et de la crosse,
     que cachait la paroi antérieure. La face interne de la paroi postérieure, teinte comme l'intima, la comble
     pendant l'animation.
2. **Guide et cathéter nets** (js/tavi-anim.js).
   - Le voile est mélangé dans la passe opaque, après les tranches.
   - Le matériel de la TAVI est dessiné ensuite. Le guide, le cathéter et la valve sertie restent nets à travers le
     voile.
3. **Artère pulmonaire.** Elle reste en transparence. Ailleurs, la coupe ne change pas.

## Vérification (navigateur sans fenêtre, 1400 × 900)

- **Aorte** : fendue en long, sans tranche en avant, guide net dans la crosse et l'aorte descendante (v40-02).
- **Cathéter** : le cathéter et la valve sertie montent dans l'aorte descendante (v40-03).
- **Déploiement** : gros plan inchangé (v40-04).
- **Fin** : écran partagé avant / après inchangé.
- **Erreurs JavaScript** : aucune.
