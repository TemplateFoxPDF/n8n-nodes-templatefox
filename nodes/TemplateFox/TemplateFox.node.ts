import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ResourceMapperFields,
	ResourceMapperField,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { templateFoxApiRequest, parseFieldValue } from './GenericFunctions';

interface TemplateField {
	key: string;
	label: string;
	type: string;
	required?: boolean;
	helpText?: string;
	spec?: Array<{ name: string; label: string; type: string }> | { name: string; label: string; type: string };
}

const PDF_GEN_OPS = ['generatePdf', 'generatePdfAsync'];
const PDF_TOOL_OPS = ['mergePdfs', 'extractPdfPages', 'rotatePdf'];

export class TemplateFox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TemplateFox',
		name: 'templateFox',
		icon: 'file:templatefox.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Generate PDFs from templates and manipulate PDFs using the TemplateFox API',
		usableAsTool: true,
		defaults: {
			name: 'TemplateFox',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'templateFoxApi',
				required: true,
			},
		],
		properties: [
			// ──────────────────────────────────────────────────────────────
			// Operation selector
			// ──────────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generate PDF',
						value: 'generatePdf',
						description: 'Generate a PDF from a template (synchronous)',
						action: 'Generate a PDF from a template',
					},
					{
						name: 'Generate PDF (Async)',
						value: 'generatePdfAsync',
						description: 'Queue a PDF generation job and receive a job ID',
						action: 'Queue an async PDF generation job',
					},
					{
						name: 'Get PDF Job',
						value: 'getPdfJob',
						description: 'Get the status of an async PDF generation job',
						action: 'Get an async PDF job status',
					},
					{
						name: 'List PDF Jobs',
						value: 'listPdfJobs',
						description: 'List async PDF generation jobs',
						action: 'List async PDF jobs',
					},
					{
						name: 'Merge PDFs',
						value: 'mergePdfs',
						description: 'Concatenate two or more PDFs into a single file',
						action: 'Merge multiple PDFs',
					},
					{
						name: 'Extract PDF Pages',
						value: 'extractPdfPages',
						description: 'Extract or reorder pages from a PDF',
						action: 'Extract pages from a PDF',
					},
					{
						name: 'Rotate PDF',
						value: 'rotatePdf',
						description: 'Rotate pages of a PDF by 90, 180 or 270 degrees',
						action: 'Rotate a PDF',
					},
					{
						name: 'Get Account',
						value: 'getAccount',
						description: 'Get account information including remaining credits',
						action: 'Get account information',
					},
				],
				default: 'generatePdf',
			},

			// ──────────────────────────────────────────────────────────────
			// Generate PDF / Generate PDF (Async) — shared inputs
			// ──────────────────────────────────────────────────────────────
			{
				displayName: 'Template Name or ID',
				name: 'templateId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				required: true,
				default: '',
				description:
					'Select the template to generate PDF from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						operation: PDF_GEN_OPS,
					},
				},
			},
			{
				displayName: 'Data Input Mode',
				name: 'dataInputMode',
				type: 'options',
				options: [
					{
						name: 'Use Template Fields',
						value: 'fields',
						description: 'Fill in individual fields based on template variables',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Provide data as raw JSON (recommended for complex arrays)',
					},
				],
				default: 'fields',
				description: 'How to provide template data. Use JSON mode for templates with complex array data.',
				displayOptions: {
					show: {
						operation: PDF_GEN_OPS,
					},
				},
			},
			{
				displayName: 'Template Fields',
				name: 'templateFields',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['templateId'],
					resourceMapper: {
						resourceMapperMethod: 'getTemplateFieldsMapping',
						mode: 'add',
						fieldWords: {
							singular: 'field',
							plural: 'fields',
						},
						addAllFields: true,
						multiKeyMatch: false,
					},
				},
				displayOptions: {
					show: {
						operation: PDF_GEN_OPS,
						dataInputMode: ['fields'],
					},
				},
			},
			{
				displayName: 'JSON Data',
				name: 'jsonData',
				type: 'json',
				default: '{}',
				description:
					'JSON data for template variables. Example: {"name": "John Doe", "items": [{"product": "Widget", "qty": 2}]}',
				displayOptions: {
					show: {
						operation: PDF_GEN_OPS,
						dataInputMode: ['json'],
					},
				},
			},

			// Options collection shared by Generate PDF and Generate PDF (Async)
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: PDF_GEN_OPS,
					},
				},
				options: [
					{
						displayName: 'Expiration (Seconds)',
						name: 'expiration',
						type: 'number',
						default: 86400,
						description:
							'How long the PDF URL stays valid. Range: 60-604800 seconds. Default: 86400 (24 hours).',
						typeOptions: {
							minValue: 60,
							maxValue: 604800,
						},
					},
					{
						displayName: 'Filename',
						name: 'filename',
						type: 'string',
						default: '',
						description:
							'Custom filename for the PDF (without .pdf extension). Only letters, numbers, underscores, hyphens, and dots allowed.',
					},
					{
						displayName: 'PDF Variant',
						name: 'pdfVariant',
						type: 'options',
						default: '',
						description:
							'Generate a standards-compliant PDF/A variant for archival or e-invoicing. Leave empty for standard PDF.',
						options: [
							{ name: 'Standard PDF', value: '' },
							{ name: 'PDF/A-1b (Legacy Archival)', value: 'pdf/a-1b' },
							{ name: 'PDF/A-2b (Modern Archival)', value: 'pdf/a-2b' },
							{ name: 'PDF/A-3b (Archival + Attachments)', value: 'pdf/a-3b' },
						],
					},
					{
						displayName: 'Template Version Name or ID',
						name: 'version',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getTemplateVersions',
							loadOptionsDependsOn: ['templateId'],
						},
						description:
							'Pick a tagged version, or "Draft (live editor)" to use the working draft. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Store on S3',
						name: 'storeS3',
						type: 'boolean',
						default: false,
						description: 'Whether to upload the PDF to your configured S3 bucket instead of the TemplateFox CDN',
					},
					{
						displayName: 'S3 Filepath',
						name: 's3Filepath',
						type: 'string',
						default: '',
						description: 'Custom S3 path prefix (max 500 chars). Only used when "Store on S3" is enabled.',
					},
					{
						displayName: 'S3 Bucket',
						name: 's3Bucket',
						type: 'string',
						default: '',
						description: 'Override the default S3 bucket for this request. Only used when "Store on S3" is enabled.',
					},
				],
			},

			// Async-only options: webhook
			{
				displayName: 'Webhook',
				name: 'webhook',
				type: 'collection',
				placeholder: 'Add Webhook Setting',
				default: {},
				displayOptions: {
					show: {
						operation: ['generatePdfAsync'],
					},
				},
				options: [
					{
						displayName: 'Webhook URL',
						name: 'webhookUrl',
						type: 'string',
						default: '',
						description: 'HTTPS URL that will receive a POST notification when the job completes or fails',
					},
					{
						displayName: 'Webhook Secret',
						name: 'webhookSecret',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description: 'Optional HMAC-SHA256 secret (16-256 chars) used to sign webhook payloads via the X-TemplateFox-Signature header',
					},
				],
			},

			// ──────────────────────────────────────────────────────────────
			// Get PDF Job
			// ──────────────────────────────────────────────────────────────
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				required: true,
				default: '',
				description: 'UUID of the async job (returned by Generate PDF (Async))',
				displayOptions: {
					show: {
						operation: ['getPdfJob'],
					},
				},
			},

			// ──────────────────────────────────────────────────────────────
			// List PDF Jobs
			// ──────────────────────────────────────────────────────────────
			{
				displayName: 'Filters',
				name: 'jobsFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						operation: ['listPdfJobs'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 20,
						typeOptions: { minValue: 1, maxValue: 100 },
						description: 'Max number of results (1-100)',
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						default: 0,
						typeOptions: { minValue: 0 },
						description: 'Number of results to skip for pagination',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						default: '',
						options: [
							{ name: 'Any', value: '' },
							{ name: 'Pending', value: 'pending' },
							{ name: 'Processing', value: 'processing' },
							{ name: 'Completed', value: 'completed' },
							{ name: 'Failed', value: 'failed' },
						],
						description: 'Filter jobs by status',
					},
				],
			},

			// ──────────────────────────────────────────────────────────────
			// Merge PDFs
			// ──────────────────────────────────────────────────────────────
			{
				displayName: 'PDFs to Merge',
				name: 'mergePdfs',
				type: 'fixedCollection',
				required: true,
				default: {},
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				placeholder: 'Add PDF',
				displayOptions: {
					show: {
						operation: ['mergePdfs'],
					},
				},
				options: [
					{
						displayName: 'PDF',
						name: 'item',
						values: [
							{
								displayName: 'Input Type',
								name: 'inputType',
								type: 'options',
								default: 'url',
								options: [
									{ name: 'URL', value: 'url' },
									{ name: 'Base64', value: 'base64' },
								],
							},
							{
								displayName: 'PDF URL',
								name: 'pdfUrl',
								type: 'string',
								default: '',
								displayOptions: { show: { inputType: ['url'] } },
								description: 'Public HTTPS URL pointing to the PDF',
							},
							{
								displayName: 'PDF Base64',
								name: 'pdfBase64',
								type: 'string',
								default: '',
								typeOptions: { rows: 3 },
								displayOptions: { show: { inputType: ['base64'] } },
								description: 'Base64-encoded PDF content',
							},
						],
					},
				],
				description: 'Provide at least 2 PDFs in the order they should be concatenated',
			},

			// ──────────────────────────────────────────────────────────────
			// Extract PDF Pages / Rotate PDF — shared single PDF input
			// ──────────────────────────────────────────────────────────────
			{
				displayName: 'PDF Input Type',
				name: 'pdfInputType',
				type: 'options',
				default: 'url',
				options: [
					{ name: 'URL', value: 'url' },
					{ name: 'Base64', value: 'base64' },
				],
				displayOptions: {
					show: {
						operation: ['extractPdfPages', 'rotatePdf'],
					},
				},
			},
			{
				displayName: 'PDF URL',
				name: 'pdfUrl',
				type: 'string',
				required: true,
				default: '',
				description: 'Public HTTPS URL pointing to the PDF',
				displayOptions: {
					show: {
						operation: ['extractPdfPages', 'rotatePdf'],
						pdfInputType: ['url'],
					},
				},
			},
			{
				displayName: 'PDF Base64',
				name: 'pdfBase64',
				type: 'string',
				required: true,
				default: '',
				typeOptions: { rows: 3 },
				description: 'Base64-encoded PDF content',
				displayOptions: {
					show: {
						operation: ['extractPdfPages', 'rotatePdf'],
						pdfInputType: ['base64'],
					},
				},
			},

			// Extract pages — page selection
			{
				displayName: 'Pages',
				name: 'pages',
				type: 'string',
				required: true,
				default: '',
				placeholder: '1-3, 5, 7-9',
				description:
					'1-indexed page selection. Examples: "1-3, 5" extracts pages 1,2,3,5. "5,1,3" reorders pages.',
				displayOptions: {
					show: {
						operation: ['extractPdfPages'],
					},
				},
			},

			// Rotate — global rotation or per-page
			{
				displayName: 'Rotation Mode',
				name: 'rotationMode',
				type: 'options',
				default: 'global',
				options: [
					{ name: 'Global Rotation', value: 'global', description: 'Apply the same rotation to every page' },
					{ name: 'Per-Page Rotation', value: 'perPage', description: 'Specify rotation for individual pages as JSON' },
				],
				displayOptions: {
					show: {
						operation: ['rotatePdf'],
					},
				},
			},
			{
				displayName: 'Rotation',
				name: 'rotation',
				type: 'options',
				default: 90,
				options: [
					{ name: '0°', value: 0 },
					{ name: '90° (Clockwise)', value: 90 },
					{ name: '180°', value: 180 },
					{ name: '270° (Counter-Clockwise)', value: 270 },
				],
				displayOptions: {
					show: {
						operation: ['rotatePdf'],
						rotationMode: ['global'],
					},
				},
			},
			{
				displayName: 'Page Rotations',
				name: 'pageRotations',
				type: 'json',
				default: '{"1": 90, "2": 180}',
				description:
					'Map of 1-indexed page numbers to rotation in degrees (0/90/180/270). Example: {"1": 90, "3": 180}.',
				displayOptions: {
					show: {
						operation: ['rotatePdf'],
						rotationMode: ['perPage'],
					},
				},
			},

			// PDF Tools shared options
			{
				displayName: 'Options',
				name: 'pdfToolsOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: PDF_TOOL_OPS,
					},
				},
				options: [
					{
						displayName: 'Expiration (Seconds)',
						name: 'expiration',
						type: 'number',
						default: 86400,
						description: 'How long the resulting PDF URL stays valid. Range: 60-604800 seconds.',
						typeOptions: {
							minValue: 60,
							maxValue: 604800,
						},
					},
					{
						displayName: 'Filename',
						name: 'filename',
						type: 'string',
						default: '',
						description: 'Custom filename for the resulting PDF (without .pdf extension)',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await templateFoxApiRequest.call(this, 'GET', '/v1/templates');

				if (!response?.templates) {
					return [];
				}

				return response.templates.map((template: { id: string; name: string }) => ({
					name: template.name,
					value: template.id,
				}));
			},

			async getTemplateVersions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const draftOption: INodePropertyOptions = {
					name: 'Draft (Live Editor)',
					value: '',
				};

				const templateId = this.getCurrentNodeParameter('templateId') as string;
				if (!templateId) {
					return [draftOption];
				}

				try {
					const response = await templateFoxApiRequest.call(
						this,
						'GET',
						`/v1/templates/${templateId}/versions`,
					);
					const versions = (response?.versions || []) as Array<{
						version_number: number;
						tag: string | null;
					}>;
					const tagged = versions.map((v) => ({
						name: v.tag ? `${v.tag} (v${v.version_number})` : `v${v.version_number}`,
						value: v.tag || String(v.version_number),
					}));
					return [draftOption, ...tagged];
				} catch {
					return [draftOption];
				}
			},
		},

		resourceMapping: {
			async getTemplateFieldsMapping(
				this: ILoadOptionsFunctions,
			): Promise<ResourceMapperFields> {
				const templateId = this.getNodeParameter('templateId', 0) as string;

				if (!templateId) {
					return { fields: [] };
				}

				try {
					const response = await templateFoxApiRequest.call(
						this,
						'GET',
						`/v1/templates/${templateId}/fields`,
					);

					if (!Array.isArray(response)) {
						return { fields: [] };
					}

					const fields: ResourceMapperField[] = response.map((field: TemplateField) => {
						let fieldType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'dateTime' | 'time' | 'options' = 'string';
						if (field.type === 'number' || field.type === 'integer') {
							fieldType = 'number';
						} else if (field.type === 'boolean') {
							fieldType = 'boolean';
						} else if (field.type === 'array') {
							fieldType = 'string';
						} else if (field.type === 'object') {
							fieldType = 'string';
						}

						let description = `Type: ${field.type}`;
						if (field.type === 'array' && field.spec) {
							const specArray = Array.isArray(field.spec) ? field.spec : [field.spec];
							const specFields = specArray.map((s) => s.name).join(', ');
							description = `Array with properties: ${specFields}. Enter as JSON array.`;
						}
						if (field.helpText) {
							description = field.helpText;
						}

						return {
							id: field.key,
							displayName: field.label || field.key,
							required: field.required || false,
							defaultMatch: false,
							canBeUsedToMatch: false,
							display: true,
							type: fieldType,
							removed: false,
							description,
						} as ResourceMapperField;
					});

					return { fields };
				} catch (error) {
					return { fields: [] };
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				let response: IDataObject | IDataObject[] | undefined;

				if (operation === 'generatePdf' || operation === 'generatePdfAsync') {
					const body = buildGeneratePdfBody.call(this, i);

					if (operation === 'generatePdfAsync') {
						const webhook = this.getNodeParameter('webhook', i, {}) as {
							webhookUrl?: string;
							webhookSecret?: string;
						};
						if (webhook.webhookUrl) {
							body.webhook_url = webhook.webhookUrl;
						}
						if (webhook.webhookSecret) {
							body.webhook_secret = webhook.webhookSecret;
						}
						response = (await templateFoxApiRequest.call(
							this,
							'POST',
							'/v1/pdf/create-async',
							body,
						)) as IDataObject;
					} else {
						response = (await templateFoxApiRequest.call(
							this,
							'POST',
							'/v1/pdf/create',
							body,
						)) as IDataObject;
					}
				} else if (operation === 'getPdfJob') {
					const jobId = (this.getNodeParameter('jobId', i) as string).trim();
					if (!jobId) {
						throw new NodeOperationError(this.getNode(), `Job ID is required at item ${i}`);
					}
					response = (await templateFoxApiRequest.call(
						this,
						'GET',
						`/v1/pdf/jobs/${encodeURIComponent(jobId)}`,
					)) as IDataObject;
				} else if (operation === 'listPdfJobs') {
					const filters = this.getNodeParameter('jobsFilters', i, {}) as {
						limit?: number;
						offset?: number;
						status?: string;
					};
					const qs: IDataObject = {};
					if (filters.limit !== undefined) qs.limit = filters.limit;
					if (filters.offset !== undefined) qs.offset = filters.offset;
					if (filters.status) qs.status = filters.status;
					response = (await templateFoxApiRequest.call(
						this,
						'GET',
						'/v1/pdf/jobs',
						undefined,
						qs,
					)) as IDataObject;
				} else if (operation === 'mergePdfs') {
					const collection = this.getNodeParameter('mergePdfs', i, {}) as {
						item?: Array<{ inputType: string; pdfUrl?: string; pdfBase64?: string }>;
					};
					const items = collection.item ?? [];
					if (items.length < 2) {
						throw new NodeOperationError(
							this.getNode(),
							`Merge requires at least 2 PDFs at item ${i} (got ${items.length})`,
						);
					}
					const pdfs = items.map((entry, idx) => buildPdfInput(entry, idx, this.getNode()));
					const opts = this.getNodeParameter('pdfToolsOptions', i, {}) as {
						expiration?: number;
						filename?: string;
					};
					const body: IDataObject = { pdfs, export_type: 'url' };
					if (opts.expiration) body.expiration = opts.expiration;
					if (opts.filename) body.filename = opts.filename;
					response = (await templateFoxApiRequest.call(
						this,
						'POST',
						'/v1/pdf-tools/merge',
						body,
					)) as IDataObject;
				} else if (operation === 'extractPdfPages') {
					const body = buildSinglePdfBody.call(this, i);
					const pages = (this.getNodeParameter('pages', i) as string).trim();
					if (!pages) {
						throw new NodeOperationError(this.getNode(), `Pages selection is required at item ${i}`);
					}
					body.pages = pages;
					response = (await templateFoxApiRequest.call(
						this,
						'POST',
						'/v1/pdf-tools/extract-pages',
						body,
					)) as IDataObject;
				} else if (operation === 'rotatePdf') {
					const body = buildSinglePdfBody.call(this, i);
					const rotationMode = this.getNodeParameter('rotationMode', i) as string;
					if (rotationMode === 'global') {
						body.rotation = this.getNodeParameter('rotation', i) as number;
					} else {
						const raw = this.getNodeParameter('pageRotations', i) as string | IDataObject;
						let parsed: IDataObject;
						if (typeof raw === 'string') {
							try {
								parsed = JSON.parse(raw);
							} catch {
								throw new NodeOperationError(
									this.getNode(),
									`Invalid Page Rotations JSON at item ${i}`,
								);
							}
						} else {
							parsed = raw;
						}
						body.page_rotations = parsed;
					}
					response = (await templateFoxApiRequest.call(
						this,
						'POST',
						'/v1/pdf-tools/rotate',
						body,
					)) as IDataObject;
				} else if (operation === 'getAccount') {
					response = (await templateFoxApiRequest.call(
						this,
						'GET',
						'/v1/account',
					)) as IDataObject;
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
				}

				if (Array.isArray(response)) {
					for (const entry of response) {
						returnData.push({ json: entry, pairedItem: i });
					}
				} else if (response) {
					returnData.push({ json: response, pairedItem: i });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error',
						},
						pairedItem: i,
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

function buildGeneratePdfBody(this: IExecuteFunctions, i: number): IDataObject {
	const templateId = this.getNodeParameter('templateId', i) as string;
	const dataInputMode = this.getNodeParameter('dataInputMode', i) as string;
	const options = this.getNodeParameter('options', i, {}) as {
		expiration?: number;
		filename?: string;
		pdfVariant?: string;
		version?: string;
		storeS3?: boolean;
		s3Filepath?: string;
		s3Bucket?: string;
	};

	let data: Record<string, unknown> = {};

	if (dataInputMode === 'json') {
		const jsonData = this.getNodeParameter('jsonData', i) as string;
		try {
			data = typeof jsonData === 'string' ? JSON.parse(jsonData) : (jsonData as Record<string, unknown>);
		} catch {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid JSON data at item ${i}: Please check your JSON syntax.`,
			);
		}
	} else {
		const templateFields = this.getNodeParameter('templateFields', i) as {
			mappingMode: string;
			value: Record<string, unknown> | null;
		};
		if (templateFields?.value) {
			for (const [key, value] of Object.entries(templateFields.value)) {
				data[key] = parseFieldValue(value);
			}
		}
	}

	const body: IDataObject = {
		template_id: templateId,
		data,
		export_type: 'url',
	};

	if (options.expiration) body.expiration = options.expiration;
	if (options.filename) body.filename = options.filename;
	if (options.pdfVariant) body.pdf_variant = options.pdfVariant;
	if (options.version) body.version = options.version;
	if (options.storeS3) body.store_s3 = true;
	if (options.s3Filepath) body.s3_filepath = options.s3Filepath;
	if (options.s3Bucket) body.s3_bucket = options.s3Bucket;

	return body;
}

function buildSinglePdfBody(this: IExecuteFunctions, i: number): IDataObject {
	const inputType = this.getNodeParameter('pdfInputType', i) as string;
	const opts = this.getNodeParameter('pdfToolsOptions', i, {}) as {
		expiration?: number;
		filename?: string;
	};
	const body: IDataObject = { export_type: 'url' };
	if (inputType === 'url') {
		const pdfUrl = (this.getNodeParameter('pdfUrl', i) as string).trim();
		if (!pdfUrl) {
			throw new NodeOperationError(this.getNode(), `PDF URL is required at item ${i}`);
		}
		body.pdf_url = pdfUrl;
	} else {
		const pdfBase64 = (this.getNodeParameter('pdfBase64', i) as string).trim();
		if (!pdfBase64) {
			throw new NodeOperationError(this.getNode(), `PDF Base64 is required at item ${i}`);
		}
		body.pdf_base64 = pdfBase64;
	}
	if (opts.expiration) body.expiration = opts.expiration;
	if (opts.filename) body.filename = opts.filename;
	return body;
}

function buildPdfInput(
	entry: { inputType: string; pdfUrl?: string; pdfBase64?: string },
	idx: number,
	node: ReturnType<IExecuteFunctions['getNode']>,
): IDataObject {
	if (entry.inputType === 'base64') {
		const value = (entry.pdfBase64 ?? '').trim();
		if (!value) {
			throw new NodeOperationError(node, `PDF #${idx + 1} is missing Base64 content`);
		}
		return { pdf_base64: value };
	}
	const value = (entry.pdfUrl ?? '').trim();
	if (!value) {
		throw new NodeOperationError(node, `PDF #${idx + 1} is missing a URL`);
	}
	return { pdf_url: value };
}
