'use strict';

// Read config.
let { conf } = global;

const CustomGate = require('./customGate');
const CorezoidGate = require('./corezoidModel');

// Constants.
const GATES_MAP = {
  custom: CustomGate,
  testConsoleSmsAdapter: CustomGate,
  default: CustomGate,
};
const DEFAULT_GATE = 'default';

// Define model.
const gateName = conf.defaultMessenger || DEFAULT_GATE;
console.log(`Gate initialized: "${gateName}".`);
const model = GATES_MAP[gateName];

const MessangerModel = model;

module.exports = { MessangerModel, CorezoidGate };
