const NotFoundError = require('./not_found');
const AccessError = require('./access');
const CommittedError = require('./committed');
const WorkflowError = require('./workflow');
const UnitError = require('./unit');

const Exceptions = {
  NOT_FOUND: NotFoundError,
  ACCESS: AccessError,
  COMMITED: CommittedError,
  WORKFLOW: WorkflowError,
  UNIT: UnitError,
};

module.exports = Exceptions;
