import sqlite3
import datetime

DB_PATH = 'data/holdings.db'

def check_all_etfs():
    today = datetime.date.today().isoformat()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check Holdings
    print(f"--- Holdings for {today} ---")
    cursor.execute('SELECT ETF_Ticker, COUNT(*) FROM Holdings WHERE Date = ? GROUP BY ETF_Ticker', (today,))
    rows = cursor.fetchall()
    found_etfs = {r[0] for r in rows}
    for r in rows:
        print(f"ETF: {r[0]}, Count: {r[1]}")
    
    # List of expected ETFs from scrape_avantis.py
    expected_etfs = [
        'AVUV', 'AVLV', 'AVMV', 'KYLD', 'KQQQ', 'BLOX', 'EGGQ', 'EGGY', 'EGGS', 'ULTY', 'SLTY', 'ULTI',
        'ARKK', 'ARKQ', 'ARKW', 'ARKG', 'ARKF', 'ARKX',
        # Weekly pay suite
        'MSTW', 'NVDW', 'COIW', 'TSLW', 'HOOW', 'PLTW',
        'QDTE', 'XDTE', 'RDTE', 'YBTC',
        'MSTY', 'NVDY', 'CONY', 'TSLY', 'HOOY', 'PLTY',
        'MSII', 'NVII', 'COII', 'TSII', 'HOII', 'PLTI',
    ]
    
    missing = [e for e in expected_etfs if e not in found_etfs]
    if missing:
        print(f"\nMissing ETFs for today: {missing}")
    else:
        print("\nAll expected ETFs are present for today.")
        
    # Check Changes
    print(f"\n--- Changes for {today} ---")
    cursor.execute('SELECT ETF_Ticker, COUNT(*) FROM DailyChanges WHERE Date = ? GROUP BY ETF_Ticker', (today,))
    rows = cursor.fetchall()
    if rows:
        for r in rows:
            print(f"ETF: {r[0]}, Changes: {r[1]}")
    else:
        print("No changes found for today.")
        
    conn.close()

if __name__ == "__main__":
    check_all_etfs()
