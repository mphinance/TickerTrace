#!/bin/bash
# deploy.sh — Deploy TickerTrace API via Docker on Vultr
# Run from the TickerTrace root directory on the server.

set -e

echo "=== TickerTrace API Docker Deploy ==="

# Pull latest
echo "Pulling latest from GitHub..."
git pull origin main

# Copy .env if it doesn't exist (no required vars anymore — API is fully open)
if [ ! -f "api/.env" ]; then
    cp api/.env.example api/.env
    echo "ℹ️  Created api/.env from template. All vars are optional; defaults are fine."
fi

# Also use docker compose v2 if available (preferred), fall back to v1.
DC="docker compose"
if ! docker compose version >/dev/null 2>&1; then
    DC="$DC"
fi

# Create data dir for SQLite persistence
mkdir -p api/data

# Build and start
echo "Building Docker image..."
$DC build --no-cache

echo "Starting container..."
$DC up -d

# Wait a moment and check health
sleep 3
echo ""
echo "Checking health..."
curl -s http://localhost:8100/health && echo ""

echo ""
echo "✅ TickerTrace API deployed!"
echo "   Local:  http://localhost:8100/health"
echo "   Docs:   http://localhost:8100/docs"
echo ""
echo "Apache reverse proxy should forward api.tickertrace.mphinance.com → localhost:8100"
echo ""
echo "Useful commands:"
echo "  $DC logs -f        # follow logs"
echo "  $DC restart         # restart"
echo "  $DC down            # stop"
echo "  $DC up -d --build   # rebuild + restart"
