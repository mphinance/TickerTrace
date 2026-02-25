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

def test_non_option():
    res = parse_option("Apple Inc", "AAPL")
    assert res is None

def test_empty_input():
    assert parse_option(None, None) is None
    assert parse_option("", "") is None
