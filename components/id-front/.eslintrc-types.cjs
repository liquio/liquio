const fs = require('node:fs');
const base = JSON.parse(fs.readFileSync(`${__dirname}/.eslintrc`, 'utf8'));
const { files, ...typed } = base.overrides[0];
module.exports = {
  ...base,
  ...typed,
  overrides: [],
  plugins: [...base.plugins, ...typed.plugins],
  parserOptions: { ...base.parserOptions, ...typed.parserOptions },
  rules: { ...base.rules, ...typed.rules }
};
