import sqlite3
import datetime
import pandas as pd
import os

DB_PATH = 'data/holdings.db'

def cleanup_database():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("--- Starting Database Cleanup ---")

    # 1. Standardize dates in Holdings table
    print("Standardizing dates in Holdings table...")
    cursor.execute("SELECT rowid, Date FROM Holdings")
    rows = cursor.fetchall()
    updates = []
    for rowid, date_str in rows:
        try:
            # Try to parse and format as YYYY-MM-DD
            new_date = pd.to_datetime(date_str).strftime('%Y-%m-%d')
            if new_date != date_str:
                updates.append((new_date, rowid))
        except:
            continue
    
    if updates:
        cursor.executemany("UPDATE Holdings SET Date = ? WHERE rowid = ?", updates)
        print(f"Updated {len(updates)} rows in Holdings.")

    # 2. Standardize dates in DailyChanges table
    print("Standardizing dates in DailyChanges table...")
    cursor.execute("SELECT rowid, Date FROM DailyChanges")
    rows = cursor.fetchall()
    updates = []
    for rowid, date_str in rows:
        try:
            new_date = pd.to_datetime(date_str).strftime('%Y-%m-%d')
            if new_date != date_str:
                updates.append((new_date, rowid))
        except:
            continue
    
    if updates:
        cursor.executemany("UPDATE DailyChanges SET Date = ? WHERE rowid = ?", updates)
        print(f"Updated {len(updates)} rows in DailyChanges.")

    # 3. Fix records with NULL or 'None' ETF_Ticker
    # This is tricky because we don't know which ETF they belong to if it's NULL.
    # However, if we only have one such record per date/name/ticker, we might be able to infer
    # or just delete them if they are duplicates of correctly tagged records.
    print("Cleaning up NULL or 'None' ETF_Tickers...")
    cursor.execute("DELETE FROM Holdings WHERE ETF_Ticker IS NULL OR ETF_Ticker = 'None'")
    print(f"Deleted {cursor.rowcount} records with invalid ETF_Ticker from Holdings.")
    
    cursor.execute("DELETE FROM DailyChanges WHERE ETF_Ticker IS NULL OR ETF_Ticker = 'None'")
    print(f"Deleted {cursor.rowcount} records with invalid ETF_Ticker from DailyChanges.")

    conn.commit()
    conn.close()
    print("--- Database Cleanup Complete ---")

if __name__ == "__main__":
    cleanup_database()
