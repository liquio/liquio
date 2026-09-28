import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * BPMN workflow validator.
 */
export class BpmnWorkflowValidator extends Validator {
  static singleton: BpmnWorkflowValidator;

  /**
   * Workflow validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!BpmnWorkflowValidator.singleton) {
      BpmnWorkflowValidator.singleton = this;
    }
    return BpmnWorkflowValidator.singleton;
  }

  /**
   * Schema.
   */
  export() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  import() {
    return checkSchema({
      ['force']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['type']: {
        in: ['body'],
        optional: true,
        isIn: { options: [['major', 'minor']] },
        default: { options: 'minor' },
      },
      ['name']: {
        in: ['body'],
        optional: true,
        isString: true,
        default: { options: 'Front does not exist.' },
      },
      ['description']: {
        in: ['body'],
        optional: true,
        isString: true,
        default: { options: 'Front does not exist.' },
      },
    });
  }

  /**
   * Schema.
   */
  getVersions() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  findByVersion() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['version']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  saveVersion() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['type']: {
        in: ['body'],
        isIn: { options: [['major', 'minor']] },
      },
      ['name']: {
        in: ['body'],
        optional: true,
        isString: true,
        // custom: {
        //   options: (value, { req }) => {
        //     if (req.body.type === 'major' && value === '') {
        //       return false;
        //     }

        //     return true;
        //   }
        // }
      },
      ['description']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  copyPreparation() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  copy() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['request_id']: {
        in: ['body'],
        optional: false,
        isString: true,
      },
      ['not_replacing_diff_ids']: {
        in: ['body'],
        optional: false,
        isArray: true,
      },
    });
  }
}
