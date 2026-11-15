const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out='/downloads/repas-app-neutral';fs.mkdirSync(out,{recursive:true});
const srv=http.createServer((req,res)=>{try{const f=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>srv.listen(8281,'127.0.0.1',r));const b=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8281/');
 const first=p.locator('.carte.repas').first();assert.equal(await first.locator('[data-act=favori]').isVisible(),false);
 await first.locator('[data-act=detail]').click();const fav=first.locator('[data-act=favori]');await fav.click();assert.equal(await fav.getAttribute('aria-pressed'),'true');assert.equal(await fav.isVisible(),true);assert.equal(await fav.evaluate(e=>e===document.activeElement),true);
 await p.reload();await p.locator('.carte.repas').first().locator('[data-act=detail]').click();assert.equal(await p.locator('.carte.repas').first().locator('[data-act=favori]').getAttribute('aria-pressed'),'true');
 await p.locator('.carte.repas').first().scrollIntoViewIfNeeded();await p.screenshot({path:out+'/favorite-detail.png'});
 await p.locator('[data-act=ouvrirFiltres]').click();await p.locator('[data-sante=dt1]').check();assert.equal(await p.locator('[data-sante=dt1]').isChecked(),true);
 await p.locator('[data-sante=dt1]').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/information-choice.png'});
 await p.locator('[data-vue=bilan]').click();await p.locator('.bilan-v5').scrollIntoViewIfNeeded();assert.match(await p.locator('.bilan-v5').innerText(),/Composition par portion prévue/);await p.screenshot({path:out+'/composition.png'});
 // All actual menu images: scroll lazy images into view, then await successful decoding.
 await p.locator('[data-vue=semaine]').click();for(const img of await p.locator('.carte.repas .visuel img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());assert.ok(await img.evaluate(i=>i.naturalWidth>0));}
 for(const width of [320,390,768]){await p.setViewportSize({width,height:844});for(const v of ['semaine','bilan','courses','profil']){await p.locator(`[data-vue=${v}]`).click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+'/'+v);}}
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({favoriteDetail:true,persistence:true,focusPreserved:true,informativeOnly:true,imagesDecoded:true,widths:[320,390,768],errors},null,2));console.log('Neutral UX browser passed: favorites, reload, focus, information, real image decoding and width checks.');
}finally{await b.close();await new Promise(r=>srv.close(r));}})().catch(e=>{console.error(e);srv.close();process.exitCode=1;});
