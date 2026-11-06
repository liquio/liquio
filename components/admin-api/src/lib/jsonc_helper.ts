import { parse, printParseErrorCode } from 'jsonc-parser';

import { BadRequestError } from './errors';

/**
 * Validate JSON schema.
 * @param {string} jsonString JSON schema.
 * @returns {void}
 */
export function validateJSONCSchema(jsonString) {
  try {
    const errors = [];
    parse(jsonString, errors, {
      allowTrailingComma: true,
    });

    if (errors?.length > 0) {
      const errorMessages = errors
        .map((e) => ({ error: printParseErrorCode(e.error), offset: e.offset }))
        .map(({ error, offset }) => `${error} at ${offset}`)
        .join(', ');
      throw new BadRequestError('Invalid JSON schema: ' + errorMessages);
    }
  } catch (error) {
    throw new BadRequestError(error.message || error.toString());
  }
}

/**
 * Parse JSON schema.
 * @param {string} jsonString JSON schema.
 * @returns {object}
 */
export function parseJSONCSchema(jsonString) {
  try {
    return parse(jsonString);
  } catch {
    return {};
  }
}
