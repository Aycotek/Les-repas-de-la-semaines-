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
  ["vitA", "Vitamine A", "µg", null], ["betaCarotene", "Bêta-carotène", "µg", null], ["phosphore", "Phosphore", "mg", null], ["omega3", "Oméga-3 ALA", "g", null], ["epa", "EPA", "g", null], ["dha", "DHA", "g", null], ["vitB1", "Vitamine B1", "mg", "vitamineB1_mg"], ["vitB6", "Vitamine B6", "mg", "vitamineB6_mg"]
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
 setItem(k,v) { try { localStorage.setItem(k,v); } catch { stockageDisponible = false; } }
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
 budget: entier(p.budget ?? 80,20,300,80), portionsParRecette:entier(p.portionsParRecette ?? 4,2,12,4) };
}
function sauverProfil(p) { stockage.setItem("ns_profil", JSON.stringify(p)); }
let profil = chargerProfil();

/* ---------- Taille du texte (accessibilité, réglage gardé sur cet appareil) ---------- */
const NIVEAUX_TAILLE = [100, 125, 150];
function tailleTexte() { const v = +stockage.getItem("ns_taille_texte"); return NIVEAUX_TAILLE.includes(v) ? v : 100; }
function appliquerTailleTexte() { if (typeof document !== "undefined" && document.documentElement) document.documentElement.style.fontSize = tailleTexte() === 100 ? "" : tailleTexte() + "%"; }
function cycleTailleTexte() { const i = NIVEAUX_TAILLE.indexOf(tailleTexte()); stockage.setItem("ns_taille_texte", String(NIVEAUX_TAILLE[(i + 1) % NIVEAUX_TAILLE.length])); appliquerTailleTexte(); }
function libelleTailleTexte() { const t = tailleTexte(); return t === 100 ? "Taille normale du texte." : t === 125 ? "Texte agrandi (125 %). Un nouvel appui agrandit encore." : "Texte très grand (150 %). Un nouvel appui revient à la taille normale."; }

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
 if(/gratin|tarte|quiche|pizza|lasagne|hachis|tian/.test(n))return "four";
 if(/pâtes|spaghetti|tagliatelle|risotto|riz|nouilles|crozets/.test(n))return "cereales";
 return "poele_roti";
}
function scorePlan(ids,mois=moisSemaine()) {
  const recettes = ids.map(i => RECETTE_PAR_ID[i]);
  let s = 0;
  const types = {}, formes = {};
  let poisson = 0, gras = 0, legum = 0, viandeG = 0, charcG = 0, budget = 0;
  const tot = {}; for (const [cle] of NUTRIMENTS) tot[cle] = 0;
  for (const r of recettes) {
    types[r.t] = (types[r.t] || 0) + 1;
    const forme=formeCulinaire(r);formes[forme]=(formes[forme]||0)+1;
    if (r.t === "poisson_maigre" || r.t === "poisson_gras") poisson++;
    if (r.t === "poisson_gras") gras++;
    if (contientLegumineuses(r)) legum++;
    // portions/personne : recette de 4 portions pour 2 personnes = 2 portions/pers -> g/pers = g/2
    viandeG += grammesParSemaine(r, VIANDE_ROUGE) * profil.portionsParRecette / 4 / profil.personnes.length;
    charcG += grammesParSemaine(r, CHARCUTERIE) * profil.portionsParRecette / 4 / profil.personnes.length;
    budget += coutRecette(r) * profil.portionsParRecette / 4;
    const { t } = nutrimentsRecette(r);
    for (const [cle] of NUTRIMENTS) tot[cle] += t[cle] * profil.portionsParRecette / 4;
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
  for(let i=1;i<recettes.length;i++)if(formeCulinaire(recettes[i])===formeCulinaire(recettes[i-1]))s-=5;
  // Saisonnalité (contrainte souple) : bonus pour les recettes propres au mois courant
  for (const r of recettes) if ((r.m || []).includes(mois) && (r.m || []).length < 12) s += 4;
  // Nutriments : moyenne des % des RNP hebdo couverts (cible douce, périmètre = repas planifiés)
  const rnp = rnpHebdoFoyer();
  // Seuil de comparaison interne, non une référence médicale : les deux repas ne couvrent pas la journée.
  // Aucun crédit supplémentaire au-delà de 70 % ; les apports faibles ne sont plus compensés par l'excès de protéines.
  const ratios=[];
  for (const [cle, , , refCle] of NUTRIMENTS) {
    if(!refCle||!rnp[refCle])continue;
    const ratio=tot[cle]/profil.personnes.length/rnp[refCle];
    const poids=cle==="prot"?0.35:1;
    ratios.push(Math.min(ratio/0.70,1)*poids);
    s-=25*poids*Math.max(0,0.55-ratio);
  }
  s+=25*ratios.reduce((a,b)=>a+b,0)/ratios.length;

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
  if (pool.length < 7) return pool.map(r => r.i);
  const rand = mulberry32(graine);
  let meilleur = null, meilleurScore = -1e9;
  for (let it = 0; it < 500; it++) {
    const copie = pool.slice();
    const ids = [];
    while (ids.length < 7 && copie.length) ids.push(copie.splice(Math.floor(rand() * copie.length), 1)[0].i);
    const sc = scorePlan(ids,mois);
    if (sc > meilleurScore) { meilleurScore = sc; meilleur = ids; }
  }
  return meilleur;
}
function relancerRepas(planIds, index, mois, graine) {
  // Remplace UN repas en recalculant l'équilibre et le budget de toute la semaine
  const pool = poolDuMois(mois, profil.exclusions).filter(r => !planIds.includes(r.i));
  if (!pool.length) return planIds;
  const rand = mulberry32(graine);
  let meilleur = null, meilleurScore = -1e9;
  for (let it = 0; it < 200; it++) {
    const cand = pool[Math.floor(rand() * pool.length)].i;
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
  <p class="surtitre">Semaine du ${semaine.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
  <h2 id="titreGen">Sept dîners variés, filtrés selon tes exclusions.</h2>
  <p class="sous-titre">Choisis tes allergies et ce que tu n'aimes pas, puis génère. Les recettes sont écartées d'après les ingrédients renseignés dans le catalogue : vérifie toujours les étiquettes.</p>
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
  return `<img src="${esc(src)}" width="1080" height="648" loading="${idx<2?'eager':'lazy'}" decoding="async" alt="${photo?"Photo":"Dessin illustratif"} : ${esc(r.n)}">`;
 }
 return globalThis.illustrationPlat ? illustrationPlat(r) : "";
}
function etiquettePlat(r) {
 const src=globalThis.DESSINS_PLATS && globalThis.DESSINS_PLATS[r.i];
 if(src && src.startsWith("assets/photos/"))return "";
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
      <p class="jour">${dateDiner.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})} · dîner</p><div class="repas-tete"><h2>${esc(r.n)}</h2></div>
      ${conflit ? `<p class="alerte-carte" role="alert">Ne convient plus à tes choix : génère la semaine pour le remplacer.</p>` : ""}
      <div class="puces-info"><span class="badge">${TYPE_LABEL[r.t] || r.t}</span>
      <span class="badge ${long?"long":""}">${tps} min</span><span class="badge">~${Math.round(nutrimentsRecette(r).t.kcal/4)} kcal/portion</span><span class="badge">~${eur(coutRecette(r)*profil.portionsParRecette/4)}</span></div>
      ${al.c.length ? `<p class="meta allerg">Contient : ${al.c.map(nomAl).join(", ")}</p>` : ""}
      <div class="meta">Prépa ${r.p} min · cuisson ${r.c} min · ${profil.portionsParRecette} portions au total · restes : déjeuner du ${dateRestes.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})}</div>
      ${manque.length ? `<div class="alternatives">Matériel manquant : ${manque.map(m => m + " → alternative : " + (ALT_MATERIEL[m] || "adapter")).join(" ; ")}</div>` : ""}
      <div class="actions">
        <button class="petit" data-act="detail" aria-expanded="false">Détails</button>
        <button class="petit" data-act="relancer" data-idx="${idx}">Remplacer ce plat</button>
      </div>
      </div>
      <div class="detail masque">
        ${(al.c.length||al.p.length) ? `<p class="note"><strong>Allergènes (liste UE) :</strong> ${al.c.length?"contient "+al.c.map(nomAl).join(", "):"aucun certain"}${al.p.length?" · possible selon les marques (produits transformés, à vérifier sur l'étiquette) : "+al.p.map(nomAl).join(", "):""}. Traces et contamination croisée non couvertes.</p>` : `<p class="note">Aucun allergène UE identifié dans les ingrédients du catalogue (traces et produits industriels non vérifiables).</p>`}
        <h3>Ingrédients (${profil.portionsParRecette} portions)</h3>
        <ul>${r.ing.map(([k, g]) => { const ing = ING[k]; return ing ? `<li>${ing.nom} — ${esc(quantiteIngredient(k,g * profil.portionsParRecette / 4))}${ACHATS[k]?`<small class="note note-achat">${esc(noteAchat(k))}</small>`:""}</li>` : ""; }).join("")}</ul>
        <p class="note">~${eur(coutRecette(r)*profil.portionsParRecette/4)} pour la recette · ~${Math.round(nutrimentsRecette(r).t.kcal/4)} kcal/portion (estimation, données partielles possibles)</p><p class="note">Correspondances CIQUAL approximatives ou absentes (non chiffrées si absentes) : ${r.ing.filter(([k])=>ING[k].correspondance!=="directe").map(([k])=>esc(ING[k].nom)).join(", ")||"aucune signalée"}. Les calculs utilisent les poids comestibles. Quand un rendement est indiqué, le poids à acheter avec os ou coquilles est affiché séparément. Rendements estimés et pertes de cuisson non modélisées ; certains produits entiers du catalogue restent approximatifs.</p><h3>Préparation</h3>
        <ul>${(r.et || []).map(e => `<li>${esc(etapeAffichee(r,e))}</li>`).join("")}</ul>
      </div>
    </div>`;
  }).join("");
  $("#vue-semaine").innerHTML = rendreHero() +
    `<div class="bandeau-budget"><span>Budget estimé des menus sélectionnés<br><small class="note">hypothèses indicatives, quantités utilisées, pas un panier magasin</small></span>
     <span class="montant ${budget > profil.budget ? "ko" : "ok"}">${eur(budget)}</span></div>` + `<div class="liste-repas${classeAnim}">` + cartes + `</div>` +
    `<div class="carte complements"><h2>Compléter les repas, pas seulement le plat</h2><p class="note">Proposition facultative : par portion, 150 g de fruit de saison, 125 g de yaourt nature et 10 g d'amandes. Sur 7 recettes de ${profil.portionsParRecette} portions, les restes sont déjà inclus. Ce ne sont pas des portions supplémentaires de plat. Exclus : produits laitiers ou fruits à coque si cochés dans le panneau Allergies et exclusions.</p><button class="petit" id="toggleComplements">${complementsActifs()?"Retirer les compléments":"Ajouter ces compléments à la semaine"}</button>${complementsActifs()?`<p class="note">Inclus dans les courses, le coût et le bilan : ${[...new Set(complements().map(([k])=>ING[k].nom))].join(", ")}. Coût indicatif : ${eur(coutComplements())}. Le bilan reste partiel, surtout pour la vitamine D.</p>`:`<p class=note>Aucun ajout dans les courses ou le bilan tant que tu n’as pas choisi de les inclure. Coût supplémentaire indicatif : ${eur(coutComplements(true))}. ${budget+coutComplements(true)>profil.budget?"Attention : le total dépasserait le budget cible, même avec les prix indicatifs.":""}</p>`}</div><div class="carte ajout-plat"><h2>Ajouter un plat au menu</h2><p class="note">À chaque ajout, tu choisis : <strong>remplacer</strong> l'un des 7 dîners prévus (le nouveau plat prend sa place, la semaine reste à 7) ou <strong>ajouter un 8e repas</strong>, pour les fois où tu reçois du monde. Courses, coût et bilan suivent ce choix.</p><form id="formRepas" class="ajout"><label for="filtreRepas" class="sr-only">Chercher un plat</label><input id="filtreRepas" type="search" maxlength="40" placeholder="Chercher un plat (ex. curry, saumon)…" autocomplete="off"><label for="ajoutRepas" class="sr-only">Plat à ajouter</label><select id="ajoutRepas">${optionsRepas("")}</select><fieldset class="choix-ajout"><legend>Remplacer ou ajouter ?</legend><label class="choix"><input type="radio" name="modeAjout" value="remplacer" checked> Remplacer un dîner prévu</label><label class="choix-cible" for="cibleRemplacement"><span class="sr-only">Dîner à remplacer</span><select id="cibleRemplacement">${optionsRemplacement()}</select></label><label class="choix"><input type="radio" name="modeAjout" value="huitieme"> Ajouter un 8e repas (exception, quand tu reçois)</label></fieldset><button>Ajouter ce plat</button></form>${repasManuels().length ? `<div class="repas-plus"><h3>Repas en plus cette semaine</h3><p class="note">Chaque repas en plus est une recette entière de ${profil.portionsParRecette} portions : il s'ajoute aux 7 dîners dans les courses, le coût et le bilan.</p>${repasManuels().map((id,i)=>`<p class="ligne-repas-plus">${esc(RECETTE_PAR_ID[id].n)} <button class="petit" data-act="supprRepas" data-idx="${i}">Retirer le repas</button></p>`).join("")}</div>` : ""}</div><p class="note">Saison favorisée pour ${REF.mois[mois - 1]} (France métropolitaine), sans exclusion stricte des autres saisons. Hypothèses de l'app : prix indicatifs (pas des prix magasin), composition selon correspondances CIQUAL (états cru/cuit variables), pertes de cuisson non modélisées, 2 personnes par défaut.</p>` +
    `<div class="carte lisibilite"><h2>Lisibilité</h2><p class="note">Le texte est trop petit pour être lu confortablement ? Agrandis-le ici : le réglage reste enregistré sur cet appareil et s'applique à toute l'application.</p><button class="petit" type="button" data-act="tailleTexte" aria-describedby="tailleTexteEtat">${tailleTexte()===150?"Revenir à la taille normale":"Agrandir le texte"}</button><p class="note" id="tailleTexteEtat" role="status">${libelleTailleTexte()}</p></div>`;
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
    const parPers = tot[cle] / profil.personnes.length;
    const pct = refCle ? Math.round(parPers / rnp[refCle] * 100) : null;
    return `<tr><td>${nom}${absents[cle]?`<small class="incomplet">Partiel : ${absents[cle]} valeur(s) absente(s)</small>`:""}</td><td>${fmt(parPers, unite)}</td><td>${pct===null?"":`<div class="barre"><i style="width:${Math.min(pct,100)}%"></i></div>`}</td><td>${pct===null?"Sans repère unique":pct+" %"}</td></tr>`;
  }).join("");
  const bas = NUTRIMENTS.filter(([cle,,,refCle])=>refCle && tot[cle]/profil.personnes.length/rnp[refCle]<0.5).map(([,nom])=>nom);
  const repere = (ok, txt) => `<li class="${ok ? "ok" : "ko"}">${ok ? "✓" : "✗"} ${txt}</li>`;
  $("#vue-bilan").innerHTML = `<div class="carte">
    <h2>Bilan de la semaine (repas planifiés)</h2>
    <div class="limites"><h3>À lire avant d'utiliser ce bilan</h3><ul>
      <li><strong>Périmètre :</strong> les dîners planifiés et leurs restes pris au déjeuner, soit ${idsComplets().length * profil.portionsParRecette / profil.personnes.length} portions/personne au total, ajouts inclus, pour ${profil.personnes.length} personnes. ${complementsActifs()?"Fruits, yaourts et amandes sélectionnés inclus.":"Fruits et laitages hors plats non inclus sans sélection des compléments."} Hypothèse par défaut : 7 dîners + 7 déjeuners de restes. Petits-déjeuners et autres repas non compris : viser 100 % sur les seuls repas planifiés n'est pas l'objectif, les autres repas complètent.</li>
      <li><strong>Données absentes :</strong> ${manquants} valeur(s) nutriment absente(s) de la table CIQUAL pour ces ingrédients : non comptées, jamais estimées à 0. Un bilan incomplet ne permet pas de conclure à une carence.</li>
      <li><strong>Approximations :</strong> certains ingrédients sont approchés par un aliment voisin (le détail des plats le signale), états cru/cuit variables, pertes de cuisson non modélisées.</li>
      <li><strong>Repères :</strong> références ANSES adultes moyennes (profil type, pas un avis médical). Fer : hypothèse femme à pertes menstruelles élevées (16 mg/j), pas une valeur universelle.</li>
    </ul></div>
    ${bas.length?`<p class="alerte" role="alert">Couverture partielle du besoin hebdomadaire : ${bas.join(", ")} sous 50 % dans les recettes prévues. Les autres repas doivent compléter ; cuisson, données absentes et besoins personnels ne sont pas tous modélisés.</p>`:`<p class="note">Aucun nutriment repéré sous 50 % du besoin hebdomadaire dans les recettes prévues ; détail ci-dessous. Les autres repas complètent, et cuisson, données absentes et besoins personnels ne sont pas tous modélisés.</p>`}
    <div class="table-wrap"><table><tr><th>Nutriment</th><th>Par personne / semaine</th><th></th><th>% repère hebdo</th></tr>${lignes}</table></div>
    <p class="note">Vitamine E : repères actualisés 10 mg/j homme / 9 mg/j femme (ANSES). Cela change le dénominateur, pas les apports du menu.</p>
    </div>
    <div class="carte"><h2>La base de l’équilibre</h2><p class="note">Repères adultes PNNS pour l’ensemble de la journée, pas seulement les dîners. L’app ne mesure pas encore toutes ces familles en portions standard.</p><ul class="pyramide"><li><strong>À augmenter :</strong> fruits et légumes (au moins 5 portions/jour), légumes secs (au moins 2 fois/semaine), petite poignée de fruits à coque non salés.</li><li><strong>À privilégier :</strong> féculents complets au moins une fois/jour, huiles de colza, noix et olive.</li><li><strong>À alterner :</strong> poisson 2 fois/semaine dont un gras ; produits laitiers 2 fois/jour.</li><li><strong>À limiter :</strong> viande hors volaille à 500 g/semaine et charcuterie à 150 g/semaine, produits très sucrés ou salés. L’eau est la boisson de référence.</li></ul></div>
    <div class="carte reperes"><h2>Repères PNNS de la semaine</h2><ul>
      ${repere(poissonOcc >= 2, `Poisson : ${idsComplets().filter(id=>RECETTE_PAR_ID[id].t.startsWith("poisson")).length} recette(s) cette semaine = ${poissonOcc} occasion(s)/personne avec les restes (repère : 2, dont 1 gras — ${grasOcc} occasion(s) gras)`)}
      ${repere(legumesOcc >= 2, `Légumineuses : ${legumesOcc} occasion(s)/personne (plat contenant au moins 100 g pour la recette de base ; repère : au moins 2/semaine)`)}
      ${repere(legumOcc >= 2, `Plats légumineuses ou végétariens (ce n’est pas le repère légumineuses seul) : ${idsComplets().filter(id=>["legumineuses","vege"].includes(RECETTE_PAR_ID[id].t)).length} recette(s) = ${legumOcc} occasion(s)/personne (repère : 2)`)}
      ${repere(viandeG <= REF.reperes.viandeRouge_g_max_par_semaine, `Viande rouge (hors volaille) : ${Math.round(viandeG)} g/personne (max ${REF.reperes.viandeRouge_g_max_par_semaine} g)`)}
      ${repere(charcG <= REF.reperes.charcuterie_g_max_par_semaine, `Charcuterie : ${Math.round(charcG)} g/personne (max ${REF.reperes.charcuterie_g_max_par_semaine} g)`)}
      ${repere(budget <= profil.budget, `Budget estimé : ${eur(budget)} (cible ${eur(profil.budget)})`)}
    </ul>
    <p class="note">Les occasions sont des portions par personne : 4 portions pour 2 = 1 dîner et 1 déjeuner. Catégorie végétarienne ≠ présence garantie de légumineuses. Un bilan incomplet ne permet pas de conclure à une carence. Aucun complément alimentaire conseillé automatiquement.</p></div>`;
}

function rendreCourses() {
  const agg = listeCourses();
  const rayons = {};
  let total = 0;
  for (const [k, v] of Object.entries(agg)) {
    (rayons[v.rayon] = rayons[v.rayon] || []).push([k, v]);
    total += v.prix;
  }
  const coches = cochesCourses();
  const ordre = ["fruits_legumes", "boucherie", "poissonnerie", "charcuterie", "cremerie", "boulangerie", "feculents", "epicerie"];
  const noms = { fruits_legumes: "Fruits et légumes", boucherie: "Boucherie / volaille", poissonnerie: "Poissonnerie",
    charcuterie: "Charcuterie", cremerie: "Crèmerie", boulangerie: "Boulangerie", feculents: "Féculents", epicerie: "Épicerie", manuel: "Ajouts manuels" };
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
    <p class="note">Nouvelle liste distincte pour chaque semaine (les anciennes restent consultables), regroupée par rayon. Quantités pour ${profil.portionsParRecette} portions par recette. Pour les produits avec os ou coquilles, le poids d’achat estimé est distingué de la chair utilisée au bilan. Les prix sont des hypothèses indicatives (pas relevés en magasin ; les conditionnements réels peuvent faire varier le total).</p>
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
    <p class="note">Ces réglages restent enregistrés sur cet appareil uniquement (pas de compte, pas de synchronisation entre appareils). Allergies et aliments à éviter : onglet Semaine, avant de générer. Les profils types utilisés alternent homme 70 kg / femme 60 kg ; leur moyenne ne représente pas les besoins personnels du foyer (âge, grossesse, santé non pris en compte).</p>
    <div class="champ"><label for="nbPers">Nombre de personnes</label>
      <input type="number" id="nbPers" min="1" max="8" value="${profil.personnes.length}"></div>
    <div class="champ"><label for="nbPortions">Portions cuisinées par recette (dîner + restes)</label>
      <input type="number" id="nbPortions" min="2" max="12" value="${profil.portionsParRecette}"></div>
    <div class="champ"><label for="budget">Budget cible des 7 dîners (€)</label>
      <input type="number" id="budget" min="20" max="300" value="${profil.budget}"></div>
    <div class="champ"><label>Matériel de cuisine disponible</label><div class="coches" id="cochesMat">
      ${materiels.map(m => `<label><input type="checkbox" value="${m}" ${profil.materiel.includes(m) ? "checked" : ""}> ${m === "raclette" ? "appareil à raclette" : m.replace("_", " ")}</label>`).join("")}</div></div>
    <button class="petit principal" id="sauverProfil">Enregistrer et régénérer la semaine</button>
  </div>`;
  $("#sauverProfil").addEventListener("click", () => {
    const n = Math.max(1, Math.min(8, +$("#nbPers").value || 2));
    const pers = [];
    for (let i = 0; i < n; i++) pers.push({ sexe: i % 2 ? "femme" : "homme", poids: i % 2 ? 60 : 70 });
    profil.personnes = pers;
    profil.portionsParRecette = Math.max(2, Math.min(12, +$("#nbPortions").value || 4));
    profil.budget = entier($("#budget").value || 80,20,300,80);
    profil.materiel = [...document.querySelectorAll("#cochesMat input:checked")].map(c => c.value);
    sauverProfil(profil); resetCoches();
    stockage.setItem("ns_repas_"+cleSemaine(),JSON.stringify(repasManuels().filter(id=>!estExclue(RECETTE_PAR_ID[id],profil.exclusions))));
    plan = genererPlan(moisSemaine(), hashStr(cleSemaine() + Date.now()));
    stockage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
    messageGen = "Foyer enregistré, semaine régénérée."; animer = true;
    rendreTout();
    activerVue("semaine");
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
poolDuMois = function(mois, exclusions) {
 const candidats=RECETTES.filter(r=>!estExclue(r,exclusions));
 const saison=candidats.filter(r=>(r.m||[]).includes(mois));
 return candidats;
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
  if (b.dataset.act === "annuler") { const p = planPrecedent(); if (p) { const cur = plan; plan = p; stockage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan)); stockage.setItem("ns_plan_prev_" + cleSemaine(), JSON.stringify(cur)); resetCoches(); messageGen = "Menu précédent rétabli (tu peux ré-annuler pour revenir)."; animer = true; rendreTout(); } }
  if (b.dataset.act === "ouvrirFiltres") { panelOuvert = !panelOuvert; rendreTout(); }
  if (b.dataset.act === "retireMot") { profil.exclusions = profil.exclusions.filter(x => x !== b.dataset.mot); sauverProfil(profil); panelOuvert = true; messageGen = ""; rendreTout(); }
  if (b.dataset.act === "detail") { const d = b.closest(".carte").querySelector(".detail"); d.classList.toggle("masque"); b.setAttribute("aria-expanded", String(!d.classList.contains("masque"))); b.textContent = d.classList.contains("masque") ? "Détails" : "Masquer"; }
  if (b.dataset.act === "relancer") {
    resetCoches(); memoriserPlan();
    plan = relancerRepas(plan, +b.dataset.idx, moisSemaine(), hashStr(cleSemaine() + ":" + Date.now()));
    stockage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
    messageGen = ""; rendreTout();
  }
  if (b.dataset.act === "supprRepas") { resetCoches(); const l=repasManuels(); l.splice(+b.dataset.idx,1); stockage.setItem("ns_repas_"+cleSemaine(),JSON.stringify(l)); rendreTout(); }
  if (b.dataset.act === "tailleTexte") { cycleTailleTexte(); focusApres = '[data-act="tailleTexte"]'; rendreTout(); }
  if (b.dataset.act === "supprManuel") {
    const l = coursesManuelles(); l.splice(+b.dataset.idx, 1); sauverCoursesManuelles(l); rendreCourses();
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
  resetCoches();memoriserPlan();
  const ancien=RECETTE_PAR_ID[plan[idx]].n;
  plan=plan.slice();plan[idx]=id;
  stockage.setItem("ns_plan_"+cleSemaine(),JSON.stringify(plan));
  const d=new Date(semaine);d.setDate(d.getDate()+idx);
  messageGen=`« ${nom} » remplace « ${ancien} » au dîner du ${d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})}. Courses et bilan mis à jour (le bouton Annuler permet de revenir en arrière).`;
  rendreTout();
 });
 if (focusApres) { const f = document.querySelector(focusApres); focusApres = ""; if (f && f.focus) f.focus(); }
 if(!stockageDisponible) $("#vue-semaine").innerHTML = '<p role="alert" class="alternatives">Stockage local indisponible : tes changements peuvent être perdus à la fermeture.</p>'+$("#vue-semaine").innerHTML;
}
appliquerTailleTexte();
if(typeof module!=="undefined" && module.exports) module.exports={etapeAffichee,formeCulinaire,complements,coutComplements,contientLegumineuses,RECETTES,ING,scorePlan,genererPlan,relancerRepas,listeCourses,nutrimentsRecette,bilanPlan,rnpHebdoFoyer,estExclue,poolDuMois,lundiDe,isoSemaine,cleSemaine,idsComplets,coursesManuelles,repasManuels,chargerPlan,chargerProfil,rendreTout,activerVue,tailleTexte,cycleTailleTexte,libelleTailleTexte,getProfil:()=>profil,setProfil:p=>{profil=p;},getPlan:()=>plan,setPlan:p=>{plan=p;},setSemaine:d=>{semaine=lundiDe(d);}};
rendreTout();
if (typeof navigator!=="undefined" && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
