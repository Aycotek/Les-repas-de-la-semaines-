# Validation et limites - 9 novembre 2026

## Lancer les contrôles

Node.js 22 ou plus récent et Chrome/Chromium installés.

```
npm ci
npm test
npm run test:browser
npm run test:security
```

Les deux suites navigateur utilisent Chrome à `/usr/bin/google-chrome` par défaut. Définir `CHROME_BIN` pour un autre chemin. Elles lancent un serveur local temporaire. Pour tester une publication : `node tests/browser.cjs URL` et `node tests/security.cjs URL` (URL terminée par `/`). Les tests utilisent un profil de navigateur neuf et ne modifient pas le compte GitHub.

## Besoins et preuves

| Besoin | Mise en œuvre et contrôle | Limite |
|---|---|---|
| Semaine de repas | 7 recettes distinctes, dates dîner et déjeuner de restes | Planning par dîner, pas agenda multi-repas |
| 4 portions = 2 dîner + 2 restes | Agrégation des ingrédients une seule fois ; tests 4/8 portions et bilan | Restes supposés consommés, pas déclaration de consommation réelle |
| Catalogue | 200 recettes, 40 par saison + 40 toute l'année ; 200 tests d'intégrité | Cuisine non testée physiquement ; étapes parfois courtes |
| Saison si possible | Bonus de score, pas interdiction stricte | Tous les ingrédients d'une recette ne sont pas contrôlés en temps réel |
| Budget environ 80 € | Calcul quantités × hypothèses €/kg ; 60 semaines testées | Pas un panier Lidl, pas de relevé de prix ni de conditionnement réel |
| Équilibre | Score nutritionnel et repères poissons/légumineuses/viande/charcuterie ; 60 plans et 7 relances | Optimisation heuristique, aucune garantie nutritionnelle complète |
| Bilan | 27 nutriments, moyenne par personne, références adultes types et lacunes par nutriment | 539 cellules source absentes ; états cru/cuit et pertes de cuisson non harmonisés |
| Ajouts manuels | Articles libres + repas du catalogue ; courses et nutrition recalculées | Pas de saisie libre d'une nouvelle recette ou import de lien |
| Courses | Sommes par ingrédient, rayon, grammes/kg, cases cochables persistantes | Produits composés et unités magasin non normalisés ; articles libres hors prix/nutrition |
| Exclusions | Familles développées, appliquées à génération et relance | Pas une garantie allergène/traces ; vérifier les produits |
| Matériel et temps | Alerte matériel et alternative ; recette >60 min signalée | Pas d'équivalent universel au four, ni test réel de cuisson |
| Mobile | Parcours 390 px, 320 px et 1280 px, captures inspectées | Chrome simulé, pas un essai physique sur tous les iPhone/Android |
| Persistance | Plans, ajouts, profil, cases par semaine ; données corrompues récupérées | Local à ce navigateur ; pas de compte, synchronisation ou sauvegarde cloud |
| Hors connexion | Worker limité aux fichiers de l'app ; test après premier chargement | Nécessite un premier accès en ligne ; vider les données du site efface les plans |

## Résultats des suites

- 20 contrôles initiaux de données et plan (inclut certains contrôles redondants, ne constitue pas 20 scénarios indépendants).
- 484 assertions groupées des fonctions de production : 60 plans (12 mois × 5 graines), limites viande/charcuterie, remplacement, quantités, bilan, prix, exclusions, données manquantes, stockage invalide, dates ISO, intégrité de 200 recettes.
- 28 contrôles de parcours navigateur : affichage, détails, relance, rechargement, ajout/suppression article et repas, profil/exclusions/portions, navigation entre semaines, cases cochables, écrans étroits, hors connexion.
- 24 contrôles défensifs : charges XSS, contenu persisté malformé, identifiants prototype, profil corrompu, CSP, absence d'évaluation dynamique et de scripts externes, isolation du cache.
- Dépendances de test verrouillées ; audit npm : aucune vulnérabilité connue signalée à la date du contrôle. Aucune dépendance tierce dans l'app à l'exécution.

Ces nombres décrivent les contrôles exécutés. Ils ne sont ni une preuve clinique ni une garantie de sécurité totale.

## Revue de sécurité

Corrections : texte des articles échappé avant insertion HTML ; types/tailles des données persistées validés ; dictionnaires sans prototype pour les identifiants de recette ; limites d'ajouts ; CSP `script-src 'self'`, objets interdits et absence de scripts externes ; cache isolé par portée, limité à une liste de fichiers, n'effaçant pas les caches d'autres applications.

L'app ne contient ni clé API, ni secret, ni backend d'authentification, ni analyse publicitaire. Les réglages restent dans le stockage du navigateur. La publication et les accès au site restent soumis au traitement réseau habituel de GitHub Pages. Le dépôt public et son historique ont été recherchés pour les motifs courants de clés privées, jetons GitHub/Google et les identifiants de contact utilisés pendant le développement : aucune correspondance trouvée. Un scan par motifs ne détecte pas tous les secrets possibles.

Limites : CSP en balise meta, pas en en-tête HTTP ; les styles inline sont autorisés pour les barres de bilan. GitHub Pages ne permet pas de configurer librement tous les en-têtes de sécurité. Un site compromis sur la même origine, une extension malveillante ou un appareil partagé peut exposer le stockage local. Pas de garantie d'absence de faille ; pas de pentest de l'infrastructure GitHub ou Google. Aucun réglage de sécurité de compte n'est modifié par l'app.

## Non inclus

Comptes multi-appareils, connexion sociale dans l'app, synchronisation, moteur de prix magasin, commande/paiement de courses, catalogue de produits emballés type Yuka, prise en charge clinique des allergies/pathologies/grossesse. Ne pas présenter ces capacités comme terminées.
