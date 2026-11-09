/* Allergies et aliments à éviter : aucune recette générée, relancée ou complétée ne doit contenir un allergène coché. node tests/allergenes.cjs */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const setup=fs.readFileSync(path.join(__dirname,'extended.js'),'utf8').split('const a=ctx.module.exports')[0];
const {ctx,store}=new Function('require','__dirname',setup+';return {ctx,store};')(require,__dirname);
const a=ctx.module.exports,by=Object.fromEntries(a.RECETTES.map(r=>[r.i,r]));
let n=0;const test=(name,fn)=>{try{fn();n++;}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;}};
const base=JSON.parse(JSON.stringify(a.getProfil()));
const ING=ctx.INGREDIENTS,AL=ctx.ALLERGENES,AI=ctx.ALLERGENES_ING,SANS=new Set(ctx.SANS_ALLERGENE);
test('tout ingrédient du catalogue est classé (allergène ou "sans")',()=>{const manque=Object.keys(ING).filter(k=>!AI[k]&&!SANS.has(k));assert.equal(manque.length,0,manque.join());});
test('aucun ingrédient classé à la fois sans allergène et avec allergène',()=>{assert.equal(Object.keys(AI).filter(k=>SANS.has(k)).length,0);});
test('aucun ingrédient inconnu dans la table',()=>{for(const k of [...Object.keys(AI),...SANS])assert.ok(ING[k],k);});
test('14 allergènes UE listés',()=>assert.equal(AL.length,14));
// vérités terrain choisies à la main
const truth={farine:'gluten',oeuf:'oeuf',lait:'lait',beurre:'lait',creme_fraiche:'lait',parmesan:'lait',noix:'fruits_a_coque',amande_effilee:'fruits_a_coque',noisette:'fruits_a_coque',pignons:'fruits_a_coque',cacahuete:'arachide',beurre_cacahuete:'arachide',saumon_pavé:'poisson',sauce_nuoc_mam:'poisson',anchois:'poisson',crevette_decortiquee:'crustaces',crabe_miettes:'crustaces',moule:'mollusques',encornet:'mollusques',sauce_soja:'soja',tofu_ferme:'soja',pate_miso:'soja',tahini:'sesame',sesame_graines:'sesame',huile_sesame:'sesame',celeri_boule:'celeri',bouillon_legumes:'celeri',moutarde:'moutarde',vin_blanc:'sulfites',vin_rouge:'sulfites',pates_completes:'gluten',pain_complet:'gluten',vol_au_vent:'gluten',pesto:'fruits_a_coque',gruyere_rape:'lait',yaourt_nature:'lait'};
for(const [k,id] of Object.entries(truth))test(`${k} -> ${id}`,()=>{assert.ok(ING[k],k);assert.ok(ctx.allergenesIng(k).includes(id),k);});
const mois=[1,2,3,4,5,6,7,8,9,10,11,12];
for(const al of AL.filter(x=>x.id!=='lupin')){
 const exc=['allergen:'+al.id];a.setProfil({...base,exclusions:exc});
 const compat=a.RECETTES.filter(r=>!a.estExclue(r,exc));
 test(`${al.id}: aucune recette compatible ne contient l'allergène`,()=>{for(const r of compat){const x=ctx.allergenesDe(r.ing);assert.ok(!x.c.includes(al.id)&&!x.p.includes(al.id),r.i);}});
 test(`${al.id}: des recettes restent disponibles (>=20)`,()=>assert.ok(compat.length>=20,compat.length));
 for(const m of mois){for(const seed of [1,7,99]){const p=a.genererPlan(m,seed);test(`${al.id} mois ${m} seed ${seed} plan propre`,()=>{assert.ok(p.length>=1);for(const id of p)assert.ok(!a.estExclue(by[id],exc),id);});
  if(seed===7){const r2=a.relancerRepas(p,3,m,seed+5);test(`${al.id} mois ${m} relance propre`,()=>{for(const id of r2)assert.ok(!a.estExclue(by[id],exc),id);});}}}
}
test('combinaison lait+gluten+oeuf+fruits à coque+poisson: plan propre',()=>{const exc=['allergen:lait','allergen:gluten','allergen:oeuf','allergen:fruits_a_coque','allergen:poisson'];a.setProfil({...base,exclusions:exc});const p=a.genererPlan(11,5);assert.ok(p.length>=1);for(const id of p)assert.ok(!a.estExclue(by[id],exc));});
test('tous allergènes cochés: seules les recettes sans allergène restent, semaine incomplète assumée',()=>{const exc=AL.map(x=>'allergen:'+x.id);a.setProfil({...base,exclusions:exc});const ok=a.RECETTES.filter(r=>!a.estExclue(r,exc));assert.ok(ok.length<20);const p=a.genererPlan(11,5);assert.ok(p.length<=ok.length);for(const id of p)assert.ok(ok.some(r=>r.i===id));});
test('compléments: lait ou fruits à coque exclus',()=>{store['ns_complements_'+a.cleSemaine()]='oui';a.setProfil({...base,exclusions:['allergen:lait','allergen:fruits_a_coque']});assert.ok(a.complements().every(([k])=>!/yaourt|amande/.test(k)));});
test('aversion porc: aucune recette de porc',()=>{const exc=['evite:porc'];a.setProfil({...base,exclusions:exc});for(const m of mois){for(const id of a.genererPlan(m,3))assert.ok(!by[id].ing.some(([k])=>/^(porc_|jambon_|lardons|saucisse_|merguez)/.test(k)),id);}});
test('menus sans viande',()=>{const exc=['evite:viande'];a.setProfil({...base,exclusions:exc});for(const id of a.genererPlan(5,3))assert.ok(!by[id].ing.some(([k])=>ctx.EVITE.find(e=>e.id==='viande').re.test(k)),id);});
test('aliment libre: courgette',()=>{const exc=['mot:courgette'];a.setProfil({...base,exclusions:exc});for(const id of a.genererPlan(7,3))assert.ok(!by[id].ing.some(([k])=>k.includes('courgette')),id);});
test('mot trop court ignoré',()=>assert.equal(a.estExclue(by[a.RECETTES[0].i],['mot:ab']),false));
test('aversion et allergie distinctes: poisson goût != allergie',()=>{const r=a.RECETTES.find(r=>r.ing.some(([k])=>k==='sauce_nuoc_mam'));assert.ok(a.estExclue(r,['allergen:poisson']));assert.ok(a.estExclue(r,['evite:poisson_gout']));});
test('migration anciens réglages: au moins aussi prudente',()=>{store.ns_profil=JSON.stringify({personnes:[1,2],exclusions:['poisson','oeuf'],materiel:[],budget:80,portionsParRecette:4});const p=a.chargerProfil();assert.equal(JSON.stringify(p.exclusions),'["allergen:poisson","allergen:oeuf"]');});
test('table allergènes absente: allergie => tout est exclu (échec fermé)',()=>{const c=ctx.allergenesDe;ctx.allergenesDe=undefined;assert.equal(a.estExclue(a.RECETTES[0],['allergen:lait']),true);ctx.allergenesDe=c;});
test('illustrations: SVG valide pour les 200 recettes',()=>{for(const r of a.RECETTES){const s=ctx.illustrationPlat(r);assert.ok(s.startsWith('<svg')&&s.endsWith('</svg>'),r.i);assert.ok(!/NaN|undefined/.test(s),r.i);assert.ok(!/<script|onerror|href=/i.test(s),r.i);}});
test('illustrations: aucune tache blanche pleine (risque de faire croire à un œuf)',()=>{for(const r of a.RECETTES){const s=ctx.illustrationPlat(r);assert.ok(!s.includes('fill="#fff"'),r.i);}});
test('illustrations: œuf dessiné seulement si la recette contient un ingrédient œuf',()=>{for(const r of a.RECETTES){const s=ctx.illustrationPlat(r);const dessine=s.includes('#f2b632')||s.includes('#fffaf0');const aOeuf=r.ing.some(([k])=>/^oeuf/.test(k));assert.ok(!dessine||aOeuf,'œuf dessiné sans ingrédient œuf: '+r.i);if(aOeuf&&dessine)assert.ok(s.includes('œuf'),'étiquette sans mention œuf visible: '+r.i);}});
test('fruits de mer : type dédié, jamais comptés comme poisson',()=>{
 const poissonIng=/^(cabillaud|colin|hareng|lieu_jaune|loup|maquereau|merlan|merlu|morue|raie|rouget|sardine|saumon|thon|truite|anchois)/;
 const coquille=/^(crabe|crevette|encornet|moule|poulpe|seiche|palourde|noix_saint_jacques)/;
 for(const r of a.RECETTES){
  const aPoisson=r.ing.some(([k])=>poissonIng.test(k)), aCoquille=r.ing.some(([k])=>coquille.test(k));
  if(aCoquille&&!aPoisson)assert.equal(r.t,'fruits_mer','coquillages sans poisson mal typés: '+r.i);
  if(r.t==='fruits_mer'){assert.ok(aCoquille,'fruits_mer sans coquillages: '+r.i);}
 }
});
test('fruits de mer : aversion poisson épargne les coquillages, aversion fruits de mer les exclut',()=>{
 const e20=by.e20,t06=by.t06;
 assert.equal(a.estExclue(e20,['evite:poisson_gout']),false);
 assert.equal(a.estExclue(e20,['evite:fruits_de_mer']),true);
 assert.equal(a.estExclue(t06,['evite:poisson_gout']),true); // sauce de poisson = goût de poisson réel
});
test('sulfites : vin certain, vinaigre/cidre/fruits secs possibles selon marque ; bouquet garni : céleri possible (mélanges commerciaux variables)',()=>{
 assert.ok(ctx.ALLERGENES_ING['vin_blanc'].c.includes('sulfites'));
 for(const k of ['vinaigre','vinaigre_balsamique','cidre_brut','raisin_sec']){assert.ok(ctx.ALLERGENES_ING[k].p.includes('sulfites'),k);assert.equal(ctx.ALLERGENES_ING[k].c.length,0,k);}
 assert.ok(ctx.ALLERGENES_ING['bouquet_garni'].p.includes('celeri'));
 assert.equal(ctx.ALLERGENES_ING['bouquet_garni'].c.length,0);
 assert.ok(ctx.allergenesIng('vinaigre').includes('sulfites'));
 assert.ok(ctx.allergenesIng('bouquet_garni').includes('celeri'));
});
test('illustrations déterministes et distinctes',()=>{const r=a.RECETTES[0];const x=ctx.illustrationPlat(r).replace(/il\d+/g,'');const y=ctx.illustrationPlat(r).replace(/il\d+/g,'');assert.equal(x,y);assert.notEqual(x,ctx.illustrationPlat(a.RECETTES[60]).replace(/il\d+/g,''));});

test('compléments: aucun allergène coché dans fruits/yaourt/amandes, pour chaque allergène et chaque mois',()=>{for(const al of AL){for(const m of mois){store['ns_complements_'+a.cleSemaine()]='oui';a.setProfil({...base,exclusions:['allergen:'+al.id]});for(const [k] of a.complements(m,true)){const x=ctx.allergenesIng(k);assert.ok(!x.includes(al.id),al.id+' '+k);}}}});
test('14 allergènes affichables (lupin inclus, sans ingrédient au catalogue)',()=>{assert.ok(AL.some(x=>x.id==='lupin'));assert.equal(Object.keys(AI).filter(k=>AI[k].c.concat(AI[k].p).includes('lupin')).length,0);});
// Régressions P1 relevées en revue : sous-chaînes (« oeuf » dans « boeuf », « lait » dans « laitue »)
const R=(k)=>({t:'vege',ing:[[k,100]]});
test('allergie œufs ne touche pas le bœuf',()=>{assert.equal(a.estExclue(R('boeuf_a_poeler'),['allergen:oeuf']),false);assert.equal(a.estExclue(R('oeuf'),['allergen:oeuf']),true);});
test('allergie lait ne touche pas la laitue ni le lait de coco',()=>{for(const k of ['laitue','laitue_romaine','lait_de_coco'])assert.equal(a.estExclue(R(k),['allergen:lait']),false,k);assert.equal(a.estExclue(R('lait'),['allergen:lait']),true);});
test('mot libre oeuf/lait: mots entiers seulement',()=>{assert.equal(a.estExclue(R('boeuf_a_poeler'),['mot:oeuf']),false);assert.equal(a.estExclue(R('oeuf'),['mot:oeuf']),true);assert.equal(a.estExclue(R('oeuf'),['mot:oeufs']),true);assert.equal(a.estExclue(R('laitue'),['mot:lait']),false);assert.equal(a.estExclue(R('lait'),['mot:lait']),true);assert.equal(a.estExclue(R('courgette'),['mot:courgettes']),true);});
test('ancien format oeuf/lait: plus de faux positifs',()=>{assert.equal(a.estExclue(R('boeuf_a_poeler'),['oeuf']),false);assert.equal(a.estExclue(R('laitue'),['lait|yaourt']),false);assert.equal(a.estExclue(R('creme_fraiche'),['lait|yaourt|beurre|creme|fromage']),true);});
test('aucune des 200 recettes de bœuf exclue par « œufs »',()=>{const exc=['allergen:oeuf'];for(const r of a.RECETTES){const aOeuf=r.ing.some(([k])=>k==='oeuf')||ctx.allergenesDe(r.ing).p.includes('oeuf')||ctx.allergenesDe(r.ing).c.includes('oeuf');assert.equal(a.estExclue(r,exc),aOeuf,r.i);}});
test('aucune recette avec laitue exclue à tort pour le lait',()=>{const exc=['allergen:lait'];for(const r of a.RECETTES){const x=ctx.allergenesDe(r.ing);assert.equal(a.estExclue(r,exc),x.c.includes('lait')||x.p.includes('lait'),r.i);}});


// Forme culinaire : préserver l'œuf cuisiné sans inventer un œuf entier dans un liant.
test('omelette, tortilla et piperade gardent une forme œuf battu cuit',()=>{for(const id of ['e45','e51','t51']){const svg=ctx.illustrationPlat(by[id]);assert.ok(svg.includes('data-forme="oeuf-battu"'),id);assert.ok(svg.includes('œuf battu cuit'),id);assert.ok(!svg.includes('#f2b632'),id+' ne doit pas montrer de jaune entier');}});
test('œuf liant de chou farci et quiche ne devient pas œuf entier',()=>{for(const id of ['a43','t14','h10','p07']){const svg=ctx.illustrationPlat(by[id]);assert.ok(!svg.includes('#f2b632'),id);assert.ok(!svg.includes('data-forme="oeuf-battu"'),id);}});

console.log(`${n} contrôles allergènes/illustrations passés.`);
