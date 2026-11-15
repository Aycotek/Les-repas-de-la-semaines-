#!/usr/bin/env python3
"""Non-régression rebuild (B1) : reconstruit la table depuis le CSV CIQUAL 2020 officiel
et vérifie que les kcal 'calc' livrés restent reproductibles, y compris quand un delta
a modifié un macro (dépendance kcal recalculée). Usage : python3 tests/rebuild-check.py CHEMIN_CSV
Sans CSV (pas de réseau en CI), le test est ignoré proprement (sortie 0, message clair)."""
import json, os, subprocess, sys, tempfile

def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('CIQUAL2020_CSV', '/tmp/ciqual2020.csv')
    if not os.path.exists(csv_path):
        print(f"rebuild-check ignoré : CSV CIQUAL 2020 absent ({csv_path}). Fournir le CSV officiel pour le contrôle complet.")
        return 0
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with tempfile.TemporaryDirectory() as td:
        out = os.path.join(td, 'rebuilt.js')
        r = subprocess.run([sys.executable, os.path.join(root, 'tools', 'build_ingredients.py'), csv_path, out],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print('rebuild-check : échec du build\n' + r.stdout + r.stderr); return 1
        js = open(out, encoding='utf-8').read()
    rebuilt = json.loads(js.split('=', 1)[1].strip().rstrip(';'))
    # charge les données livrées via node (fichier JS)
    q = subprocess.run(['node', '-e',
        f"require('{os.path.join(root,'data','ingredients.js')}');process.stdout.write(JSON.stringify(globalThis.INGREDIENTS))"],
        capture_output=True, text=True)
    delivered = json.loads(q.stdout)
    # alcool par code depuis le CSV
    import csv as csvm
    alc = {}
    with open(csv_path, encoding='utf-8') as f:
        for row in csvm.DictReader(f, delimiter='\t'):
            alc[row['alim_code']] = row.get('Alcohol (g/100g)')
    def num(v):
        if v is None: return None
        v = str(v).strip().replace(',', '.')
        if v in ('-', ''): return None
        if v == 'traces': return 0.0
        if v.startswith('<'):
            try: return float(v[1:]) / 2
            except ValueError: return None
        try: return float(v)
        except ValueError: return None
    bad, checked, deltas_couvert = [], 0, 0
    for key, ing in delivered.items():
        if ing.get('kcalSrc') != 'calc':
            continue
        a = num(alc.get(str(ing.get('ciqual')))) or 0
        attendu = round(4 * (ing.get('prot') or 0) + 4 * (ing.get('gluc') or 0) + 9 * (ing.get('lip') or 0)
                        + 2 * (ing.get('fibres') or 0) + 7 * a, 1)
        checked += 1
        if abs(attendu - ing['kcal']) > 0.15:
            bad.append(f"{key}: livré {ing['kcal']} vs attendu {attendu}")
        base = rebuilt.get(key)
        if base and base.get('kcalSrc') == 'calc':
            macros_identiques = all((base.get(m) or 0) == (ing.get(m) or 0) for m in ('prot', 'gluc', 'lip', 'fibres'))
            if macros_identiques and abs(base['kcal'] - ing['kcal']) > 0.15:
                bad.append(f"{key}: rebuild {base['kcal']} != livré {ing['kcal']} à macros identiques (régression type B1)")
            elif not macros_identiques:
                deltas_couvert += 1  # macro modifié par un delta, kcal recalculé (vérifié ci-dessus)
    if bad:
        print('ÉCHEC rebuild-check:\n' + '\n'.join(bad)); return 1
    print(f"rebuild-check OK : {checked} kcal calc reproductibles depuis le CSV officiel "
          f"({deltas_couvert} avec dépendance recalculée après delta).")
    return 0

sys.exit(main())
