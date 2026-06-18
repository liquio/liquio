import jsoncParser from 'jsonc-parser';

import { BadRequestError } from './errors';

/**
 * Validate JSON schema.
 * @param {string} jsonString JSON schema.
 * @returns {void}
 */
export function validateJSONCSchema(jsonString) {
  try {
    const errors = [];
    jsoncParser.parse(jsonString, errors, {
      allowTrailingComma: true,
    });

    if (errors?.length > 0) {
      throw new BadRequestError('Invalid JSON schema: ' + errors.map((e) => `${jsoncParser.ParseErrorCode[e.error]} at ${e.offset}`).join(', '));
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
    return jsoncParser.parse(jsonString);
  } catch {
    return {};
  }
}