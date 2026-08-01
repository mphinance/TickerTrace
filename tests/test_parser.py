import pytest
import sys
import os

# Add parent directory to path to import parse_option
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scrape_avantis import parse_option

def test_occ_format():
    # AAPL 250221P00150000
    res = parse_option("Alcoa Corp", "AAPL  250221P00150000")
    assert res is not None
    assert res['underlying'] == "AAPL"
    assert res['strike'] == 150.0
    assert res['expiry'] == "2025-02-21"
    assert res['type'] == "Put"

def test_descriptive_format():
    # NVDA 03/20/2026 185 C
    res = parse_option("NVDA 03/20/2026 185 C", "OTHER")
    assert res is not None
    assert res['underlying'] == "NVDA"
    assert res['strike'] == 185.0
    assert res['expiry'] == "2026-03-20"
    assert res['type'] == "Call"

def test_relaxed_fallback():
    # TSLA 01/20/2025 250 Put
    res = parse_option("TSLA 01/20/2025 250 Put", "NONE")
    assert res is not None
    assert res['underlying'] == "TSLA"
    assert res['strike'] == 250.0
    assert res['expiry'] == "2025-01-20"
    assert res['type'] == "Put"

def test_rex_us_format_call():
    # REX intermittently serves "CLSK US 06/12/26 C16" with a blank ticker —
    # underlying + "US" + 2-digit-year date + type fused to strike. Regression
    # for ULTI's options silently dropping to "OTHER" equity rows.
    res = parse_option("CLSK US 06/12/26 C16", "")
    assert res is not None
    assert res['underlying'] == "CLSK"
    assert res['strike'] == 16.0
    assert res['expiry'] == "2026-06-12"
    assert res['type'] == "Call"

def test_rex_us_format_put_decimal_strike():
    # Decimal strikes must survive: "TE US 06/12/26 P7.5"
    res = parse_option("TE US 06/12/26 P7.5", "")
    assert res is not None
    assert res['underlying'] == "TE"
    assert res['strike'] == 7.5
    assert res['expiry'] == "2026-06-12"
    assert res['type'] == "Put"

def test_non_option():
    res = parse_option("Apple Inc", "AAPL")
    assert res is None

def test_empty_input():
    assert parse_option(None, None) is None
    assert parse_option("", "") is None


# ─── Exchange-prefixed OCC roots ─────────────────────────────────────────────
# Kurv, Roundhill, REX, YieldMax and NicholasX publish OCC tickers with a
# leading exchange digit ("2MU", "4NDX"). The root class used to be ([A-Z]+),
# which rejected them outright — 44 of 536 live option rows. Most were rescued
# by the descriptive-name regex, but Roundhill's FLEX index options were not,
# so RDTE's single largest position (45.8% of the fund) was filed as an equity
# holding, as was 44.9% of QDTE.

def test_occ_digit_prefixed_root():
    res = parse_option("MU 09/18/2026 950 C", "2MU   260918C00950000")
    assert res is not None
    assert res['underlying'] == "MU"
    assert res['strike'] == 950.0
    assert res['expiry'] == "2026-09-18"
    assert res['type'] == "Call"


def test_occ_digit_prefixed_multichar_root():
    res = parse_option("AAPL 09/18/2026 290 C", "2AAPL 260918C00290000")
    assert res is not None
    assert res['underlying'] == "AAPL"
    assert res['strike'] == 290.0


def test_occ_digit_prefixed_put():
    res = parse_option("NVDA 08/14/2026 190.01 P", "2NVDA 260814P00190010")
    assert res is not None
    assert res['underlying'] == "NVDA"
    assert res['strike'] == 190.01
    assert res['type'] == "Put"


def test_rex_flx_index_option():
    """Roundhill FLEX: digit-prefixed root AND a trailing ' FLX' suffix."""
    res = parse_option("4NDX US 09/18/26 C2250 FLX", "")
    assert res is not None
    assert res['underlying'] == "NDX"
    assert res['strike'] == 2250.0
    assert res['expiry'] == "2026-09-18"
    assert res['type'] == "Call"


def test_rex_flx_decimal_strike():
    """RDTE's 45.8%-of-NAV position — the row this whole fix exists for."""
    res = parse_option("4RUT US 12/18/26 C246.2 FLX", "4RUT  261218C00246200")
    assert res is not None
    assert res['underlying'] == "RUT"
    assert res['strike'] == 246.2
    assert res['expiry'] == "2026-12-18"
    assert res['type'] == "Call"


def test_plain_equity_still_not_an_option():
    """The digit-prefix relaxation must not start matching ordinary holdings."""
    assert parse_option("TESLA INC", "TSLA") is None
    assert parse_option("Invesco Government & Agency Portfolio 12/31/2031", "AGPXX") is None
    assert parse_option("US TREASURY BILL", "B") is None
