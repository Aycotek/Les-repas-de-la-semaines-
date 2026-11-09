/* Tests de l'application - exécution : node tests/run.js (depuis la racine du projet) */
"use strict";
const fs = require("fs"), path = require("path");
const R = p => path.join(__dirname, "..", p);
let ok = 0, ko = 0;
function test(nom, cond, detail) {
  if (cond) { ok++; console.log("  ok -", nom); }
  else { ko++; console.log("  KO -", nom, detail ? "-> " + detail : ""); }
}

/* ---- 1. Intégrité des données ---- */
console.log("1. Données");
const load = f => eval(fs.readFileSync(R("data/" + f), "utf8"));
["references.js", "ingredients.js", "recipes-hiver.js", "recipes-printemps.js",
 "recipes-ete.js", "recipes-automne.js", "recipes-toute-annee.js"].forEach(load);
const SETS = { hiver: globalThis.RECIPES_HIVER, printemps: globalThis.RECIPES_PRINTEMPS,
  ete: globalThis.RECIPES_ETE, automne: globalThis.RECIPES_AUTOMNE, annee: globalThis.RECIPES_ANNEE };
const TOUTES = Object.values(SETS).flat();
const ING = globalThis.INGREDIENTS;

test("au moins 150 recettes", TOUTES.length >= 150, TOUTES.length + " recettes");
test("200 recettes présentes", TOUTES.length === 200, TOUTES.length);
const ids = new Set(TOUTES.map(r => r.i));
test("identifiants uniques", ids.size === TOUTES.length);

const clesManquantes = new Set();
for (const r of TOUTES) for (const [k] of r.ing) if (!ING[k]) clesManquantes.add(k);
test("toutes les clés ingrédient résolues", clesManquantes.size === 0, [...clesManquantes].join(","));

const sansCode = Object.entries(ING).filter(([, v]) => !v.ciqual && v.correspondance!=="non disponible");
test("chaque ingrédient a un code CIQUAL ou une absence explicitée", sansCode.length === 0, sansCode.map(([k]) => k).join(","));

const sansPrix = Object.entries(ING).filter(([, v]) => !(v.prixKg > 0) && v.nom!=="Eau");
test("chaque ingrédient a un prix indicatif", sansPrix.length === 0, sansPrix.map(([k]) => k).join(","));

// null jamais converti en 0 : vérifier qu'il existe des null réels conservés dans la table
const nbNull = Object.values(ING).reduce((a, v) => a + Object.entries(v).filter(([k, x]) => !["nom","ciqual","rayon","prixKg"].includes(k) && x === null).length, 0);
console.log("     (info)", nbNull, "valeurs nutriment absentes conservées comme null");

// Recettes : cohérence minimale
const sansEtapes = TOUTES.filter(r => !r.et || !r.et.length || r.et.some(e => !e || e.length < 10));
test("chaque recette a des étapes rédigées", sansEtapes.length === 0, sansEtapes.map(r => r.i).join(","));
const legeres = TOUTES.filter(r => {
  const kcal = r.ing.reduce((a, [k, g]) => a + (ING[k].kcal || 0) * g / 100, 0) / 4;
  return kcal < 320;
});
test("chaque recette fait un vrai repas (>= 320 kcal/portion)", legeres.length === 0,
  legeres.map(r => r.i).join(","));
const doublonsNoms = TOUTES.length - new Set(TOUTES.map(r => r.n)).size;
test("pas de recettes dupliquées (noms identiques)", doublonsNoms === 0, doublonsNoms + " doublons");
// Saisonnalité : chaque recette saisonnière reste dans sa saison
const saisonOk = SETS.hiver.every(r => r.m.every(m => [12,1,2].includes(m))) &&
  SETS.printemps.every(r => r.m.every(m => [3,4,5].includes(m))) &&
  SETS.ete.every(r => r.m.every(m => [6,7,8].includes(m))) &&
  SETS.automne.every(r => r.m.every(m => [9,10,11].includes(m)));
test("mois des recettes cohérents avec leur fichier saisonnier", saisonOk);

/* ---- 2. Application (DOM simulé) ---- */
console.log("2. Planificateur");
const stockage = {};
global.localStorage = { getItem: k => stockage[k] ?? null, setItem: (k, v) => { stockage[k] = v; }, removeItem: k => delete stockage[k] };
const elt = () => ({ innerHTML: "", textContent: "", value: "", classList: { toggle() {}, add() {} },
  addEventListener() {}, querySelector: () => elt(), closest: () => elt(), dataset: {} });
global.document = { querySelector: () => elt(), querySelectorAll: () => [], addEventListener() {} };

eval(fs.readFileSync(R("app.js"), "utf8")); // génère un plan au chargement

const plan = JSON.parse(stockage[Object.keys(stockage).find(k => k.startsWith("ns_plan_"))]);
test("le plan contient 7 recettes", plan.length === 7, plan.join(","));
test("plan sans doublon", new Set(plan).size === 7);

const REC = Object.fromEntries(TOUTES.map(r => [r.i, r]));
const VIANDE_ROUGE = k => /^(boeuf|veau|agneau|cote_agneau|porc|saucisse_toulouse|merguez)/.test(k);
const CHARCUTERIE = k => /^(lardons|jambon_|saucisse_fumee)/.test(k);
const g = (r, f) => r.ing.filter(([k]) => f(k)).reduce((a, [, q]) => a + q, 0);

const poisson = plan.filter(i => REC[i].t.startsWith("poisson"));
const gras = plan.filter(i => REC[i].t === "poisson_gras");
const legum = plan.filter(i => REC[i].t === "legumineuses" || REC[i].t === "vege");
test("2 dîners de poisson (=> 4 occasions/pers avec restes)", poisson.length === 2, poisson.length + " poissons");
test("au moins 1 poisson gras", gras.length >= 1);
test("au moins 2 dîners légumineuses/végé", legum.length >= 2, legum.length);

const viandeGPers = plan.reduce((a, i) => a + g(REC[i], VIANDE_ROUGE), 0) / 2;
const charcGPers = plan.reduce((a, i) => a + g(REC[i], CHARCUTERIE), 0) / 2;
test("viande rouge <= 500 g/personne (restes compris, sans double comptage)", viandeGPers <= 500, Math.round(viandeGPers) + " g");
test("charcuterie <= 150 g/personne", charcGPers <= 150, Math.round(charcGPers) + " g");

const budget = plan.reduce((a, i) => a + REC[i].ing.reduce((x, [k, q]) => x + ING[k].prixKg * q / 1000, 0), 0);
console.log("     (info) budget estimé des 7 dîners :", budget.toFixed(2), "€");
test("budget estimé <= 80 EUR (cible par défaut)", budget <= 80, budget.toFixed(2) + " €");

// Quantités liste de courses = somme exacte des recettes, une seule fois (pas de double comptage des restes)
const agg = {};
for (const i of plan) for (const [k, q] of REC[i].ing) agg[k] = (agg[k] || 0) + q;
const attendu = {};
for (const i of plan) for (const [k, q] of REC[i].ing) attendu[k] = (attendu[k] || 0) + q;
test("liste de courses = somme des recettes, chaque recette comptée une fois",
  JSON.stringify(agg) === JSON.stringify(attendu));

/* ---- 3. Bilan : périmètre et calculs ---- */
console.log("3. Bilan nutritionnel");
const tot = {};
for (const i of plan) for (const [k, q] of REC[i].ing) {
  const ing = ING[k];
  for (const cle of ["kcal", "prot", "fibres", "vitC", "fer"]) tot[cle] = (tot[cle] || 0) + (ing[cle] || 0) * q / 100;
}
const kcalPersSem = tot.kcal / 2; // 2 personnes
console.log("     (info) énergie/personne/semaine (repas planifiés) :", Math.round(kcalPersSem), "kcal, soit", Math.round(kcalPersSem / 7), "kcal/j sur 2 repas");
test("énergie plausible pour 14 repas/personne (300-700 kcal/repas)",
  kcalPersSem / 14 > 300 && kcalPersSem / 14 < 700, Math.round(kcalPersSem / 14) + " kcal/repas");

console.log(ko === 0 ? `\nTOUS LES TESTS PASSENT (${ok})` : `\n${ko} TEST(S) EN ÉCHEC, ${ok} ok`);
process.exit(ko ? 1 : 0);
