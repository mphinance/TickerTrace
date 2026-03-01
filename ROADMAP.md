# TickerTrace — Feature Roadmap

## ✅ Shipped

- Pipeline fix (DB schema, SQLite SQL, data cleanup)
- Dashboard redesign (institutional buying signals, accumulating/reducing/options)
- Passive ETF removal (IVV/IWM/IBIT)

## 🚧 In Progress

- **Conviction Score** — Dollar-weighted signal per ticker using fund AUM
- **Streak Tracking** — Consecutive-day accumulation/reduction detection
- **Cross-Fund Overlap** — Alert when multiple independent PMs converge on a name
- **Pre-Market Briefing** — Retail briefing card with top institutional moves + catalyst context
- **Option Flow Decoder** — Translate CSP/CC positions into directional views

## 📋 Next Up

### Discord Webhook Alerts (#4)

Self-serve: user pastes their Discord webhook URL into the UI, hits "Send Daily Digest." Generates a rich embed with top buying/selling signals. Future: save webhook + auto-send via cron.

### Divergence Detector (#7)

Flag when funds from the same shop (e.g., ARKK vs ARKW) take opposite positions on the same ticker. Also cross-provider divergences.

### Sector Rotation Heatmap (#8)

30-day rolling heatmap showing aggregate sector weight changes across all tracked funds.

## 🔮 Future / Ambitious

### Predictive Position Sizing (#9)

Model ARK's typical build pattern (3-5 day ramp) to estimate how far into a position they are.

### Rebalance Anticipation (#10)

Track AVUV/AVLV weight drift to predict quarterly rebalance trades before they happen.

### Synthetic Institutional Momentum ETF (#11)

Auto-generated portfolio of top 20 most-accumulated tickers, rebalanced daily. Backtestable.

### Options Expiry Cascade (#12)

Calendar view of upcoming option expiries → predict forced assignment/release flow on underlyings.

### Dark Pool Correlation (#13)

Cross-reference holding changes with FINRA dark pool volume (free, 2-week delayed) to confirm execution patterns.

### Institutions vs. Retail (#14)

Overlay ETF holding changes against retail flow data (Reddit sentiment, popular tickers) to visualize the information asymmetry gap.
