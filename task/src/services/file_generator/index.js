const moment = require('moment');
const handlebars = require('handlebars');
const qrImage = require('qr-image');

const Options = require('./options');
const typeOf = require('../../lib/type_of');

/**
 * File generator service.
 * @typedef {import('./options/option')} Option
 * @typedef {import('../../entities/document_template')} DocumentTemplateEntity
 * @typedef {import('../../entities/document')} DocumentEntity
 * @typedef {import('../../entities/workflow')} WorkflowEntity
 */
class FileGeneratorService {
  /**
   * Constructor.
   * @param {typeof Option[]} customOptions Custom option list.
   */
  constructor(customOptions = []) {
    // Define singleton.
    if (!FileGeneratorService.singleton) {
      this.initOptions(customOptions);
      FileGeneratorService.singleton = this;
    }
    return FileGeneratorService.singleton;
  }

  /**
   * Init options.
   * @param {typeof Option[]} customOptions Custom options.
   * @private
   */
  initOptions(customOptions) {
    this.options = new Options(customOptions);
  }

  /**
   * Handlebar helper functions
   */
  handlebarHelpers() {
    return {
      eq: function (v1, v2) {
        return v1 === v2;
      },
      ne: function (v1, v2) {
        return v1 !== v2;
      },
      includes: function (array, value) {
        return array.includes(value);
      },
      contains: function (needle, haystack, options) {
        needle = handlebars.escapeExpression(needle);
        haystack = handlebars.escapeExpression(haystack);
        return haystack.indexOf(needle) > -1 ? options.fn(this) : options.inverse(this);
      },
      increment: function (index) {
        index++;
        return index;
      },
      dateFormat: function (date, format) {
        const isDateObject = date && typeof date === 'object' && date.day && date.month && date.year;
        const dateString = isDateObject
          ? `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
          : date;
        return moment(dateString, isDateObject && 'YYYY-MM-DD').format(format) || '';
      },
      formatNumberFinancial: function (number, afterPoint) {
        const fractionalPartLength = +afterPoint || 0;
        const n = 10 ** fractionalPartLength;
        const roundedNumber = (Math.round(+number * n) / n).toFixed(fractionalPartLength);

        const [p1, p2] = `${roundedNumber}`.split('.');

        const formatedPart = Intl.NumberFormat('uk-UA').format(p1);
        const floatPart = p2 ? `,${p2}` : '';

        return `${formatedPart}${floatPart}`;
      },
      generateQr: (link) => {
        let preparedLink;
        if (typeof link === 'string' && link !== '') {
          preparedLink = link;
        } else if (typeof link === 'object' && typeof link.host !== 'undefined' && typeof link.hash !== 'undefined') {
          preparedLink = `${link.host}/${link.hash}`;
        } else {
          return;
        }
        const qr = qrImage.imageSync(`${preparedLink}`, { type: 'png' });
        return `data:image/png;base64,${Buffer.from(qr, 'utf8').toString('base64')}`;
      },
      gt: (v1, v2) => Number(v1) > Number(v2),
      lt: (v1, v2) => Number(v1) < Number(v2),
      gte: (v1, v2) => Number(v1) >= Number(v2),
      lte: (v1, v2) => Number(v1) <= Number(v2),
      or: (...args) => {
        args.pop();
        return args.length > 2 && args.some(arg => !!arg) || false;
      },
      and: (...args) => {
        args.pop();
        return args.length > 2 && args.every(arg => !!arg) || false;
      },
      sortBy: (valToSort, field, order = 'ASC') => {
        if (typeOf(valToSort) !== 'array' && typeOf(order) !== 'string') return valToSort;
        const orderNormalized = order.toUpperCase().trim();
        if (!['ASC', 'DESC'].includes(orderNormalized)) return valToSort;
        return valToSort.sort((a, b) => a[field] > b[field] ? (orderNormalized === 'ASC' ? 1 : -1) : (orderNormalized === 'ASC' ? -1 : 1));
      },
      size: (v) => {
        const type =  typeOf(v);
        if (['string', 'array'].includes(type)) return v.length;
        if (type === 'object') return Object.keys(v).length;
      },
    };
  }

  /**
   * Create HTML.
   * @param {object} options Options.
   * @param {WorkflowEntity} options.workflow Workflow entity.
   * @param {DocumentTemplateEntity} options.documentTemplate Document template entity.
   * @param {DocumentEntity} options.document Document entity.
   * @param {object} options.staticFileOptions Static file options.
   * @returns {Promise<string>} HTML content promise.
   */
  async createHtml({ workflow, documentTemplate, document, staticFileOptions, variables = {} }) {
    // Prepare html using Handlebars.
    handlebars.registerHelper(this.handlebarHelpers());

    const template = handlebars.compile(documentTemplate.htmlTemplate);
    documentTemplate.htmlTemplate = template({ ...variables, ...document.data, workflow });

    // Define options.
    const options = await this.options.getOptions({
      documentTemplateSchema: documentTemplate.jsonSchema,
      documentData: document.data,
      staticFileOptions
    });

    // Create document HTML.
    const documentHtml = this.options.replaceAllKeys(documentTemplate.htmlTemplate, options);
    const documentHtmlWithoutNotReplacesKeys = this.options.clearNotReplacedKeys(documentHtml);
    return documentHtmlWithoutNotReplacesKeys;
  }

  /**
   * Create PDF.
   * @param {string} html HTML content.
   * @param {object} [options] PDF options.
   * @param {string|number} [options.timeout] Timeout.
   * @param {'portrait'|'landscape'} [options.orientation] Orientation.
   * @param {{top, right, bottom, left}} [options.border] Pages border.
   * @param {'A3'|'A4'|'A5'|'Legal'|'Letter'|'Tabloid'} [options.format] Pages format.
   * @param {string} [options.height] Page height. Allowed units: `mm`, `cm`, `in`, `px`. Option `format` not used in this case.
   * @param {string} [options.width] Page width. Allowed units: `mm`, `cm`, `in`, `px`. Option `format` not used in this case.
   * @returns {Promise<Buffer>} Buffer promise.
   */
  async createPdf(html, options = {}) {
    const pdfConfig = global.config.pdf_generator || {};
    if (!pdfConfig.url || !pdfConfig.basicAuthToken) {
      throw new Error('PDF generator config is missing url or basicAuthToken');
    }

    const pdfOptions = this.preparePdfOptions(options);
    const body = JSON.stringify({ html, options: pdfOptions });
    const requestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pdfConfig.basicAuthToken,
      },
      body,
      timeout: pdfConfig.requestTimeout || pdfOptions.timeout,
    };

    try {
      const response = await global.httpClient.request(
        pdfConfig.url,
        requestInit,
        'file-generator:create-pdf',
        { isNonSensitiveDataRegime: true }
      );
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      log.save('pdf-generator-request-error', { error: error.toString(), stack: error.stack }, 'error');
      throw error;
    }
  }

  preparePdfOptions(options) {
    const pdfOptions = {};

    if (options.timeout) {
      pdfOptions.timeout = Number(options.timeout);
    }
    if (options.orientation) {
      pdfOptions.orientation = options.orientation;
    }
    if (options.border && Object.keys(options.border).length) {
      pdfOptions.border = { ...options.border };
    }
    if (options.format) {
      pdfOptions.format = options.format;
    }
    if (options.height) {
      pdfOptions.height = options.height;
      pdfOptions.format = undefined;
    }
    if (options.width) {
      pdfOptions.width = options.width;
      pdfOptions.format = undefined;
    }

    return pdfOptions;
  }
}

module.exports = FileGeneratorService;
