export class InternalServerError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.name = 'InternalServerError';
    this.httpStatusCode = 500;
  }
}

export class UnauthorizedError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.name = 'UnauthorizedError';
    this.httpStatusCode = 401;
  }
}

export class NotFoundError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.name = 'NotFoundError';
    this.httpStatusCode = 404;
  }
}

export class InvalidParamsError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.name = 'InvalidParamsError';
    this.httpStatusCode = 400;
  }
}

export class InvalidConfigError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.name = 'InvalidConfigError';
    this.httpStatusCode = 500;
  }
}

export class InvalidSchemaError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.name = 'InvalidSchemaError';
    this.httpStatusCode = 400;
  }
}

export class EvaluateSchemaFunctionError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.name = 'EvaluateSchemaFunctionError';
    this.httpStatusCode = 500;
  }
}

export class HTTPRequestError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.name = 'HTTPRequestError';
    this.httpStatusCode = 502;
  }
}

export class HTTPResponseError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.name = 'HTTPResponseError';
    this.httpStatusCode = 502;
  }
}

export class SequelizeDbError extends Error {
  cause: any;
  name: any;

  httpStatusCode: any;

  constructor(error) {
    super(error);
    this.name = 'SequelizeDbError';
    this.cause = error;
    this.httpStatusCode = 500;
  }
}

export class ForbiddenError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.httpStatusCode = 403;
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends Error {
  name: any;

  httpStatusCode: any;

  constructor(...params) {
    super(...params);
    this.httpStatusCode = 400;
    this.name = 'BadRequestError';
  }
}
