---
description: How to add a new ETF fund to TickerTrace
---

# Adding a New Fund to TickerTrace

When the user provides a CSV endpoint URL for a new ETF fund, follow these steps.

// turbo-all

## 1. Add Fund to Scraper Config

Edit `scrape_avantis.py` and add a new entry to the `FUNDS` list:

```python
FUNDS = [
    ...
    {'ticker': 'NEWFUND', 'type': 'csv', 'url': 'https://example.com/holdings.csv'},
]
```

**Notes:**

- `ticker` = the ETF ticker symbol (e.g. `ULTY`, `SLTY`, `ULTI`)
- `type` = usually `'csv'` for direct CSV downloads, or `'avantis'` for Avantis-style scraping
- `url` = the CSV download URL the user provides
- For POST-based downloads (like REX), add `'method': 'post', 'data': {...}`

## 2. Add Fund to Backend Data Maps

Edit `api/data.py` and add the fund to both `FUND_PROVIDERS` and `FUND_AUM`:

```python
FUND_PROVIDERS = {
    ...
    'NEWFUND': 'Provider Name',
}

FUND_AUM = {
    ...
    'NEWFUND': 0.1,  # AUM in billions (approximate)
}
```

## 3. Add Fund to Frontend Maps

Edit `etf-dashboard/lib/holdings.ts` and add the fund to both `FUND_PROVIDERS` and `FUND_AUM`:

```typescript
export const FUND_PROVIDERS: Record<string, string> = {
    ...
    NEWFUND: 'Provider Name',
};

export const FUND_AUM: Record<string, number> = {
    ...
    NEWFUND: 0.1,
};
```

## 4. Add Fund to Analysis Script

Edit `generate_analysis.py` and add the ticker to the `FUNDS` list.

## 5. Add Fund to Verification Script

Edit `verify_etfs.py` and add the ticker to the expected funds list.

## 6. Run Scraper Locally to Test

```bash
cd /home/sam/Antigravity/TickerTrace
python3 scrape_avantis.py
```

Check the output CSV has the new fund's data with correct `ETF Ticker` and resolved `Ticker` values (not `OTHER`).

## 7. Deploy

```bash
git add -A
git commit -m "Add NEWFUND ETF"
git push origin main
ssh vultr "cd /home/mphinance/TickerTrace && git stash && git pull origin main && docker compose build --no-cache && docker compose up -d"
```

## 8. Verify Production

```bash
curl -sk https://api.tickertrace.pro/api/v1/fund/NEWFUND | python3 -m json.tool | head -10
```

## Common Gotchas

1. **Ticker column shows OTHER**: The source CSV doesn't include ticker symbols. The CUSIP lookup module resolves these automatically via `cusip_cache.json` and OpenFIGI. If a CUSIP isn't cached, it gets looked up on first scrape.

2. **ETF Ticker shows PREFIX_FUND**: Some source CSVs (like REX) use internal names like `REX_ULTI` in their `Account` column. The scraper now **always forces** `ETF Ticker` to the config ticker value, so this is handled automatically.

3. **Docker volume is read-only**: The data directory is mounted `ro` in Docker. Scraper writes happen on the host, not inside the container. The container reads the updated files on next API request.

4. **Python 3.6 on Vultr host**: The host has an old Python. Run scraper and data scripts inside Docker: `docker run --rm -v ... python:3.12-slim python3 script.py`
