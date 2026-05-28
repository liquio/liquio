// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  workers: 1,
  timeout: 60000,
});
