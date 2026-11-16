// Une fiche ne doit jamais afficher un total de calories partiel si un ingrédient n'a pas de valeur.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.join(__dirname, '..');
const store = {}, els = {};
const el = s => els[s] ||= { innerHTML: '', textContent: '', value: '', classList: { toggle() {}, add() {} }, addEventListener() {}, setAttribute() {}, querySelector() { return el('child'); }, dataset: {} };
const ctx = { console, Date, Math, JSON, module: { exports: {} }, navigator: {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = v }, document: { querySelector: el, querySelectorAll: () => [], addEventListener() {} } };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['references', 'ingredients', 'recipes-hiver', 'recipes-printemps', 'recipes-ete', 'recipes-automne', 'recipes-toute-annee']) vm.runInContext(fs.readFileSync(path.join(root, 'data', f + '.js'), 'utf8'), ctx);
for (const f of ['allergenes', 'illustrations']) vm.runInContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'equilibre.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), ctx);
const a = ctx.module.exports;
let inc = 0, comp = 0;
for (const r of a.RECETTES) {
  const n = a.nutrimentsRecette(r), txt = a.kcalPortionTexte(r);
  if (n.absents.kcal > 0) { inc++; assert.match(txt, /non calculables/); assert.doesNotMatch(txt, /\d/); }
  else { comp++; assert.equal(txt, '~' + Math.round(n.t.kcal / 4) + ' kcal/portion'); }
}
for (const id of ['p24', 'p36', 'e22']) assert.equal(a.kcalPortionCalculable(a.RECETTES.find(r => r.i === id)), false, id);
assert.equal(inc, 3);
console.log(`kcal-partielles OK : ${inc} fiches non calculables, ${comp} fiches chiffrées inchangées.`);
