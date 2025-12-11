const Filler = require('./filler');
const ExternalReader = require('../../../lib/external_reader');
const RegisterService = require('../../register');

/**
 * Verified user info filler.
 */
class VerifiedUserInfoFiller extends Filler {
  constructor() {
    if (!VerifiedUserInfoFiller.singleton) {
      // Init parent constructor.
      super();

      this.externalReader = new ExternalReader();
      this.registerService = new RegisterService();
      VerifiedUserInfoFiller.singleton = this;
    }
    return VerifiedUserInfoFiller.singleton;
  }

  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill = {}, options = {}) {
    const { userInfo, oauthToken, enabledMocksHeader } = options;

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shouldn't be defined.
      if (!itemSchema || itemSchema.control !== 'verifiedUserInfo' || !userInfo || !oauthToken) {
        return;
      }

      // Define current value.
      const { fields = [] } = itemSchema || {};

      // Fill current element.
      let valueToSet = {};
      for (const field of fields) {
        valueToSet.verified = {
          ...valueToSet.verified,
          [field]: false
        };
      }

      try {
        if (fields.includes('email')) {
          valueToSet.verified.email = userInfo.email ? true : false;
          if (userInfo.email !== '') {
            valueToSet.email = {
              value: userInfo.email
            };
          }
        }

        if (fields.includes('phone')) {
          valueToSet.verified.phone = userInfo.phone ? true : false;
          if (userInfo.phone !== '') {
            valueToSet.phone = {
              value: userInfo.phone
            };
          }
        }

        if (fields.includes('birthday')) {
          valueToSet.birthday = {
            date: this.getBirthdayByRnokpp(userInfo?.ipn)
          };
        }

        if (fields.includes('gender')) {
          valueToSet.gender = {
            value: this.getGenderByRnokpp(userInfo?.ipn)
          };
        }

        const passport = await this.externalReader.getDataByUser(
          'custom',
          'get-passport',
          undefined,
          oauthToken,
          userInfo,
          {},
          undefined,
          undefined,
          enabledMocksHeader
        );

        valueToSet = await this.prepareData(
          valueToSet,
          fields,
          userInfo,
          passport,
          oauthToken,
          enabledMocksHeader
        );
      } catch (error) {
        log.save(
          'verified-user-info-field-filling-error',
          { error: (error && error.message) || error, stack: error.stack },
          'warn'
        );
      }

      return valueToSet;
    });

    return objectToFill;
  }

  /**
   * Prepare data for filling.
   * @private
   * @param {object} valueToSet Value to set.
   * @param {string[]} fields Fields to fill.
   * @param {object} userInfo User info.
   * @param {object} passport Passport data.
   * @param {string} oauthToken OAuth token.
   * @param {string} enabledMocksHeader Enabled mocks headers.
   * @returns {Promise<object>} Prepared data.
   */
  async prepareData(valueToSet, fields, _userInfo, passport, _oauthToken, _enabledMocksHeader) {
    const { data } = passport || {};

    if (fields.includes('unzr')) {
      valueToSet.verified.unzr = data?.eddr_info === 'true' && data?.unzr !== '' ? true : false;
      if (data?.unzr !== '') {
        valueToSet.unzr = {
          value: data?.unzr
        };
      }
    }

    if (fields.includes('birthday')) {
      valueToSet.verified.birthday = data?.eddr_info === 'true' ? true : false;
      if (data?.eddr_info === 'true') {
        valueToSet.birthday = {
          date: data?.date_birth,
          place: data?.birth_place,
          country: data?.birth_country,
          countryId: data?.birth_country_id
        };
      }
    }

    if (fields.includes('gender')) {
      valueToSet.verified.gender = data?.eddr_info === 'true' && data?.gender !== '' ? true : false;
      if (data?.eddr_info === 'true' && data?.gender !== '') {
        valueToSet.gender = {
          value: data?.gender === 'M' ? 'male' : 'female'
        };
      }
    }

    if (fields.includes('passport')) {
      valueToSet.verified.passport =
        data?.eddr_info === 'true' && data?.documents?.documents === 'true' ? true : false;
      if (data?.eddr_info === 'true' && data?.documents?.documents === 'true') {
        valueToSet.passport = {
          type: data?.documents?.type === 'pass' ? 'passport' : 'idCard',
          series: data?.documents?.documentSerial,
          number: data?.documents?.number,
          issuedBy: data?.documents?.dep_issue,
          issuedAt: data?.documents?.date_issue,
          expireDate: data?.documents?.date_expiry
        };
      }
    }

    if (fields.includes('index')) {
      // Set index false by default. We will redefine it if `address` field is defined.
      valueToSet.verified.index = false;
    }

    return valueToSet;
  }

  /**
   * Get gender by rnokpp.
   * @private
   * @param {string} rnokpp Rnokpp.
   * @return {string}
   */
  getGenderByRnokpp(rnokpp) {
    if (!rnokpp || rnokpp.length !== 10) {
      return;
    }

    const genderPart = parseInt(rnokpp[8]);
    if (isNaN(genderPart)) {
      return;
    }

    return genderPart % 2 ? 'male' : 'female';
  }

  /**
   * Get birthday by rnokpp.
   * @private
   * @param {string} rnokpp Rnokpp.
   * @return {string}
   */
  getBirthdayByRnokpp(rnokpp) {
    if (!rnokpp || rnokpp.length !== 10) {
      return;
    }

    const datePart = rnokpp.slice(0, 5);
    const dateOfBirth = new Date(1899, 12, 31);
    dateOfBirth?.setDate(Number(datePart));

    return dateOfBirth?.toLocaleDateString('uk-UA');
  }
}

module.exports = VerifiedUserInfoFiller;
