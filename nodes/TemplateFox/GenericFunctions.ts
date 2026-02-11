import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	IDataObject,
} from 'n8n-workflow';

const API_BASE_URL = 'https://api.pdftemplateapi.com';

/**
 * Make an authenticated API request to TemplateFox
 */
export async function templateFoxApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	query?: IDataObject,
): Promise<any> {
	const options: IRequestOptions = {
		method,
		url: `${API_BASE_URL}${endpoint}`,
		json: true,
	};

	if (body) {
		options.body = body;
	}

	if (query) {
		options.qs = query;
	}

	return this.helpers.requestWithAuthentication.call(this, 'templateFoxApi', options);
}

/**
 * Map API field types to n8n field types
 */
export function mapFieldType(apiType: string): string {
	const typeMap: Record<string, string> = {
		string: 'string',
		text: 'string',
		integer: 'number',
		number: 'number',
		boolean: 'boolean',
	};
	return typeMap[apiType] || 'string';
}

/**
 * Parse field values, handling JSON for arrays/objects
 */
export function parseFieldValue(value: unknown): unknown {
	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		// Try to parse JSON arrays and objects
		if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
			try {
				return JSON.parse(trimmed);
			} catch {
				// Not valid JSON, return as string
				return value;
			}
		}
	}

	return value;
}
