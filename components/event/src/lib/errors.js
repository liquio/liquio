module.exports.AccessError = class AccessError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'AccessError';
  }
};

module.exports.NotFoundError = class NotFoundError extends Error {
  constructor(...params) {
    super(...params);
    this.httpStatusCode = 404;
    this.name = 'NotFoundError';
  }
};

module.exports.InvalidParamsError = class InvalidParamsError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InvalidParamsError';
  }
};

module.exports.InvalidConfigError = class InvalidConfigError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InvalidConfigError';
  }
};

module.exports.InternalServerError = class InternalServerError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InternalServerError';
  }
};

module.exports.InvalidSchemaError = class InvalidSchemaError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'InvalidSchemaError';
  }
};

module.exports.EvaluateSchemaFunctionError = class EvaluateSchemaFunctionError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'EvaluateSchemaFunctionError';
  }
};

module.exports.SequelizeDbError = class SequelizeDbError extends Error {
  constructor(error) {
    super(error);
    this.name = 'SequelizeDbError';
    this.cause = error;
  }
};

module.exports.HTTPRequestError = class HTTPRequestError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'HTTPRequestError';
  }
};

module.exports.HTTPResponseError = class HTTPResponseError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'HTTPResponseError';
  }
};

module.exports.ExternalServiceError = class ExternalServiceError extends Error {
  constructor(...params) {
    super(...params);
    this.name = 'ExternalServiceError';
  }
};

module.exports.BadRequestError = class BadRequestError extends Error {
  constructor(...params) {
    super(...params);
    this.httpStatusCode = 400;
    this.name = 'BadRequestError';
  }
};

module.exports.TimeoutError = class TimeoutError extends Error {
  constructor(...params) {
    super(...params);
    this.httpStatusCode = 408;
    this.name = 'TimeoutError';
  }
};
