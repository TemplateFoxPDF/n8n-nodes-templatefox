#!/bin/bash
# Reset n8n demo (removes all data)

cd "$(dirname "$0")"

echo "🗑️  Resetting n8n demo..."
docker compose down -v

echo "✅ n8n reset complete (all data removed)"
echo ""
echo "Run ./start.sh to start fresh"
