# @templatefox/n8n-nodes

This is an n8n community node for [TemplateFox](https://pdftemplateapi.com) - a PDF generation API that lets you create professional PDFs from templates.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

**npm:**
```bash
npm install @templatefox/n8n-nodes
```

**n8n Desktop/Cloud:**
1. Go to **Settings** > **Community Nodes**
2. Select **Install**
3. Enter `@templatefox/n8n-nodes`
4. Agree to the risks and click **Install**

## Operations

### Generate PDF

Generate a PDF document from a template with your data.

**Features:**
- **Template Dropdown**: Select from your saved templates
- **Dynamic Fields**: Fields automatically appear based on the selected template
- **JSON Mode**: For advanced users who prefer raw JSON input
- **Custom Filename**: Set a custom filename for the generated PDF
- **URL Expiration**: Configure how long the PDF URL remains valid

## Credentials

To use this node, you need a TemplateFox API key:

1. Sign up at [pdftemplateapi.com](https://pdftemplateapi.com)
2. Go to your [API Dashboard](https://pdftemplateapi.com/dashboard/api)
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

- [TemplateFox Documentation](https://pdftemplateapi.com/docs)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [TemplateFox API Reference](https://pdftemplateapi.com/docs/api)

## Support

- **TemplateFox Support**: support@pdftemplateapi.com
- **GitHub Issues**: [Report bugs or request features](https://github.com/TemplateFoxPDF/@templatefox/n8n-nodes/issues)

## License

[MIT](LICENSE)
