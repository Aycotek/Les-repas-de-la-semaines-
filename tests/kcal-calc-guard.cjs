// Garde de cohérence kcal "calc" : pour chaque ingrédient kcalSrc=calc,
// kcal == 4*prot + 4*gluc + 9*lip + 2*fibres + 7*alcool (UE 1169/2011).
// Couvre : facteur alcool (B1, contre-vérification 15/11/2026) et dépendance
// « recalculer kcal quand un macro change » (cas pecorino n12→n13b).
// L'alcool vient de la fixture tests/alcool-2020.json (CIQUAL 2020 par code).
require('../data/ingredients.js');
const fs = require('fs');
const alc = JSON.parse(fs.readFileSync(__dirname + '/alcool-2020.json', 'utf8')).byCiqual;
const ings = globalThis.INGREDIENTS;
let n = 0; const bad = [];
for (const [k, ing] of Object.entries(ings)) {
  if (ing.kcalSrc !== 'calc') continue;
  n++;
  const al = alc[ing.ciqual] || 0;
  const calc = 4 * (ing.prot || 0) + 4 * (ing.gluc || 0) + 9 * (ing.lip || 0) + 2 * (ing.fibres || 0) + 7 * al;
  if (Math.abs(calc - ing.kcal) > 0.15) bad.push(`${k}: livré ${ing.kcal} vs recomputé ${calc.toFixed(1)}`);
}
if (bad.length) { console.error('ÉCHEC kcal-calc-guard:\n' + bad.join('\n')); process.exit(1); }
console.log(`kcal-calc-guard OK : ${n} ingrédients kcalSrc=calc cohérents (4/4/9/2/7).`);
