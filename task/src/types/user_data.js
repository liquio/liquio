class UserData {
  /**
   * @param {Object} item
   * @param {string} item.userId
   * @param {string} item.email
   * @param {string} item.provider
   * @param {string} item.phone
   * @param {string} item.ipn
   * @param {string} item.edrpou
   * @param {string} item.firstName
   * @param {string} item.lastName
   * @param {string} item.middleName
   * @param {Array<number>} item.authUserUnits
   * @param {{head: Array<number>, member: Array<number>, all: Array<number>}} item.separatedAuthUserUnits
   * @param {string} item.companyName
   * @param {string} item.companyUnit
   */
  constructor(item) {
    this.userId = item.userId;
    this.email = item.email;
    this.provider = item.provider;
    this.phone = item.phone;
    this.ipn = item.ipn;
    this.edrpou = item.edrpou;
    this.firstName = item.firstName;
    this.lastName = item.lastName;
    this.middleName = item.middleName;
    this.userUnitIds = item.authUserUnits;
    this.userUnits = {
      head: item.separatedAuthUserUnits.head,
      member: item.separatedAuthUserUnits.member,
      all: item.separatedAuthUserUnits.all,
    };
    this.companyName = item.companyName;
    this.companyUnit = item.companyUnit;
  }
}
module.exports.UserData = UserData;
