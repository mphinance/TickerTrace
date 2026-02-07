import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import datetime
import os
import sys
import time
import io

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
OUTPUT_FILE = "normalized_holdings.csv"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Column mapping for normalization
# Maps source column names to target normalized names
COLUMN_MAPPING = {
    # Avantis mappings
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
    
    # Kurv CSV mappings
    'Description': 'Name',
    'Ticker': 'Ticker',
    'Quantity': 'Share Quantity',
    'Market Value': 'Market Value',
    '% of fund': 'Weight',
    'CUSIP': 'CUSIP',
    
    # BLOX CSV mappings
    'StockTicker': 'Ticker',
    'SecurityName': 'Name',
    'Shares': 'Share Quantity',
    'MarketValue': 'Market Value',
    'Weightings': 'Weight',

    # REX Shares CSV mappings
    'Symbol': 'Ticker',
    # 'Name' -> 'Name' (already covered)
    'Shares Held': 'Share Quantity',
    'Net Value': 'Market Value',
    'Weighting': 'Weight',
    'Security Identifier': 'CUSIP',
}

def get_holdings_avantis(fund_config):
    fund_id = fund_config['id']
    fund_ticker = fund_config['ticker']
    url = AVANTIS_BASE_URL_TEMPLATE.format(id=fund_id)
    print(f"Fetching data for {fund_ticker} from {url}...")
    headers = {'User-Agent': USER_AGENT}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL for {fund_ticker}: {e}")
        return None

    html = response.text
    soup = BeautifulSoup(html, 'html.parser')

    # Find the script containing the data
    script_content = None
    for script in soup.find_all('script'):
        if script.string and 'ticker:' in script.string and 'shareQuantity:' in script.string:
            script_content = script.string
            break
    
    if not script_content:
        print(f"Could not find script tag with holdings data for {fund_ticker}.")
        return None

    pattern = r'\{name:"(?P<name>.*?)",ticker:"(?P<ticker>.*?)",securityType:"(?P<securityType>.*?)",.*?cusip:"(?P<cusip>.*?)",isin:"(?P<isin>.*?)",sedol:"(?P<sedol>.*?)",shareQuantity:"(?P<shareQuantity>.*?)",.*?baseMarketValue:"(?P<baseMarketValue>.*?)",weight:"(?P<weight>.*?)",coupon:"(?P<coupon>.*?)",maturityDate:"(?P<maturityDate>.*?)",sector:"(?P<sector>.*?)",country:"(?P<country>.*?)"\}'
    
    matches = re.finditer(pattern, script_content)
    
    holdings_list = []
    for match in matches:
        data = match.groupdict()
        data['ETF Ticker'] = fund_ticker
        data['Date'] = datetime.date.today()
        holdings_list.append(data)
        
    if not holdings_list:
        print(f"No holdings extracted for {fund_ticker}. The structure might have changed.")
        return None
        
    print(f"Extracted {len(holdings_list)} holdings for {fund_ticker}.")
    return pd.DataFrame(holdings_list)

def get_holdings_csv(fund_config):
    url = fund_config['url']
    fund_ticker = fund_config['ticker']
    method = fund_config.get('method', 'get').lower()
    data = fund_config.get('data', None)

    print(f"Fetching CSV data for {fund_ticker} from {url}...")
    headers = {'User-Agent': USER_AGENT}
    try:
        if method == 'post':
            response = requests.post(url, headers=headers, data=data)
        else:
            response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching CSV for {fund_ticker}: {e}")
        return None
    
    try:
        # Read CSV from string, handling BOM if present
        content = response.content.decode('utf-8-sig')
        df = pd.read_csv(io.StringIO(content))
        
        # Add metadata
        df['ETF Ticker'] = fund_ticker
        df['Date'] = datetime.date.today()
        
        print(f"Extracted {len(df)} holdings for {fund_ticker}.")
        return df
    except Exception as e:
        print(f"Error parsing CSV for {fund_ticker}: {e}")
        return None

def normalize_columns(df):
    if df is None or df.empty:
        return df
    return df.rename(columns=COLUMN_MAPPING)

def clean_data(df):
    if df is None or df.empty:
        return df
    
    # Clean Weight column: remove % and convert to float if string
    weight_col = 'Weight' # After normalization
    if weight_col in df.columns:
        # Check if column is object type (string)
        if df[weight_col].dtype == 'object':
            df[weight_col] = df[weight_col].str.replace('%', '', regex=False)
            # Optional: convert to float? Keeping as string/mixed for now to match Avantis output if that's what was there

    # Clean Market Value: remove '$' and ','
    mv_col = 'Market Value'
    if mv_col in df.columns:
        if df[mv_col].dtype == 'object':
            df[mv_col] = df[mv_col].str.replace('$', '', regex=False).str.replace(',', '', regex=False)

            
    return df

def save_to_csv(df):
    if df is None or df.empty:
        print("No data to save.")
        return

    df.to_csv(OUTPUT_FILE, mode='w', header=True, index=False)
    print(f"Saved {len(df)} rows to {OUTPUT_FILE}")

def main():
    all_holdings = []
    
    for fund in FUNDS:
        df = None
        if fund['type'] == 'avantis':
            df = get_holdings_avantis(fund)
        elif fund['type'] == 'csv':
            df = get_holdings_csv(fund)
        else:
            print(f"Unknown fund type: {fund['type']}")
            
        if df is not None:
            # Normalize columns
            df = normalize_columns(df)
            
            # Clean data (e.g. remove % from weight)
            df = clean_data(df)
            
            all_holdings.append(df)
        
        # Be nice to the server
        time.sleep(1)
    
    if all_holdings:
        final_df = pd.concat(all_holdings, ignore_index=True)
        
        # Ensure common columns exist, fill with NaN
        # Also ensure specific order: Date, ETF Ticker, Name, Ticker, ...
        
        cols = ['Date', 'ETF Ticker'] + [c for c in final_df.columns if c not in ['Date', 'ETF Ticker']]
        final_df = final_df[cols]
        
        save_to_csv(final_df)
        print("\n--- Sample Data ---")
        print(final_df.head())
    else:
        print("No holdings data collected.")

if __name__ == "__main__":
    main()
