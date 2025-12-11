const _ = require('lodash');

const Business = require('./business');
const Eds = require('../lib/eds');
const Sign = require('../lib/sign');
const StorageService = require('../services/storage');
const DocumentAttachmentModel = require('../models/document_attachment');
const certResultSetStatus = require('./external_services/cert_result_set_status');

// Constants.
const BODY_WORKFLOW_ID_AND_TIMESTAMP_SEPARATOR = '|';
const DEFAULT_NAMESPACE = 'ext';
const DEFAULT_NAMESPACE_PATH = 'soapenv:Envelope.$.xmlns:ext';
const HEADER_PATH = 'soapenv:Envelope.soapenv:Header.0';
const BODY_PATH = 'soapenv:Envelope.soapenv:Body.0';
const HEADER_CLIENT_PATH = HEADER_PATH + '.xro:client.0';
const HEADER_SERVICE_PATH = HEADER_PATH + '.xro:service.0';
const CLAIM_STATUS_PATH = BODY_PATH + '.ext:claimStatus';
const CLAIM_STATUS_RESPONSE_PATH = BODY_PATH + '.ext:claimStatusResponse';
const UNKNOWN_VALUE = '?';
const NAMESPACE_MAPPING = {
  s: 'soapenv',
  h: 'xro',
  a: 'id',
};

/**
 * External services business.
 * @typedef {import('../entities/workflow')} WorkflowEntity.
 */
class ExternalServicesBusiness extends Business {
  /**
   * ExternalServices business constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!ExternalServicesBusiness.singleton) {
      super(config);
      this.eds = new Eds(config.eds);
      this.signService = new Sign();

      this.storageService = new StorageService();
      this.certResultSetStatus = certResultSetStatus.bind(this);
      this.documentAttachmentModel = new DocumentAttachmentModel();
      this.servicesHandlers = {};

      ExternalServicesBusiness.singleton = this;
    }
    return ExternalServicesBusiness.singleton;
  }

  mapBodyNamespaces(body) {
    let newBody = this.mapChildNamespaces({ ...body });
    _.set(newBody, DEFAULT_NAMESPACE_PATH, 'ext');

    return newBody;
  }

  mapChildNamespaces(node) {
    // If it is end point node.
    if (typeof node !== 'object') return node;

    // If it is array - Go through all of node elements
    if (Array.isArray(node)) {
      return node.map((item) => this.mapChildNamespaces(item));
    }

    // Go through all objects elements
    for (let childKey in node) {
      // Skip namespace description
      if (childKey === '$') {
        for (let namespaceKey in node[childKey]) {
          const namespaceKeyParts = namespaceKey.split(':');
          if (NAMESPACE_MAPPING[namespaceKeyParts[1]]) {
            node[childKey][namespaceKeyParts[0] + ':' + NAMESPACE_MAPPING[namespaceKeyParts[1]]] = node[childKey][namespaceKey];
            delete node[childKey][namespaceKey];
          }
          if (NAMESPACE_MAPPING[namespaceKeyParts[0]]) {
            node[childKey][NAMESPACE_MAPPING[namespaceKeyParts[0]] + ':' + namespaceKeyParts[1]] = node[childKey][namespaceKey];
            delete node[childKey][namespaceKey];
          }
        }
        continue;
      }

      const childHaveName = childKey != parseInt(childKey); // isInt
      const needRenameNamespace = (Array.isArray(node[childKey]) || typeof node[childKey] === 'object') && childHaveName;

      // Set default namespace for all without it
      const haveNamespace = childKey.indexOf(':') >= 0;
      if (!haveNamespace && needRenameNamespace) {
        node[DEFAULT_NAMESPACE + ':' + childKey] = node[childKey];
        delete node[childKey];
        childKey = DEFAULT_NAMESPACE + ':' + childKey;
      }

      const variableNameParts = childKey.split(':');
      if (needRenameNamespace && NAMESPACE_MAPPING[variableNameParts[0]]) {
        node[NAMESPACE_MAPPING[variableNameParts[0]] + ':' + variableNameParts[1]] = node[childKey];
        delete node[childKey];
        childKey = NAMESPACE_MAPPING[variableNameParts[0]] + ':' + variableNameParts[1];
      }
      if (Array.isArray(node[childKey])) {
        node[childKey] = node[childKey].map((item) => this.mapChildNamespaces(item));
      } else {
        node[childKey] = this.mapChildNamespaces(node[childKey]);
      }
    }

    return node;
  }

  prepareObjectForXmlResponse(requestBody, workflow, faultCode = 0, faultDetails = '') {
    let responseBody = { ...requestBody };

    // Append `id` namespace to resolve Trembita error.
    const idenNamespace = _.get(responseBody, 'soapenv:Envelope.$.xmlns:iden');
    const idNamespace = _.get(responseBody, 'soapenv:Envelope.$.xmlns:id');
    if (idenNamespace && !idNamespace) {
      _.set(responseBody, 'soapenv:Envelope.$.xmlns:id', idenNamespace);
    }

    const xroadInstanceClient = _.get(responseBody, HEADER_CLIENT_PATH + '.id:xroadInstance.0');
    const xroadInstanceService = _.get(responseBody, HEADER_SERVICE_PATH + '.id:xroadInstance.0');
    _.set(responseBody, HEADER_CLIENT_PATH + '.id:xroInstance.0', xroadInstanceClient || UNKNOWN_VALUE);
    _.set(responseBody, HEADER_SERVICE_PATH + '.id:xroInstance.0', xroadInstanceService || UNKNOWN_VALUE);
    _.unset(responseBody, HEADER_CLIENT_PATH + '.id:xRoadInstance');
    _.unset(responseBody, HEADER_SERVICE_PATH + '.id:xRoadInstance');
    _.unset(responseBody, HEADER_CLIENT_PATH + '.id:serviceVersion');
    _.unset(responseBody, CLAIM_STATUS_PATH);
    _.set(responseBody, CLAIM_STATUS_RESPONSE_PATH, [
      {
        'ext:workflowId': workflow.id,
      },
    ]);

    _.set(responseBody, CLAIM_STATUS_RESPONSE_PATH + '.0.ext:requestReceiveStatus', '0');
    if (faultCode || faultDetails) {
      _.set(responseBody, CLAIM_STATUS_RESPONSE_PATH + '.0.ext:faultCode', faultCode || UNKNOWN_VALUE);
      _.set(responseBody, CLAIM_STATUS_RESPONSE_PATH + '.0.ext:faultDetails', faultDetails || UNKNOWN_VALUE);
      _.set(responseBody, CLAIM_STATUS_RESPONSE_PATH + '.0.ext:requestReceiveStatus', '1');
    }

    return responseBody;
  }

  clearXmlRequestObjectForResponse(requestBody) {
    let responseBody = { ...requestBody };

    const xroadInstanceClient = _.get(responseBody, HEADER_CLIENT_PATH + '.id:xroadInstance.0');
    const xroadInstanceService = _.get(responseBody, HEADER_SERVICE_PATH + '.id:xroadInstance.0');
    _.set(responseBody, HEADER_CLIENT_PATH + '.id:xroInstance.0', xroadInstanceClient || UNKNOWN_VALUE);
    _.set(responseBody, HEADER_SERVICE_PATH + '.id:xroInstance.0', xroadInstanceService || UNKNOWN_VALUE);
    _.unset(responseBody, HEADER_CLIENT_PATH + '.id:xRoadInstance');
    _.unset(responseBody, HEADER_SERVICE_PATH + '.id:xRoadInstance');
    _.unset(responseBody, HEADER_CLIENT_PATH + '.id:serviceVersion');
    _.set(responseBody, BODY_PATH, {});

    return responseBody;
  }

  setXmlResponseBody(sourceBody, xmlBodyObject) {
    let responseBody = { ...sourceBody };

    xmlBodyObject = this.mapChildNamespaces({ ...xmlBodyObject });

    _.set(responseBody, BODY_PATH, xmlBodyObject);

    return responseBody;
  }

  fetchBodyWorkflowId(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:workflowId.0');
  }

  fetchWorkflowId(body) {
    const bodyWorkflowId = this.fetchBodyWorkflowId(body);
    if (typeof bodyWorkflowId !== 'string') return bodyWorkflowId;
    const [workflowId] = bodyWorkflowId.split(BODY_WORKFLOW_ID_AND_TIMESTAMP_SEPARATOR);
    return workflowId;
  }

  fetchTimestamp(body) {
    const bodyWorkflowId = this.fetchBodyWorkflowId(body);
    if (typeof bodyWorkflowId !== 'string') return;
    const [, timestamp] = bodyWorkflowId.split(BODY_WORKFLOW_ID_AND_TIMESTAMP_SEPARATOR);
    return timestamp;
  }

  fetchTypeService(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:TypeService.0');
  }

  fetchRequestId(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:RequestId.0', null);
  }

  fetchServiceId(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:ServiceId.0', null);
  }

  fetchServiceSt(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:ServiceSt.0');
  }

  fetchArDate(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:ArDate.0');
  }

  fetchLastFaultData(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:LastFaultData.0');
  }

  fetchCeDate(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:CeDate.0');
  }

  fetchServiceDateRequest(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:ServiceDateRequest.0');
  }

  fetchServiceDateAnswer(body) {
    return _.get(body, CLAIM_STATUS_PATH + '.0.ext:ServiceDateAnswer.0');
  }

  /**
   * @param {string} workflowTemplateId.
   * @return {string|undefined}
   */
  getTaskTemplateIdByWorkflowTemplateId(workflowTemplateId) {
    const { trembitaStatusTaskTemplateIds } = config.external_services;
    return trembitaStatusTaskTemplateIds[workflowTemplateId];
  }

  /**
   *
   * @param {string} workflowId.
   * @return {Promise<WorkflowEntity|Promise<undefined>>}.
   */
  async fetchWorkflowByWorkflowId(workflowId) {
    return await models.workflow.findById(workflowId);
  }

  /**
   * @param body
   * @return {number|null}
   */
  fetchServiceProcessingStatus(body) {
    return parseInt(_.get(body, CLAIM_STATUS_PATH + '.0.ext:serviceProcessingStatus.0', null));
  }

  fetchServiceProcessingResult(body) {
    const value = _.get(body, CLAIM_STATUS_PATH + '.0.ext:serviceProcessingResult.0', null);

    return value && value['$'] ? null : value;
  }

  fetchServiceProcessingFaultCode(body) {
    const value = _.get(body, CLAIM_STATUS_PATH + '.0.ext:serviceProcessingFaultCode.0', null);

    return value && value['$'] ? null : value;
  }
}

module.exports = ExternalServicesBusiness;
