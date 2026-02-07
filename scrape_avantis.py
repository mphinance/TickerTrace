import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import datetime
import os
import sys
import time
import io
import glob

# Configuration
FUNDS = [
    {'ticker': 'AVUV', 'type': 'avantis', 'id': '119'},
    {'ticker': 'AVLV', 'type': 'avantis', 'id': '806'},
    {'ticker': 'KYLD', 'type': 'csv', 'url': 'https://web.services.kurvinvest.com/etfdata/KYLD/holdings.csv'},
    {'ticker': 'KQQQ', 'type': 'csv', 'url': 'https://web.services.kurvinvest.com/etfdata/KQQQ/holdings.csv'},
    {'ticker': 'BLOX', 'type': 'csv', 'url': 'https://nicholasx.com/wp-content/uploads/data/TidalFG_Holdings_BLOX.csv'},
    {'ticker': 'ULTY', 'type': 'csv', 'url': 'https://yieldmaxetfs.com/download/fund-csv/ULTY/'},
    {'ticker': 'REX_ULTI', 'type': 'csv', 'url': 'https://www.rexshares.com/ulti/', 'method': 'post', 'data': {'CSV': 'Download CSV', 'symbol': 'ULTI'}},
]

AVANTIS_BASE_URL_TEMPLATE = "https://www.avantisinvestors.com/avantis-investments/total-holdings/{id}/?type=etf"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Directory Structure
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
HISTORY_DIR = os.path.join(DATA_DIR, "history")
DAILY_DIR = os.path.join(DATA_DIR, "daily")
CHANGES_DIR = os.path.join(DATA_DIR, "changes")
LOG_FILE = os.path.join(SCRIPT_DIR, "scraper.log")
DASHBOARD_CSV = os.path.join(SCRIPT_DIR, "normalized_holdings.csv")

# Ensure directories exist
for d in [RAW_DIR, HISTORY_DIR, DAILY_DIR, CHANGES_DIR]:
    os.makedirs(d, exist_ok=True)

# Column mapping for normalization
COLUMN_MAPPING = {
    'name': 'Name',
    'ticker': 'Ticker',
    'securityType': 'Security Type',
    'shareQuantity': 'Share Quantity',
    'baseMarketValue': 'Market Value',
    'weight': 'Weight',
    'sector': 'Sector',
    'country': 'Country',
    'cusip': 'CUSIP',
    'isin': 'ISIN',
    'sedol': 'SEDOL',
    'coupon': 'Coupon',
    'maturityDate': 'Maturity Date',
    'Description': 'Name',
    'Ticker': 'Ticker',
    'Quantity': 'Share Quantity',
    'Market Value': 'Market Value',
    '% of fund': 'Weight',
    'CUSIP': 'CUSIP',
    'StockTicker': 'Ticker',
    'SecurityName': 'Name',
    'Shares': 'Share Quantity',
    'MarketValue': 'Market Value',
    'Weightings': 'Weight',
    'Symbol': 'Ticker',
    'Shares Held': 'Share Quantity',
    'Net Value': 'Market Value',
    'Weighting': 'Weight',
    'Security Identifier': 'CUSIP',
}

def log(message):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_msg = f"[{timestamp}] {message}"
    print(formatted_msg)
    with open(LOG_FILE, "a") as f:
        f.write(formatted_msg + "\n")

def get_holdings_avantis(fund_config):
    fund_id = fund_config['id']
    fund_ticker = fund_config['ticker']
    url = AVANTIS_BASE_URL_TEMPLATE.format(id=fund_id)
    log(f"Fetching data for {fund_ticker} from {url}...")
    headers = {'User-Agent': USER_AGENT}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        log(f"Error fetching URL for {fund_ticker}: {e}")
        return None

    html = response.text
    soup = BeautifulSoup(html, 'html.parser')
    script_content = None
    for script in soup.find_all('script'):
        if script.string and 'ticker:' in script.string and 'shareQuantity:' in script.string:
            script_content = script.string
            break
    
    if not script_content:
        log(f"Could not find script tag with holdings data for {fund_ticker}.")
        return None

    pattern = r'\{name:"(?P<name>.*?)",ticker:"(?P<ticker>.*?)",securityType:"(?P<securityType>.*?)",.*?cusip:"(?P<cusip>.*?)",isin:"(?P<isin>.*?)",sedol:"(?P<sedol>.*?)",shareQuantity:"(?P<shareQuantity>.*?)",.*?baseMarketValue:"(?P<baseMarketValue>.*?)",weight:"(?P<weight>.*?)",coupon:"(?P<coupon>.*?)",maturityDate:"(?P<maturityDate>.*?)",sector:"(?P<sector>.*?)",country:"(?P<country>.*?)"\}'
    matches = re.finditer(pattern, script_content)
    holdings_list = []
    today = datetime.date.today().isoformat()
    for match in matches:
        data = match.groupdict()
        data['ETF Ticker'] = fund_ticker
        data['Date'] = today
        holdings_list.append(data)
        
    if not holdings_list:
        log(f"No holdings extracted for {fund_ticker}.")
        return None
        
    return pd.DataFrame(holdings_list)

def get_holdings_csv(fund_config):
    url = fund_config['url']
    fund_ticker = fund_config['ticker']
    method = fund_config.get('method', 'get').lower()
    data = fund_config.get('data', None)
    log(f"Fetching CSV data for {fund_ticker} from {url}...")
    headers = {'User-Agent': USER_AGENT}
    try:
        if method == 'post':
            response = requests.post(url, headers=headers, data=data)
        else:
            response = requests.get(url, headers=headers)
        response.raise_for_status()
        content = response.content.decode('utf-8-sig')
        df = pd.read_csv(io.StringIO(content))
        df['ETF Ticker'] = fund_ticker
        df['Date'] = datetime.date.today().isoformat()
        return df
    except Exception as e:
        log(f"Error processing CSV for {fund_ticker}: {e}")
        return None

def normalize_columns(df):
    if df is None or df.empty: return df
    return df.rename(columns=COLUMN_MAPPING)

def clean_data(df):
    if df is None or df.empty: return df
    for col in ['Weight', 'Market Value', 'Share Quantity']:
        if col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].astype(str).str.replace('%', '', regex=False).str.replace('$', '', regex=False).str.replace(',', '', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    return df

def process_and_save_fund(df, ticker):
    today = datetime.date.today().isoformat()
    
    # 1. Save Raw Daily Snapshot
    raw_date_dir = os.path.join(RAW_DIR, today)
    os.makedirs(raw_date_dir, exist_ok=True)
    raw_file = os.path.join(raw_date_dir, f"{ticker}_{today}.csv")
    df.to_csv(raw_file, index=False)
    
    # 2. Append to Fund History
    fund_hist_dir = os.path.join(HISTORY_DIR, ticker)
    os.makedirs(fund_hist_dir, exist_ok=True)
    hist_file = os.path.join(fund_hist_dir, f"{ticker}_history.csv")
    df.to_csv(hist_file, mode='a', header=not os.path.exists(hist_file), index=False)
    
    return raw_file

def generate_changes(current_df, today):
    # Find the most recent combined file prior to today
    combined_files = sorted(glob.glob(os.path.join(DAILY_DIR, "combined_*.csv")), reverse=True)
    prev_file = None
    for f in combined_files:
        if today not in f:
            prev_file = f
            break
    
    if not prev_file:
        log("No previous combined file found for change tracking.")
        return
    
    log(f"Comparing current data with {os.path.basename(prev_file)}...")
    prev_df = pd.read_csv(prev_file)
    
    # Prepare for join: unique key is ETF Ticker + Ticker (or Name if Ticker missing)
    # We'll use ETF Ticker + Ticker
    def make_key(df):
        return df['ETF Ticker'] + "_" + df['Ticker'].fillna(df['Name']).astype(str)

    current_df['key'] = make_key(current_df)
    prev_df['key'] = make_key(prev_df)
    
    # Merge
    merged = pd.merge(
        current_df,
        prev_df,
        on='key', how='outer', suffixes=('', '_prev')
    )
    
    # Consolidate metadata from both sides
    for col in ['ETF Ticker', 'Ticker', 'Name', 'Date']:
        if f"{col}_prev" in merged.columns:
            merged[col] = merged[col].combine_first(merged[f"{col}_prev"])
    
    # Fill numeric NaNs
    for col in ['Weight', 'Weight_prev', 'Share Quantity', 'Share Quantity_prev']:
        merged[col] = pd.to_numeric(merged[col], errors='coerce').fillna(0)
    
    # Calculate Changes
    merged['Weight Delta'] = merged['Weight'] - merged['Weight_prev']
    merged['Qty Delta'] = merged['Share Quantity'] - merged['Share Quantity_prev']
    
    # Filter for significant changes
    changes = merged[(merged['Weight Delta'] != 0) | (merged['Qty Delta'] != 0)].copy()
    
    if not changes.empty:
        # Keep relevant columns
        output_cols = ['ETF Ticker', 'Ticker', 'Name', 'Weight_prev', 'Weight', 'Weight Delta', 'Share Quantity_prev', 'Share Quantity', 'Qty Delta']
        available_cols = [c for c in output_cols if c in changes.columns]
        changes = changes[available_cols]
        
        change_file = os.path.join(CHANGES_DIR, f"changes_{today}.csv")
        changes.to_csv(change_file, index=False)
        log(f"Generated change report: {os.path.basename(change_file)} ({len(changes)} changes)")
    else:
        log("No significant changes detected.")

def main():
    today = datetime.date.today().isoformat()
    log(f"--- Starting Daily Scrape: {today} ---")
    all_holdings = []
    
    for fund in FUNDS:
        ticker = fund['ticker']
        df = get_holdings_avantis(fund) if fund['type'] == 'avantis' else get_holdings_csv(fund)
        
        if df is not None:
            df = normalize_columns(df)
            df = clean_data(df)
            process_and_save_fund(df, ticker)
            all_holdings.append(df)
        time.sleep(1)
    
    if all_holdings:
        final_df = pd.concat(all_holdings, ignore_index=True)
        # Sort and ensure consistent columns
        cols = ['Date', 'ETF Ticker', 'Name', 'Ticker', 'Weight', 'Share Quantity', 'Market Value']
        existing_cols = [c for c in cols if c in final_df.columns]
        other_cols = [c for c in final_df.columns if c not in cols]
        final_df = final_df[existing_cols + other_cols]
        
        # 3. Save Daily Combined Master
        daily_combined = os.path.join(DAILY_DIR, f"combined_{today}.csv")
        final_df.to_csv(daily_combined, index=False)
        log(f"Saved daily combined master: {os.path.basename(daily_combined)}")
        
        # 4. Generate Changes Report
        generate_changes(final_df, today)
        
        # 5. Update Dashboard Source
        final_df.to_csv(DASHBOARD_CSV, index=False)
        log(f"Updated global dashboard file: {DASHBOARD_CSV}")
        
    else:
        log("No data collected today.")
    
    log("--- Scrape Complete ---")

if __name__ == "__main__":
    main()
