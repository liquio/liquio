const globals = require('globals');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

const styleRules = {
  ...prettierConfig.rules,
  'prettier/prettier': 'error',
  'no-console': 'off',
  'no-var': 'error',
};

module.exports = [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'data/'] },
  js.configs.recommended,
  {
    files: ['eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    plugins: { prettier: prettierPlugin },
    rules: {
      ...styleRules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.ts'] })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: { prettier: prettierPlugin },
    rules: {
      ...styleRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
