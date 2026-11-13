import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';

const importOrderRule = [
  'error',
  {
    groups: ['builtin', 'external', ['internal', 'parent', 'sibling', 'index']],
    'newlines-between': 'always',
  },
];

// never log config objects/subtrees. Individual non-secret scalars (`{ host: config.db.host }`) are allowed.
const LOG_CALL = 'CallExpression[callee.property.name=/^(save|info|warn|error|debug|log|verbose)$/]';
const GLOBAL_CONFIG = "MemberExpression[object.name='global'][property.name=/^(config|conf)$/]";
const THIS_CONFIG = "MemberExpression[object.type='ThisExpression'][property.name='config']";
const CONFIG_IDENT = 'Identifier[name=/^(config|cfg|conf)$|Config$/]';
const noConfigInLogs = [GLOBAL_CONFIG, THIS_CONFIG, CONFIG_IDENT].flatMap((node) => [
  { selector: `${LOG_CALL} > ${node}`, message: 'Do not pass a config object to a log call.' },
  {
    selector: `${LOG_CALL} Property > ${node}:not(Property > .key)`,
    message: 'Do not log a config object or subtree. Log individual non-secret values.',
  },
  { selector: `${LOG_CALL} SpreadElement > ${node}`, message: 'Do not spread a config object into a log payload.' },
]);

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: 'tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: prettierPlugin,
      'import-x': importX,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import-x/order': importOrderRule,
      'no-restricted-syntax': ['error', ...noConfigInLogs],
    },
  },
  {
    ignores: ['jest.e2e.config.js', 'coverage/**', 'dist/**', 'lib/**/*.js'],
  },
];
