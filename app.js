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
const RECETTE_PAR_ID = Object.fromEntries(RECETTES.map(r => [r.i, r]));

// Ingrédients comptés dans les limites PNNS (par clé d'ingrédient)
const VIANDE_ROUGE = k => /^(boeuf|veau|agneau|cote_agneau|porc|saucisse_toulouse|merguez)/.test(k);
const CHARCUTERIE = k => /^(lardons|jambon_|saucisse_fumee|anchois$)/.test(k) && k !== "anchois" ? /^(lardons|jambon_|saucisse_fumee)/.test(k) : /^(lardons|jambon_|saucisse_fumee)/.test(k);
const POISSON_GRAS = k => /^(saumon|maquereau|sardine|hareng|truite)/.test(k);

const NUTRIMENTS = [
  ["kcal", "Énergie", "kcal", null], ["prot", "Protéines", "g", "prot"], ["lip", "Lipides", "g", null],
  ["ags", "Acides gras saturés", "g", null], ["gluc", "Glucides", "g", null], ["fibres", "Fibres", "g", "fibres_g"],
  ["fer", "Fer", "mg", "fer_mg"], ["calcium", "Calcium", "mg", "calcium_mg"], ["magnesium", "Magnésium", "mg", "magnesium_mg"],
  ["potassium", "Potassium", "mg", "potassium_mg"], ["zinc", "Zinc", "mg", "zinc_mg"],
  ["selenium", "Sélénium", "µg", "selenium_ug"], ["vitC", "Vitamine C", "mg", "vitamineC_mg"],
  ["vitD", "Vitamine D", "µg", "vitamineD_ug"], ["b9", "Vitamine B9", "µg", "vitamineB9_ug"],
  ["b12", "Vitamine B12", "µg", "vitamineB12_ug"], ["vitE", "Vitamine E", "mg", "vitamineE_mg"],
  ["vitB1", "Vitamine B1", "mg", "vitamineB1_mg"], ["vitB6", "Vitamine B6", "mg", "vitamineB6_mg"]
];
const TYPE_LABEL = { viande: "Viande rouge", porc: "Porc", volaille: "Volaille", volaille_blanche: "Volaille",
  poisson_maigre: "Poisson", poisson_gras: "Poisson gras", oeufs: "Œufs", legumineuses: "Légumineuses", vege: "Végétarien" };
const ALT_MATERIEL = { cuit_vapeur: "casserole + passoire", mixeur: "couteau (hacher fin)", plancha: "poêle",
  gril: "four position grill", wok: "grande sauteuse", four: "—", cocotte: "faitout", poele: "sauteuse",
  casserole: "faitout", sauteuse: "grande poêle", saladier: "grand récipient" };

/* ---------- Profil foyer (localStorage, données qui restent sur cet appareil) ---------- */
const PROFIL_DEFAUT = { personnes: [
    { sexe: "homme", poids: 70 }, { sexe: "femme", poids: 60 }],
  exclusions: [], materiel: ["four", "poele", "casserole", "saladier", "cocotte", "sauteuse"],
  budget: 80, portionsParRecette: 4 };
function chargerProfil() {
  try { return Object.assign({}, PROFIL_DEFAUT, JSON.parse(localStorage.getItem("ns_profil") || "{}")); }
  catch (e) { return { ...PROFIL_DEFAUT }; }
}
function sauverProfil(p) { localStorage.setItem("ns_profil", JSON.stringify(p)); }
let profil = chargerProfil();

/* ---------- Calculs nutrition ---------- */
// Nutriments d'une recette entière (toutes portions) ; null si une valeur manque (tracé, jamais inventé)
function nutrimentsRecette(r) {
  const t = {}; let manquants = 0;
  for (const [cle] of NUTRIMENTS) t[cle] = 0;
  for (const [k, g] of r.ing) {
    const ing = ING[k];
    if (!ing) continue;
    for (const [cle] of NUTRIMENTS) {
      const v = ing[cle];
      if (v == null) { manquants++; continue; }
      t[cle] += v * g / 100;
    }
  }
  return { t, manquants };
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
    !r.ing.some(([k]) => exclusions.includes(k)));
}
function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Score d'un plan : couverture des repères PNNS + nutriments + budget. Pénalités douces.
function scorePlan(ids) {
  const recettes = ids.map(i => RECETTE_PAR_ID[i]);
  let s = 0;
  const types = {};
  let poisson = 0, gras = 0, legum = 0, viandeG = 0, charcG = 0, budget = 0;
  const tot = {}; for (const [cle] of NUTRIMENTS) tot[cle] = 0;
  for (const r of recettes) {
    types[r.t] = (types[r.t] || 0) + 1;
    if (r.t === "poisson_maigre" || r.t === "poisson_gras") poisson++;
    if (r.t === "poisson_gras") gras++;
    if (r.t === "legumineuses" || r.t === "vege") legum++;
    // portions/personne : recette de 4 portions pour 2 personnes = 2 portions/pers -> g/pers = g/2
    viandeG += grammesParSemaine(r, VIANDE_ROUGE) / 2;
    charcG += grammesParSemaine(r, CHARCUTERIE) / 2;
    budget += coutRecette(r);
    const { t } = nutrimentsRecette(r);
    for (const [cle] of NUTRIMENTS) tot[cle] += t[cle];
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
  for (const r of recettes) if ((r.m || []).length < 12) s += 1.5;
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
    const sc = scorePlan(ids);
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
    const sc = scorePlan(essai);
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
function cleSemaine() { return semaine.getFullYear() + "-S" + isoSemaine(semaine); }
function moisSemaine() { return semaine.getMonth() + 1; }

/* ---------- État plan ---------- */
function chargerPlan() {
  const brut = localStorage.getItem("ns_plan_" + cleSemaine());
  if (brut) { try { const p = JSON.parse(brut); if (p.every(i => RECETTE_PAR_ID[i])) return p; } catch (e) {} }
  const plan = genererPlan(moisSemaine(), hashStr(cleSemaine()));
  localStorage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
  return plan;
}
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
let plan = chargerPlan();

/* ---------- Courses ---------- */
function coursesManuelles() { try { return JSON.parse(localStorage.getItem("ns_courses_" + cleSemaine()) || "[]"); } catch (e) { return []; } }
function sauverCoursesManuelles(l) { localStorage.setItem("ns_courses_" + cleSemaine(), JSON.stringify(l)); }
function listeCourses() {
  const echelle = profil.portionsParRecette / 4; // recettes écrites pour 4 portions
  const agg = {};
  for (const id of plan) {
    for (const [k, g] of RECETTE_PAR_ID[id].ing) {
      const ing = ING[k]; if (!ing) continue;
      if (!agg[k]) agg[k] = { nom: ing.nom, rayon: ing.rayon, g: 0, prix: 0 };
      agg[k].g += g * echelle;
      agg[k].prix += ing.prixKg * g * echelle / 1000;
    }
  }
  return agg;
}

/* ---------- Rendu ---------- */
const $ = s => document.querySelector(s);
const fmt = (v, u) => v == null ? "—" : (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + " " + u;
const eur = v => v.toFixed(2).replace(".", ",") + " €";

function rendreSemaine() {
  const mois = moisSemaine();
  $("#semLabel").textContent = "Semaine du " + semaine.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) +
    " · " + REF.mois[mois - 1];
  let budget = 0;
  const cartes = plan.map((id, idx) => {
    const r = RECETTE_PAR_ID[id]; budget += coutRecette(r);
    const tps = (r.p || 0) + (r.c || 0);
    const long = tps > 60;
    const manque = (r.mat || []).filter(m => !profil.materiel.includes(m));
    return `<div class="carte" data-id="${id}">
      <div class="repas-tete"><h2>${r.n}</h2></div>
      <span class="badge">${TYPE_LABEL[r.t] || r.t}</span>
      ${long ? '<span class="badge long">⏱ ' + tps + " min</span>" : ""}
      <div class="meta">Prépa ${r.p} min · cuisson ${r.c} min · ${profil.portionsParRecette} portions (dîner + restes pour le déjeuner)</div>
      ${manque.length ? `<div class="alternatives">Matériel manquant : ${manque.map(m => m + " → alternative : " + (ALT_MATERIEL[m] || "adapter")).join(" ; ")}</div>` : ""}
      <div class="actions">
        <button class="petit" data-act="detail">Détails</button>
        <button class="petit" data-act="relancer" data-idx="${idx}">Relancer ce repas</button>
      </div>
      <div class="detail masque">
        <h3>Ingrédients (${profil.portionsParRecette} portions)</h3>
        <ul>${r.ing.map(([k, g]) => { const ing = ING[k]; return ing ? `<li>${ing.nom} — ${Math.round(g * profil.portionsParRecette / 4)} g</li>` : ""; }).join("")}</ul>
        <h3>Préparation</h3>
        <ul>${(r.et || []).map(e => `<li>${e}</li>`).join("")}</ul>
      </div>
    </div>`;
  }).join("");
  $("#vue-semaine").innerHTML =
    `<div class="bandeau-budget"><span>Budget estimé des 7 dîners<br><small class="note">hypothèses de prix indicatives, hors fonds de placard</small></span>
     <span class="montant ${budget > profil.budget ? "ko" : "ok"}">${eur(budget)}</span></div>` + cartes +
    `<p class="note">Recettes de saison pour ${REF.mois[mois - 1]} (France métropolitaine) + recettes toute l'année. Hypothèses de l'app : prix indicatifs (pas des prix magasin), quantités crues CIQUAL sauf mention contraire, 2 personnes par défaut.</p>`;
}

function rendreBilan() {
  const echelle = profil.portionsParRecette / 4;
  const tot = {}; let manquants = 0;
  for (const [cle] of NUTRIMENTS) tot[cle] = 0;
  let viandeG = 0, charcG = 0, poissonOcc = 0, grasOcc = 0, legumOcc = 0, budget = 0;
  for (const id of plan) {
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
  const lignes = NUTRIMENTS.filter(([, , , refCle]) => refCle).map(([cle, nom, unite, refCle]) => {
    const parPers = tot[cle] / profil.personnes.length;
    const pct = Math.round(parPers / rnp[refCle] * 100);
    return `<tr><td>${nom}</td><td>${fmt(parPers, unite)}</td><td><div class="barre"><i style="width:${Math.min(pct, 100)}%"></i></div></td><td>${pct} %</td></tr>`;
  }).join("");
  const repere = (ok, txt) => `<li class="${ok ? "ok" : "ko"}">${ok ? "✓" : "✗"} ${txt}</li>`;
  $("#vue-bilan").innerHTML = `<div class="carte">
    <h2>Bilan de la semaine (repas planifiés)</h2>
    <p class="note">Périmètre : les 7 dîners planifiés et leurs restes pris au déjeuner, soit ~14 repas sur ~21 pour ${profil.personnes.length} personnes. Petits-déjeuners et autres repas non compris. Les pourcentages visent les références ANSES adultes moyennes (profil type, pas un avis médical) ; viser 100 % sur les seuls repas planifiés n'est pas l'objectif, les autres repas complètent.</p>
    <table><tr><th>Nutriment</th><th>Par personne / semaine</th><th></th><th>% repère hebdo</th></tr>${lignes}</table>
    <p class="note">${manquants} valeur(s) nutriment absente(s) de la table CIQUAL pour ces ingrédients : non comptées (jamais estimées à 0).</p>
    </div>
    <div class="carte reperes"><h2>Repères PNNS de la semaine</h2><ul>
      ${repere(poissonOcc >= 2, `Poisson : ${poissonOcc / 2} recette(s) cette semaine = ${poissonOcc} occasion(s)/personne avec les restes (repère : 2, dont 1 gras — ${grasOcc} occasion(s) gras)`)}
      ${repere(legumOcc >= 2, `Légumineuses / plats végétariens : ${legumOcc / 2} recette(s) = ${legumOcc} occasion(s)/personne (repère : 2)`)}
      ${repere(viandeG <= REF.reperes.viandeRouge_g_max_par_semaine, `Viande rouge (hors volaille) : ${Math.round(viandeG)} g/personne (max ${REF.reperes.viandeRouge_g_max_par_semaine} g)`)}
      ${repere(charcG <= REF.reperes.charcuterie_g_max_par_semaine, `Charcuterie : ${Math.round(charcG)} g/personne (max ${REF.reperes.charcuterie_g_max_par_semaine} g)`)}
      ${repere(budget <= profil.budget, `Budget estimé : ${eur(budget)} (cible ${eur(profil.budget)})`)}
    </ul>
    <p class="note">Les occasions comptent les restes : chaque dîner est aussi mangé au déjeuner du lendemain.</p></div>`;
}

function rendreCourses() {
  const agg = listeCourses();
  const rayons = {};
  let total = 0;
  for (const [k, v] of Object.entries(agg)) {
    (rayons[v.rayon] = rayons[v.rayon] || []).push([k, v]);
    total += v.prix;
  }
  const ordre = ["fruits_legumes", "boucherie", "poissonnerie", "charcuterie", "cremerie", "boulangerie", "feculents", "epicerie"];
  const noms = { fruits_legumes: "Fruits et légumes", boucherie: "Boucherie / volaille", poissonnerie: "Poissonnerie",
    charcuterie: "Charcuterie", cremerie: "Crèmerie", boulangerie: "Boulangerie", feculents: "Féculents", epicerie: "Épicerie", manuel: "Ajouts manuels" };
  let html = "";
  for (const r of ordre) {
    if (!rayons[r]) continue;
    html += `<h3 class="rayon-titre">${noms[r]}</h3>` + rayons[r].sort((a, b) => a[1].nom.localeCompare(b[1].nom))
      .map(([k, v]) => `<div class="ligne-course" data-cle="${k}"><span>${v.nom}</span><span class="qte">${v.g >= 1000 ? (v.g / 1000).toFixed(2).replace(".", ",") + " kg" : Math.round(v.g) + " g"} · ~${eur(v.prix)}</span></div>`).join("");
  }
  const manuels = coursesManuelles();
  if (manuels.length) html += `<h3 class="rayon-titre">${noms.manuel}</h3>` + manuels.map((m, i) =>
    `<div class="ligne-course"><span>${m}</span><button class="petit" data-act="supprManuel" data-idx="${i}">Retirer</button></div>`).join("");
  $("#vue-courses").innerHTML = `<div class="carte">
    <h2>Liste de courses — semaine du ${semaine.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</h2>
    <p class="note">Liste repartie de zéro chaque semaine, regroupée par rayon. Quantités pour ${profil.portionsParRecette} portions par recette. Les prix sont des hypothèses indicatives (pas relevés en magasin ; les conditionnements réels peuvent faire varier le total).</p>
    ${html}
    <p class="total-courses">Total estimé : ${eur(total)}</p>
    <form class="ajout" id="formAjout"><input id="ajoutTxt" placeholder="Ajouter un article (ex. café, papier cuisson)…" required><button>Ajouter</button></form>
  </div>`;
  $("#formAjout").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("#ajoutTxt").value.trim(); if (!v) return;
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
    <p class="note">Ces réglages restent enregistrés sur cet appareil uniquement (pas de compte, pas de synchronisation entre appareils). Le profil nutritionnel utilisé est un profil type d'adulte (références ANSES), pas une analyse personnalisée.</p>
    <div class="champ"><label>Nombre de personnes</label>
      <input type="number" id="nbPers" min="1" max="8" value="${profil.personnes.length}"></div>
    <div class="champ"><label>Portions cuisinées par recette (dîner + restes)</label>
      <input type="number" id="nbPortions" min="2" max="12" value="${profil.portionsParRecette}"></div>
    <div class="champ"><label>Budget cible des 7 dîners (€)</label>
      <input type="number" id="budget" min="20" max="300" value="${profil.budget}"></div>
    <div class="champ"><label>Exclusions alimentaires du foyer</label><div class="coches" id="cochesExc">
      ${exclusions.map(([pat, label]) => `<label><input type="checkbox" value="${pat}" ${profil.exclusions.some(e => pat.includes(e)) ? "checked" : ""}> ${label}</label>`).join("")}</div></div>
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
    profil.budget = Math.max(20, +$("#budget").value || 80);
    const exc = [];
    document.querySelectorAll("#cochesExc input:checked").forEach(c => exc.push(...c.value.split("|")));
    profil.exclusions = exc.filter(e => ING[e] || e === "poisson");
    profil.materiel = [...document.querySelectorAll("#cochesMat input:checked")].map(c => c.value);
    sauverProfil(profil);
    plan = genererPlan(moisSemaine(), hashStr(cleSemaine() + Date.now()));
    localStorage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
    rendreTout();
    activerVue("semaine");
  });
}

/* ---------- Exclusions poisson (type, pas ingrédient) ---------- */
const poolDuMoisOrig = poolDuMois;
poolDuMois = function (mois, exclusions) {
  const sansPoisson = exclusions.includes("poisson");
  const exc = exclusions.filter(e => e !== "poisson");
  return RECETTES.filter(r => (r.m || []).includes(mois) &&
    !(sansPoisson && (r.t === "poisson_maigre" || r.t === "poisson_gras")) &&
    !r.ing.some(([k]) => exc.includes(k)));
};

/* ---------- Interactions ---------- */
function activerVue(nom) {
  document.querySelectorAll(".onglets button").forEach(b => b.classList.toggle("actif", b.dataset.vue === nom));
  document.querySelectorAll(".vue").forEach(v => v.classList.toggle("actif", v.id === "vue-" + nom));
}
document.querySelectorAll(".onglets button").forEach(b => b.addEventListener("click", () => activerVue(b.dataset.vue)));
$("#semPrec").addEventListener("click", () => { semaine.setDate(semaine.getDate() - 7); plan = chargerPlan(); rendreTout(); });
$("#semSuiv").addEventListener("click", () => { semaine.setDate(semaine.getDate() + 7); plan = chargerPlan(); rendreTout(); });
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  if (b.dataset.act === "detail") b.closest(".carte").querySelector(".detail").classList.toggle("masque");
  if (b.dataset.act === "relancer") {
    plan = relancerRepas(plan, +b.dataset.idx, moisSemaine(), hashStr(cleSemaine() + ":" + Date.now()));
    localStorage.setItem("ns_plan_" + cleSemaine(), JSON.stringify(plan));
    rendreTout();
  }
  if (b.dataset.act === "supprManuel") {
    const l = coursesManuelles(); l.splice(+b.dataset.idx, 1); sauverCoursesManuelles(l); rendreCourses();
  }
});
function rendreTout() { rendreSemaine(); rendreBilan(); rendreCourses(); rendreProfil(); }
rendreTout();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
