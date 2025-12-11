const CliMigrateHandler = require('./migrate');
const CliSeparateHandler = require('./separate');

const handlers = {
  migrate: new CliMigrateHandler(),
  separate: new CliSeparateHandler(),
};

module.exports = {
  getHandler: (name) => handlers[name],
};
