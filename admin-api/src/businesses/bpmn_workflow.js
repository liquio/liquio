const _ = require('lodash');
const jp = require('jsonpath');
const crypto = require('crypto');
const moment = require('moment');

const Exceptions = require('../exceptions');
const XmlJsConverter = require('../lib/xml_js_converter');
const RegisterService = require('../services/register');
const Sandbox = require('../lib/sandbox');
const WorkflowTemplateEntity = require('../entities/workflow_template');
const WorkflowTemplateCategoryEntity = require('../entities/workflow_template_category');
const TaskTemplateEntity = require('../entities/task_template');
const DocumentTemplateEntity = require('../entities/document_template');
const GatewayTemplateEntity = require('../entities/gateway_template');
const EventTemplateEntity = require('../entities/event_template');
const WorkflowHistoryEntity = require('../entities/workflow_history');
const NumberTemplateEntity = require('../entities/number_template');

/**
 * BPMN workflow business.
 */
class BpmnWorkflowBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!BpmnWorkflowBusiness.singleton) {
      this.config = config;
      this.xmlJsConverter = new XmlJsConverter();
      this.registerService = new RegisterService();
      this.sandbox = new Sandbox();
      BpmnWorkflowBusiness.singleton = this;
    }

    // Return singleton.
    return BpmnWorkflowBusiness.singleton;
  }

  /**
   * Export BPMN workflow.
   * @param {number} id Workflow template ID.
   * @returns {Promise<string>}
   */
  async export(id) {
    // Get BPMN workflow.
    let bpmnWorkflow = await this.getBpmnWorkflowReferences(id);
    if (!bpmnWorkflow) {
      return;
    }

    // Disable to export errors subscribers.
    if (bpmnWorkflow?.workflowTemplate?.errorsSubscribers) {
      delete bpmnWorkflow.workflowTemplate.errorsSubscribers;
    }

    // Return BPMN workflow without subscribers.
    return bpmnWorkflow;
  }

  /**
   * Import BPMN workflow.
   * @param {string} data Data.
   * @param {boolean} force Force.
   * @param {object} params params.
   * @param {string} params.type Type.
   * @param {string} params.name Name.
   * @param {string} params.description Description.
   * @param {object} params.user User.
   * @param {boolean} decrypt Decrypt.
   * @returns {Promise<boolean>}
   */
  async import(data, force = false, { type, name, description, user }, decrypt = true) {
    if (decrypt) {
      data = JSON.parse(data);
    }

    if (
      typeof data !== 'object' ||
      typeof data.workflowTemplate === 'undefined' ||
      typeof data.workflowTemplateCategory === 'undefined' ||
      typeof data.taskTemplates === 'undefined' ||
      !Array.isArray(data.taskTemplates) ||
      typeof data.documentTemplates === 'undefined' ||
      !Array.isArray(data.documentTemplates) ||
      typeof data.gatewayTemplates === 'undefined' ||
      !Array.isArray(data.gatewayTemplates) ||
      typeof data.eventTemplates === 'undefined' ||
      !Array.isArray(data.eventTemplates)
    ) {
      throw new Error('Invalid data.');
    }

    // Disable to import errors subscribers.
    if (data?.workflowTemplate?.errorsSubscribers) {
      delete data.workflowTemplate.errorsSubscribers;
    }

    if ((await models.workflowTemplate.findById(data.workflowTemplate.id)) && force === false) {
      throw new Exceptions.COMMITED(Exceptions.COMMITED.Messages.WORKFLOW);
    }

    const bpmnWorkflowTransaction = await db.transaction();

    try {
      let registerErrors = [];
      let registerKeys = await this.registerService.getKeys({ limit: config.register.limit });
      registerKeys = (registerKeys.data && registerKeys.data.map((v) => v.id)) || [];

      // Import workflow template category.
      if (data.workflowTemplateCategory) {
        log.save('import|workflow-template-category', { user, data: data.workflowTemplateCategory });
        await models.workflowTemplateCategory.create(new WorkflowTemplateCategoryEntity(data.workflowTemplateCategory), bpmnWorkflowTransaction);
      }

      if (data.numberTemplates && data.numberTemplates.length > 0) {
        for (const numberTemplate of data.numberTemplates) {
          log.save('import|number-template', { user, id: numberTemplate.id });
          await models.numberTemplate.create(new NumberTemplateEntity(numberTemplate), bpmnWorkflowTransaction);
        }
      }

      // Import workflow template.
      let numberTemplateError;
      if (data.workflowTemplate.data && data.workflowTemplate.data.numberTemplateId) {
        const numberTemplate = await models.numberTemplate.findById(data.workflowTemplate.data.numberTemplateId, bpmnWorkflowTransaction);
        if (!numberTemplate) {
          numberTemplateError = new Exceptions.WORKFLOW(
            `Number template ${data.workflowTemplate.data.numberTemplateId} doesn't exists but exists in workflow.`,
          );
        }
      }

      log.save('import|workflow-template', { user, id: data.workflowTemplate.id });
      await models.workflowTemplate.create(new WorkflowTemplateEntity(data.workflowTemplate), bpmnWorkflowTransaction);

      // Import document templates.
      for (const documentTemplate of data.documentTemplates) {
        // Check if all registers exist.
        const registerKeysInSchema = _.flattenDeep(jp.query(documentTemplate.jsonSchema, '$..keyId'));
        for (const registerKeyInSchema of registerKeysInSchema) {
          // keyId is number or numeric string - 123 or "123"
          if (parseInt(registerKeyInSchema) > 0 && !registerKeys.some((v) => v === parseInt(registerKeyInSchema))) {
            registerErrors.push(
              new Exceptions.WORKFLOW(
                `Register key ${registerKeyInSchema} doesn't exists but exists in document_template_id ${documentTemplate.id}.`,
              ),
            );
          }
        }

        const registerControlsWithWhiteListInSchema = _.flattenDeep(jp.query(documentTemplate.jsonSchema, '$..[?(@.keyId && @.whiteList)]'));
        for (const { keyId = '', whiteList = [] } of registerControlsWithWhiteListInSchema) {
          const whiteListNumeric = whiteList.map((el) => parseInt(el));
          let isKeyIdFunction = false;
          try {
            const keyIdEvalResult = this.sandbox.eval(keyId);
            isKeyIdFunction = typeof keyIdEvalResult === 'function';
          } catch (e) {
            // keyId is not a function
          }

          // keyId is a function string - "() => 123" AND register control has whiteList option
          if (isKeyIdFunction && whiteListNumeric.length > 0) {
            const nonExistingKeyIds = whiteListNumeric.filter((el) => !registerKeys.includes(el));
            if (nonExistingKeyIds.length > 0) {
              registerErrors.push(
                new Exceptions.WORKFLOW(
                  `Register keys ${nonExistingKeyIds} don't exist but exist in document_template_id ${documentTemplate.id} in whiteList option ${whiteList}.`,
                ),
              );
            }
          }
        }

        log.save('import|document-template', { user, id: documentTemplate.id });
        await models.documentTemplate.create(new DocumentTemplateEntity(documentTemplate), bpmnWorkflowTransaction);
      }

      // Import task templates.
      let unitErrors = [];
      for (const taskTemplate of data.taskTemplates) {
        // Check if all units exist.
        if (Array.isArray(taskTemplate.jsonSchema.setPermissions)) {
          for (const permission of taskTemplate.jsonSchema.setPermissions) {
            if (Array.isArray(permission.performerUnits)) {
              for (const performerUnit of permission.performerUnits) {
                const unit = await models.unit.findById(performerUnit);
                if (!unit) {
                  unitErrors.push({ unitId: performerUnit, taskTemplateId: taskTemplate.id });
                }
              }
            }
          }
        }

        log.save('import|task-template', { user, id: taskTemplate.id });
        await models.taskTemplate.create(new TaskTemplateEntity(taskTemplate), bpmnWorkflowTransaction);
      }

      if (unitErrors) {
        unitErrors = unitErrors.map(
          (v) => new Exceptions.WORKFLOW(`Unit ${v.unitId} doesn't exists but exists in task_template_id ${v.taskTemplateId}.`),
        );
      }

      // Import gateway templates.
      for (const gatewayTemplate of data.gatewayTemplates) {
        log.save('import|gateway-template', { user, id: gatewayTemplate.id });
        await models.gatewayTemplate.create(new GatewayTemplateEntity(gatewayTemplate), bpmnWorkflowTransaction);
      }

      // Import event templates.
      for (const eventTemplate of data.eventTemplates) {
        // Check if all registers exist.
        const registerKeysInSchema = _.flattenDeep(jp.query(eventTemplate.jsonSchema, '$..keyId'));
        for (const registerKeyInSchema of registerKeysInSchema) {
          if (!registerKeys.some((v) => v === parseInt(registerKeyInSchema))) {
            registerErrors.push(
              new Exceptions.WORKFLOW(`Register key ${registerKeyInSchema} doesn't exists but exists in event_template_id ${eventTemplate.id}.`),
            );
          }
        }

        log.save('import|event-template', { user, id: eventTemplate.id });
        await models.eventTemplate.create(new EventTemplateEntity(eventTemplate), bpmnWorkflowTransaction);
      }

      if (registerErrors.length || unitErrors.length || numberTemplateError) {
        throw new Exceptions.WORKFLOW(
          Exceptions.WORKFLOW.Messages.IMPORT,
          registerErrors.concat(unitErrors).concat(numberTemplateError ? [numberTemplateError] : []),
        );
      }

      // Set new version.
      let version = '1.0.0';
      const lastVersionWorkflowHistory = await models.workflowHistory.findLastVersionByWorkflowTemplateId(data.workflowTemplate.id);
      if (lastVersionWorkflowHistory) {
        const currentVersion = lastVersionWorkflowHistory.version;
        if (typeof currentVersion === 'string') {
          const [major = 1, minor = 0] = (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(currentVersion) ? currentVersion : `1.0.${currentVersion}`)
            .split('.')
            .map((v) => parseInt(v));

          if (type === 'major') {
            version = `${major + 1}.0.0`;
          } else if (type === 'minor') {
            version = `${major}.${minor + 1}.0`;
          }
        }
      }

      // Delete flag is_current_version.
      await models.workflowHistory.deleteIsCurrentVersionByWorkflowTemplateId(data.workflowTemplate.id);

      // Create commit.
      log.save('import|workflow-history', { user, id: data.workflowTemplate.id });
      await models.workflowHistory.create(
        new WorkflowHistoryEntity({
          workflowTemplateId: data.workflowTemplate.id,
          userId: user.userId || 'SYSTEM',
          data: data,
          version: version,
          isCurrentVersion: true,
          meta: user,
          name,
          description,
        }),
        bpmnWorkflowTransaction,
      );

      await bpmnWorkflowTransaction.commit();

      log.save('user-imported-bpmn-workflow', { user, data: data });
    } catch (error) {
      await bpmnWorkflowTransaction.rollback();
      throw error;
    }

    return true;
  }

  /**
   * Get BPMN workflow references by workflow ID.
   * @param {number} id Workflow ID.
   * @returns {Promise<object>}
   */
  async getBpmnWorkflowReferences(id) {
    const workflowTemplate = await models.workflowTemplate.findById(id);

    if (!workflowTemplate) {
      throw new Exceptions.NOT_FOUND(Exceptions.NOT_FOUND.Messages.WORKFLOW_TEMPLATE);
    }

    let bpmnSchema;
    try {
      bpmnSchema = await this.xmlJsConverter.convertXmlToJsObject(workflowTemplate.xmlBpmnSchema.replace(/bpmn2:/g, 'bpmn:'));
    } catch {
      throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.INVALID_XML);
    }
    if (
      !bpmnSchema ||
      !bpmnSchema['bpmn:definitions'] ||
      !bpmnSchema['bpmn:definitions']['bpmn:process'] ||
      !Array.isArray(bpmnSchema['bpmn:definitions']['bpmn:process']) ||
      !bpmnSchema['bpmn:definitions']['bpmn:process'][0]
    ) {
      throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.INVALID_XML);
    }

    const bpmnProcess = bpmnSchema['bpmn:definitions']['bpmn:process'][0];

    let sequences = [];

    if (Array.isArray(bpmnProcess['bpmn:sequenceFlow'])) {
      for (const sequence of bpmnProcess['bpmn:sequenceFlow']) {
        sequences.push(sequence['$']['sourceRef']);
        sequences.push(sequence['$']['targetRef']);
      }
    }

    sequences = [...new Set(sequences)].filter(Boolean);

    const workflowTemplateCategory = await models.workflowTemplateCategory.findById(workflowTemplate.workflowTemplateCategoryId);

    let workflow = {
      workflowTemplate,
      workflowTemplateCategory,
      taskTemplates: [],
      documentTemplates: [],
      gatewayTemplates: [],
      eventTemplates: [],
    };

    for (const sequence of sequences) {
      if (sequence.search(/^task-[0-9]+$/) !== -1) {
        const taskId = parseInt(sequence.replace(/task-/i, ''));
        if (!taskId) {
          continue;
        }
        const taskTemplate = await models.taskTemplate.findById(taskId);
        if (!taskTemplate) {
          continue;
        }

        // Prepare task templates.
        const taskTemplateAlreadyExists = workflow.taskTemplates.find((item) => item.id === taskId);
        if (!taskTemplateAlreadyExists) {
          workflow.taskTemplates.push(taskTemplate);
        }

        // Prepare document templates
        const documentTemplateAlreadyExists = workflow.documentTemplates.find((item) => item.id === taskTemplate.documentTemplateId);
        if (!documentTemplateAlreadyExists) {
          const documentTemplate = await models.documentTemplate.findById(taskTemplate.documentTemplateId);

          if (documentTemplate) {
            workflow.documentTemplates.push(documentTemplate);
          }
        }
      } else if (sequence.search(/^gateway-[0-9]+$/) !== -1) {
        const gatewayId = parseInt(sequence.replace(/gateway-/i, ''));
        if (!gatewayId) {
          continue;
        }

        const gatewayTemplate = await models.gatewayTemplate.findById(gatewayId);
        if (!gatewayTemplate) {
          continue;
        }

        // Prepare gateway templates.
        const gatewayTemplateAlreadyExists = workflow.gatewayTemplates.find((item) => item.id === gatewayId);
        if (!gatewayTemplateAlreadyExists) {
          workflow.gatewayTemplates.push(gatewayTemplate);
        }
      } else if (sequence.search(/^event-[0-9]+$/) !== -1) {
        const eventId = parseInt(sequence.replace(/event-/i, ''));
        if (!eventId) {
          continue;
        }

        const eventTemplate = await models.eventTemplate.findById(eventId);
        if (!eventTemplate) {
          continue;
        }

        // Prepare event templates.
        const eventTemplateAlreadyExists = workflow.eventTemplates.find((item) => item.id === eventId);
        if (!eventTemplateAlreadyExists) {
          workflow.eventTemplates.push(eventTemplate);
        }
      }
    }

    return workflow;
  }

  /**
   * Get versions BPMN workflow.
   * @param {number} workflowTemplateId Workflow template ID.
   * @returns {Promise<object[]>}
   */
  async getVersionsByWorkflowTemplateId(workflowTemplateId) {
    const versions = await models.workflowHistory.getVersionsByWorkflowTemplateId(workflowTemplateId);

    return versions;
  }

  /**
   * Find by version BPMN workflow.
   * @param {number} workflowTemplateId Workflow template ID.
   * @param {string} version Version.
   * @returns {Promise<object>}
   */
  async findVersionByWorkflowTemplateIdAndVersion(workflowTemplateId, version) {
    const versions = await models.workflowHistory.findVersionByWorkflowTemplateIdAndVersion(workflowTemplateId, version);

    return versions;
  }

  /**
   * Save BPMN workflow.
   * @param {number} workflowTemplateId Workflow template ID.
   * @param {object} params Params.
   * @param {string} [params.type] Type.
   * @param {string} [params.name] Name.
   * @param {string} [params.description] Description.
   * @param {object} params.user User.
   * @returns {Promise<object>}
   */
  async saveVersion(workflowTemplateId, { type, name, description, user }) {
    const transaction = await db.transaction();

    try {
      let bpmnWorkflow = await this.getBpmnWorkflowReferences(workflowTemplateId);
      if (!bpmnWorkflow) {
        return;
      }

      // Set new version.
      let version = '1.0.0';
      const lastVersionWorkflowHistory = await models.workflowHistory.findLastVersionByWorkflowTemplateId(workflowTemplateId);
      if (lastVersionWorkflowHistory) {
        const currentVersion = lastVersionWorkflowHistory.version;
        if (typeof currentVersion === 'string') {
          const [major = 1, minor = 0, patch = 0] = (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(currentVersion) ? currentVersion : `1.0.${currentVersion}`)
            .split('.')
            .map((v) => parseInt(v));

          if (type === 'major') {
            version = `${major + 1}.0.0`;
          } else if (type === 'minor') {
            version = `${major}.${minor + 1}.0`;
          } else {
            version = `${major}.${minor}.${patch + 1}`;
          }
        }
      }

      // Delete flag is_current_version.
      await models.workflowHistory.deleteIsCurrentVersionByWorkflowTemplateId(workflowTemplateId);

      // Create commit.
      const workflowHistory = await models.workflowHistory.create(
        new WorkflowHistoryEntity({
          workflowTemplateId,
          userId: user.userId,
          data: bpmnWorkflow,
          version: version,
          isCurrentVersion: true,
          meta: user,
          name,
          description,
        }),
        transaction,
      );
      await transaction.commit();

      return workflowHistory;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Auto save BPMN workflow.
   * @param {number} workflowTemplateId Workflow template ID.
   * @param {object} params Params.
   * @param {object} params.user User.
   * @returns {Promise<object>}
   */
  async autoSaveVersion(workflowTemplateId, { user }) {
    const lastWorkflowHistory = await models.workflowHistory.findLastByWorkflowTemplateId(workflowTemplateId);
    if (!lastWorkflowHistory) {
      return this.saveVersion(workflowTemplateId, { user });
    }

    const autoSaveVersionAfter = config.workflow_history.autoSaveVersionAfter;
    const lastSavedDatetimeWithDelay = moment(lastWorkflowHistory.createdAt).add(autoSaveVersionAfter, 'seconds');
    const currentDateTime = moment();

    if (
      lastWorkflowHistory.userId !== user.userId ||
      (lastWorkflowHistory.meta && lastWorkflowHistory.meta.xForwardedFor !== user.xForwardedFor) ||
      currentDateTime.isAfter(lastSavedDatetimeWithDelay)
    ) {
      return this.saveVersion(workflowTemplateId, { user });
    }
  }
  /**
   * Copy preparation.
   * @param {number} workflowTemplateId Workflow template ID.
   * @returns {Promise<object>}
   */
  async copyPreparation(workflowTemplateId) {
    const workflowTemplate = await models.workflowTemplate.findById(workflowTemplateId);
    if (!workflowTemplate) {
      throw new Exceptions.NOT_FOUND(Exceptions.NOT_FOUND.Messages.WORKFLOW_TEMPLATE);
    }
    delete workflowTemplate.createdAt;
    // Disable to copy errors subscribers.
    if (workflowTemplate?.errorsSubscribers) {
      delete workflowTemplate.errorsSubscribers;
    }

    let bpmnSchema;
    try {
      bpmnSchema = await this.xmlJsConverter.convertXmlToJsObject(workflowTemplate.xmlBpmnSchema.replace(/bpmn2:/g, 'bpmn:'));
    } catch {
      throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.INVALID_XML);
    }
    if (
      !bpmnSchema ||
      !bpmnSchema['bpmn:definitions'] ||
      !bpmnSchema['bpmn:definitions']['bpmn:process'] ||
      !Array.isArray(bpmnSchema['bpmn:definitions']['bpmn:process']) ||
      !bpmnSchema['bpmn:definitions']['bpmn:process'][0]
    ) {
      throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.INVALID_XML);
    }
    const bpmnProcess = bpmnSchema['bpmn:definitions']['bpmn:process'][0];

    let sequences = [];

    if (Array.isArray(bpmnProcess['bpmn:sequenceFlow'])) {
      for (const sequence of bpmnProcess['bpmn:sequenceFlow']) {
        sequences.push(sequence['$']['sourceRef']);
        sequences.push(sequence['$']['targetRef']);
      }
    }

    sequences = [...new Set(sequences)].filter(Boolean);
    const taskTemplates = [];
    const documentTemplates = [];
    const gatewayTemplates = [];
    const eventTemplates = [];

    for (const sequence of sequences) {
      if (sequence.search(/^task-[0-9]+$/) !== -1) {
        const taskId = parseInt(sequence.replace(/task-/i, ''));
        if (!taskId) {
          continue;
        }
        const taskTemplate = await models.taskTemplate.findById(taskId);
        if (!taskTemplate) {
          continue;
        }

        // Prepare task templates.
        const taskTemplateAlreadyExists = taskTemplates.find((item) => item.id === taskId);
        if (!taskTemplateAlreadyExists) {
          taskTemplates.push({ ...taskTemplate, jsonSchemaRaw: undefined, createdAt: undefined });
        }

        // Prepare document templates
        const documentTemplateAlreadyExists = documentTemplates.find((item) => item.id === taskTemplate.documentTemplateId);
        if (!documentTemplateAlreadyExists) {
          const documentTemplate = await models.documentTemplate.findById(taskTemplate.documentTemplateId);

          if (documentTemplate) {
            documentTemplates.push({ ...documentTemplate, jsonSchemaRaw: undefined, createdAt: undefined });
          }
        }
      } else if (sequence.search(/^gateway-[0-9]+$/) !== -1) {
        const gatewayId = parseInt(sequence.replace(/gateway-/i, ''));
        if (!gatewayId) {
          continue;
        }

        const gatewayTemplate = await models.gatewayTemplate.findById(gatewayId);
        if (!gatewayTemplate) {
          continue;
        }

        // Prepare gateway templates.
        const gatewayTemplateAlreadyExists = gatewayTemplates.find((item) => item.id === gatewayId);
        if (!gatewayTemplateAlreadyExists) {
          gatewayTemplates.push({ ...gatewayTemplate, jsonSchemaRaw: undefined, createdAt: undefined });
        }
      } else if (sequence.search(/^event-[0-9]+$/) !== -1) {
        const eventId = parseInt(sequence.replace(/event-/i, ''));
        if (!eventId) {
          continue;
        }

        const eventTemplate = await models.eventTemplate.findById(eventId);
        if (!eventTemplate) {
          continue;
        }

        // Prepare event templates.
        const eventTemplateAlreadyExists = eventTemplates.find((item) => item.id === eventId);
        if (!eventTemplateAlreadyExists) {
          eventTemplates.push({ ...eventTemplate, jsonSchemaRaw: undefined, createdAt: undefined });
        }
      }
    }
    const { id: lastWorkflowTemplateId } = await models.workflowTemplate.getLatest();
    const newWorkflowTemplateId = lastWorkflowTemplateId + 1;
    const diffs = [];
    getDiffsFromTemplate(taskTemplates, 'taskTemplate', diffs, workflowTemplateId, newWorkflowTemplateId);
    getDiffsFromTemplate(documentTemplates, 'documentTemplate', diffs, workflowTemplateId, newWorkflowTemplateId);
    getDiffsFromTemplate(gatewayTemplates, 'gatewayTemplate', diffs, workflowTemplateId, newWorkflowTemplateId);
    getDiffsFromTemplate(eventTemplates, 'eventTemplate', diffs, workflowTemplateId, newWorkflowTemplateId);

    function getDiffsFromTemplate(templatesArray, templateName, acc, prevWorkflowTemplateId, newWorkflowTemplateId) {
      const regExp = new RegExp(`${prevWorkflowTemplateId}[0-9]{3}`, 'g');
      templatesArray.forEach((template) => {
        const matches = JSON.stringify(template.jsonSchema).matchAll(regExp);
        const matchesArray = [...matches];
        if (matchesArray.length === 0) return;
        matchesArray.forEach((m) => {
          const matchedString = m[0];
          const { index, input } = m;
          if (checkSafeReplacing(matchedString, index, input)) return;
          const substring = input.substring(index - 50, index + matchedString.length + 50);
          acc.push({
            id: crypto.randomBytes(16).toString('hex'),
            type: templateName,
            templateId: template.id,
            index,
            beforeReplacing: substring,
            afterReplacing: substring.replaceAll(regExp, (match) => match.replace(prevWorkflowTemplateId, newWorkflowTemplateId)),
          });
        });
      });
    }
    function checkSafeReplacing(matchedString, index, input) {
      const safeReplasementMap = [
        {
          longestString: 'TemplateId   ===   <templateId>',
          pattern: 'TemplateId\\s{0,3}={2,3}\\s{0,3}<templateId>',
        },
        {
          longestString: 'TemplateId":  <templateId>',
          pattern: 'TemplateId":\\s{0,3}<templateId>',
        },
      ];
      return safeReplasementMap.some(({ longestString, pattern }) => {
        const substringToCheck = input.substring(
          index - longestString.replaceAll('<templateId>', matchedString).length,
          index + matchedString.length,
        );
        const regExpToSearch = new RegExp(pattern.replaceAll('<templateId>', matchedString));
        const match = substringToCheck.match(regExpToSearch);
        return match;
      });
    }
    const workflowTemplateWithDependenciesToSave = {
      workflowTemplate,
      taskTemplates,
      documentTemplates,
      gatewayTemplates,
      eventTemplates,
      diffs,
    };
    const requestId = crypto.randomBytes(16).toString('hex');
    const redisKeyName = `${workflowTemplateId}-${requestId}`;
    await global.redis.set(redisKeyName, JSON.stringify(workflowTemplateWithDependenciesToSave), 'EX', 15 * 60);
    return { requestId, diffs, length: diffs.length };
  }

  /**
   * Copy.
   * @param {number} workflowTemplateId Workflow template ID.
   * @param {string} requestId Request ID.
   * @param {Array<string>} notReplacingDiffIds Not replacing diff IDs.
   * @param {number} user User.
   * @returns {Promise<object>}
   */
  async copy(workflowTemplateId, requestId, notReplacingDiffIds, user) {
    const redisKeyName = `${workflowTemplateId}-${requestId}`;

    const redisRecord = await global.redis.get(redisKeyName);
    if (!redisRecord) {
      throw new Error('Saved workflowTemplate did\'t find');
    }
    const { workflowTemplate, taskTemplates, documentTemplates, gatewayTemplates, eventTemplates, diffs } = JSON.parse(redisRecord);

    const newWorkflowTemplateWithDependencies = {
      workflowTemplate,
      taskTemplates: [],
      documentTemplates: [],
      gatewayTemplates: [],
      eventTemplates: [],
    };

    const notReplacingDiffs = diffs.filter((diff) => notReplacingDiffIds.includes(diff.id));
    const { id: lastWorkflowTemplateId } = await models.workflowTemplate.getLatest();
    const newWorkflowTemplateId = lastWorkflowTemplateId + 1;

    const bpmnWorkflowTransaction = await db.transaction();
    try {
      // Saving workflowTemplate.
      const newWorkflowTemplate = {
        ...workflowTemplate,
        id: newWorkflowTemplateId,
        name: workflowTemplate.name && `Koпія - ${workflowTemplate.name}`,
        description: workflowTemplate.description && `Koпія - ${workflowTemplate.description}`,
        xmlBpmnSchema: workflowTemplate.xmlBpmnSchema
          .replaceAll(new RegExp(`task-${workflowTemplateId}`, 'gi'), `task-${newWorkflowTemplateId}`)
          .replaceAll(new RegExp(`event-${workflowTemplateId}`, 'gi'), `event-${newWorkflowTemplateId}`)
          .replaceAll(new RegExp(`gateway-${workflowTemplateId}`, 'gi'), `gateway-${newWorkflowTemplateId}`),
        data: checkAndReplaceJsonSchema(workflowTemplate.data, null, null, workflowTemplateId, newWorkflowTemplateId, []),
      };
      const workflowTemplateEntity = new WorkflowTemplateEntity(newWorkflowTemplate);
      newWorkflowTemplateWithDependencies.workflowTemplate = workflowTemplateEntity;
      await models.workflowTemplate.create(workflowTemplateEntity, bpmnWorkflowTransaction);

      // Saving documentTemplates.
      for (const documentTemplate of documentTemplates) {
        const newDocumentTemplate = {
          ...documentTemplate,
          id: Number(String(documentTemplate.id).replace(new RegExp(`^${workflowTemplateId}`), `${newWorkflowTemplateId}`)),
          jsonSchema: checkAndReplaceJsonSchema(
            documentTemplate.jsonSchema,
            'documentTemplate',
            documentTemplate.id,
            workflowTemplateId,
            newWorkflowTemplateId,
            notReplacingDiffs,
          ),
        };
        const documentTemplateEntity = new DocumentTemplateEntity(newDocumentTemplate);
        newWorkflowTemplateWithDependencies.documentTemplates.push(documentTemplateEntity);
        await models.documentTemplate.create(documentTemplateEntity, bpmnWorkflowTransaction);
      }

      // Saving taskTemplates.
      for (let taskTemplate of taskTemplates) {
        const newTaskTemplate = {
          ...taskTemplate,
          id: Number(String(taskTemplate.id).replace(new RegExp(`^${workflowTemplateId}`), `${newWorkflowTemplateId}`)),
          documentTemplateId: Number(
            String(taskTemplate.documentTemplateId).replace(new RegExp(`^${workflowTemplateId}`), `${newWorkflowTemplateId}`),
          ),
          jsonSchema: checkAndReplaceJsonSchema(
            taskTemplate.jsonSchema,
            'taskTemplate',
            taskTemplate.id,
            workflowTemplateId,
            newWorkflowTemplateId,
            notReplacingDiffs,
          ),
        };
        const taskTemplateEntity = new TaskTemplateEntity(newTaskTemplate);
        newWorkflowTemplateWithDependencies.taskTemplates.push(taskTemplateEntity);
        await models.taskTemplate.create(taskTemplateEntity, bpmnWorkflowTransaction);
      }

      // Saving gatewayTemplates.
      for (const gatewayTemplate of gatewayTemplates) {
        const newGatewayTemplate = {
          ...gatewayTemplate,
          id: Number(String(gatewayTemplate.id).replace(new RegExp(`^${workflowTemplateId}`), `${newWorkflowTemplateId}`)),
          jsonSchema: checkAndReplaceJsonSchema(
            gatewayTemplate.jsonSchema,
            'gatewayTemplate',
            gatewayTemplate.id,
            workflowTemplateId,
            newWorkflowTemplateId,
            notReplacingDiffs,
          ),
        };
        const gatewayTemplateEntity = new GatewayTemplateEntity(newGatewayTemplate);
        newWorkflowTemplateWithDependencies.gatewayTemplates.push(gatewayTemplateEntity);
        await models.gatewayTemplate.create(gatewayTemplateEntity, bpmnWorkflowTransaction);
      }

      // Saving eventTemplates.
      for (const eventTemplate of eventTemplates) {
        const newEventTemplate = {
          ...eventTemplate,
          id: Number(String(eventTemplate.id).replace(new RegExp(`^${workflowTemplateId}`), `${newWorkflowTemplateId}`)),
          jsonSchema: checkAndReplaceJsonSchema(
            eventTemplate.jsonSchema,
            'eventTemplate',
            eventTemplate.id,
            workflowTemplateId,
            newWorkflowTemplateId,
            notReplacingDiffs,
          ),
        };
        const eventTemplateEntity = new EventTemplateEntity(newEventTemplate);
        newWorkflowTemplateWithDependencies.eventTemplates.push(eventTemplateEntity);
        await models.eventTemplate.create(eventTemplateEntity, bpmnWorkflowTransaction);
      }

      // Create commit.
      await models.workflowHistory.create(
        new WorkflowHistoryEntity({
          workflowTemplateId: newWorkflowTemplateId,
          userId: user.userId || 'SYSTEM',
          data: newWorkflowTemplateWithDependencies,
          version: '1.0.0',
          isCurrentVersion: true,
          meta: user,
        }),
        bpmnWorkflowTransaction,
      );

      await bpmnWorkflowTransaction.commit();
      await global.redis.del(redisKeyName);

      log.save('user-copied-bpmn-workflow', { user, fromTemplateId: workflowTemplateId, toTemplateId: newWorkflowTemplateId });
    } catch (error) {
      await bpmnWorkflowTransaction.rollback();
      throw error;
    }
    return { newWorkflowTemplateId };

    function checkAndReplaceJsonSchema(schema, templateType, templateId, prevWorkflowTemplateId, newWorkflowTemplateId, notReplacingDiffs) {
      const schemaString = JSON.stringify(schema);
      const notReplacingDiffsForCurrentTemplate = notReplacingDiffs.filter((el) => el.templateId === templateId && el.type === templateType);
      const regExp = new RegExp(`${prevWorkflowTemplateId}[0-9]{3}`, 'g');
      let schemaAfterReplacing;
      if (notReplacingDiffsForCurrentTemplate.length === 0) {
        schemaAfterReplacing = schemaString.replaceAll(regExp, (match) => match.replace(prevWorkflowTemplateId, newWorkflowTemplateId));
      } else {
        schemaAfterReplacing = schemaString.replaceAll(regExp, (match, offset) => {
          if (notReplacingDiffsForCurrentTemplate.some((el) => el.index === offset)) return match;
          return match.replace(prevWorkflowTemplateId, newWorkflowTemplateId);
        });
      }
      return JSON.parse(schemaAfterReplacing);
    }
  }
}

module.exports = BpmnWorkflowBusiness;
