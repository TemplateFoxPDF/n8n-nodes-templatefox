# n8n Demo Environment

Local n8n instance for testing and recording demo videos of the TemplateFox community node.

## Prerequisites

- Docker Desktop installed and running

## Quick Start

```bash
# Start n8n
./start.sh

# Open http://localhost:5678
# Create account → Settings → Community Nodes → Install: n8n-nodes-templatefox
```

## Commands

| Command | Description |
|---------|-------------|
| `./start.sh` | Start n8n |
| `./stop.sh` | Stop n8n (preserves data) |
| `./reset.sh` | Stop and delete all data |

## Recording Demo Video

For the n8n verification process, record a video showing:

1. **Install node**: Settings → Community Nodes → `n8n-nodes-templatefox`
2. **Create workflow**: Add TemplateFox node
3. **Setup credentials**: Add API key, test connection
4. **Demo actions**: Generate a PDF from a template
5. **AI Agent**: Show node working as an AI Agent tool

### Tips

- Use Loom or OBS for recording
- No cuts in the video
- Keep it under 5 minutes
- Voice-over is optional but helpful
