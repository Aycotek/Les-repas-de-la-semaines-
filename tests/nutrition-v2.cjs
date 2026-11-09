/* Régression des compléments et comparaison des fonctions réellement exécutées. */
const fs=require('node:fs'),assert=require('node:assert/strict');const setup=fs.readFileSync(__dirname+'/extended.js','utf8').split('for(let month=1;')[0];const {a,by,store}=new Function('require','__dirname',setup+';return {a,by,store};')(require,__dirname);let n=0;const test=(name,fn)=>{try{fn();n++;}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;}};const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-7);
const base=a.getProfil();
for(let month=1;month<=12;month++){
 a.setSemaine(new Date(2027,month-1,15));const p=a.genererPlan(month,1);a.setPlan(p);const key='ns_complements_'+a.cleSemaine(),off=a.bilanPlan(),courses=a.listeCourses(),cost=Object.values(courses).reduce((s,x)=>s+x.prix,0);
 test(`mois ${month} aucun ajout implicite`,()=>assert.equal(a.complements().length,0));store[key]='oui';const pairs=a.complements(month),on=a.bilanPlan(),withCourses=a.listeCourses();const expected=a.nutrimentsRecette({ing:pairs});
 test(`mois ${month} quantités des 28 portions`,()=>{near(pairs.reduce((s,[k,g])=>s+g,0),28*(150+125+10));});
 test(`mois ${month} tous nutriments comptés une fois`,()=>{for(const k in off.tot)near(on.tot[k]-off.tot[k],expected.t[k]);});
 test(`mois ${month} courses exactes`,()=>{const delta={};for(const[k,g]of pairs)delta[k]=(delta[k]||0)+g;for(const[k,g]of Object.entries(delta))near(withCourses[k].g-(courses[k]?.g||0),g);});
 test(`mois ${month} coût même calcul`,()=>near(Object.values(withCourses).reduce((s,x)=>s+x.prix,0)-cost,a.coutComplements()));
 test(`mois ${month} retrait réversible`,()=>{store[key]='non';near(a.bilanPlan().tot.kcal,off.tot.kcal);assert.equal(a.complements().length,0);});
 for(let seed=1;seed<=5;seed++){const p=a.genererPlan(month,seed);test(`mois ${month}/${seed} pas trois soupes/currys`,()=>assert.ok(p.filter(id=>a.formeCulinaire(by[id])==='bol_mijote').length<=2));}
}
a.setSemaine(new Date(2027,10,15));const key='ns_complements_'+a.cleSemaine();store[key]='oui';a.setProfil({...base,exclusions:['lait|yaourt|beurre|creme|fromage','noix|amande|sesame']});
test('exclusions appliquées aux compléments',()=>assert.ok(a.complements().every(([k])=>!(/yaourt|amande/.test(k)))));
a.setProfil(base);a.setSemaine(new Date(2027,10,22));test('compléments isolés par semaine',()=>assert.equal(a.complements().length,0));
a.setPlan(a.genererPlan(11,5));const p=[...a.getPlan()];store['ns_plan_'+a.cleSemaine()]=JSON.stringify(p);test('plan existant inchangé au rechargement',()=>assert.deepEqual(a.chargerPlan(),p));
test('os à moelle jamais converti en lard',()=>{assert.equal(a.ING.moelle_os.kcal,null);assert.equal(a.ING.moelle_os.ciqual,null);});
test('pomme de terre crue et riz complet tracés',()=>{assert.match(a.ING.pomme_de_terre.sourceNom,/raw/);assert.match(a.ING.riz_basmati_complet.sourceNom,/brown, raw/);});
test('pas de double remplissage du vol au vent',()=>assert.equal(a.ING.vol_au_vent.sourceNom,'Puff pastry, cooked'));
console.log(`${n} contrôles nutrition V2 passés. ${process.exitCode?'Échecs ci-dessus.':'Aucun échec.'}`);
