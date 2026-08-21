import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

const isNullableUuid = (value) =>
  value === null ||
  (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const isNullableString = (value) => value === null || typeof value === 'string';
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

export class CabinetMenuValidator extends Validator {
  static singleton: CabinetMenuValidator;

  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);

    if (!CabinetMenuValidator.singleton) {
      CabinetMenuValidator.singleton = this;
    }

    return CabinetMenuValidator.singleton;
  }

  findById() {
    return checkSchema({
      id: {
        in: ['params'],
        isUUID: true,
      },
    });
  }

  getAll() {
    return checkSchema({
      id: {
        in: ['query'],
        optional: true,
        isUUID: true,
      },
      parentId: {
        in: ['query'],
        optional: true,
        isUUID: true,
      },
      type: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      enabled: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  create() {
    return checkSchema({
      id: {
        in: ['body'],
        optional: true,
        isUUID: true,
      },
      parentId: {
        in: ['body'],
        optional: true,
        custom: { options: isNullableUuid },
      },
      order: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      name: {
        in: ['body'],
        optional: true,
        custom: { options: isNullableString },
      },
      description: {
        in: ['body'],
        optional: true,
        custom: { options: isNullableString },
      },
      icon: {
        in: ['body'],
        optional: true,
        custom: { options: isNullableString },
      },
      translations: {
        in: ['body'],
        optional: true,
        custom: { options: isPlainObject },
      },
      type: {
        in: ['body'],
        isString: true,
      },
      options: {
        in: ['body'],
        optional: true,
        custom: { options: isPlainObject },
      },
      access: {
        in: ['body'],
        optional: true,
        custom: { options: isPlainObject },
      },
      enabled: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  update() {
    return checkSchema({
      id: {
        in: ['params'],
        isUUID: true,
      },
      parentId: {
        in: ['body'],
        optional: true,
        custom: { options: isNullableUuid },
      },
      order: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      name: {
        in: ['body'],
        optional: true,
        custom: { options: isNullableString },
      },
      description: {
        in: ['body'],
        optional: true,
        custom: { options: isNullableString },
      },
      icon: {
        in: ['body'],
        optional: true,
        custom: { options: isNullableString },
      },
      translations: {
        in: ['body'],
        optional: true,
        custom: { options: isPlainObject },
      },
      type: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      options: {
        in: ['body'],
        optional: true,
        custom: { options: isPlainObject },
      },
      access: {
        in: ['body'],
        optional: true,
        custom: { options: isPlainObject },
      },
      enabled: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  delete() {
    return checkSchema({
      id: {
        in: ['params'],
        isUUID: true,
      },
    });
  }

  sort() {
    return checkSchema({
      items: {
        in: ['body'],
        isArray: true,
      },
      'items.*.id': {
        in: ['body'],
        isUUID: true,
      },
      'items.*.parentId': {
        in: ['body'],
        optional: true,
        custom: { options: isNullableUuid },
      },
      'items.*.order': {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
    });
  }
}
