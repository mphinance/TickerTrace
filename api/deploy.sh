#!/bin/bash
# deploy.sh — Deploy TickerTrace API via Docker on Vultr
# Run from the TickerTrace root directory on the server.

set -e

echo "=== TickerTrace API Docker Deploy ==="

# Pull latest
echo "Pulling latest from GitHub..."
git pull origin main

# Copy .env if it doesn't exist
if [ ! -f "api/.env" ]; then
    cp api/.env.example api/.env
    echo "⚠️  Created api/.env from template — edit it with your Stripe keys!"
    echo "   Then re-run this script."
    exit 1
fi

# Create data dir for SQLite persistence
mkdir -p api/data

# Build and start
echo "Building Docker image..."
docker-compose build --no-cache

echo "Starting container..."
docker-compose up -d

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
echo "  docker-compose logs -f        # follow logs"
echo "  docker-compose restart         # restart"
echo "  docker-compose down            # stop"
echo "  docker-compose up -d --build   # rebuild + restart"
