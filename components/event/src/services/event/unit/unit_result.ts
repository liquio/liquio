/**
 * Unit result.
 * @typedef {import('../../../entities/unit')} UnitEntity Unit entity.
 */
export class UnitResult {
  createdAt: Date;
  operation: string;
  unitId: number;
  unit: any;
  error: string | undefined;
  isHandled: boolean;

  /**
   * Unit result constructor.
   * @param {'create'} operation Event unit operation.
   * @param {number} unitId Unit ID.
   * @param {UnitEntity} unit Unit entity.
   * @param {string} error Error message.
   */
  constructor(operation: string, unitId: number, unit: any, error: string | undefined) {
    // Init params.
    this.createdAt = new Date();
    this.operation = operation;
    this.unitId = unitId;
    this.unit = unit;
    this.error = error;
    this.isHandled = !!unit;
  }
}
