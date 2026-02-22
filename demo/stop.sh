#!/bin/bash
# Stop n8n demo

cd "$(dirname "$0")"

echo "🛑 Stopping n8n..."
docker compose down

echo "✅ n8n stopped"
echo ""
echo "💡 Data is preserved in Docker volume 'n8n-demo_n8n_data'"
echo "   To remove all data: docker volume rm n8n-demo_n8n_data"
