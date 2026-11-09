#!/usr/bin/env python3
"""Construit data/ingredients.js : ingrédient -> {nom FR, nutriments CIQUAL pour 100 g, rayon, prix indicatif EUR/kg}.
Source : table CIQUAL 2020 (ANSES), Licence Ouverte (voir SOURCES.md). Prix : estimations moyennes France, documentées."""
import csv, json, sys

rows = {}
with open('/tmp/ciqual_full.csv', encoding='utf-8') as f:
    for r in csv.DictReader(f, delimiter='\t'):
        rows[r['alim_nom_eng']] = r

# Secours énergie : le miroir ENG laisse '-' sur 871 lignes ; le sous-ensemble FR
# (proteines.info, mêmes codes CIQUAL) fournit le kcal officiel correspondant.
fr_kcal = {}
try:
    fr = json.load(open('/tmp/aliments.json', encoding='utf-8'))
    for a in fr['aliments']:
        if a.get('kcal') is not None:
            fr_kcal[str(a['code'])] = a['kcal']
except FileNotFoundError:
    pass

def num(v):
    if v is None: return None
    v = str(v).strip()
    if v in ('-', ''): return None
    if v == 'traces': return 0.0
    if v.startswith('<'):
        try: return float(v[1:].replace(',', '.')) / 2
        except ValueError: return None
    try: return float(v.replace(',', '.'))
    except ValueError: return None

# key: (nom affiché FR, nom exact CIQUAL anglais, rayon, prix EUR/kg indicatif)
M = {
"agneau_epaule":("Épaule d'agneau","Lamb, shoulder, raw","boucherie",16),
"ail":("Ail","Garlic, fresh","fruits_legumes",8),
"amande_effilee":("Amandes effilées","Almond, peeled, unpeeled or blanched","epicerie",16),
"anchois":("Anchois à l'huile","Anchovy, fillets, in oil, semi-preserved, drained","epicerie",20),
"aneth":("Aneth fraîche","Dill, fresh","fruits_legumes",30),
"artichaut":("Artichauts","Artichoke, globe, raw","fruits_legumes",3),
"artichaut_conserve":("Fonds d'artichauts (conserve)","Artichoke base, canned, drained","epicerie",6),
"asperge":("Asperges vertes","Asparagus, green, raw","fruits_legumes",6),
"asperge_blanche":("Asperges blanches","Asparagus, white or purple, peeled, raw","fruits_legumes",6),
"aubergine":("Aubergines","Eggplant, raw","fruits_legumes",2.5),
"avocat":("Avocats","Avocado, pulp, raw","fruits_legumes",7),
"basilic":("Basilic frais","Basil, fresh","fruits_legumes",30),
"beaufort":("Beaufort","Beaufort cheese, from cow's milk","cremerie",24),
"betterave_cuite":("Betteraves cuites","Beetroot, cooked","fruits_legumes",2),
"beurre":("Beurre doux","Butter, 82% fat, unsalted","cremerie",10),
"beurre_cacahuete":("Beurre de cacahuète","Peanut butter or peanut paste","epicerie",7),
"bleu_fromage":("Bleu (fromage)","Blue cheese, from cow's milk","cremerie",18),
"boeuf_a_bouillir":("Bœuf à braiser (paleron)","Beef, chuck, raw","boucherie",13),
"boeuf_a_poeler":("Bœuf à poêler (rumsteck)","Beef, rump steak, raw","boucherie",17),
"boeuf_hache_5pct":("Steak haché 5% MG","Beef, minced steak, 5% fat, raw","boucherie",13),
"bouillon_legumes":("Bouillon de légumes","Broth, stock or bouillon, vegetables, dehydrated and reconstituted","epicerie",0.2),
"boulgour_complet":("Boulgour complet","Wheat bulgur, raw","feculents",3),
"bouquet_garni":("Bouquet garni","Thyme, fresh","fruits_legumes",10),
"brocoli":("Brocoli","Broccoli, raw","fruits_legumes",3),
"burrata":("Burrata","Mozzarella cheese, from cow's milk","cremerie",16),
"butternut":("Courge butternut","Squash, butternut, pulp, raw","fruits_legumes",2),
"cabillaud_dos":("Dos de cabillaud","Cod, raw","poissonnerie",16),
"cacahuete":("Cacahuètes grillées","Peanut, grilled, salted","epicerie",7),
"capres":("Câpres","Capers, pickled in vinegar","epicerie",25),
"cardon":("Cardons","Cardoon, raw","fruits_legumes",4),
"carotte":("Carottes","Carrot, raw","fruits_legumes",1.5),
"celeri_boule":("Céleri-rave","Celeriac, raw","fruits_legumes",2),
"cepe":("Cèpes","Cep or boletus mushroom, raw","fruits_legumes",15),
"champignon_de_paris":("Champignons de Paris","Button mushroom or cultivated mushroom, raw","fruits_legumes",4),
"chapelure_complete":("Chapelure complète","Breadcrumbs","epicerie",3),
"chataigne_cuite":("Châtaignes cuites","Chestnut, boiled/cooked in water","epicerie",6),
"cheddar":("Cheddar","Cheddar cheese, from cow's milk","cremerie",14),
"chevre_frais":("Chèvre frais","Cheese, from goat's milk, fresh","cremerie",12),
"chou_de_bruxelles":("Choux de Bruxelles","Brussels sprout, raw","fruits_legumes",3.5),
"chou_fleur":("Chou-fleur","Cauliflower, raw","fruits_legumes",2.5),
"chou_kale":("Chou kale","Curly kale, raw","fruits_legumes",4),
"chou_rouge":("Chou rouge","Red cabbage, raw","fruits_legumes",1.8),
"chou_vert":("Chou vert","Green cabbage, raw","fruits_legumes",1.8),
"ciboulette":("Ciboulette","Chive or spring onion, fresh","fruits_legumes",30),
"cidre_brut":("Cidre brut","Cider, dry","epicerie",3),
"citron":("Citron","Lemon, pulp, raw","fruits_legumes",3),
"citron_vert":("Citron vert","Lime, pulp, raw","fruits_legumes",4),
"colin_dos":("Dos de colin (lieu noir)","Saithe, raw","poissonnerie",10),
"comte":("Comté","Comté cheese, from cow's milk","cremerie",20),
"concombre":("Concombre","Cucumber, pulp and peel, raw","fruits_legumes",1.8),
"confit_canard":("Confit de canard","Duck confit (conserved in rendered fat), meat (leg) without skin, reheated","boucherie",18),
"coriandre":("Coriandre fraîche","Coriander, fresh","fruits_legumes",30),
"cornichon":("Cornichons","Gherkin, pickled in vinegar","epicerie",5),
"cote_agneau":("Côtelettes d'agneau","Lamb, chop, raw (average)","boucherie",18),
"courge":("Courge (potimarron)","Red kuri squash, pulp, raw","fruits_legumes",2),
"courgette":("Courgettes","Courgette or zucchini, pulp and peel, raw","fruits_legumes",2.5),
"crabe_miettes":("Miettes de crabe","Flaked crab and/or decorticated crab leg, canned, drained","poissonnerie",25),
"creme_fraiche":("Crème fraîche épaisse 30%","Thick cream 30% fat, refrigerated","cremerie",4),
"crevette_decortiquee":("Crevettes décortiquées","Shrimp or prawn, cooked","poissonnerie",14),
"crozets":("Crozets (pâtes de sarrasin)","Dried pasta, raw","feculents",3),
"cumin":("Cumin","Cumin, seed","epicerie",25),
"curcuma":("Curcuma moulu","Turmeric, powder","epicerie",25),
"curry_japonais":("Tablette de curry japonais","Curry sauce, prepacked","epicerie",8),
"curry_poudre":("Curry en poudre","Curry, powder","epicerie",25),
"echalote":("Échalotes","Shallot, raw","fruits_legumes",4),
"encornet":("Encornets (calmars)","Squid, raw","poissonnerie",12),
"endive":("Endives","Green endive, raw","fruits_legumes",2.2),
"epeautre":("Épeautre","Spelt, raw","feculents",4),
"epinards_frais":("Épinards frais","Spinach, raw","fruits_legumes",3.5),
"escalope_dinde":("Escalopes de dinde","Turkey, escalope, raw","boucherie",11),
"farine":("Farine de blé T55","Wheat flour, type 55 (for pastry)","epicerie",1.5),
"farine_ble_complet":("Farine complète T150","Wheat flour, type 150","epicerie",2),
"farine_sarrasin":("Farine de sarrasin","Buckwheat flour","epicerie",3),
"fenouil":("Fenouil","Fennel, raw","fruits_legumes",2.5),
"feta":("Feta","Feta cheese, PDO","cremerie",10),
"feve_ecossee":("Fèves écossées","Broad bean, to shell, fresh","fruits_legumes",3.5),
"filet_poulet":("Filets de poulet","Chicken, breast, without skin, raw","boucherie",12),
"fromage_frais":("Fromage frais (type fromage blanc)","Drained soft fresh cheese, around 6% fat","cremerie",5),
"galette_riz":("Galettes de riz (rouleaux)","Rice noodle, dried","epicerie",4),
"germes_soja":("Germes de soja","Mung bean, sprouted or soy spouts, raw","fruits_legumes",4),
"gingembre":("Gingembre frais","Ginger, raw","fruits_legumes",8),
"girolle":("Girolles","Chanterelle or girolle mushroom, raw","fruits_legumes",14),
"gruyere_rape":("Gruyère râpé","Gruyere cheese, from cow's milk","cremerie",14),
"hareng_marine":("Harengs marinés","Atlantic herring, marinated, or rollmops","poissonnerie",8),
"haricot_vert":("Haricots verts","French bean, raw","fruits_legumes",3),
"haricots_blancs_boite":("Haricots blancs (boîte)","Haricot bean, canned, drained","epicerie",2.5),
"haricots_rouges_boite":("Haricots rouges (boîte)","Red kidney bean, canned, drained","epicerie",2.5),
"haut_de_cuisse_poulet":("Hauts de cuisse de poulet","Chicken, leg, meat and skin, raw","boucherie",8),
"huile_olive":("Huile d'olive","Olive oil, extra virgin","epicerie",10),
"huile_sesame":("Huile de sésame","Sesame oil","epicerie",12),
"jambon_blanc":("Jambon blanc (supérieur)","Cooked ham, Parisian-style, rind less and fatless","charcuterie",9),
"jambon_cru":("Jambon cru","Cured ham, raw","charcuterie",14),
"lait":("Lait demi-écrémé","Milk, semi-skimmed, UHT","cremerie",1),
"lait_de_coco":("Lait de coco","Coconut milk or coconut cream","epicerie",4),
"laitue":("Laitue","Lettuce, raw","fruits_legumes",1.5),
"laitue_romaine":("Laitue romaine","Cos or romaine lettuce, raw","fruits_legumes",2),
"lardons":("Lardons","Lardoons, raw","charcuterie",7),
"lasagne_feuille":("Feuilles de lasagne","Dried egg pasta, raw","feculents",2.5),
"lentilles_corail":("Lentilles corail","Lentil, blond, dried","epicerie",4),
"lentilles_vertes":("Lentilles vertes","Lentil, green, dried","epicerie",3.5),
"levure_boulanger":("Levure de boulanger","Baker's yeast, dehydrated","epicerie",20),
"lieu_jaune_filet":("Filets de lieu jaune","Pollack, raw","poissonnerie",9),
"loup_filet":("Filets de loup (bar)","European bass, raw","poissonnerie",20),
"mache":("Mâche","Lamb's lettuce, raw","fruits_legumes",4),
"mais":("Maïs doux (boîte)","Sweet corn, canned, drained","epicerie",2.5),
"mangue":("Mangue","Mango, pulp, raw","fruits_legumes",5),
"maquereau_entier":("Maquereaux entiers","Mackerel, raw","poissonnerie",7),
"maquereau_filet":("Filets de maquereau","Mackerel, raw","poissonnerie",9),
"melon":("Melon","Melon, cantaloupe (ex Cavaillon or Charentais melon), pulp, raw","fruits_legumes",2),
"menthe":("Menthe fraîche","Mint, fresh","fruits_legumes",30),
"merguez":("Merguez","Merguez sausage, raw","boucherie",11),
"merlan_filet":("Filets de merlan","Whiting, raw","poissonnerie",11),
"merlu_filet":("Filets de merlu","European hake, raw","poissonnerie",13),
"miel":("Miel","Honey","epicerie",9),
"moelle_os":("Os à moelle","Lard or pork fat","boucherie",12),
"morue_desalee":("Morue dessalée","Cod, salted, boiled/cooked in water","poissonnerie",14),
"moule":("Moules","Mussel, common, raw","poissonnerie",5),
"moutarde":("Moutarde","Mustard","epicerie",6),
"mozzarella":("Mozzarella","Mozzarella cheese, from cow's milk","cremerie",10),
"muscade":("Muscade moulue","Nutmeg","epicerie",40),
"naan_complet":("Naans complets","Pita bread","feculents",5),
"navet":("Navets","Turnip, peeled, raw","fruits_legumes",1.8),
"noisette":("Noisettes","Hazelnut","epicerie",14),
"noix":("Noix (cerneaux)","Walnut, dried, husked","epicerie",16),
"nouilles_ble":("Nouilles de blé","Dried pasta, raw","feculents",3),
"nouilles_riz":("Nouilles de riz","Rice noodle, dried","feculents",3.5),
"oeuf":("Œufs","Egg, raw","cremerie",4.5),
"oignon":("Oignons","Onion, raw","fruits_legumes",1.2),
"oignon_nouveau":("Oignons nouveaux","Chive or spring onion, fresh","fruits_legumes",2.5),
"oignon_rouge":("Oignons rouges","Red onion, raw","fruits_legumes",1.5),
"olive_noire":("Olives noires","Olives, black (average food)","epicerie",6),
"orange":("Oranges","Orange, pulp, raw","fruits_legumes",2),
"orge_monde":("Orge mondé","Pearled barley, raw","feculents",3),
"origan":("Origan séché","Oregano, dried","epicerie",25),
"ortie_feuille":("Feuilles d'ortie","Spinach, raw","fruits_legumes",4),
"oseille":("Oseille","Sorrel, raw","fruits_legumes",5),
"pain_burger_complet":("Pains burger complets","Rolls for hamburger/hotdog (buns), wholemeal, prepacked","boulangerie",5),
"pain_complet":("Pain complet","Bread, wholemeal or integral bread (made with flour type 150)","boulangerie",4),
"pain_pita_complet":("Pitas complets","Pita bread","boulangerie",5),
"pak_choi":("Pak choï","Chinese cabbage (nappa cabbage or bok choy), raw","fruits_legumes",4),
"panais":("Panais","Parsnip, raw","fruits_legumes",2.5),
"paprika":("Paprika","Paprika","epicerie",25),
"parmesan":("Parmesan","Parmesan cheese, from cow's milk","cremerie",22),
"patate_douce":("Patates douces","Sweet potato, raw","fruits_legumes",2.5),
"pate_a_pain":("Pâte à pain","Wheat flour, type 55 (for bread)","boulangerie",3),
"pate_brisee":("Pâte brisée","Short crust pastry, pure butter, raw","epicerie",4),
"pate_curry_rouge":("Pâte de curry rouge","Curry sauce, prepacked","epicerie",10),
"pate_curry_vert":("Pâte de curry vert","Curry sauce, prepacked","epicerie",10),
"pate_feuilletee":("Pâte feuilletée","Puff pastry, savoury (average)","epicerie",4.5),
"pate_miso":("Miso","Miso","epicerie",8),
"pates_completes":("Pâtes complètes","Dried pasta, wholemeal, raw","feculents",2.5),
"peche":("Pêches","Peach, white-flesh variety, pulp and skin, raw","fruits_legumes",3),
"pecorino":("Pecorino","Pecorino cheese, from ewe's milk","cremerie",18),
"persil":("Persil frais","Parsley, fresh","fruits_legumes",30),
"pesto":("Pesto","Sauce, pesto, prepacked","epicerie",12),
"petit_pois":("Petits pois","Garden peas, raw","fruits_legumes",4),
"pignons":("Pignons de pin","Pine nuts","epicerie",45),
"pintade":("Pintade entière","Guinea fowl, raw","boucherie",9),
"poireau":("Poireaux","Leek, raw","fruits_legumes",2.5),
"pois_casses":("Pois cassés","Split pea, dried","epicerie",3),
"pois_chiches_boite":("Pois chiches (boîte)","Chick pea, canned, drained","epicerie",2.5),
"poivre":("Poivre noir","Black pepper, powder","epicerie",40),
"poivron":("Poivrons","Sweet pepper, green, yellow or red, raw","fruits_legumes",3),
"polenta":("Polenta (semoule de maïs)","Polenta or Maize/corn semolina, pre-cooked, dried","feculents",2.5),
"pomme":("Pommes","Apple, pulp, raw","fruits_legumes",1.8),
"pomme_de_terre":("Pommes de terre","Potato, boiled/cooked in water","fruits_legumes",1.5),
"pomme_de_terre_nouvelle":("Pommes de terre nouvelles","New potato, raw","fruits_legumes",2),
"porc_filet_mignon":("Filet mignon de porc","Pork tenderloin, lean, raw","boucherie",10),
"porc_hache":("Chair à saucisse (porc haché)","Pork, shoulder, raw","boucherie",8),
"potiron":("Potiron","Pumpkin (cucurbita moschata), pulp, raw","fruits_legumes",2),
"poulet_fermier":("Poulet fermier entier","Chicken, eviscerated without offal, raw","boucherie",7),
"poulet_fume":("Poulet fumé","Chicken, breast, without skin, cooked","charcuterie",12),
"poulpe":("Poulpe","Octopus, common, raw","poissonnerie",18),
"quinoa":("Quinoa","Quinoa, raw","feculents",5),
"radis":("Radis","Radish, raw","fruits_legumes",2),
"radis_avec_fanes":("Radis avec fanes","Radish, raw","fruits_legumes",2.2),
"raie_aile":("Ailes de raie","Ray, raw","poissonnerie",15),
"raisin":("Raisin frais","Grape, raw","fruits_legumes",3),
"raisin_sec":("Raisins secs","Raisin","epicerie",6),
"ras_el_hanout":("Ras el hanout","Curry, powder","epicerie",25),
"reblochon":("Reblochon","Reblochon cheese, from cow's milk","cremerie",14),
"rhubarbe":("Rhubarbe","Rhubarb, stalk, raw","fruits_legumes",3),
"ricotta":("Ricotta","Ricotta cheese","cremerie",8),
"riz_arborio":("Riz arborio (risotto)","Rice, parboiled, raw","feculents",3.5),
"riz_basmati_complet":("Riz basmati complet","Basmati rice, raw","feculents",3),
"riz_complet":("Riz complet","Rice, brown, raw","feculents",2.5),
"romarin":("Romarin frais","Rosemary, fresh","fruits_legumes",25),
"roquette":("Roquette","Roman rocket, raw","fruits_legumes",5),
"rouget_filet":("Filets de rouget","Surmullet or red mullet, raw","poissonnerie",18),
"safran":("Safran","Saffron","epicerie",30000),
"salade_verte":("Salade verte","Lettuce, raw","fruits_legumes",1.8),
"sardine_conserve":("Sardines à l'huile (boîte)","European pilchard or sardine, in oil, canned, drained","epicerie",6),
"sardine_fraiche":("Sardines fraîches","European pilchard or sardine, raw","poissonnerie",7),
"sauce_huitre":("Sauce d'huître","Soy sauce, prepacked","epicerie",6),
"sauce_nuoc_mam":("Nuoc-mâm","Nuoc mam sauce or fish sauce, prepacked","epicerie",6),
"sauce_poisson":("Sauce de poisson","Nuoc mam sauce or fish sauce, prepacked","epicerie",6),
"sauce_soja":("Sauce soja","Soy sauce, prepacked","epicerie",4),
"saucisse_fumee":("Saucisses fumées","Smoked sausage, raw","charcuterie",8),
"saucisse_toulouse":("Saucisses de Toulouse","Toulouse sausage, raw","charcuterie",9),
"sauge":("Sauge fraîche","Sage, fresh","fruits_legumes",25),
"saumon_fume":("Saumon fumé","Salmon, smoked","poissonnerie",25),
"saumon_pavé":("Pavés de saumon","Salmon, raw, farmed","poissonnerie",20),
"seiche":("Seiche","Cuttlefish, raw","poissonnerie",12),
"sel":("Sel","Salt, white (sea, igneous or rock), iodine added, no other enrichment","epicerie",0.5),
"semoule_complete":("Semoule complète","Durum wheat semolina, raw","feculents",2.5),
"sesame_graines":("Graines de sésame","Sesame seed","epicerie",12),
"spaghetti_complets":("Spaghetti complets","Dried pasta, wholemeal, raw","feculents",2.5),
"sucre":("Sucre blanc","Sugar, white","epicerie",1.2),
"tagliatelle_complete":("Tagliatelles complètes","Dried pasta, wholemeal, raw","feculents",2.5),
"tahini":("Tahini (purée de sésame)","Tahini (sesame paste)","epicerie",10),
"thon_boite":("Thon au naturel (boîte)","Yellowfin tuna, canned in brine, drained","epicerie",8),
"thon_frais":("Thon frais","Albacore, raw","poissonnerie",18),
"thym":("Thym frais","Thyme, fresh","fruits_legumes",25),
"tofu_ferme":("Tofu ferme","Tofu, plain","epicerie",6),
"tomate":("Tomates","Tomato, raw","fruits_legumes",2.5),
"tomate_concassee":("Tomates concassées (boîte)","Tomato, peeled, canned, drained","epicerie",2),
"topinambour":("Topinambours","Jerusalem artichoke, raw","fruits_legumes",3.5),
"tortilla_ble_complet":("Tortillas de blé complet","Wheat tortilla wrap, to be filled","epicerie",6),
"truite_filet":("Filets de truite","Rainbow trout, raw, farmed","poissonnerie",12),
"veau_epaule":("Épaule de veau","Veal, shoulder, raw","boucherie",15),
"veau_hache":("Veau haché","Veal, escalope, raw","boucherie",14),
"veau_roti":("Rôti de veau","Veal, roast, raw","boucherie",15),
"vermicelle":("Vermicelles de blé","Dried pasta, raw","feculents",2),
"vermicelle_riz":("Vermicelles de riz","Rice noodle, dried","feculents",3.5),
"vin_blanc":("Vin blanc sec","Wine, white, dry","epicerie",4),
"vin_rouge":("Vin rouge","Wine, red","epicerie",4),
"vinaigre":("Vinaigre","Vinegar","epicerie",1.5),
"vinaigre_balsamique":("Vinaigre balsamique","Vinegar, balsamic","epicerie",6),
"vol_au_vent":("Vol-au-vent","Vol-au-vent, filled (average)","boulangerie",6),
"yaourt_nature":("Yaourts nature","Fermented milk or dairy specialty, yogurt type, plain, with bifidus","cremerie",1.5),
}

COLS = {
 "kcal":"Energy, Regulation EU No 1169/2011 (kcal/100g)",
 "prot":"Protein (g/100g)","lip":"Fat (g/100g)","ags":"FA saturated (g/100g)",
 "gluc":"Carbohydrate (g/100g)","sucres":"Sugars (g/100g)","fibres":"Fibres (g/100g)",
 "sel":"Salt (g/100g)","fer":"Iron (mg/100g)","calcium":"Calcium (mg/100g)",
 "magnesium":"Magnesium (mg/100g)","zinc":"Zinc (mg/100g)","potassium":"Potassium (mg/100g)",
 "phosphore":"Phosphorus (mg/100g)","selenium":"Selenium (µg/100g)",
 "vitA":"Retinol (µg/100g)","betaCarotene":"Beta-carotene (µg/100g)",
 "vitD":"Vitamin D (µg/100g)","vitE":"Vitamin E (mg/100g)","vitC":"Vitamin C (mg/100g)",
 "vitB1":"Vitamin B1 or Thiamin (mg/100g)","vitB6":"Vitamin B6 (mg/100g)",
 "b9":"Vitamin B9 or Folate (µg/100g)","b12":"Vitamin B12 (µg/100g)",
 "omega3":"FA 18:3 c9,c12,c15 (n-3) (g/100g)","epa":"FA 20:5 5c,8c,11c,14c,17c (n-3) EPA (g/100g)",
 "dha":"FA 22:6 4c,7c,10c,13c,16c,19c (n-3) DHA (g/100g)",
}
missing, out = [], {}
for key,(nom_fr,eng,rayon,prix) in M.items():
    row = rows.get(eng)
    if not row:
        missing.append((key,eng)); continue
    d = {"nom":nom_fr,"ciqual":row['alim_code'],"rayon":rayon,"prixKg":prix}
    for k,col in COLS.items():
        d[k] = num(row.get(col))
    if d.get("kcal") is None and row['alim_code'] in fr_kcal:
        d["kcal"] = fr_kcal[row['alim_code']]
        d["kcalSrc"] = "fr"  # kcal repris du sous-ensemble FR CIQUAL (même code)
    if d.get("kcal") is None:
        # Énergie absente du miroir ENG : recalculée depuis les macros CIQUAL de la même ligne
        # avec les facteurs de conversion du règlement UE 1169/2011 (4/4/9/2 kcal/g).
        p, g2, l, fi = (d.get("prot") or 0), (d.get("gluc") or 0), (d.get("lip") or 0), (d.get("fibres") or 0)
        d["kcal"] = round(4 * p + 4 * g2 + 9 * l + 2 * fi, 1)
        d["kcalSrc"] = "calc"
    out[key]=d
if missing:
    print("MANQUANTS:"); [print(" ",k,"->",e) for k,e in missing]; sys.exit(1)
js = "// Table ingrédients : nutriments pour 100 g (CIQUAL 2020, ANSES, Licence Ouverte - voir SOURCES.md) ; prix indicatif EUR/kg (estimation)\nglobalThis.INGREDIENTS = " + json.dumps(out, ensure_ascii=False, separators=(',',':')) + ";\n"
open('/home/sandbox/nutrisemaine/data/ingredients.js','w',encoding='utf-8').write(js)
print("OK", len(out), "ingrédients écrits")
