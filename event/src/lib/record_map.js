const crypto = require('crypto');
const PropByPath = require('prop-by-path');
const { randomUUID } = crypto;

const PersistLink = require('./persist_link');
const Filestorage = require('./filestorage');
const Sandbox = require('./sandbox');

// Constants.
const RANDOM_PART_MIN = 100000000000;
const RANDOM_PART_MAX = 999999999999;
const MAP_ENTRIES_EVAL_ERROR = 'You have error on "map.%s". Details: "%d"!';

/**
 * Record map.
 * @typedef {import('../entities/document')} DocumentEntity
 */
class RecordMap {
  /**
   * Record map constructor.
   * @param {string|{recordId: string, registerId: number, keyId: number, map: object}} rawRecord RAW record function string (sample: `(documents) => { return ...; }`) or object (sample: `{ registerId: 1, keyId: 2, map: { prop1: 'documents.123.data.someStep.someProp' } }`).
   * @param {DocumentEntity[]} documents Workflow documents.
   * @param {EventEntity[]} events Workflow events.
   * @param {number} [arrayIndex] Array index.
   * @param {number} [eventTemplateId] Event template ID.
   */
  constructor(rawRecord, documents, events = [], arrayIndex, eventTemplateId) {
    this.rawRecord = rawRecord;
    this.documents = documents;
    this.events = events;
    this.arrayIndex = arrayIndex;
    this.eventTemplateId = eventTemplateId;
    this.sandbox = Sandbox.getInstance();

    // Prepare documents template IDs.
    // Sample: { 11: { data: { cancellation: { text: "abc" } } } }.
    this.documentsByTemplateIds = {};
    this.documents.forEach((v) => (this.documentsByTemplateIds[v.documentTemplateId] = v));

    // Return context.
    return this;
  }

  /**
   * Get record.
   * @returns {Promise<object>} Prepared record to save to register promise.
   */
  async getRecord() {
    // Check if function string.
    if (this.rawRecordIsFunctionString) {
      return this.getRecordIfFunctionString();
    }

    // Check if object.
    if (this.rawRecordIsObject) {
      return await this.getRecordIfObject();
    }
  }

  /**
   * Get record if function string.
   * @private
   * @returns {object} Prepared record to save to register.
   */
  getRecordIfFunctionString() {
    // Create function from string and call with workflow documents list as param.
    const transformedFunctionString = this.transformFunctionToAsync(this.rawRecord);
    return this.sandbox.evalWithArgs(transformedFunctionString, [this.documents, this.events], { eventTemplateId: this.eventTemplateId });
  }

  /**
   * Get record if object.
   * @private
   * @returns {Promise<object>} Prepared record to save to register promise.
   */
  async getRecordIfObject() {
    // Get RAW record params.
    const { recordId: rawRecordId, recordIds: rawRecordIds, registerId, keyId, allowTokens: rawAllowTokens, person: rawPerson, map } = this.rawRecord;
    const recordId = this.getRecordId(rawRecordId || rawRecordIds);
    const allowTokens = this.getAllowTokens(rawAllowTokens);
    const person = this.getPerson(rawPerson);

    // Record data container.
    let recordData = {};

    // Handle record data properties.
    const mapEntries = Object.entries(map);
    for (const [mapEntryKey, mapEntryValue] of mapEntries) {
      try {
        // Check map entry value.
        if (typeof mapEntryValue !== 'string') {
          continue;
        }

        // Define record data param if ID number definition.
        if (mapEntryValue === 'id.number') {
          recordData[mapEntryKey] = this.getRecordDataValueAsIdNumber();
          continue;
        }

        // Define record data param if ID string definition.
        if (mapEntryValue === 'id.string') {
          recordData[mapEntryKey] = this.getRecordDataValueAsIdString();
          continue;
        }

        // Define record data param if document path.
        if (mapEntryValue.startsWith('documents.')) {
          recordData[mapEntryKey] = this.getRecordDataValueAsDocumentsPath(mapEntryValue);
          continue;
        }

        // Define record data param if customPath.
        if (mapEntryValue.startsWith('custom.')) {
          recordData[mapEntryKey] = await this.getRecordDataValueAsCustomPathResult(mapEntryValue);
          continue;
        }

        // Define record data param as function in other cases.
        recordData[mapEntryKey] = await this.getRecordDataValueAsFunctionString(mapEntryValue);
      } catch (error) {
        log.save('eval-error', { error: error && error.message });
        throw new Error(MAP_ENTRIES_EVAL_ERROR.replace('%s', mapEntryKey).replace('%d', (error && error.message) || error));
      }
    }

    // Define and return record with prepared data.
    const record = { recordId, registerId, keyId, allowTokens, person, data: recordData };
    return record;
  }

  /**
   * Get record ID.
   * @param {string} rawRecordId RAW record ID.
   * @returns {string} Record ID.
   */
  getRecordId(rawRecordId) {
    // Check if no need to handle (return as is).
    if (typeof rawRecordId !== 'string' || !rawRecordId.startsWith('(')) {
      return rawRecordId;
    }

    // Handle list updating.
    if (typeof this.arrayIndex !== 'undefined') {
      const options = { eventTemplateId: this.eventTemplateId };
      const recordId = this.sandbox.evalWithArgs(rawRecordId, [this.documents, this.events], options)[this.arrayIndex];
      return recordId;
    }

    // Handle in other case.
    const options = { eventTemplateId: this.eventTemplateId };
    const recordId = this.sandbox.evalWithArgs(rawRecordId, [this.documents, this.events], options);
    return recordId;
  }

  /**
   * Get allow tokens.
   * @param {string|string[]} rawAllowTokens RAW allow tokens.
   * @returns {string[]} Allow tokens.
   */
  getAllowTokens(rawAllowTokens) {
    // Check if no need to handle (return as is).
    if (typeof rawAllowTokens !== 'string') {
      return rawAllowTokens;
    }

    // Handle in other case.
    const allowToken = this.sandbox.evalWithArgs(rawAllowTokens, [this.documents, this.events], { eventTemplateId: this.eventTemplateId });
    return allowToken;
  }

  /**
   * Get person.
   * @param {string|string[]} rawPerson RAW person.
   * @returns {{id: string, name: string}} Person.
   */
  getPerson(rawPerson) {
    // Check if no need to handle (return as is).
    if (typeof rawPerson !== 'string') {
      return rawPerson;
    }

    // Handle in other case.
    const person = this.sandbox.evalWithArgs(rawPerson, [this.documents, this.events], { eventTemplateId: this.eventTemplateId });
    return person;
  }

  /**
   * Get record data value as function string.
   * @private
   * @param {string} mapEntryValue Map entry value. Sample: `(documents) => { return documents.find(v => v.documentTemplateId === 123).data.someStep.someProp; }`.
   * @returns {Promise<any>} Defined value promise.
   */
  async getRecordDataValueAsFunctionString(mapEntryValue) {
    // Define and return record data value.
    const normalizedMapEntryValue =
      typeof this.arrayIndex === 'undefined'
        ? mapEntryValue
        : mapEntryValue.replace('.X.', `.${this.arrayIndex}.`).replace(/\[X\]/g, `[${this.arrayIndex}]`);
    const transformedFunctionString = this.transformFunctionToAsync(normalizedMapEntryValue);
    const options = { eventTemplateId: this.eventTemplateId, isAsync: true };
    return await this.sandbox.evalWithArgs(transformedFunctionString, [this.documents, this.events], options);
  }

  /**
   * Get record data value as documents path.
   * @private
   * @param {string} mapEntryValue Map entry value. Sample: `documents.123.data.someStep.someProp`.
   * @returns {any} Defined value.
   */
  getRecordDataValueAsDocumentsPath(mapEntryValue) {
    // Define documents property path.
    // Map entry value sample: `documents.11.data.cancellation.text`.
    // Documents property path sample: `11.data.cancellation.text`.
    const documentsPropertyPath = mapEntryValue.split('.').slice(1).join('.');
    const normalizedDocumentsPropertyPath =
      typeof this.arrayIndex === 'undefined' ? documentsPropertyPath : documentsPropertyPath.replace('.X.', `.${this.arrayIndex}.`);

    // Define record data value.
    // Sample: "abc".
    let recordDataValue = PropByPath.get(this.documentsByTemplateIds, normalizedDocumentsPropertyPath);
    if (recordDataValue === null) {
      recordDataValue = undefined;
    }
    return recordDataValue;
  }

  /**
   * Get record data value as ID number.
   * @private
   */
  getRecordDataValueAsIdNumber() {
    return getIdAsNumber();
  }

  /**
   * Get record data value as ID string.
   * @private
   */
  getRecordDataValueAsIdString() {
    return getIdAsString();
  }

  /**
   * Get record data value as custom path result.
   * @private
   */
  async getRecordDataValueAsCustomPathResult(mapEntryValue) {
    const [, customServiceAndMethod] = mapEntryValue.split('custom.');
    const allowedCustomServicesAndMethods = ['courts.generate-executive-document-number'];
    if (!allowedCustomServicesAndMethods.includes(customServiceAndMethod)) {
      const error = new Error('Passed customServiceAndMethod is not allowed');
      error.details = { allowedCustomMethods: allowedCustomServicesAndMethods, passedCustomServiceAndMethod: customServiceAndMethod };
      throw error;
    }
    switch (customServiceAndMethod) {
      case 'courts.generate-executive-document-number':
        return await this.customCourtsGenerateExecutiveDocumentNumber();
      default:
        break;
    }
  }

  /**
   * Generate executive document number.
   * If mapEntryValue = 'custom.courts.generate-executive-document-number'
   * @private
   */
  async customCourtsGenerateExecutiveDocumentNumber() {
    const startTimestamp = Date.now(); // TODO: remove it after test.
    const {
      options: { executorIssuerCode: executorIssuerCodeFunction },
    } = this.rawRecord;
    const currentYear = new Date().getFullYear();
    let newSequenceNumber;
    try {
      newSequenceNumber = await this.getSequenceNumberByYear(currentYear);
    } catch (error) {
      error.details = 'Can\'t get sequence number by year.';
      throw error;
    }
    const newSequenceNumberString = `${newSequenceNumber}`.padStart(7, '0');
    let executorIssuerCode;
    try {
      const options = { eventTemplateId: this.eventTemplateId };
      executorIssuerCode = this.sandbox.evalWithArgs(executorIssuerCodeFunction, [this.documents, this.events], options);
    } catch (error) {
      error.details = 'Error while evaluation executorIssuerCode function.';
      throw error;
    }
    log.save('custom-courts-generate-executive-document-number', {
      executingTime: `${Date.now() - startTimestamp} ms`,
      number: `${executorIssuerCode}.${currentYear}.${newSequenceNumberString}`,
    }); // TODO: remove it after test.
    return `${executorIssuerCode}.${currentYear}.${newSequenceNumberString}`;
  }

  /**
   * Get sequence number by year.
   * @param {string} year Year`.
   * @returns {integer} sequence number.
   */
  async getSequenceNumberByYear(year) {
    const startTimestamp = Date.now(); // TODO: remove it after test.
    const sequenceName = `courts_exetutive_doc_number_sequence_in_year_${year}`;
    await models.rawQueryModel.createSequence(sequenceName);
    const nextval = await models.rawQueryModel.getNextvalOfSequence(sequenceName);
    log.save('custom-courts-get-sequence-number-by-year', { executingTime: `${Date.now() - startTimestamp} ms`, nextval, year }); // TODO: remove it after test.
    return nextval;
  }

  /**
   * RAW record is function string.
   * @private
   * @returns {boolean} RAW record is function string indicator.
   */
  get rawRecordIsFunctionString() {
    // Return indicator result.
    return typeof this.rawRecord === 'string' && this.rawRecord.startsWith('(');
  }

  /**
   * RAW record is object.
   * @private
   * @returns {boolean} RAW record is object indicator.
   */
  get rawRecordIsObject() {
    // Return indicator result.
    return typeof this.rawRecord === 'object';
  }

  /**
   * Transform function to async.
   * @param {string} functionString Function string.
   * @returns {string} Async function string.
   */
  transformFunctionToAsync(functionString) {
    // Define params.
    const ASYNC_FUNCTIONS_INSIDE = ['plinkFromFilestoragePdf', 'plinkFromFilestorageAttach'];
    const isFunctionStringContainsAsyncFunction = ASYNC_FUNCTIONS_INSIDE.some(
      (v) => functionString.includes(v) && !functionString.includes(`await ${v}`),
    );

    // Return as is if async function not used.
    if (!isFunctionStringContainsAsyncFunction) {
      return functionString;
    }

    // Transform to async.
    let asyncFunctionString = functionString;
    if (!asyncFunctionString.startsWith('async')) {
      asyncFunctionString = `async ${asyncFunctionString}`;
    }
    for (const asyncFunctionInside of ASYNC_FUNCTIONS_INSIDE) {
      asyncFunctionString = asyncFunctionString.replace(new RegExp(asyncFunctionInside, 'g'), `await ${asyncFunctionInside}`);
    }

    // Return transformed function.
    return asyncFunctionString;
  }
}

/**
 * Get deep link.
 * @param {string} method Method.
 * @returns {Promise<{method, host, hash}>} Deep link object.
 */
// eslint-disable-next-line no-unused-vars
async function deepLink(method) {
  return {
    method,
    host: config.persist_link.qrFrontUrl || config.persist_link.server,
    hash: crypto.randomBytes(16).toString('hex'),
  };
}

/**
 * Plink from filestorage attach.
 * @param {{link, name, type}} attach Attach object.
 * @param {object} additionalOptions Additional options.
 * @param {boolean} additionalOptions.isIncludeP7s Is include p7s file.
 * @returns {Promise<{url, name, type}>} File object.
 */
// eslint-disable-next-line no-unused-vars
async function plinkFromFilestorageAttach(attach, { isIncludeP7s = false, linkEnding = '' } = {}) {
  // Define params.
  const { link, name, type } = attach || {};

  // Check.
  if (!link || !name || !type) {
    // Log and exit.
    log.save('plink-from-filestorage-attach-params-error', { attach: attach || null });
    return;
  }

  // Init Persist Link.
  const persistLink = new PersistLink(config.persist_link);

  // Define URL and create Persist Link record.
  const preparedHash = Buffer.from(link.slice(0, 16).toString('hex')) + crypto.randomBytes(64).toString('hex') + linkEnding;
  // const url = `${config.persist_link.server}/${preparedHash}`;
  let url;
  try {
    url = await persistLink.getLinkToStaticFileInFilestorage(link, preparedHash);
  } catch (error) {
    log.save('plink-from-filestorage-attach-create-plink-url-error', { error: error && error.message });
    throw error;
  }
  const p7sUrl = isIncludeP7s ? await generateP7sLink(link) : undefined;

  // Define and return file object.
  const fileObject = { url, name, type, p7sUrl };
  return fileObject;
}

/**
 * Plink from filestorage PDF.
 * @param {string} link Link to PDF - Filestorage file ID.
 * @param {string} name
 * @param {object} additionalOptions Additional options.
 * @param {boolean} additionalOptions.isIncludeP7s Is include p7s file.
 * @returns {Promise<{url, name, type}>} File object.
 */
// eslint-disable-next-line no-unused-vars
async function plinkFromFilestoragePdf(link, name = 'document.pdf', { isIncludeP7s = false, linkEnding = '' } = {}) {
  // Check.
  if (!link) {
    // Log and exit.
    log.save('plink-from-filestorage-pdf-params-error', { link: link || null });
    return;
  }

  // Init Persist Link.
  const persistLink = new PersistLink(config.persist_link);

  // Define URL and create Persist Link record.
  const preparedHash = Buffer.from(link.slice(0, 16).toString('hex')) + crypto.randomBytes(64).toString('hex') + linkEnding;
  // const url = `${config.persist_link.server}/${preparedHash}`;
  let url;
  try {
    url = await persistLink.getLinkToStaticFileInFilestorage(link, preparedHash);
  } catch (error) {
    log.save('plink-from-filestorage-pdf-create-plink-url-error', { error: error && error.message });
    throw error;
  }

  const p7sUrl = isIncludeP7s ? await generateP7sLink(link) : undefined;

  return { url, name, type: 'application/pdf', p7sUrl };
}

/**
 * Generate a link to the p7s file.
 * @param {{id, documentId, link, name, type}} link Link object.
 * @returns {Promise<string>} Link to the p7s file.
 */
async function generateP7sLink(link) {
  try {
    const persistLink = new PersistLink(config.persist_link);
    const preparedHashForP7s = Buffer.from(link.slice(-16).toString('hex')) + crypto.randomBytes(64).toString('hex');
    return await persistLink.getLinkToStaticFileInFilestorage(link, preparedHashForP7s, { isP7s: true });
  } catch (error) {
    log.save('generate-p7s-link-error', { error: error && error.message });
    throw error;
  }
}

/**
 * Protected file from attach.
 * @param {{id, documentId, link, name, type}} attach Attach object.
 * @param {{includeP7s}} options Additional options.
 * @returns {{link, name, type}} Protected file object.
 */
// eslint-disable-next-line no-unused-vars
function protectedFileFromAttach(attach, options) {
  // Define params.
  const { link, name, type } = attach || {};
  const { includeP7s = false } = options || {};

  // Check.
  if (!link || !name || !type) {
    log.save('protected-file-from-attach|params-error', { link, name, type });
    return;
  }

  return { link, name, type, hasP7sSignature: includeP7s };
}

/**
 * Protected file from PDF.
 * @param {string} link Link to PDF - Filestorage file ID.
 * @param {string} name File name.
 * @param {{includeP7s}} options Additional options.
 * @returns {{link, name, type}} Protected file object.
 */
// eslint-disable-next-line no-unused-vars
function protectedFileFromPdf(link, name = 'document.pdf', options) {
  // Define params.
  const { includeP7s = false } = options || {};

  // Check.
  if (!link || !name) {
    log.save('protected-file-from-pdf|params-error', { link, name });
    return;
  }

  return { link, name, type: 'application/pdf', hasP7sSignature: includeP7s };
}

/**
 * Cabinet attaches.
 * @param {{id, documentId, link, name, type}[]} attaches Attaches list.
 * @param {object} additionalOptions Additional options.
 * @returns {Promise<{documentId, attachId, link, name, type, hash, hasP7sSignature}[]>} Cabinet files list promise.
 */
// eslint-disable-next-line no-unused-vars
async function cabinetAttaches(attaches, additionalOptions) {
  const cabinetFilesPromises = attaches.map((attach) => cabinetAttach(attach, additionalOptions));
  return Promise.all(cabinetFilesPromises);
}

/**
 * Cabinet attach.
 * @param {{id, documentId, link, name, type}} attach Attach object.
 * @param {object} additionalOptions Additional options.
 * @returns {Promise<{documentId, attachId, link, name, type, hash, hasP7sSignature}>} Cabinet file object promise.
 */
async function cabinetAttach(attach, { isIncludeP7s = false } = {}) {
  // Define params.
  const { documentId, id: attachId, link, name, type } = attach || {};

  // Check.
  if (!documentId || !attachId || !link || !name || !type) {
    // Log and exit.
    log.save('cabinet-attach-params-error', { documentId, link, name, type });
    return;
  }

  // Get file hash.
  const filestorage = new Filestorage();
  let fileInfo;
  try {
    fileInfo = await filestorage.getFileInfo(link);
  } catch (error) {
    log.save('cabinet-attach-get-hash-error', { error: error && error.message });
    return;
  }
  const { hash } = fileInfo;
  return { documentId, attachId, link, name, type, hash, hasP7sSignature: isIncludeP7s };
}

/**
 * Plink from filestorage PDF.
 * @param {string} documentId Document ID.
 * @param {string} link Link to PDF - Filestorage file ID.
 * @param {string} name
 * @param {object} additionalOptions Additional options.
 * @returns {Promise<{documentId, link, name, type, hash, hasP7sSignature}>} Cabinet file object promise.
 */
// eslint-disable-next-line no-unused-vars
async function cabinetFile(documentId, link, name = 'document.pdf', { isIncludeP7s = false } = {}) {
  // Check.
  if (!link || !name || !documentId) {
    // Log and exit.
    log.save('cabinet-file-params-error', { link, name, documentId });
    return;
  }

  // Get file hash.
  const filestorage = new Filestorage();
  let fileInfo;
  try {
    fileInfo = await filestorage.getFileInfo(link);
  } catch (error) {
    log.save('cabinet-file-get-hash-error', { error: error && error.message });
    return;
  }
  const { hash } = fileInfo;
  return { documentId, link, name, type: 'application/pdf', hash, hasP7sSignature: isIncludeP7s };
}

/**
 * Get ID as number.
 * @param {number} [randomPartMin] Random part min value.
 * @param {number} [randomPartMax] Random part max value.
 * @returns {number} ID number based on current timestamp and random part.
 */
function getIdAsNumber(randomPartMin = RANDOM_PART_MIN, randomPartMax = RANDOM_PART_MAX) {
  // Define ID number parts.
  // const timestamp = +new Date();
  const randomPart = (Math.random() * (randomPartMax - randomPartMin) + randomPartMin).toFixed(0);

  // Define and return ID number.
  const idNumber = parseInt(`${randomPart}`);
  return idNumber;
}

/**
 * Get ID as string.
 * @returns {string} ID string based on ID number.
 */
function getIdAsString() {
  // Define ID number.
  const idNumber = getIdAsNumber();

  // Define and return ID string.
  const idString = idNumber.toString('base64').replace(/=/g, '');
  return idString;
}

/**
 * UUID v4.
 * @returns {string} UUID v4.
 */
// eslint-disable-next-line no-unused-vars
function uuidv4() {
  const generatedUuidv4 = randomUUID();
  return generatedUuidv4;
}

/**
 * Get md5 hash.
 * @param {string} data Data.
 * @returns {string} MD5 hash.
 */
// eslint-disable-next-line no-unused-vars
function getMd5Hash(data) {
  const md5Hash = crypto.createHash('md5').update(data).digest('hex');
  return md5Hash;
}

/**
 * Get sha1 hash.
 * @param {string} data Data.
 * @returns {string} SHA1 hash.
 */
// eslint-disable-next-line no-unused-vars
function getSha1Hash(data) {
  const sha1Hash = crypto.createHash('sha1').update(data).digest('hex');
  return sha1Hash;
}

/**
 * Get sha256 hash.
 * @param {string} data Data.
 * @returns {string} SHA256 hash.
 */
// eslint-disable-next-line no-unused-vars
function getSha256Hash(data) {
  const sha256Hash = crypto.createHash('sha256').update(data).digest('hex');
  return sha256Hash;
}

/**
 * Get sha512 hash.
 * @param {string} data Data.
 * @returns {string} SHA512 hash.
 */
// eslint-disable-next-line no-unused-vars
function getSha512Hash(data) {
  const sha512Hash = crypto.createHash('sha512').update(data).digest('hex');
  return sha512Hash;
}

module.exports = RecordMap;
