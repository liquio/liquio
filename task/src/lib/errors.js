module.exports.InternalServerError = class InternalServerError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InternalServerError';
    this.httpStatusCode = 500;
  }
};

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

module.exports.InvalidParamsError = class InvalidParamsError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InvalidParamsError';
    this.httpStatusCode = 400;
  }
};

module.exports.InvalidConfigError = class InvalidConfigError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InvalidConfigError';
    this.httpStatusCode = 500;
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

module.exports.SequelizeDbError = class SequelizeDbError extends Error {
  constructor(error) {
    super(error);
    this.name = 'SequelizeDbError';
    this.cause = error;
    this.httpStatusCode = 500;
  }
};

module.exports.ForbiddenError = class ForbiddenError extends Error {
  constructor(...params) {
    super(...params);
    this.httpStatusCode = 403;
    this.name = 'ForbiddenError';
  }
};

module.exports.BadRequestError = class BadRequestError extends Error {
  constructor(...params) {
    super(...params);
    this.httpStatusCode = 400;
    this.name = 'BadRequestError';
  }
};
