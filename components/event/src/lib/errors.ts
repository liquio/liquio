export class AccessError extends Error {
  constructor(...params: any[]) {
    super(...(params as [string]));
    this.name = 'AccessError';
  }
}

export class NotFoundError extends Error {
  httpStatusCode: number;

  constructor(...params: any[]) {
    super(...(params as [string]));
    this.httpStatusCode = 404;
    this.name = 'NotFoundError';
  }
}

export class InvalidParamsError extends Error {
  constructor(...params: any[]) {
    super(...(params as [string]));
    this.name = 'InvalidParamsError';
  }
}

export class InvalidConfigError extends Error {
  constructor(...params: any[]) {
    super(...(params as [string]));
    this.name = 'InvalidConfigError';
  }
}

export class InternalServerError extends Error {
  constructor(...params: any[]) {
    super(...(params as [string]));
    this.name = 'InternalServerError';
  }
}

export class InvalidSchemaError extends Error {
  constructor(...params: any[]) {
    super(...(params as [string]));
    this.name = 'InvalidSchemaError';
  }
}

export class EvaluateSchemaFunctionError extends Error {
  constructor(...params: any[]) {
    super(...(params as [string]));
    this.name = 'EvaluateSchemaFunctionError';
  }
}

export class SequelizeDbError extends Error {
  cause: any;

  constructor(error: any) {
    super(error);
    this.name = 'SequelizeDbError';
    this.cause = error;
  }
}

export class HTTPRequestError extends Error {
  constructor(...params: any[]) {
    super(...(params as [string]));
    this.name = 'HTTPRequestError';
  }
}

export class HTTPResponseError extends Error {
  constructor(...params: any[]) {
    super(...(params as [string]));
    this.name = 'HTTPResponseError';
  }
}

export class ExternalServiceError extends Error {
  constructor(...params: any[]) {
    super(...(params as [string]));
    this.name = 'ExternalServiceError';
  }
}

export class BadRequestError extends Error {
  httpStatusCode: number;

  constructor(...params: any[]) {
    super(...(params as [string]));
    this.httpStatusCode = 400;
    this.name = 'BadRequestError';
  }
}

export class TimeoutError extends Error {
  httpStatusCode: number;

  constructor(...params: any[]) {
    super(...(params as [string]));
    this.httpStatusCode = 408;
    this.name = 'TimeoutError';
  }
}
