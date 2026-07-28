import { body, query, param } from 'express-validator';
import Validator from './validator';

/**
 * Keys validator.
 */
export default class KeysValidator extends Validator {
  static singleton: KeysValidator;

  /**
   * Key validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!KeysValidator.singleton) {
      KeysValidator.singleton = this;
    }
    return KeysValidator.singleton;
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getAll() {
    return [
      query('offset').isInt().toInt().optional(),
      query('limit').isInt().toInt().optional(),
      query('register_id').isInt().toInt().optional(),
      query('parent_id').isInt().toInt().optional(),

      query('name').optional(),
      query('description').optional(),
      query('schema').optional(),
      query('meta').optional(),
      query('to_string').optional(),
      query('is_encrypted').isBoolean().optional(),
      query('created_from').optional(),
      query('created_to').optional(),
      query('created_by').optional(),
      query('updated_from').optional(),
      query('updated_to').optional(),
      query('updated_by').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  findHistoryByKeyId() {
    return [
      param('id').isInt().toInt(),

      query('operation').isString().optional(),
      query('offset').isInt().toInt().optional(),
      query('limit').isInt().toInt().optional(),
      query('record_data_like').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  findById() {
    return [param('id').isInt().toInt()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  create() {
    return [
      body('id').isInt().toInt().optional(),

      body('registerId').isInt().toInt(),
      body('name').isString(),
      body('description').isString(),

      body('parentId').optional(),
      body('schema').optional(),
      body('meta').optional(),
      body('toString').optional(),
      body('toSearchString').optional(),
      body('created_from').optional(),
      body('created_to').optional(),
      body('created_by').optional(),
      body('updated_from').optional(),
      body('updated_to').optional(),
      body('updated_by').optional(),
      body('lock').isBoolean().optional(),
      body('access_mode').isIn(['full', 'read_only', 'write_only']).optional(),
      body('toExport').optional(),
      body('isEncrypted').isBoolean().optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  update() {
    return [
      param('id').isInt().toInt(),

      body('registerId').isInt().toInt().optional(),
      body('name').isString(),
      body('description').isString(),

      body('parentId').optional(),
      body('schema').optional(),
      body('meta').optional(),
      body('toString').optional(),
      body('toSearchString').optional(),
      body('created_from').optional(),
      body('created_to').optional(),
      body('created_by').optional(),
      body('updated_from').optional(),
      body('updated_to').optional(),
      body('updated_by').optional(),
      body('lock').isBoolean().optional(),
      body('access_mode').isIn(['full', 'read_only', 'write_only']).optional(),
      body('toExport').optional(),
      body('isEncrypted').isBoolean().optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  delete() {
    return [param('id').isInt().toInt()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  reindex() {
    return [param('id').isInt().toInt()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  afterhandlersReindex() {
    return [param('id').isInt().toInt(), body('*').optional()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  syncedByIds() {
    return [query('ids').isString()];
  }

  /**
   * All Synced
   * @return {ValidationChain[]}
   */
  allSynced() {
    return [];
  }

  processEncryption() {
    return [param('id').isInt().toInt(), query('limit').isInt().toInt().optional()];
  }
}
