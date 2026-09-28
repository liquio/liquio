/**
 * Document checks Class for implements
 * @abstract
 */
export class Checks {
  /**
   * Check document.
   * @abstract
   */
  check(..._args: any[]): any {
    throw new Error('Method of Checks Class must be override for a specific check.');
  }
}
