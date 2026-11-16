/* Régression filtre « poisson » : une seiche (mollusque) ne doit plus passer le filtre poisson,
   sans confondre les allergènes (mollusques/crustacés restent des filtres distincts qui n'excluent pas le poisson).
   Vérifie aussi que le menu enregistré est préservé : seuls les plats en conflit sont remplacés.
   node tests/filtre-poisson.cjs */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const setup=fs.readFileSync(path.join(__dirname,'extended.js'),'utf8').split('const a=ctx.module.exports')[0];
const {ctx,store}=new Function('require','__dirname',setup+';return {ctx,store};')(require,__dirname);
const a=ctx.module.exports,by=Object.fromEntries(a.RECETTES.map(r=>[r.i,r]));
const base=JSON.parse(JSON.stringify(a.getProfil()));
let n=0;const test=(name,fn)=>{try{fn();n++;}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;}};

const seiche=by['p31']; // Poêlée de seiches aux petits pois à la française (type fruits_mer, allergène mollusques)
assert.ok(seiche && seiche.t==='fruits_mer','p31 doit être la poêlée de seiches');
const fruitsMer=a.RECETTES.filter(r=>r.t==='fruits_mer');
const poissons=a.RECETTES.filter(r=>String(r.t).startsWith('poisson'));
assert.ok(fruitsMer.length>=5 && poissons.length>=10,'catalogue attendu');

for(const filtre of ['allergen:poisson','evite:poisson_gout']){
 test(`${filtre}: la poêlée de seiches est exclue`,()=>assert.ok(a.estExclue(seiche,[filtre])));
 test(`${filtre}: tous les plats fruits de mer et poissons sont exclus`,()=>{
   for(const r of [...fruitsMer,...poissons])assert.ok(a.estExclue(r,[filtre]),r.i+' '+r.n);});
 test(`${filtre}: génération avril propre sur 50 graines`,()=>{
   a.setProfil({...base,exclusions:[filtre]});
   for(let seed=1;seed<=50;seed++){const p=a.genererPlan(4,seed);
     for(const id of p)assert.ok(!a.estExclue(by[id],[filtre]),id);}
   a.setProfil(base);});
 test(`${filtre}: des recettes hors mer restent proposées`,()=>{
   const compat=a.RECETTES.filter(r=>!a.estExclue(r,[filtre]));
   assert.ok(compat.length>=150,compat.length);
   assert.ok(compat.some(r=>r.t==='volaille')&&compat.some(r=>r.t==='vege'));});
}

test('allergen:poisson exclut encore les poissons (saumon)',()=>{
  const saumon=a.RECETTES.find(r=>r.ing.some(([k])=>k==='saumon_pavé'));
  assert.ok(a.estExclue(saumon,['allergen:poisson']));});
test('allergen:mollusques ne change pas : exclut la seiche, pas le saumon',()=>{
  assert.ok(a.estExclue(seiche,['allergen:mollusques']));
  const saumon=a.RECETTES.find(r=>r.ing.some(([k])=>k==='saumon_pavé'));
  assert.ok(!a.estExclue(saumon,['allergen:mollusques']));});
test('allergen:crustaces ne change pas : exclut la crevette, pas la seiche ni le saumon',()=>{
  const crevette=a.RECETTES.find(r=>r.ing.some(([k])=>k.startsWith('crevette')));
  assert.ok(a.estExclue(crevette,['allergen:crustaces']));
  const saumon=a.RECETTES.find(r=>r.ing.some(([k])=>k==='saumon_pavé'));
  assert.ok(!a.estExclue(saumon,['allergen:crustaces']));});
test('evite:fruits_de_mer reste disponible et distinct',()=>{
  assert.ok(ctx.EVITE.some(e=>e.id==='fruits_de_mer'));
  assert.ok(a.estExclue(seiche,['evite:fruits_de_mer']));});
test('autres exclusions inchangées : bœuf et volaille passent le filtre poisson',()=>{
  const boeuf=a.RECETTES.find(r=>r.t==='viande'), volaille=a.RECETTES.find(r=>r.t==='volaille');
  for(const f of ['allergen:poisson','evite:poisson_gout']){
    assert.ok(!a.estExclue(boeuf,[f]));assert.ok(!a.estExclue(volaille,[f]));}});
test('mot-clé libre inchangé : mot:courgette épargne la seiche',()=>{
  assert.ok(!a.estExclue(seiche,['mot:courgette']));});

test('menu enregistré préservé : seul le plat en conflit est remplacé au chargement',()=>{
  a.setProfil(base); // sans exclusion
  const semaine=a.genererPlan(11,20261116);
  assert.equal(semaine.length,7);
  // on force un plat de mer dans le menu enregistré, comme si le filtre corrigé venait de sortir
  const menu=[...semaine];menu[2]='p31';
  store['ns_plan_'+a.cleSemaine()]=JSON.stringify(menu);
  a.setProfil({...base,exclusions:['allergen:poisson']});
  const enConflit=menu.map((id,i)=>a.estExclue(by[id],['allergen:poisson'])?i:-1).filter(i=>i>=0);
  assert.ok(enConflit.includes(2),'p31 doit être en conflit');
  const charge=a.chargerPlan();
  assert.equal(charge.length,7,'semaine à 7 plats');
  assert.notEqual(charge[2],'p31','seiche remplacée');
  for(let i=0;i<7;i++){
    if(enConflit.includes(i))assert.ok(!a.estExclue(by[charge[i]],['allergen:poisson']),'remplaçant compatible au rang '+i);
    else assert.equal(charge[i],menu[i],'plat compatible '+i+' conservé');}
  assert.equal(new Set(charge).size,7,'pas de doublon');
  a.setProfil(base);delete store['ns_plan_'+a.cleSemaine()];});

test('plan corrompu : régénération complète conservée',()=>{
  store['ns_plan_'+a.cleSemaine()]=JSON.stringify(['inconnu','a01']);
  const charge=a.chargerPlan();
  assert.equal(charge.length,7);assert.ok(charge.every(id=>by[id]));
  delete store['ns_plan_'+a.cleSemaine()];});

console.log(`filtre-poisson: ${n} tests ok`);
