class ErrorWithHttpStatusCode extends Error {
  public httpStatusCode: number;
  public cause?: any;

  constructor(...params: any) {
    super(...params);
    this.name = 'ErrorWithHttpStatusCode';
    this.httpStatusCode = 500;
  }
}

export class UnauthorizedError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'UnauthorizedError';
    this.httpStatusCode = 401;
  }
}

export class NotFoundError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'NotFoundError';
    this.httpStatusCode = 404;
  }
}

export class InternalServerError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'InternalServerError';
    this.httpStatusCode = 500;
  }
}

export class InvalidParamsError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'InvalidParamsError';
    this.httpStatusCode = 400;
  }
}

export class InvalidSchemaError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'InvalidSchemaError';
    this.httpStatusCode = 400;
  }
}

export class EvaluateSchemaFunctionError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'EvaluateSchemaFunctionError';
    this.httpStatusCode = 500;
  }
}

export class SequelizeDbError extends ErrorWithHttpStatusCode {
  constructor(error: string) {
    super(error);
    this.name = SequelizeDbError.name;
    this.cause = error;
    this.httpStatusCode = 500;
  }
}

export class SequelizeUniqueConstraintError extends ErrorWithHttpStatusCode {
  constructor(error: string) {
    super(error);
    this.name = SequelizeUniqueConstraintError.name;
    this.cause = error;
    this.httpStatusCode = 500;
  }
}

export class HTTPRequestError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'HTTPRequestError';
    this.httpStatusCode = 502;
  }
}

export class HTTPResponseError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'HTTPResponseError';
    this.httpStatusCode = 502;
  }
}

export class BadRequestError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'BadRequestError';
    this.httpStatusCode = 400;
  }
}

export class ForbiddenError extends ErrorWithHttpStatusCode {
  constructor(...params: any) {
    super(...params);
    this.name = 'ForbiddenError';
    this.httpStatusCode = 403;
  }
}

export const Errors: Readonly<{ [key: string]: typeof ErrorWithHttpStatusCode }> = {
  UnauthorizedError,
  NotFoundError,
  InternalServerError,
  InvalidParamsError,
  InvalidSchemaError,
  EvaluateSchemaFunctionError,
  SequelizeDbError,
  SequelizeUniqueConstraintError,
  HTTPRequestError,
  HTTPResponseError,
  BadRequestError,
  ForbiddenError,
};
