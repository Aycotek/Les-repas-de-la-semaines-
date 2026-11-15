/* Équilibre de la semaine — régime v5 « inconnu ≠ 0 » (copie privée d'intégration, non publié).
   Parité exacte avec le générateur Python audité (src/generator.py v5.1, hash 9584769cf4db) :
   - un champ troué (None) n'est JAMAIS traité comme 0 : moyenne/ratio/décompte = « non calculable » ;
   - ratio AGS pondéré par l'énergie (pas moyenne de pourcentages) ;
   - les violations « non calculable » sont statufiées, jamais chiffrées.
   Module pur (sans DOM) : testable en node, monté dans l'app par app.js. */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.EQUILIBRE = factory();
})(typeof self !== "undefined" ? self : globalThis, function () {
  const FISH = new Set(["poisson_maigre", "poisson_gras"]);
  const REDMEAT = new Set(["viande", "porc"]); // D6 : le porc est une viande rouge (PNNS/IARC)
  const LEGUMES = new Set(["legumineuses"]);

  function targets(mode) {
    return {
      fish_min: 2, fatty_min: 1, redmeat_max: 1, legumes_min: 2,
      ags_e_mean_max: 12.0, fibres_mean_min: 6.5, sel_mean_max: 1.3,
      ags_soft_cap: mode === "cholesterol" ? 10.0 : null,     // >=4/7 plats sous ce seuil (conception)
      sucres_soft_cap: mode === "glycemie" ? 6.0 : null,      // >=5/7 plats sous ce seuil (conception)
      soft_count: mode === "cholesterol" ? 4 : (mode === "glycemie" ? 5 : 0),
    };
  }

  const pyNum = x => Number.isInteger(x) ? x + ".0" : String(x); // f-string Python d'un float

  function fams(r) {
    const f = new Set();
    if (r.t) f.add(r.t);
    if (r.t2) f.add(r.t2);
    if (r.legum) f.add("legumineuses"); // drapeau fourni par l'app (contientLegumineuses)
    return f;
  }
  const intersect = (a, b) => [...a].some(x => b.has(x));

  // ags_e d'un plat : % d'énergie venant des AGS ; None si ags ou kcal inconnu (jamais 0 par défaut)
  function agsEnergie(r) {
    if (r.ags_e != null) return r.ags_e;
    if (r.ags == null || r.kcal == null || r.kcal === 0) return null;
    return r.ags * 9 / r.kcal * 100;
  }

  function scaled(r, factor) {
    if (factor == null || factor === 1) return r;
    const out = Object.assign({}, r);
    for (const k of ["kcal", "prot", "gluc", "sucres", "lip", "ags", "fibres", "sel", "alcool", "veg_g"])
      out[k] = r[k] == null ? null : r[k] * factor;
    out.ags_e = r.ags_e; // ratio inchangé (None si non calculable)
    return out;
  }

  function weekStats(week, scales) {
    const n = week.length;
    if (scales) week = week.map(x => scaled(x, (scales[x.id] != null ? scales[x.id] : 1)));
    // inconnu != 0 : une moyenne/ratio est NON CALCULABLE (null) dès qu'un plat a le champ troué
    const m = k => week.some(x => x[k] == null) ? null : week.reduce((s, x) => s + x[k], 0) / n;
    const withAgsE = week.map(x => ({ x, ae: agsEnergie(x) }));
    return {
      ags_e_mean: withAgsE.some(p => p.ae == null) ? null : withAgsE.reduce((s, p) => s + p.ae, 0) / n,
      fibres_mean: m("fibres"),
      sel_mean: m("sel"),
      kcal_mean: m("kcal"),
      veg_mean: week.some(x => x.veg_g == null) ? null : week.reduce((s, x) => s + x.veg_g, 0) / n,
      fish: week.filter(x => intersect(fams(x), FISH)).length,
      fatty: week.filter(x => fams(x).has("poisson_gras")).length,
      redmeat: week.filter(x => intersect(fams(x), REDMEAT)).length,
      legumes: week.filter(x => intersect(fams(x), LEGUMES)).length,
      // pondéré énergie, pas moyenne de %
      ags_e_ratio: (week.some(x => x.ags == null || x.kcal == null) || week.reduce((s, x) => s + x.kcal, 0) === 0)
        ? null
        : week.reduce((s, x) => s + x.ags * 9, 0) / week.reduce((s, x) => s + x.kcal, 0) * 100,
    };
  }

  function displayStats(s) {
    const out = Object.assign({}, s);
    const rnd = (v, d) => v == null ? null : Math.round(v * 10 ** d) / 10 ** d;
    out.ags_e_mean = rnd(s.ags_e_mean, 2); out.ags_e_ratio = rnd(s.ags_e_ratio, 2);
    out.fibres_mean = rnd(s.fibres_mean, 2); out.sel_mean = rnd(s.sel_mean, 3);
    out.kcal_mean = rnd(s.kcal_mean, 1); out.veg_mean = rnd(s.veg_mean, 1);
    return out;
  }

  function violations(week, tg, scales) {
    const s = weekStats(week, scales); // weekStats scale en interne
    const v = [];
    if (s.fish < tg.fish_min) v.push(`poisson ${s.fish}<${tg.fish_min}`);
    if (s.fatty < tg.fatty_min) v.push(`poisson_gras ${s.fatty}<${tg.fatty_min}`);
    if (s.redmeat > tg.redmeat_max) v.push(`viande ${s.redmeat}>${tg.redmeat_max}`);
    if (s.legumes < tg.legumes_min) v.push(`légumineuses ${s.legumes}<${tg.legumes_min}`);
    if (s.ags_e_ratio == null) v.push("AGS%E non calculable (données incomplètes)");
    else if (s.ags_e_ratio > tg.ags_e_mean_max) v.push(`AGS%E (ratio énergétique) ${Math.round(s.ags_e_ratio * 100) / 100}>${pyNum(tg.ags_e_mean_max)}`);
    if (s.fibres_mean == null) v.push("fibres moyennes non calculables (données incomplètes)");
    else if (s.fibres_mean < tg.fibres_mean_min) v.push(`fibres moyennes ${pyNum(s.fibres_mean)}<${pyNum(tg.fibres_mean_min)}`);
    if (s.sel_mean == null) v.push("sel moyen non calculable (données incomplètes)");
    else if (s.sel_mean > tg.sel_mean_max) v.push(`sel moyen ${pyNum(s.sel_mean)}>${pyNum(tg.sel_mean_max)}`);
    if (scales) week = week.map(x => scaled(x, (scales[x.id] != null ? scales[x.id] : 1)));
    if (tg.ags_soft_cap) {
      if (week.some(x => agsEnergie(x) == null)) v.push("plats AGS%E non dénombrables (données incomplètes)");
      else {
        const c = week.filter(x => agsEnergie(x) <= tg.ags_soft_cap).length;
        if (c < tg.soft_count) v.push(`plats AGS≤${pyNum(tg.ags_soft_cap)}%E ${c}<${tg.soft_count}`);
      }
    }
    if (tg.sucres_soft_cap) {
      if (week.some(x => x.sucres == null)) v.push("plats sucres non dénombrables (données incomplètes)");
      else {
        const c = week.filter(x => x.sucres <= tg.sucres_soft_cap).length;
        if (c < tg.soft_count) v.push(`plats sucres≤${pyNum(tg.sucres_soft_cap)}g ${c}<${tg.soft_count}`);
      }
    }
    return v;
  }

  return { FISH, REDMEAT, LEGUMES, targets, fams, agsEnergie, scaled, weekStats, displayStats, violations };
});
