import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

const optionalParentId = {
  optional: {
    options: {
      nullable: true,
    },
  },
  customSanitizer: {
    options: (value) => (value === '' ? null : value),
  },
  isUUID: true,
};

const grantSubjectId = {
  optional: true,
  custom: {
    options: (value) => ['string', 'number'].includes(typeof value) && String(value).length > 0,
  },
  customSanitizer: {
    options: (value) => String(value),
  },
};

export class FileLibraryValidator extends Validator {
  static singleton: FileLibraryValidator;

  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);
    return FileLibraryValidator.singleton || (FileLibraryValidator.singleton = this);
  }

  list() {
    return checkSchema({
      parent_id: {
        in: ['query'],
        ...optionalParentId,
      },
    });
  }

  id() {
    return checkSchema({
      id: {
        in: ['params'],
        isUUID: true,
      },
    });
  }

  publicSlug() {
    return checkSchema({
      slug: {
        in: ['params'],
        isString: true,
        isLength: { options: { min: 16, max: 128 } },
      },
    });
  }

  createFolder() {
    return checkSchema({
      parent_id: {
        in: ['body'],
        ...optionalParentId,
      },
      name: {
        in: ['body'],
        isString: true,
        isLength: { options: { min: 1, max: 255 } },
      },
      visibility: {
        in: ['body'],
        optional: true,
        isIn: { options: [['private', 'public']] },
      },
      owner_user_id: {
        in: ['body'],
        optional: true,
        isString: true,
      },
    });
  }

  uploadFile() {
    return checkSchema({
      parent_id: {
        in: ['query'],
        ...optionalParentId,
      },
      name: {
        in: ['query'],
        isString: true,
        isLength: { options: { min: 1, max: 255 } },
      },
      visibility: {
        in: ['query'],
        optional: true,
        isIn: { options: [['private', 'public']] },
      },
      owner_user_id: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      with_preview: {
        in: ['query'],
        optional: true,
        isBoolean: true,
      },
    });
  }

  update() {
    return checkSchema({
      id: {
        in: ['params'],
        isUUID: true,
      },
      parent_id: {
        in: ['body'],
        ...optionalParentId,
      },
      name: {
        in: ['body'],
        optional: true,
        isString: true,
        isLength: { options: { min: 1, max: 255 } },
      },
      visibility: {
        in: ['body'],
        optional: true,
        isIn: { options: [['private', 'public']] },
      },
      owner_user_id: {
        in: ['body'],
        optional: true,
        isString: true,
      },
    });
  }

  grants() {
    return checkSchema({
      id: {
        in: ['params'],
        isUUID: true,
      },
      grants: {
        in: ['body'],
        isArray: true,
      },
      'grants.*.subjectType': {
        in: ['body'],
        optional: true,
        isIn: { options: [['unit', 'user']] },
      },
      'grants.*.subject_type': {
        in: ['body'],
        optional: true,
        isIn: { options: [['unit', 'user']] },
      },
      'grants.*.subjectId': {
        in: ['body'],
        ...grantSubjectId,
      },
      'grants.*.subject_id': {
        in: ['body'],
        ...grantSubjectId,
      },
      'grants.*.permission': {
        in: ['body'],
        isIn: { options: [['read', 'write', 'manage']] },
      },
      'grants.*.inherit': {
        in: ['body'],
        optional: true,
        isBoolean: true,
      },
    });
  }

  publicLink() {
    return checkSchema({
      id: {
        in: ['params'],
        isUUID: true,
      },
      expires_at: {
        in: ['body'],
        optional: true,
        isISO8601: true,
      },
    });
  }
}
