/**
 * Custom log business.
 */
export class CustomLogBusiness {
  private static singleton: CustomLogBusiness;

  public config: object;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?) {
    // Define singleton.
    if (!CustomLogBusiness.singleton) {
      this.config = config;
      CustomLogBusiness.singleton = this;
    }

    // Return singleton.
    return CustomLogBusiness.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<{expandedCustomLogs: Object[], customFieldNames: {key: string, name: string}[]}|Object[]>}
   */
  async getAll({ currentPage, perPage, filters, sort, isAppendCustomFields }) {
    const customLogs = await global.models.customLog.getAll({ currentPage, perPage, filters, sort });

    if (isAppendCustomFields) {
      // Get las custom log. To get the actual list of fields.
      const lastCustomLog = await global.models.customLog.getLastLog({ attributes: ['custom'] });
      const customFieldNames = Object.keys(lastCustomLog?.custom || {}).map((key) => ({
        key: key,
        name: lastCustomLog.custom[key].name,
      }));

      // Append custom fields.
      const appendedCustomLogs = [];
      for (const customLog of customLogs.data) {
        for (const [key, value] of Object.entries(customLog.custom)) {
          customLog[key] = (value as any).value;
        }
        delete customLog.custom;
        appendedCustomLogs.push(customLog);
      }

      return { customFieldNames, pagination: customLogs.pagination, data: appendedCustomLogs };
    }

    return customLogs;
  }
}
