
import re
from bs4 import BeautifulSoup

def inspect():
    with open('temp_page_ua.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Try to find the CSV-like string
    # Pattern: Look for "WINTRUST FINANCIAL CORP" and grab surrounding text
    match = re.search(r'WINTRUST FINANCIAL CORP', html)
    if match:
        start = max(0, match.start() - 500)
        end = min(len(html), match.end() + 500)
        print(f"--- Context around match ---\n{html[start:end]}\n---------------------------")

    # Try to find the script tag containing the data
    soup = BeautifulSoup(html, 'html.parser')
    scripts = soup.find_all('script')
    for i, script in enumerate(scripts):
        if script.string and 'WINTRUST FINANCIAL CORP' in script.string:
            print(f"Found data in script {i}")
            print(script.string[:500]) # Print start of script
            return

if __name__ == '__main__':
    inspect()
