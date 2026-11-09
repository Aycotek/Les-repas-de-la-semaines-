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
const contientLegumineuses = r => r.ing.some(([k,g])=>/^(lentille|pois_chiche|pois_casse|haricots_blancs|haricots_rouges|feve)/.test(k) && g>=100);
const RECETTE_PAR_ID = Object.assign(Object.create(null),Object.fromEntries(RECETTES.map(r => [r.i, r])));

// Ingrédients comptés dans les limites PNNS (par clé d'ingrédient)
const VIANDE_ROUGE = k => /^(boeuf|veau|agneau|cote_agneau|porc|saucisse_toulouse|merguez)/.test(k);
const CHARCUTERIE = k => /^(lardons|jambon_|saucisse_fumee|saucisse_toulouse|merguez)/.test(k);
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
  poisson_maigre: "Poisson", poisson_gras: "Poisson gras", oeufs: "Œufs", legumineuses: "Légumineuses", vege: "Végétarien" };
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
function chargerProfil() {
 let p; try { p = JSON.parse(stockage.getItem("ns_profil") || "{}"); } catch { p = {}; }
 if (!p || typeof p !== "object") p = {};
 return { personnes: Array.from({length:entier(p.personnes?.length || 2,1,8,2)},(_,i)=>({sexe:i%2?"femme":"homme",poids:i%2?60:70})),
 exclusions: Array.isArray(p.exclusions) ? p.exclusions.filter(x=>typeof x==="string") : [],
 materiel: Array.isArray(p.materiel) ? p.materiel.filter(x=>typeof x==="string") : [...PROFIL_DEFAUT.materiel],
 budget: entier(p.budget ?? 80,20,300,80), portionsParRecette:entier(p.portionsParRecette ?? 4,2,12,4) };
}
function sauverProfil(p) { stockage.setItem("ns_profil", JSON.stringify(p)); }
let profil = chargerProfil();

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
function scorePlan(ids,mois=moisSemaine()) {
  const recettes = ids.map(i => RECETTE_PAR_ID[i]);
  let s = 0;
  const types = {};
  let poisson = 0, gras = 0, legum = 0, viandeG = 0, charcG = 0, budget = 0;
  const tot = {}; for (const [cle] of NUTRIMENTS) tot[cle] = 0;
  for (const r of recettes) {
    types[r.t] = (types[r.t] || 0) + 1;
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
  s -= 18 * Math.abs(poisson - 2);            // 2 dîners poisson => 4 occasions/pers (repère : 2)
  if (gras < 1) s -= 14;
  s -= 8 * Math.max(0, 2 - legum);
  s -= Math.max(0, viandeG - REF.reperes.viandeRouge_g_max_par_semaine) / 25;
  s -= Math.max(0, charcG - REF.reperes.charcuterie_g_max_par_semaine) / 15;
  s -= Math.max(0, budget - profil.budget) / 4;
  for (const t of Object.values(types)) if (t > 2) s -= 6 * (t - 2);
  // Saisonnalité (contrainte souple) : bonus pour les recettes propres au mois courant
  for (const r of recettes) if ((r.m || []).includes(mois) && (r.m || []).length < 12) s += 4;
  // Nutriments : moyenne des % des RNP hebdo couverts (cible douce, périmètre = repas planifiés)
  const rnp = rnpHebdoFoyer();
  let couverture = 0, compte = 0;
  for (const [cle, , , refCle] of NUTRIMENTS) {
    if (!refCle || !rnp[refCle]) continue;
    const parPers = tot[cle] / profil.personnes.length; // 7 dîners + 7 déjeuners de restes par personne
    couverture += Math.min(parPers / rnp[refCle], 1.2); compte++;
  }
  s += 30 * (couverture / compte);
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
  return agg;
}

function cochesCourses() {try {const x=JSON.parse(stockage.getItem("ns_coches_"+cleSemaine())||"[]");return Array.isArray(x)?x.filter(k=>typeof k==="string"&&ING[k]):[];}catch{return [];}}
function resetCoches() {stockage.setItem("ns_coches_"+cleSemaine(),"[]");}

/* ---------- Rendu ---------- */
const $ = s => document.querySelector(s);
const fmt = (v, u) => v == null ? "—" : (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + " " + u;
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur = v => v.toFixed(2).replace(".", ",") + " €";

function rendreSemaine() {
  const mois = moisSemaine();
  $("#semLabel").textContent = "Semaine du " + semaine.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  let budget = 0;
  const cartes = plan.map((id, idx) => {
    const r = RECETTE_PAR_ID[id]; const dateDiner=new Date(semaine);dateDiner.setDate(dateDiner.getDate()+idx);const dateRestes=new Date(dateDiner);dateRestes.setDate(dateRestes.getDate()+1); budget += coutRecette(r) * profil.portionsParRecette / 4;
    const tps = (r.p || 0) + (r.c || 0);
    const long = tps > 60;
    const manque = (r.mat || []).filter(m => !profil.materiel.includes(m));
    return `<div class="carte" data-id="${id}">
      <p class="jour">${dateDiner.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})} · dîner</p><div class="repas-tete"><h2>${r.n}</h2></div>
      <span class="badge">${TYPE_LABEL[r.t] || r.t}</span>
      ${long ? '<span class="badge long">⏱ ' + tps + " min</span>" : ""}
      <div class="meta">Prépa ${r.p} min · cuisson ${r.c} min · ${profil.portionsParRecette} portions au total · restes : déjeuner du ${dateRestes.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})}</div>
      ${manque.length ? `<div class="alternatives">Matériel manquant : ${manque.map(m => m + " → alternative : " + (ALT_MATERIEL[m] || "adapter")).join(" ; ")}</div>` : ""}
      <div class="actions">
        <button class="petit" data-act="detail">Détails</button>
        <button class="petit" data-act="relancer" data-idx="${idx}">Relancer ce repas</button>
      </div>
      <div class="detail masque">
        <h3>Ingrédients (${profil.portionsParRecette} portions)</h3>
        <ul>${r.ing.map(([k, g]) => { const ing = ING[k]; return ing ? `<li>${ing.nom} — ${Math.round(g * profil.portionsParRecette / 4)} g</li>` : ""; }).join("")}</ul>
        <p class="note">~${eur(coutRecette(r)*profil.portionsParRecette/4)} pour la recette · ~${Math.round(nutrimentsRecette(r).t.kcal/4)} kcal/portion (estimation, données partielles possibles)</p><h3>Préparation</h3>
        <ul>${(r.et || []).map(e => `<li>${e}</li>`).join("")}</ul>
      </div>
    </div>`;
  }).join("");
  $("#vue-semaine").innerHTML =
    `<div class="bandeau-budget"><span>Budget estimé des 7 dîners<br><small class="note">hypothèses indicatives, quantités utilisées, pas un panier magasin</small></span>
     <span class="montant ${budget > profil.budget ? "ko" : "ok"}">${eur(budget)}</span></div>` + cartes +
    `<div class="carte"><h2>Repas ajoutés à la semaine</h2><p class="note">Chaque ajout correspond à une recette entière de ${profil.portionsParRecette} portions. Courses, coût et nutrition inclus ; aucun ajout automatique aux 7 dîners.</p>${repasManuels().map((id,i)=>`<p>${esc(RECETTE_PAR_ID[id].n)} <button class="petit" data-act="supprRepas" data-idx="${i}">Retirer le repas</button></p>`).join("")}<form id="formRepas" class="ajout"><label for="ajoutRepas" class="sr-only">Recette à ajouter</label><select id="ajoutRepas">${RECETTES.filter(r=>!estExclue(r,profil.exclusions)).map(r=>`<option value="${r.i}">${esc(r.n)}</option>`).join("")}</select><button>Ajouter ce repas</button></form></div><p class="note">Saison favorisée pour ${REF.mois[mois - 1]} (France métropolitaine), sans exclusion stricte des autres saisons. Hypothèses de l'app : prix indicatifs (pas des prix magasin), composition selon correspondances CIQUAL (états cru/cuit variables), pertes de cuisson non modélisées, 2 personnes par défaut.</p>`;
}

function bilanPlan() {
 const tot={}, absents={}; let manquants=0;
 for(const [cle] of NUTRIMENTS) {tot[cle]=0;absents[cle]=0;}
 for(const id of idsComplets()) {const n=nutrimentsRecette(RECETTE_PAR_ID[id]);manquants+=n.manquants;for(const [cle] of NUTRIMENTS){tot[cle]+=n.t[cle]*profil.portionsParRecette/4;absents[cle]+=n.absents[cle];}}
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
    <p class="note">Périmètre : les dîners planifiés et leurs restes pris au déjeuner, soit ${idsComplets().length * profil.portionsParRecette / profil.personnes.length} portions/personne au total, ajouts inclus, pour ${profil.personnes.length} personnes. Hypothèse par défaut : 7 dîners + 7 déjeuners de restes. Petits-déjeuners et autres repas non compris. Les pourcentages visent les références ANSES adultes moyennes (profil type, pas un avis médical) ; viser 100 % sur les seuls repas planifiés n'est pas l'objectif, les autres repas complètent.</p>
    <p class="alternatives">Couverture partielle du besoin hebdomadaire : ${bas.length?bas.join(", ")+" sous 50 % dans les recettes prévues.":"voir le détail ci-dessous."} Les autres repas doivent compléter. Aucune conclusion de carence : cuisson, données absentes et besoins personnels ne sont pas tous modélisés.</p><div class="table-wrap"><table><tr><th>Nutriment</th><th>Par personne / semaine</th><th></th><th>% repère hebdo</th></tr>${lignes}</table></div>
    <p class="note">${manquants} valeur(s) nutriment absente(s) de la table CIQUAL pour ces ingrédients : non comptées (jamais estimées à 0).</p>
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
      .map(([k, v]) => `<div class="ligne-course ${coches.includes(k)?"barree":""}" data-cle="${k}"><label><input type="checkbox" data-course="${k}" ${coches.includes(k)?"checked":""}> ${v.nom}</label><span class="qte">${v.g >= 1000 ? (v.g / 1000).toFixed(2).replace(".", ",") + " kg" : Math.round(v.g) + " g"} · ~${eur(v.prix)}</span></div>`).join("");
  }
  const manuels = coursesManuelles();
  if (manuels.length) html += `<h3 class="rayon-titre">${noms.manuel}</h3>` + manuels.map((m, i) =>
    `<div class="ligne-course"><span>${esc(m)}</span><button class="petit" data-act="supprManuel" data-idx="${i}">Retirer</button></div>`).join("");
  $("#vue-courses").innerHTML = `<div class="carte">
    <h2>Liste de courses — semaine du ${semaine.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</h2>
    <p class="note">Nouvelle liste distincte pour chaque semaine (les anciennes restent consultables), regroupée par rayon. Quantités pour ${profil.portionsParRecette} portions par recette. Les prix sont des hypothèses indicatives (pas relevés en magasin ; les conditionnements réels peuvent faire varier le total).</p>
    ${html}
    <p class="total-courses">Total estimé des recettes : ${eur(total)}<br><small class="note">Articles manuels non chiffrés et hors bilan nutritionnel.</small></p>
    <form class="ajout" id="formAjout"><label class="sr-only" for="ajoutTxt">Article manuel</label><input id="ajoutTxt" maxlength="200" placeholder="Ajouter un article (ex. café, papier cuisson)…" required><button>Ajouter</button></form>
  </div>`;
  $("#formAjout").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("#ajoutTxt").value.trim(); if (!v || coursesManuelles().length>=100) return;
    const l = coursesManuelles(); l.push(v); sauverCoursesManuelles(l); rendreCourses();
  });
}

function rendreProfil() {
  const exclusions = [["porc_filet_mignon|porc_hache|saucisse_toulouse|lardons|jambon_blanc|jambon_cru|saucisse_fumee", "Porc et charcuterie de porc"],
    ["poisson", "Poisson"], ["crevette|crabe|moule|encornet|seiche|poulpe", "Fruits de mer"],
    ["oeuf", "Œufs"], ["lait|yaourt|beurre|creme|fromage|comte|gruyere|parmesan|mozzarella|feta|ricotta|cheddar|beaufort|reblochon|bleu|pecorino|burrata|chevre", "Produits laitiers"],
    ["noix|noisette|amande|pignons|cacahuete|sesame", "Fruits à coque et graines"]];
  const materiels = ["four", "poele", "casserole", "cocotte", "sauteuse", "wok", "mixeur", "cuit_vapeur", "gril", "plancha", "saladier"];
  $("#vue-profil").innerHTML = `<div class="carte">
    <h2>Foyer</h2>
    <p class="note">Ces réglages restent enregistrés sur cet appareil uniquement (pas de compte, pas de synchronisation entre appareils). Exclusions : filtre de préférences, pas une garantie sans allergène (traces et produits composés non vérifiés). Les profils types utilisés alternent homme 70 kg / femme 60 kg ; leur moyenne ne représente pas les besoins personnels du foyer (âge, grossesse, santé non pris en compte).</p>
    <div class="champ"><label for="nbPers">Nombre de personnes</label>
      <input type="number" id="nbPers" min="1" max="8" value="${profil.personnes.length}"></div>
    <div class="champ"><label for="nbPortions">Portions cuisinées par recette (dîner + restes)</label>
      <input type="number" id="nbPortions" min="2" max="12" value="${profil.portionsParRecette}"></div>
    <div class="champ"><label for="budget">Budget cible des 7 dîners (€)</label>
      <input type="number" id="budget" min="20" max="300" value="${profil.budget}"></div>
    <div class="champ"><label>Exclusions alimentaires du foyer</label><div class="coches" id="cochesExc">
      ${exclusions.map(([pat, label]) => `<label><input type="checkbox" value="${pat}" ${profil.exclusions.includes(pat) ? "checked" : ""}> ${label}</label>`).join("")}</div></div>
    <div class="champ"><label>Matériel de cuisine disponible</label><div class="coches" id="cochesMat">
      ${materiels.map(m => `<label><input type="checkbox" value="${m}" ${profil.materiel.includes(m) ? "checked" : ""}> ${m.replace("_", " ")}</label>`).join("")}</div></div>
    <button class="petit principal" id="sauverProfil">Enregistrer et régénérer la semaine</button>
  </div>`;
  $("#sauverProfil").addEventListener("click", () => {
    const n = Math.max(1, Math.min(8, +$("#nbPers").value || 2));
    const pers = [];
    for (let i = 0; i < n; i++) pers.push({ sexe: i % 2 ? "femme" : "homme", poids: i % 2 ? 60 : 70 });
    profil.personnes = pers;
    profil.portionsParRecette = Math.max(2, Math.min(12, +$("#nbPortions").value || 4));
    profil.budget = entier($("#budget").value || 80,20,300,80);
    const exc = [];
    document.querySelectorAll("#cochesExc input:checked").forEach(c => exc.push(c.value));
    profil.exclusions = exc;
    profil.materiel = [...document.querySelectorAll("#cochesMat input:checked")].map(c => c.value);
    sauverProfil(profil); resetCoches();
    stockage.setItem("ns_repas_"+cleSemaine(),JSON.stringify(repasManuels().filter(id=>!estExclue(RECETTE_PAR_ID[id],profil.exclusions))));
    plan = genererPlan(moisSemaine(), hashStr(cleSemaine() + Date.now()));
    stockage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
    rendreTout();
    activerVue("semaine");
  });
}

/* ---------- Exclusions poisson (type, pas ingrédient) ---------- */
function estExclue(r, exclusions) {
 return r.ing.some(([k])=>exclusions.some(p=>p==="poisson" ? (r.t.startsWith("poisson") || (ING[k].rayon==="poissonnerie" && !/^(crabe|crevette|encornet|moule|poulpe|seiche)/.test(k))) : p.split("|").some(x=>k.includes(x))));
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
$("#semPrec").addEventListener("click", () => { semaine.setDate(semaine.getDate() - 7); plan = chargerPlan(); rendreTout(); });
$("#semSuiv").addEventListener("click", () => { semaine.setDate(semaine.getDate() + 7); plan = chargerPlan(); rendreTout(); });
document.addEventListener("change", e=>{const k=e.target.dataset?.course;if(!k||!ING[k])return;const x=new Set(cochesCourses());if(e.target.checked)x.add(k);else x.delete(k);stockage.setItem("ns_coches_"+cleSemaine(),JSON.stringify([...x]));e.target.closest(".ligne-course").classList.toggle("barree",e.target.checked);});
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  if (b.dataset.act === "detail") b.closest(".carte").querySelector(".detail").classList.toggle("masque");
  if (b.dataset.act === "relancer") {
    resetCoches();
    plan = relancerRepas(plan, +b.dataset.idx, moisSemaine(), hashStr(cleSemaine() + ":" + Date.now()));
    stockage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
    rendreTout();
  }
  if (b.dataset.act === "supprRepas") { resetCoches(); const l=repasManuels(); l.splice(+b.dataset.idx,1); stockage.setItem("ns_repas_"+cleSemaine(),JSON.stringify(l)); rendreTout(); }
  if (b.dataset.act === "supprManuel") {
    const l = coursesManuelles(); l.splice(+b.dataset.idx, 1); sauverCoursesManuelles(l); rendreCourses();
  }
});
function rendreTout() {
 rendreSemaine(); rendreBilan(); rendreCourses(); rendreProfil();
 const total=idsComplets().reduce((t,id)=>t+coutRecette(RECETTE_PAR_ID[id])*profil.portionsParRecette/4,0);
 $(".montant").textContent=eur(total);
 $("#formRepas").addEventListener("submit",e=>{e.preventDefault();const id=$("#ajoutRepas").value;if(!RECETTE_PAR_ID[id] || repasManuels().length>=40)return;resetCoches();const l=repasManuels();l.push(id);stockage.setItem("ns_repas_"+cleSemaine(),JSON.stringify(l));rendreTout();});
 if(!stockageDisponible) $("#vue-semaine").innerHTML = '<p role="alert" class="alternatives">Stockage local indisponible : tes changements peuvent être perdus à la fermeture.</p>'+$("#vue-semaine").innerHTML;
}
if(typeof module!=="undefined" && module.exports) module.exports={contientLegumineuses,RECETTES,ING,scorePlan,genererPlan,relancerRepas,listeCourses,nutrimentsRecette,bilanPlan,rnpHebdoFoyer,estExclue,poolDuMois,lundiDe,isoSemaine,cleSemaine,idsComplets,coursesManuelles,repasManuels,chargerPlan,chargerProfil,rendreTout,activerVue,getProfil:()=>profil,setProfil:p=>{profil=p;},getPlan:()=>plan,setPlan:p=>{plan=p;},setSemaine:d=>{semaine=lundiDe(d);}};
rendreTout();
if (typeof navigator!=="undefined" && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
