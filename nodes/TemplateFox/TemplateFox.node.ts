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

import { templateFoxApiRequest, parseFieldValue } from './GenericFunctions';

interface TemplateField {
	key: string;
	label: string;
	type: string;
	required?: boolean;
	helpText?: string;
	spec?: Array<{ name: string; label: string; type: string }> | { name: string; label: string; type: string };
}

export class TemplateFox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TemplateFox',
		name: 'templateFox',
		icon: 'file:templatefox.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Generate PDFs from templates using TemplateFox API',
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
			// Operation selector
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generate PDF',
						value: 'generatePdf',
						description: 'Generate a PDF from a template',
						action: 'Generate a PDF from a template',
					},
				],
				default: 'generatePdf',
			},
			// Template selector with dynamic dropdown
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
						operation: ['generatePdf'],
					},
				},
			},
			// Data input mode selector
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
						operation: ['generatePdf'],
					},
				},
			},
			// Dynamic template fields using resourceMapping (shown when mode is 'fields')
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
						operation: ['generatePdf'],
						dataInputMode: ['fields'],
					},
				},
			},
			// JSON payload (shown when mode is 'json')
			{
				displayName: 'JSON Data',
				name: 'jsonData',
				type: 'json',
				default: '{}',
				description:
					'JSON data for template variables. Example: {"name": "John Doe", "items": [{"product": "Widget", "qty": 2}]}',
				displayOptions: {
					show: {
						operation: ['generatePdf'],
						dataInputMode: ['json'],
					},
				},
			},
			// Options collection
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['generatePdf'],
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
				],
			},
		],
	};

	methods = {
		loadOptions: {
			/**
			 * Fetch available templates for dropdown
			 */
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
		},

		resourceMapping: {
			/**
			 * Fetch template fields for dynamic resource mapping
			 */
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
						// Map API field type to n8n field type
						let fieldType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'dateTime' | 'time' | 'options' = 'string';
						if (field.type === 'number' || field.type === 'integer') {
							fieldType = 'number';
						} else if (field.type === 'boolean') {
							fieldType = 'boolean';
						} else if (field.type === 'array') {
							fieldType = 'string'; // Arrays will be entered as JSON strings
						} else if (field.type === 'object') {
							fieldType = 'string'; // Objects will be entered as JSON strings
						}

						// Build description with type info
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
						} as ResourceMapperField;
					});

					return { fields };
				} catch (error) {
					// Return empty fields if API call fails
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

				if (operation === 'generatePdf') {
					const templateId = this.getNodeParameter('templateId', i) as string;
					const dataInputMode = this.getNodeParameter('dataInputMode', i) as string;
					const options = this.getNodeParameter('options', i, {}) as {
						expiration?: number;
						filename?: string;
					};

					// Build data object based on input mode
					let data: Record<string, unknown> = {};

					if (dataInputMode === 'json') {
						const jsonData = this.getNodeParameter('jsonData', i) as string;
						try {
							data = JSON.parse(jsonData);
						} catch {
							throw new Error(
								`Invalid JSON data at item ${i}: Please check your JSON syntax.`,
							);
						}
					} else {
						// Fields mode - get data from resource mapper
						const templateFields = this.getNodeParameter('templateFields', i) as {
							mappingMode: string;
							value: Record<string, unknown> | null;
						};

						if (templateFields?.value) {
							// Process each field value
							for (const [key, value] of Object.entries(templateFields.value)) {
								data[key] = parseFieldValue(value);
							}
						}
					}

					// Build request body
					const body: IDataObject = {
						template_id: templateId,
						data,
						export_type: 'url',
					};

					// Add optional parameters
					if (options.expiration) {
						body.expiration = options.expiration;
					}

					if (options.filename) {
						body.filename = options.filename;
					}

					// Make API request
					const response = await templateFoxApiRequest.call(this, 'POST', '/v1/pdf/create', body);

					returnData.push({
						json: {
							url: response.url,
							filename: response.filename,
							credits_remaining: response.credits_remaining,
							expires_in: response.expires_in,
						},
						pairedItem: i,
					});
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
