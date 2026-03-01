#!/bin/bash
# deploy.sh — Deploy TickerTrace API to Vultr
# Run from the TickerTrace root directory on the server.

set -e

echo "=== TickerTrace API Deploy ==="

# Pull latest
echo "Pulling latest from GitHub..."
git pull origin main

# Install/update deps
echo "Installing Python dependencies..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r api/requirements.txt --quiet

# Copy .env if it doesn't exist
if [ ! -f "api/.env" ]; then
    cp api/.env.example api/.env
    echo "⚠️  Created api/.env from template — edit it with your Stripe keys!"
fi

# Install systemd service
echo "Installing systemd service..."
sudo cp api/tickertrace-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable tickertrace-api
sudo systemctl restart tickertrace-api

# Install Apache vhost
echo "Installing Apache vhost..."
sudo cp api/tickertrace-api.conf /etc/apache2/sites-available/
sudo a2ensite tickertrace-api
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite
sudo systemctl reload apache2

echo ""
echo "✅ TickerTrace API deployed!"
echo "   API:  http://api.tickertrace.mphinance.com/health"
echo "   Docs: http://api.tickertrace.mphinance.com/docs"
echo ""
echo "Next steps:"
echo "  1. Edit api/.env with your Stripe keys"
echo "  2. Set up SSL: sudo certbot --apache -d api.tickertrace.mphinance.com"
echo "  3. Create Stripe products and update STRIPE_PRICE_PRO in .env"
echo "  4. Add Stripe webhook URL: https://api.tickertrace.mphinance.com/billing/webhook"
echo "  5. Restart: sudo systemctl restart tickertrace-api"
