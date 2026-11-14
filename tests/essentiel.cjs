/* Contrôle logiciel indépendant des agrégations. Ne valide pas la réussite culinaire. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let refuseEcriture=false;
const root=path.resolve(__dirname,'..'),store={},els={};
const el=s=>els[s]||={innerHTML:'',textContent:'',value:'',classList:{toggle(){},add(){}},addEventListener(type,fn){this["on"+type]=fn},setAttribute(){},querySelector(){return el('child')},dataset:{}};
const c={console,Date,Math,JSON,module:{exports:{}},navigator:{},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{if(refuseEcriture)throw Error("quota");store[k]=v}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){}}};c.globalThis=c;vm.createContext(c);
for(const f of ['references','ingredients','recipes-hiver','recipes-printemps','recipes-ete','recipes-automne','recipes-toute-annee'])vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),c);
for(const f of ['allergenes','illustrations','app'])vm.runInContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),c);
const a=c.module.exports,base=JSON.parse(JSON.stringify(a.getProfil())),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
let recettes=0,semaines=0;
function verifier(ids,portions){
 a.setProfil({...base,portionsParRecette:portions});a.setPlan(ids);
 const attendu={};let cout=0,kcal=0;
 for(const id of a.idsComplets()){
  const r=a.RECETTES.find(r=>r.i===id);
  for(const [k,g]of r.ing){const q=g*portions/4;attendu[k]=(attendu[k]||0)+q;cout+=a.ING[k].prixKg*q/1000;const v=a.ING[k].kcal;if(v!=null)kcal+=v*q/100;}
 }
 for(const [k,g]of a.complements()){attendu[k]=(attendu[k]||0)+g;cout+=a.ING[k].prixKg*g/1000;if(a.ING[k].kcal!=null)kcal+=a.ING[k].kcal*g/100;}
 const lu=a.listeCourses();assert.deepEqual(Object.keys(lu).sort(),Object.keys(attendu).sort());
 for(const k in attendu)near(lu[k].g,attendu[k]);near(Object.values(lu).reduce((s,v)=>s+v.prix,0),cout);near(a.bilanPlan().tot.kcal,kcal);
 return cout;
}
for(const r of a.RECETTES)for(const p of [2,4,6,8,12]){verifier([r.i],p);recettes++;}
for(let mois=1;mois<=12;mois++)for(const exclusions of [[],['allergen:poisson'],['allergen:lait']]){
 a.setSemaine(new Date(2026,mois-1,15));a.setProfil({...base,exclusions});const ids=a.genererPlan(mois,8021);assert.equal(ids.length,7);assert.equal(a.conflitsVariete(ids).length,0);
 for(const p of [2,4,8]){
  const key=a.cleSemaine();store['ns_repas_'+key]=JSON.stringify([ids[0]]);store['ns_complements_'+key]='oui';
  verifier(ids,p);delete store['ns_repas_'+key];delete store['ns_complements_'+key];semaines++;
 }
}
for(const p of [2,4,6,8,12]){
 a.setProfil({...base,portionsParRecette:p});
 for(const [id,litres]of [['h04',1.5],['h14',1.5],['h21',1],['h33',1.2],['h59',1],['a40',1.2]]){const r=a.RECETTES.find(r=>r.i===id);const texte=r.et.map(e=>a.etapeAffichee(r,e)).join(' ');assert.ok(texte.includes((litres*p/4).toLocaleString('fr-FR',{maximumFractionDigits:2})+" l d'eau"));}
 const oeuf=a.RECETTES.find(r=>r.i==='h11');assert.ok(oeuf.et.map(e=>a.etapeAffichee(oeuf,e)).join(' ').includes(p+' ramequins'));
}
const pot=a.RECETTES.find(r=>r.i==='h01');assert.equal(pot.c,120+45);assert.equal(pot.p+pot.c,185);
// Reproduction ciblée des défauts trouvés dans le navigateur : même gestionnaire, sans navigateur.
a.setProfil({...base});a.setPlan(['h01','t47','e26','a09','t03','h13','p09']);a.rendreTout();
el('#nbPers').value='2.2';el('#nbPortions').value='4.4';el('#budget').value='80';el('#sauverProfil').onclick();
assert.equal(a.getProfil().personnes.length,2);assert.equal(a.getProfil().portionsParRecette,4);assert.deepEqual(JSON.parse(JSON.stringify(a.chargerProfil())),JSON.parse(JSON.stringify(a.getProfil())));
refuseEcriture=true;el('#nbPers').value='2';el('#nbPortions').value='4';el('#budget').value='99';el('#sauverProfil').onclick();assert.match(el('#statutProfil').textContent,/non enregistrés/);assert.doesNotMatch(el('#statutProfil').textContent,/Réglages enregistrés/);
refuseEcriture=false;el('#sauverProfil').onclick();assert.match(el('#statutProfil').textContent,/Réglages enregistrés/);
console.log(JSON.stringify({recipeScaleCases:recettes,weekScaleCases:semaines,allQuantitiesAndEstimatedCostsMatch:true,kcalArithmeticMatches:true,extraMealAndComplementsIncludedOnce:true,potAuFeuCookingMinutes:pot.c,waterAndRamekinsScaleCases:35,decimalAndStorageDefectsRegressed:true,scope:'calculs logiciels, pas essai cuisine ni validation nutritionnelle'},null,2));
