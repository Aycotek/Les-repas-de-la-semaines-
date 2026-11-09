# Sources et licences

## Données nutritionnelles

- **Table CIQUAL 2020 (ANSES)** — composition nutritionnelle des aliments.
  - Jeu de données officiel : https://www.data.gouv.fr/datasets/table-de-composition-nutritionnelle-des-aliments-ciqual-2020
  - Licence : **Licence Ouverte / Open Licence 2.0** (Etalab) — attribution : ANSES – Table CIQUAL 2020, https://www.data.gouv.fr/datasets/table-de-composition-nutritionnelle-des-aliments-ciqual-2020
  - Fichier utilisé pour la génération : `CIQUAL2020_ENG_2020_07_07.csv` (version anglaise, 3185 aliments, 67 constituants), miroir : https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/external-data/ciqual/ciqual/CIQUAL2020_ENG_2020_07_07.csv (le téléchargement anses.fr était en maintenance au 09/11/2026).
  - Chaque ingrédient avec correspondance porte son **code aliment CIQUAL** (champ `ciqual`), traçable dans la table officielle. Les ingrédients sans correspondance validée ont un code et des nutriments `null` (voir révision ci-dessous). Les valeurs absentes de la table restent `null` dans les calculs (jamais remplacées par 0) et sont comptées comme manquantes dans le bilan.
  - Énergie : le miroir ENG laisse la cellule énergie vide sur certaines lignes. Quand le kcal officiel manque, il est recalculé depuis les protéines/glucides/lipides/fibres CIQUAL de la même ligne avec les facteurs du règlement UE 1169/2011 (4/4/9/2 kcal/g) ; ces lignes portent `kcalSrc: "calc"` (nombre dépendant de la version, voir champ `kcalSrc`). Si une de ces composantes manque aussi, le kcal recalculé est une approximation par défaut. Les autres valeurs sont les cellules CIQUAL d'origine.
  - Les valeurs sont pour 100 g d'aliment, dans l'état indiqué par le nom CIQUAL (cru ou cuit selon disponibilité ; l'état exact est celui du nom anglais CIQUAL associé dans `tools/build_ingredients.py`).
  - Vérification croisée FR : sous-ensemble https://proteines.info/donnees/ (données CIQUAL, Licence Ouverte).

## Références nutritionnelles (data/references.js)

- **RNP/AS adultes, ANSES** (actualisation 2016-2021) :
  - https://www.anses.fr/fr/article/references-nutritionnelles-vitamines-mineraux
  - Avis ANSES NUT2018SA0238 (vitamine D : 15 µg/j), NUT2017SA0143 (fer : 11 mg/j homme, 16 mg/j femme avec pertes menstruelles élevées).
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

- Application statique sans dépendance externe, licence MIT (voir LICENSE).

## Limites de calcul

Les portions et les grammes sont calculés sur les quantités de recette. Les correspondances CIQUAL utilisent parfois un état cru, cuit ou appertisé ; les pertes de cuisson, la biodisponibilité et la cuisson exacte ne sont pas modélisées. Une somme partielle est affichée avec son nombre de données absentes par nutriment. Elle ne prouve ni une couverture réelle ni une carence. Le bilan porte uniquement sur les recettes choisies, ajouts compris. Les articles de courses libres ne sont ni chiffrés ni inclus dans le bilan. Les exclusions sont des filtres de préférences et ne garantissent pas l’absence d’allergène ou de traces.

Les repères protéiques utilisent 0,83 g/kg/j et des adultes types de 70 et 60 kg alternés selon la taille du foyer, affichés dans les réglages. Ni l’âge, ni une grossesse, ni une pathologie ne sont modélisés.

## Révision nutrition du 9 novembre 2026

- Références actualisées de vitamine E : AS 10 mg/j homme, 9 mg/j femme. La modification du pourcentage ne représente pas un ajout de nourriture. Calcium 950 mg/j à partir de 25 ans ; vitamine D 15 µg/j. Fer féminin 16 mg/j correspond aux pertes menstruelles élevées, pas à toutes les femmes.
- Source primaire : https://www.anses.fr/fr/article/references-nutritionnelles-vitamines-mineraux
- Diversifier la semaine et compléter le plat avec fruits/laitages : https://www.mangerbouger.fr/manger-mieux/se-faire-plaisir-en-mangeant-equilibre/manger-equilibre-ca-veut-dire-quoi-et-comment-y-arriver/comment-varier-son-alimentation-sur-la-semaine
- Calcium : https://www.anses.fr/fr/article/calcium-pourquoi-comment-consommer
- Vitamine D : https://www.anses.fr/fr/article/vitamine-pourquoi-comment-assurer-apport-suffisant
- Poisson : https://www.anses.fr/fr/article/manger-du-poisson-pourquoi-comment

### Qualité des correspondances

Chaque ingrédient expose désormais `sourceNom`, `etat` et `correspondance`. Ce sont des correspondances alimentaires, pas une analyse du produit acheté. Correction des pommes de terre génériques vers l'aliment cru, du riz complet vers le riz brun cru et des coques de vol-au-vent vers la pâte feuilletée cuite (approximation de la coque seule). La pâte à pain de la flammekueche est maintenant décomposée en 200 g farine + 100 g eau, au lieu de compter 300 g de farine.

Pas de correspondance validée : os à moelle, galette de riz pour rouleaux, sauce huître, ortie, pâte à pain générique. Leurs nutriments deviennent `null`, pas ceux d'un autre produit. Les recettes concernées restent disponibles et portent l'avertissement de bilan incomplet. Le gratin à la moelle est accompagné de pain complet explicite. Les autres approximations sont signalées dans les détails des recettes (burrata/mozzarella, pâtes de curry/sauce curry, certains pains complets/pains standards, etc.). Les aliments complets ne sont donc pas toujours représentés exactement par leur produit source.

### Compléments alimentaires au sens aliments du repas

L'option facultative ajoute réellement, par portion prévue : 150 g de fruit, 125 g de yaourt nature, 10 g d'amandes. Sur 28 portions, 4,2 kg de fruits, 3,5 kg de yaourts et 280 g d'amandes. Elle est désactivée par défaut, isolée par semaine, filtrée par exclusions et réversible. Prix, quantités et nutriments sont comptés une seule fois. Cela peut dépasser 80 € : l'app montre le coût avant ajout, puis le total. Aucun supplément vitaminique, diagnostic ou prescription.

La vitamine D peut rester basse même avec l'option. https://www.anses.fr/fr/article/vitamine-pourquoi-comment-assurer-apport-suffisant rappelle que la référence alimentaire exclut la contribution de l'exposition au soleil ; ce logiciel ne mesure pas le statut biologique.


## Allergènes et aliments à éviter (révision 3)
Liste des 14 allergènes à déclaration obligatoire : Règlement (UE) n° 1169/2011, annexe II. L'attribution allergène par ingrédient est une classification de l'application (certain / possible selon marque), non certifiée. Illustrations : dessins générés par le code, sans source externe.
