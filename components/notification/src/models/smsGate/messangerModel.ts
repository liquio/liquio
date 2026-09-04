'use strict';

import { CustomGate } from './customGate';
import { CorezoidGate } from './corezoidModel';

// Read config.
const { conf } = global as any;

// Constants.
const GATES_MAP: Record<string, any> = {
  custom: CustomGate,
  testConsoleSmsAdapter: CustomGate,
  default: CustomGate,
};
const DEFAULT_GATE = 'default';

// Define model.
const gateName = conf.defaultMessenger || DEFAULT_GATE;
console.log(`Gate initialized: "${gateName}".`);
const model = GATES_MAP[gateName];

export const MessangerModel = model;
export { CorezoidGate };
