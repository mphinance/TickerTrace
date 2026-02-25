import sqlite3
import os

DB_PATH = 'data/holdings.db'

def inspect_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("--- Holdings Summary ---")
    cursor.execute('SELECT Date, ETF_Ticker, COUNT(*) FROM Holdings GROUP BY Date, ETF_Ticker ORDER BY Date DESC LIMIT 20;')
    rows = cursor.fetchall()
    for r in rows:
        print(f"Date: {r[0]}, ETF: {r[1]}, Count: {r[2]}")
        
    print("\n--- Sample ARKK Data ---")
    cursor.execute('SELECT * FROM Holdings WHERE ETF_Ticker = "ARKK" LIMIT 5;')
    rows = cursor.fetchall()
    for r in rows:
        print(r)
        
    conn.close()

if __name__ == "__main__":
    inspect_db()
