# Private integration review - 2026-11-14

NOT APPROVED FOR DEPLOYMENT. No push performed. Integration starts at 85d7ce9 and does not contain subsequent photo commits 91d0783 / 0f0100a. Apply changes only after the code owner reconciles with latest main, never replace their tree.

## Current state
- Favorites independent of composition. Button inside expanded recipe, title has room. Toggle preserves focus/open detail and persists locally.
- Nutritional traffic lights suspended. Neutral ring denotes data availability only. This is a fallback, NOT fulfillment of the requested healthy+gourmand rule.
- No medical filter affects generator scoring. Informative per-portion display only; sugar != carbohydrate != glycemic response. No insulin calculation.
- Weekly card presents mean per recipe portion, no full-day or quota thresholds. Complements excluded from that card and explicitly identified; existing complete weekly bilan includes them.
- Existing main nutrition table no longer shows partial numerical totals or coverage percentages for a nutrient with missing source values. Pure calculation API still keeps partial sums for compatibility; callers must honor absents.
- Frozen math module kept unchanged. 120 synthetic test weeks prove arithmetic parity on those fixtures only, not medical validity, data identity, or general UI correctness.
- Data: 28 original changed fields = 22 proposed nutritional fills + 6 metadata. Three non-exact cells rejected (polenta/chestnut sugar traces, prune salt upper bound). 19 numeric cells retained: 15 for two NEW ingredient mappings by name, not original source codes (sauce_huitre 8 + pruneau 7), and 4 for existing original codes (asperge_blanche.sucres, courge.sucres, pecorino.prot, sel.ags). Source MD5 matches official file. See ingredient-deltas.json. Current hole coverage 68/300 under this mapping, NOT 65/300.
- Missing ingredient now propagates null for all composition fields.
- Service-worker fixed for newly loaded equilibre.js and visited assets/gen + assets/photos images. Older SW cached only assets/dessins, causing offline decoding failure. No claim that all images are available offline before visiting.

## Browser evidence
New browser suite uses actual production app and DOM events, no screenshot substitution. Favorite placement/toggle/reload/focus, information setting, 320/390/768 layout, visited images decoded, no JS errors. Screenshots inspected separately.
Existing browser suites run: browser (63 checks), essentiel-browser, navigation, security, achats, coherence-finale, qa-varied, performance300. They pass locally after SW change.
performance300 now counts /assets/gen/ network requests (fixed after counter-audit D3; it previously counted only assets/dessins and reported a 0-byte artifact). Reference payload measurement: accessibilite-reseau.cjs.
Node npm test passes, new app tests 202 grouped cases (50 executions each for neutrality across old health flags, favorites, unknown propagation); original frozen-engine parity 120 weeks passes.

## Update 2026-11-14 (reconciliation + hardening round)
- Reconciled privately with upstream photo commits 91d0783 + 0f0100a via merge (no overwrite): upstream contributed dessins.js pointer + 54 regenerated assets/gen; all integration files kept. Merge commit b43c2f7.
- Plus/details button: neutral data status no longer styles the button as disabled (solid border, full opacity, normal cursor); data availability is text under the title.
- Estimate wording moved next to figures: "~" prefix + per-line "estimation, cru/cuit non résolu", bold lead-in above the weekly card numbers and per-dish lines.
- axe-core 4.10.2 (WCAG 2.1 A/AA): 0 critical, 0 serious, 0 moderate, 0 minor on semaine, detail open, filters open, bilan, courses, profil (local Chrome, single viewport 390x844; not a screen-reader audit).
- Keyboard: Tab reaches the favorite button in an open detail; visible focus outline >= 2px.
- Network budget measured (all assets/ dirs, real transferred bytes): 4 visuals / 271 KB at first view, 7 visuals / 488 KB for the week. Applicative JS+CSS+data is about 399 KB; the harness measured 952 019 o total because it loaded tests/vendor-axe.min.js (553 290 o), a test-only file excluded from the repository. Lazy loading respected (2 eager). This replaces the old dessins-only counter (0 bytes artifact).
- Full battery green after merge: npm test, 202 app cases, 120-week parity, browser 63 checks, essentiel-browser, navigation, security, achats, coherence-finale, qa-varied, performance300, accessibilite-reseau.

## Update 2026-11-15 (counter-audit APP v2, fixes D1-D7)
- D5 (main fix): scorePlan no longer reads any nutrient sum. Every nutrient with a weekly reference has at least one missing source cell in the catalog (protein: 3 ingredients, selenium: 56), so any summed term was a partial sum for some plans - forbidden by the contract (unknown is not 0, never a numeric partial sum). Per-plan exclusion would hide a reward or penalty for holed recipes; global exclusion would empty all 15 nutrients. The generation score keeps only its declared terms: PNNS occasions (fish, legumes, red meat and charcuterie grams), budget, variety/form/family, seasonality soft bonus, bounded favorites. Display still propagates "non calculable". New suite tests/score-trous.cjs: 50 seeds x 25 plans x 3 months, rankings and exact scores strictly identical with real data, aggravated holes, and arbitrarily filled holes.
- D6: dead `saison` variable removed from the poolDuMois override; all-season pool is intentional (soft season bonus in scorePlan), comment says so.
- D3: tests/performance300.cjs now counts /assets/gen/ (real visuals) instead of /assets/dessins/ only; reference measurement remains accessibilite-reseau.cjs.
- D1: retained-fill count corrected above (15 new-mapping + 4 existing-code = 19; journal recounted independently, auditor count confirmed exact).
- D2: docs/SNAPSHOT-COMMIT.txt updated to the reconciliation merge b43c2f7.
- D4: network claim split above (399 KB applicative vs 553 KB test-only vendor file).
- D7 (hygiene, not blocking): 13 jpgs in assets/photos unused (DESSINS_PLATS points 300/300 to gen), t41.jpg has no credit in CREDITS_PHOTOS (12 entries). To resolve before any future publication that would wire photos; out of scope for this phase.

## Known remaining work / blockers
- Scientifically defensible healthy+gourmand definition and UI rings remain unresolved. Favorite is not evidence of gourmand. No medical quotas shipped as substitute.
- Evidence for a useful DT1/DT2/cholesterol workflow remains to be established with validated clinical/product scope. Current display is neutral information only.
- Raw/cooked identity and recipe quantities/yields remain unverified across 300 recipes. No kitchen validation, no medical certification.
- Provenance of new ingredient mappings remains mapping judgment; matching food names is not laboratory identity proof.
- Contrast inspected informally; no complete automated WCAG/assistive-technology audit. Keyboard focus checked for favorite and information control, not every path.
- Need fresh independent APP counter-audit, reconcile latest photo commits, complete image catalogue/load checks, and explicit publication authority before deployment.

## Reproduce
npm install (dev dependency playwright pinned by project); set CHROME_BIN=/usr/bin/google-chrome-stable where supported.
npm test
node tests/equilibre-app.cjs
node tests/equilibre-parite.cjs
node tests/trous-donnees-reelles.cjs
node tests/equilibre-browser.cjs
CHROME_BIN=/usr/bin/google-chrome-stable node tests/essentiel-browser.cjs
