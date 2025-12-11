const ElasticService = require('../services/elastic');

/**
 * Elastic business.
 */
class ElasticBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!ElasticBusiness.singleton) {
      this.config = config.elastic;
      this.isSearchTemplateUpdated = false;
      this.elasticService = new ElasticService(config.elastic);
    }

    // Return singleton.
    return ElasticBusiness.singleton;
  }

  /**
   * Update search template.
   * @returns {Promise<Object>}
   */
  async updateSearchTemplate() {
    if (!this.config?.enabled) {
      return { isSearchTemplateUpdated: false, reason: 'Elastic is not enabled in config.' };
    }
    if (!(this.config?.searchTemplatePushOnStart === true)) {
      return { isSearchTemplateUpdated: false, reason: 'Config param "searchTemplatePushOnStart" is disabled.' };
    }
    const { template: templateName } = this.config;
    let reason;
    try {
      const { acknowledged } = await this.elasticService.updateSearchTemplate(templateName);
      if (acknowledged) this.isSearchTemplateUpdated = true;
    } catch (error) {
      reason = `Error: ${error?.message}`;
      log.save('elactic-update-search-template-error', { error: error?.message, templateName });
    }
    return { templateName, isSearchTemplateUpdated: this.isSearchTemplateUpdated, reason };
  }
}

module.exports = ElasticBusiness;
