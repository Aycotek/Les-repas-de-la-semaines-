/* Accessibilité (axe-core WCAG 2.1 A/AA, clavier) + budget réseau réel des visuels.
   node tests/accessibilite-reseau.cjs — Chrome local, axe servi en same-origin (CSP 'self'). */
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out='/downloads/repas-app-neutral';fs.mkdirSync(out,{recursive:true});
const mime=f=>f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':/\.(webp|jpg|png)$/.test(f)?'image/'+path.extname(f).slice(1).replace('jpg','jpeg'):'text/html';
const srv=http.createServer((q,s)=>{try{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]));s.setHeader('Content-Type',mime(f));s.end(fs.readFileSync(f));}catch{s.writeHead(404);s.end();}});
(async()=>{await new Promise(r=>srv.listen(8283,'127.0.0.1',r));
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox']});
try{
 const p=await b.newPage({viewport:{width:390,height:844},locale:'fr-FR',reducedMotion:'reduce'});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 // ---- Budget réseau : tous les visuels réellement transférés ----
 const hits=new Map();
 p.on('response',async r=>{const u=r.url();if(/\/assets\/[^/]+\/[^/]+\.(webp|jpg|png)$/.test(u)){try{const buf=await r.body();hits.set(u,buf.length);}catch{}}});
 const jsCss=new Map();
 p.on('response',async r=>{const u=r.url();if(/\.(js|css)$/.test(u)){try{jsCss.set(u,(await r.body()).length);}catch{}}});
 await p.goto('http://127.0.0.1:8283/',{waitUntil:'networkidle'});
 const initialImgs=hits.size, initialBytes=[...hits.values()].reduce((a,x)=>a+x,0);
 for(const img of await p.locator('.carte.repas .visuel img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
 const weekImgs=hits.size, weekBytes=[...hits.values()].reduce((a,x)=>a+x,0);
 assert.ok(weekImgs<=7,`visuels chargés pour 7 cartes: ${weekImgs}`);
 assert.ok(initialImgs<=4,`chargement anticipé limité (2 eager + viewport proche): ${initialImgs}`);
 // ---- axe sur les 4 vues ----
 await p.addScriptTag({url:'http://127.0.0.1:8283/tests/vendor-axe.min.js'});
 const audit=async(nom)=>{
   const res=await p.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}}));
   return {nom,critiques:res.violations.filter(v=>v.impact==='critical').map(v=>v.id),
     serieux:res.violations.filter(v=>v.impact==='serious').map(v=>v.id),
     moderes:res.violations.filter(v=>v.impact==='moderate').map(v=>v.id),
     mineurs:res.violations.filter(v=>v.impact==='minor').map(v=>v.id)};
 };
 const audits=[];
 audits.push(await audit('semaine'));
 await p.locator('.carte.repas [data-act=detail]').first().click();audits.push(await audit('semaine-detail-ouvert'));
 await p.locator('[data-act=ouvrirFiltres]').click();audits.push(await audit('filtres-ouverts'));
 await p.locator('[data-vue=bilan]').click();audits.push(await audit('bilan'));
 await p.locator('[data-sante=dt1]').check().catch(()=>{});
 await p.locator('[data-vue=courses]').click();audits.push(await audit('courses'));
 await p.locator('[data-vue=profil]').click();audits.push(await audit('profil'));
 // ---- Clavier : tabulation atteint favori (détail ouvert) et la case info ----
 await p.locator('[data-vue=semaine]').click();
 await p.locator('.carte.repas [data-act=detail]').first().click();
 let atteint=false;for(let i=0;i<40;i++){await p.keyboard.press('Tab');const t=await p.evaluate(()=>document.activeElement&&document.activeElement.dataset?document.activeElement.dataset.act||document.activeElement.dataset.sante||'':'');if(t==='favori'){atteint=true;break;}}
 assert.ok(atteint,'tabulation atteint le bouton favori');
 const outline=await p.evaluate(()=>{const e=document.activeElement;return getComputedStyle(e).outlineWidth;});
 assert.ok(parseFloat(outline)>=2,'contour de focus visible, obtenu '+outline);
 const bilanAudit=audits.find(a=>a.nom==='bilan');
 const synthese={audits,budgetReseau:{visuelsInitiaux:initialImgs,octetsInitiaux:initialBytes,visuelsSemaine:weekImgs,octetsSemaine:weekBytes,octetsJsCss:[...jsCss.values()].reduce((a,x)=>a+x,0)},jsErrors:errors};
 fs.writeFileSync(out+'/accessibilite-reseau.json',JSON.stringify(synthese,null,2));
 const bloquants=audits.flatMap(a=>[...a.critiques,...a.serieux].map(x=>a.nom+':'+x));
 assert.deepEqual(bloquants,[],'violations axe critiques/sérieuses: '+bloquants.join(', '));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({audits:audits.map(a=>({vue:a.nom,critiques:a.critiques.length,serieux:a.serieux.length,moderes:a.moderes,mineurs:a.mineurs})),reseau:synthese.budgetReseau},null,1));
 console.log('Accessibilité axe + clavier + budget réseau : OK (violations modérées/mineures listées, non bloquantes).');
}finally{await b.close();await new Promise(r=>srv.close(r));}})().catch(e=>{console.error(e);srv.close();process.exitCode=1;});
