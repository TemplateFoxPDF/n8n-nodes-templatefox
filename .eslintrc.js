module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	plugins: ['@typescript-eslint', 'n8n-nodes-base'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:n8n-nodes-base/community',
	],
	env: {
		node: true,
	},
	rules: {
		'@typescript-eslint/no-explicit-any': 'off',
		'n8n-nodes-base/node-param-description-missing-final-period': 'off',
	},
	ignorePatterns: ['dist/**', 'node_modules/**', 'gulpfile.js'],
};
