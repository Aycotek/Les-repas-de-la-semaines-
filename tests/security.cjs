/* Audit défensif local et tests de régression, pas un pentest de GitHub. */
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');let n=0;const ok=(x,m)=>{assert.ok(x,m);n++;};
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));try{const b=fs.readFileSync(p);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':p.endsWith('.webmanifest')?'application/manifest+json':'text/html');res.end(b);}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>server.listen(8124,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const page=await browser.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 const url=process.argv[2]||'http://127.0.0.1:8124/';await page.goto(url+'?name=%3Cscript%3Ealert(1)%3C/script%3E');await page.locator('.carte[data-id]').first().waitFor();
 const attacks=['<img src=x onerror="window.pwned=1">','<svg onload="window.pwned=2"></svg>','<script>window.pwned=3</script>','&lt;img src=x onerror=window.pwned=4&gt;',"</span><a href='javascript:window.pwned=5'>X</a>","'\"` ${7*7}"];
 await page.locator('[data-vue=courses]').click();
 for(const text of attacks){await page.locator('#ajoutTxt').fill(text);await page.locator('#formAjout button').click();ok(await page.locator('#vue-courses img,#vue-courses svg,#vue-courses script,#vue-courses a').count()===0,'pas de balise injectée');ok(!await page.evaluate(()=>window.pwned),'charge XSS non exécutée');}
 await page.reload();await page.locator('[data-vue=courses]').click();ok(!await page.evaluate(()=>window.pwned),'XSS stockée non exécutée');
 const malicious=['__proto__','constructor','toString',{},null,3];
 await page.evaluate(ids=>{const key=Object.keys(localStorage).find(k=>k.startsWith('ns_plan_'));localStorage.setItem(key,JSON.stringify(ids));localStorage.setItem(key.replace('ns_plan_','ns_repas_'),JSON.stringify(ids));localStorage.setItem(key.replace('ns_plan_','ns_courses_'),'{}');},malicious);
 await page.reload();await page.locator('.carte[data-id]').first().waitFor();ok(await page.locator('.carte[data-id]').count()===7,'prototype/objets dans stockage ne cassent pas le plan');
 await page.evaluate(()=>localStorage.setItem('ns_profil','{"personnes":null,"exclusions":42,"materiel":{},"budget":"NaN","portionsParRecette":-1}'));await page.reload();ok(await page.locator('.carte[data-id]').count()===7,'profil corrompu récupéré');
 const before=await page.evaluate(()=>window.injected);await page.evaluate(()=>{const s=document.createElement('script');s.textContent='window.injected=99';document.head.append(s);});ok(await page.evaluate(()=>window.injected)===before,'CSP bloque script inline');
 ok(errors.length===0,'aucune exception sur charges malformées '+errors.join(','));
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');ok(!/\beval\s*\(|new Function|document\.write|fetch\s*\(|XMLHttpRequest/.test(source),'pas évaluation dynamique ni envoi réseau dans app');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');ok(!/script[^>]+https?:/i.test(html),'pas script externe');ok(html.includes("script-src 'self'"),'scripts CSP limités même origine');ok(html.includes("object-src 'none'"),'objets intégrés interdits');
 // Worker : seules nos versions sont supprimées, seules nos ressources sont interceptées.
 const handlers={},deleted=[];let pending;const scope='https://example.test/repas/';const prefix='repas-'+encodeURIComponent(scope)+'-';const cur=fs.readFileSync(path.join(root,'sw.js'),'utf8').match(/CACHE=PREFIX\+"([^"]+)"/)[1];
 const ctx={URL,encodeURIComponent,self:{registration:{scope},location:{origin:'https://example.test'},addEventListener:(k,f)=>handlers[k]=f,clients:{claim:()=>Promise.resolve()}},caches:{keys:async()=>['autre-app-cache',prefix+'v1',prefix+cur],delete:async k=>deleted.push(k)},Promise};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),ctx);
 handlers.activate({waitUntil:p=>pending=p});await pending;ok(deleted.length===1&&deleted[0]===prefix+'v1','worker préserve caches autres apps');
 let intercepted=false;handlers.fetch({request:{method:'GET',url:'https://example.test/autre-app/confidentiel'},respondWith:()=>intercepted=true});ok(!intercepted,'worker ne cache pas ressources hors application');
 handlers.fetch({request:{method:'POST',url:scope+'app.js'},respondWith:()=>intercepted=true});ok(!intercepted,'worker ignore écritures');
 console.log(`${n} contrôles sécurité passés sur ${url}. Audit limité, zéro faille non garanti.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
