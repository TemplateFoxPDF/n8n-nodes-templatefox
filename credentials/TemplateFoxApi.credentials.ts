import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TemplateFoxApi implements ICredentialType {
	name = 'templateFoxApi';
	displayName = 'TemplateFox API';
	documentationUrl = 'https://pdftemplateapi.com/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your TemplateFox API key. Get it from <a href="https://pdftemplateapi.com/dashboard/api" target="_blank">your dashboard</a>.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.pdftemplateapi.com',
			url: '/v1/account',
			method: 'GET',
		},
	};
}
