const moment = require('moment');
const cyrillicToTranslit = require('cyrillic-to-translit-js');
const PropByPath = require('prop-by-path');
const Filler = require('./filler');

// Constants.
const INFO_MAP = [
  // Without cases.
  { value: 'user.id', infoObject: 'userId' },
  { value: 'user.name', infoObject: 'fullName' },
  { value: 'user.firstName', infoObject: 'first_name' },
  { value: 'user.lastName', infoObject: 'last_name' },
  { value: 'user.middleName', infoObject: 'middle_name' },
  { value: 'user.ipn', infoObject: 'ipn' },
  { value: 'user.phone', infoObject: 'phone' },
  { value: 'user.email', infoObject: 'email' },
  { value: 'user.edrpou', infoObject: 'edrpou' },
  { value: 'user.gender', infoObject: 'gender' },
  { value: 'user.isLegal', infoObject: 'isLegal' },
  { value: 'user.isIndividualEntrepreneur', infoObject: 'isIndividualEntrepreneur' },
  { value: 'user.companyName', infoObject: 'companyName' },
  { value: 'user.companyUnit', infoObject: 'companyUnit' },
  { value: 'user.address', infoObject: 'address' },
  { value: 'user.addressStruct', infoObject: 'addressStruct' },
  { value: 'user.addressStructRegionId', infoObject: 'addressStructRegionId' },
  { value: 'user.addressStructRegionIdNumber', infoObject: 'addressStructRegionIdNumber' },
  { value: 'user.addressStructDistrictId', infoObject: 'addressStructDistrictId' },
  { value: 'user.addressStructDistrictIdNumber', infoObject: 'addressStructDistrictIdNumber' },
  { value: 'user.addressStructCityId', infoObject: 'addressStructCityId' },
  { value: 'user.addressStructCityIdNumber', infoObject: 'addressStructCityIdNumber' },
  { value: 'user.addressStructStreetName', infoObject: 'addressStructStreetName' },
  { value: 'user.addressStructStreetRecord', infoObject: 'addressStructStreetRecord' },
  { value: 'user.isPrivateHouse', infoObject: 'is_private_house' },
  { value: 'user.position', infoObject: 'position' },
  { value: 'user.ceoName', infoObject: 'ceoName' },
  { value: 'user.passportSeries', infoObject: 'passport_series' },
  { value: 'user.passportNumber', infoObject: 'passport_number' },
  { value: 'user.passport', infoObject: 'passport' },
  { value: 'user.passportIssueDate', infoObject: 'passport_issue_date' },
  { value: 'user.passportIssuedBy', infoObject: 'passport_issued_by' },
  { value: 'user.foreignersDocumentSeries', infoObject: 'foreigners_document_series' },
  { value: 'user.foreignersDocumentNumber', infoObject: 'foreigners_document_number' },
  { value: 'user.foreignersDocument', infoObject: 'foreignersDocument' },
  { value: 'user.foreignersDocumentIssueDate', infoObject: 'foreigners_document_issue_date' },
  { value: 'user.foreignersDocumentExpireDate', infoObject: 'foreigners_document_expire_date' },
  { value: 'user.foreignersDocumentIssuedBy', infoObject: 'foreigners_document_issued_by' },
  { value: 'user.foreignersDocumentType', infoObject: 'foreigners_document_type' },
  { value: 'user.idCardNumber', infoObject: 'id_card_number' },
  { value: 'user.idCardIssueDate', infoObject: 'id_card_issue_date' },
  { value: 'user.idCardIssuedBy', infoObject: 'id_card_issued_by' },
  { value: 'user.idCardExpiryDate', infoObject: 'id_card_expiry_date' },
  { value: 'user.passportOrIdCardNumber', infoObject: 'passportOrIdCardNumber' },
  { value: 'user.passportNumberOrIdCardNumber', infoObject: 'passportNumberOrIdCardNumber' },
  { value: 'user.govId.documents', infoObject: 'govIdDocuments' },
  { value: 'user.birthday', infoObject: 'birthday' },
  { value: 'user.birthdayFullString', infoObject: 'birthdayFullString' },
  { value: 'user.units', infoObject: 'units' },
  { value: 'user.units.all', infoObject: 'units.all' },
  { value: 'user.units.head', infoObject: 'units.head' },
  { value: 'user.units.member', infoObject: 'units.member' },
  { value: 'user.docSeries', infoObject: 'docSeries' },
  { value: 'user.docNumber', infoObject: 'docNumber' },
  { value: 'user.cryptCertNumber', infoObject: 'services.eds.data.encodeCertSerial' },
  { value: 'user.cryptCert', infoObject: 'services.eds.data.encodeCert' },
  { value: 'user.pem', infoObject: 'services.eds.data.pem' },
  { value: 'user.eds.organizationName', infoObject: 'services.eds.data.issuerInfo.organizationName' },
  { value: 'user.govId.organizationName', infoObject: 'services.govid.data.raw.issuercn' },
];
const EDS_DRFO_PATH = 'data.ipn.DRFO';
const GOVID_DOCUMENTS_PATH = 'data.raw.documents';

/**
 * User info filler.
 */
class UserInfoFiller extends Filler {
  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @param {object} options.userInfo User info.
   * @param {object} [options.userUnits] User units.
   * @param {object} [options.userUnitsEntities] User units entities.
   * @param {object} [options.mainPersonUserInfo] Main person user info.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill = {}, options = {}) {
    // Get options.
    const { userInfo, mainPersonUserInfo, userUnitsEntities } = options;
    if (!userInfo) {
      return objectToFill;
    }

    // Define info object.
    const infoObject = { ...userInfo, mainPerson: mainPersonUserInfo || {} };

    // Prepare main info.
    if (infoObject.last_name && infoObject.first_name) {
      infoObject.fullName = `${infoObject.last_name} ${infoObject.first_name} ${infoObject.middle_name}`;
    }
    if (infoObject.passport_series && infoObject.passport_number) {
      infoObject.passport = `${infoObject.passport_series} ${infoObject.passport_number}`;
    }
    if (infoObject.foreigners_document_series && infoObject.foreigners_document_number) {
      infoObject.foreignersDocument = `${infoObject.foreigners_document_series} ${infoObject.foreigners_document_number}`;
    }

    // Define EDS service data.
    const edsService = infoObject.services && infoObject.services.eds;
    infoObject.ipn = infoObject.ipn || PropByPath.get(edsService || {}, EDS_DRFO_PATH);
    infoObject.ipn = cyrillicToTranslit({ preset: 'uk' }).reverse(infoObject.ipn);

    if (!/^\d{8}$/.test(infoObject.ipn) && !/^\d{10}$/.test(infoObject.ipn)) {
      if (infoObject.ipn.substring(0, 2) === infoObject.passport_series) {
        infoObject.docSeries = infoObject.passport_series;
        infoObject.docNumber = infoObject.passport_number;
      } else {
        infoObject.docNumber = infoObject.ipn;
      }
    }

    // Add passport or ID card number.
    infoObject.passportOrIdCardNumber = infoObject.passport || infoObject.id_card_number;
    infoObject.passportNumberOrIdCardNumber = infoObject.passport_number || infoObject.id_card_number;

    // Define GovID service data.
    const govIdService = infoObject.services && infoObject.services.govid;
    infoObject.govIdDocuments = PropByPath.get(govIdService || {}, GOVID_DOCUMENTS_PATH) || null;

    // Add address struct parts.
    infoObject.addressStructRegionId = infoObject.addressStruct && infoObject.addressStruct.region && infoObject.addressStruct.region.id;
    infoObject.addressStructRegionIdNumber = infoObject.addressStructRegionId && parseInt(infoObject.addressStructRegionId);
    infoObject.addressStructDistrictId = infoObject.addressStruct && infoObject.addressStruct.district && infoObject.addressStruct.district.id;
    infoObject.addressStructDistrictIdNumber = infoObject.addressStructDistrictId && parseInt(infoObject.addressStructDistrictId);
    infoObject.addressStructCityId = infoObject.addressStruct && infoObject.addressStruct.city && infoObject.addressStruct.city.id;
    infoObject.addressStructCityIdNumber = infoObject.addressStructCityId && parseInt(infoObject.addressStructCityId);
    infoObject.addressStructStreetName = infoObject.addressStruct && infoObject.addressStruct.street && infoObject.addressStruct.street.name;

    // Prepare birthday string.
    if (typeof infoObject.birthday === 'string') {
      infoObject.birthdayFullString = moment(infoObject.birthday, 'DD/MM/YYYY').locale('uk').format('LL'); // Sample: `12 березня 1964 р.`.
    }

    // Add user units.
    const userUnitsInfo = {
      all: ((userUnitsEntities && userUnitsEntities.all) || []).map((v) => ({
        id: v.id,
        parentId: v.parentId,
        basedOn: v.basedOn,
        name: v.name,
        description: v.description,
      })),
      head: ((userUnitsEntities && userUnitsEntities.head) || []).map((v) => ({
        id: v.id,
        parentId: v.parentId,
        basedOn: v.basedOn,
        name: v.name,
        description: v.description,
      })),
      member: ((userUnitsEntities && userUnitsEntities.member) || []).map((v) => ({
        id: v.id,
        parentId: v.parentId,
        basedOn: v.basedOn,
        name: v.name,
        description: v.description,
      })),
    };
    infoObject.units = userUnitsInfo;

    // Handle all pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      if (!itemSchema || typeof itemSchema.value !== 'string' || !itemSchema.value.startsWith('user.')) {
        return;
      }

      // Define current value.
      // Sample: "user.email".
      const currentValue = itemSchema.value;

      // Check value is in info map.
      const infoMapRecord = INFO_MAP.find((mapRecord) => mapRecord.value === currentValue);
      if (!infoMapRecord) {
        return;
      }

      // Get path to value.
      const pathToValue = infoMapRecord.infoObject;

      // Get value.
      let valueToSet = PropByPath.get(infoObject, pathToValue);
      if (valueToSet === null) {
        valueToSet = undefined;
      }

      return valueToSet;
    });
    return objectToFill;
  }
}

module.exports = UserInfoFiller;
