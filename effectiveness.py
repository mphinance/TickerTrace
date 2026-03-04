#!/usr/bin/env python3
"""
effectiveness.py — Fund Effectiveness Analysis Engine (v2)

Evaluates how effectively option-income ETFs execute their strategies using
institutional-grade scoring methodologies:

  • Black-Scholes approximate Greeks (Δ, Γ) for hedge ratio analysis
  • Notional-weighted scoring (not count-based) reflecting actual capital flow
  • Continuous, non-linear scoring models (no step-function cliffs)
  • Call/Put differentiation with skew-aware moneyness bands
  • Dynamic composite weighting based on data confidence and Greek exposure
  • Concentration risk (Herfindahl) and expiry clustering metrics

Methodology Notes (for user-facing documentation):
─────────────────────────────────────────────────────
  Strike Selection: Scores WHERE the fund sells options relative to the
    underlying. Calls and puts are evaluated separately — optimal zones differ.
    Covered call funds should sell 3-8% OTM; put-write funds target 2-5% OTM.
    Weighted by notional exposure so large positions count proportionally.

  DTE Management: Scores WHEN options expire. Theta (time decay) accelerates
    non-linearly below 21 DTE. The 7-21 DTE "sweet spot" captures maximum
    daily theta while avoiding extreme gamma risk near expiry.

  Spread Efficiency: Scores HOW risk is managed. Defined-risk spreads are
    evaluated by their risk/reward ratio (premium ÷ max loss), not just
    whether they exist. Equity-covered positions (covered calls) are recognized
    as implicitly hedged, not penalized as "naked."

  Roll Behavior: Scores position MANAGEMENT over time. Detects when options
    are rolled to new expiries, tracks roll timing vs expiration, and flags
    weekend/holiday gap risk. Roll DTE is computed from expiry dates directly,
    not from snapshot fields.

  Premium Capture: Scores INCOME GENERATION efficiency. Reports net premium
    (written - bought), premium density per position, and the hedge cost
    ratio (what percentage of gross premium is spent on protection).

  Hedge Ratio: Scores COVERAGE. For each underlying with written options,
    checks for equity holdings or protective long options. Uses approximate
    Black-Scholes delta to compute net directional exposure. Higher coverage
    and lower net delta = safer fund.

  Concentration Risk: Scores DIVERSIFICATION. Uses a Herfindahl-Hirschman
    Index across underlyings by notional value. Also flags dangerous expiry
    clustering where too many positions expire on a single date.

  Composite Grade: Dynamic weighted average. Weights shift based on data
    confidence (more data points → higher weight) and risk signals (high
    delta exposure → hedge ratio gets more weight). Not arbitrary fixed weights.
"""

import csv
import os
import glob
import math
import datetime
from collections import defaultdict
from typing import Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_DIR = os.path.join(SCRIPT_DIR, "etf-dashboard", "public", "data", "history")

# Funds that use options strategies
OPTION_FUNDS = {
    'KYLD', 'KQQQ', 'ULTY', 'SLTY', 'ULTI', 'BLOX', 'EGGQ', 'EGGY', 'EGGS',
}

# ─── Fund Strategy Profiles (sourced from each fund's prospectus) ────────────
# These profiles calibrate scoring so funds aren't penalized for executing
# exactly what their prospectus mandates. Each field:
#
#   strategy:           Human-readable strategy description
#   strike_style:       'otm' | 'atm' | 'any' — what the prospectus targets
#   call_optimal:       (center, sigma) for Gaussian scoring of call moneyness
#   put_optimal:        (center, sigma) for Gaussian scoring of put moneyness
#   target_dte:         (center, sigma) for Gaussian scoring of DTE
#   hedging_mandated:   True if prospectus requires hedging; False = optional
#   hedge_weight:       Override weight for hedge ratio (lower if not mandated)
#   spread_expected:    True if fund's strategy involves defined-risk spreads
#   peer_group:         'weekly' | 'monthly' — for peer comparison context
#   distribution_freq:  'weekly' | 'monthly' — stated distribution cadence
#
FUND_PROFILES = {
    'KYLD': {
        'strategy': 'Actively managed multi-strategy: covered calls, uncovered writing, '
                    'short spreads, collars, hedged equity. Complex options income.',
        'strike_style': 'any',     # Prospectus allows ATM, OTM, ITM strategies
        'call_optimal': (-0.08, 0.08),  # Wide sigma — accepts ATM through deep OTM
        'put_optimal': (-0.06, 0.08),
        'target_dte': (14.0, 12.0),     # Mix of weekly and monthly positions
        'hedging_mandated': False,       # Uses hedging but not universally required
        'hedge_weight': 0.15,            # Reduced — complex strategy, not pure covered
        'spread_expected': True,         # Prospectus lists spreads as a strategy
        'peer_group': 'weekly',
        'distribution_freq': 'monthly',
    },
    'KQQQ': {
        'strategy': 'Concentrated tech portfolio with options overlay. Sells calls '
                    'typically 5-15% above price. Uses synthetic longs, call spreads, '
                    'collars, protective puts.',
        'strike_style': 'otm',     # Explicitly targets 5-15% OTM calls
        'call_optimal': (-0.10, 0.05),  # 5-15% OTM = -0.05 to -0.15
        'put_optimal': (-0.05, 0.04),
        'target_dte': (14.0, 12.0),
        'hedging_mandated': False,       # "May" use protective puts
        'hedge_weight': 0.15,
        'spread_expected': True,         # Call spreads mentioned
        'peer_group': 'weekly',
        'distribution_freq': 'monthly',
    },
    'ULTY': {
        'strategy': 'Diversified covered call strategy on 15-30 high-IV names. '
                    'Synthetic long exposure. Weekly distributions. Selective '
                    'hedging and leverage since Dec 2025 update.',
        'strike_style': 'any',     # Actively managed, chooses based on IV/momentum
        'call_optimal': (-0.05, 0.06),  # Flexible — ATM to slightly OTM
        'put_optimal': (-0.04, 0.06),
        'target_dte': (7.0, 5.0),       # Weekly distribution = shorter DTE focus
        'hedging_mandated': False,       # "Selective" hedging — optional
        'hedge_weight': 0.12,            # Low — prospectus says optional
        'spread_expected': False,        # Primarily covered calls, not spreads
        'peer_group': 'weekly',
        'distribution_freq': 'weekly',
    },
    'SLTY': {
        'strategy': 'INVERSE exposure via covered puts on 15-30 shorted equities. '
                    'Weekly distributions. Bearish by design — profits when '
                    'underlying securities decline.',
        'strike_style': 'any',     # Put-focused strategy (inverse)
        'call_optimal': (-0.05, 0.06),
        'put_optimal': (-0.04, 0.07),   # Wider — selling puts on shorted names
        'target_dte': (7.0, 5.0),       # Weekly distribution cadence
        'hedging_mandated': False,       # No hedging requirement (IS the hedge)
        'hedge_weight': 0.08,            # Very low — fund itself is a hedge vehicle
        'spread_expected': False,
        'peer_group': 'weekly',
        'distribution_freq': 'weekly',
    },
    'ULTI': {
        'strategy': 'YieldMax option income strategy (similar to ULTY).',
        'strike_style': 'any',
        'call_optimal': (-0.05, 0.06),
        'put_optimal': (-0.04, 0.06),
        'target_dte': (7.0, 5.0),
        'hedging_mandated': False,
        'hedge_weight': 0.12,
        'spread_expected': False,
        'peer_group': 'weekly',
        'distribution_freq': 'weekly',
    },
    'BLOX': {
        'strategy': 'Tri-component crypto income: equity portfolio + crypto ETF '
                    'exposure + options overlay. Uses synthetic covered calls, '
                    'CREDIT CALL SPREADS, and PUT SPREADS by design.',
        'strike_style': 'atm',     # ATM/near-ATM is intentional for max premium
        'call_optimal': (-0.02, 0.06),  # Near ATM is ON-STRATEGY for BLOX
        'put_optimal': (-0.02, 0.06),   # Credit put spreads also near ATM
        'target_dte': (3.0, 3.0),       # Very short DTE is intentional (crypto vol)
        'hedging_mandated': False,       # Spreads ARE the risk management
        'hedge_weight': 0.08,            # Low — spreads replace the need for hedging
        'spread_expected': True,         # Explicitly uses credit spreads
        'peer_group': 'weekly',
        'distribution_freq': 'monthly',
    },
    'EGGQ': {
        'strategy': 'OTM call options and spreads on innovative US large-cap tech. '
                    'Growth-focused with options overlay for income.',
        'strike_style': 'otm',     # Prospectus explicitly says OTM calls/spreads
        'call_optimal': (-0.08, 0.05),  # OTM focused
        'put_optimal': (-0.05, 0.04),
        'target_dte': (21.0, 10.0),     # Monthly cadence
        'hedging_mandated': False,       # No explicit hedging mandate
        'hedge_weight': 0.12,
        'spread_expected': True,         # Uses spreads
        'peer_group': 'monthly',
        'distribution_freq': 'monthly',
    },
    'EGGY': {
        'strategy': 'Selective covered calls on 10-25 high-conviction holdings. '
                    'Targets ~25% annual yield. MAY use targeted downside hedges.',
        'strike_style': 'any',     # "Selective" — manager discretion
        'call_optimal': (-0.04, 0.06),  # Closer to ATM for higher yield target
        'put_optimal': (-0.04, 0.06),
        'target_dte': (21.0, 10.0),
        'hedging_mandated': False,       # "May" use hedges — optional
        'hedge_weight': 0.12,
        'spread_expected': False,
        'peer_group': 'monthly',
        'distribution_freq': 'monthly',
    },
    'EGGS': {
        'strategy': 'Selective covered calls targeting ~15% annual income. '
                    'ACTIVE downside hedging via laddered puts on positions, '
                    'SPX, and NDX. Capital preservation mandate.',
        'strike_style': 'otm',     # Lower yield target = more OTM
        'call_optimal': (-0.06, 0.05),
        'put_optimal': (-0.04, 0.04),
        'target_dte': (21.0, 10.0),
        'hedging_mandated': True,        # ACTIVE hedging is mandated in prospectus
        'hedge_weight': 0.25,            # Full weight — hedging is core to strategy
        'spread_expected': False,        # Protective puts, not spreads
        'peer_group': 'monthly',
        'distribution_freq': 'monthly',
    },
}

# Default profile for any fund not explicitly listed
_DEFAULT_PROFILE = {
    'strategy': 'Unknown options strategy',
    'strike_style': 'any',
    'call_optimal': (-0.055, 0.04),
    'put_optimal': (-0.035, 0.03),
    'target_dte': (14.0, 10.0),
    'hedging_mandated': False,
    'hedge_weight': 0.18,
    'spread_expected': False,
    'peer_group': 'weekly',
    'distribution_freq': 'monthly',
}

def _get_profile(fund: str) -> dict:
    """Get the strategy profile for a fund, with fallback to defaults."""
    return FUND_PROFILES.get(fund, _DEFAULT_PROFILE)


BS_RISK_FREE = 0.05    # 5% risk-free rate assumption
BS_DEFAULT_IV = 0.30   # 30% implied vol when we can't back-solve


# ─── Data Loading ─────────────────────────────────────────────────────────────

def _read_csv(path: str) -> list[dict]:
    """Read a CSV file into a list of dicts."""
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def _safe_float(v, default: float = 0.0) -> float:
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def get_available_dates() -> list[str]:
    """Return sorted (newest-first) list of dates with history files."""
    pattern = os.path.join(HISTORY_DIR, "holdings_*.csv")
    dates = []
    for f in glob.glob(pattern):
        base = os.path.basename(f)
        date_str = base.replace("holdings_", "").replace(".csv", "")
        dates.append(date_str)
    dates.sort(reverse=True)
    return dates


_holdings_cache: dict[str, list[dict]] = {}

def get_holdings_for_date(date_str: str) -> list[dict]:
    """Load holdings for a specific date (cached in memory)."""
    if date_str in _holdings_cache:
        return _holdings_cache[date_str]
    path = os.path.join(HISTORY_DIR, f"holdings_{date_str}.csv")
    if not os.path.exists(path):
        _holdings_cache[date_str] = []
        return []
    rows = _read_csv(path)
    _holdings_cache[date_str] = rows
    return rows


def get_fund_options(rows: list[dict], fund: str) -> list[dict]:
    """Extract option positions for a specific fund from a holdings snapshot."""
    return [r for r in rows if r.get('ETF Ticker') == fund and r.get('Option_Type')]


def get_fund_equities(rows: list[dict], fund: str) -> list[dict]:
    """Extract equity positions for a specific fund."""
    return [r for r in rows if r.get('ETF Ticker') == fund and not r.get('Option_Type')]


# ─── Black-Scholes Approximations ────────────────────────────────────────────
# These provide approximate Greeks when live market data isn't available.
# We use them for hedge ratio analysis and directional exposure scoring.
# Accuracy is sufficient for relative comparison within the same fund.

def _norm_cdf(x: float) -> float:
    """Standard normal CDF via error function."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def _norm_pdf(x: float) -> float:
    """Standard normal PDF."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def approx_delta(S: float, K: float, T: float, opt_type: str,
                 sigma: float = BS_DEFAULT_IV, r: float = BS_RISK_FREE) -> float:
    """
    Black-Scholes approximate delta.

    Args:
        S: underlying price
        K: strike price
        T: time to expiry in years (DTE/365)
        opt_type: 'Call' or 'Put'
        sigma: implied volatility (annualized)
        r: risk-free rate

    Returns:
        Delta in range [-1, 1]. Calls: [0, 1], Puts: [-1, 0].
        For short positions, caller should negate.
    """
    if T <= 0 or S <= 0 or K <= 0 or sigma <= 0:
        # Expired or invalid: intrinsic delta
        if opt_type == 'Call':
            return 1.0 if S > K else 0.0
        else:
            return -1.0 if S < K else 0.0

    sqrt_T = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)

    if opt_type == 'Call':
        return _norm_cdf(d1)
    else:
        return _norm_cdf(d1) - 1.0


def approx_gamma(S: float, K: float, T: float,
                 sigma: float = BS_DEFAULT_IV, r: float = BS_RISK_FREE) -> float:
    """
    Black-Scholes approximate gamma (same for calls and puts).
    Gamma measures the rate of delta change — high gamma near ATM/expiry.
    """
    if T <= 0 or S <= 0 or K <= 0 or sigma <= 0:
        return 0.0

    sqrt_T = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
    return _norm_pdf(d1) / (S * sigma * sqrt_T)


def _notional(option: dict) -> float:
    """
    Notional exposure of an option position.
    = |contracts| × underlying_price × 100 (standard equity option multiplier)
    This reflects actual capital at risk, not just position count.
    """
    qty = abs(_safe_float(option.get('Share Quantity', '0')))
    price = _safe_float(option.get('Underlying_Price', '0'))
    return qty * price * 100


def _option_greeks(option: dict) -> dict:
    """Compute approximate Greeks for a single option position."""
    S = _safe_float(option.get('Underlying_Price', '0'))
    K = _safe_float(option.get('Option_Strike', '0'))
    dte = _safe_float(option.get('DTE', '0'))
    T = max(dte, 0) / 365.0
    opt_type = option.get('Option_Type', 'Call')
    qty = _safe_float(option.get('Share Quantity', '0'))

    d = approx_delta(S, K, T, opt_type)
    g = approx_gamma(S, K, T)

    # Position delta = per-contract delta × contracts × 100 shares
    sign = 1 if qty >= 0 else -1
    return {
        'delta_per': d,
        'gamma_per': g,
        'position_delta': d * qty * 100,  # Signed: short positions flip delta
        'position_gamma': g * abs(qty) * 100,
        'notional': _notional(option),
    }


# ─── Continuous Scoring Helpers ───────────────────────────────────────────────
# All scoring uses smooth, non-linear functions. No step-function cliffs.

def _gaussian_score(value: float, optimal: float, sigma: float,
                    max_score: float = 100.0) -> float:
    """
    Gaussian (bell curve) score centered on 'optimal'.
    Score decays smoothly as value moves away from optimal.
    sigma controls how tolerant the scoring is (larger = more forgiving).
    """
    return max_score * math.exp(-0.5 * ((value - optimal) / sigma) ** 2)


def _sigmoid_score(value: float, midpoint: float, steepness: float = 10.0,
                   max_score: float = 100.0) -> float:
    """
    Sigmoid score — smooth S-curve transition.
    At value=midpoint, score=50. Higher value → higher score.
    steepness controls transition sharpness.
    """
    return max_score / (1.0 + math.exp(-steepness * (value - midpoint)))


def _asymptotic_score(value: float, half_point: float,
                      max_score: float = 100.0) -> float:
    """
    Asymptotic score — diminishing returns.
    Reaches max_score/2 at value=half_point. Never exceeds max_score.
    Good for "more is better but with diminishing returns" metrics.
    """
    if value <= 0:
        return 0.0
    return max_score * value / (value + half_point)


# ─── Metric Computations ──────────────────────────────────────────────────────

def compute_strike_selection(options: list[dict], fund: str = '') -> dict:
    """
    Strike Selection — WHERE does the fund position its written options?

    Methodology:
      • Calls and puts are scored separately with different optimal bands:
        - Written calls: optimal 3-8% OTM (moneyness -0.08 to -0.03)
          Captures premium while providing upside buffer before assignment.
        - Written puts: optimal 2-5% OTM (moneyness -0.05 to -0.02)
          Tighter band because put skew means OTM puts carry more risk.
      • Each position is weighted by notional exposure (|qty| × price × 100)
        so a $1M NVDA position counts proportionally more than a $10K micro-cap.
      • Scoring uses a Gaussian curve centered on the optimal moneyness,
        decaying smoothly as positions deviate from the sweet spot.

    A high score means the fund consistently sells options in the
    institutional sweet spot — enough premium to justify the trade,
    enough buffer to avoid frequent assignment.
    """
    written = [o for o in options if _safe_float(o.get('Share Quantity', '0')) < 0]
    if not written:
        return {
            'avgMoneyness': None, 'callAvgMoneyness': None, 'putAvgMoneyness': None,
            'distribution': {'deepOTM': 0, 'slightlyOTM': 0, 'atm': 0, 'itm': 0},
            'writtenCount': 0, 'score': None,
        }

    calls = [o for o in written if o.get('Option_Type') == 'Call']
    puts = [o for o in written if o.get('Option_Type') == 'Put']

    def _weighted_moneyness(opts, optimal_center, optimal_sigma):
        """Compute notional-weighted average moneyness and score."""
        total_notional = 0.0
        weighted_m = 0.0
        weighted_score = 0.0
        for o in opts:
            m = _safe_float(o.get('Moneyness'), None)
            if m is None:
                continue
            n = _notional(o)
            total_notional += n
            weighted_m += m * n
            # Score each position on Gaussian curve around optimal
            pos_score = _gaussian_score(m, optimal_center, optimal_sigma)
            weighted_score += pos_score * n
        if total_notional == 0:
            return None, None
        return weighted_m / total_notional, weighted_score / total_notional

    # Use fund-specific optimal bands from prospectus profile
    profile = _get_profile(fund)
    call_center, call_sigma = profile['call_optimal']
    put_center, put_sigma = profile['put_optimal']
    call_avg_m, call_score = _weighted_moneyness(calls, call_center, call_sigma)
    put_avg_m, put_score = _weighted_moneyness(puts, put_center, put_sigma)

    # Combined score: notional-weighted blend of call and put scores
    call_notional = sum(_notional(o) for o in calls)
    put_notional = sum(_notional(o) for o in puts)
    total_notional = call_notional + put_notional

    if call_score is not None and put_score is not None and total_notional > 0:
        score = (call_score * call_notional + put_score * put_notional) / total_notional
    elif call_score is not None:
        score = call_score
    elif put_score is not None:
        score = put_score
    else:
        score = None

    # Distribution (count-based for display, scoring is notional-weighted above)
    dist = {'deepOTM': 0, 'slightlyOTM': 0, 'atm': 0, 'itm': 0}
    all_m_vals = []
    for o in written:
        m = _safe_float(o.get('Moneyness'), None)
        if m is None:
            continue
        all_m_vals.append(m)
        abs_m = abs(m)
        if m > 0.02:
            dist['itm'] += 1
        elif abs_m <= 0.02:
            dist['atm'] += 1
        elif abs_m <= 0.08:
            dist['slightlyOTM'] += 1
        else:
            dist['deepOTM'] += 1

    avg_m = sum(all_m_vals) / len(all_m_vals) if all_m_vals else None

    return {
        'avgMoneyness': round(avg_m, 4) if avg_m is not None else None,
        'callAvgMoneyness': round(call_avg_m, 4) if call_avg_m is not None else None,
        'putAvgMoneyness': round(put_avg_m, 4) if put_avg_m is not None else None,
        'distribution': dist,
        'writtenCount': len(written),
        'callCount': len(calls),
        'putCount': len(puts),
        'score': round(score, 1) if score is not None else None,
    }


def compute_dte_management(options: list[dict], fund: str = '') -> dict:
    """
    DTE Management — WHEN do options expire relative to optimal theta capture?

    Methodology:
      • Theta decay is non-linear: it accelerates exponentially below ~21 DTE
        and becomes extreme below ~5 DTE. The sweet spot is 7-21 DTE where
        daily theta capture is high but gamma risk is manageable.
      • Scoring uses a Gaussian curve centered on 14 DTE (peak efficiency),
        with a sigma of 10 that provides smooth decay in both directions.
      • All positions are weighted by notional exposure.
      • A "consistency bonus" rewards funds with tight DTE clustering
        (systematic execution) vs scattered DTE (ad hoc management).
      • Very short DTE (<3) is penalized via an exponential gamma risk factor.

    A high score means the fund manages expiry timing to maximize
    theta capture per day while controlling gamma blow-up risk.
    """
    written = [o for o in options if _safe_float(o.get('Share Quantity', '0')) < 0]
    if not written:
        return {
            'avgDTE': None,
            'distribution': {'weekly': 0, 'biweekly': 0, 'monthly': 0, 'longDated': 0},
            'consistency': None, 'gammaRiskFlag': False, 'score': None,
        }

    dtes = []
    notionals = []
    dist = {'weekly': 0, 'biweekly': 0, 'monthly': 0, 'longDated': 0}
    gamma_risk_count = 0

    for o in written:
        dte = _safe_float(o.get('DTE'), None)
        if dte is None:
            continue
        n = _notional(o)
        dtes.append(dte)
        notionals.append(n)
        if dte <= 7:
            dist['weekly'] += 1
        elif dte <= 14:
            dist['biweekly'] += 1
        elif dte <= 35:
            dist['monthly'] += 1
        else:
            dist['longDated'] += 1
        if dte < 3:
            gamma_risk_count += 1

    if not dtes:
        return {
            'avgDTE': None,
            'distribution': dist,
            'consistency': None, 'gammaRiskFlag': False, 'score': None,
        }

    total_notional = sum(notionals)
    # Notional-weighted average DTE
    avg_dte = sum(d * n for d, n in zip(dtes, notionals)) / total_notional

    # Use fund-specific DTE target from prospectus profile
    profile = _get_profile(fund)
    dte_center, dte_sigma = profile['target_dte']
    base_score = _gaussian_score(avg_dte, dte_center, dte_sigma)

    # Gamma risk penalty — BUT only if short DTE is NOT the fund's stated strategy
    if avg_dte < 3 and dte_center > 5:
        gamma_penalty = math.exp(-0.5 * avg_dte) * 20  # Up to 20pt penalty
        base_score = max(0, base_score - gamma_penalty)

    # Consistency bonus: reward tight DTE clustering (low std dev)
    if len(dtes) > 1:
        mean_dte = sum(dtes) / len(dtes)
        variance = sum((d - mean_dte) ** 2 for d in dtes) / len(dtes)
        std_dte = math.sqrt(variance)
        # Low std = systematic. Bonus up to 10 points for std < 5
        consistency = max(0, 10 - std_dte)
        consistency_pct = max(0, min(100, (1 - std_dte / max(mean_dte, 1)) * 100))
    else:
        consistency = 5  # Single position: neutral
        consistency_pct = 50

    score = min(100, base_score + consistency)

    return {
        'avgDTE': round(avg_dte, 1),
        'distribution': dist,
        'consistency': round(consistency_pct, 1),
        'gammaRiskFlag': gamma_risk_count > len(dtes) * 0.5,
        'score': round(score, 1),
    }


def compute_spread_efficiency(options: list[dict], equities: list[dict]) -> dict:
    """
    Spread Efficiency — HOW is risk managed in the options book?

    Methodology:
      • Detects defined-risk spreads: same underlying, same expiry, same type,
        opposite-sign quantities, different strikes.
      • Recognizes EQUITY COVERAGE: written calls against held stock are
        "covered calls" — functionally hedged even without a long option leg.
        These are NOT penalized as naked positions.
      • Risk/reward scoring: for each spread, computes premium_collected / max_loss.
        A $5-wide spread collecting $3 (60% R:R) scores much higher than one
        collecting $0.50 (10% R:R).
      • Spread width is normalized by underlying price — a $5 spread on a
        $500 stock (1%) represents tighter risk control than $5 on $20 (25%).

    A high score means the fund uses capital-efficient, defined-risk structures
    with favorable risk/reward ratios.
    """
    if not options:
        return {
            'spreadCount': 0, 'nakedCount': 0, 'coveredCount': 0,
            'spreadRatio': None, 'avgRiskReward': None, 'avgWidthPct': None,
            'spreads': [], 'score': None,
        }

    # Build equity holdings map for coverage detection
    equity_tickers = set()
    for e in equities:
        t = e.get('Ticker', '').strip()
        if t and _safe_float(e.get('Share Quantity', '0')) > 0:
            equity_tickers.add(t)

    # Group options by (underlying, expiry) for spread detection
    groups: dict[tuple, list[dict]] = defaultdict(list)
    for o in options:
        key = (o.get('Underlying_Ticker', ''), o.get('Option_Expiry', ''))
        if key[0]:
            groups[key].append(o)

    spreads = []
    matched_ids = set()

    for key, legs in groups.items():
        legs_sorted = sorted(legs, key=lambda x: _safe_float(x.get('Option_Strike', '0')))
        for i, a in enumerate(legs_sorted):
            if id(a) in matched_ids:
                continue
            qty_a = _safe_float(a.get('Share Quantity', '0'))
            strike_a = _safe_float(a.get('Option_Strike', '0'))
            type_a = a.get('Option_Type', '')
            for j, b in enumerate(legs_sorted):
                if i == j or id(b) in matched_ids:
                    continue
                qty_b = _safe_float(b.get('Share Quantity', '0'))
                strike_b = _safe_float(b.get('Option_Strike', '0'))
                type_b = b.get('Option_Type', '')
                if type_a == type_b and qty_a * qty_b < 0 and strike_a != strike_b:
                    width = abs(strike_b - strike_a)
                    short_leg = a if qty_a < 0 else b
                    long_leg = b if qty_a < 0 else a
                    short_mv = abs(_safe_float(short_leg.get('Market Value', '0')))
                    long_mv = abs(_safe_float(long_leg.get('Market Value', '0')))
                    net_credit = short_mv - long_mv
                    max_loss = (width * abs(_safe_float(short_leg.get('Share Quantity', '0'))) * 100) - net_credit
                    underlying_price = _safe_float(a.get('Underlying_Price', '0'))
                    rr = net_credit / max_loss if max_loss > 0 else 0
                    width_pct = (width / underlying_price * 100) if underlying_price > 0 else 0

                    spreads.append({
                        'underlying': key[0],
                        'type': type_a,
                        'shortStrike': _safe_float(short_leg.get('Option_Strike', '0')),
                        'longStrike': _safe_float(long_leg.get('Option_Strike', '0')),
                        'width': round(width, 2),
                        'widthPct': round(width_pct, 2),
                        'riskReward': round(rr, 3),
                    })
                    matched_ids.add(id(a))
                    matched_ids.add(id(b))
                    break

    # Classify remaining written positions
    naked_count = 0
    covered_count = 0
    naked_notional = 0.0
    for o in options:
        if id(o) in matched_ids:
            continue
        qty = _safe_float(o.get('Share Quantity', '0'))
        if qty >= 0:
            continue  # Long positions aren't "naked"
        underlying = o.get('Underlying_Ticker', '')
        is_call = o.get('Option_Type') == 'Call'
        if is_call and underlying in equity_tickers:
            covered_count += 1  # Covered call — implicitly hedged
        else:
            naked_count += 1
            naked_notional += _notional(o)

    spread_count = len(spreads)
    total_risk_positions = spread_count + naked_count + covered_count
    effective_hedged = spread_count + covered_count
    ratio = effective_hedged / total_risk_positions if total_risk_positions > 0 else None

    # Risk/reward scoring for spreads
    avg_rr = sum(s['riskReward'] for s in spreads) / len(spreads) if spreads else None
    avg_width_pct = sum(s['widthPct'] for s in spreads) / len(spreads) if spreads else None

    # Score: blend of hedge ratio and risk/reward quality
    if ratio is not None:
        ratio_score = _sigmoid_score(ratio, 0.5, 6.0)  # 50% hedged = 50 score
        rr_score = _asymptotic_score(avg_rr or 0, 0.3) if avg_rr else 50
        score = ratio_score * 0.6 + rr_score * 0.4
    else:
        score = None

    return {
        'spreadCount': spread_count,
        'nakedCount': naked_count,
        'coveredCount': covered_count,
        'spreadRatio': round(ratio, 3) if ratio is not None else None,
        'avgRiskReward': round(avg_rr, 3) if avg_rr is not None else None,
        'avgWidthPct': round(avg_width_pct, 2) if avg_width_pct is not None else None,
        'spreads': spreads[:10],
        'score': round(score, 1) if score is not None else None,
    }


def compute_roll_behavior(fund: str, dates: list[str]) -> dict:
    """
    Roll Behavior — HOW are positions managed over time?

    Methodology:
      • Detects rolls by comparing option positions across consecutive daily
        snapshots: same (underlying, type) but changed expiry = rolled.
      • **DTE at roll is computed from the OLD position's expiry date minus
        the PREVIOUS snapshot's date** — not from the DTE field, which would
        reflect current-day DTE and produce negative values for expired options.
      • Weekend/holiday gap risk: flags rolls where the old expiry falls on
        a Friday (weekend gap) or the day before a market holiday.
      • Roll direction: "up" = higher strike (bullish), "down" = lower strike
        (defensive), "same" = pure time extension.
      • Scoring: Gaussian centered on 5 DTE (ideal roll timing: captured most
        theta, still time to manage). Frequency bonus for consistent rolling.

    A high score means the fund proactively manages positions before
    expiration, avoids weekend gap risk, and rolls at optimal timing.
    """
    # Filter to business days only — weekend snapshots cause false signals
    biz_dates = []
    for d in dates:
        try:
            dt = datetime.datetime.strptime(d, '%Y-%m-%d').date()
            if dt.weekday() < 5:  # Mon-Fri only
                biz_dates.append(d)
        except ValueError:
            continue

    if len(biz_dates) < 2:
        return {
            'rollsDetected': 0, 'avgRollDTE': None,
            'strikeAdjustments': {'rolledUp': 0, 'rolledDown': 0, 'same': 0},
            'weekendGapRolls': 0, 'recentRolls': [], 'score': None,
        }

    rolls = []
    strike_adj = {'rolledUp': 0, 'rolledDown': 0, 'same': 0}
    weekend_gap_count = 0

    for i in range(len(biz_dates) - 1):
        current_date = biz_dates[i]
        prev_date = biz_dates[i + 1]
        current_rows = get_holdings_for_date(current_date)
        previous_rows = get_holdings_for_date(prev_date)

        curr_options = get_fund_options(current_rows, fund)
        prev_options = get_fund_options(previous_rows, fund)

        # Build maps: (underlying, type) → list of written positions
        curr_map: dict[tuple, list[dict]] = defaultdict(list)
        prev_map: dict[tuple, list[dict]] = defaultdict(list)

        for o in curr_options:
            if _safe_float(o.get('Share Quantity', '0')) < 0:
                key = (o.get('Underlying_Ticker', ''), o.get('Option_Type', ''))
                curr_map[key].append(o)

        for o in prev_options:
            if _safe_float(o.get('Share Quantity', '0')) < 0:
                key = (o.get('Underlying_Ticker', ''), o.get('Option_Type', ''))
                prev_map[key].append(o)

        for key in prev_map:
            if key not in curr_map:
                continue
            prev_expiries = {o.get('Option_Expiry') for o in prev_map[key]}
            curr_expiries = {o.get('Option_Expiry') for o in curr_map[key]}
            expired = prev_expiries - curr_expiries
            new_exp = curr_expiries - prev_expiries

            if expired and new_exp:
                old_strikes = [_safe_float(o.get('Option_Strike', '0'))
                               for o in prev_map[key] if o.get('Option_Expiry') in expired]
                new_strikes = [_safe_float(o.get('Option_Strike', '0'))
                               for o in curr_map[key] if o.get('Option_Expiry') in new_exp]

                if old_strikes and new_strikes:
                    avg_old = sum(old_strikes) / len(old_strikes)
                    avg_new = sum(new_strikes) / len(new_strikes)

                    # Roll DTE: use the DTE field from the previous snapshot's
                    # option rows. This represents the DTE when the position was
                    # last observed alive (before it was rolled/expired).
                    old_dtes = [_safe_float(o.get('DTE', '0'))
                                for o in prev_map[key]
                                if o.get('Option_Expiry') in expired]
                    roll_dte = max(0, sum(old_dtes) / len(old_dtes)) if old_dtes else None
                    old_expiry_str = sorted(expired)[0]

                    # Weekend gap detection
                    is_weekend_gap = False
                    try:
                        exp_dt = datetime.datetime.strptime(old_expiry_str, '%Y-%m-%d').date()
                        if exp_dt.weekday() == 4:  # Friday expiry
                            is_weekend_gap = True
                            weekend_gap_count += 1
                    except (ValueError, TypeError):
                        pass

                    if avg_new > avg_old * 1.005:
                        strike_adj['rolledUp'] += 1
                    elif avg_new < avg_old * 0.995:
                        strike_adj['rolledDown'] += 1
                    else:
                        strike_adj['same'] += 1

                    rolls.append({
                        'underlying': key[0],
                        'type': key[1],
                        'fromExpiry': old_expiry_str,
                        'toExpiry': sorted(new_exp)[0],
                        'oldStrike': round(avg_old, 2),
                        'newStrike': round(avg_new, 2),
                        'rollDTE': roll_dte,
                        'weekendGap': is_weekend_gap,
                    })

    valid_dtes = [r['rollDTE'] for r in rolls if r['rollDTE'] is not None and r['rollDTE'] >= 0]
    avg_roll_dte = sum(valid_dtes) / len(valid_dtes) if valid_dtes else None

    # Score: Gaussian centered on 5 DTE, sigma=4
    if avg_roll_dte is not None:
        base_score = _gaussian_score(avg_roll_dte, 5.0, 4.0)
        # Weekend gap penalty: each gap roll reduces score
        gap_penalty = min(20, weekend_gap_count * 5)
        score = max(0, base_score - gap_penalty)
    elif rolls:
        score = 40  # Rolls detected but no valid DTE data
    else:
        score = None

    return {
        'rollsDetected': len(rolls),
        'avgRollDTE': round(avg_roll_dte, 1) if avg_roll_dte is not None else None,
        'strikeAdjustments': strike_adj,
        'weekendGapRolls': weekend_gap_count,
        'recentRolls': rolls[:10],
        'score': round(score, 1) if score is not None else None,
    }


def compute_premium_capture(options: list[dict], net_assets: Optional[float]) -> dict:
    """
    Premium Capture — HOW efficiently does the fund generate income?

    Methodology:
      • Gross premium written = total |market value| of short options
      • Gross premium bought = total |market value| of long options
      • Net premium = written - bought (what the fund actually keeps)
      • Hedge cost ratio = bought / written (% of income spent on protection)
        Lower = more efficient, but too low may mean unhedged risk.
      • Premium density = net premium / number of written positions
        Higher = fewer, more impactful trades vs many tiny positions.
      • NAV yield = net premium / net assets (annualized income generation)
      • Scoring: asymptotic curve on NAV yield — diminishing returns above 3%
        because extremely high yield often indicates excessive risk.

    A high score means the fund generates meaningful income relative to
    its assets with good hedge cost efficiency.
    """
    written = [o for o in options if _safe_float(o.get('Share Quantity', '0')) < 0]
    bought = [o for o in options if _safe_float(o.get('Share Quantity', '0')) > 0]

    if not written:
        return {
            'totalPremiumWritten': 0, 'totalPremiumBought': 0,
            'netPremium': 0, 'premiumAsPercentNAV': None,
            'hedgeCostRatio': None, 'premiumDensity': None,
            'positionsWritten': 0, 'positionsBought': 0, 'score': None,
        }

    premium_written = abs(sum(_safe_float(o.get('Market Value', '0')) for o in written))
    premium_bought = abs(sum(_safe_float(o.get('Market Value', '0')) for o in bought))
    net_premium = premium_written - premium_bought

    pct_nav = None
    if net_assets and net_assets > 0:
        pct_nav = round((net_premium / net_assets) * 100, 2)

    hedge_cost = round(premium_bought / premium_written, 3) if premium_written > 0 else None
    density = round(net_premium / len(written), 2) if written else None

    # Score: asymptotic on NAV% yield, penalize negative net premium
    if pct_nav is not None:
        if pct_nav <= 0:
            yield_score = max(0, 20 + pct_nav * 10)  # Negative = bad
        else:
            yield_score = _asymptotic_score(pct_nav, 1.5, 85)  # 1.5% NAV → 50 score

        # Efficiency bonus: moderate hedge cost is good (0.2-0.5 range)
        if hedge_cost is not None:
            if 0.15 <= hedge_cost <= 0.50:
                eff_bonus = 10
            elif hedge_cost < 0.15:
                eff_bonus = 3  # Barely hedging — slightly risky
            else:
                eff_bonus = max(0, 10 - (hedge_cost - 0.5) * 20)
        else:
            eff_bonus = 0

        score = min(100, yield_score + eff_bonus)
    else:
        # Fallback when NAV unavailable: score on net premium positivity
        # and hedge cost efficiency
        if net_premium > 0:
            fallback_score = 55  # Base score for positive net premium
        elif net_premium == 0:
            fallback_score = 30
        else:
            fallback_score = 15  # Net cost position

        if hedge_cost is not None:
            if 0.15 <= hedge_cost <= 0.50:
                fallback_score += 10
            elif hedge_cost < 0.15:
                fallback_score += 3
        score = min(100, fallback_score)

    return {
        'totalPremiumWritten': round(premium_written, 2),
        'totalPremiumBought': round(premium_bought, 2),
        'netPremium': round(net_premium, 2),
        'premiumAsPercentNAV': pct_nav,
        'hedgeCostRatio': hedge_cost,
        'premiumDensity': round(density, 2) if density is not None else None,
        'positionsWritten': len(written),
        'positionsBought': len(bought),
        'score': round(score, 1) if score is not None else None,
    }


def compute_hedge_ratio(options: list[dict], equities: list[dict]) -> dict:
    """
    Hedge Ratio — HOW well is directional risk managed?

    Methodology:
      • Uses Black-Scholes approximate delta for each option position to
        compute net directional exposure per underlying and for the whole book.
      • Checks equity coverage: for each underlying with written calls,
        does the fund hold stock? How many shares vs contracts?
      • Detects collars: underlying has BOTH a written call AND a long put
        (or vice versa) — the most institutionally rigorous hedge structure.
      • Net portfolio delta: sum of all position deltas. Closer to zero =
        better hedged = higher score.
      • Coverage ratio: % of written positions that have offsetting equity
        or protective options.

    A high score means the fund has low net directional exposure, good
    equity coverage, and uses institutional hedge structures (collars).
    """
    if not options:
        return {
            'netPortfolioDelta': None, 'coverageRatio': None,
            'collarCount': 0, 'coveredCallCount': 0,
            'avgAbsDelta': None, 'score': None,
        }

    # Compute per-option Greeks
    total_delta = 0.0
    total_abs_delta = 0.0
    for o in options:
        g = _option_greeks(o)
        total_delta += g['position_delta']
        total_abs_delta += abs(g['position_delta'])

    # Add equity delta (stock delta = 1.0 per share)
    equity_map = {}
    for e in equities:
        t = e.get('Ticker', '').strip()
        qty = _safe_float(e.get('Share Quantity', '0'))
        if t and qty > 0:
            equity_map[t] = equity_map.get(t, 0) + qty
            total_delta += qty  # Each share = 1 delta

    # Coverage analysis
    written = [o for o in options if _safe_float(o.get('Share Quantity', '0')) < 0]
    underlyings_written = set(o.get('Underlying_Ticker', '') for o in written)
    long_opts = [o for o in options if _safe_float(o.get('Share Quantity', '0')) > 0]
    underlyings_long = set(o.get('Underlying_Ticker', '') for o in long_opts)

    covered_call_count = 0
    collar_count = 0
    covered_set = set()

    for underlying in underlyings_written:
        has_equity = underlying in equity_map
        written_calls = [o for o in written if o.get('Underlying_Ticker') == underlying
                         and o.get('Option_Type') == 'Call']
        written_puts = [o for o in written if o.get('Underlying_Ticker') == underlying
                        and o.get('Option_Type') == 'Put']
        long_puts = [o for o in long_opts if o.get('Underlying_Ticker') == underlying
                     and o.get('Option_Type') == 'Put']
        long_calls = [o for o in long_opts if o.get('Underlying_Ticker') == underlying
                      and o.get('Option_Type') == 'Call']

        # Covered call: short call + long equity
        if written_calls and has_equity:
            covered_call_count += len(written_calls)
            covered_set.update(id(o) for o in written_calls)

        # Collar: short call + long put (or short put + long call) on same name
        if written_calls and long_puts:
            collar_count += min(len(written_calls), len(long_puts))
            covered_set.update(id(o) for o in written_calls[:len(long_puts)])
        if written_puts and long_calls:
            collar_count += min(len(written_puts), len(long_calls))
            covered_set.update(id(o) for o in written_puts[:len(long_calls)])

    coverage_ratio = len(covered_set) / len(written) if written else None

    avg_abs_delta = total_abs_delta / len(options) if options else None

    # Score: lower net delta (more hedged) = better
    # Normalize by total abs delta to get a "% hedged" metric
    if total_abs_delta > 0:
        net_ratio = abs(total_delta) / total_abs_delta
        # net_ratio near 0 = perfectly hedged, near 1 = fully directional
        delta_score = _gaussian_score(net_ratio, 0.0, 0.4) * 0.6
    else:
        delta_score = 50

    # Coverage component
    cov_score = _sigmoid_score(coverage_ratio or 0, 0.4, 8.0) * 0.4

    score = min(100, delta_score + cov_score)

    return {
        'netPortfolioDelta': round(total_delta, 1),
        'coverageRatio': round(coverage_ratio, 3) if coverage_ratio is not None else None,
        'collarCount': collar_count,
        'coveredCallCount': covered_call_count,
        'avgAbsDelta': round(avg_abs_delta, 2) if avg_abs_delta is not None else None,
        'score': round(score, 1),
    }


def compute_concentration_risk(options: list[dict]) -> dict:
    """
    Concentration Risk — HOW diversified is the options book?

    Methodology:
      • Herfindahl-Hirschman Index (HHI) across underlyings by notional:
        HHI = Σ(share_i²) where share_i = notional_i / total_notional.
        HHI = 1.0 means 100% in one name (maximum concentration).
        HHI ≈ 1/N for equal distribution across N names.
      • Expiry clustering: what % of total notional expires on the single
        busiest expiry date? High clustering = correlated risk event.
      • Single-strike flag: warns when multiple positions share the same
        exact strike on the same underlying (concentrated pin risk).

    A high score means the fund spreads risk across multiple underlyings
    and expiry dates, reducing single-event blow-up risk.
    """
    written = [o for o in options if _safe_float(o.get('Share Quantity', '0')) < 0]
    if not written:
        return {
            'hhi': None, 'uniqueUnderlyings': 0,
            'topExpiryPct': None, 'expiryCount': 0,
            'score': None,
        }

    # HHI by underlying
    notional_by_underlying: dict[str, float] = defaultdict(float)
    notional_by_expiry: dict[str, float] = defaultdict(float)
    total_notional = 0.0

    for o in written:
        n = _notional(o)
        underlying = o.get('Underlying_Ticker', 'UNKNOWN')
        expiry = o.get('Option_Expiry', 'UNKNOWN')
        notional_by_underlying[underlying] += n
        notional_by_expiry[expiry] += n
        total_notional += n

    if total_notional == 0:
        return {
            'hhi': None, 'uniqueUnderlyings': 0,
            'topExpiryPct': None, 'expiryCount': 0,
            'score': None,
        }

    hhi = sum((n / total_notional) ** 2 for n in notional_by_underlying.values())
    top_expiry_pct = max(notional_by_expiry.values()) / total_notional * 100

    unique_underlyings = len(notional_by_underlying)
    expiry_count = len(notional_by_expiry)

    # Score: lower HHI = better diversification
    # HHI of 0.1 (10 equal positions) → good; HHI of 0.5 → concentrated
    if hhi > 0:
        hhi_score = _gaussian_score(hhi, 0.0, 0.3) * 0.6
    else:
        hhi_score = 60

    # Expiry diversification component
    if expiry_count > 1:
        expiry_score = _gaussian_score(top_expiry_pct, 30.0, 30.0) * 0.4
    else:
        expiry_score = 10  # Single expiry date = high concentration

    score = min(100, hhi_score + expiry_score)

    return {
        'hhi': round(hhi, 4),
        'uniqueUnderlyings': unique_underlyings,
        'topExpiryConcentration': round(top_expiry_pct, 1),
        'expiryCount': expiry_count,
        'score': round(score, 1),
    }


def compute_grade(metrics: dict, fund: str = '') -> tuple[str, float | None, dict]:
    """
    Dynamic Composite Grade — balances Greek exposure, notional volume,
    and data confidence to produce a final score.

    Methodology:
      • Base weights reflect relative importance of each metric for
        overall fund effectiveness assessment.
      • Hedge ratio weight uses the fund’s prospectus profile: funds where
        hedging isn’t mandated get lower hedge weight; funds with explicit
        hedging mandates (like EGGS) get full weight.
      • Weights are dynamically adjusted based on:
        1. Data confidence: metrics with more underlying data points get
           relatively higher weight (a metric based on 50 positions is
           more reliable than one based on 2).
        2. Risk signal amplification: if hedge ratio score is low (high
           directional exposure), its weight increases to flag the risk.
           If concentration risk is high, its weight increases similarly.
      • Weights are normalized to sum to 1.0 after adjustments.
      • Letter grade bands: A (≥80), B (≥65), C (≥50), D (≥35), F (<35).

    Returns: (grade_letter, composite_score, weight_breakdown)
    """
    # Use fund profile to set hedge weight appropriately
    profile = _get_profile(fund)
    base_weights = {
        'hedgeRatio': profile['hedge_weight'],  # From prospectus profile
        'strikeSelection': 0.18,  # Core execution quality
        'premiumCapture': 0.18,   # Income generation
        'spreadEfficiency': 0.15, # Risk management
        'dteManagement': 0.12,    # Timing preferences
        'concentrationRisk': 0.10, # Diversification
        'rollBehavior': 0.07,     # Active management
    }

    # Data confidence multipliers
    confidence = {}
    data_points = {
        'strikeSelection': metrics.get('strikeSelection', {}).get('writtenCount', 0),
        'dteManagement': metrics.get('dteManagement', {}).get('distribution', {}),
        'spreadEfficiency': (metrics.get('spreadEfficiency', {}).get('spreadCount', 0)
                             + metrics.get('spreadEfficiency', {}).get('nakedCount', 0)),
        'rollBehavior': metrics.get('rollBehavior', {}).get('rollsDetected', 0),
        'premiumCapture': metrics.get('premiumCapture', {}).get('positionsWritten', 0),
        'hedgeRatio': metrics.get('strikeSelection', {}).get('writtenCount', 0),
        'concentrationRisk': metrics.get('strikeSelection', {}).get('writtenCount', 0),
    }

    for key in base_weights:
        dp = data_points.get(key, 0)
        if isinstance(dp, dict):
            dp = sum(dp.values())
        # Confidence ramps from 0.5 (≤2 data points) to 1.0 (≥20 data points)
        confidence[key] = min(1.0, 0.5 + dp / 40.0)

    # Risk signal amplification
    hedge_score = metrics.get('hedgeRatio', {}).get('score')
    conc_score = metrics.get('concentrationRisk', {}).get('score')

    risk_amplifiers = {}
    for key in base_weights:
        risk_amplifiers[key] = 1.0
    # Low hedge score → amplify hedge weight
    if hedge_score is not None and hedge_score < 50:
        risk_amplifiers['hedgeRatio'] = 1.0 + (50 - hedge_score) / 100.0
    # Low concentration score → amplify concentration weight
    if conc_score is not None and conc_score < 50:
        risk_amplifiers['concentrationRisk'] = 1.0 + (50 - conc_score) / 100.0

    # Compute adjusted weights
    adjusted = {}
    for key in base_weights:
        adjusted[key] = base_weights[key] * confidence[key] * risk_amplifiers[key]

    # Normalize
    total_weight = sum(adjusted.values())
    normalized = {k: v / total_weight for k, v in adjusted.items()}

    # Compute weighted composite
    scores = {
        'strikeSelection': metrics.get('strikeSelection', {}).get('score'),
        'dteManagement': metrics.get('dteManagement', {}).get('score'),
        'spreadEfficiency': metrics.get('spreadEfficiency', {}).get('score'),
        'rollBehavior': metrics.get('rollBehavior', {}).get('score'),
        'premiumCapture': metrics.get('premiumCapture', {}).get('score'),
        'hedgeRatio': metrics.get('hedgeRatio', {}).get('score'),
        'concentrationRisk': metrics.get('concentrationRisk', {}).get('score'),
    }

    weighted_sum = 0.0
    weight_used = 0.0
    for key, w in normalized.items():
        s = scores.get(key)
        if s is not None:
            weighted_sum += s * w
            weight_used += w

    if weight_used == 0:
        return 'N/A', None, normalized

    composite = weighted_sum / weight_used
    # Grade bands
    if composite >= 80:
        grade = 'A'
    elif composite >= 65:
        grade = 'B'
    elif composite >= 50:
        grade = 'C'
    elif composite >= 35:
        grade = 'D'
    else:
        grade = 'F'

    return grade, round(composite, 1), {k: round(v, 3) for k, v in normalized.items()}


# ─── Main Analysis ─────────────────────────────────────────────────────────────

def analyze_fund(fund: str) -> dict | None:
    """
    Run full effectiveness analysis for a single fund.
    Returns None if the fund doesn't have option positions.
    """
    if fund not in OPTION_FUNDS:
        return None

    dates = get_available_dates()
    if not dates:
        return None

    latest_rows = get_holdings_for_date(dates[0])
    options = get_fund_options(latest_rows, fund)

    if not options:
        return None

    equities = get_fund_equities(latest_rows, fund)

    net_assets = None
    for r in latest_rows:
        if r.get('ETF Ticker') == fund and r.get('NetAssets'):
            net_assets = _safe_float(r.get('NetAssets'))
            break

    # Compute all metrics (pass fund for profile-calibrated scoring)
    strike = compute_strike_selection(options, fund)
    dte = compute_dte_management(options, fund)
    spreads = compute_spread_efficiency(options, equities)
    rolls = compute_roll_behavior(fund, dates)
    premium = compute_premium_capture(options, net_assets)
    hedge = compute_hedge_ratio(options, equities)
    concentration = compute_concentration_risk(options)

    all_metrics = {
        'strikeSelection': strike,
        'dteManagement': dte,
        'spreadEfficiency': spreads,
        'rollBehavior': rolls,
        'premiumCapture': premium,
        'hedgeRatio': hedge,
        'concentrationRisk': concentration,
    }

    grade, composite, weights = compute_grade(all_metrics, fund)

    # Include fund profile info for frontend context
    profile = _get_profile(fund)

    return {
        'fund': fund,
        'asOfDate': dates[0],
        'historyDepth': len(dates),
        'optionsCount': len(options),
        'netAssets': net_assets,
        'grade': grade,
        'compositeScore': composite,
        'weights': weights,
        'strategyDescription': profile['strategy'],
        'peerGroup': profile['peer_group'],
        'hedgingMandated': profile['hedging_mandated'],
        **all_metrics,
    }


def analyze_all_funds() -> list[dict]:
    """Analyze all option-income funds and return summary comparison data."""
    results = []
    for fund in sorted(OPTION_FUNDS):
        result = analyze_fund(fund)
        if result:
            results.append(result)
    # Sort by composite score descending (best first)
    results.sort(key=lambda x: x.get('compositeScore') or 0, reverse=True)
    return results


if __name__ == '__main__':
    import json
    for fund in sorted(OPTION_FUNDS):
        result = analyze_fund(fund)
        if result:
            print(f"\n{'='*60}")
            print(f"  {fund} — Grade: {result['grade']} ({result['compositeScore']})")
            print(f"{'='*60}")
            print(json.dumps(result, indent=2, default=str))
