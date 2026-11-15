# Référentiel officiel pour le statut « sain » des plats — recherche et proposition (2026-11-15, privé, v2)

> v2 : corrige la section marque (la v1 concluait « non éligible » de façon absolue ; l'article 4.1 du règlement d'usage prévoit une exception expresse pour les éditeurs d'applications) et recadre le chantier cru/cuit (candidats à traiter, pas résolus).

## 1. Ce que dit l'officiel sur le calcul pour les recettes

La FAQ officielle Santé publique France (algorithme actualisé, V11) prévoit explicitement le cas des recettes, applications comprises. Passage verbatim :

> « Dans le cas des recettes, par exemple dans les magazines, les applications ou dans du matériel promotionnel, le calcul se base sur les quantités et valeurs nutritionnelles des différents ingrédients constituant le plat tel que consommé, c'est-à-dire après cuisson des ingrédients nécessitant d'être cuits. […] En France, les tables CIQUAL sont considérées comme la référence. […] Les valeurs nutritionnelles de la recette doivent tenir compte des ingrédients une fois préparés cuits, c'est-à-dire en tenant compte de la part comestible de l'ingrédient et de son facteur de rendement à la cuisson. Une fois les valeurs nutritionnelles calculées pour la recette prête à être consommé, l'algorithme général pour les aliments et le calculateur disponible en ligne peuvent être utilisés. La liste des ingrédients entrant dans la réalisation de la recette et leur quantité doivent être clairement établis. Un tableau de valeurs nutritionnelles de la recette doit être présenté. »

Et la limite posée par la même FAQ :

> « La réponse à cette question reste transitoire et est susceptible d'évoluer en fonction des résultats des projets menés dans le cadre des programmes nationaux de nutrition (PNNS). »

Algorithme actualisé en vigueur en France depuis le 16 mars 2025 : composantes N (énergie kJ, AGS, sucres, sel) et P (fibres, protéines, % fruits/légumes/légumes secs/fruits à coque), calculateur officiel en ligne. Le % FVL se calcule sur la liste des ingrédients dans le même état (crus ou cuits).

Précédent officiel plats composés : études pilotes DGS en restauration collective, Nutri-Score de recettes calculés avec parts comestibles et facteurs de rendement documentés (annexe 2 du bilan ; manuel CSH belge, données CIV viandes). La FAO (Bognár) publie les facteurs de rendement et de rétention par méthode de cuisson.

## 2. Marque « Nutri-Score » — trois usages distincts, aucune conclusion juridique tranchée ici

Le règlement d'usage (version mars 2025) distingue des situations que la v1 de ce document avait fusionnées. Passages verbatim :

**Propriété (art. 3)** : « Santé publique France est pleinement propriétaire de la Marque Nutri-Score et seul titulaire des droits de propriété intellectuelle […]. »

**Règle générale (art. 4.1)** : « L'usage de la Marque Nutri-Score est réservé aux Exploitants, personnes physiques ou morales, fabricants et distributeurs de Produits mis sur les marchés des Territoires […]. »

**Exception qui concerne directement une app comme celle d'Arthur (art. 4.1)** : « Par exception, les éditeurs de logiciels et d'applications disposent d'un droit d'usage de la Marque Nutri-Score à des fins d'assistance des Exploitants ou d'information du public. Par dérogation aux Articles 4.2 et 4.3, les éditeurs de logiciels et d'applications concernés doivent faire une demande d'utilisation exceptionnelle par courriel au Régulateur compétent sur leur Territoire avant tout usage de la Marque Nutri-Score. » Autre exception : « Des personnes autres que celles susvisées, telles que des auteurs ou éditeurs en ligne, peuvent obtenir un droit d'usage de la Marque Nutri-Score afin d'informer le public sur la Marque Nutri-Score », même procédure par courriel.

**Restriction sur le signe verbal seul (art. 5)** : l'Exploitant « s'engage à ne pas faire usage du signe verbal "Nutri-Score" seul, c'est-à-dire sans les éléments graphiques du Logo Classant, sur des supports matériels et, en particulier, sur les Produits » ; le signe verbal seul n'est permis « qu'aux seules fins de communication dans les conditions prévues à l'article 7 ».

Il faut donc distinguer trois choses :

| Usage | Ce que dit le règlement | Conséquence pratique pour l'app |
|---|---|---|
| a) Logo classant (les 5 logotypes A-E) | réservé aux Exploitants enregistrés + exceptions art. 4.1 (dont éditeurs d'applications, sur demande par courriel au Régulateur) | interdit sans droit d'usage explicite |
| b) Nom « Nutri-Score » seul (signe verbal, ex. dans une phrase explicative) | restreint même pour les Exploitants (art. 5 : fins de communication seulement) ; les exceptions 4.1 couvrent un usage « d'information du public » | **non tranché ici** : une mention descriptive dans un avertissement pourrait relever de l'exception « information du public », mais c'est au Régulateur de le confirmer |
| c) Implémenter l'algorithme publié sans aucun élément de marque | l'algorithme est un document public avec calculateur officiel ; le règlement encadre la marque, pas le calcul | possible en l'état, sans nommer la marque |

**Point ouvert, pas une conclusion** : Arthur, en tant qu'éditeur d'application, peut demander par courriel à Santé publique France un droit d'usage exceptionnel à fin d'information du public. Tant qu'aucune réponse n'est obtenue : ni logo, ni nom dans l'interface, y compris dans un avertissement ou un libellé de méthode. Le libellé « méthode de référence française » proposé en v1 est retiré : toute formulation finale attend la vérification de ce qui est permis (réponse du Régulateur, ou avis juridique si Arthur veut aller plus vite). Ce document ne tranche pas la question juridique ; il rassemble les passages applicables.

## 3. Données de l'app vs entrées requises

| Entrée algorithme | Disponible ? |
|---|---|
| Énergie (kJ/100 g) | oui (kcal × 4,184) |
| AGS, sucres, sel | oui (CIQUAL par ingrédient) |
| Protéines, fibres | oui |
| % fruits/légumes/légumes secs/fruits à coque | **à construire** : classification par ingrédient (~252 entrées, travail borné et vérifiable) |
| État tel que consommé (cuit, part comestible, rendement, rétention) | **principal manque** : voir §4 |
| Tableau des valeurs par recette | déjà présentable (fiche détail) |

## 4. Inventaire cru/cuit — candidats à traiter, pas résolus (recadrage v2)

2 318 liaisons ingrédient-recette (docs/cru-cuit-inventaire.json). **Correction de cadrage** : un poids cru d'ingrédient dans une recette cuite ne justifie PAS de substituer un code CIQUAL « cuit » à poids constant. Il faut, recette par recette : masse finale comestible (rendement de cuisson + pertes), facteurs de rétention par nutriment, puis cohérence avec la portion affichée. Les classes ci-dessous sont des **candidats** dont le traitement reste à prouver, pas des cas résolus.

- **1 060 candidats « cru lié dans recette cuite »** : pour chacun, déterminer s'il existe un code CIQUAL cuit correspondant ET établir la masse cuite depuis la masse crue de la recette (rendement par méthode de cuisson), sinon facteur de rendement officiel sourcé. Aucune substitution automatique.
- **207 candidats « absorbants d'eau »** (riz 58, lentilles, pâtes, semoule…) : l'intervalle de rendement ~2,5-3 cité en v1 est un **ordre de grandeur de littérature, pas une valeur résolue** ; chaque cas exige un facteur sourcé (CIQUAL/FAO) adapté à l'ingrédient et à la méthode.
- **914 liaisons à qualifier** : majoritairement des ingrédients sans transformation cru→cuit propre (huile 126, crème 85, beurre 71, pain 56, vinaigre, moutarde, parmesan, lait…) ; la qualification consiste à documenter, par ingrédient, l'absence de code cuit CIQUAL et l'hypothèse d'incorporation telle quelle — avec les exceptions à traiter (alcool du vin, graisse de cuisson non consommée…).
- 112 déjà alignées, 25 sans cuisson.

Chaque correction entrera dans le journal cellule par cellule (docs/ingredient-deltas.json), jamais en application automatique.

## 5. Proposition produit — NON soumise à Arthur à ce stade

**Préalable** : tant que le point marque (§2) n'est pas tranché et que le chantier données (§3-4) n'est pas terminé, ces options restent internes. Quand elles seront présentées, le choix d'Arthur portera sur la présentation et le périmètre, jamais sur des seuils.

**Option A — score calculé par l'algorithme publié, sans aucun élément de marque.**
- Algorithme actualisé (publié) sur la recette telle que consommée, par portion.
- **Le regroupement 5 classes → 2 couleurs (A/B vert, C/D/E orange) est un choix de produit, pas un seuil officiel** : il devra être justifié à l'affichage comme un regroupement d'affichage, sans laisser entendre que vert = « sain » au sens santé ni qu'orange = « malsain ». Le libellé exact reste ouvert (dépend de §2).
- « Gourmand » = cœur favori, préférence indépendante et non mesurée ; jamais fusionné avec le score.
- Prérequis : chantier cru/cuit + classification FVL + réponse sur la marque. D'ici là : anneau neutre (état actuel).

**Option B — rester au statut neutre actuel** (données disponibles/incomplètes), aucun codage couleur.

**Option C — pas de couleur par plat** ; équilibre porté par les repères PNNS hebdomadaires déjà dans le bilan.

## Sources consultées directement le 15/11/2026
- FAQ Nutri-Score algorithme actualisé (passage recettes cité verbatim §1) : https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-FR_V11.pdf
- Règlement d'usage de la marque, mars 2025 (art. 3, 4.1, 5 cités verbatim §2) : https://www.santepubliquefrance.fr/sites/default/files/rdd/document/mars2025RU-FR-vf.pdf
- Page Nutri-Score Santé publique France (enregistrement) : https://www.santepubliquefrance.fr/nutrition-et-activite-physique/nutri-score
- Évolutions algorithme : https://www.santepubliquefrance.fr/presse/lalgorithme-de-calcul-du-nutri-score-evolue-pour-promouvoir-des-choix-alimentaires-plus
- Bilan études pilotes DGS Nutri-Score en restauration collective (annexe 2) : https://sante.gouv.fr/IMG/pdf/bilan_etudes_pilotes_nutri-score_rhf.pdf
- Bognár/FAO — facteurs de rendement et rétention : https://www.fao.org/uploads/media/bognar_bfe-r-02-03.pdf
- CIQUAL 2025 : https://entrepot.recherche.data.gouv.fr/file.xhtml?persistentId=doi%3A10.57745%2FRPWYZD&version=1.0
- Limite connue (transformation non mesurée, INRAE) : https://www.inrae.fr/actualites/nutri-score
