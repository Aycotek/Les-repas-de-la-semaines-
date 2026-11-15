/* Tests d'intégration Équilibre v5 dans l'app : anneau, favoris, filtres santé, bilan.
   node tests/equilibre-app.cjs — mêmes oracles que le moteur Python audité. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
function nouvCtx(){
  const store={};
  const el=s=>({innerHTML:'',textContent:'',value:'',classList:{toggle(){},add(){}},addEventListener(){},setAttribute(){},querySelector(){return el('child')},dataset:{}});
  const ctx={console,Date,Math,JSON,module:{exports:{}},navigator:{},
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>{delete store[k]}},
    document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){}}};
  ctx.globalThis=ctx;vm.createContext(ctx);
  for(const f of ['references','ingredients','recipes-hiver','recipes-printemps','recipes-ete','recipes-automne','recipes-toute-annee'])
    vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),ctx);
  for(const f of ['allergenes','illustrations'])
    vm.runInContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'equilibre.js'),'utf8'),ctx);
  ctx.EQUILIBRE=ctx.module.exports; // UMD : branche module en contexte vm, on l'expose en global
  vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),ctx);
  return {ctx,a:ctx.module.exports,store};
}
let n=0;const test=(name,fn)=>{try{fn();n++;console.log('  ok -',name);}catch(e){console.error('  KO -',name,'->',e.message);process.exitCode=1;}};
const {a,store,ctx}=nouvCtx();
const by=Object.fromEntries(a.RECETTES.map(r=>[r.i,r]));
const base=JSON.parse(JSON.stringify(a.getProfil()));


// Each scenario runs 50 times with distinct seeds/recipes, not a repeated static assert only.
for(let seed=1;seed<=50;seed++) {
 test(`neutral status / favorite independent ${seed}`,()=>{
   const r=a.RECETTES[(seed*7)%300],before=a.anneauPlat(r.i);
   assert.equal(before.classe,'neutre'); a.basculerFavori(r.i);
   assert.equal(JSON.stringify(a.anneauPlat(r.i)),JSON.stringify(before));a.basculerFavori(r.i);
   assert.doesNotMatch(a.anneauHtml(r.i),/equilibr|favori|anneau-vert|anneau-orange/i);
 });
 test(`all health flags have no generation effect ${seed}`,()=>{
   a.setProfil({...base,sante:[]}); const expected=a.genererPlan((seed%12)+1,seed);
   for(const mode of ['dt1','glycemie','cholesterol']) {
     a.setProfil({...base,sante:[mode]});assert.equal(JSON.stringify(a.genererPlan((seed%12)+1,seed)),JSON.stringify(expected));
   }a.setProfil(base);
 });
 test(`favorite reversible and bonus bounded ${seed}`,()=>{
   const ids=a.genererPlan((seed%12)+1,seed);
   store.ns_favoris='[]'; const s0=a.scorePlan(ids,seed%12+1);
   store.ns_favoris=JSON.stringify(ids); const s1=a.scorePlan(ids,seed%12+1);
   assert.ok(Math.abs(s1-s0-a.FAV_BONUS*a.FAV_CAP)<1e-8);
   for(const id of ids)a.basculerFavori(id);assert.equal(a.favoris().length,0);
 });
 test(`unknown never zero ${seed}`,()=>{
   const key=Object.keys(a.ING)[seed%Object.keys(a.ING).length],old=a.ING[key].sel;
   a.ING[key].sel=null;try{assert.equal(a.nutrimentsV5Recette({ing:[[key,seed*10]]}).sel,null);}finally{a.ING[key].sel=old;}
   assert.equal(a.nutrimentsV5Recette({ing:[['missing-'+seed,100]]}).kcal,null);
 });
}
test('all 300 statuses reflect composition availability only',()=>{
 for(const r of a.RECETTES){const an=a.anneauPlat(r.i);assert.equal(an.classe,'neutre');assert.ok(an.court.startsWith('données'));}
});
test('visible weekly card no medical quota, jargon or full-day claims',()=>{
 a.setPlan(a.genererPlan(11,10));a.setProfil({...base,sante:['dt1']});const h=a.carteBilanV5();
 assert.match(h,/par portion de plat/);assert.match(h,/pas par journée/i);assert.match(h,/Toutes les valeurs ci-dessous sont des estimations/);assert.match(h,/Composition par portion prévue/);
 assert.doesNotMatch(h,/audité|parité|≥|≤|5 sur 7|12 %|1,3 g|6,5 g/);
 a.setProfil(base);
});
console.log(`${n} grouped cases passed, no medical validation claimed`);
