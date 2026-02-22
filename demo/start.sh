#!/bin/bash
# Start n8n for demo/testing purposes

set -e

cd "$(dirname "$0")"

echo "🚀 Starting n8n..."
docker compose up -d

echo ""
echo "✅ n8n is running at: http://localhost:5678"
echo ""
echo "📦 To install the TemplateFox node:"
echo "   1. Open http://localhost:5678"
echo "   2. Create an account (local only)"
echo "   3. Go to Settings → Community Nodes"
echo "   4. Click 'Install' and enter: n8n-nodes-templatefox"
echo "   5. Restart n8n if prompted"
echo ""
echo "🛑 To stop: ./stop.sh"
