/* Tests navigateur de l'export de la liste de courses. node tests/export-browser.cjs [URL] */
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..'); let passed = 0; const errors = [];
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); p = path.join(root, p === '/' ? 'index.html' : p); try { const b = fs.readFileSync(p); res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.png') ? 'image/png' : p.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/html'); res.end(b); } catch { res.writeHead(404); res.end('Introuvable'); } });
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };
(async () => {
  await new Promise(r => server.listen(8124, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const url = process.argv[2] || 'http://127.0.0.1:8124/';

  // Contexte 1 : presse-papier simulé, pas de navigator.share.
  const c1 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await c1.addInitScript(() => { window.__copie = null; navigator.clipboard.writeText = t => { window.__copie = t; return Promise.resolve(); }; });
  const p1 = await c1.newPage(); p1.on('pageerror', e => errors.push(e.message));
  await p1.goto(url); await p1.locator('.carte[data-id]').first().waitFor();
  await p1.locator('[data-vue=courses]').click();
  ok(await p1.locator('[data-act=copierListe]').isVisible(), 'bouton Copier visible');
  ok(!(await p1.locator('[data-act=partagerListe]').count()), 'bouton Partager masqué sans navigator.share');
  await p1.locator('[data-act=copierListe]').click();
  await p1.locator('#statutExport').filter({ hasText: 'Liste copiée' }).waitFor();
  ok((await p1.locator('[data-act=copierListe]').textContent()).includes('Copié'), 'retour visuel immédiat sur le bouton après copie');
  const copie = await p1.evaluate(() => window.__copie);
  ok(copie.startsWith('Liste de courses - semaine du '), 'texte copié commence par le titre daté');
  ok(copie.split('\n').filter(l => l.startsWith('- ')).length >= 10, 'articles copiés');
  const nbAvant = copie.split('\n').filter(l => l.startsWith('- ')).length;
  await p1.locator('[data-course]').first().check();
  await p1.locator('[data-act=copierListe]').click();
  await p1.locator('#statutExport').filter({ hasText: 'Liste copiée' }).waitFor();
  const copie2 = await p1.evaluate(() => window.__copie);
  ok(copie2.split('\n').filter(l => l.startsWith('- ')).length === nbAvant - 1, 'article coché exclu de la copie');
  await p1.screenshot({ path: '/downloads/export-courses-mobile.png', fullPage: true });

  // Tout coché : aucune écriture dans le presse-papier, message explicite.
  const cases = await p1.locator('[data-course]').count();
  for (let i = 0; i < cases; i++) await p1.locator('[data-course]').nth(i).check();
  await p1.locator('[data-act=copierListe]').click();
  await p1.locator('#statutExport').filter({ hasText: 'Tout est déjà coché' }).waitFor();
  ok((await p1.evaluate(() => window.__copie)) === copie2, 'tout coché : rien de copié');
  ok(await p1.locator('#zoneRepli').isHidden(), 'zone de repli masquée quand tout est coché');
  await c1.close();

  // Contexte 2 : navigator.share présent, copie refusée (repli).
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await c2.addInitScript(() => {
    window.__partage = null; window.__repli = false;
    navigator.share = s => { window.__partage = s; return Promise.resolve(); };
    navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
    document.execCommand = () => { window.__repli = true; return true; };
  });
  const p2 = await c2.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(url); await p2.locator('.carte[data-id]').first().waitFor();
  await p2.locator('[data-vue=courses]').click();
  ok(await p2.locator('[data-act=partagerListe]').isVisible(), 'bouton Partager visible avec navigator.share');
  await p2.locator('[data-act=partagerListe]').click();
  await p2.waitForFunction(() => window.__partage && window.__partage.text && window.__partage.text.startsWith('Liste de courses'));
  ok(true, 'partage reçoit le texte de la liste');
  await p2.locator('[data-act=copierListe]').click();
  await p2.locator('#statutExport').filter({ hasText: 'Liste copiée' }).waitFor();
  ok(await p2.evaluate(() => window.__repli), 'repli execCommand utilisé quand le presse-papier refuse');
  await c2.close();

  // Contexte 3 : copie refusée partout, la zone de repli affiche le texte à copier à la main.
  const c3 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await c3.addInitScript(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
    document.execCommand = () => false;
  });
  const p3 = await c3.newPage(); p3.on('pageerror', e => errors.push(e.message));
  await p3.goto(url); await p3.locator('.carte[data-id]').first().waitFor();
  await p3.locator('[data-vue=courses]').click();
  await p3.locator('[data-act=copierListe]').click();
  await p3.locator('#zoneRepli').waitFor({ state: 'visible' });
  ok((await p3.locator('#zoneRepli').inputValue()).startsWith('Liste de courses - semaine du '), 'zone de repli affiche le texte complet');
  ok((await p3.locator('#statutExport').textContent()).includes('refusée'), 'message de refus explicite');
  await p3.screenshot({ path: '/downloads/export-courses-repli.png' });
  await c3.close();

  // Contexte 4 : petit écran 320px, pas de débordement horizontal.
  const c4 = await browser.newContext({ viewport: { width: 320, height: 568 }, locale: 'fr-FR' });
  const p4 = await c4.newPage(); p4.on('pageerror', e => errors.push(e.message));
  await p4.goto(url); await p4.locator('.carte[data-id]').first().waitFor();
  await p4.locator('[data-vue=courses]').click();
  await p4.waitForTimeout(400);
  ok(await p4.locator('[data-act=copierListe]').isVisible(), 'bouton Copier visible en 320px');
  ok(await p4.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'aucun débordement horizontal en 320px');
  await p4.screenshot({ path: '/downloads/export-courses-320.png' });
  await c4.close();

  await browser.close(); server.close();
  const propres = errors.filter(e => !/favicon/.test(e));
  ok(propres.length === 0, 'aucune erreur page : ' + propres.join(' | '));
  console.log(passed + ' tests export-browser passés.');
})().catch(e => { console.error('KO export-browser :', e.message); process.exit(1); });
