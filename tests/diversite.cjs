/* Tests des vraies fonctions de production. node tests/extended.js */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const store={},els={};
const el=s=>els[s]||= {innerHTML:'',textContent:'',value:'',classList:{toggle(){},add(){}},addEventListener(){},setAttribute(){},querySelector(){return el('child')},dataset:{}};
const ctx={console,Date,Math,JSON,module:{exports:{}},navigator:{},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){}}};ctx.globalThis=ctx;
vm.createContext(ctx);
for(const f of ['references','ingredients','recipes-hiver','recipes-printemps','recipes-ete','recipes-automne','recipes-toute-annee'])vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),ctx);
for(const f of ['allergenes','illustrations'])vm.runInContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),ctx);
const a=ctx.module.exports,by=Object.fromEntries(a.RECETTES.map(r=>[r.i,r])),base=JSON.parse(JSON.stringify(a.getProfil()));let n=0;
const test=(name,fn)=>{try{fn();n++;}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;}};

const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
const hachis=a.RECETTES.filter(r=>/hachis|parmentier/.test(r.n.toLowerCase().split(",")[0]));
assert.ok(hachis.length>=3);
for(const x of hachis)for(const y of hachis)assert.ok(a.platsProches(x,y),x.n+" / "+y.n);
const hors=a.RECETTES.filter(r=>!a.familleVoisine(r));
const initial=[hachis[0].i,hachis[1].i,...hors.slice(0,5).map(r=>r.i)];
assert.equal(a.conflitsVariete(initial).length,1);
a.setPlan(initial);const coursesAvant=JSON.stringify(a.listeCourses()),nutritionAvant=JSON.stringify(a.bilanPlan());
const ordre=a.repartirPlats(initial);assert.equal(a.conflitsVariete(ordre).length,0);assert.deepEqual([...ordre].sort(),[...initial].sort());
a.setPlan(ordre);const coursesApres=a.listeCourses();const avant=JSON.parse(coursesAvant);for(const k in avant){near(coursesApres[k].g,avant[k].g);near(coursesApres[k].prix,avant[k].prix);}const nutrApres=a.bilanPlan(),nutrAvant=JSON.parse(nutritionAvant);for(const k of Object.keys(nutrAvant.tot))if(typeof nutrAvant.tot[k]==="number")near(nutrApres.tot[k],nutrAvant.tot[k]);
// Répéter une famille n'est pas interdit sur toute la semaine.
assert.equal(ordre.filter(id=>hachis.some(r=>r.i===id)).length,2);
// Deux voisins contrôlés lors d'un remplacement, y compris aux extrémités.
const p=[hachis[0].i,hors[0].i,hors[1].i,hachis[1].i,hors[2].i,hors[3].i,hors[4].i];
assert.equal(a.remplacementVarie(p,1,hachis[2].i),false);assert.equal(a.remplacementVarie(p,2,hachis[2].i),false);assert.equal(a.remplacementVarie(p,6,hachis[2].i),true);
assert.equal(a.conflitsVariete([hachis[0].i,hors[0].i,hachis[1].i]).length,0);
// Cas impossible : minimum honnête, pas de suppression/doublon/invention de repas.
const impossible=[...hachis.slice(0,3).map(r=>r.i),hors[0].i];assert.equal(a.ordreSansConflitPossible(impossible),false);const repli=a.repartirPlats(impossible);assert.equal(a.conflitsVariete(repli).length,1);assert.deepEqual([...repli].sort(),[...impossible].sort());
assert.deepEqual([...a.repartirPlats([])],[]);assert.equal(a.repartirPlats([hors[0].i])[0],hors[0].i);
// Un plan déjà enregistré n'est pas migré à l'insu de l'utilisateur.
store['ns_plan_'+a.cleSemaine()]=JSON.stringify(initial);assert.deepEqual([...a.chargerPlan()],[...initial]);
let generations=0,relances=0;
const start=Date.now();
for(let month=1;month<=12;month++)for(let seed=1;seed<=5;seed++){
 const plan=a.genererPlan(month,seed);assert.equal(plan.length,7);assert.equal(new Set(plan).size,7);assert.equal(a.conflitsVariete(plan).length,0,month+'/'+seed);assert.ok(plan.every(id=>!a.estExclue(by[id],[])));generations++;
 if(seed===1)for(let i=0;i<7;i++){const q=a.relancerRepas(plan,i,month,100+i);assert.equal(a.conflitsVariete(q).length,0);assert.ok(q.every((id,j)=>j===i||id===plan[j]));assert.equal(new Set(q).size,7);relances++;}
}
for(const exclusions of [['poisson'],['oeuf'],['mot:fromage'],['porc|lardons|jambon|saucisse']]){
 a.setProfil({...base,exclusions});const plan=a.genererPlan(11,813);assert.equal(a.conflitsVariete(plan).length,0);assert.ok(plan.every(id=>!a.estExclue(by[id],exclusions)));generations++;
}
a.setProfil(base);a.setPlan(a.genererPlan(11,123));
const example=a.getPlan().map((id,i)=>({jour:i+1,id,plat:by[id].n,famille:a.famillePlat(by[id]),forme:a.formeCulinaire(by[id])}));
console.log(JSON.stringify({generations,relances,zeroAdjacentFamilies:true,preservedSavedPlan:true,nonConsecutiveAllowed:true,sameShoppingAndNutrition:true,elapsedMs:Date.now()-start,example},null,2));
