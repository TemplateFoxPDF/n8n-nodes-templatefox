# n8n Workflow Templates for TemplateFox

Ready-to-import workflow templates for [n8n](https://n8n.io) using the [TemplateFox](https://n8n.io/integrations/templatefox/) community node.

## Workflows

| Workflow | File | Description |
|----------|------|-------------|
| Stripe Payment to Invoice | `stripe-payment-to-invoice.json` | Stripe checkout completes → fetches line items → generates invoice PDF → emails customer + saves to Google Drive |
| AI Payment to Receipt | `ai-payment-to-receipt.json` | Stripe charge → AI categorizes payment → generates receipt PDF → emails customer |
| Order to Packing Slip & Label | `order-to-packing-slip-and-label.json` | Webhook receives order → generates packing slip + shipping label PDFs in parallel |
| Form to PDF | `form-to-pdf.json` | n8n form submission → maps to template → generates PDF → emails recipient |

## How to Use

### Import into n8n

1. Open your n8n instance
2. Go to **Workflows** → **Add workflow** → **Import from file**
3. Select the `.json` file
4. Update the placeholder values (see below)

### Setup Required

After importing, you need to configure:

1. **TemplateFox API credentials** — Add your API key from [app.templatefox.com](https://app.templatefox.com)
2. **Select your template** in the TemplateFox node dropdown (loads dynamically from your account)
3. **Other credentials** — Gmail, Stripe, OpenAI, etc. depending on the workflow

### Finding Template IDs

1. Log in to [app.templatefox.com](https://app.templatefox.com)
2. Go to **Templates**
3. Click on a template → the UUID in the URL is the template ID

## Published on n8n.io

These workflows are also available on the n8n workflow library:

| Workflow | n8n.io Link |
|----------|-------------|
| Stripe Payment to Invoice | _pending_ |
| AI Payment to Receipt | _pending_ |
| Order to Packing Slip & Label | _pending_ |
| Form to PDF | _pending_ |

## Prerequisites

- [TemplateFox n8n node](https://www.npmjs.com/package/n8n-nodes-templatefox) installed (`n8n-nodes-templatefox`)
- TemplateFox API key
- n8n v1.0+ (for AI Agent workflows: n8n v1.30+)

## n8n.io Submission Reference

Markdown with `## H2` headings. Follow the structure from top n8n templates (Summary, Problem Solved, Who Can Benefit, Prerequisites, Workflow Details, Customization).

---

### 1. Stripe payment → Invoice PDF → Gmail + Google Drive

**File:** `stripe-payment-to-invoice.json`

**Description (paste in form):** See `stripe-payment-to-invoice.md`

---

### 2. Send receipt PDFs for Stripe payments using AI and TemplateFox

**File:** `ai-payment-to-receipt.json`

**Description (paste in form):**

```markdown
## Summary

This workflow automatically generates and emails professional receipt PDFs whenever a Stripe payment succeeds. An AI Agent categorizes each payment (subscription, one-time, donation, or service), extracts the relevant details, and TemplateFox creates a branded receipt PDF that gets emailed to the customer.

## Problem Solved

Without this automation, sending receipts for Stripe payments requires:

- Monitoring your Stripe dashboard for new charges
- Manually creating a receipt with the correct payment details
- Categorizing the payment type (subscription vs one-time vs donation)
- Exporting as PDF and emailing it to the customer
- Repeating this for every single payment

This workflow handles all of that automatically for every Stripe charge, including smart categorization that adds context like "Monthly subscription — Receipt #12."

## Who Can Benefit

- **SaaS companies** who need automated receipts for subscription payments
- **E-commerce stores** sending order confirmations with receipts
- **Service providers** billing clients and needing professional receipts
- **Nonprofits** issuing donation receipts for tax purposes
- **Membership sites** sending payment confirmations to members

## Prerequisites

- [TemplateFox](https://templatefox.com) account with an API key (free tier available)
- OpenAI API key
- Stripe account with webhook access
- Gmail account with OAuth2 configured
- Install the **TemplateFox** community node from Settings → Community Nodes

## Setting Up Your Template

You need a TemplateFox receipt template for this workflow. You can:

1. **Start from an example** — Browse [receipt templates](https://templatefox.com/templates/receipt), pick one you like, and customize it in the visual editor to match your branding
2. **Create from scratch** — Design your own receipt template in the [TemplateFox editor](https://app.templatefox.com)

Once your template is ready, select it from the dropdown in the TemplateFox node — no need to copy template IDs manually.

## Workflow Details

**Step 1: Stripe Trigger**
Fires on every successful charge (`charge.succeeded`). You can customize the event types if needed (e.g., add `invoice.payment_succeeded` for subscription invoices).

**Step 2: AI Agent**
An OpenAI-powered AI Agent analyzes the Stripe charge data and extracts receipt fields: receipt number, customer name, email, amount, currency, payment method (e.g., "Visa ending in 4242"), and categorizes the payment type.

**Step 3: Parse Receipt Data**
A Code node parses the AI JSON response into clean, structured receipt data ready for the PDF template.

**Step 4: TemplateFox — Generate Receipt**
Sends the structured data to TemplateFox, which generates a branded receipt PDF. Select your receipt template from the dropdown.

**Step 5: Send Receipt Email**
Sends the receipt PDF link to the customer via Gmail with a summary including the receipt number, amount, date, and payment method.

## Customization Guidance

- **Stripe Events:** Add more event types in the Stripe Trigger node (e.g., `invoice.payment_succeeded` for subscription invoices).
- **AI Categories:** Edit the AI prompt to add custom categories (e.g., "consulting", "product", "course").
- **Template:** Use any receipt template from your TemplateFox account — you can have different templates for different payment categories.
- **Email Body:** Customize the receipt email HTML in the Send Receipt Email node.

**Note:** This template uses the [TemplateFox community node](https://www.npmjs.com/package/n8n-nodes-templatefox). Install it from Settings → Community Nodes.
```

---

### 3. Generate packing slip and shipping label PDFs from orders with TemplateFox

**File:** `order-to-packing-slip-and-label.json`

**Description (paste in form):**

```markdown
## Summary

This workflow receives e-commerce order data via webhook and generates both a packing slip and a shipping label PDF in parallel using TemplateFox. Both PDF URLs are returned in the webhook response, ready to be printed or forwarded to your warehouse team.

## Problem Solved

Without this automation, processing each order for fulfillment requires:

- Extracting order details from your e-commerce platform
- Creating a packing slip with item names, SKUs, and quantities
- Creating a shipping label with sender and recipient addresses
- Saving both documents and sending them to the warehouse
- Handling edge cases like gift orders or special instructions

This workflow automates the entire process. Send an order webhook, get back two PDFs in seconds.

## Who Can Benefit

- **E-commerce stores** using Shopify, WooCommerce, or custom platforms
- **Warehouse and fulfillment teams** processing orders daily
- **3PL providers** handling shipments for multiple clients
- **Dropshippers** who need shipping documentation for each order
- **Subscription box companies** generating packing slips at scale

## Prerequisites

- [TemplateFox](https://templatefox.com) account with an API key (free tier available)
- An e-commerce platform or system that can send order webhooks (Shopify, WooCommerce, etc.)
- Install the **TemplateFox** community node from Settings → Community Nodes

## Setting Up Your Templates

This workflow uses two TemplateFox templates — one for the packing slip and one for the shipping label. For each, you can:

1. **Start from an example** — Browse [packing slip templates](https://templatefox.com/templates/packing-slip) and [shipping label templates](https://templatefox.com/templates/shipping-label), pick the ones you like, and customize them in the visual editor to match your branding
2. **Create from scratch** — Design your own templates in the [TemplateFox editor](https://app.templatefox.com)

Once your templates are ready, select them from the dropdowns in the two TemplateFox nodes — no need to copy template IDs manually.

## Workflow Details

**Step 1: Webhook — New Order**
Receives a POST request with order data in JSON format. Compatible with Shopify, WooCommerce, or any custom payload.

**Step 2: Format Order Data**
A Code node splits the order into two datasets: packing slip data (order number, items, SKUs, quantities, special instructions) and shipping label data (sender address, recipient address, weight, shipping method). Gift orders are automatically flagged with "GIFT — Do not include price."

**Step 3: TemplateFox — Packing Slip (parallel)**
Generates the packing slip PDF from your TemplateFox template. Runs in parallel with the shipping label.

**Step 4: TemplateFox — Shipping Label (parallel)**
Generates the shipping label PDF from a separate TemplateFox template. Runs simultaneously with the packing slip for faster processing.

**Step 5: Combine Results & Respond**
Combines both PDF URLs into a single JSON response and returns it via the webhook. Your calling system gets both PDF links immediately.

## Customization Guidance

- **Order Payload:** Edit the "Format Order Data" code node to map your specific order JSON structure (Shopify, WooCommerce, or custom).
- **Sender Address:** Update `from_name` and `from_address` in the Code node with your warehouse details.
- **Templates:** Select different packing slip and shipping label templates from the TemplateFox dropdown.
- **Gift Detection:** The workflow checks for `gift_message` in item properties. Modify the logic for your specific gift order format.

**Note:** This template uses the [TemplateFox community node](https://www.npmjs.com/package/n8n-nodes-templatefox). Install it from Settings → Community Nodes.
```

---

### 4. Turn n8n form submissions into PDFs with TemplateFox

**File:** `form-to-pdf.json`

**Description (paste in form):**

```markdown
## Summary

This workflow provides a no-code PDF generation tool using n8n's built-in Form Trigger. Users fill out a web form, select a document type (invoice, receipt, certificate, or packing slip), and receive a professionally generated PDF via email. No external form builder or custom application needed.

## Problem Solved

Without this workflow, generating PDFs on demand typically requires:

- Building a custom web application with a form
- Integrating with a PDF generation API
- Setting up email delivery for the generated documents
- Maintaining the application over time

This workflow gives you a fully functional PDF generation tool in 5 minutes. Share the form URL with your team and they can generate documents instantly.

## Who Can Benefit

- **Internal teams** who need to generate documents without developer help
- **Customer support** teams creating receipts or certificates on request
- **HR departments** generating certificates or offer letters
- **Sales teams** quickly producing invoices or quotes for clients
- **Event organizers** issuing certificates to attendees

## Prerequisites

- [TemplateFox](https://templatefox.com) account with an API key (free tier available)
- Gmail account with OAuth2 configured
- Install the **TemplateFox** community node from Settings → Community Nodes

## Setting Up Your Templates

This workflow supports multiple document types. You need a TemplateFox template for each type you want to offer. Browse examples by category:

- [Invoice templates](https://templatefox.com/templates/invoice)
- [Receipt templates](https://templatefox.com/templates/receipt)
- [Certificate templates](https://templatefox.com/templates/certificate)
- [Packing slip templates](https://templatefox.com/templates/packing-slip)

Pick any example and customize it in the visual editor, or create your own from scratch in the [TemplateFox editor](https://app.templatefox.com). Then paste each template's UUID into the `templateMap` in the "Map Template & Build Data" Code node.

## Workflow Details

**Step 1: n8n Form Trigger**
Displays a web form with a dropdown for document type (invoice, receipt, certificate, packing slip), plus fields for recipient name, email, company, amount, and description. No external form tool needed.

**Step 2: Map Template & Build Data**
A Code node maps the selected document type to a TemplateFox template ID and builds the data payload from the form fields. This is where you paste your actual template IDs.

**Step 3: TemplateFox — Generate PDF**
Generates the PDF using the selected template and form data. The template ID is passed dynamically based on the user's form selection.

**Step 4: Email PDF to Recipient**
Sends the PDF download link to the recipient via Gmail with a branded email including a download button. The link expires after 24 hours.

**Step 5: Respond to Form**
Shows a success confirmation message to the user who submitted the form, confirming that the PDF was generated and sent.

## Customization Guidance

- **Document Types:** Add or remove options in the Form Trigger dropdown and update the `templateMap` in the Code node.
- **Form Fields:** Add custom fields in the Form Trigger to collect more data (e.g., tax ID, address, line items).
- **Template Mapping:** Open the "Map Template & Build Data" node and replace the empty template IDs with your actual TemplateFox template UUIDs.
- **Email Branding:** Customize the email HTML in the "Email PDF to Recipient" node with your brand colors and logo.

**Note:** This template uses the [TemplateFox community node](https://www.npmjs.com/package/n8n-nodes-templatefox). Install it from Settings → Community Nodes.
```
