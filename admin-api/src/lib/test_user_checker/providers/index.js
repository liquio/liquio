const CheckTestIssuerEdsProvider = require('./eds');
const CheckTestIssuerGovidProvider = require('./govid');
const CheckTestIssuerLocalProvider = require('./local');

module.exports = [
  new CheckTestIssuerEdsProvider(),
  new CheckTestIssuerGovidProvider(),
  new CheckTestIssuerLocalProvider(),
];
