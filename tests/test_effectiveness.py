"""
Unit tests for the effectiveness engine's robustness fixes.

These use synthetic option rows (not the rolling CSV history) so they stay
deterministic as daily snapshots change. They lock in three fixes:

  1. Strike selection withholds a score when too few legs carry moneyness
     (data-confidence floor) — instead of grading off a single outlier.
  2. Strike selection falls back to equal weighting when the underlying-price
     (notional) feed is degenerate, so one sized leg can't dominate.
  3. DTE management scores calls and puts as separate cadences, so a fund
     writing weekly calls alongside long-dated protective puts isn't zeroed.
"""
import effectiveness as e


def _opt(otype, qty, moneyness=None, underlying_price=100.0, dte=7.0):
    """Build a minimal option row understood by the compute_* functions."""
    return {
        'Option_Type': otype,
        'Share Quantity': str(qty),
        'Moneyness': '' if moneyness is None else str(moneyness),
        'Underlying_Price': '' if underlying_price is None else str(underlying_price),
        'DTE': str(dte),
        'Option_Strike': '100',
    }


def test_strike_score_withheld_when_moneyness_sparse():
    """1 of 5 written legs carries moneyness -> insufficient data -> score None."""
    opts = [_opt('Call', -100, moneyness=-0.08)]
    opts += [_opt('Call', -100, moneyness=None) for _ in range(4)]
    res = e.compute_strike_selection(opts, fund='EGGQ')
    assert res['dataCoverage'] == 0.2
    assert res['score'] is None


def test_strike_score_present_when_coverage_ok():
    """All legs carry moneyness near the profile center -> a real score."""
    opts = [_opt('Call', -100, moneyness=-0.08) for _ in range(5)]
    res = e.compute_strike_selection(opts, fund='EGGS')  # call center ~ -0.08
    assert res['dataCoverage'] == 1.0
    assert res['score'] is not None
    assert res['score'] > 80  # on-center, tightly clustered


def test_equal_weight_fallback_when_notional_degenerate():
    """One leg has an underlying price, the rest don't: the sized outlier must
    NOT capture the whole score. Equal weighting keeps it representative."""
    # Four on-center legs (no notional) + one far-off outlier (has notional).
    opts = [_opt('Call', -100, moneyness=-0.08, underlying_price=None) for _ in range(4)]
    opts.append(_opt('Call', -100, moneyness=-0.40, underlying_price=500.0))
    res = e.compute_strike_selection(opts, fund='EGGS')
    # Notional weighting would hand the score to the -0.40 outlier (~0).
    # Equal weighting across the five legs should keep it well above that.
    assert res['score'] is not None
    assert res['score'] > 50


def test_dte_calls_and_puts_scored_separately():
    """Weekly income calls + long-dated protective puts must not blend into a
    single mean that zeroes the score."""
    # KYLD-style profile (~6 DTE target). Calls weekly, puts quarterly.
    opts = [_opt('Call', -100, moneyness=-0.09, dte=6.0) for _ in range(8)]
    opts += [_opt('Put', -100, moneyness=-0.10, dte=98.0) for _ in range(4)]
    res = e.compute_dte_management(opts, fund='KYLD')
    # Blended mean (~36 DTE) would score ~0 against a 6-DTE center.
    # Per-leg scoring credits the weekly call cadence.
    assert res['score'] is not None
    assert res['score'] > 25


def test_analyze_fund_falls_back_over_scrape_gap():
    """analyze_fund must not return None just because the latest snapshot
    dropped a fund's option legs — it walks back to the last good day."""
    res = e.analyze_fund('ULTI')
    if res is None:
        # Only valid if ULTI has no option legs in ANY snapshot.
        assert all(
            not e.get_fund_options(e.get_holdings_for_date(d), 'ULTI')
            for d in e.get_available_dates()
        )
    else:
        assert 'dataStale' in res
        assert 'staleSnapshots' in res
        # asOfDate must be a snapshot that actually has ULTI options.
        opts = e.get_fund_options(e.get_holdings_for_date(res['asOfDate']), 'ULTI')
        assert len(opts) > 0
