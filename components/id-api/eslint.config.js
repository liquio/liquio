import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import { builtinModules } from 'node:module';

// Bare names of Node built-ins (`fs`, `fs/promises`, …); `_`-internals and `node:`-only modules excluded.
const NODE_BUILTINS = builtinModules.filter((name) => !name.startsWith('_') && !name.startsWith('node:'));
const NODE_BUILTIN_RE = `/^(?:${NODE_BUILTINS.map((name) => name.replace(/\//g, '\\/')).join('|')})$/`;
const NODE_PROTOCOL_MESSAGE = "Import Node built-in modules with the 'node:' prefix.";

const nodeProtocolRules = {
  'no-restricted-imports': ['error', { paths: NODE_BUILTINS.map((name) => ({ name, message: NODE_PROTOCOL_MESSAGE })) }],
  'no-restricted-syntax': [
    'error',
    { selector: `CallExpression[callee.name='require'][arguments.0.value=${NODE_BUILTIN_RE}]`, message: NODE_PROTOCOL_MESSAGE },
    { selector: `ImportExpression[source.value=${NODE_BUILTIN_RE}]`, message: NODE_PROTOCOL_MESSAGE },
    {
      selector: `CallExpression[callee.object.name='jest'][callee.property.name=/^(?:mock|doMock|unmock|requireActual|requireMock|createMockFromModule)$/][arguments.0.value=${NODE_BUILTIN_RE}]`,
      message: NODE_PROTOCOL_MESSAGE,
    },
  ],
};

const importOrderRule = [
  'error',
  {
    groups: ['builtin', 'external', ['internal', 'parent', 'sibling', 'index']],
    'newlines-between': 'always',
  },
];

export default [
  {
    files: ['**/*.ts', '**/*.js'],
    ignores: ['tests/**', '**/*.spec.ts', '**/*.e2e-spec.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
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
      ...nodeProtocolRules,
    },
  },
  {
    files: ['tests/**/*.ts', '**/*.spec.ts', '**/*.e2e-spec.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
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
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import-x/order': importOrderRule,
      ...nodeProtocolRules,
    },
  },
  {
    ignores: ['coverage/**', 'dist/**', 'lib/**/*.js', 'migrations/**', 'eslint.config.js', 'jest.config.js', 'jest.e2e.config.js', 'migrations-config.js', 'node_modules/**'],
  },
];
