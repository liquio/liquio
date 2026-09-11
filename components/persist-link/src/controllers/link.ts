// Import.
import { getLog } from '../lib/context';
import Controller from './controller';
import FileConverterService from '../lib/file_converter';
import LinkGenerator from '../lib/link_generator';
import LinkProviders from '../lib/link_providers';
import Qr from '../lib/qr';
import TemplateModel from '../models/template';

/**
 * Link controller.
 */
class LinkController extends Controller {
  /**
   * Link controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    super(config);

    // Define singleton.
    if (!LinkController.singleton) {
      this.linkGenerator = new LinkGenerator(config.link_generator);
      this.linkProviders = new LinkProviders(config.link_providers);
      this.templateModel = new TemplateModel();
      this.qr = new Qr();
      this.fileConverter = new FileConverterService();
      LinkController.singleton = this;
    }
    return LinkController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    // Define params.
    const { qr } = req.query;
    const { type, options, small, definedHash } = req.body;
    const linkProvider = this.linkProviders.list[type];
    const isValidOptions = linkProvider && linkProvider.isValidOptions(options);

    // Check.
    if (!linkProvider) {
      getLog().save('create-link-error', {
        type,
        options,
        message: 'Provider not found for this type.',
      });
      return this.responseError(res, 'Provider not found for this type.', 400);
    }
    if (!isValidOptions) {
      getLog().save('create-link-error', { type, options, message: 'Invalid provider options.' });
      return this.responseError(res, 'Invalid provider options.', 400);
    }

    // Create persist link.
    let link;
    try {
      if (definedHash && (await this.linkGenerator.findLinkByHash(definedHash))) {
        return this.responseError(res, 'Already exists.', 400);
      }

      link = await this.linkGenerator.generateLinkByData({ type, options, small, definedHash });
    } catch (error) {
      getLog().save('link-generation-error', {
        type,
        options,
        small,
        definedHash,
        error: error && error.message,
      });
      return this.responseError(res, "Can't generate link.");
    }

    // Generate QR if need it.
    let qrCode;
    try {
      qrCode = await this.qr.getByType(link, qr);
    } catch (error) {
      getLog().save('qr-generation-error', { link, error: error && error.message });
    }

    // Response.
    this.responseData(res, qrCode ? { link, qrCode } : link);
  }

  /**
   * Open.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async open(req, res) {
    // Define params.
    const { hash } = req.params;
    const {
      response_type: responseType,
      show_in_browser: _showInBrowser,
      convert: _convert,
      source_format: sourceFormat,
      target_format: targetFormat,
    } = req.query;
    const showInBrowser = _showInBrowser === 'true' ? true : false;
    const convert = _convert === 'true' ? true : false;

    let data;
    try {
      data = await this.linkGenerator.defineDataByLink(hash);
    } catch (error) {
      getLog().save('open-link-parse-data-error', { error: error && error.message });
      return this.responseError(res, 'Wrong URL.');
    }
    const { type, options } = data;
    const linkProvider = this.linkProviders.list[type];

    // Check.
    if (!linkProvider) {
      getLog().save('open-link-error', { type, options, message: 'Provider not found.' });
      return this.responseError(res, 'Provider not found.');
    }

    // Open and convert.
    if (convert) {
      return this.#openAndConvert(linkProvider, options, res, responseType, { showInBrowser, sourceFormat, targetFormat });
    }

    // Open.
    try {
      linkProvider.open(options, res, responseType, { showInBrowser });
    } catch (error) {
      getLog().save('open-link-error', { type, options, message: error.message });
      return this.responseError(res, 'Provider error.');
    }
  }

  /**
   * Get template.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getTemplate(req, res) {
    // Define params.
    const { hash } = req.params;
    const { response_type: responseType } = req.query;
    let data;
    try {
      data = await this.linkGenerator.defineDataByLink(hash);
    } catch (error) {
      getLog().save('open-link-template-parse-data-error', { error: error && error.message });
      return this.responseError(res, 'Wrong URL.');
    }
    const { type, options } = data;
    const linkProvider = this.linkProviders.list[type];

    // Check.
    if (!linkProvider) {
      getLog().save('open-link-template-error', { type, options, message: 'Provider not found.' });
      return this.responseError(res, 'Provider not found.');
    }

    // Open.
    try {
      linkProvider.getTemplate(options, res, responseType);
    } catch (error) {
      getLog().save('open-link-template-error', { type, options, message: error.message });
      return this.responseError(res, 'Provider error.');
    }
  }

  /**
   * Get templates.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getTemplates(req, res) {
    // Get templates.
    try {
      const templates = await this.templateModel.getAll();

      // Response.
      return this.responseData(res, templates);
    } catch (error) {
      getLog().save('get-templates-error', { error: error && error.message });
      return this.responseError(res, "Can't get templates.");
    }
  }

  /**
   * Find template by id.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findTemplateById(req, res) {
    // Find template.
    try {
      const template = await this.templateModel.findById(req.params.id);

      // Response.
      return this.responseData(res, template);
    } catch (error) {
      getLog().save('find-template-by-id-error', { error: error && error.message });
      return this.responseError(res, "Can't find template.");
    }
  }

  /**
   * Create template.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createTemplate(req, res) {
    // Create template.
    try {
      const template = await this.templateModel.create(req.body);

      // Response.
      return this.responseData(res, template);
    } catch (error) {
      getLog().save('create-template-error', { error: error && error.message });
      return this.responseError(res, "Can't create template.");
    }
  }

  /**
   * Update template.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateTemplate(req, res) {
    // Update template.
    try {
      const template = await this.templateModel.update(req.params.id, req.body);

      // Response.
      return this.responseData(res, template);
    } catch (error) {
      getLog().save('update-template-error', { error: error && error.message });
      return this.responseError(res, "Can't update template.");
    }
  }

  /**
   * Delete template.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteTemplate(req, res) {
    // Delete template.
    try {
      const template = await this.templateModel.findById(req.params.id);
      if (!template) {
        return this.responseError(res, "Can't find template.");
      }

      await this.templateModel.delete(req.params.id);

      // Response.
      return this.responseData(res, {});
    } catch (error) {
      getLog().save('delete-template-error', { error: error && error.message });
      return this.responseError(res, "Can't delete template.");
    }
  }

  /**
   * Open and convert file.
   * Gets file stream from provider, converts it to target format and streams to client.
   * @param {object} linkProvider Link provider instance.
   * @param {object} options Provider options.
   * @param {object} res HTTP response.
   * @param {string} responseType Response type.
   * @param {object} additionalOptions Additional options.
   * @param {boolean} additionalOptions.showInBrowser Should show file in browser.
   * @param {string} additionalOptions.sourceFormat Source file format.
   * @param {string} additionalOptions.targetFormat Target file format.
   */
  async #openAndConvert(linkProvider, options, res, responseType, { showInBrowser, sourceFormat, targetFormat }) {
    // Check formats.
    if (!sourceFormat || !targetFormat) {
      getLog().save('open-and-convert-missing-formats', {
        sourceFormat,
        targetFormat,
      });
      return this.responseError(res, 'Source and target formats are required.', 400);
    }

    // Get file stream from provider.
    let incomingFileStream;
    try {
      incomingFileStream = await linkProvider.getFileStream(options);

      // Check if provider supports file stream.
      if (!incomingFileStream) {
        getLog().save('open-and-convert-error', {
          options,
          message: 'Provider does not support file stream.',
        });
        return this.responseError(res, 'File conversion not supported for this provider.', 400);
      }
    } catch (error) {
      getLog().save('open-and-convert-get-stream-error', {
        options,
        error: error?.message,
      });
      return this.responseError(res, 'Failed to get file stream.');
    }

    // Convert file.
    let convertedStream;
    try {
      // Generate filename for logging.
      const fileName = `file_${options.fileId || 'unknown'}.${sourceFormat}`;
      convertedStream = await this.fileConverter.convertByStream(incomingFileStream, {
        fileName,
        sourceFormat,
        targetFormat,
      });
    } catch (error) {
      getLog().save('open-and-convert-conversion-error', {
        options,
        sourceFormat,
        targetFormat,
        error: error?.message,
      });
      return this.responseError(res, 'File conversion failed.');
    }

    // Stream to client.
    try {
      const handleStreamError = (error) => {
        getLog().save('open-and-convert-stream-error', {
          error: error?.message,
          options,
        });
      };

      // Set headers.
      if (showInBrowser) {
        res.setHeader('Content-Disposition', 'inline');
      }

      convertedStream.on('error', handleStreamError).pipe(res).on('error', handleStreamError);
    } catch (error) {
      getLog().save('open-and-convert-pipe-error', {
        options,
        error: error?.message,
      });
      return this.responseError(res, 'Failed to stream converted file.');
    }
  }
}

// Export.
export default LinkController;
