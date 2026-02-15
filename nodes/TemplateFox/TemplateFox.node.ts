import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
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
			// Dynamic template fields (shown when mode is 'fields')
			{
				displayName: 'Template Data',
				name: 'templateData',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Field',
				description: 'Data fields for the template. Select a template first to see available fields.',
				displayOptions: {
					show: {
						operation: ['generatePdf'],
						dataInputMode: ['fields'],
					},
				},
				options: [
					{
						displayName: 'Field',
						name: 'field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'fieldName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getTemplateFields',
									loadOptionsDependsOn: ['templateId'],
								},
								default: '',
								description:
									'The field name from the template. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
								description:
									'The value for this field. For arrays, enter valid JSON (e.g., [{"name": "Item 1", "qty": 2}]).',
							},
						],
					},
				],
			},
			// Array Items section for line items (shown when mode is 'fields')
			{
				displayName: 'Array Items',
				name: 'arrayItems',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Array Item',
				description: 'Add items for array fields (like line items). Each item becomes an object in the array.',
				displayOptions: {
					show: {
						operation: ['generatePdf'],
						dataInputMode: ['fields'],
					},
				},
				options: [
					{
						displayName: 'Item',
						name: 'item',
						values: [
							{
								displayName: 'Array Field Name or ID',
								name: 'arrayFieldName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getArrayFields',
									loadOptionsDependsOn: ['templateId'],
								},
								default: '',
								description:
									'The array field to add this item to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Item Properties',
								name: 'itemProperties',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								placeholder: 'Add Property',
								options: [
									{
										displayName: 'Property',
										name: 'property',
										values: [
											{
												displayName: 'Property Name',
												name: 'propertyName',
												type: 'string',
												default: '',
												description: 'The property name (e.g., "description", "quantity", "price")',
											},
											{
												displayName: 'Property Value',
												name: 'propertyValue',
												type: 'string',
												default: '',
												description: 'The property value',
											},
										],
									},
								],
							},
						],
					},
				],
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

			/**
			 * Fetch template fields for dynamic field selection
			 */
			async getTemplateFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const templateId = this.getCurrentNodeParameter('templateId') as string;

				if (!templateId) {
					return [];
				}

				const response = await templateFoxApiRequest.call(
					this,
					'GET',
					`/v1/templates/${templateId}/fields`,
				);

				if (!Array.isArray(response)) {
					return [];
				}

				return response.map((field: TemplateField) => {
					let description = `Type: ${field.type}`;

					// For array fields, show the expected structure
					if (field.type === 'array' && field.spec) {
						const specArray = Array.isArray(field.spec) ? field.spec : [field.spec];
						const specFields = specArray.map((s) => `${s.name}: ${s.type}`).join(', ');
						description = `Array of objects with: {${specFields}}. Enter as JSON array.`;
					}

					return {
						name: `${field.label} (${field.type})`,
						value: field.key,
						description,
					};
				});
			},

			/**
			 * Fetch only array fields for the Array Items section
			 */
			async getArrayFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const templateId = this.getCurrentNodeParameter('templateId') as string;

				if (!templateId) {
					return [];
				}

				const response = await templateFoxApiRequest.call(
					this,
					'GET',
					`/v1/templates/${templateId}/fields`,
				);

				if (!Array.isArray(response)) {
					return [];
				}

				// Filter to only array fields
				const arrayFields = response.filter((field: TemplateField) => field.type === 'array');

				return arrayFields.map((field: TemplateField) => {
					let description = 'Array field';

					if (field.spec) {
						const specArray = Array.isArray(field.spec) ? field.spec : [field.spec];
						const specFields = specArray.map((s) => s.name).join(', ');
						description = `Properties: ${specFields}`;
					}

					return {
						name: field.label,
						value: field.key,
						description,
					};
				});
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
						// Fields mode - collect simple fields
						const templateData = this.getNodeParameter('templateData', i, {}) as {
							field?: Array<{ fieldName: string; fieldValue: string }>;
						};

						if (templateData.field) {
							for (const field of templateData.field) {
								if (field.fieldName) {
									data[field.fieldName] = parseFieldValue(field.fieldValue);
								}
							}
						}

						// Collect array items
						const arrayItems = this.getNodeParameter('arrayItems', i, {}) as {
							item?: Array<{
								arrayFieldName: string;
								itemProperties: {
									property?: Array<{ propertyName: string; propertyValue: string }>;
								};
							}>;
						};

						if (arrayItems.item) {
							for (const item of arrayItems.item) {
								if (item.arrayFieldName) {
									// Initialize array if not exists
									if (!data[item.arrayFieldName]) {
										data[item.arrayFieldName] = [];
									}

									// Build item object from properties
									const itemObj: Record<string, unknown> = {};
									if (item.itemProperties?.property) {
										for (const prop of item.itemProperties.property) {
											if (prop.propertyName) {
												itemObj[prop.propertyName] = parseFieldValue(prop.propertyValue);
											}
										}
									}

									// Add to array
									(data[item.arrayFieldName] as unknown[]).push(itemObj);
								}
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
