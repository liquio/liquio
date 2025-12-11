module.exports.UnauthorizedError = class UnauthorizedError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'UnauthorizedError';
    this.httpStatusCode = 401;
  }
};

module.exports.NotFoundError = class NotFoundError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'NotFoundError';
    this.httpStatusCode = 404;
  }
};

module.exports.InternalServerError = class InternalServerError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InternalServerError';
    this.httpStatusCode = 500;
  }
};

module.exports.InvalidParamsError = class InvalidParamsError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InvalidParamsError';
    this.httpStatusCode = 400;
  }
};

module.exports.InvalidSchemaError = class InvalidSchemaError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InvalidSchemaError';
    this.httpStatusCode = 400;
  }
};

module.exports.EvaluateSchemaFunctionError = class EvaluateSchemaFunctionError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'EvaluateSchemaFunctionError';
    this.httpStatusCode = 500;
  }
};

module.exports.SequelizeDbError = class SequelizeDbError extends Error {
  constructor(error) {
    super(error);
    this.name = SequelizeDbError.name;
    this.cause = error;
    this.httpStatusCode = 500;
  }
  static get name() {
    return 'SequelizeDbError';
  }
};

module.exports.SequelizeUniqueConstraintError = class SequelizeUniqueConstraintError extends Error {
  constructor(error) {
    super(error);
    this.name = SequelizeUniqueConstraintError.name;
    this.fields = error.fields;
    this.cause = error;
    this.httpStatusCode = 500;
  }
  static get name() {
    return 'SequelizeUniqueConstraintError';
  }
};

module.exports.HTTPRequestError = class HTTPRequestError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'HTTPRequestError';
    this.httpStatusCode = 502;
  }
};

module.exports.HTTPResponseError = class HTTPResponseError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'HTTPResponseError';
    this.httpStatusCode = 502;
  }
};

module.exports.BadRequestError = class BadRequestError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'BadRequestError';
    this.httpStatusCode = 400;
  }
};

module.exports.ForbiddenError = class ForbiddenError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'ForbiddenError';
    this.httpStatusCode = 403;
  }
};

module.exports.export = function () {
  global.NotFoundError = module.exports.NotFoundError;
  global.InvalidParamsError = module.exports.InvalidParamsError;
  global.InternalServerError = module.exports.InternalServerError;
  global.InvalidSchemaError = module.exports.InvalidSchemaError;
  global.EvaluateSchemaFunctionError = module.exports.EvaluateSchemaFunctionError;
  global.SequelizeDbError = module.exports.SequelizeDbError;
  global.SequelizeUniqueConstraintError = module.exports.SequelizeUniqueConstraintError;
  global.HTTPRequestError = module.exports.HTTPRequestError;
  global.HTTPResponseError = module.exports.HTTPResponseError;
};
