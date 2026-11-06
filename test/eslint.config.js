const globals = require('globals');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

const styleRules = {
  'max-len': [
    'error',
    {
      code: 150,
      ignoreComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    },
  ],
  indent: ['error', 2, { SwitchCase: 1 }],
  'linebreak-style': ['error', 'unix'],
  'eol-last': ['error', 'always'],
  quotes: ['warn', 'single'],
  semi: ['error', 'always'],
  'no-console': 'off',
  'no-var': 'error',
  'brace-style': ['error', '1tbs', { allowSingleLine: true }],
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
    rules: {
      ...styleRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
