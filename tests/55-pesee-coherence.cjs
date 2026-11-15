// Garde-fou « base de pesée » (option C, préparation 15/11/2026) :
// - tout ingrédient utilisé par une recette doit avoir une base de pesée déclarée
//   dans data/pesee-bases.json (sinon la recette s'ajoute sans convention vérifiée) ;
// - la base déclarée doit être compatible avec l'état de la ligne CIQUAL mappée
//   (égoutté/cuit uniquement si ligne cuite/appertisée ; sec/cru sinon).
// Aucune valeur n'est modifiée : c'est un verrou pour les futurs ajouts.
require('../data/ingredients.js');
for (const f of ['recipes-hiver','recipes-printemps','recipes-ete','recipes-automne','recipes-toute-annee']) require('../data/' + f + '.js');
const fs = require('fs');
const bases = JSON.parse(fs.readFileSync(__dirname + '/../data/pesee-bases.json', 'utf8')).bases;
const ING = globalThis.INGREDIENTS;
const all = [].concat(globalThis.RECIPES_HIVER, globalThis.RECIPES_PRINTEMPS, globalThis.RECIPES_ETE, globalThis.RECIPES_AUTOMNE, globalThis.RECIPES_ANNEE);
const err = [];
let couples = 0;
for (const r of all) for (const [k] of r.ing) {
  couples++;
  if (!ING[k]) { err.push(`${r.i}: ingrédient ${k} absent de la table`); continue; }
  const b = bases[k];
  if (!b) { err.push(`${r.i}: base de pesée non déclarée pour ${k}`); continue; }
  const e = ING[k].etat || '';
  if (b.base === 'égoutté/cuit' && !e.startsWith('cuit')) err.push(`${k}: base égoutté/cuit mais état « ${e} »`);
  if ((b.base === 'sec/cru' || b.base === 'cru' || b.base === 'sec') && e.startsWith('cuit')) err.push(`${k}: base ${b.base} mais état « ${e} »`);
}
if (err.length) { console.error('ÉCHEC pesee-coherence:\n' + [...new Set(err)].join('\n')); process.exit(1); }
console.log(`pesee-coherence OK : ${couples} couples recette×ingrédient couverts, ${Object.keys(bases).length} bases déclarées.`);
