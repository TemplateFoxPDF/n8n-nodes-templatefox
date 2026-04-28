# n8n-nodes-templatefox

This is an n8n community node for [TemplateFox](https://templatefox.com) - a PDF generation API that lets you create professional PDFs from templates.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

**npm:**
```bash
npm install n8n-nodes-templatefox
```

**n8n Desktop/Cloud:**
1. Go to **Settings** > **Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-templatefox`
4. Agree to the risks and click **Install**

## Operations

### Generate PDF (sync)

Generate a PDF from a template with your data — the main operation. Returns a signed URL or a binary file.

**Features:**
- **Template dropdown** — pick from your saved templates
- **Template version dropdown** — pin to a tagged version, or use the live draft
- **Dynamic fields** — auto-populated from the selected template
- **JSON mode** — raw JSON input for arrays and nested data
- **PDF/A variant** — generate `pdf/a-1b`, `pdf/a-2b`, or `pdf/a-3b` archival PDFs
- **Custom filename / URL expiration / S3 upload** options

### Generate PDF (Async)

Same inputs as Generate PDF, but queues a job and returns a `job_id` immediately. Best for large documents, batches, or when you don't want to hold an HTTP connection open. Pair with **Get PDF Job** (or a webhook) to retrieve the result.

### PDF tools (no template needed)

- **Merge PDFs** — concatenate 2+ PDFs (URL or base64) into a single document
- **Extract PDF Pages** — pull selected pages using a `1-3, 5, 7-9` syntax
- **Rotate PDF** — rotate every page by a single angle, or apply a per-page rotation map

### Read-only operations

- **Get PDF Job** — look up an async job by ID
- **List PDF Jobs** — list recent jobs, optionally filtered by status
- **Get Account** — returns remaining credits and account email

The node is also `usableAsTool: true`, so any of these operations can be exposed to an n8n AI Agent.

## Credentials

To use this node, you need a TemplateFox API key:

1. Sign up at [templatefox.com](https://templatefox.com)
2. Go to your [API Dashboard](https://templatefox.com/dashboard/api)
3. Copy your API key
4. In n8n, create new **TemplateFox API** credentials and paste your key

## Usage

### Basic Example

1. Add the **TemplateFox** node to your workflow
2. Configure your TemplateFox API credentials
3. Select a template from the dropdown
4. Fill in the template fields with your data
5. Execute the workflow to generate a PDF

### Using JSON Mode

For complex data structures (arrays, nested objects):

1. Select **JSON** as the Data Input Mode
2. Enter your data as JSON:
```json
{
  "customer_name": "John Doe",
  "invoice_number": "INV-001",
  "items": [
    {"description": "Widget A", "quantity": 2, "price": 10.00},
    {"description": "Widget B", "quantity": 1, "price": 25.00}
  ]
}
```

### Output

The node returns:
- `url`: Direct URL to download the PDF
- `filename`: The PDF filename
- `credits_remaining`: Your remaining API credits
- `expires_in`: Seconds until the URL expires

## Resources

- [TemplateFox Documentation](https://templatefox.com/docs)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [TemplateFox API Reference](https://templatefox.com/docs/api)

## Support

- **TemplateFox Support**: support@templatefox.com
- **GitHub Issues**: [Report bugs or request features](https://github.com/TemplateFoxPDF/n8n-nodes-templatefox/issues)

## License

[MIT](LICENSE)
