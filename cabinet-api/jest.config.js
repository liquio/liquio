/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.{spec,test}.[jt]s?(x)',
    '**/*.{spec,test}.[tj]s?(x)'
  ],
  // Exclude non-test files named test.js
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/controllers/test.js'
  ],
};

module.exports = config;
