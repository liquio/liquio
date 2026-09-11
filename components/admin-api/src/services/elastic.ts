import { HttpRequest } from '../lib/http_request';

/**
 * Elastic service.
 */
export class ElasticService {
  private static singleton: ElasticService;

  public headers: object;
  public host: string;
  public protocol: string;
  public searchTemplateBody: object;

  constructor(config?: any) {
    if (!ElasticService.singleton) {
      this.headers = config.headers;
      this.host = config.host;
      this.protocol = config.protocol;
      this.host = config.host;
      this.searchTemplateBody = config.searchTemplateBody || {};
      ElasticService.singleton = this;
    }

    return ElasticService.singleton;
  }

  /**
   * Update search template.
   * @param {string} templateName Template name.
   * @returns {Promise<Object>} Update search template response promise.
   */
  async updateSearchTemplate(templateName) {
    if (!templateName) {
      throw new Error('ElasticService.updateSearchTemplate: templateName params is required.');
    }
    const templateBody = this.searchTemplateBody;
    if (!templateBody) {
      throw new Error(`ElasticService.updateSearchTemplate: cannot find templateBody by name ${templateName}.`);
    }
    const requestOptions = {
      uri: `${this.protocol}://${this.host}/_scripts/${templateName}`,
      method: 'POST',
      headers: this.headers,
      body: templateBody,
      json: true,
    };

    try {
      return await HttpRequest.send(requestOptions);
    } catch (error) {
      global.log.save('elastic-service-update-search-template-error', {
        error: error?.message,
        requestOptions,
      });
      throw error;
    }
  }
}
