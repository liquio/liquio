const { setupLogging, getTraceIdsForRequest, log, debug } = require('./debug');
const { ensureAtLoginPage, loginWithPersonalKey } = require('./auth');
const { importRegister } = require('./register');
const { importWorkflow } = require('./workflow');
const { generateTestUser } = require('./user');
const { getConfirmationPinFromDockerLogs, getDockerComposeLogs } = require('./docker');
const { createCabinetApi } = require('./cabinet_api');

module.exports = {
  // Debug helpers
  setupLogging,
  getTraceIdsForRequest,
  log,
  debug,

  // Auth helpers
  ensureAtLoginPage,
  loginWithPersonalKey,

  // Register helpers
  importRegister,

  // Workflow helpers
  importWorkflow,

  // User helpers
  generateTestUser,

  // Docker helpers
  getConfirmationPinFromDockerLogs,
  getDockerComposeLogs,

  // Cabinet API helpers
  createCabinetApi,
};
