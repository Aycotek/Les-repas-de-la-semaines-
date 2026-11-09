# Sources et licences

## Données nutritionnelles

- **Table CIQUAL 2020 (ANSES)** — composition nutritionnelle des aliments.
  - Jeu de données officiel : https://www.data.gouv.fr/datasets/table-de-composition-nutritionnelle-des-aliments-ciqual-2020
  - Licence : **Licence Ouverte / Open Licence 2.0** (Etalab) — attribution : ANSES – Table CIQUAL 2020, https://www.data.gouv.fr/datasets/table-de-composition-nutritionnelle-des-aliments-ciqual-2020
  - Fichier utilisé pour la génération : `CIQUAL2020_ENG_2020_07_07.csv` (version anglaise, 3185 aliments, 67 constituants), miroir : https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/external-data/ciqual/ciqual/CIQUAL2020_ENG_2020_07_07.csv (le téléchargement anses.fr était en maintenance au 09/11/2026).
  - Chaque ingrédient de `data/ingredients.js` porte son **code aliment CIQUAL** (champ `ciqual`), traçable dans la table officielle. Les valeurs absentes de la table restent `null` dans les calculs (jamais remplacées par 0) et sont comptées comme manquantes dans le bilan.
  - Énergie : le miroir ENG laisse la cellule énergie vide sur certaines lignes. Quand le kcal officiel manque, il est recalculé depuis les protéines/glucides/lipides/fibres CIQUAL de la même ligne avec les facteurs du règlement UE 1169/2011 (4/4/9/2 kcal/g) ; ces lignes portent `kcalSrc: "calc"` (58 ingrédients). Si une de ces composantes manque aussi, le kcal recalculé est une approximation par défaut. Les autres valeurs sont les cellules CIQUAL d'origine.
  - Les valeurs sont pour 100 g d'aliment, dans l'état indiqué par le nom CIQUAL (cru ou cuit selon disponibilité ; l'état exact est celui du nom anglais CIQUAL associé dans `tools/build_ingredients.py`).
  - Vérification croisée FR : sous-ensemble https://proteines.info/donnees/ (données CIQUAL, Licence Ouverte).

## Références nutritionnelles (data/references.js)

- **RNP/AS adultes, ANSES** (actualisation 2016-2021) :
  - https://www.anses.fr/fr/article/references-nutritionnelles-vitamines-mineraux
  - Avis ANSES NUT2018SA0238 (vitamine D : 15 µg/j), NUT2017SA0143 (fer : 11 mg/j homme, 16 mg/j femme non ménopausée).
- **Repères de consommation PNNS** (mangerbouger.fr, confirmés PNNS 5 2026-2030) :
  - https://www.mangerbouger.fr — l'essentiel des recommandations alimentaires
  - https://sante.gouv.fr/IMG/pdf/pnns_5_2026-2030.pdf
  - Fruits et légumes de saison : listes mensuelles mangerbouger.fr (France métropolitaine).

## Prix

- Les prix (`prixKg`) sont des **hypothèses indicatives** par ordre de grandeur pour le commerce alimentaire français, fixés à la main pour la planification ; ils ne constituent **pas** un relevé de prix empirique ni une moyenne observée.
- Ce ne sont **pas des prix magasin** : ils ne proviennent d'aucune API officielle d'enseigne et varient selon le magasin, la marque et le conditionnement. Le « budget » affiché est une aide à la décision, pas une garantie qu'un panier réel atteindra ce montant.

## Recettes

- Les 200 recettes sont des rédactions originales (quantités, étapes) écrites pour cette application, inspirées de la cuisine familiale française et méditerranéenne. Aucune recette n'est copiée d'un service tiers (pas de contenu Jow, Yuka ou autre).

## Code

- Application statique sans dépendance externe, licence MIT (voir LICENCE).
