/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const testMatch = ['**/*.spec.ts'];
export const verbose = true;
export const testPathIgnorePatterns = ['/dist/', '/node_modules/'];
export const modulePathIgnorePatterns = ['<rootDir>/dist/'];
export const watchPathIgnorePatterns = ['<rootDir>/dist/'];
