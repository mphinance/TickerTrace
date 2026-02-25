import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "holdings.db")

def setup_database():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create Holdings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Holdings (
            Date TEXT,
            ETF_Ticker TEXT,
            Name TEXT,
            Ticker TEXT,
            Weight REAL,
            Share_Quantity REAL,
            Market_Value REAL,
            Security_Type TEXT,
            CUSIP TEXT,
            ISIN TEXT,
            SEDOL TEXT,
            Sector TEXT,
            Country TEXT,
            Underlying_Ticker TEXT,
            Option_Strike REAL,
            Option_Expiry TEXT,
            Option_Type TEXT,
            DTE REAL,
            Underlying_Price REAL,
            Moneyness REAL,
            PRIMARY KEY (Date, ETF_Ticker, Ticker)
        )
    ''')

    # Create DailyChanges table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS DailyChanges (
            Date TEXT,
            ETF_Ticker TEXT,
            Ticker TEXT,
            Name TEXT,
            Prev_Quantity REAL,
            New_Quantity REAL,
            Qty_Delta REAL,
            Weight_Delta REAL,
            PRIMARY KEY (Date, ETF_Ticker, Ticker)
        )
    ''')

    conn.commit()
    conn.close()
    print(f"Database setup complete at {DB_PATH}")

if __name__ == "__main__":
    setup_database()
