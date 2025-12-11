const moment = require('moment');

const providers = require('./providers');
const { TEST_WORDS } = require('./constants');

/**
 * Test user checker.
 */
class TestUserChecker {
  constructor() {
    // Define singleton.
    if (!TestUserChecker.singleton) {
      this.providers = providers;
      TestUserChecker.singleton = this;
    }

    return TestUserChecker.singleton;
  }

  /**
   * Check test user.
   * @param {object} user User.
   * @returns {boolean}
   */
  isTestUser(user) {
    const { ipn, name, services } = user;

    const isIpnValid = this.validateIpn(ipn);
    if (!isIpnValid) {
      return true;
    }

    const doesPibContainTestWord = TEST_WORDS.some((word) => name.toLowerCase().includes(word));
    if (doesPibContainTestWord) {
      return true;
    }

    const userServices = Object.keys(services || {});
    const providers = this.providers.filter((provider) => userServices.includes(provider.name));
    const isTestIssuer = providers.some((provider) => provider.isTestIssuer(user));
    if (isTestIssuer) {
      return true;
    }

    return false;
  }

  /**
   * Validate IPN using a checksum algorithm.
   * @param {string} ipn IPN.
   * @param {boolean} checkAge Check age.
   * @returns {boolean}
   */
  validateIpn(ipn, checkAge = true) {
    const ipnLength = ipn.length;
    if (ipnLength !== 10) {
      return false;
    }

    // Use weighted multiplication of first 9 digits to verify the check digit (10th digit).
    const weights = [-1, 5, 7, 9, 4, 6, 10, 5, 7];

    // Convert IPN string digits to numbers and multiply each by its corresponding weight.
    const weightedDigits = weights.map((weight, index) => Number(ipn[index]) * weight);

    // Sum all weighted digits.
    const checksumTotal = weightedDigits.reduce((sum, value) => sum + value, 0);

    // Calculate check digit as remainder of total divided by 11.
    const calculatedCheckDigit = checksumTotal % 11;

    // Get actual check digit from IPN (last digit).
    const actualCheckDigit = Number(ipn[9]);

    // If calculated check digit is 10, actual check digit must be 0.
    const isCheckDigit10And0 = calculatedCheckDigit === 10 && actualCheckDigit === 0;
    // Otherwise, actual check digit must equal calculated check digit.
    const isCheckDigitEqual = actualCheckDigit === calculatedCheckDigit;
    const isValidCheckDigit = isCheckDigit10And0 || isCheckDigitEqual;
    if (!isValidCheckDigit) {
      return false;
    }

    // If age is less than 1 or more than 90 - ipn is incorrect.
    if (checkAge) {
      const first5Digits = parseInt(ipn.slice(0, 5), 10);
      const birthDate = moment('1899-12-31').add(first5Digits, 'days');

      const currentDate = moment();
      const ageInYears = currentDate.diff(birthDate, 'years');

      if (ageInYears < 1 || ageInYears > 90) {
        return false;
      }
    }

    return true;
  }
}

module.exports = TestUserChecker;
