"""
Tests for api/data.py — the business logic that takes raw holdings CSVs and
produces signals, changes, sector flow, divergences. These are the most
important things to not break, since they drive the public API.

Fixtures live in tests/fixtures/. The conftest fixture re-points
api.data.HISTORY_DIR at that directory so the tests don't depend on
production data files.
"""

import os


def test_read_csv_dedupes_by_fund_ticker(tmp_path, monkeypatch):
    """Regression: the Corgi Funds JSON API returns a historical time-series
    rather than today's snapshot, so its rows can appear N times in a daily
    CSV — once per past holding_date. _read_csv must collapse to one row per
    (fund, ticker), keeping the most-recent holding_date. Without this fix,
    /api/v1/ticker/GOOGL was showing CMAG holding GOOGL 8 times.
    """
    from api import data as _data

    csv_path = tmp_path / "holdings_2026-05-16.csv"
    # Three rows for (CMAG, GOOGL) at different holding_dates, plus one
    # row for (KQQQ, GOOGL) and one for (CMAG, NVDA) which should pass
    # through untouched.
    csv_path.write_text(
        "ETF Ticker,Ticker,Name,Share Quantity,Weight,holding_date\n"
        "CMAG,GOOGL,Alphabet,1000,1.00,2026-05-07\n"
        "CMAG,GOOGL,Alphabet,605,1.24,2026-05-18\n"  # latest — keep this one
        "CMAG,GOOGL,Alphabet,800,1.10,2026-05-12\n"
        "KQQQ,GOOGL,Alphabet,38220,12.83,2026-05-18\n"
        "CMAG,NVDA,Nvidia,400,2.50,2026-05-18\n"
    )

    rows = _data._read_csv(str(csv_path))

    # Build a quick lookup for assertions.
    keys = [(r["ETF Ticker"], r["Ticker"]) for r in rows]
    assert len(keys) == len(set(keys)), f"duplicates remain: {keys}"
    assert ("CMAG", "GOOGL") in keys
    assert ("KQQQ", "GOOGL") in keys
    assert ("CMAG", "NVDA") in keys

    # The CMAG GOOGL row kept must be the 2026-05-18 one (605 shares).
    cmag_googl = next(r for r in rows if r["ETF Ticker"] == "CMAG" and r["Ticker"] == "GOOGL")
    assert cmag_googl["Share Quantity"] == "605"
    assert cmag_googl["holding_date"] == "2026-05-18"


def test_read_csv_dedupe_without_holding_date_keeps_first(tmp_path):
    """When rows don't carry a holding_date (older provider format),
    _read_csv still dedupes safely — first-seen row wins, downstream
    code is protected from emitting duplicate (fund, ticker) entries."""
    from api import data as _data

    csv_path = tmp_path / "holdings_2026-05-16.csv"
    csv_path.write_text(
        "ETF Ticker,Ticker,Name,Share Quantity,Weight\n"
        "ARKK,TSLA,Tesla,100000,9.20\n"
        "ARKK,TSLA,Tesla,99999,9.19\n"  # bogus dup — should be dropped
    )
    rows = _data._read_csv(str(csv_path))
    assert len(rows) == 1
    assert rows[0]["Share Quantity"] == "100000"


def test_get_available_dates(data_with_fixtures):
    d = data_with_fixtures
    dates = d.get_available_dates()
    assert dates == ["2026-05-16", "2026-05-15"], "newest-first ordering"


def test_get_as_of_date(data_with_fixtures):
    assert data_with_fixtures.get_as_of_date() == "2026-05-16"


def test_compute_daily_changes_basic_shape(data_with_fixtures):
    changes = data_with_fixtures.compute_daily_changes()
    assert isinstance(changes, list)
    assert len(changes) > 0
    for c in changes:
        # Every row has the expected keys
        for k in ("fund", "ticker", "weightDelta", "type"):
            assert k in c, f"missing key {k} in {c}"


def test_compute_daily_changes_detects_new_position(data_with_fixtures):
    """PLTR appears in 05-16 but not 05-15 → should be a NEW change."""
    changes = data_with_fixtures.compute_daily_changes()
    pltr = [c for c in changes if c["ticker"] == "PLTR" and c["fund"] == "ARKK"]
    assert len(pltr) == 1, "PLTR should appear exactly once for ARKK"
    assert pltr[0]["type"] == "NEW"
    assert pltr[0]["weightDelta"] > 0


def test_compute_daily_changes_detects_weight_change(data_with_fixtures):
    """TSLA weight increased in ARKK from 8.50 → 9.20."""
    changes = data_with_fixtures.compute_daily_changes()
    tsla = [c for c in changes if c["ticker"] == "TSLA" and c["fund"] == "ARKK"]
    assert len(tsla) == 1
    assert tsla[0]["type"] == "CHANGED"
    assert abs(tsla[0]["weightDelta"] - 0.70) < 0.01, "8.50 → 9.20 delta ≈ +0.70"


def test_compute_daily_changes_filters_options(data_with_fixtures):
    """Options should not appear in `changes` — they're tracked separately."""
    changes = data_with_fixtures.compute_daily_changes()
    for c in changes:
        assert not c.get("isOption"), f"option leaked into changes: {c}"
        # The option row's raw ticker contains a space — should never appear.
        assert " " not in c["ticker"], f"option-like ticker leaked: {c}"


def test_compute_daily_changes_filters_junk(data_with_fixtures):
    """CASH, raw CUSIPs, and money-market funds should be filtered."""
    changes = data_with_fixtures.compute_daily_changes()
    bad = {"CASH", "912797RG4", "SPAXX"}
    leaked = [c["ticker"] for c in changes if c["ticker"] in bad]
    assert leaked == [], f"junk tickers leaked: {leaked}"


def test_get_signals_buying_includes_pltr(data_with_fixtures):
    """PLTR is a new ARKK position → should appear in buying signals."""
    signals = data_with_fixtures.get_signals()
    buying_tickers = [s["ticker"] for s in signals["buying"]]
    assert "PLTR" in buying_tickers


def test_get_signals_selling_includes_coin(data_with_fixtures):
    """COIN weight dropped in ARKK (6.10 → 5.50) → should appear in selling."""
    signals = data_with_fixtures.get_signals()
    selling_tickers = [s["ticker"] for s in signals["selling"]]
    assert "COIN" in selling_tickers


def test_get_signals_tsla_aggregates_funds(data_with_fixtures):
    """TSLA moves in ARKK and ARKW → conviction should aggregate."""
    signals = data_with_fixtures.get_signals()
    buying = {s["ticker"]: s for s in signals["buying"]}
    assert "TSLA" in buying
    # ARKK and ARKW are both ARK Invest → one provider, so no multi-provider bonus
    assert set(buying["TSLA"]["providers"]) == {"ARK Invest"}
    # ARKK and ARKW both increased TSLA → both funds should be listed
    assert set(buying["TSLA"]["funds"]) >= {"ARKK", "ARKW"}


def test_get_sector_flow_returns_inflows_and_outflows(data_with_fixtures):
    flow = data_with_fixtures.get_sector_flow()
    assert "inflows" in flow and "outflows" in flow
    assert isinstance(flow["inflows"], list)
    assert isinstance(flow["outflows"], list)


def test_get_full_payload_shape(data_with_fixtures):
    """Smoke test: the headline endpoint returns every advertised key."""
    payload = data_with_fixtures.get_full_payload()
    for k in ("_meta", "asOfDate", "stats", "signals", "changes",
              "sectorFlow", "divergences"):
        assert k in payload, f"missing top-level key: {k}"
    # signals has buying + selling
    assert "buying" in payload["signals"] and "selling" in payload["signals"]


def test_get_full_payload_does_not_re_compute_changes(data_with_fixtures, monkeypatch):
    """
    Review #14 regression guard: get_full_payload should compute the changes
    list exactly once, not four times. After the #10 finale this means
    compute_daily_changes_with_options is the single read; everything else
    derives from its return value.
    """
    counter = {"with_options": 0, "no_options": 0}
    orig_with = data_with_fixtures.compute_daily_changes_with_options
    orig_without = data_with_fixtures.compute_daily_changes

    def counting_with(*args, **kwargs):
        counter["with_options"] += 1
        return orig_with(*args, **kwargs)

    def counting_without(*args, **kwargs):
        counter["no_options"] += 1
        return orig_without(*args, **kwargs)

    monkeypatch.setattr(data_with_fixtures, "compute_daily_changes_with_options", counting_with)
    monkeypatch.setattr(data_with_fixtures, "compute_daily_changes", counting_without)
    data_with_fixtures.get_full_payload()
    total = counter["with_options"] + counter["no_options"]
    assert total == 1, (
        f"compute_daily_changes* was called {total} times in total — "
        "regression of review #14 (the 4x recomputation fix)"
    )


def test_get_fund_detail_returns_holdings(data_with_fixtures):
    detail = data_with_fixtures.get_fund_detail("ARKK")
    assert detail is not None
    assert detail["fund"] == "ARKK"
    assert detail["provider"] == "ARK Invest"
    # Top holdings exclude junk
    tickers = [h["ticker"] for h in detail["topHoldings"]]
    assert "CASH" not in tickers
    assert "TSLA" in tickers


def test_get_fund_detail_unknown_returns_none(data_with_fixtures):
    assert data_with_fixtures.get_fund_detail("NOTAFUND") is None


def test_get_ticker_detail_cross_fund(data_with_fixtures):
    """TSLA is held by ARKK, ARKW, ARKQ → should report all three."""
    detail = data_with_fixtures.get_ticker_detail("TSLA")
    assert detail is not None
    funds = {h["fund"] for h in detail["holdings"]}
    assert funds >= {"ARKK", "ARKW", "ARKQ"}


def test_get_global_stats_counts_options(data_with_fixtures):
    stats = data_with_fixtures.get_global_stats()
    assert stats["fundsTracked"] >= 4  # ARKK, ARKW, ARKQ, AVUV, ULTY, KYLD
    assert stats["optionsContracts"] >= 2  # MSFT call + QQQ put


# ─── Enriched signals (review #10) ─────────────────────────────────────────


def test_signals_include_enriched_fields(data_with_fixtures):
    """Each signal carries dashboard-shaped fields in addition to legacy ones."""
    signals = data_with_fixtures.get_signals()
    for s in signals["buying"] + signals["selling"]:
        for legacy in ("ticker", "weightDelta", "funds", "providers", "conviction", "direction"):
            assert legacy in s, f"legacy field {legacy} missing from {s}"
        for enriched in ("fundDetails", "fundCount", "providerCount",
                         "totalWeightDelta", "avgWeightDelta", "convictionScore"):
            assert enriched in s, f"enriched field {enriched} missing"
        # fundDetails is per-fund objects, not strings
        for fd in s["fundDetails"]:
            assert {"fund", "weightDelta", "currentWeight", "type"} <= set(fd.keys())


def test_signals_apply_significance_threshold(data_with_fixtures):
    """Moves below the per-fund significance threshold are filtered."""
    # In fixtures: AVUV/F weight is 1.50 → 1.50 (no change), AVUV/GM 1.20 → 1.40 (+0.20)
    # Threshold for AVUV (broad fund) is 0.01. GM passes (+0.20 > 0.01), F doesn't change.
    signals = data_with_fixtures.get_signals()
    avuv_signals = [s for s in signals["buying"] if "AVUV" in s["funds"]]
    # GM appears (delta 0.20), F should not appear from AVUV (no delta)
    tickers = {s["ticker"] for s in avuv_signals}
    assert "GM" in tickers
    assert "F" not in tickers


# ─── Briefing endpoint (review #10) ────────────────────────────────────────


def test_get_briefing_shape(data_with_fixtures):
    briefing = data_with_fixtures.get_briefing()
    for k in ("topBuys", "topSells", "crossFundConvergence",
              "activeStreaks", "notableOptions"):
        assert k in briefing, f"missing key {k}"


def test_briefing_top_buys_capped_at_3(data_with_fixtures):
    briefing = data_with_fixtures.get_briefing()
    assert len(briefing["topBuys"]) <= 3
    assert len(briefing["topSells"]) <= 3


# ─── Activity endpoint (review #10) ────────────────────────────────────────


def test_get_activity_buckets(data_with_fixtures):
    activity = data_with_fixtures.get_activity()
    for k in ("accumulating", "reducing", "optionsActivity"):
        assert k in activity, f"missing key {k}"
    # PLTR (new in ARKK) should be in accumulating
    accum_tickers = {r["ticker"] for r in activity["accumulating"]}
    assert "PLTR" in accum_tickers


def test_activity_options_isolated(data_with_fixtures):
    """Option records go to optionsActivity, not accumulating/reducing."""
    activity = data_with_fixtures.get_activity()
    for r in activity["accumulating"] + activity["reducing"]:
        assert not r.get("isOption"), f"option leaked into equity bucket: {r}"


# ─── Enriched divergences (review #10) ─────────────────────────────────────


def test_divergences_include_intrashop_flag(data_with_fixtures):
    """Divergences expose intrashop bool + per-fund weightDelta lists."""
    divs = data_with_fixtures.get_divergences()
    for d in divs:
        for k in ("ticker", "name", "buying", "selling",
                  "buyingFunds", "sellingFunds", "intrashop"):
            assert k in d
        # Per-fund entries are richer than plain fund-name strings
        for f in d["buyingFunds"] + d["sellingFunds"]:
            assert {"fund", "provider", "weightDelta"} <= set(f.keys())


# ─── Enriched fund/ticker detail (review #10) ──────────────────────────────


def test_fund_detail_has_deltas_and_changes(data_with_fixtures):
    detail = data_with_fixtures.get_fund_detail("ARKK")
    assert detail is not None
    assert "recentChanges" in detail
    # Top holdings now carry weightDelta/sharesDelta
    for h in detail["topHoldings"]:
        assert "weightDelta" in h
        assert "sharesDelta" in h


def test_ticker_detail_has_changes_list(data_with_fixtures):
    detail = data_with_fixtures.get_ticker_detail("TSLA")
    assert detail is not None
    assert "changes" in detail
    # In fixtures TSLA moves in ARKK + ARKW → should show changes
    assert len(detail["changes"]) >= 2


# ─── Full payload now includes briefing + activity ─────────────────────────


def test_full_payload_includes_briefing_and_activity(data_with_fixtures):
    payload = data_with_fixtures.get_full_payload()
    assert "briefing" in payload
    assert "activity" in payload
    # The activity inside should have all three buckets
    for k in ("accumulating", "reducing", "optionsActivity"):
        assert k in payload["activity"]
