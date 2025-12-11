const globals = require('globals');
const js = require('@eslint/js');
const jsdoc = require('eslint-plugin-jsdoc');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
        config: 'readonly',
        db: 'readonly',
        log: 'readonly',
        models: 'readonly',
        businesses: 'readonly'
      },
    },
    plugins: { jsdoc: jsdoc },
    rules: {
      'max-len': [
        'error',
        {
          code: 150,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      indent: [
        'error',
        2,
        {
          SwitchCase: 1,
        },
      ],
      'linebreak-style': ['error', 'unix'],
      'eol-last': ['error', 'always'],
      quotes: ['warn', 'single'],
      semi: ['error', 'always'],
      'no-console': 'off',
      'no-var': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
