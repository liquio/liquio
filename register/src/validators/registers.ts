import { body, query, param } from 'express-validator';
import Validator from './validator';

/**
 * Register validator.
 */
export default class RegistersValidator extends Validator {
  static singleton: RegistersValidator;

  /**
   * Register validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!RegistersValidator.singleton) {
      RegistersValidator.singleton = this;
    }
    return RegistersValidator.singleton;
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getAll() {
    return [
      query('offset').isInt().toInt().optional(),
      query('limit').isInt().toInt().optional(),
      query('parent_id').isInt().toInt().optional(),
      query('id').isInt().toInt().optional(),
      query('key_id').isInt().toInt().optional(),

      query('name').optional(),
      query('description').optional(),
      query('meta').optional(),
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
  findById() {
    return [param('id').isInt().toInt()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  export() {
    return [
      param('id').isInt().toInt(),
      query('with_data').isBoolean().toBoolean(),
      query('file').isBoolean().toBoolean().optional(),
      query('key_ids').isString().optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  import() {
    return [
      query('rewrite_schema').isBoolean().toBoolean().optional(),
      query('clear_records').isBoolean().toBoolean().optional(),
      query('add_data').isBoolean().toBoolean().optional(),
      query('force').isBoolean().toBoolean().optional(),
      query('file').isBoolean().toBoolean().optional(),
      body('data').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  create() {
    return [
      body('id').isInt().toInt().optional(),

      body('name').isString(),
      body('description').isString(),

      body('parentId').optional(),
      body('meta').optional(),
      body('createdFrom').optional(),
      body('createdTo').optional(),
      body('createdBy').optional(),
      body('updatedFrom').optional(),
      body('updatedTo').optional(),
      body('updatedBy').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  update() {
    return [
      param('id').isInt().toInt(),

      body('name').isString(),
      body('description').isString(),

      body('parentId').optional(),
      body('meta').optional(),
      body('createdFrom').optional(),
      body('createdTo').optional(),
      body('createdBy').optional(),
      body('updatedFrom').optional(),
      body('updatedTo').optional(),
      body('updatedBy').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  delete() {
    return [param('id').isInt().toInt()];
  }
}
