import { Op, WhereAttributeHash } from 'sequelize';

import { Config } from '../config';
import { Request } from '../types';
import { BaseService } from './base_service';

export class UserService extends BaseService {
  extractUpdateUserInfoParams(req: Request, fields: string[]): WhereAttributeHash<any> {
    const modules = this.config.modules ?? {};
    const { denyToUpdateUserName = true, denyToUpdateUserValidParams = true } = modules;

    // Append fields list accordance to active modules.
    if (!denyToUpdateUserName) {
      fields.push('first_name', 'last_name', 'middle_name');
    }
    if (!denyToUpdateUserValidParams) {
      fields.push('valid');
    }

    const query: WhereAttributeHash<any> = {};
    for (const field of fields.filter((f) => f in req.body)) {
      query[field] = req.body[field];
    }

    if (typeof query.foreigners_document_type === 'string') {
      query.foreigners_document_type = JSON.parse(decodeURIComponent(query.foreigners_document_type));
    }

    this.processPhoneValidation(req, query);
    this.extractAddressStructure(query);
    this.processEmailValidation(req, modules, query);

    // Handle two factor auth.
    if ([true, 'true', 1].includes(query.useTwoFactorAuth)) {
      query.useTwoFactorAuth = true;
    }
    query.useTwoFactorAuth = query.useTwoFactorAuth ?? false;
    if ('twoFactorType' in query && query.twoFactorType != undefined && query.twoFactorType !== 'phone' && query.twoFactorType !== 'totp') {
      query.twoFactorType = null;
    }

    // Handle individual entrepreneur indicator.
    if ([true, 'true', 1].includes(query.isIndividualEntrepreneur)) {
      query.isIndividualEntrepreneur = true;
    }
    query.isIndividualEntrepreneur = query.isIndividualEntrepreneur ?? false;

    query.passport_issue_date = query.passport_issue_date ?? null;
    query.id_card_issue_date = query.id_card_issue_date ?? null;
    query.id_card_expiry_date = query.id_card_expiry_date ?? null;
    query.foreigners_document_issue_date = query.foreigners_document_issue_date ?? null;
    query.foreigners_document_expire_date = query.foreigners_document_expire_date ?? null;
    query.foreigners_document_type = query.foreigners_document_type ?? {};

    // Set dates as null.
    if (query.passport_issue_date === '') {
      query.passport_issue_date = null;
    }
    if (query.id_card_issue_date === '') {
      query.id_card_issue_date = null;
    }
    if (query.id_card_expiry_date === '') {
      query.id_card_expiry_date = null;
    }
    if (query.foreigners_document_issue_date === '') {
      query.foreigners_document_issue_date = null;
    }
    if (query.foreigners_document_expire_date === '') {
      query.foreigners_document_expire_date = null;
    }
    if (query.foreigners_document_type === '') {
      query.foreigners_document_type = {};
    }

    return query;
  }

  /**
   * Profile phone verification is only possible through an SMS challenge (see `AuthService.confirmUserPhone`).
   * A caller can never mark a phone as valid here, and changing the phone resets its validity.
   */
  processPhoneValidation(req: Request, query: WhereAttributeHash<any>) {
    const requestedValidity = query.valid?.phone;
    if (
      req.body.isValidPhone === 'true' ||
      req.body.isValidPhone === true ||
      (requestedValidity !== undefined && requestedValidity !== false && requestedValidity !== 'false')
    ) {
      throw new Error('Phone confirmation requires a valid SMS code');
    }
    if ('phone' in query || requestedValidity !== undefined || req.body.isValidPhone === 'false' || req.body.isValidPhone === false) {
      query.valid = { ...query.valid, phone: false };
    }
  }

  processEmailValidation(req: Request, modules: NonNullable<Config['modules']>, query: WhereAttributeHash<any>) {
    if (!modules.denyToUpdateUserValidParams) {
      if (query.valid?.email) {
        query.valid.email = query.valid.email === 'true';
      }
      if (['true', 'false'].includes(req.body.isValidEmail)) {
        if (typeof query.valid !== 'object') {
          query.valid = {};
        }
        query.valid.email = req.body.isValidEmail === 'true';
      }
    }
  }

  extractAddressStructure(query: WhereAttributeHash<any>) {
    if (typeof query.addressStruct === 'string') {
      query.addressStruct = JSON.parse(decodeURIComponent(query.addressStruct));
    } else if (query.addressStruct) {
      const validationError = this.validateAddressStruct(query);
      if (validationError) {
        throw new Error(validationError);
      }
    }
  }

  /**
   * Validate address struct.
   */
  validateAddressStruct(data: Record<string, any>): string | undefined {
    if (typeof data.addressStruct?.region?.id === 'undefined' || typeof data.addressStruct?.region?.name === 'undefined') {
      return 'addressStruct invalid - should be region: { id, name }.';
    }

    if (typeof data.addressStruct?.district?.id === 'undefined' || typeof data.addressStruct?.district?.name === 'undefined') {
      return 'addressStruct invalid - should be district: { id, name }.';
    }

    if (
      typeof data.addressStruct?.city?.id === 'undefined' ||
      typeof data.addressStruct?.city?.name === 'undefined' ||
      typeof data.addressStruct?.city?.type === 'undefined'
    ) {
      return 'addressStruct invalid - should be city: { id, name, type }.';
    }

    if (
      typeof data.addressStruct?.street?.id === 'undefined' ||
      typeof data.addressStruct?.street?.name === 'undefined' ||
      typeof data.addressStruct?.street?.type === 'undefined'
    ) {
      return 'addressStruct invalid - should be street: { id, name, type }.';
    }
    if (typeof data.addressStruct?.building !== 'string') {
      return 'addressStruct invalid - should be string.';
    }
    if (typeof data.addressStruct?.korp !== 'string') {
      return 'addressStruct invalid - should be string.';
    }
    if (typeof data.addressStruct?.apt !== 'string') {
      return 'addressStruct invalid - should be string.';
    }
    if (typeof data.addressStruct?.index !== 'string') {
      return 'addressStruct invalid - should be string.';
    }
  }

  parseNameForGetUsersQuery(query: any, searchString?: string): void {
    if (!searchString) {
      return;
    }

    const [lastName, firstName, middleName] = searchString.split(' ');

    if (typeof lastName !== 'undefined' && typeof firstName !== 'undefined') {
      query.last_name = { [Op.iLike]: `${lastName}%` };
      query.first_name = { [Op.iLike]: `${firstName}%` };
      if (typeof middleName !== 'undefined') {
        query.middle_name = { [Op.iLike]: `${middleName}%` };
      }
    } else {
      query.last_name = { [Op.iLike]: `${lastName}%` };
    }
  }

  parseEmailForGetUsersQuery(query: any, email?: string): void {
    if (typeof email === 'string' && email.includes(',')) {
      query.email = { [Op.in]: email.split(',').map((e) => e.trim().toLowerCase()) };
    } else if (Array.isArray(email)) {
      query.email = { [Op.in]: email.map((e) => e.toString().toLowerCase()) };
    } else if (email) {
      query.email = { [Op.iLike]: `${email}%` };
    }
  }

  parseIpnCollectionForGetUsersQuery(query: any, ipn?: any): void {
    const ipnCollection = (Array.isArray(ipn) ? ipn : [ipn]).filter((v) => typeof v === 'string' && v.length > 0);
    if (ipnCollection.length) {
      query[Op.or] = [
        { ipn: { [Op.in]: ipnCollection } },
        { edrpou: { [Op.in]: ipnCollection }, isLegal: true },
        { edrpou: { [Op.in]: ipnCollection }, isIndividualEntrepreneur: true },
      ];
    }
  }
}
