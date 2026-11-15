# Sources et licences

## Données nutritionnelles

- **Table CIQUAL 2020 (ANSES)** — composition nutritionnelle des aliments.
  - Jeu de données officiel : https://www.data.gouv.fr/datasets/table-de-composition-nutritionnelle-des-aliments-ciqual-2020
  - Licence : **Licence Ouverte / Open Licence 2.0** (Etalab) — attribution : ANSES – Table CIQUAL 2020, https://www.data.gouv.fr/datasets/table-de-composition-nutritionnelle-des-aliments-ciqual-2020
  - Fichier utilisé pour la génération : `CIQUAL2020_ENG_2020_07_07.csv` (version anglaise, 3185 aliments, 67 constituants), miroir : https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/external-data/ciqual/ciqual/CIQUAL2020_ENG_2020_07_07.csv (le téléchargement anses.fr était en maintenance au 09/11/2026).
  - Chaque ingrédient avec correspondance porte son **code aliment CIQUAL** (champ `ciqual`), traçable dans la table officielle. Les ingrédients sans correspondance validée ont un code et des nutriments `null` (voir révision ci-dessous). Les valeurs absentes de la table restent `null` dans les calculs (jamais remplacées par 0) et sont comptées comme manquantes dans le bilan.
  - Énergie : le miroir ENG laisse la cellule énergie vide sur certaines lignes. Quand le kcal officiel manque, il est recalculé depuis les protéines/glucides/lipides/fibres/alcool CIQUAL de la même ligne avec les facteurs du règlement UE 1169/2011 (4/4/9/2/7 kcal/g ; le facteur alcool, omis avant le 15/11/2026, a été ajouté après contre-vérification : vin_blanc 17,2→71,4, cidre_brut 10,5→36,5 kcal/100 g) ; ces lignes portent `kcalSrc: "calc"` (nombre dépendant de la version, voir champ `kcalSrc`). Si une de ces composantes manque aussi, le kcal recalculé est une approximation par défaut. Les autres valeurs sont les cellules CIQUAL d'origine.
  - Cellules « traces » et bornes « < X » : deux conventions selon la strate. Base CIQUAL 2020 (script de construction) : « < X » → X/2 (483 cellules) et « traces » → 0 (54 cellules), estimations non distinguées visuellement des valeurs exactes, y compris sur des nutriments à repère. Compléments 2025 (deltas et lot du 15/11/2026) : bornes et traces rejetées, null conservé en attendant la prise en charge des intervalles. Gardes de non-régression : tests/kcal-calc-guard.cjs (cohérence kcal calc 4/4/9/2/7 sur les données livrées, fixture tests/alcool-2020.json) et tests/rebuild-check.py (reproductibilité depuis le CSV officiel ; ignoré proprement sans CSV). Les valeurs réellement absentes (cellules vides) ne sont jamais remplacées par zéro.
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
Liste des 14 allergènes à déclaration obligatoire : Règlement (UE) n° 1169/2011, annexe II. L'attribution allergène par ingrédient est une classification de l'application (certain / possible selon marque), non certifiée. « Certain » = présence normale dans le produit couramment vendu ; « possible selon marque » = la présence dépend du fabricant ou de la variante. Règle appliquée : un produit générique non spécifié est classé « possible » dès qu'une variante courante peut contenir l'allergène, sans prétendre qu'il le contient toujours. Cas particuliers : les vinaigres, le cidre brut et les raisins secs sont traités comme sulfites possibles selon marque, par prudence ; bouquet garni comme céleri possible. Ce sont des choix de filtrage pour des produits génériques non spécifiés, pas une certification de leur composition ni une mesure de fréquence.

Sources vérifiées le 9 novembre 2026 :
- [Ducros, Bouquet Garni à la Provençale](https://www.ducros.com/fr-fr/produits/herbes/herbes/bouquet-garni) : la liste contient de la graine de céleri et précise de consulter l'emballage. Cela suffit à justifier le risque pour un bouquet garni générique, sans affirmer que tous en contiennent.
- [Tramier, Des vinaigres qui ne gardent que l'essentiel](https://tramier.fr/notre-savoir-faire/nos-racines-savoir-faire/des-vinaigres-qui-ne-gardent-que-lessentiel/) : le fabricant présente ses vinaigres de vin et cidre comme sans sulfites. La présence ne peut donc pas être considérée universelle pour le vinaigre générique.

 « Possible » est exclu comme « certain » quand l'allergie est cochée : choix prudent, pas une affirmation de présence. Aucune classification ne garantit l'absence d'allergène, de traces ou de contamination croisée. Illustrations : dessins générés par le code, sans source externe.

## Intégration privée : provenance et limites
Certaines cellules manquantes de la base CIQUAL 2020 ont été complétées depuis CIQUAL 2025. Au 15/11/2026, 114 cellules null supplémentaires sont comblées depuis la table CIQUAL 2025 ENG (miroir OpenFoodFacts, SHA256 dans docs/ingredient-deltas.json, clé complements2025-11-15) à code aliment identique, dont 96 zéros mesurés ; 6 codes disparus de la table 2025 (pomme, filet mignon de porc, raisin, tomate, vol-au-vent, tomme de Savoie) restent sur leurs données 2020. Le journal de correspondance détaillé est en cours de rapprochement : ne pas considérer tous les codes comme originellement traçables. Des correspondances ont été retrouvées après coup et restent à distinguer des codes consignés dans la base initiale.

La carte « Composition moyenne des plats » montre des moyennes par portion, sans seuil médical et sans prorata de références journalières. Les anciennes hypothèses 6 g de sucres, quotas de plats, seuils par dîner et feux santé ne sont pas utilisées dans cette interface. Les réglages pathologiques ne modifient pas la génération. Les favoris expriment une préférence indépendante de la nutrition.

La vérification des calculs ne valide ni la pertinence médicale ni l'identité de chaque aliment. États cru/cuit et pertes de cuisson restent à examiner. Les valeurs incomplètes sont signalées « non calculable ».

### Journal cellule par cellule (révision privée)
Source officielle vérifiée : https://entrepot.recherche.data.gouv.fr/file.xhtml?persistentId=doi%3A10.57745%2FRPWYZD&version=1.0 (MD5 du xlsx : 0d9758ce23f3f13dd63a005bc1bb4f2c). Présentation ANSES : https://ciqual.anses.fr/cms/fr/la-table-ciqual-2025.
Le fichier `docs/ingredient-deltas.json` distingue les codes déjà présents dans la base des deux nouvelles correspondances de nom (sauce d'huître, pruneau). Sur 22 cellules nutritionnelles initialement proposées, 19 sont retenues ; « traces » pour les sucres de polenta/châtaigne et « < 0,013 » pour le sel du pruneau restent null plutôt qu'être transformés en zéros ou valeurs exactes. Aucun intervalle n'est encore pris en charge. Ces trois rejets rendent la couverture différente du dataset historique du moteur ; le nombre 65/300 n'est plus applicable à cette révision.
