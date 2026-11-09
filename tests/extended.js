/* Tests des vraies fonctions de production. node tests/extended.js */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const store={},els={};
const el=s=>els[s]||= {innerHTML:'',textContent:'',value:'',classList:{toggle(){},add(){}},addEventListener(){},setAttribute(){},querySelector(){return el('child')},dataset:{}};
const ctx={console,Date,Math,JSON,module:{exports:{}},navigator:{},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){}}};ctx.globalThis=ctx;
vm.createContext(ctx);
for(const f of ['references','ingredients','recipes-hiver','recipes-printemps','recipes-ete','recipes-automne','recipes-toute-annee'])vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),ctx);
const a=ctx.module.exports,by=Object.fromEntries(a.RECETTES.map(r=>[r.i,r])),base=JSON.parse(JSON.stringify(a.getProfil()));let n=0;
const test=(name,fn)=>{try{fn();n++;}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;}};
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
for(let month=1;month<=12;month++)for(let seed=1;seed<=5;seed++){
 const p=a.genererPlan(month,seed);a.setPlan(p);
 test(`plan ${month}/${seed} limites viande/charcuterie`,()=>{const rouge=k=>/^(boeuf|veau|agneau|cote_agneau|porc|saucisse_toulouse|merguez)/.test(k);const charc=k=>/^(lardons|jambon_|saucisse_fumee|saucisse_toulouse|merguez)/.test(k);let r=0,c=0;for(const id of p)for(const[k,g]of by[id].ing){if(rouge(k))r+=g/2;if(charc(k))c+=g/2;}assert.ok(r<=500);assert.ok(c<=150);});
 test(`plan ${month}/${seed} intégrité`,()=>{assert.equal(p.length,7);assert.equal(new Set(p).size,7);assert.ok(p.every(id=>by[id]));});
 test(`plan ${month}/${seed} budget`,()=>assert.ok(Object.values(a.listeCourses()).reduce((s,x)=>s+x.prix,0)<=80));
 test(`plan ${month}/${seed} poisson/légumineuses`,()=>{assert.equal(p.filter(id=>by[id].t.startsWith('poisson')).length,2);assert.ok(p.some(id=>by[id].t==='poisson_gras'));assert.ok(p.filter(id=>a.contientLegumineuses(by[id])).length>=2);});
}
a.setPlan(a.genererPlan(11,123));
for(let i=0;i<7;i++){
 const before=[...a.getPlan()],after=a.relancerRepas(before,i,11,42+i);
 test(`relance ${i} un seul repas`,()=>{assert.notEqual(after[i],before[i]);assert.equal(after.filter((id,j)=>id!==before[j]).length,1);assert.equal(new Set(after).size,7);});
 a.setPlan(after);
 test(`relance ${i} courses recalculées`,()=>{const expected={};for(const id of after)for(const[k,g]of by[id].ing)expected[k]=(expected[k]||0)+g;const actual=a.listeCourses();for(const k in expected)near(actual[k].g,expected[k]);});
 test(`relance ${i} coût équilibré`,()=>assert.ok(Object.values(a.listeCourses()).reduce((s,x)=>s+x.prix,0)<=80));
}
const p=[...a.getPlan()],before=a.listeCourses(),nut=a.bilanPlan();
test('quantité 4 portions ni 8 ni 2, restes comptés une fois',()=>{const expected={};for(const id of p)for(const[k,g]of by[id].ing)expected[k]=(expected[k]||0)+g;for(const k in expected)near(before[k].g,expected[k]);});
a.setProfil({...base,portionsParRecette:8});const doubled=a.listeCourses();
test('8 portions double courses, coût et nutriments',()=>{for(const k in before){near(doubled[k].g,before[k].g*2);near(doubled[k].prix,before[k].prix*2);}near(a.bilanPlan().tot.kcal,nut.tot.kcal*2);});
a.setProfil(base);
const recipe=by[p[0]],key='ns_repas_'+a.cleSemaine();store[key]=JSON.stringify([recipe.i]);
test('repas manuel inclus courses et bilan exactement une fois',()=>{const after=a.listeCourses();for(const[k,g]of recipe.ing)near(after[k].g,before[k].g+g);near(a.bilanPlan().tot.kcal,nut.tot.kcal+a.nutrimentsRecette(recipe).t.kcal);});
store[key]='[]';store['ns_courses_'+a.cleSemaine()]=JSON.stringify(['Café 1 paquet']);
test('article libre sans nutrition ni prix inventés',()=>{near(a.bilanPlan().tot.kcal,nut.tot.kcal);assert.equal(a.coursesManuelles()[0],'Café 1 paquet');});
for(const exc of ['poisson','lait|beurre|creme|fromage|comte|parmesan','noix|amande|sesame','oeuf','porc|lardons|jambon|saucisse']){
 a.setProfil({...base,exclusions:[exc]});const p=a.genererPlan(11,333);
 test(`exclusion ${exc} génération et relance`,()=>{assert.equal(p.length,7);assert.ok(p.every(id=>!a.estExclue(by[id],[exc])));for(let i=0;i<7;i++){const q=a.relancerRepas(p,i,11,444+i);assert.ok(q.every(id=>!a.estExclue(by[id],[exc])));}});
}
a.setProfil(base);
const withNull=a.RECETTES.find(r=>a.nutrimentsRecette(r).manquants>0);
test('poisson gras possède un ingrédient gras identifié',()=>{for(const r of a.RECETTES.filter(r=>r.t==='poisson_gras'))assert.ok(r.ing.some(([k])=>/^(saumon|maquereau|sardine|hareng|truite)/.test(k)));});
test('données manquantes suivies par nutriment',()=>{const x=a.nutrimentsRecette(withNull);assert.ok(x.manquants>0);assert.equal(Object.values(x.absents).reduce((s,n)=>s+n,0),x.manquants);assert.ok(Object.values(x.t).every(Number.isFinite));});
test('valeurs source absentes ne deviennent pas zéro',()=>{assert.ok(Object.values(a.ING).some(i=>Object.values(i).includes(null)));});
for(const invalid of ['null','{}','["inconnu"]','[1,2]','["'+p[0]+'","'+p[0]+'"]']){
 store['ns_plan_'+a.cleSemaine()]=invalid;
 test(`stockage plan invalide ${invalid}`,()=>assert.equal(a.chargerPlan().length,7));
}
for(const invalid of ['null','{"personnes":[],"budget":-100,"portionsParRecette":999}','{"exclusions":null,"materiel":1}','{oops']){
 store.ns_profil=invalid;
 test(`profil invalide ${invalid}`,()=>{const z=a.chargerProfil();assert.ok(z.personnes.length>=1);assert.ok(z.budget>=20);assert.ok(z.portionsParRecette<=12);assert.ok(Array.isArray(z.exclusions));});
}
test('lundi et numéro ISO changement année',()=>{assert.equal(a.lundiDe(new Date(2027,0,1)).getDate(),28);assert.equal(a.isoSemaine(new Date(2027,0,1)),53);});
const originalWeek=a.cleSemaine();a.setSemaine(new Date(2027,2,10));
test('ajouts isolés par semaine',()=>{assert.notEqual(a.cleSemaine(),originalWeek);assert.equal(a.coursesManuelles().length,0);assert.equal(a.repasManuels().length,0);});
for(const r of a.RECETTES){test(`recette ${r.i} données`,()=>{assert.ok(r.ing.length>=3);assert.ok(r.et.length>=2);for(const[k,g]of r.ing){assert.ok(a.ING[k]);assert.ok(g>0&&g<10000);}assert.ok(r.p>=0&&r.c>=0);});}
console.log(`${n} assertions groupées passées. ${process.exitCode?'Échecs ci-dessus.':'Aucun échec.'}`);
