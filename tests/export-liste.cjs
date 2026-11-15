/* Tests de l'export de la liste de courses (fonctions pures). node tests/export-liste.cjs */
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
let n = 0;
const test = (name, fn) => { try { fn(); n++; console.log('  ok -', name); } catch (e) { console.error('KO -', name, '->', e.message); process.exitCode = 1; } };

const RAYONS = ['Fruits et légumes', 'Boucherie / volaille', 'Poissonnerie', 'Charcuterie', 'Crèmerie', 'Boulangerie', 'Féculents', 'Épicerie'];

a.setPlan(a.genererPlan(11, 7));

test('titre daté en tête', () => {
  const { texte } = a.texteListeCourses(false);
  assert.ok(texte.startsWith('Liste de courses - semaine du '), texte.slice(0, 60));
});

test('rayons dans l’ordre fixe, accents préservés', () => {
  const { texte } = a.texteListeCourses(false);
  let pos = -1, trouves = 0;
  for (const r of RAYONS) {
    const i = texte.indexOf('\n' + r + '\n');
    if (i === -1) continue;
    assert.ok(i > pos, r + ' hors ordre');
    pos = i; trouves++;
  }
  assert.ok(trouves >= 3, 'au moins 3 rayons');
});

test('chaque ligne article : quantité puis nom', () => {
  const { texte } = a.texteListeCourses(false);
  const lignes = texte.split('\n').filter(l => l.startsWith('- '));
  assert.ok(lignes.length >= 10, 'liste non vide');
  for (const l of lignes) assert.match(l, /^- \S+( \S+)? .+/);
});

test('quantité d’achat seule, sans la note nutritionnelle', () => {
  const { texte } = a.texteListeCourses(false);
  assert.ok(!texte.includes('pour le calcul nutritionnel'));
  assert.ok(!texte.includes('≈'));
});

test('articles cochés exclus de l’export restant, présents dans l’export complet', () => {
  const agg = a.listeCourses();
  const k = Object.keys(agg)[0];
  const nom = agg[k].nom;
  store['ns_coches_' + a.cleSemaine()] = JSON.stringify([k]);
  assert.ok(!a.texteListeCourses(true).texte.includes(nom), 'coché encore présent');
  assert.ok(a.texteListeCourses(false).texte.includes(nom), 'absent de l’export complet');
  store['ns_coches_' + a.cleSemaine()] = '[]';
});

test('tout coché : message explicite, aucun article', () => {
  const keys = Object.keys(a.listeCourses());
  store['ns_coches_' + a.cleSemaine()] = JSON.stringify(keys);
  const res = a.texteListeCourses(true);
  assert.equal(res.articles, 0);
  assert.ok(res.texte.includes('aucun article restant'));
  store['ns_coches_' + a.cleSemaine()] = '[]';
});

test('articles manuels inclus et comptés', () => {
  store['ns_courses_' + a.cleSemaine()] = JSON.stringify(['Café 1 paquet']);
  const res = a.texteListeCourses(true);
  assert.ok(res.texte.includes('Ajouts manuels\n- Café 1 paquet'));
  const sans = a.texteListeCourses(true).articles;
  store['ns_courses_' + a.cleSemaine()] = JSON.stringify(['Café 1 paquet', 'Papier cuisson']);
  assert.equal(a.texteListeCourses(true).articles, sans + 1);
  store['ns_courses_' + a.cleSemaine()] = '[]';
});

test('8 portions double les quantités exportées', () => {
  const base = JSON.parse(JSON.stringify(a.getProfil()));
  const agg = a.listeCourses();
  const k = Object.keys(agg).find(x => agg[x].g >= 10);
  const ligne1 = a.texteListeCourses(false).texte.split('\n').find(l => l.endsWith(' ' + agg[k].nom));
  a.setProfil({ ...base, portionsParRecette: 8 });
  const ligne2 = a.texteListeCourses(false).texte.split('\n').find(l => l.endsWith(' ' + agg[k].nom));
  a.setProfil(base);
  const val = l => parseFloat(l.replace('- ', '').replace(',', '.').split(' ')[0]);
  const q1 = val(ligne1), q2 = val(ligne2);
  const kg1 = ligne1.includes('kg'), kg2 = ligne2.includes('kg');
  const g1 = kg1 ? q1 * 1000 : q1, g2 = kg2 ? q2 * 1000 : q2;
  assert.ok(Math.abs(g2 - g1 * 2) < 1, `${ligne1} vs ${ligne2}`);
});

test('le compte d’articles correspond aux lignes', () => {
  const res = a.texteListeCourses(true);
  const lignes = res.texte.split('\n').filter(l => l.startsWith('- ')).length;
  assert.equal(res.articles, lignes);
});

test('caractères spéciaux des articles manuels exportés tels quels', () => {
  store['ns_courses_' + a.cleSemaine()] = JSON.stringify(['<b>Crème</b> & "œufs"']);
  const res = a.texteListeCourses(true);
  assert.ok(res.texte.includes('- <b>Crème</b> & "œufs"'), 'texte brut conservé, pas de balise interprétée');
  store['ns_courses_' + a.cleSemaine()] = '[]';
});

test('articles triés par nom dans chaque rayon', () => {
  const agg = a.listeCourses();
  const parRayon = {};
  for (const v of Object.values(agg)) (parRayon[v.rayon] = parRayon[v.rayon] || []).push(v.nom);
  const { texte } = a.texteListeCourses(false);
  const T = texte + '\n';
  for (const r of Object.keys(parRayon)) {
    let pos = -1;
    for (const nom of [...parRayon[r]].sort((x, y) => x.localeCompare(y))) {
      const i = T.indexOf(' ' + nom + '\n', pos + 1);
      assert.ok(i > pos, nom + ' hors ordre dans ' + r);
      pos = i;
    }
  }
});

const CLES_RAYONS = ['fruits_legumes', 'boucherie', 'poissonnerie', 'charcuterie', 'cremerie', 'boulangerie', 'feculents', 'epicerie'];

test('frontière structurée : métadonnées et comptes cohérents', () => {
  const s = a.listeCoursesStructuree(false);
  assert.equal(s.version, 1);
  assert.match(s.semaine, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(s.semaine + 'T12:00:00').getDay(), 1, 'semaine = lundi');
  assert.equal(typeof s.portionsParRecette, 'number');
  assert.equal(s.restantSeulement, false);
  assert.ok(Array.isArray(s.articles) && s.articles.length > 10, 'liste non vide');
  assert.equal(s.nombreArticles, s.articles.length + s.ajoutsManuels.length);
});

test('frontière structurée : chaque article porte id, nom, rayon valide et poids numériques', () => {
  for (const art of a.listeCoursesStructuree(false).articles) {
    assert.ok(typeof art.id === 'string' && art.id.length > 0, 'id');
    assert.ok(typeof art.nom === 'string' && art.nom.length > 0, 'nom');
    assert.ok(CLES_RAYONS.includes(art.rayon), 'rayon inconnu : ' + art.rayon);
    assert.equal(typeof art.rayonNom, 'string');
    assert.equal(typeof art.grammesNet, 'number');
    assert.equal(typeof art.grammesAchat, 'number');
    assert.ok(art.grammesAchat >= art.grammesNet - 0.001, art.nom + ' : achat < net');
  }
});

test('frontière structurée : poids d’achat égal au net pour les produits sans rendement', () => {
  const arts = a.listeCoursesStructuree(false).articles;
  const egaux = arts.filter(x => Math.abs(x.grammesAchat - x.grammesNet) < 0.001);
  assert.ok(egaux.length > arts.length / 2, 'un rendement ne doit pas être appliqué aux produits sans os ni coquille');
  const superieur = arts.find(x => x.grammesAchat > x.grammesNet + 0.001);
  if (superieur) assert.ok(superieur.grammesAchat < superieur.grammesNet * 10, superieur.nom + ' : ratio achat/net invraisemblable');
});

test('frontière structurée : articles cochés exclus du reste, présents au complet', () => {
  const agg = a.listeCourses();
  const k = Object.keys(agg)[0];
  store['ns_coches_' + a.cleSemaine()] = JSON.stringify([k]);
  assert.ok(!a.listeCoursesStructuree(true).articles.some(x => x.id === k), 'coché encore présent');
  assert.ok(a.listeCoursesStructuree(false).articles.some(x => x.id === k), 'absent du complet');
  assert.equal(a.listeCoursesStructuree(true).restantSeulement, true);
  store['ns_coches_' + a.cleSemaine()] = '[]';
});

test('frontière structurée : 8 portions doublent les grammes', () => {
  const base = JSON.parse(JSON.stringify(a.getProfil()));
  const avant = a.listeCoursesStructuree(false).articles;
  a.setProfil({ ...base, portionsParRecette: 8 });
  const apres = a.listeCoursesStructuree(false).articles;
  a.setProfil(base);
  const src = avant.find(x => x.grammesNet > 5);
  const cible = apres.find(x => x.id === src.id);
  assert.ok(Math.abs(cible.grammesNet - src.grammesNet * 2) < 0.5, `${src.id} : ${src.grammesNet} vs ${cible.grammesNet}`);
});

test('frontière structurée : le texte copié dérive de la même source de données', () => {
  store['ns_courses_' + a.cleSemaine()] = JSON.stringify(['Café 1 paquet']);
  const s = a.listeCoursesStructuree(true);
  const { texte, articles } = a.texteListeCourses(true);
  assert.equal(articles, s.nombreArticles, 'compte texte != compte structuré');
  for (const art of s.articles) assert.ok(texte.includes(art.nom), art.nom + ' absent du texte');
  for (const m of s.ajoutsManuels) assert.ok(texte.includes('- ' + m), m + ' absent du texte');
  store['ns_courses_' + a.cleSemaine()] = '[]';
});

console.log(n + ' tests export-liste passés.');
