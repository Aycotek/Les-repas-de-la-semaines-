/* Propagation « inconnu ≠ 0 » sur les VRAIES données de l'app :
   un champ de critère est troué pour une recette dès qu'UN ingrédient a ce champ à null.
   Le jeu de recettes trouées doit coïncider avec le dataset audité (recipes300_v5baseline.json). */
const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path"), assert = require("node:assert/strict");
const root = path.join(__dirname, "..");
const ctx = { console, module: { exports: {} } }; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["references", "ingredients", "recipes-hiver", "recipes-printemps", "recipes-ete", "recipes-automne", "recipes-toute-annee"])
  vm.runInContext(fs.readFileSync(path.join(root, "data", f + ".js"), "utf8"), ctx);
const ING = ctx.INGREDIENTS;
const RECETTES = [...ctx.RECIPES_HIVER, ...ctx.RECIPES_PRINTEMPS, ...ctx.RECIPES_ETE, ...ctx.RECIPES_AUTOMNE, ...ctx.RECIPES_ANNEE];
const CHAMPS = ["kcal", "prot", "gluc", "sucres", "lip", "ags", "fibres", "sel"]; // critères (alcool hors critères)

// côté app : trous calculés sur les données vivantes
const trousApp = {};
for (const r of RECETTES) {
  const t = [];
  for (const cle of CHAMPS) if (r.ing.some(([k]) => (!ING[k] || ING[k][cle] == null))) t.push(cle);
  if (t.length) trousApp[r.i] = t.sort();
}

// côté dataset audité
const ds = JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures-v5baseline-historical.json"), "utf8"));
const proto = ds.recipes || ds;
const trousProto = {};
for (const r of proto) if (r.holes && r.holes.length) trousProto[r.id] = r.holes.slice().sort();

const idsApp = new Set(Object.keys(trousApp)), idsProto = new Set(Object.keys(trousProto));
const seulementApp = [...idsApp].filter(id => !idsProto.has(id));
const seulementProto = [...idsProto].filter(id => !idsApp.has(id));
const differents = Object.keys(trousApp).filter(id => idsProto.has(id) && JSON.stringify(trousApp[id]) !== JSON.stringify(trousProto[id]));

console.log(`recettes app: ${RECETTES.length} | trouées app: ${idsApp.size} | trouées dataset audité: ${idsProto.size}`);
// New source-policy: traces and bounds are not point values. This legitimately diverges from the frozen engine dataset.
const affected={chataigne_cuite:["sucres"],polenta:["sucres"],pruneau:["sel"]};
const expected=JSON.parse(JSON.stringify(trousProto));
for(const r of RECETTES){
  const extra=r.ing.flatMap(([k])=>affected[k]||[]);
  if(extra.length) expected[r.i]=[...new Set([...(expected[r.i]||[]),...extra])].sort();
}
assert.deepEqual(trousApp,expected,"Unexpected coverage difference outside documented rejected source fills");
console.log("Historical baseline differs only by documented rejection of traces/bounds. Current holes: "+idsApp.size+"/300 (not the former 65/300).");

// nutriments de recette avec propagation (inconnu ≠ 0) : champ None si troué, sinon somme complète
function nutrimentsV5(r) {
  const t = {};
  for (const cle of CHAMPS) {
    if (r.ing.some(([k]) => (!ING[k] || ING[k][cle] == null))) { t[cle] = null; continue; }
    t[cle] = r.ing.reduce((s, [k, g]) => s + (ING[k] ? ING[k][cle] * g / 100 : 0), 0);
  }
  return t;
}
module.exports = { trousApp, nutrimentsV5 };
if (require.main === module) console.log("OK");
