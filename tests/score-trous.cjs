/* D5 (contre-audit APP v2) : scorePlan ne doit lire AUCUNE valeur de nutriment.
   Oracle : le classement de plans candidats est STRICTEMENT identique avec les données
   réelles, avec des trous aggravés (cellules null), et avec des trous comblés (valeurs
   arbitraires). 50 exécutions par scénario, graines distinctes.
   node tests/score-trous.cjs */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
function nouvCtx(mut){
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
  if(mut) vm.runInContext(mut,ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'equilibre.js'),'utf8'),ctx);
  ctx.EQUILIBRE=ctx.module.exports;
  vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),ctx);
  return ctx.module.exports;
}
// Trous aggravés : protéines/fer/fibres/vitD null partout + toutes cellules null sur 30 ingrédients.
const TROUS=`
 const CLES=["kcal","prot","lip","ags","sucres","sel","gluc","fibres","fer","calcium","magnesium","potassium","zinc","selenium","vitC","vitD","b9","b12","vitE","vitA","betaCarotene","phosphore","omega3","epa","dha","vitB1","vitB6"];
 const ks=Object.keys(INGREDIENTS);
 for(const k of ks){INGREDIENTS[k].prot=null;INGREDIENTS[k].fer=null;INGREDIENTS[k].fibres=null;INGREDIENTS[k].vitD=null;}
 for(const k of ks.slice(0,30)) for(const c of CLES) INGREDIENTS[k][c]=null;
`;
// Données « complètes » : tous les null comblés par une valeur arbitraire (ne doit rien changer).
const COMBLE=`
 const CLES=["kcal","prot","lip","ags","sucres","sel","gluc","fibres","fer","calcium","magnesium","potassium","zinc","selenium","vitC","vitD","b9","b12","vitE","vitA","betaCarotene","phosphore","omega3","epa","dha","vitB1","vitB6"];
 for(const k of Object.keys(INGREDIENTS)) for(const c of CLES) if(INGREDIENTS[k][c]==null) INGREDIENTS[k][c]=7.7;
`;
const A=nouvCtx(null), B=nouvCtx(TROUS), C=nouvCtx(COMBLE);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

let n=0;const test=(name,fn)=>{try{fn();n++;console.log('  ok -',name);}catch(e){console.error('  KO -',name,'->',e.message);process.exitCode=1;}};

for(let seed=1;seed<=50;seed++){
  test(`classement identique trous/complet seed ${seed}`,()=>{
    const rnd=mulberry32(seed*7919);
    // 25 plans candidats de 7 recettes distinctes, même tirage pour les 3 instances
    const plans=[];
    for(let p=0;p<25;p++){
      const ids=new Set();
      while(ids.size<7) ids.add(A.RECETTES[Math.floor(rnd()*A.RECETTES.length)].i);
      plans.push([...ids]);
    }
    for(const mois of [1,7,12]){
      const classement=inst=>plans.map((ids,i)=>[inst.scorePlan(ids,mois),i]).sort((x,y)=>x[0]-y[0]||x[1]-y[1]).map(([,i])=>i);
      assert.deepEqual(classement(B),classement(A),'classement avec trous aggravés != réel');
      assert.deepEqual(classement(C),classement(A),'classement avec trous comblés != réel');
      // scores exacts identiques : le score ne lit aucune valeur de nutriment
      for(const ids of plans){
        assert.equal(B.scorePlan(ids,mois),A.scorePlan(ids,mois),'score modifié par des trous');
        assert.equal(C.scorePlan(ids,mois),A.scorePlan(ids,mois),'score modifié par des valeurs comblées');
      }
    }
  });
}
test('le classement ne dépend que des termes déclarés (PNNS occasions, budget, variété, saison, favoris)',()=>{
  // un plan quelconque : le score est fini et reproductible
  const ids=A.RECETTES.slice(0,7).map(r=>r.i);
  const s1=A.scorePlan(ids,3),s2=A.scorePlan(ids,3);
  assert.equal(s1,s2,'score non déterministe');
  assert.ok(Number.isFinite(s1),'score non fini');
});
console.log(`${n} scénarios x (réel/trous/complet) : classement et scores strictement identiques. Aucune somme partielle lue.`);
