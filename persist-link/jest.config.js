/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
export const preset = 'ts-jest/presets/js-with-ts';
export const bail = true;
export const testEnvironment = 'node';
export const testMatch = ['**/__tests__/**/*.+(spec|e2e.spec).[tj]s?(x)', '**/(*.)+(spec|test).[tj]s?(x)'];
export const verbose = true;
export const testPathIgnorePatterns = ['/dist/', '/node_modules/', '/src/controllers/test.ts'];
