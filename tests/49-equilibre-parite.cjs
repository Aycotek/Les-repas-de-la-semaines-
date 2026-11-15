/* Parité or : equilibre.js (JS) vs générateur Python audité v5.1 (9584769cf4db).
   120 semaines synthétiques (trous aléatoires, scales, 3 modes) calculées des deux côtés :
   stats affichées et listes de violations doivent être STRICTEMENT identiques. */
const assert = require("node:assert/strict");
const EQ = require("../equilibre.js");
const cases = require("./fixtures-equilibre.json");
let n = 0;
for (const [i, c] of cases.entries()) {
  const tg = EQ.targets(c.mode);
  const s = EQ.displayStats(EQ.weekStats(c.week, c.scales));
  assert.deepEqual(s, c.stats, `cas ${i} stats (${c.mode})`);
  const v = EQ.violations(c.week, tg, c.scales);
  assert.deepEqual(v, c.violations, `cas ${i} violations (${c.mode})`);
  n++;
}
console.log(`${n} semaines synthétiques : stats + violations identiques au générateur audité. Aucun écart.`);
