/**
 * Unit result.
 * @typedef {import('../../../entities/unit')} UnitEntity Unit entity.
 */
class UnitResult {
  /**
   * Unit result constructor.
   * @param {'create'} operation Event unit operation.
   * @param {number} unitId Unit ID.
   * @param {UnitEntity} unit Unit entity.
   * @param {string} error Error message.
   */
  constructor(operation, unitId, unit, error) {
    // Init params.
    this.createdAt = new Date();
    this.operation = operation;
    this.unitId = unitId;
    this.unit = unit;
    this.error = error;
    this.isHandled = !!unit;
  }
}

module.exports = UnitResult;
