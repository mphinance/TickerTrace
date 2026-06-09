import os
from collections import defaultdict
from generate_analysis import read_csv, build_map, DATA_DIR

today = sorted([f.replace('holdings_', '').replace('.csv', '') for f in os.listdir(DATA_DIR) if f.startswith('holdings_') and f.endswith('.csv')], reverse=True)[0]
curr = read_csv(os.path.join(DATA_DIR, f'holdings_{today}.csv'))
for r in curr:
    if r.get('ETF Ticker') == "MSTY":
        print(r)
        break

curr_map = build_map(curr)
print("Total curr_map size:", len(curr_map))

yield_funds = {'MSTY', 'MSTW', 'NVDY', 'NVDW', 'NVII', 'CONY', 'COIW', 'TSLY', 'TSLW', 'TSII', 'HOOY', 'HOOW', 'PLTY', 'PLTW', 'QDTE', 'XDTE', 'RDTE', 'YBTC'}
yield_opts = []

for key, c in curr_map.items():
    if c['fund'] in yield_funds:
        if c['option_type']:
            yield_opts.append(c)

print("Detected yield options:", len(yield_opts))
if yield_opts:
    print("Sample:", yield_opts[0])
else:
    # See if the funds exist
    funds = set(c['fund'] for c in curr_map.values())
    print("Available funds:", funds)

