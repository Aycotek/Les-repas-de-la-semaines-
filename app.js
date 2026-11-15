/* Les repas de la semaine - logique applicative (sans dépendance, données locales)
   Périmètre nutrition : les 7 dîners planifiés (4 portions chacun = dîner + déjeuner du lendemain
   pour 2 personnes). Les petits-déjeuners et repas non planifiés ne sont PAS inclus dans le bilan. */
(function () {
"use strict";

/* ---------- Données ---------- */
const RECETTES = [].concat(
  globalThis.RECIPES_HIVER, globalThis.RECIPES_PRINTEMPS,
  globalThis.RECIPES_ETE, globalThis.RECIPES_AUTOMNE, globalThis.RECIPES_ANNEE);
const ING = globalThis.INGREDIENTS;
const REF = globalThis.REFERENCES;
const contientLegumineuses = r => r.ing.some(([k,g])=>/^(lentille|pois_chiche|pois_casse|haricots_blancs|haricots_rouges|feve|flageolets)/.test(k) && g>=100);
const RECETTE_PAR_ID = Object.assign(Object.create(null),Object.fromEntries(RECETTES.map(r => [r.i, r])));

// Ingrédients comptés dans les limites PNNS (par clé d'ingrédient)
const VIANDE_ROUGE = k => /^(boeuf|veau|agneau|cote_agneau|porc|saucisse_toulouse|merguez)/.test(k);
const CHARCUTERIE = k => /^(lardons|jambon_|saucisse_fumee|saucisse_toulouse|merguez|poitrine_demi_sel)/.test(k);
const POISSON_GRAS = k => /^(saumon|maquereau|sardine|hareng|truite)/.test(k);

const NUTRIMENTS = [
  ["kcal", "Énergie", "kcal", null], ["prot", "Protéines", "g", "proteines_g"], ["lip", "Lipides", "g", null],
  ["ags", "Acides gras saturés", "g", null], ["sucres", "Sucres totaux", "g", null], ["sel", "Sel", "g", null], ["gluc", "Glucides", "g", null], ["fibres", "Fibres", "g", "fibres_g"],
  ["fer", "Fer", "mg", "fer_mg"], ["calcium", "Calcium", "mg", "calcium_mg"], ["magnesium", "Magnésium", "mg", "magnesium_mg"],
  ["potassium", "Potassium", "mg", "potassium_mg"], ["zinc", "Zinc", "mg", "zinc_mg"],
  ["selenium", "Sélénium", "µg", "selenium_ug"], ["vitC", "Vitamine C", "mg", "vitamineC_mg"],
  ["vitD", "Vitamine D", "µg", "vitamineD_ug"], ["b9", "Vitamine B9", "µg", "vitamineB9_ug"],
  ["b12", "Vitamine B12", "µg", "vitamineB12_ug"], ["vitE", "Vitamine E", "mg", "vitamineE_mg"],
  ["vitA", "Vitamine A (rétinol)", "µg", null], ["betaCarotene", "Bêta-carotène", "µg", null], ["phosphore", "Phosphore", "mg", null], ["omega3", "Oméga-3 ALA", "g", null], ["epa", "EPA", "g", null], ["dha", "DHA", "g", null], ["vitB1", "Vitamine B1", "mg", "vitamineB1_mg"], ["vitB6", "Vitamine B6", "mg", "vitamineB6_mg"]
];
const TYPE_LABEL = { viande: "Viande rouge", porc: "Porc", volaille: "Volaille", volaille_blanche: "Volaille",
  poisson_maigre: "Poisson", poisson_gras: "Poisson gras", oeufs: "Œufs", legumineuses: "Légumineuses", vege: "Végétarien", fruits_mer: "Fruits de mer" };
const ALT_MATERIEL = { cuit_vapeur: "casserole + passoire", mixeur: "couteau (hacher fin)", plancha: "poêle",
  gril: "four position grill", wok: "grande sauteuse", four: "pas d’équivalent universel : choisir un autre plat si le four est indispensable", cocotte: "faitout", poele: "sauteuse",
  casserole: "faitout", sauteuse: "grande poêle", saladier: "grand récipient" };

/* ---------- Profil foyer (localStorage, données qui restent sur cet appareil) ---------- */
const PROFIL_DEFAUT = { personnes: [
    { sexe: "homme", poids: 70 }, { sexe: "femme", poids: 60 }],
  exclusions: [], materiel: ["four", "poele", "casserole", "saladier", "cocotte", "sauteuse"],
  budget: 80, portionsParRecette: 4 };
let stockageDisponible = true;
const stockage = {
 getItem(k) { try { return localStorage.getItem(k); } catch { stockageDisponible = false; return null; } },
 setItem(k,v) { try { localStorage.setItem(k,v); stockageDisponible = true; return true; } catch { stockageDisponible = false; return false; } }
};
const entier = (v,min,max,def) => Number.isFinite(+v) ? Math.max(min,Math.min(max,Math.round(+v))) : def;
/* Anciens réglages (motifs bruts) -> nouveaux choix. Toujours au moins aussi prudent : un ancien « œufs/lait/fruits à coque/poisson » devient une allergie stricte. */
function migrerExclusions(l) {
 const M={"poisson":["allergen:poisson"],"oeuf":["allergen:oeuf"],"porc_filet_mignon|porc_hache|saucisse_toulouse|lardons|jambon_blanc|jambon_cru|saucisse_fumee":["evite:porc"],
  "crevette|crabe|moule|encornet|seiche|poulpe":["allergen:crustaces","allergen:mollusques"],
  "lait|yaourt|beurre|creme|fromage|comte|gruyere|parmesan|mozzarella|feta|ricotta|cheddar|beaufort|reblochon|bleu|pecorino|burrata|chevre":["allergen:lait"],
  "noix|noisette|amande|pignons|cacahuete|sesame":["allergen:fruits_a_coque","allergen:arachide","allergen:sesame"]};
 const out=[];for(const x of l){for(const y of (M[x]||[x]))if(!out.includes(y))out.push(y);}return out;
}
function chargerProfil() {
 let p; try { p = JSON.parse(stockage.getItem("ns_profil") || "{}"); } catch { p = {}; }
 if (!p || typeof p !== "object") p = {};
 return { personnes: Array.from({length:entier(p.personnes?.length || 2,1,8,2)},(_,i)=>({sexe:i%2?"femme":"homme",poids:i%2?60:70})),
 exclusions: migrerExclusions(Array.isArray(p.exclusions) ? p.exclusions.filter(x=>typeof x==="string").slice(0,40) : []),
 materiel: Array.isArray(p.materiel) ? p.materiel.filter(x=>typeof x==="string") : [...PROFIL_DEFAUT.materiel],
 budget: entier(p.budget ?? 80,20,300,80), portionsParRecette:entier(p.portionsParRecette ?? 4,2,12,4),
 sante: Array.isArray(p.sante) ? p.sante.filter(x=>["dt1","glycemie","cholesterol"].includes(x)).slice(0,3) : [] };
}
function sauverProfil(p) { return stockage.setItem("ns_profil", JSON.stringify(p)); }
let profil = chargerProfil();

/* ---------- Taille du texte (accessibilité, réglage gardé sur cet appareil) ---------- */
const NIVEAUX_TAILLE = [100, 125, 150];
function tailleTexte() { const v = +stockage.getItem("ns_taille_texte"); return NIVEAUX_TAILLE.includes(v) ? v : 100; }
function appliquerTailleTexte() { if (typeof document !== "undefined" && document.documentElement) document.documentElement.style.fontSize = tailleTexte() === 100 ? "" : tailleTexte() + "%"; }
function cycleTailleTexte() { const i = NIVEAUX_TAILLE.indexOf(tailleTexte()); stockage.setItem("ns_taille_texte", String(NIVEAUX_TAILLE[(i + 1) % NIVEAUX_TAILLE.length])); appliquerTailleTexte(); }
function libelleTailleTexte() { const t = tailleTexte(); return t === 100 ? "Taille normale." : t === 125 ? "125 % (prochain appui : 150 %)." : "150 % (prochain appui : taille normale)."; }

/* ---------- Calculs nutrition ---------- */
// Nutriments d'une recette entière (toutes portions) ; null si une valeur manque (tracé, jamais inventé)
function nutrimentsRecette(r) {
  const t = {}, absents = {}; let manquants = 0;
  for (const [cle] of NUTRIMENTS) {t[cle] = 0; absents[cle] = 0;}
  for (const [k, g] of r.ing) {
    const ing = ING[k];
    if (!ing) continue;
    for (const [cle] of NUTRIMENTS) {
      const v = ing[cle];
      if (v == null) { manquants++; absents[cle]++; continue; }
      t[cle] += v * g / 100;
    }
  }
  return { t, manquants, absents };
}
/* Les rendements servent seulement à afficher le poids à acheter.
   Les quantités et prixKg du moteur restent exprimés en partie comestible.
   Sources et hypothèses : REVUE-CORRECTIONS.md, lot corrigé v4. */
const ACHATS = {
 moule: {rendement:0.30, produit:"moules en coquille", partie:"chair", prixAchatKg:5},
 veau_jarret: {rendement:0.70, produit:"rondelles avec os", partie:"chair", prixAchatKg:14},
 palourdes: {rendement:0.25, produit:"palourdes en coquille", partie:"chair", prixAchatKg:14}
};
function poidsTexte(g) { return g>=1000 ? (g/1000).toLocaleString("fr-FR",{maximumFractionDigits:2})+" kg" : g.toLocaleString("fr-FR",{maximumFractionDigits:2})+" g"; }
function quantiteIngredient(k,g) {
 const a=ACHATS[k];
 if(!a)return poidsTexte(g);
 return `≈ ${poidsTexte(g/a.rendement)} à acheter (${a.produit}) ; ${poidsTexte(g)} de ${a.partie} pour le calcul nutritionnel`;
}
function etapeAffichee(r,e) {
 // Adapter les rappels d'achat dans les étapes, sans changer la recette source.
 const q=profil.portionsParRecette/4;
 // Les volumes déjà écrits pour quatre suivent les portions, jamais les durées/températures.
 const eaux={h04:["1,5 l",1.5],h14:["1,5 l",1.5],h21:["1 l",1],h33:["1,2 l",1.2],h59:["1 l",1],a40:["1,2 l",1.2]};
 if(eaux[r.i]){const [texte,litres]=eaux[r.i];e=e.replace(texte+" d'eau",(litres*q).toLocaleString("fr-FR",{maximumFractionDigits:2})+" l d'eau");}
 if(r.i==="h11")e=e.replace("4 ramequins",profil.portionsParRecette+" ramequins");
 if(r.i==="h49")e=e.replace("1 kg en rondelles pour 700 g de chair",`${poidsTexte(1000*q)} en rondelles pour ${poidsTexte(700*q)} de chair`);
 if(r.i==="t42")e=e.replace("800 g en coquille, soit 200 g de chair",`${poidsTexte(800*q)} en coquille, soit ${poidsTexte(200*q)} de chair`);
 if(r.ing.some(([k])=>k==="moule")){
  const chair=r.ing.find(([k])=>k==="moule")[1]*q;
  // Les étapes v4 portent toutes une parenthèse chair et un rappel achat.
  e=e.replace(/(?:2 kg|1,6 kg|800 g) de moules en coquille \(≈(?:600|480|240) g de chair\)/g,`${poidsTexte(chair/.3)} de moules en coquille (≈${poidsTexte(chair)} de chair)`);
  e=e.replace(/les moules en coquille \(800 g, ≈240 g de chair\)/g,`les moules en coquille (${poidsTexte(chair/.3)}, ≈${poidsTexte(chair)} de chair)`);
 }
 return e;
}
function noteAchat(k) {
 const a=ACHATS[k];if(!a)return "";
 return `Rendement estimé à ${Math.round(a.rendement*100)} % ; prix indicatif ≈ ${a.prixAchatKg} €/kg acheté. Le poids réel de chair peut varier.`;
}
function coutRecette(r) {
  let c = 0;
  for (const [k, g] of r.ing) { const ing = ING[k]; if (ing) c += ing.prixKg * g / 1000; }
  return c;
}
function grammesParSemaine(r, filtre) {
  let g = 0;
  for (const [k, q] of r.ing) if (filtre(k)) g += q;
  return g;
}

/* ---------- Planificateur ---------- */
function poolDuMois(mois, exclusions) {
  return RECETTES.filter(r => (r.m || []).includes(mois) &&
    !estExclue(r,exclusions));
}
function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Score d'un plan : couverture des repères PNNS + nutriments + budget. Pénalités douces.
function formeCulinaire(r) {
 const n=r.n.toLowerCase();
 if(/soupe|velouté|bouillon|minestrone|dahl|curry|ramen/.test(n))return "bol_mijote";
 if(/salade|taboulé|bowl/.test(n))return "salade";
 if(/gratin|tarte|quiche|pizza|lasagne|hachis|parmentier|tian/.test(n))return "four";
 if(/pâtes|spaghetti|tagliatelle|risotto|riz|nouilles|crozets/.test(n))return "cereales";
 return "poele_roti";
}
// Famille de plat : nom distinctif du plat principal (partie avant la virgule d'accompagnement).
// Sert à éviter deux plats quasi identiques dans la semaine (ex. deux parmentiers).
const FAMILLES_PLAT = [/parmentier|hachis/,/moussaka/,/lasagne/,/tartiflette/,/cassoulet|cassolette/,/blanquette/,/bourg/,/pot-au-feu/,/chili/,/couscous/,/tajine/,/paella|paëlla/,/risotto/,/curry/,/dahl|dal\b/,/wok/,/gratin(?!é)/,/quiche/,/pizza/,/galette/,/croque/,/tarte/,/tian/,/fondue/,/raclette/,/burger/];
function famillePlat(r) {
  const n = r.n.toLowerCase().split(",")[0];
  for (const re of FAMILLES_PLAT) if (re.test(n)) return re.source;
  return null;
}
// La viande ne définit pas la famille gustative : hachis et parmentiers restent ensemble.
function familleVoisine(r) {
 const existante=famillePlat(r);if(existante)return existante;
 const n=r.n.toLowerCase().split(",")[0];
 // Ces groupes supplémentaires concernent seulement deux dîners voisins,
 // sans ajouter d'interdiction ni de pénalité à l'échelle de toute la semaine.
 for(const re of [/soupe|velouté|bouillon|minestrone|ramen|phở/,/salade|taboulé|bowl/,/omelette|frittata/,/brochette/,/pané/])if(re.test(n))return re.source;
 return null;
}
function platsProches(a,b) {
 const f=familleVoisine(a);return !!f && f===familleVoisine(b);
}
function conflitsVariete(ids) {
 const conflits=[];
 for(let i=1;i<ids.length;i++)if(platsProches(RECETTE_PAR_ID[ids[i-1]],RECETTE_PAR_ID[ids[i]]))conflits.push(i);
 return conflits;
}
function ordreSansConflitPossible(ids) {
 const comptes={};
 for(const id of ids){const f=familleVoisine(RECETTE_PAR_ID[id]);if(f)comptes[f]=(comptes[f]||0)+1;}
 return Object.values(comptes).every(n=>n<=Math.ceil(ids.length/2));
}
// Au plus 7! ordres. Même sélection : coût, quantités et nutriments strictement identiques.
// Priorité : zéro famille consécutive, puis varier les formes, puis déplacer peu de jours.
function repartirPlats(ids) {
 if(ids.length<2)return ids.slice();
 const recettes=ids.map(id=>RECETTE_PAR_ID[id]);
 const familles=recettes.map(familleVoisine),formes=recettes.map(formeCulinaire);
 const possible=ordreSansConflitPossible(ids);
 let meilleur=null,cleMeilleure=[Infinity,Infinity,Infinity];
 const chemin=[],pris=new Set();
 function visiter(conflits,formesRepetees,deplacements){
  if(conflits>cleMeilleure[0] || (conflits===cleMeilleure[0] && formesRepetees>cleMeilleure[1]))return;
  if(chemin.length===ids.length){
   const cle=[conflits,formesRepetees,deplacements];
   if(cle[0]<cleMeilleure[0] || (cle[0]===cleMeilleure[0] && (cle[1]<cleMeilleure[1] || (cle[1]===cleMeilleure[1] && cle[2]<cleMeilleure[2])))){meilleur=chemin.map(i=>ids[i]);cleMeilleure=cle;}
   return;
  }
  for(let i=0;i<ids.length;i++)if(!pris.has(i)){
   const precedent=chemin[chemin.length-1];
   const conflit=precedent!==undefined && familles[i] && familles[i]===familles[precedent]?1:0;
   if(possible && conflit)continue;
   const rep=precedent!==undefined && formes[i]===formes[precedent]?1:0;
   pris.add(i);chemin.push(i);visiter(conflits+conflit,formesRepetees+rep,deplacements+Math.abs(i-chemin.length+1));chemin.pop();pris.delete(i);
  }
 }
 visiter(0,0,0);return meilleur||ids.slice();
}
function remplacementVarie(ids,index,id) {
 const r=RECETTE_PAR_ID[id];
 return !(index>0 && platsProches(RECETTE_PAR_ID[ids[index-1]],r)) && !(index+1<ids.length && platsProches(r,RECETTE_PAR_ID[ids[index+1]]));
}
function scorePlan(ids,mois=moisSemaine()) {
  const recettes = ids.map(i => RECETTE_PAR_ID[i]);
  let s = 0;
  const types = {}, formes = {}, familles = {};
  let poisson = 0, gras = 0, legum = 0, viandeG = 0, charcG = 0, budget = 0;
  for (const r of recettes) {
    types[r.t] = (types[r.t] || 0) + 1;
    const forme=formeCulinaire(r);formes[forme]=(formes[forme]||0)+1;
    const fam=famillePlat(r);if(fam)familles[fam]=(familles[fam]||0)+1;
    if (r.t === "poisson_maigre" || r.t === "poisson_gras") poisson++;
    if (r.t === "poisson_gras") gras++;
    if (contientLegumineuses(r)) legum++;
    // portions/personne : recette de 4 portions pour 2 personnes = 2 portions/pers -> g/pers = g/2
    viandeG += grammesParSemaine(r, VIANDE_ROUGE) * profil.portionsParRecette / 4 / profil.personnes.length;
    charcG += grammesParSemaine(r, CHARCUTERIE) * profil.portionsParRecette / 4 / profil.personnes.length;
    budget += coutRecette(r) * profil.portionsParRecette / 4;
  }
  // PNNS (occasions de consommation = recette × 2 portions/pers : dîner + restes)
  s -= 150 * Math.abs(poisson - 2);            // 2 dîners poisson => 4 occasions/pers (repère : 2)
  if (gras < 1) s -= 35;
  s -= 35 * Math.max(0, 2 - legum);
  s -= Math.max(0, viandeG - REF.reperes.viandeRouge_g_max_par_semaine) * 10;
  s -= Math.max(0, charcG - REF.reperes.charcuterie_g_max_par_semaine) * 10;
  s -= Math.max(0, budget + coutComplements() - profil.budget) * 10;
  for (const t of Object.values(types)) if (t > 2) s -= 12 * (t - 2);
  for(const [f,n] of Object.entries(formes)) s-= (f==="bol_mijote"?35:15)*Math.max(0,n-2);
  // Deux plats de la même famille dans la semaine : pénalité forte mais souple (jamais bloquante).
  for(const n of Object.values(familles)) if(n>1) s-=60*(n-1);
  for(let i=1;i<recettes.length;i++)if(formeCulinaire(recettes[i])===formeCulinaire(recettes[i-1]))s-=5;
  // Saisonnalité (contrainte souple) : bonus pour les recettes propres au mois courant
  for (const r of recettes) if ((r.m || []).includes(mois) && (r.m || []).length < 12) s += 4;
  // Favoris : préférence culinaire indépendante du bilan nutritionnel.
  // Bonus borné par FAV_CAP pour ne pas monopoliser la semaine ni dégrader les contraintes dures.
  { const favs=favoris(); let nbFav=0; for (const r of recettes) if (favs.includes(r.i) && nbFav<FAV_CAP) { s+=FAV_BONUS; nbFav++; } }
  // Aucun biais de génération lié à une pathologie : données informatives seulement.
  // Aucun terme de score sur les sommes de nutriments (D5, contre-audit APP v2).
  // Chaque nutriment à repère a au moins une cellule source absente dans le catalogue
  // (ex. protéines : 3 ingrédients troués ; sélénium : 56). Toute somme serait donc
  // partielle pour certains plans, ce que le contrat interdit (« inconnu ≠ 0, jamais
  // de somme partielle numérique »). Une exclusion par plan créerait une récompense
  // ou une pénalité cachée pour les recettes trouées ; une exclusion globale viderait
  // les 15 nutriments. La seule lecture neutre : pas de dimension nutriments dans le
  // score de génération. Les bilans affichés, eux, propagent « non calculable ».
  return s;
}
function rnpHebdoFoyer() {
  // RNP hebdomadaire moyen par personne du foyer (profil type, pas une prescription individuelle)
  const acc = {};
  for (const p of profil.personnes) {
    const r = REF.rnp[p.sexe] || REF.rnp.homme;
    for (const [k, v] of Object.entries(r)) acc[k] = (acc[k] || 0) + v * 7;
    acc.proteines_g = (acc.proteines_g || 0) + r.proteines_g_par_kg * p.poids * 7;
  }
  for (const k of Object.keys(acc)) acc[k] /= profil.personnes.length;
  return acc;
}
function genererPlan(mois, graine) {
  const pool = poolDuMois(mois, profil.exclusions);
  if (pool.length < 7) return repartirPlats(pool.map(r => r.i));
  const rand = mulberry32(graine);
  let meilleur = null, meilleurScore = -1e9, meilleurRepli=null, scoreRepli=-1e9;
  for (let it = 0; it < 500; it++) {
    const copie = pool.slice();
    const ids = [];
    while (ids.length < 7 && copie.length) ids.push(copie.splice(Math.floor(rand() * copie.length), 1)[0].i);
    const sc = scorePlan(ids,mois);
    if(sc>scoreRepli){scoreRepli=sc;meilleurRepli=ids;}
    if (ordreSansConflitPossible(ids) && sc > meilleurScore) { meilleurScore = sc; meilleur = ids; }
  }
  return repartirPlats(meilleur||meilleurRepli);
}
function relancerRepas(planIds, index, mois, graine) {
  // Remplace UN repas en recalculant l'équilibre et le budget de toute la semaine
  const pool = poolDuMois(mois, profil.exclusions).filter(r => !planIds.includes(r.i) && remplacementVarie(planIds,index,r.i));
  if (!pool.length) return planIds;
  const rand = mulberry32(graine);
  let meilleur = null, meilleurScore = -1e9;
  // Examiner chaque alternative admissible, sans rater un choix à cause du tirage.
  const alternatives=pool.slice();
  while(alternatives.length) {
    const cand = alternatives.splice(Math.floor(rand()*alternatives.length),1)[0].i;
    const essai = planIds.slice(); essai[index] = cand;
    const sc = scorePlan(essai,mois);
    if (sc > meilleurScore) { meilleurScore = sc; meilleur = cand; }
  }
  const nouveau = planIds.slice(); nouveau[index] = meilleur;
  return nouveau;
}

/* ---------- Génération, allergies et aliments à éviter ---------- */
let animer = true, panelOuvert = false, messageGen = "", focusApres = "";
const MAX_MOTS = 12;
const nbCompatibles = () => RECETTES.filter(r => !estExclue(r, profil.exclusions)).length;
const repasEnConflit = () => idsComplets().filter(id => estExclue(RECETTE_PAR_ID[id], profil.exclusions));
function rendreHero() {
 const exc = profil.exclusions, nAl = exc.filter(x => x.startsWith("allergen:")).length, nEv = exc.filter(x => x.startsWith("evite:") || x.startsWith("mot:")).length;
 const puce = (val, label, aide) => `<label class="puce"><input type="checkbox" data-exc="${esc(val)}" ${exc.includes(val) ? "checked" : ""}><span>${esc(label)}${aide ? `<small>${esc(aide)}</small>` : ""}</span></label>`;
 const mots = exc.filter(x => x.startsWith("mot:"));
 const conflits = repasEnConflit();
 const n = nbCompatibles();
 return `<section class="hero" aria-labelledby="titreGen">
  <h2 id="titreGen">Sept dîners variés, filtrés selon tes exclusions.</h2>
  <div class="hero-actions"><button class="principal grand" id="btnGenerer" data-act="generer" type="button">Générer les repas de la semaine</button>
  ${planPrecedent() ? `<button class="secondaire" type="button" data-act="annuler">Annuler (revenir au menu d'avant)</button>` : ""}
  <button class="secondaire" type="button" data-act="ouvrirFiltres" aria-controls="panneauFiltres" aria-expanded="${panelOuvert}">Allergies et exclusions${nAl + nEv ? ` (${nAl + nEv})` : ""}</button></div>
  <p class="note statut" id="annonce" role="status" aria-live="polite">${esc(messageGen || (n + " recettes sur " + RECETTES.length + " correspondent à tes choix."))}</p>
  ${conflits.length ? `<p class="alerte" role="alert">${conflits.length} repas de cette semaine ne correspondent plus à tes choix. Génère la semaine pour les remplacer.</p>` : ""}
  <div class="filtres ${panelOuvert ? "" : "masque"}" id="panneauFiltres">
   <fieldset class="groupe"><legend>Allergies <small>exclusion prudente, pas une garantie</small></legend>
    <p class="note">Les 14 allergènes à déclaration obligatoire en Europe, les plus fréquents d'abord. Une recette est écartée si un ingrédient en contient, ou peut en contenir selon la marque (produits transformés). Traces et contamination croisée ne sont pas couvertes.</p>
    <div class="puces">${globalThis.ALLERGENES.map(a => puce("allergen:" + a.id, a.nom, a.ex)).join("")}</div></fieldset>
   <fieldset class="groupe"><legend>Je ne veux pas manger <small>goût, pas une question de sécurité</small></legend>
    <div class="puces">${globalThis.EVITE.map(e => puce("evite:" + e.id, e.nom)).join("")}</div>
    <form class="ajout" id="formMot"><label class="sr-only" for="motEvite">Autre aliment à éviter</label><input id="motEvite" maxlength="30" placeholder="Autre aliment (ex. courgette, lentilles)…" autocomplete="off"><button class="petit principal">Ajouter</button></form>
    ${mots.length ? `<div class="puces">${mots.map(m => `<span class="puce-mot">${esc(m.slice(4))}<button type="button" class="retire" data-act="retireMot" data-mot="${esc(m)}" aria-label="Ne plus éviter ${esc(m.slice(4))}">×</button></span>`).join("")}</div>` : ""}</fieldset>
   <p class="note">Ce filtre n'est pas une garantie médicale : traces, contamination croisée et recettes industrielles changeantes ne sont pas vérifiables ici. Lis toujours les étiquettes.</p>
   <fieldset class="groupe"><legend>Informations par portion</legend>
    <label class="choix"><input type="checkbox" class="sante-cb" data-sante="dt1" ${profil.sante.includes("dt1")?"checked":""}> Afficher les glucides, sucres et graisses saturées par portion</label>
    <p class="note">Affichage informatif uniquement : aucun filtre pour le diabète ou le cholestérol n'est appliqué. Peu de sucres ne signifie pas peu de glucides ni une réponse glycémique favorable. Aucune dose de traitement n'est calculée.</p></fieldset>
  </div></section>`;
}
function memoriserPlan() { stockage.setItem("ns_plan_prev_" + cleSemaine(), JSON.stringify(plan)); }
function planPrecedent() { try { const p = JSON.parse(stockage.getItem("ns_plan_prev_" + cleSemaine()) || "null"); return Array.isArray(p) && p.length && p.every(i => typeof i === "string" && RECETTE_PAR_ID[i]) ? p : null; } catch { return null; } }
const optionsRepas = q => { const m = norm(q).trim(); return RECETTES.filter(r => !estExclue(r, profil.exclusions) && (!m || norm(r.n).includes(m))).slice(0, 200).map(r => `<option value="${r.i}">${esc(r.n)}</option>`).join("") || `<option value="" disabled selected>Aucun plat ne correspond</option>`; };
const optionsRemplacement = () => plan.map((pid, idx) => { const d = new Date(semaine); d.setDate(d.getDate() + idx); return `<option value="${idx}">${esc(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" }))} — ${esc(RECETTE_PAR_ID[pid].n)}</option>`; }).join("");
document.addEventListener("input", e => { if (e.target.id === "filtreRepas") $("#ajoutRepas").innerHTML = optionsRepas(e.target.value); });
function generer() {
 const n = nbCompatibles();
 if (n === 0) { messageGen = "Aucune recette ne correspond à tous tes choix. Retire une exclusion pour pouvoir générer."; panelOuvert = true; rendreTout(); return; }
 resetCoches();
 stockage.setItem("ns_repas_" + cleSemaine(), JSON.stringify(repasManuels().filter(id => !estExclue(RECETTE_PAR_ID[id], profil.exclusions))));
 memoriserPlan(); const avant = plan.join();
 let p = genererPlan(moisSemaine(), hashStr(cleSemaine() + ":" + Date.now() + ":" + Math.random()));
 if (p.join() === avant && n > 7) p = genererPlan(moisSemaine(), hashStr("bis" + Date.now() + Math.random()));
 plan = p; stockage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
 messageGen = n < 7 ? `Seulement ${n} recette${n > 1 ? "s" : ""} compatible${n > 1 ? "s" : ""} : la semaine est incomplète. Retire une exclusion pour plus de choix.` : `Nouvelle semaine générée : ${plan.length} dîners parmi ${n} recettes compatibles.`;
 animer = true; panelOuvert = false; rendreTout();
}

/* ---------- Semaine courante ---------- */
function lundiDe(date) { const d = new Date(date); const j = (d.getDay() + 6) % 7; d.setDate(d.getDate() - j); d.setHours(0,0,0,0); return d; }
function isoSemaine(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const jour = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - jour + 3);
  const premierJeudi = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t - premierJeudi) / 864e5 - 3 + ((premierJeudi.getUTCDay() + 6) % 7)) / 7); }
let semaine = lundiDe(new Date());
function cleSemaine() { const jeudi=new Date(semaine);jeudi.setDate(jeudi.getDate()+3);return jeudi.getFullYear()+"-S"+isoSemaine(semaine); }
function moisSemaine() { return semaine.getMonth() + 1; }

/* ---------- État plan ---------- */
function chargerPlan() {
  const brut = stockage.getItem("ns_plan_" + cleSemaine());
  if (brut) { try { const p = JSON.parse(brut); if (Array.isArray(p) && p.length > 0 && p.length <= 7 && new Set(p).size === p.length && p.every(i => typeof i==="string" && RECETTE_PAR_ID[i] && !estExclue(RECETTE_PAR_ID[i],profil.exclusions))) return p; } catch (e) {} }
  const plan = genererPlan(moisSemaine(), hashStr(cleSemaine()));
  stockage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
  return plan;
}
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
let plan = chargerPlan();

/* ---------- Courses ---------- */
function coursesManuelles() { try { const a=JSON.parse(stockage.getItem("ns_courses_"+cleSemaine())||"[]"); return Array.isArray(a)?a.filter(x=>typeof x==="string").map(x=>x.slice(0,200)).slice(0,100):[]; } catch {return [];} }
function repasManuels() { try { const a=JSON.parse(stockage.getItem("ns_repas_"+cleSemaine())||"[]"); return Array.isArray(a)?a.filter(id=>typeof id==="string" && RECETTE_PAR_ID[id]).slice(0,40):[]; } catch { return []; } }
function idsComplets() { return [...plan,...repasManuels()]; }
function sauverCoursesManuelles(l) { stockage.setItem("ns_courses_" + cleSemaine(), JSON.stringify(l)); }
function complementsActifs() { return stockage.getItem("ns_complements_"+cleSemaine())==="oui"; }
function complements(mois=moisSemaine(),force=false) {
 if(!force&&!complementsActifs())return [];
 const fruits={1:["orange","kiwi","pomme"],2:["orange","kiwi","pomme"],3:["orange","kiwi","pomme"],4:["fraise","pomme"],5:["fraise"],6:["fraise","peche"],7:["peche","melon"],8:["peche","melon"],9:["pomme","raisin"],10:["pomme","kiwi"],11:["kiwi","pomme","orange"],12:["orange","kiwi","pomme"]}[mois];
 const liste=[];
 for(let j=0;j<7;j++){
  const items=[[fruits[j%fruits.length],150],["yaourt_nature",125],["amande_effilee",10]];
  for(const [k,g]of items){if(!ING[k]||estExclue({t:"vege",ing:[[k,g]]},profil.exclusions))continue;liste.push([k,g*profil.portionsParRecette]);}
 }
 return liste;
}
function coutComplements(force=false){return complements(moisSemaine(),force).reduce((sum,[k,g])=>sum+ING[k].prixKg*g/1000,0);}
function listeCourses() {
  const echelle = profil.portionsParRecette / 4; // recettes écrites pour 4 portions
  const agg = {};
  for (const id of idsComplets()) {
    for (const [k, g] of RECETTE_PAR_ID[id].ing) {
      const ing = ING[k]; if (!ing) continue;
      if (!agg[k]) agg[k] = { nom: ing.nom, rayon: ing.rayon, g: 0, prix: 0 };
      agg[k].g += g * echelle;
      agg[k].prix += ing.prixKg * g * echelle / 1000;
    }
  }
  for(const [k,g] of complements()){const ing=ING[k];if(!agg[k])agg[k]={nom:ing.nom,rayon:ing.rayon,g:0,prix:0};agg[k].g+=g;agg[k].prix+=ing.prixKg*g/1000;}
  return agg;
}

function cochesCourses() {try {const x=JSON.parse(stockage.getItem("ns_coches_"+cleSemaine())||"[]");return Array.isArray(x)?x.filter(k=>typeof k==="string"&&ING[k]):[];}catch{return [];}}
function resetCoches() {stockage.setItem("ns_coches_"+cleSemaine(),"[]");}

/* ---------- Rendu ---------- */
const $ = s => document.querySelector(s);
const fmt = (v, u) => v == null ? "—" : (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + " " + u;
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur = v => v.toFixed(2).replace(".", ",") + " €";

function visuelPlat(r,idx) {
 const src=globalThis.DESSINS_PLATS && globalThis.DESSINS_PLATS[r.i];
 if(src){
  const photo=src.startsWith("assets/photos/");
  const gen=src.startsWith("assets/gen/");
  const kind=photo?"Photo":(gen?"Visuel":"Dessin illustratif");
  return `<img src="${esc(src)}" width="1080" height="648" loading="${idx<2?'eager':'lazy'}" decoding="async" alt="${kind} : ${esc(r.n)}">`;
 }
 return globalThis.illustrationPlat ? illustrationPlat(r) : "";
}
/* Crédits photos : nom, licence, URL source et URL licence (à revérifier à la source avant publication) ; modif:"recadrée" si adaptation consignée. */
const CREDITS_PHOTOS={
"e08":{nom:"ultrakml",lic:"CC BY 2.0",src:"https://www.flickr.com/photos/34948727@N00/14049540523",url:"https://creativecommons.org/licenses/by/2.0/deed.fr"},
"e24":{nom:"Shameel mukkath",lic:"Licence Pexels",src:"https://www.pexels.com/photo/vegetable-salad-with-chicken-strips-5639372/",url:"https://www.pexels.com/fr-fr/license/"},
"e38":{nom:"Nano Erdozain",lic:"Licence Pexels",src:"https://www.pexels.com/photo/29535640/",url:"https://www.pexels.com/fr-fr/license/"},
"t10":{nom:"Nic Wood",lic:"Licence Pexels",src:"https://www.pexels.com/photo/28286241/",url:"https://www.pexels.com/fr-fr/license/"},
"t51":{nom:"MikeGz",lic:"Licence Pexels",src:"https://www.pexels.com/photo/overhead-shot-of-a-slice-of-spanish-omelet-4765652/",url:"https://www.pexels.com/fr-fr/license/"},
"e42":{nom:"Romainbehar",lic:"CC0",src:"https://commons.wikimedia.org/?curid=110017699",url:"https://creativecommons.org/publicdomain/zero/1.0/deed.fr"},
"h05":{nom:"cyclonebill",lic:"CC BY-SA 2.0",src:"https://www.flickr.com/photos/23178876@N03/5034005470",url:"https://creativecommons.org/licenses/by-sa/2.0/deed.fr"},
"p27":{nom:"Katrin Gilger",lic:"CC BY-SA 2.0",src:"https://commons.wikimedia.org/?curid=89958449",url:"https://creativecommons.org/licenses/by-sa/2.0/deed.fr"},
"t45":{nom:"NickNguyen",lic:"CC BY-SA 2.0",src:"https://www.flickr.com/photos/24606258@N05/3747727389",url:"https://creativecommons.org/licenses/by-sa/2.0/deed.fr"},
"a53":{nom:"Ka23 13",lic:"CC BY-SA 4.0",src:"https://commons.wikimedia.org/?curid=106541820",url:"https://creativecommons.org/licenses/by-sa/4.0/deed.fr"},
"a59":{nom:"Arnaud 25",lic:"CC BY-SA 4.0",src:"https://commons.wikimedia.org/?curid=95670402",url:"https://creativecommons.org/licenses/by-sa/4.0/deed.fr"},
"t28":{nom:"Helen Brudna",lic:"Licence Pexels",src:"https://www.pexels.com/photo/32649105/",url:"https://www.pexels.com/fr-fr/license/"}};
function etiquettePlat(r) {
 const src=globalThis.DESSINS_PLATS && globalThis.DESSINS_PLATS[r.i];
 if(src && src.startsWith("assets/photos/")){
  const c=CREDITS_PHOTOS[r.i];
  return c ? `<span class="etiquette">Photo : <a href="${esc(c.src)}" target="_blank" rel="noopener">${esc(c.nom)}</a> (<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.lic)}</a>)${c.modif?`, ${esc(c.modif)}`:""}</span>` : "";
 }
 if(src && src.startsWith("assets/gen/")) return "";
 return `<span class="etiquette">Dessin illustratif</span>`;
}
function rendreSemaine() {
  const mois = moisSemaine();
  const classeAnim = animer ? " anime" : ""; animer = false;
  $("#semLabel").textContent = "Semaine du " + semaine.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  let budget = 0;
  const cartes = plan.map((id, idx) => {
    const r = RECETTE_PAR_ID[id]; const dateDiner=new Date(semaine);dateDiner.setDate(dateDiner.getDate()+idx);const dateRestes=new Date(dateDiner);dateRestes.setDate(dateRestes.getDate()+1); budget += coutRecette(r) * profil.portionsParRecette / 4;
    const tps = (r.p || 0) + (r.c || 0);
    const long = tps > 60;
    const manque = (r.mat || []).filter(m => !profil.materiel.includes(m));
    const al = (globalThis.allergenesDe ? allergenesDe(r.ing) : {c:[],p:[]}), nomAl = id => (globalThis.ALLERGENES.find(a=>a.id===id)||{nom:id}).nom;
    const conflit = estExclue(r, profil.exclusions);
    return `<div class="carte repas ${conflit?"conflit":""}" data-id="${id}" style="--i:${idx}">
      <div class="visuel">${visuelPlat(r,idx)}${etiquettePlat(r)}</div>
      <div class="corps">
      <div class="repas-tete"><h2>${esc(r.n)}</h2>${anneauHtml(id)}</div>
      ${anneauPlat(id).court==="données disponibles" ? `<p class="statut-composition sr-only" id="stat-${id}">${esc(anneauPlat(id).titre)}</p>` : `<p class="note statut-composition" id="stat-${id}">${esc(anneauPlat(id).titre)}</p>`}
      ${conflit ? `<p class="alerte-carte" role="alert">Ne convient plus à tes choix : génère la semaine pour le remplacer.</p>` : ""}
      <div class="repliable masque" id="det-${id}">
      <p class="jour">${dateDiner.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})} · dîner</p>
      <p><button class="petit fav-detail" type="button" data-act="favori" data-recette="${id}" aria-pressed="${estFavori(id)}">${estFavori(id)?"★ Favori — retirer de mes favoris":"☆ Ajouter à mes favoris"}</button></p>
      <div class="puces-info"><span class="badge">${TYPE_LABEL[r.t] || r.t}</span>
      <span class="badge ${long?"long":""}">${tps} min</span><span class="badge">~${Math.round(nutrimentsRecette(r).t.kcal/4)} kcal/portion</span><span class="badge">~${eur(coutRecette(r)*profil.portionsParRecette/4)}</span></div>
      ${al.c.length ? `<p class="meta allerg">Contient : ${al.c.map(nomAl).join(", ")}</p>` : ""}
      <div class="meta">Prépa ${r.p} min · cuisson ${r.c} min · ${profil.portionsParRecette} portions au total · ${profil.portionsParRecette<profil.personnes.length?`Pas assez de portions pour un dîner complet de ${profil.personnes.length} personnes, sans compter les restes`:profil.portionsParRecette<2*profil.personnes.length?`Après un dîner de ${profil.personnes.length} portions, ${Math.max(0,profil.portionsParRecette-profil.personnes.length)} portion(s) restante(s) : pas assez pour le déjeuner de tout le foyer`:`restes : déjeuner du ${dateRestes.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})}`}</div>
      ${manque.length ? `<div class="alternatives">Matériel manquant : ${manque.map(m => m + " → alternative : " + (ALT_MATERIEL[m] || "adapter")).join(" ; ")}</div>` : ""}
      <div class="actions">
        <button class="petit" data-act="relancer" data-idx="${idx}">Remplacer ce plat</button>
      </div>
      <div class="detail">
        ${(al.c.length||al.p.length) ? `<p class="note"><strong>Allergènes (liste UE) :</strong> ${al.c.length?"contient "+al.c.map(nomAl).join(", "):"aucun certain"}${al.p.length?" · possible selon les marques (produits transformés, à vérifier sur l'étiquette) : "+al.p.map(nomAl).join(", "):""}. Traces et contamination croisée non couvertes.</p>` : `<p class="note">Aucun allergène UE identifié dans les ingrédients du catalogue (traces et produits industriels non vérifiables).</p>`}
        <h3>Ingrédients (${profil.portionsParRecette} portions)</h3>
        <ul>${r.ing.map(([k, g]) => { const ing = ING[k]; return ing ? `<li>${ing.nom} — ${esc(quantiteIngredient(k,g * profil.portionsParRecette / 4))}${ACHATS[k]?`<small class="note note-achat">${esc(noteAchat(k))}</small>`:""}</li>` : ""; }).join("")}</ul>
        <p class="note">~${eur(coutRecette(r)*profil.portionsParRecette/4)} pour la recette · ~${Math.round(nutrimentsRecette(r).t.kcal/4)} kcal/portion (estimation, données partielles possibles). Ces valeurs ne prouvent pas que ce plat convient à un besoin médical.</p><p class="note">Correspondances CIQUAL approximatives ou absentes (non chiffrées si absentes) : ${r.ing.filter(([k])=>ING[k].correspondance!=="directe").map(([k])=>esc(ING[k].nom)).join(", ")||"aucune signalée"}. Les calculs utilisent les poids comestibles. Quand un rendement est indiqué, le poids à acheter avec os ou coquilles est affiché séparément. Rendements estimés et pertes de cuisson non modélisées ; certains produits entiers du catalogue restent approximatifs.</p><h3>Préparation</h3>
        <ul>${(r.et || []).map(e => `<li>${esc(etapeAffichee(r,e))}</li>`).join("")}</ul>
      </div>
      </div>
      </div>
    </div>`;
  }).join("");
  const conflitsOrdre=conflitsVariete(plan);
  const avertissementVariete=conflitsOrdre.length?`<div class="carte" role="status"><h2>Varier les jours</h2><p>Deux plats de même famille se suivent dans cette semaine enregistrée. ${ordreSansConflitPossible(plan)?"Tu peux réorganiser les mêmes repas, sans changer les courses ni le bilan.":"Avec cette sélection, il est impossible de tous les espacer. Remplace un plat ou élargis tes choix ; aucun repas n'a été changé automatiquement."}</p><button class="petit" type="button" data-act="repartir">Réorganiser les mêmes repas</button></div>`:"";
  const noteVariete=`<details class="plus"><summary>Comment la semaine est composée</summary><ul class="note-liste"><li>Les plats d'une même famille (hachis et parmentiers, currys, soupes…) sont espacés d'un jour quand les choix le permettent.</li><li>Deux plats de même famille peuvent revenir plus tard dans la semaine.</li><li>Les déjeuners de restes restent prévus le lendemain.</li></ul></details>`;
  $("#vue-semaine").innerHTML = rendreHero() + avertissementVariete +
    `<div class="bandeau-budget"><span>Budget estimé des menus</span>
     <span class="montant ${budget > profil.budget ? "ko" : "ok"}">${eur(budget)}</span></div>` + noteVariete + `<div class="liste-repas${classeAnim}">` + cartes + `</div>` +
    `<div class="carte complements"><h2>Compléter les repas, pas seulement le plat</h2><p class="note">Facultatif : par portion, 150 g de fruit de saison, 125 g de yaourt nature, 10 g d'amandes ; restes déjà inclus. Exclus si produits laitiers ou fruits à coque cochés dans Allergies et exclusions.</p><button class="petit" id="toggleComplements">${complementsActifs()?"Retirer les compléments":"Ajouter ces compléments à la semaine"}</button>${complementsActifs()?`<p class="note">Inclus dans les courses, le coût et le bilan : ${[...new Set(complements().map(([k])=>ING[k].nom))].join(", ")}. Coût indicatif : ${eur(coutComplements())}. Le bilan reste partiel, surtout pour la vitamine D.</p>`:`<p class=note>Aucun ajout dans les courses ou le bilan tant que tu n’as pas choisi de les inclure. Coût supplémentaire indicatif : ${eur(coutComplements(true))}. ${budget+coutComplements(true)>profil.budget?"Attention : le total dépasserait le budget cible, même avec les prix indicatifs.":""}</p>`}</div><div class="carte ajout-plat"><h2>Ajouter un plat au menu</h2><p class="note"><strong>Remplacer</strong> un dîner prévu (la semaine reste à 7) ou <strong>ajouter un 8e repas</strong> quand tu reçois. Courses, coût et bilan suivent.</p><form id="formRepas" class="ajout"><label for="filtreRepas" class="sr-only">Chercher un plat</label><input id="filtreRepas" type="search" maxlength="40" placeholder="Chercher un plat (ex. curry, saumon)…" autocomplete="off"><label for="ajoutRepas" class="sr-only">Plat à ajouter</label><select id="ajoutRepas">${optionsRepas("")}</select><fieldset class="choix-ajout"><legend>Remplacer ou ajouter ?</legend><label class="choix"><input type="radio" name="modeAjout" value="remplacer" checked> Remplacer un dîner prévu</label><label class="choix-cible" for="cibleRemplacement"><span class="sr-only">Dîner à remplacer</span><select id="cibleRemplacement">${optionsRemplacement()}</select></label><label class="choix"><input type="radio" name="modeAjout" value="huitieme"> Ajouter un 8e repas (exception, quand tu reçois)</label></fieldset><button>Ajouter ce plat</button></form>${repasManuels().length ? `<div class="repas-plus"><h3>Repas en plus cette semaine</h3><p class="note">Chaque repas en plus est une recette entière de ${profil.portionsParRecette} portions : il s'ajoute aux 7 dîners dans les courses, le coût et le bilan.</p>${repasManuels().map((id,i)=>`<p class="ligne-repas-plus">${esc(RECETTE_PAR_ID[id].n)} <button class="petit" data-act="supprRepas" data-idx="${i}">Retirer le repas</button></p>`).join("")}</div>` : ""}</div><details class="plus"><summary>Hypothèses de l'app</summary><ul class="note-liste"><li>Saison favorisée pour ${REF.mois[mois - 1]} (France métropolitaine), sans exclusion stricte des autres saisons.</li><li>Prix indicatifs, pas des prix magasin ; 2 personnes par défaut.</li><li>Composition selon correspondances CIQUAL (états cru/cuit variables), pertes de cuisson non modélisées.</li><li>Budget : hypothèses indicatives, quantités utilisées, pas un panier magasin.</li></ul></details>` +
    `<div class="carte lisibilite"><p class="note lisibilite-ligne"><strong>Lisibilité</strong> — réglage gardé sur cet appareil : <button class="petit" type="button" data-act="tailleTexte" aria-describedby="tailleTexteEtat">${tailleTexte()===150?"Revenir à la taille normale":"Agrandir le texte"}</button> <span id="tailleTexteEtat" role="status">${libelleTailleTexte()}</span></p></div>`;
}

function bilanPlan() {
 const tot={}, absents={}; let manquants=0;
 for(const [cle] of NUTRIMENTS) {tot[cle]=0;absents[cle]=0;}
 for(const id of idsComplets()) {const n=nutrimentsRecette(RECETTE_PAR_ID[id]);manquants+=n.manquants;for(const [cle] of NUTRIMENTS){tot[cle]+=n.t[cle]*profil.portionsParRecette/4;absents[cle]+=n.absents[cle];}}
 if(complements().length){const n=nutrimentsRecette({ing:complements()});manquants+=n.manquants;for(const [cle]of NUTRIMENTS){tot[cle]+=n.t[cle];absents[cle]+=n.absents[cle];}}
 return {tot,absents,manquants};
}
function rendreBilan() {
  const echelle = profil.portionsParRecette / 4;
  const tot = {}; let manquants = 0;
  for (const [cle] of NUTRIMENTS) tot[cle] = 0;
  let viandeG = 0, charcG = 0, poissonOcc = 0, grasOcc = 0, legumOcc = 0, budget = 0;
  for (const id of idsComplets()) {
    const r = RECETTE_PAR_ID[id];
    const { t, manquants: m } = nutrimentsRecette(r);
    manquants += m;
    for (const [cle] of NUTRIMENTS) tot[cle] += t[cle] * echelle;
    viandeG += grammesParSemaine(r, VIANDE_ROUGE) * echelle / profil.personnes.length;
    charcG += grammesParSemaine(r, CHARCUTERIE) * echelle / profil.personnes.length;
    budget += coutRecette(r) * echelle;
    const parPers = profil.portionsParRecette / profil.personnes.length; // occasions de consommation par personne
    if (r.t === "poisson_maigre" || r.t === "poisson_gras") poissonOcc += parPers;
    if (r.t === "poisson_gras") grasOcc += parPers;
    if (r.t === "legumineuses" || r.t === "vege") legumOcc += parPers;
  }
  const avecComplements=bilanPlan();for(const [cle]of NUTRIMENTS)tot[cle]=avecComplements.tot[cle];manquants=avecComplements.manquants;budget+=coutComplements();
  const rnp = rnpHebdoFoyer();
  const legumesOcc = idsComplets().filter(id=>contientLegumineuses(RECETTE_PAR_ID[id])).length * profil.portionsParRecette / profil.personnes.length;
  const absents = bilanPlan().absents;
  const lignes = NUTRIMENTS.map(([cle, nom, unite, refCle]) => {
    const parPers = absents[cle] ? null : tot[cle] / profil.personnes.length;
    const pct = refCle && parPers !== null ? Math.round(parPers / rnp[refCle] * 100) : null;
    return `<tr><td>${nom}${absents[cle]?`<small class="incomplet">Non calculable : ${absents[cle]} valeur(s) absente(s)</small>`:""}</td><td>${parPers===null?"non calculable":fmt(parPers, unite)}</td><td>${pct===null?"":`<div class="barre"><i style="width:${Math.min(pct,100)}%"></i></div>`}</td><td>${pct===null?"Sans repère unique":pct+" %"}</td></tr>`;
  }).join("");
  const bas = NUTRIMENTS.filter(([cle,,,refCle])=>refCle && !absents[cle] && tot[cle]/profil.personnes.length/rnp[refCle]<0.5).map(([,nom])=>nom);
  const repere = (ok, txt) => `<li class="${ok ? "ok" : "ko"}">${ok ? "✓" : "✗"} ${txt}</li>`;
  $("#vue-bilan").innerHTML = `<div class="carte">
    <h2>Bilan de la semaine (repas planifiés)</h2>
    <p class="note perimetre"><strong>Bilan partiel</strong> : dîners et restes au déjeuner uniquement — ${idsComplets().length * profil.portionsParRecette / profil.personnes.length} portions/personne, ajouts inclus. ${complementsActifs()?"Fruits, yaourts et amandes sélectionnés inclus.":"Fruits et laitages hors plats non inclus sans sélection des compléments."} ${profil.portionsParRecette<2*profil.personnes.length?"Les portions choisies ne suffisent pas à un dîner et un déjeuner complet par personne ; les apports suivent les quantités prévues.":""}</p>
    <details class="plus"><summary>À lire avant d'utiliser ce bilan</summary><ul>
      <li><strong>Lecture des % :</strong> part du repère hebdomadaire complet (7 jours) ; 100 % n'est pas l'objectif. Autres repas non mesurés : ni apport total ni conclusion de carence évaluables ici. Données manquantes jamais comptées à zéro.</li>
      <li><strong>Données absentes :</strong> ${manquants} valeur(s) nutriment absente(s) de la table CIQUAL pour ces ingrédients : non comptées, jamais estimées à 0. Un bilan incomplet ne permet pas de conclure à une carence.</li>
      <li><strong>Approximations :</strong> certains ingrédients sont approchés par un aliment voisin (le détail des plats le signale), états cru/cuit variables. Cellules « traces » ou « &lt; X » de la base CIQUAL 2020 estimées (moitié de borne ou zéro, convention documentée dans SOURCES.md) sans distinction visuelle. Biais connu : pertes de cuisson non modélisées — calories des viandes grillées ou rôties et vitamines C et B9 plutôt surestimées.</li>
      <li><strong>Repères :</strong> références ANSES adultes moyennes (profil type, pas un avis médical). Fer : hypothèse femme à pertes menstruelles élevées (16 mg/j), pas une valeur universelle.</li>
    </ul></details>
    ${bas.length?`<p class="note-info"><strong>${bas.join(", ")}</strong> : sous la moitié du repère hebdo complet, sur ces seuls repas.</p>`:`<p class="note">Aucun nutriment sous 50 % du repère hebdo complet sur ces repas.</p>`}
    <div class="table-wrap"><table><caption class="cadre-pct">% calculés sur ces seuls repas mesurés, contre le repère hebdo complet — 100 % n'est pas l'objectif.</caption><tr><th>Nutriment</th><th>Par personne / semaine</th><th></th><th>% repère hebdo complet</th></tr>${lignes}</table></div>
    <p class="note">Vitamine E : repères actualisés 10 mg/j homme / 9 mg/j femme (ANSES). Cela change le dénominateur, pas les apports du menu.</p>
    </div>
    <div class="carte"><details class="plus"><summary>Repères PNNS pour toute la journée</summary><p class="note">Repères adultes pour l’ensemble de la journée, pas seulement les dîners. L’app ne mesure pas encore toutes ces familles en portions standard.</p><ul class="pyramide"><li><strong>À augmenter :</strong> fruits et légumes (au moins 5 portions/jour), légumes secs (au moins 2 fois/semaine), petite poignée de fruits à coque non salés.</li><li><strong>À privilégier :</strong> féculents complets au moins une fois/jour, huiles de colza, noix et olive.</li><li><strong>À alterner :</strong> poisson 2 fois/semaine dont un gras ; produits laitiers 2 fois/jour.</li><li><strong>À limiter :</strong> viande hors volaille à 500 g/semaine et charcuterie à 150 g/semaine, produits très sucrés ou salés. L’eau est la boisson de référence.</li></ul></details></div>
    <div class="carte reperes"><h2>Repères PNNS de la semaine</h2><ul>
      ${repere(poissonOcc >= 2, `Poisson : ${idsComplets().filter(id=>RECETTE_PAR_ID[id].t.startsWith("poisson")).length} recette(s) cette semaine = ${poissonOcc} occasion(s)/personne avec les restes (repère : 2, dont 1 gras — ${grasOcc} occasion(s) gras)`)}
      ${repere(legumesOcc >= 2, `Légumineuses : ${legumesOcc} occasion(s)/personne (plat contenant au moins 100 g pour la recette de base ; repère : au moins 2/semaine)`)}
      ${repere(legumOcc >= 2, `Plats légumineuses ou végétariens (ce n’est pas le repère légumineuses seul) : ${idsComplets().filter(id=>["legumineuses","vege"].includes(RECETTE_PAR_ID[id].t)).length} recette(s) = ${legumOcc} occasion(s)/personne (repère : 2)`)}
      ${repere(viandeG <= REF.reperes.viandeRouge_g_max_par_semaine, `Viande rouge (hors volaille) : ${Math.round(viandeG)} g/personne (max ${REF.reperes.viandeRouge_g_max_par_semaine} g)`)}
      ${repere(charcG <= REF.reperes.charcuterie_g_max_par_semaine, `Charcuterie : ${Math.round(charcG)} g/personne (max ${REF.reperes.charcuterie_g_max_par_semaine} g)`)}
      ${repere(budget <= profil.budget, `Budget estimé : ${eur(budget)} (cible ${eur(profil.budget)})`)}
    </ul>
    <p class="note">Les occasions sont des portions par personne : 4 portions pour 2 = 1 dîner et 1 déjeuner. Catégorie végétarienne ≠ présence garantie de légumineuses. Un bilan incomplet ne permet pas de conclure à une carence. Aucun complément alimentaire conseillé automatiquement.</p></div>` + carteBilanV5();
}

const RAYON_ORDRE = ["fruits_legumes", "boucherie", "poissonnerie", "charcuterie", "cremerie", "boulangerie", "feculents", "epicerie"];
const RAYON_NOMS = { fruits_legumes: "Fruits et légumes", boucherie: "Boucherie / volaille", poissonnerie: "Poissonnerie",
  charcuterie: "Charcuterie", cremerie: "Crèmerie", boulangerie: "Boulangerie", feculents: "Féculents", epicerie: "Épicerie", manuel: "Ajouts manuels" };
/* Frontière de données de l'appli : la liste de courses en données structurées (version 1).
   C'est le format qu'un futur connecteur pourrait consommer. Ce n'est ni une API HTTP ni une
   intégration à un marchand : aucune donnée ne quitte le navigateur, rien n'est envoyé nulle part. */
function listeCoursesStructuree(restantSeulement) {
  const agg = listeCourses();
  const coches = restantSeulement ? cochesCourses() : [];
  const articles = [];
  for (const [k, v] of Object.entries(agg)) {
    if (coches.includes(k)) continue;
    const a = ACHATS[k];
    articles.push({
      id: k,
      nom: v.nom,
      rayon: v.rayon,
      rayonNom: RAYON_NOMS[v.rayon] || v.rayon,
      grammesNet: v.g,
      grammesAchat: a ? v.g / a.rendement : v.g
    });
  }
  const manuels = coursesManuelles();
  const jj = n => String(n).padStart(2, "0");
  return {
    version: 1,
    semaine: `${semaine.getFullYear()}-${jj(semaine.getMonth() + 1)}-${jj(semaine.getDate())}`,
    portionsParRecette: profil.portionsParRecette,
    restantSeulement: !!restantSeulement,
    articles,
    ajoutsManuels: manuels,
    nombreArticles: articles.length + manuels.length
  };
}
function texteListeCourses(restantSeulement) {
  const s = listeCoursesStructuree(restantSeulement);
  const parRayon = {};
  for (const art of s.articles) (parRayon[art.rayon] = parRayon[art.rayon] || []).push(art);
  const lignes = [`Liste de courses - semaine du ${semaine.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`, ""];
  for (const r of RAYON_ORDRE) {
    if (!parRayon[r]) continue;
    lignes.push(RAYON_NOMS[r]);
    for (const art of parRayon[r].sort((x, y) => x.nom.localeCompare(y.nom))) lignes.push(`- ${poidsTexte(art.grammesAchat)} ${art.nom}`);
    lignes.push("");
  }
  if (s.ajoutsManuels.length) { lignes.push(RAYON_NOMS.manuel); for (const m of s.ajoutsManuels) lignes.push("- " + m); lignes.push(""); }
  if (!s.nombreArticles) lignes.push("(aucun article restant : tout est coché)");
  return { texte: lignes.join("\n").trim(), articles: s.nombreArticles };
}
function copieRepli(txt) {
  try {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch (e) { return false; }
}
function copierTexte(txt, cb) {
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(() => cb(true), () => cb(copieRepli(txt)));
  } else cb(copieRepli(txt));
}
function partageDisponible() { return typeof navigator !== "undefined" && typeof navigator.share === "function"; }

function rendreCourses() {
  const agg = listeCourses();
  const rayons = {};
  let total = 0;
  for (const [k, v] of Object.entries(agg)) {
    (rayons[v.rayon] = rayons[v.rayon] || []).push([k, v]);
    total += v.prix;
  }
  const coches = cochesCourses();
  const ordre = RAYON_ORDRE;
  const noms = RAYON_NOMS;
  let html = "";
  for (const r of ordre) {
    if (!rayons[r]) continue;
    html += `<h3 class="rayon-titre">${noms[r]}</h3>` + rayons[r].sort((a, b) => a[1].nom.localeCompare(b[1].nom))
      .map(([k, v]) => `<div class="ligne-course ${coches.includes(k)?"barree":""}" data-cle="${k}"><label><input type="checkbox" data-course="${k}" ${coches.includes(k)?"checked":""}> ${v.nom}</label><span class="qte">${esc(quantiteIngredient(k,v.g))} · ~${eur(v.prix)}${ACHATS[k]?`<small class="note note-achat">${esc(noteAchat(k))}</small>`:""}</span></div>`).join("");
  }
  const manuels = coursesManuelles();
  if (manuels.length) html += `<h3 class="rayon-titre">${noms.manuel}</h3>` + manuels.map((m, i) =>
    `<div class="ligne-course"><span>${esc(m)}</span><button class="petit" data-act="supprManuel" data-idx="${i}">Retirer</button></div>`).join("");
  $("#vue-courses").innerHTML = `<div class="carte">
    <h2>Liste de courses — semaine du ${semaine.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</h2>
    <p class="note">Quantités pour ${profil.portionsParRecette} portions par recette.</p>
    <div class="export-courses">
      <button class="petit" type="button" data-act="copierListe">Copier la liste</button>
      ${partageDisponible() ? `<button class="petit" type="button" data-act="partagerListe">Partager</button>` : ""}
      <p class="note statut" id="statutExport" role="status">Seuls les articles non cochés sont exportés, prêts à coller dans une appli de courses ou un message.</p>
      <textarea id="zoneRepli" class="zone-repli" rows="8" readonly hidden aria-label="Texte de la liste affiché quand la copie automatique est refusée"></textarea>
    </div>
    <details class="plus"><summary>Hypothèses de la liste</summary><ul><li>Nouvelle liste chaque semaine (les anciennes restent consultables), regroupée par rayon.</li><li>Produits avec os ou coquilles : le poids d’achat estimé est distingué de la chair utilisée au bilan.</li><li>Prix : hypothèses indicatives, pas relevés en magasin ; les conditionnements réels peuvent faire varier le total.</li></ul></details>
    ${html}
    <p class="total-courses">Total estimé des menus et compléments choisis : ${eur(total)}<br><small class="note">Articles manuels non chiffrés et hors bilan nutritionnel.</small></p>
    <form class="ajout" id="formAjout"><label class="sr-only" for="ajoutTxt">Article manuel</label><input id="ajoutTxt" maxlength="200" placeholder="Ajouter un article (ex. café, papier cuisson)…" required><button>Ajouter</button></form>
  </div>`;
  $("#formAjout").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("#ajoutTxt").value.trim(); if (!v || coursesManuelles().length>=100) return;
    const l = coursesManuelles(); l.push(v); sauverCoursesManuelles(l); rendreCourses();
  });
}

function rendreProfil() {
  const materiels = ["four", "poele", "casserole", "cocotte", "sauteuse", "wok", "mixeur", "cuit_vapeur", "gril", "plancha", "saladier", "raclette"];
  $("#vue-profil").innerHTML = `<div class="carte">
    <h2>Foyer</h2>
    <p class="note">Réglages gardés sur cet appareil, sans compte. Allergies et aliments à éviter : onglet Semaine, avant de générer.</p>
    <div class="champ"><label for="nbPers">Nombre de personnes</label>
      <input type="number" id="nbPers" min="1" max="8" value="${profil.personnes.length}"></div>
    <div class="champ"><label for="nbPortions">Portions cuisinées par recette (dîner + restes)</label>
      <input type="number" id="nbPortions" min="2" max="12" value="${profil.portionsParRecette}"></div>
    <p class="note">Pour ${profil.personnes.length} personnes, un dîner et un déjeuner de restes demandent ${2*profil.personnes.length} portions par recette. ${profil.portionsParRecette<2*profil.personnes.length?`Avec ${profil.portionsParRecette} portions choisies, les restes ne couvrent pas un déjeuner complet pour tout le foyer ; les quantités ne sont pas augmentées automatiquement.`:"Les quantités suivent ce réglage."}</p>
    <div class="champ"><label for="budget">Budget cible des 7 dîners (€)</label>
      <input type="number" id="budget" min="20" max="300" value="${profil.budget}"></div>
    <div class="champ"><label>Matériel de cuisine disponible</label><div class="coches" id="cochesMat">
      ${materiels.map(m => `<label><input type="checkbox" value="${m}" ${profil.materiel.includes(m) ? "checked" : ""}> ${m === "raclette" ? "appareil à raclette" : m.replace("_", " ")}</label>`).join("")}</div></div>
    <details class="plus"><summary>Profils types et limites du modèle</summary><p class="note">Les profils types alternent homme 70 kg / femme 60 kg ; leur moyenne ne représente pas les besoins personnels du foyer (âge, grossesse, santé non pris en compte). Les repères du Bilan précisent leurs propres hypothèses.</p></details>
    <button class="petit" id="sauverProfil">Enregistrer les réglages</button>
    <p class="note">Plats et coches de courses conservés ; change les repas via Semaine. Portions modifiées : vérifie les articles déjà cochés.</p>
    <p class="note" id="statutProfil" role="status" aria-live="polite"></p>
  </div>`;
  $("#sauverProfil").addEventListener("click", () => {
    const portionsAvant=profil.portionsParRecette;
    const n = entier($("#nbPers").value || 2,1,8,2);
    const pers = [];
    for (let i = 0; i < n; i++) pers.push({ sexe: i % 2 ? "femme" : "homme", poids: i % 2 ? 60 : 70 });
    profil.personnes = pers;
    profil.portionsParRecette = entier($("#nbPortions").value || 4,2,12,4);
    profil.budget = entier($("#budget").value || 80,20,300,80);
    profil.materiel = [...document.querySelectorAll("#cochesMat input:checked")].map(c => c.value);
    const enregistre=sauverProfil(profil);
    // Enregistrer le foyer ne remplace jamais ses repas, ajouts ou coches.
    // Les portions changent les quantités calculées, pas les plats choisis.
    const quantitesChangees=portionsAvant!==profil.portionsParRecette;
    messageGen=(enregistre?"Réglages enregistrés : mêmes repas conservés.":"Réglages appliqués pour cette session, mais non enregistrés : stockage local indisponible. Ils peuvent être perdus au rechargement. Mêmes repas conservés.")+(quantitesChangees?" Quantités recalculées : vérifie les articles déjà cochés dans les courses.":"");
    rendreTout();
    $("#statutProfil").textContent=messageGen;
    activerVue("profil");
  });
}

/* ---------- Exclusions poisson (type, pas ingrédient) ---------- */
const norm = t => String(t).replace(/œ/g,"oe").replace(/Œ/g,"oe").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
/* Un mot saisi correspond à un MOT entier d'un ingrédient (pluriel accepté), jamais à un morceau de mot : « oeuf » ne touche pas « bœuf », « lait » ne touche pas « laitue ». */
function motCorrespond(m, k) {
 const mots = norm(m).trim().split(/[^a-z0-9]+/).filter(Boolean); if (!mots.length || norm(m).trim().length < 3) return false;
 const jetons = [...norm(ING[k]?.nom || "").split(/[^a-z0-9]+/), ...k.split("_")].filter(Boolean);
 return mots.every(w => jetons.some(t => t === w || t === w + "s" || t === w + "x" || w === t + "s"));
}
function estExclue(r, exclusions) {
 return exclusions.some(p => {
  if (typeof p !== "string") return false;
  if (p.startsWith("allergen:")) { // allergie : prudence maximale, si la table des allergènes manque on exclut tout
   const AD = globalThis.allergenesDe; if (typeof AD !== "function") return true;
   const x = AD(r.ing), id = p.slice(9); return x.c.includes(id) || x.p.includes(id);
  }
  if (p.startsWith("evite:")) {
   const e = (globalThis.EVITE || []).find(e => e.id === p.slice(6)); if (!e) return false;
   return r.ing.some(([k]) => e.re.test(k)) || (p === "evite:poisson_gout" && String(r.t).startsWith("poisson"));
  }
  if (p.startsWith("mot:")) return r.ing.some(([k]) => motCorrespond(p.slice(4), k));
  // ancien format : on compare des clés entières ou des préfixes de mot (jamais une sous-chaîne : « oeuf » ne doit pas toucher « boeuf »)
  return r.ing.some(([k]) => p === "poisson" ? (String(r.t).startsWith("poisson") || (ING[k].rayon==="poissonnerie" && !/^(crabe|crevette|encornet|moule|poulpe|seiche)/.test(k))) : p.split("|").some(x=>k===x||k.startsWith(x+"_")));
 });
}
// Toutes saisons volontairement : la saisonnalité est favorisée dans scorePlan (bonus
// souple par recette du mois), sans exclusion stricte — libellé affiché : « saison
// favorisée, sans exclusion stricte ». (D6, contre-audit APP v2 : variable morte retirée.)
poolDuMois = function(mois, exclusions) {
 return RECETTES.filter(r=>!estExclue(r,exclusions));
};

/* ---------- Interactions ---------- */
function activerVue(nom) {
 document.querySelectorAll(".onglets button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.vue===nom)));
  document.querySelectorAll(".onglets button").forEach(b => b.classList.toggle("actif", b.dataset.vue === nom));
  document.querySelectorAll(".vue").forEach(v => v.classList.toggle("actif", v.id === "vue-" + nom));
}
document.querySelectorAll(".onglets button").forEach(b => b.addEventListener("click", () => activerVue(b.dataset.vue)));
$("#semPrec").addEventListener("click", () => { semaine.setDate(semaine.getDate() - 7); plan = chargerPlan(); messageGen = ""; animer = true; rendreTout(); });
$("#semSuiv").addEventListener("click", () => { semaine.setDate(semaine.getDate() + 7); plan = chargerPlan(); messageGen = ""; animer = true; rendreTout(); });
document.addEventListener("change", e=>{const k=e.target.dataset?.course;if(!k||!ING[k])return;const x=new Set(cochesCourses());if(e.target.checked)x.add(k);else x.delete(k);stockage.setItem("ns_coches_"+cleSemaine(),JSON.stringify([...x]));e.target.closest(".ligne-course").classList.toggle("barree",e.target.checked);});
document.addEventListener("change", e => {
  const v = e.target.dataset?.exc; if (!v) return;
  const l = profil.exclusions.filter(x => x !== v); if (e.target.checked) l.push(v);
  profil.exclusions = l; sauverProfil(profil); panelOuvert = true; messageGen = ""; focusApres = `[data-exc="${v}"]`; rendreTout();
});
document.addEventListener("submit", e => {
  if (e.target.id !== "formMot") return; e.preventDefault();
  const v = norm($("#motEvite").value).trim().replace(/[^a-z0-9 ]/g, "");
  if (v.length < 3) return;
  if (!Object.keys(ING).some(k => motCorrespond(v, k))) { messageGen = "Aucun ingrédient du catalogue ne correspond à « " + v + " »."; panelOuvert = true; focusApres = "#motEvite"; rendreTout(); return; }
  const mots = profil.exclusions.filter(x => x.startsWith("mot:"));
  if (!profil.exclusions.includes("mot:" + v) && mots.length < MAX_MOTS) profil.exclusions = [...profil.exclusions, "mot:" + v];
  sauverProfil(profil); panelOuvert = true; messageGen = ""; focusApres = "#motEvite"; rendreTout();
});
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  if (b.dataset.act === "generer") generer();
  if (b.dataset.act === "repartir") {
   const nouveau=repartirPlats(plan);memoriserPlan();plan=nouveau;
   stockage.setItem("ns_plan_"+cleSemaine(),JSON.stringify(plan));
   messageGen=conflitsVariete(plan).length?"Ordre amélioré, mais certains plats restent proches : remplace un plat ou élargis tes choix.":"Mêmes repas réorganisés : courses, quantités et bilan inchangés. Les dates des dîners et des restes suivent ce nouvel ordre.";
   animer=true;rendreTout();
  }
  if (b.dataset.act === "annuler") { const p = planPrecedent(); if (p) { const cur = plan; plan = p; stockage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan)); stockage.setItem("ns_plan_prev_" + cleSemaine(), JSON.stringify(cur)); resetCoches(); messageGen = "Menu précédent rétabli (tu peux ré-annuler pour revenir)."; animer = true; rendreTout(); } }
  if (b.dataset.act === "ouvrirFiltres") { panelOuvert = !panelOuvert; rendreTout(); }
  if (b.dataset.act === "retireMot") { profil.exclusions = profil.exclusions.filter(x => x !== b.dataset.mot); sauverProfil(profil); panelOuvert = true; messageGen = ""; rendreTout(); }
  if (b.dataset.act === "favori") {
    const id=b.dataset.recette; basculerFavori(id); rendreTout();
    const carte=document.querySelector(`.carte.repas[data-id="${id}"]`);
    if(carte){ const detail=carte.querySelector('[data-act="detail"]'); if(detail.getAttribute("aria-expanded")==="false")detail.click(); carte.querySelector('[data-act="favori"]').focus(); }
    return;
  }
  if (b.dataset.act === "detail") { const d = b.closest(".carte").querySelector(".repliable"); d.classList.toggle("masque"); const ouvert = !d.classList.contains("masque"); b.setAttribute("aria-expanded", String(ouvert)); b.setAttribute("aria-label", (ouvert ? "Masquer : " : "Détails : ") + (b.dataset.nom || "")); b.textContent = ouvert ? "−" : "+"; }
  if (b.dataset.act === "relancer") {
    resetCoches(); memoriserPlan();
    const avant=plan.join();
    plan = relancerRepas(plan, +b.dataset.idx, moisSemaine(), hashStr(cleSemaine() + ":" + Date.now()));
    stockage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
    messageGen = plan.join()===avant?"Aucun autre plat compatible ne peut être placé ici sans ressembler au dîner voisin. Réorganise les repas ou élargis tes choix.":""; rendreTout();
  }
  if (b.dataset.act === "supprRepas") { resetCoches(); const l=repasManuels(); l.splice(+b.dataset.idx,1); stockage.setItem("ns_repas_"+cleSemaine(),JSON.stringify(l)); rendreTout(); }
  if (b.dataset.act === "tailleTexte") { cycleTailleTexte(); focusApres = '[data-act="tailleTexte"]'; rendreTout(); }
  if (b.dataset.act === "supprManuel") {
    const l = coursesManuelles(); l.splice(+b.dataset.idx, 1); sauverCoursesManuelles(l); rendreCourses();
  }
  if (b.dataset.act === "copierListe") {
    const res = texteListeCourses(true);
    const s = $("#statutExport");
    const zone = $("#zoneRepli");
    if (!res.articles) {
      if (s) s.textContent = "Tout est déjà coché : rien à copier.";
      if (zone) zone.hidden = true;
      return;
    }
    copierTexte(res.texte, ok => {
      if (!s) return;
      if (ok) {
        if (zone) zone.hidden = true;
        // Retour visuel immédiat sur le bouton lui-même (feedback < 300 ms, Doherty).
        if (!b.dataset.label) b.dataset.label = b.textContent;
        b.textContent = "Copié ✓";
        b.classList.add("retour-ok");
        setTimeout(() => { if (b.isConnected) { b.textContent = b.dataset.label; b.classList.remove("retour-ok"); } }, 1600);
        s.textContent = `Liste copiée : ${res.articles} article${res.articles > 1 ? "s" : ""} à acheter (les articles cochés ne sont pas inclus). Tu peux la coller où tu veux.`;
      } else {
        if (zone) { zone.value = res.texte; zone.hidden = false; zone.focus(); zone.select(); }
        s.textContent = "La copie automatique est refusée par ce navigateur. Le texte de la liste est affiché et sélectionné ci-dessous : copie-le manuellement.";
      }
    });
  }
  if (b.dataset.act === "partagerListe") {
    const res = texteListeCourses(true);
    if (partageDisponible()) navigator.share({ title: "Liste de courses", text: res.texte }).catch(() => {});
  }
});
function rendreTout() {
 rendreSemaine(); rendreBilan(); rendreCourses(); rendreProfil();
 const total=idsComplets().reduce((t,id)=>t+coutRecette(RECETTE_PAR_ID[id])*profil.portionsParRecette/4,0)+coutComplements();
 $(".montant").textContent=eur(total);$(".montant").classList.toggle("ko",total>profil.budget);$(".montant").classList.toggle("ok",total<=profil.budget);
 $("#toggleComplements").addEventListener("click",()=>{stockage.setItem("ns_complements_"+cleSemaine(),complementsActifs()?"non":"oui");resetCoches();rendreTout();});
 $("#formRepas").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("#ajoutRepas").value;if(!RECETTE_PAR_ID[id])return;
  const nom=RECETTE_PAR_ID[id].n;
  const mode=(document.querySelector("input[name=modeAjout]:checked")||{}).value||"remplacer";
  if(mode==="huitieme"){
   if(repasManuels().length>=40)return;
   resetCoches();const l=repasManuels();l.push(id);
   stockage.setItem("ns_repas_"+cleSemaine(),JSON.stringify(l));
   messageGen=`« ${nom} » ajouté en 8e repas : il s'ajoute aux 7 dîners dans les courses, le coût et le bilan.`;
   rendreTout();return;
  }
  const idx=+($("#cibleRemplacement").value||0);
  if(!Number.isInteger(idx)||idx<0||idx>=plan.length)return;
  if(plan[idx]===id){messageGen=`« ${nom} » est déjà le dîner prévu ce jour-là.`;rendreTout();return;}
  if(plan.includes(id)){messageGen=`« ${nom} » est déjà prévu un autre jour cette semaine. Pour le servir deux fois, ajoute-le en 8e repas.`;rendreTout();return;}
  if(!remplacementVarie(plan,idx,id)){messageGen="Ce plat ressemble trop au dîner de la veille ou du lendemain (par exemple deux hachis ou parmentiers). Choisis un autre jour ou un autre plat.";rendreTout();return;}
  resetCoches();memoriserPlan();
  const ancien=RECETTE_PAR_ID[plan[idx]].n;
  plan=plan.slice();plan[idx]=id;
  stockage.setItem("ns_plan_"+cleSemaine(),JSON.stringify(plan));
  const d=new Date(semaine);d.setDate(d.getDate()+idx);
  messageGen=`« ${nom} » remplace « ${ancien} » au dîner du ${d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})}. Courses et bilan mis à jour (le bouton Annuler permet de revenir en arrière).`;
  rendreTout();
 });
 document.querySelectorAll(".sante-cb").forEach(cb => cb.addEventListener("change", () => {
  const v = cb.dataset.sante;
  profil.sante = cb.checked ? [...new Set([...profil.sante, v])] : profil.sante.filter(x => x !== v);
  sauverProfil(profil); focusApres = `[data-sante="${v}"]`; rendreTout();
 }));
 if (focusApres) { const f = document.querySelector(focusApres); focusApres = ""; if (f && f.focus) f.focus(); }
 if(!stockageDisponible) $("#vue-semaine").innerHTML = '<p role="alert" class="alternatives">Stockage local indisponible : tes changements peuvent être perdus à la fermeture.</p>'+$("#vue-semaine").innerHTML;
}
appliquerTailleTexte();

/* ============ Équilibre v5 (port du moteur hebdomadaire audité) ============
   Règles d'honnêteté héritées du moteur Python :
   - un trou de données => "non calculable", jamais une somme partielle numérique ;
   - un non-calculable n'est jamais une preuve d'infaisabilité ;
   - aucun seuil santé ou quota clinique ne pilote cette interface. */
const FAV_BONUS = 15, FAV_CAP = 4; // bonus borné anti-monopolisation (hypothèse de conception)
const CHAMPS_V5 = ["kcal","prot","gluc","sucres","lip","ags","fibres","sel"];

function nutrimentsV5Recette(r) {
  const t = {}; for (const c of CHAMPS_V5) t[c] = 0;
  let trou = false;
  for (const [k, g] of r.ing) {
    const ing = ING[k]; if (!ing) { for (const c of CHAMPS_V5) t[c]=null; trou = true; continue; }
    for (const c of CHAMPS_V5) {
      if (t[c] === null) continue;
      const v = ing[c];
      if (v === null || v === undefined) { t[c] = null; trou = true; }
      else t[c] += v * g / 100;
    }
  }
  return t; // null = non calculable (au moins un ingrédient sans donnée)
}
function recetteClassifiable(r) { const n = nutrimentsV5Recette(r); return CHAMPS_V5.every(c => n[c] !== null); }

function favoris() {
  let l; try { l = JSON.parse(stockage.getItem("ns_favoris") || "[]"); } catch { l = []; }
  return Array.isArray(l) ? [...new Set(l.filter(id => typeof id === "string" && RECETTE_PAR_ID[id]))].slice(0, 300) : [];
}
function estFavori(id) { return favoris().includes(id); }
function basculerFavori(id) {
  if (!RECETTE_PAR_ID[id]) return;
  let l = favoris();
  l = l.includes(id) ? l.filter(x => x !== id) : [...l, id];
  stockage.setItem("ns_favoris", JSON.stringify(l)); // local uniquement, réversible
}

/* Statut des données seulement. Aucun feu santé sans règle scientifiquement justifiée. */
function anneauPlat(id) {
  const r = RECETTE_PAR_ID[id]; if (!r) return null;
  const n = nutrimentsV5Recette(r);
  const absents = CHAMPS_V5.filter(c => n[c] === null);
  return {classe:"neutre", court:absents.length ? "données incomplètes" : "données disponibles",
    titre: absents.length ? "Composition incomplète : " + absents.join(", ") + ". Aucun avis médical." : "Valeurs de composition disponibles. Cela ne prouve pas que ce plat convient à un besoin médical."};
}
function anneauHtml(id) {
  const a = anneauPlat(id); if (!a) return "";
  return `<span class="anneau anneau-${a.classe}"><button class="btn-plus" type="button" data-act="detail" data-nom="${esc(RECETTE_PAR_ID[id].n)}" aria-expanded="false" aria-controls="det-${id}" aria-describedby="stat-${id}" aria-label="Détails : ${esc(RECETTE_PAR_ID[id].n)}">+</button></span>`;
}

function platV5(r) {
  const n = nutrimentsV5Recette(r);
  const p = { id: r.i, t: r.t, legum: contientLegumineuses(r) };
  for (const c of CHAMPS_V5) p[c] = n[c] === null ? null : n[c] / 4; // par portion, comme le moteur audité
  p.alcool = 0; p.veg_g = null; p.ags_e = null; // veg_g non suivi par l'app : moyenne légumes non calculable, affichée comme telle
  return p;
}
function carteBilanV5() {
  if (typeof EQUILIBRE === "undefined") return "";
  const recettes = idsComplets().map(id => RECETTE_PAR_ID[id]);
  if (!recettes.length) return "";
  const plats = recettes.map(platV5);
  const calculables = plats.filter(p => CHAMPS_V5.every(c => p[c] !== null)).length;
  const d = EQUILIBRE.displayStats(EQUILIBRE.weekStats(plats));
  const ligne = (lbl, v, unit) => `<li>${lbl} : ${v === null ? "<strong>non calculable</strong> (composition incomplète)" : "~" + v + " " + unit + " <small>(estimation, cru/cuit non résolu)</small>"}</li>`;
  const details = profil.sante.includes("dt1") ? `<h3>Composition par portion prévue</h3><ul>${plats.map((p,i) => `<li>${esc(recettes[i].n)} : glucides ${p.gluc===null?"—":"~"+fmt(p.gluc,"g")} ; sucres ${p.sucres===null?"—":"~"+fmt(p.sucres,"g")} ; graisses saturées ${p.ags===null?"—":"~"+fmt(p.ags,"g")} <small>(estimation cru/cuit)</small></li>`).join("")}</ul><p class="note">« — » signifie non calculable. Ces estimations ne servent pas à doser un traitement. Peu de sucres ne signifie pas peu de glucides, ni une réponse glycémique favorable. Consulte les étiquettes et ton équipe soignante.</p>` : "";
  return `<div class="carte bilan-v5"><h2>Composition moyenne des plats</h2>
    <p class="note"><strong>Toutes les valeurs ci-dessous sont des estimations</strong> : compositions déclarées par portion de plat, états cru/cuit et rendements non résolus, pertes de cuisson non modélisées. Pas par journée, pas pour l'ensemble de l'alimentation. Les restes correspondent à d'autres portions du même plat. Les compléments facultatifs sont comptés dans le bilan complet ci-dessus, pas dans cette moyenne des plats.</p>
    <ul>${ligne("Énergie",d.kcal_mean,"kcal/portion")}${ligne("Graisses saturées",d.ags_e_ratio,"% de l'énergie des plats")}${ligne("Fibres",d.fibres_mean,"g/portion")}${ligne("Sel",d.sel_mean,"g/portion")}</ul>
    <p class="note">${calculables} plat(s) sur ${recettes.length} avec les huit valeurs de composition disponibles. Aucune somme partielle ne remplace une valeur non calculable. Les états cru/cuit et les correspondances entre ingrédients et aliments de référence restent des sources d'incertitude. Aucun seuil médical ni classement santé n'est appliqué ici.</p>${details}</div>`;
}

if(typeof module!=="undefined" && module.exports) module.exports={familleVoisine,platsProches,conflitsVariete,ordreSansConflitPossible,repartirPlats,remplacementVarie,etapeAffichee,formeCulinaire,famillePlat,complements,coutComplements,contientLegumineuses,RECETTES,ING,scorePlan,genererPlan,relancerRepas,listeCourses,listeCoursesStructuree,texteListeCourses,cochesCourses,nutrimentsRecette,bilanPlan,rnpHebdoFoyer,estExclue,poolDuMois,lundiDe,isoSemaine,cleSemaine,idsComplets,coursesManuelles,repasManuels,chargerPlan,chargerProfil,rendreTout,activerVue,tailleTexte,cycleTailleTexte,libelleTailleTexte,getProfil:()=>profil,setProfil:p=>{profil=p;},getPlan:()=>plan,setPlan:p=>{plan=p;},setSemaine:d=>{semaine=lundiDe(d);},nutrimentsV5Recette,recetteClassifiable,favoris,estFavori,basculerFavori,anneauPlat,anneauHtml,carteBilanV5,FAV_BONUS,FAV_CAP};
rendreTout();
if (typeof navigator!=="undefined" && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
