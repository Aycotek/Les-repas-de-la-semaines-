# Analyse cru/cuit — états CIQUAL vs pesées recettes

Date : 15/11/2026. Statut : analyse sans adoption — aucune hypothèse de correction n'est appliquée, les options sont soumises à revue. Périmètre : 252 ingrédients, 300 recettes.

## 1. Périmètres exacts (clarification demandée)

- **4 ingrédients sans aucune donnée nutriment** (108 cellules null = 4 × 27) : galette_riz, moelle_os, ortie_feuille, pate_a_pain. Étiquetés « pas de correspondance validée ».
- **5 ingrédients étiquetés « pas de correspondance validée »** : les 4 ci-dessus + sauce_huitre, qui n'est plus vide depuis le 15/11/2026 : 24 nutriments renseignés sur 27 (8 par les deltas originels + 16 au lot n13, ligne CIQUAL 2025 code 11223), 3 cellules encore absentes (selenium, vitE, omega3 — « - » ou vide dans la source). Son étiquette d'état était périmée : corrigée au lot n15.
- **pruneau** : étiquette « absent du miroir CIQUAL ENG » fausse (le code 13042 existe en ENG et FR, défaut B2) ; données présentes. Étiquette corrigée au lot n15.
- **4 états personnalisés avec données** : moule et palourdes (chair crue, prix ramené au kg de chair), veau_jarret (cru, partie comestible), poitrine_demi_sel (demi-sel, sel avant blanchissage).
- **polenta** : semoule précuite SÈCHE que l'heuristique du script classait « cuit/appertisé » (mot « cooked » dans le nom anglais) ; le kcal 350 est celui du produit sec, cohérent avec une pesée sèche. Étiquette corrigée au lot n15.

Après corrections n15 : 223 état cru/sec, 19 cuit/appertisé, 4 sans correspondance (vides), 6 états documentés spécifiques.

Usage dans les recettes (couples recette×ingrédient) : 2194 à l'état cru/sec, 118 à l'état cuit/appertisé (conserves égouttées, jambon, confit…), 6 sans correspondance.

## 2. Cohérence des pesées

- **Féculents secs** (riz, pâtes, lentilles, semoule, quinoa, boulgour) : lignes CIQUAL à l'état sec/cru, pesées recettes au sec. L'eau de cuisson ne porte pas de kcal : les totaux par portion sont conservés. Cohérent.
- **Conserves et appertisés** (pois chiches boîte, haricots boîte, thon, sardine, betterave cuite…) : lignes à l'état égoutté/cuit, pesées recettes à l'état égoutté. Cohérent.
- **Viandes, poissons, volailles** : lignes à l'état cru, pesées crues. Cohérent en entrée, mais voir §3.

## 3. Conséquences identifiées (sens et ordres de grandeur, pas de correction)

1. **Pertes de cuisson des viandes et charcuteries crues** : 98 recettes sur 300 contiennent une viande de boucherie à l'état cru (veau_jarret inclus) et 28 une charcuterie crue hors jambon cru, consommé cru (lardons, saucisses Toulouse/fumées, poitrine demi-sel) ; union : 122 recettes (comptage reproductible lot n17 ; une revue indépendante annonce 126, l'écart tient au périmètre exact retenu pour la charcuterie — à aligner en revue). À la cuisson, l'eau et une partie du gras s'évacuent ; si les sucs ne sont pas consommés, les kcal et lipides réellement consommés sont inférieurs aux valeurs calculées. Sens de l'écart connu : **surestimation**, qui ne s'applique guère aux mijotés et plats en sauce dont les sucs sont consommés (pot-au-feu, blanquette, bourguignon, chili, navarin, currys…), sans classification exacte à ce stade. Amplitude non chiffrée ici : pas de table de rendement importée ni vérifiée. Déjà déclaré dans « Hypothèses de l'app ».
2. **Vitamines thermosensibles** (vitamine C, folates B9) : dégradation de 20 à 50 % selon cuisson ; les totaux de l'app utilisent les valeurs crues. Sens : **surestimation**. Déjà déclaré (« pertes de cuisson non modélisées »).
3. **Féculents et légumes** : absorption d'eau sans kcal ; les totaux par portion restent exacts, seule la densité par 100 g du plat final change — hors périmètre de l'app, qui totalise par portion.
4. **Sel de la poitrine demi-sel** : mesuré avant blanchissage ; le sel réellement consommé dépend du bouillon jeté ou consommé. Étiquette d'état le signale.

## 4. Options pour une version livrable (à trancher en revue, rien d'adopté)

- A. Statu quo documenté : les déclarations actuelles (« pertes de cuisson non modélisées ») couvrent les écarts, au prix d'une surestimation systématique discrète des kcal viande et des vitamines C/B9.
- B. Facteurs de rendement CIQUAL/ANSES par famille (tables publiées) appliqués aux postes cuits : plus juste en moyenne, mais ajoute une couche d'hypothèses et de maintenance.
- C. Champ « base de pesée » par couple recette×ingrédient : verrouille la cohérence pour les futurs ajouts de recettes, sans changer les valeurs actuelles.

Préparation C livrée au lot n16 (technique, sans changement de valeur) : data/pesee-bases.json déclare la base de pesée des 247 ingrédients utilisés et tests/pesee-coherence.cjs (intégré à npm test) verrouille les futurs ajouts de recettes. Fondement vérifié : aucune des 300 recettes n'a de source externe — les bases sont des conventions d'authoring internes, toutes vérifiées cohérentes avec l'état de la ligne CIQUAL mappée ; 4 recettes mentionnent explicitement l'égouttage dans leurs étapes.

Recommandation d'étape (non appliquée) : C d'abord (garde-fou sans modélisation), B seulement après revue des tables de rendement, A en attendant toute décision.

## 5. Limites de cette analyse

- Les ordres de grandeur des pertes ne sont pas sourcés ici (pas de table de rendement importée) ; ils servent à dimensionner le sujet, pas à corriger.
- Aucune validation clinique ; aucune modification de données n'a été faite au titre de cette analyse (seules trois étiquettes d'état ont été corrigées au lot n15 pour exactitude factuelle, sans changement de valeur).
