# TickerTrace — ETF Holdings Tracker

A lightweight, automated system for scraping, storing, and tracking daily ETF holdings across multiple fund families. Runs on GitHub Actions every weekday — no server required.

---

## 📦 Covered ETFs

| Provider | Tickers |
|---|---|
| **Avantis** | AVUV, AVLV |
| **ARK Invest** | ARKK, ARKQ, ARKW, ARKG, ARKF, ARKX |
| **iShares** | IVV, IBIT, IWM |
| **Kurv** | KYLD, KQQQ |
| **YieldMax** | ULTY |
| **REX Shares** | ULTI |
| **NicholasX / Tidal** | BLOX |

---

## 🚀 How It Works

1. **GitHub Actions** runs `scrape_avantis.py` every weekday at **11:00 PM UTC** (6 PM EST)
2. Holdings are normalized across all fund formats into a unified schema
3. Data is stored in **SQLite** (`data/holdings.db`) with 30-day rolling retention
4. A `DailyChanges` table tracks position deltas between days
5. Results are committed back to the repo automatically

---

## 🗄 Data Schema

### `Holdings` table
| Column | Type | Description |
|---|---|---|
| Date | TEXT | Scrape date (YYYY-MM-DD) |
| ETF_Ticker | TEXT | Fund identifier |
| Name | TEXT | Security name |
| Ticker | TEXT | Holding ticker |
| Weight | REAL | % of fund |
| Share_Quantity | REAL | Shares held |
| Market_Value | REAL | USD market value |
| Sector / Country | TEXT | Where available |

### `DailyChanges` table
Tracks `Qty_Delta` and `Weight_Delta` between consecutive trading days.

---

## 🛠 Local Usage

```bash
pip install -r requirements.txt
python db_setup.py     # Initialize SQLite DB
python scrape_avantis.py  # Run scraper
python check_db.py     # Inspect DB results
```

---

## 📁 Project Structure

```
TickerTrace/
├── scrape_avantis.py       # Main scraper (all fund sources)
├── db_setup.py             # SQLite schema setup
├── check_db.py             # DB inspection utility
├── cleanup_db.py           # Manual data retention sweep
├── verify_etfs.py          # Validate fund URLs/formats
├── requirements.txt
├── data/
│   ├── holdings.db         # SQLite database
│   ├── raw/                # Daily raw CSV backups per fund
│   └── historical/         # Pre-loaded historical snapshots
├── .github/workflows/
│   └── scrape.yml          # GitHub Actions automation
└── normalized_holdings.csv # Flat CSV export (latest day)
```

---

## ⚙️ GitHub Actions

Workflow: `.github/workflows/scrape.yml`
- Runs **Mon–Fri at 11:00 PM UTC**
- Manual trigger available via **Actions → Run workflow**
- Commits updated `holdings.db`, `scraper.log`, and `normalized_holdings.csv` back to `main`

---

*Built for speed, modularity, and zero-infrastructure operation.*
