/**
 * Document checks Class for implements
 * @abstract
 */
class Checks {
  /**
   * Check document.
   * @abstract
   */
  check() {
    throw new Error('Method of Checks Class must be override for a specific check.');
  }
}

module.exports = Checks;
