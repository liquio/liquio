// Import.
import _ from 'lodash';
import handlebars from 'handlebars';
import moment from 'moment';
import pdf from 'html-pdf';
import qrImage from 'qr-image';

import { getConfig, getLog } from '../../context';
import FilestorageHandler from '../filestorage/filestorage_handler';
import LinkProvider from '../link_provider';
import RegisterProvider from './providers/register';
import Sandbox from '../../../lib/sandbox';
import TemplateModel from '../../../models/template';

// Constants.
const CONTENT_TYPE_HEADER = 'Content-Type';
const RESPONSE_NOT_FOUND_CODE = 404;
const RESPONSE_NOT_FOUND_OBJECT = {
  error: {
    message: 'Not found.',
  },
};

/**
 * External link provider.
 */
class ExternalLinkProvider extends LinkProvider {
  /**
   * External link provider constructor.
   * @param {object} config Provider config.
   */
  constructor(config) {
    // Define singleton.
    if (!ExternalLinkProvider.singleton) {
      super(config);
      this.templateModel = new TemplateModel();
      this.provider = {
        register: new RegisterProvider(config.register),
      };
      const appConfig = getConfig();
      this.sandbox = new Sandbox(appConfig.sandbox);
      this.filestorageHandler = new FilestorageHandler(appConfig.link_providers.filestorage);

      ExternalLinkProvider.singleton = this;
    }
    return ExternalLinkProvider.singleton;
  }

  /**
   * Is valid data.
   * @param {object} options Options.
   * @param {string} options.serverName Filestorage server name.
   * @param {string} options.fileId File ID.
   * @returns {boolean} Is valid options indicator.
   */
  isValidOptions(options) {
    // Check if not valid.
    if (
      typeof options !== 'object' ||
      typeof options.templateName !== 'string' ||
      typeof options.templateMethod !== 'string' ||
      typeof options.filter !== 'object'
    ) {
      return false;
    }

    return true;
  }

  /**
   * Open.
   * @param {object} options Options.
   * @param {string} options.templateName Template name.
   * @param {string} options.templateMethod Template method.
   * @param {object} options.filter Filter.
   * @param {object} res HTTP response.
   * @param {string} [responseFormat] Response format.
   */
  async open(options, res, responseFormat = 'html') {
    try {
      // Check.
      const isValidData = this.isValidOptions(options);
      if (!isValidData) {
        res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
      }

      // Define params.
      const { templateName, filter } = options;
      let { templateMethod } = options;

      getLog().save('external-link-provider-options', options);

      const template = await this.templateModel.findByNameAndMethod(templateName, templateMethod);
      if (!template) {
        return res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
      }

      if (templateName === 'register' && typeof this.provider[templateName][templateMethod] !== 'function') {
        templateMethod = 'getRecord';
      }

      const data = await this.provider[templateName][templateMethod](filter);

      // Check connection.
      if (!data) {
        return res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
      }

      let preparedData = {
        global: {
          currentDate: moment().format('DD.MM.YYYY'),
        },
      };

      if (template.jsonMap) {
        for (const [key, value] of Object.entries(template.jsonMap)) {
          if (value.startsWith('async (') || value.startsWith('(')) {
            preparedData[key] = await this.sandbox.evalWithArgs(value, [{ recordData: data }], {
              isAsync: true,
              global: { getFileBase64: this.getFileBase64.bind(this) },
              meta: { fn: key, caller: 'ExternalLinkProvider.open' },
            });
          } else {
            preparedData[key] = _.get(data, value);
          }
        }
      }

      if (responseFormat === 'json') {
        return res.status(200).send(preparedData);
      }

      handlebars.registerHelper({
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
        sum: function (...args) {
          const values = args.slice(0, -1);
          return values.reduce((acc, val) => {
            const num = Number(val);
            return isNaN(num) ? acc : acc + num;
          }, 0);
        },
        dateFormat: function (date, format) {
          return moment(date).format(format);
        },
        generateQr: (link) => {
          let preparedLink = '';
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
      });

      if (responseFormat !== 'pdf') {
        const handlebarsTemplate = handlebars.compile(template.html);
        const html = handlebarsTemplate(preparedData);
        return res.set(CONTENT_TYPE_HEADER, 'text/html; charset=utf-8').status(200).send(html);
      }

      const handlebarsTemplate = handlebars.compile(template.pdf);
      let html = handlebarsTemplate(preparedData);

      // Check if landscape PDF orientation.
      const landscapeFormat = !!html.match('<landscape_orientation>');

      // Check if borders defined.
      const getTagContentByPattern = (pattern) => {
        const borderValue =
          ((((html.match(pattern) || [])[0] || '').match(/>.+</gi) || [])[0] || '')
            .split('')
            .filter((v) => !['>', '<'].includes(v))
            .join('') || null;
        const toRemove = (html.match(pattern) || [])[0];
        if (toRemove) {
          html = html.replace(toRemove, '');
        }
        return borderValue;
      };

      const pdfBorderTop = getTagContentByPattern(/<pdf-border-top>.+<\/pdf-border-top>/gi);
      const pdfBorderRight = getTagContentByPattern(/<pdf-border-right>.+<\/pdf-border-right>/gi);
      const pdfBorderBottom = getTagContentByPattern(/<pdf-border-bottom>.+<\/pdf-border-bottom>/gi);
      const pdfBorderLeft = getTagContentByPattern(/<pdf-border-left>.+<\/pdf-border-left>/gi);
      const pdfFooterHeight = getTagContentByPattern(/<pdf-footer-height>.+<\/pdf-footer-height>/gi);
      const pdfFormat = getTagContentByPattern(/<pdf-format>.+<\/pdf-format>/gi);
      const pdfHeight = getTagContentByPattern(/<pdf-height>.+<\/pdf-height>/gi);
      const pdfWidth = getTagContentByPattern(/<pdf-width>.+<\/pdf-width>/gi);

      getTagContentByPattern(/<pdf-engine>.+<\/pdf-engine>/gi);

      let pdfOptions = {
        orientation: landscapeFormat ? 'landscape' : 'portrait',
        border: {},
      };
      if (template.options && template.options.pdfOptions) {
        pdfOptions = {
          ...pdfOptions,
          ...template.options.pdfOptions,
        };
      }
      if (pdfBorderTop) {
        pdfOptions.border.top = pdfBorderTop;
      }
      if (pdfBorderRight) {
        pdfOptions.border.right = pdfBorderRight;
      }
      if (pdfBorderBottom) {
        pdfOptions.border.bottom = pdfBorderBottom;
      }
      if (pdfBorderLeft) {
        pdfOptions.border.left = pdfBorderLeft;
      }
      if (pdfFooterHeight) {
        pdfOptions.footer = { height: pdfFooterHeight };
      }
      if (pdfFormat) {
        pdfOptions.format = pdfFormat;
      }
      if (pdfHeight) {
        pdfOptions.height = pdfHeight;
      }
      if (pdfWidth) {
        pdfOptions.width = pdfWidth;
      }

      res.set(CONTENT_TYPE_HEADER, 'application/pdf');
      pdf.create(html, pdfOptions).toStream((err, stream) => {
        if (err) {
          getLog().save('external-provider-error', { error: err && err.message });
          return res.status(500).send({ error: 'External provider error.' });
        }
        stream.pipe(res);
      });
    } catch (error) {
      getLog().save('external-provider-error', { error: error && error.message });
      res.status(500).send({ error: 'External provider error.' });
    }
  }

  /**
   * @param {string} link
   * @return {Promise<string>}
   */
  async getFileBase64(link) {
    const connection = this.config.register.filestorageServerName;
    if (!connection) {
      throw new Error('ExternalLinkProvider.getFileBase64. Cannot get file storage connection from config.');
    }

    const filestorageConnection = this.filestorageHandler.connections[connection];

    const fileBuffer = await filestorageConnection.downloadFileWithoutStream(link);

    return Buffer.from(fileBuffer).toString('base64');
  }

  /**
   * Get template.
   * @param {object} options Options.
   * @param {string} options.templateName Template name.
   * @param {string} options.templateMethod Template method.
   * @param {object} options.filter Filter.
   * @param {object} res HTTP response.
   */
  async getTemplate(options, res) {
    try {
      // Check.
      const isValidData = this.isValidOptions(options);
      if (!isValidData) {
        res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
      }

      // Define params.
      const { templateName, templateMethod } = options;

      getLog().save('external-link-provider-options', options);

      const template = await this.templateModel.findByNameAndMethod(templateName, templateMethod);
      if (!template) {
        return res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
      }

      res.status(200).send({
        id: template.id,
        html: template.html,
        pdf: template.pdf,
        pdfOptions: template.options?.pdfOptions || {},
      });
    } catch (error) {
      getLog().save('external-provider-error', { error: error && error.message });
      res.status(500).send({ error: 'External provider error.' });
    }
  }
}

// Export.
export default ExternalLinkProvider;
