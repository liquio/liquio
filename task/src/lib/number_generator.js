const moment = require('moment');
const handlebars = require('handlebars');
const RedisClient = require('./redis_client');
const NumberTemplateModel = require('../models/number_template');

class NumberGenerator {
  /**
   * Number Generator constructor.
   */
  constructor() {
    // Define singleton.
    if (!NumberGenerator.singleton) {
      this.numberTemplateModel = new NumberTemplateModel();

      NumberGenerator.singleton = this;
    }
    return NumberGenerator.singleton;
  }

  /**
   * Generate
   * @param {number} numberTemplateId Number template ID.
   * @param {object} [options] Options.
   * @returns {Promise<string>}
   */
  async generate(numberTemplateId, options = {}) {
    // Define number template.
    const { data: numberTemplate } = await RedisClient.getOrSet(
      RedisClient.createKey('numberTemplate', 'findById', numberTemplateId),
      () => this.numberTemplateModel.findById(numberTemplateId),
    );
    if (!numberTemplate) {
      return;
    }

    // Define current increment.
    const currentIncrement = await this.numberTemplateModel.nextIncrement(numberTemplateId);
    if (!currentIncrement) {
      return;
    }

    // Add register helpers.
    handlebars.registerHelper('date', function(format) {
      return moment().format(format);
    });
    handlebars.registerHelper('idZerosPrefix', function(zerosCount) {
      return `${currentIncrement}`.padStart(zerosCount, '0');
    });
    handlebars.registerHelper('randomCharacterString', function (character = 'A-Z', stringLength = 3) {
      character = character.split('-');
      const from = Math.ceil(character[0].charCodeAt(0));
      const to = Math.floor(character[1].charCodeAt(0));

      let string = '';
      let i = 0;
      while (i < stringLength) {
        string += String.fromCharCode(Math.floor(Math.random() * ((to + 1) - from) + from));
        i++;
      }

      return string;
    });
    handlebars.registerHelper('timestamp', function (stringLength = 13) {
      const timestamp = Date.now().toString();
      return timestamp.substring(timestamp.length - stringLength, timestamp.length);
    });

    // Define and return number.
    let template;
    try {
      template = handlebars.compile(numberTemplate.template);
    } catch (error) {
      log.save('handlebars-compile-error', { error: error && error.message || error });
      throw new Error('Handlebars number generator error.', { cause: error });
    }
    const number = template({ ...options, id: currentIncrement });
    return number;
  }

  /**
   * Generate from raw template
   * @param {string} template
   * @param {number} currentIncrement
   * @returns {string}
   */
  generateFromRawTemplate(template, currentIncrement) {
    // Add register helpers.
    handlebars.registerHelper('date', function(format) {
      return moment().format(format);
    });
    handlebars.registerHelper('idZerosPrefix', function(zerosCount) {
      return `${currentIncrement}`.padStart(zerosCount, '0');
    });
    handlebars.registerHelper('randomCharacterString', function (character = 'A-Z', stringLength = 3) {
      character = character.split('-');
      const from = Math.ceil(character[0].charCodeAt(0));
      const to = Math.floor(character[1].charCodeAt(0));

      let string = '';
      let i = 0;
      while (i < stringLength) {
        string += String.fromCharCode(Math.floor(Math.random() * ((to + 1) - from) + from));
        i++;
      }

      return string;
    });
    handlebars.registerHelper('timestamp', function (stringLength = 13) {
      const timestamp = Date.now().toString();
      return timestamp.substring(timestamp.length - stringLength, timestamp.length);
    });

    // Define and return number.
    let generator;
    try {
      generator = handlebars.compile(template);
    } catch (error) {
      log.save('handlebars-compile-error', { error: error && error.message || error });
      throw new Error('Handlebars number generator error.', { cause: error });
    }
    const number = generator();
    return number;
  }
}

module.exports = NumberGenerator;
