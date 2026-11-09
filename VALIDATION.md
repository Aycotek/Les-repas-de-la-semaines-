# État actuel

Voir CONSOLIDATION300.md pour les résultats de la version300. Le catalogue actuel contient300 recettes. Les comparaisons nutritionnelles de versions antérieures sont historiques et ne remplacent pas ce bilan actuel.

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
| Catalogue | 300 recettes, 60 par saison +60 toute l'année ; 300 tests d'intégrité | Cuisine non testée physiquement ; étapes parfois courtes |
| Saison si possible | Bonus de score, pas interdiction stricte | Tous les ingrédients d'une recette ne sont pas contrôlés en temps réel |
| Budget environ 80 € | Calcul quantités × hypothèses €/kg ; 60 semaines testées | Pas un panier Lidl, pas de relevé de prix ni de conditionnement réel |
| Équilibre | Score nutritionnel et repères poissons/légumineuses/viande/charcuterie ; 60 plans et 7 relances | Optimisation heuristique, aucune garantie nutritionnelle complète |
| Bilan | 27 nutriments, moyenne par personne, références adultes types et lacunes par nutriment | 762 cellules nutriment absentes (dont ingrédients sans correspondance validée) ; états cru/cuit et pertes de cuisson non harmonisés |
| Ajouts manuels | Articles libres + plats du catalogue avec choix explicite : remplacer un des 7 dîners prévus ou ajouter un 8e repas (réception) ; courses et nutrition recalculées dans les deux cas | Pas de saisie libre d'une nouvelle recette ou import de lien |
| Courses | Sommes par ingrédient, rayon, grammes/kg, cases cochables persistantes | Produits composés et unités magasin non normalisés ; articles libres hors prix/nutrition |
| Exclusions | Familles développées, appliquées à génération et relance | Pas une garantie allergène/traces ; vérifier les produits |
| Matériel et temps | Alerte matériel et alternative ; recette >60 min signalée | Pas d'équivalent universel au four, ni test réel de cuisson |
| Mobile | Parcours 390 px, 320 px et 1280 px, captures inspectées | Chrome simulé, pas un essai physique sur tous les iPhone/Android |
| Persistance | Plans, ajouts, profil, cases par semaine ; données corrompues récupérées | Local à ce navigateur ; pas de compte, synchronisation ou sauvegarde cloud |
| Hors connexion | Worker limité aux fichiers de l'app ; test après premier chargement | Nécessite un premier accès en ligne ; vider les données du site efface les plans |

## Résultats des suites

- 20 contrôles initiaux de données et plan (inclut certains contrôles redondants, ne constitue pas 20 scénarios indépendants).
- 585 assertions groupées des fonctions de production : 60 plans (12 mois × 5 graines), limites viande/charcuterie, remplacement, quantités, bilan, prix, exclusions, données manquantes, stockage invalide, dates ISO, intégrité de 300 recettes.
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

## Révision nutrition et variété, 9 novembre 2026

### Mesure comparative

60 plans appariés : 12 mois × graines 1 à 5, profil type 2 personnes/4 portions. Médianes des pourcentages de références hebdomadaires, pour les repas planifiés uniquement :

| Nutriment | V1 plats | Révision plats | Révision avec option fruit/yaourt/amandes |
| --- | ---: | ---: | ---: |
| Calcium | 40,1 % | 54,5 % | 98,0 % |
| Vitamine C | 60,5 % | 70,2 % | 178,6 % |
| Vitamine D | 41,2 % | 52,5 % | 56,6 % |
| Vitamine E | 45,9 % | 63,5 % | 129,3 % |
| Fibres | 67,2 % | 70,5 % | 97,5 % |
| Protéines | 117,9 % | 117,8 % | 146,4 % |

La vitamine E des plats serait 50,3 % avec l'ancienne référence de 12 mg/j : une partie du passage à 63,5 % vient seulement de la référence actuelle 10/9 mg/j. Les corrections de données et les choix de plats sont inclus dans la comparaison : ce n'est pas un essai clinique.

Prix avec option : médiane 76,17 €, plage 63,80 à 95,80 €, 21 plans sur 60 dépassent 80 €. Il s'agit des hypothèses de prix, pas du montant d'un panier réel. L'option n'est pas ajoutée automatiquement pour améliorer les chiffres. Les plans de plats restent sous 80 € dans ces tests.

Le score limite les gains au-delà d'un seuil interne de 70 % (outil de comparaison, pas repère médical), pénalise les apports les plus faibles et les formes culinaires répétées. Sur les 60 plans, au plus deux plats de type soupe/dahl/curry/ramen par semaine. La classification par nom est une heuristique et ne prouve ni le goût ni la qualité clinique.

### Tests de régression

- 20 contrôles initiaux.
- 585 assertions groupées des fonctions de production.
- 138 contrôles nouveaux : compléments sur 12 mois, quantités, tous les nutriments, coût, courses, retrait, exclusions, séparation des semaines, conservation des plans enregistrés, correspondances et variété sur 60 plans.
- 32 contrôles navigateur : les 28 précédents plus inclusion, persistance, bilan et retrait des compléments.
- 24 contrôles de sécurité : XSS, stockage corrompu, CSP, absence d'envoi réseau applicatif et confinement du cache.

Les tests ne garantissent ni absence de faille inconnue ni couverture nutritionnelle individuelle. Les plans déjà enregistrés ne sont pas régénérés automatiquement. Les données de composition corrigées et les corrections de recettes s'appliquent aussi aux calculs d'un plan existant. Aucune donnée de foyer n'est envoyée au dépôt.


## Révision 3 : refonte visuelle, génération de la semaine, allergies et aliments à éviter

Périmètre : même produit, mêmes données. Ajouts : `allergenes.js`, `illustrations.js`, nouveau `styles.css`, onglet Semaine réorganisé.

**Allergies (sécurité).** Les 14 allergènes UE (lupin inclus, affiché mais sans ingrédient au catalogue) sont classés pour chacun des 252 ingrédients (certain « c » ou possible selon la marque « p » pour les produits transformés). Une allergie cochée exclut aussi le « possible ». Un test échoue si un ingrédient n'est pas classé. Pour chaque allergène, 12 mois x 3 graines : aucun plan généré ni repas relancé ne contient l'allergène. Si la table d'allergènes manque, une allergie exclut tout (échec fermé). Les anciens réglages sont migrés vers des exclusions au moins aussi strictes.

**Limites dites.** Filtre indicatif, pas une garantie médicale : traces, contamination croisée, recettes industrielles qui changent, noix de coco (non incluse dans « fruits à coque » dans la liste UE), lupin (aucun ingrédient au catalogue). Classification faite à la main par l'application, pas relue par un allergologue ni un diététicien.

**Aversions.** Séparées des allergies (goût, pas sécurité) : porc, bœuf, veau/agneau, volaille, toute viande, poisson, fruits de mer, champignons, coriandre, oignon/ail, olives, choux, coco, alcool, os/moelle, épices ; plus un aliment libre (ex. courgette).

**Illustrations.** Dessins vectoriels non génératifs adaptés aux ingrédients et à la préparation de chaque recette (300/300 valides, déterministes, sans image externe ni droit tiers). Ce ne sont pas des photos : l'étiquette « Dessin illustratif » est affichée.

**Design.** Beige et bordeaux, matières en verre dépoli avec repli opaque, animations courtes coupées par `prefers-reduced-motion`.

Contrôles de la révision 3 : 20 +585 +138 +717 assertions (1 460 au total) (dont allergènes, illustrations, compléments, régressions œuf-bœuf et lait-laitue), 55 parcours navigateur, 24 contrôles sécurité. Ce sont des tests automatiques, pas des retours d'utilisateurs réels.

**Révision images et raclette (9 nov. 2026).** Raclette (a53) : titre sans « four », préparation à l'appareil à raclette, équipement « appareil à raclette » requis par la recette. La case du Foyer est décochée tant que l'utilisateur ne la coche pas (aucune possession supposée, anciens réglages inchangés) ; la carte signale le matériel manquant comme pour les autres équipements. 88 dessins repris pour des assiettes plus fournies : cadrage plus serré, éléments plus grands, et pour 15 plats la présentation de deux portions au lieu d'une. Aucun ingrédient, quantité ou donnée nutritionnelle modifié. Dessins toujours programmés, non génératifs. Cache SW v10.
