# Cœur 3D — applications iOS et Android

Enveloppe [Capacitor](https://capacitorjs.com) du site cardioexplain.com. Le site (dossier parent) n'est pas modifié :
`scripts/build-www.mjs` le copie dans `www/` en embarquant three.js et les polices (plus aucune ressource chargée
depuis Internet, l'application marche hors ligne dès l'installation). Rien ici ne déclenche de mise en ligne du site.

- Identifiant : `com.cardioexplain.coeur3d` (définitif une fois la première version envoyée à un store)
- Nom affiché : Cœur 3D
- `android/`, `ios/` : projets natifs générés par Capacitor 8 (`www/` y est recopié par `npx cap sync`)

```bash
npm install          # une fois
npm run www          # recopie le site dans www/
npm run sync         # www/ + mise à jour des projets android/ et ios/
npm run android      # ouvre le projet dans Android Studio
```

Icônes et écrans de démarrage (à refaire si `icons/icon.svg` change) :

```bash
node app/scripts/make-native-assets.mjs     # depuis le dossier du site : app/assets/*.png
npx capacitor-assets generate --iconBackgroundColor '#e3e9f0' --iconBackgroundColorDark '#e3e9f0' --splashBackgroundColor '#e8edf3' --splashBackgroundColorDark '#e8edf3'   # depuis app/
```

`ios/App/App/Info.plist` déclare `ITSAppUsesNonExemptEncryption = NO` (pas de chiffrement propre : pas de
question d'exportation à chaque envoi).

## Feuille de route

| # | Étape | Où | État |
|---|-------|----|------|
| 1 | Projet Capacitor, site embarqué hors ligne | ce dossier | fait (19/11/2026) |
| 2 | Compte Google Play Console, personnel (25 $, une fois, vérification d'identité) | Chrome | créé et payé le 19/11/2026 ; restent : pièce d'identité, statut DSA, connexion depuis un appareil Android (appli Play Console), validation du téléphone |
| 3 | Compte Apple Developer, individuel (99 $/an, compte Apple avec double authentification, nom légal = vendeur affiché) | Chrome | actif (renouvellement le 20/11/2027) ; le 26/11/2026 : App ID `com.cardioexplain.coeur3d` enregistré, conditions App Store Connect acceptées, app « Cœur 3D » créée (français, UGS `coeur3d`) ; statut DSA à déclarer pour l'UE |
| 4 | Android Studio + JDK sur ce PC, première version sur un téléphone Android | PC | à faire |
| 5 | Icônes et écran de démarrage natifs (à partir de `icons/`), boutons Installer / Partager adaptés à l'appli | ce dossier | icônes et démarrage faits le 26/11/2026 (`node app/scripts/make-native-assets.mjs` puis `npx capacitor-assets generate`, voir plus bas) ; boutons à faire |
| 6 | Politique de confidentialité sur cardioexplain.com (obligatoire pour les deux stores) — une seule mise en ligne, regroupée | site | à faire |
| 7 | Test fermé Google Play : **≥ 12 testeurs inscrits 14 jours d'affilée**, puis demande d'accès à la production (examen ≈ 1 semaine) | Play Console | à faire |
| 8 | Compilation iOS sans Mac : GitHub Actions (Mac gratuits pour un dépôt public, sur une branche autre que `main` : pas de mise en ligne du site) ou Codemagic, clé d'API App Store Connect, envoi vers TestFlight | Chrome + dépôt | à faire |
| 9 | Fiches des stores : captures, description FR/EN, classification, déclarations (santé, données, statut DSA) | les deux consoles | à faire |
| 10 | Envoi en examen Apple ; production Google | les deux consoles | à faire |

### Points d'attention

- **Google, comptes personnels créés après le 13/11/2023** : pas de publication avant le test fermé de l'étape 7. C'est le
  plus long : recruter les testeurs (collègues, proches, avec un téléphone Android et un compte Google) dès que la
  première version de test existe.
- **Apple, règle 4.2 (fonctionnalité minimale)** : un site simplement emballé est refusé. Ici, le contenu est embarqué
  et fonctionne hors ligne ; ajouter si besoin un peu de natif (partage, retour haptique).
- **Applications médicales** : Google Play réserve les « applications de santé, telles que les applications
  médicales » aux comptes d'organisation (règle « Exigences concernant la Play Console »). Choix fait le 19/11/2026 :
  compte personnel, appli présentée comme **éducative** (apprentissage de l'anatomie, catégorie Éducation, sans
  diagnostic ni traitement ni donnée de santé), « Applis médicales » non cochée à l'inscription. Garder la mention
  « ne remplace pas l'avis de votre médecin ». Si Google la classe santé à l'examen : compte d'organisation
  (micro-entreprise + D-U-N-S), ce qui supprime aussi le test des 12 testeurs.
- **Gratuite, sans publicité ni traceur** au départ : pas de contrat bancaire/fiscal, fiches de confidentialité
  « aucune donnée collectée ». En UE, statut DSA « non-professionnel » possible (adresse non publiée) tant que l'appli
  ne rapporte rien.
- **Licences** : BodyParts3D CC BY 4.0 (attribution déjà dans l'appli), three.js MIT, polices SIL OFL (licences copiées
  dans `www/vendor/`).
- Ce que seul le titulaire fait : mots de passe, codes de validation, pièce d'identité, paiements.
