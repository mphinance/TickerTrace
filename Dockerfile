FROM python:3.12-slim

WORKDIR /app

# Install deps
COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

# Copy API code
COPY api/ api/

# Copy effectiveness engine (used by api.server for /api/v1/fund-effectiveness)
COPY effectiveness.py effectiveness.py

# Copy CBOE scanner (used by api.server for /api/v1/options-listings)
COPY cboe_scanner.py cboe_scanner.py

# Copy data directory (mounted as volume in production)
# In production, mount the real data dir to /app/etf-dashboard/public/data
RUN mkdir -p etf-dashboard/public/data/history

# Expose port
EXPOSE 8100

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8100/health')" || exit 1

# Run with uvicorn
CMD ["uvicorn", "api.server:app", "--host", "0.0.0.0", "--port", "8100", "--workers", "2"]
