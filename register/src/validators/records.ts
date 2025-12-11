import { body, query, param } from 'express-validator';
import Validator from './validator';

/**
 * Records validator.
 */
export default class RecordsValidator extends Validator {
  static singleton: RecordsValidator;

  /**
   * Key validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!RecordsValidator.singleton) {
      RecordsValidator.singleton = this;
    }
    return RecordsValidator.singleton;
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
      query('key_id').isInt().toInt().optional(),
      query('record_id').optional(),
      query('record_ids_list').optional(),
      query('parent_id').isInt().toInt().optional(),
      query('data').optional(),
      query('data_nested').optional(),
      query('exclude').optional(),
      query('data_like').optional(),
      query('search').optional(),
      query('search_2').optional(),
      query('search_3').optional(),
      query('search_equal').optional(),
      query('search_equal_2').optional(),
      query('search_equal_3').optional(),
      query('meta').optional(),
      query('allow_see_all_records').optional(),
      query('disable_fields_rules').optional(),
      query('allow_tokens').optional(),
      query('created_from').optional(),
      query('created_to').optional(),
      query('created_by').optional(),
      query('updated_from').optional(),
      query('updated_to').optional(),
      query('updated_by').optional(),
      query('residentship_date_from').optional(),
      query('residentship_date_to').optional(),
      query('residentship_status_date_from').optional(),
      query('residentship_status_date_to').optional(),
      query('data_date_from').optional(),
      query('data_date_to').optional(),
      query('sort').optional(),
      query('paths').optional(),
      query('join_by').optional(),
      query('csv_map').optional(),
      query('no_limit').isBoolean().toBoolean().optional(),
      query('is_search_string_array').optional(),
      body('rawSequelizeParams').optional().isObject()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getAllByPost() {
    return [
      body('offset').isInt().toInt().optional(),
      body('limit').isInt().toInt().optional(),
      body('register_id').isInt().toInt().optional(),
      body('key_id').isInt().toInt().optional(),
      body('record_id').optional(),
      body('record_ids_list').optional(),
      body('parent_id').isInt().toInt().optional(),
      body('data').optional(),
      body('data_nested').optional(),
      body('exclude').optional(),
      body('data_like').optional(),
      body('search').optional(),
      body('search_2').optional(),
      body('search_3').optional(),
      body('search_equal').optional(),
      body('search_equal_2').optional(),
      body('search_equal_3').optional(),
      body('meta').optional(),
      body('allow_see_all_records').optional(),
      body('disable_fields_rules').optional(),
      body('allow_tokens').optional(),
      body('created_from').optional(),
      body('created_to').optional(),
      body('created_by').optional(),
      body('updated_from').optional(),
      body('updated_to').optional(),
      body('updated_by').optional(),
      body('residentship_date_from').optional(),
      body('residentship_date_to').optional(),
      body('residentship_status_date_from').optional(),
      body('residentship_status_date_to').optional(),
      body('data_date_from').optional(),
      body('data_date_to').optional(),
      body('sort').optional(),
      body('paths').optional(),
      body('join_by').optional(),
      body('csv_map').optional(),
      body('no_limit').isBoolean().toBoolean().optional(),
      body('is_search_string_array').optional(),
      body('rawSequelizeParams').optional().isObject()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getAllEdessb() {
    return [
      query('ap_rnokpp').isString(),
      query('atu_region').isString(),
      query('atu_city').isString(),
      query('atu_street').isString().optional(),
      query('key_ids')
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getAllFiltered() {
    return [
      query('offset').isInt().toInt().optional(),
      query('limit').isInt().toInt().optional(),
      query('register_id').isInt().toInt().optional(),
      query('key_id').isInt().toInt().optional(),
      query('id').optional(),
      query('parent_id').isInt().toInt().optional(),
      query('data').optional(),
      query('data_like').optional(),
      query('search').optional(),
      query('search_2').optional(),
      query('search_3').optional(),
      query('search_equal').optional(),
      query('search_equal_2').optional(),
      query('search_equal_3').optional(),
      query('meta').optional(),
      query('allow_see_all_records').optional(),
      query('disable_fields_rules').optional(),
      query('allow_tokens').optional(),
      query('created_from').optional(),
      query('created_to').optional(),
      query('created_by').optional(),
      query('updated_from').optional(),
      query('updated_to').optional(),
      query('updated_by').optional(),
      query('changed_from').optional(),
      query('changed_to').optional(),
      query('sort').optional(),
      query('csv_map').optional(),
      query('no_limit').isBoolean().toBoolean().optional(),
      query('is_encrypted').isBoolean().toBoolean().optional(),
      query('additional_filter').optional(),
      body('additionalFilter').optional(),
      body('additionalFilterData').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  findById() {
    return [param('id').isString(), query('paths').optional()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]} Validation chain list.
   */
  findHistoryByRecordId() {
    return [
      // Params.
      param('id').isString(),

      // Query.
      query('operation').isString().optional(),
      query('split_by_fields').isBoolean().toBoolean().optional(),
      query('split_by_fields_order').isString().optional(),
      query('offset').isInt().toInt().optional(),
      query('limit').isInt().toInt().optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  create() {
    return [
      body('id').isString().optional(),

      body('registerId').isInt().toInt(),
      body('keyId').isInt().toInt(),

      body('data').optional(),
      body('meta').optional(),
      body('allowTokens').optional(),
      body('createdFrom').optional(),
      body('createdTo').optional(),
      body('createdBy').optional(),
      body('updatedFrom').optional(),
      body('updatedTo').optional(),
      body('updatedBy').optional(),
      body('person').optional(),
      body('signature').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  bulkImport() {
    return [
      body('registerId').isInt().toInt(),
      body('keyId').isInt().toInt(),
      body('records').optional(),
      body('background').optional(),
      body('isCalculateSearchStrings').optional().isBoolean(),
      body('isReturnCreatedRecords').optional().isBoolean(),
      body('updateByDataField').optional().isString()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  bulkCreateByPerson() {
    return [
      body('registerId').isInt().toInt(),
      body('keyId').isInt().toInt(),
      body('recordsData').isArray(),
      body('person').isObject(),
      body('isDisableHooks').isBoolean().optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  deleteBulk() {
    return [body('registerId').isInt().toInt(), body('keyId').isInt().toInt(), body('skipRecordIds').isArray()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  atuBulkDelete() {
    return [
      body('registerId').isInt().toInt(),
      body('keyIds.original').isInt(),
      body('keyIds.possible').isInt().optional(),
      body('records').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  atuBulkImport() {
    return [
      body('registerId').isInt().toInt(),
      body('keyIds.original').isInt(),
      body('keyIds.possible').isInt().optional(),
      body('records').optional(),
      body('options').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  atuGetAll() {
    return [body('registerId').isInt().toInt(), body('keyId').isInt().toInt(), body('atuIds').optional()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  update() {
    return [
      param('id').isString(),
      body('registerId').isInt().toInt(),
      body('keyId').isInt().toInt(),

      body('data').optional(),
      body('meta').optional(),
      body('allowTokens').optional(),
      body('createdFrom').optional(),
      body('createdTo').optional(),
      body('createdBy').optional(),
      body('updatedFrom').optional(),
      body('updatedTo').optional(),
      body('updatedBy').optional(),
      body('person').optional(),
      body('signature').optional()
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  updatePatch() {
    return [
      param('id').isString(),
      body('keyId').isInt().toInt(),
      body('properties').isArray(),
      body('properties.*.path').isString(),
      body('properties.*.previousValue').custom((value) => ['string', 'number'].includes(typeof value)),
      body('properties.*.value').custom((value) => ['string', 'number'].includes(typeof value))
    ];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  delete() {
    return [param('id').isString(), query('personId').isString().optional(), query('personName').isString().optional()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  search() {
    return [
      query('key_id').isInt().toInt(),
      query('text').isString(),
      query('search_key').isString().optional(),
      query('limit').isString().optional(),
      query('offset').isString().optional()
    ];
  }
}
