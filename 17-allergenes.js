/* Allergènes et aliments à éviter. Modèle simple, prudent et documenté dans SOURCES.md.
   - ALLERGENES : les 14 allergènes à déclaration obligatoire dans l'UE (liste réglementaire), les plus fréquents d'abord.
   - ALLERGENES_ING : par ingrédient, c = présence normale, p = possible selon la marque (produit composé, à vérifier sur l'étiquette).
     Les deux sont exclus quand l'allergie est cochée (choix prudent : mieux vaut perdre une recette que risquer une réaction).
   - EVITE : préférences (aversion) : pas une question de sécurité, simple filtre de goût.
   Ce n'est PAS une garantie : traces, contamination croisée, changement de recette industrielle et produits non listés ne sont pas couverts. */
globalThis.ALLERGENES = [
  {id:"fruits_a_coque", nom:"Fruits à coque", ex:"noix, noisettes, amandes, pignons"},
  {id:"arachide", nom:"Arachides", ex:"cacahuètes"},
  {id:"poisson", nom:"Poisson", ex:"y compris sauce de poisson, anchois"},
  {id:"crustaces", nom:"Crustacés", ex:"crevettes, crabe"},
  {id:"mollusques", nom:"Mollusques", ex:"moules, calmars, poulpe"},
  {id:"lait", nom:"Lait", ex:"fromages, beurre, crème, yaourt"},
  {id:"oeuf", nom:"Œufs", ex:"y compris pâtes aux œufs"},
  {id:"gluten", nom:"Gluten", ex:"blé, orge, seigle, épeautre, pâtes, pain"},
  {id:"soja", nom:"Soja", ex:"tofu, sauce soja, miso"},
  {id:"sesame", nom:"Sésame", ex:"graines, tahini, huile"},
  {id:"celeri", nom:"Céleri", ex:"céleri-rave, bouillon, bouquet garni"},
  {id:"moutarde", nom:"Moutarde", ex:"moutarde, certains currys"},
  {id:"sulfites", nom:"Sulfites", ex:"vin, vinaigre balsamique, fruits secs"},
  {id:"lupin", nom:"Lupin", ex:"aucun ingrédient du catalogue actuel"}
];
(function(){
 const A={}, c=(l,x)=>l.split(" ").forEach(k=>{(A[k]=A[k]||{c:[],p:[]}).c.push(...x)}), p=(l,x)=>l.split(" ").forEach(k=>{(A[k]=A[k]||{c:[],p:[]}).p.push(...x)});
 c("amande_effilee noix noisette pignons",["fruits_a_coque"]);
 c("pesto",["fruits_a_coque","lait"]);
 c("cacahuete beurre_cacahuete",["arachide"]);
 c("cabillaud_dos colin_dos hareng_marine lieu_jaune_filet loup_filet maquereau_entier maquereau_filet merlan_filet merlu_filet morue_desalee raie_aile rouget_filet sardine_fraiche saumon_fume saumon_pavé thon_frais truite_filet anchois sardine_conserve thon_boite sauce_poisson sauce_nuoc_mam",["poisson"]);
 c("crabe_miettes",["crustaces","poisson"]); c("crevette_decortiquee",["crustaces"]);
 c("encornet moule poulpe seiche sauce_huitre",["mollusques"]);
 c("beaufort beurre bleu_fromage burrata cheddar chevre_frais comte creme_fraiche feta fromage_frais gruyere_rape lait mozzarella parmesan pecorino reblochon ricotta yaourt_nature naan_complet pate_brisee pate_feuilletee",["lait"]);
 c("oeuf",["oeuf"]);
 c("farine farine_ble_complet chapelure_complete pate_brisee pate_feuilletee pate_a_pain vol_au_vent tortilla_ble_complet pain_burger_complet pain_complet pain_pita_complet naan_complet boulgour_complet epeautre orge_monde semoule_complete nouilles_ble vermicelle pates_completes spaghetti_complets tagliatelle_complete lasagne_feuille crozets sauce_soja curry_japonais pate_miso",["gluten"]);
 c("tofu_ferme germes_soja sauce_soja pate_miso curry_japonais",["soja"]);
 c("sesame_graines tahini huile_sesame",["sesame"]);
 c("celeri_boule bouillon_legumes bouquet_garni curry_japonais",["celeri"]);
 c("moutarde cornichon",["moutarde"]);
 c("vin_blanc vin_rouge vinaigre_balsamique cidre_brut raisin_sec",["sulfites"]);
 c("curry_japonais",["lait"]);
 p("merguez saucisse_toulouse saucisse_fumee porc_hache jambon_blanc",["gluten","lait","soja","celeri","moutarde"]);
 p("lardons jambon_cru poulet_fume",["lait","soja"]);
 p("pate_curry_rouge pate_curry_vert",["crustaces","poisson","sesame"]);
 p("curry_poudre ras_el_hanout",["moutarde","celeri"]);
 p("sauce_huitre sauce_soja",["soja","gluten"]); p("pate_miso",["gluten","sesame"]);
 p("pain_burger_complet pain_complet pain_pita_complet",["sesame","lait","oeuf","soja"]);
 p("vol_au_vent naan_complet tagliatelle_complete lasagne_feuille nouilles_ble pates_completes spaghetti_complets",["oeuf"]);
 p("tortilla_ble_complet pate_a_pain chapelure_complete",["lait","soja","sesame"]);
 p("farine_sarrasin polenta crozets",["gluten"]);
 p("hareng_marine",["moutarde","sulfites"]);
 p("olive_noire capres",["sulfites"]);
 p("bouillon_legumes",["gluten","soja"]);
 p("lait_de_coco",[]);
 globalThis.ALLERGENES_ING=A;
 /* Ingrédients passés en revue sans allergène UE connu (liste exhaustive vérifiée par les tests : tout nouvel ingrédient doit être classé). */
 globalThis.SANS_ALLERGENE=("agneau_epaule ail aneth artichaut asperge asperge_blanche aubergine avocat basilic betterave_cuite boeuf_a_bouillir boeuf_a_poeler boeuf_hache_5pct brocoli butternut cardon carotte cepe champignon_de_paris chou_de_bruxelles chou_fleur chou_kale chou_rouge chou_vert ciboulette citron citron_vert concombre confit_canard coriandre cote_agneau courge courgette echalote endive epinards_frais escalope_dinde fenouil feve_ecossee filet_poulet gingembre girolle haricot_vert haut_de_cuisse_poulet laitue laitue_romaine mache mangue melon menthe moelle_os navet oignon oignon_nouveau oignon_rouge orange ortie_feuille oseille panais patate_douce peche persil petit_pois pintade poireau poivron pomme pomme_de_terre pomme_de_terre_nouvelle porc_filet_mignon potiron poulet_fermier radis radis_avec_fanes raisin rhubarbe romarin roquette salade_verte sauge thym tomate topinambour veau_epaule veau_hache veau_roti kiwi fraise chataigne_cuite cumin curcuma galette_riz huile_olive lentilles_corail lentilles_vertes levure_boulanger mais miel muscade nouilles_riz origan paprika pois_casses poivre safran sel sucre vinaigre eau quinoa riz_arborio riz_basmati_complet riz_complet vermicelle_riz tomate_concassee haricots_blancs_boite haricots_rouges_boite pois_chiches_boite artichaut_conserve olive_noire capres lait_de_coco pak_choi").split(" ");
 const T=k=>[...(A[k]?.c||[]),...(A[k]?.p||[])];
 /* allergènes d'une liste d'ingrédients [[clé,g]] : {c:[...], p:[...]} sans doublon */
 globalThis.allergenesDe=function(ings){const c=new Set(),p=new Set();for(const [k] of ings){const a=A[k];if(!a)continue;a.c.forEach(x=>c.add(x));a.p.forEach(x=>p.add(x));}p.forEach(x=>{if(c.has(x))p.delete(x);});return {c:[...c],p:[...p]};};
 globalThis.allergenesIng=T;
})();
/* Aliments évités (goût, pas sécurité). re = clés d'ingrédient concernées. */
globalThis.EVITE=[
 {id:"porc",nom:"Porc et charcuterie",re:/^(porc_|jambon_|lardons|saucisse_|merguez)/},
 {id:"boeuf",nom:"Bœuf",re:/^boeuf/},
 {id:"agneau_veau",nom:"Veau et agneau",re:/^(veau|agneau|cote_agneau)/},
 {id:"volaille",nom:"Volaille",re:/^(poulet|filet_poulet|haut_de_cuisse|escalope_dinde|pintade|confit_canard)/},
 {id:"viande",nom:"Toute viande",re:/^(boeuf|veau|agneau|cote_agneau|porc_|jambon_|lardons|saucisse_|merguez|poulet|filet_poulet|haut_de_cuisse|escalope_dinde|pintade|confit_canard|moelle)/},
 {id:"poisson_gout",nom:"Poisson (goût)",re:/^(cabillaud|colin|hareng|lieu_jaune|loup|maquereau|merlan|merlu|morue|raie|rouget|sardine|saumon|thon|truite|anchois|sauce_poisson|sauce_nuoc)/},
 {id:"fruits_de_mer",nom:"Fruits de mer",re:/^(crabe|crevette|encornet|moule|poulpe|seiche|sauce_huitre)/},
 {id:"champignons",nom:"Champignons",re:/^(champignon|cepe|girolle)/},
 {id:"coriandre",nom:"Coriandre",re:/^coriandre/},
 {id:"oignon",nom:"Oignon, échalote, ail",re:/^(oignon|echalote|ail$)/},
 {id:"olives",nom:"Olives et câpres",re:/^(olive|capres)/},
 {id:"choux",nom:"Choux",re:/^(chou_|brocoli)/},
 {id:"coco",nom:"Noix de coco",re:/^lait_de_coco/},
 {id:"alcool",nom:"Alcool de cuisine",re:/^(vin_|cidre)/},
 {id:"abats_os",nom:"Os et moelle",re:/^moelle/},
 {id:"epices_fortes",nom:"Épices et curry",re:/^(curry|pate_curry|ras_el|paprika)/}
];
