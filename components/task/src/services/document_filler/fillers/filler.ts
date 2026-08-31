import PropByPath from 'prop-by-path';

import { DocumentHandler } from '../../../lib/document_handler';
import { Sandbox } from '@liquio/back-core';

// Constants.
const ERROR_MESSAGE_METHOD_NOT_DEFINED = 'Method should be overridden in child class.';

/**
 * Filler.
 */
export class Filler {
  sandbox: any;

  /**
   * Filler.
   */
  constructor() {
    this.sandbox = new Sandbox();
  }

  /**
   * Fill.
   */
  fill(..._args: any[]): any {
    throw new Error(ERROR_MESSAGE_METHOD_NOT_DEFINED);
  }

  /**
   * Handle all elements.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {function(item, itemSchema): Promise<any>} handler Handler. Function `async function(item: any, itemSchema: object): any`.
   */
  async handleAllElements(schemaObject = {}, objectToFill = {}, handler) {
    // Get child properties.
    const childProperties = DocumentHandler.getSchemaChildProperties(schemaObject);

    // Handle all child properties.
    for (const childProperty of childProperties) {
      // Define params to handle.
      const { schemaObject, path } = childProperty;
      const item = PropByPath.get(objectToFill, path);

      // Handle.
      const handledItem = await handler(item, schemaObject);

      // Continue (do not save) if empty value.
      if (typeof handledItem === 'undefined' || (handledItem === null && schemaObject.allowNull !== true)) {
        continue;
      }

      // Save.
      global.log.save('document-filler|defined-value-to-set', { path, schemaObject, successfullyDefined: true }, 'warn'); // No reason to log handledItem.
      PropByPath.set(objectToFill, path, handledItem);
    }

    // Return filled object.
    return objectToFill;
  }
}
