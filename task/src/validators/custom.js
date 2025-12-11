
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Custom validator.
 */
class CustomValidator extends Validator {
  /**
   * Register validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!CustomValidator.singleton) {
      CustomValidator.singleton = this;
    }
    return CustomValidator.singleton;
  }

  /**
   * Schema.
   */
  getPostCode() {
    return checkSchema({
      ['regionName']: {
        in: ['query', 'body'],
        optional: false,
        isString: true
      },
      ['districtName']: {
        in: ['query', 'body'],
        optional: false,
        isString: true
      },
      ['cityName']: {
        in: ['query', 'body'],
        optional: false,
        isString: true
      },
      ['streetName']: {
        in: ['query', 'body'],
        optional: false,
        isString: true
      },
      ['buildingNumber']: {
        in: ['query', 'body'],
        optional: false,
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  getEndpointsByUserId() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getServicesByUserId() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getSubjectsByUserId() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getAllEndpoints() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getAllServices() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getAllSubjects() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getMyServices() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getMyEndpointsByServiceId() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      },
      ['service_id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getEndpointsByServiceId() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      },
      ['service_id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getAllEndpointsByServiceId() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      },
      ['service_id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getSubscribedServices() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getEndpointsBySubscribedServiceId() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      },
      ['service_id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getLogsByMyEndpoint() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      },
      ['endpoint_id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getMyLogsByEndpointId() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      },
      ['endpoint_id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getLogsByEndpointId() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      },
      ['endpoint_id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getEndpointById() {
    return checkSchema({
      ['id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getServiceById() {
    return checkSchema({
      ['id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getSubjectById() {
    return checkSchema({
      ['id']: {
        in: ['query', 'body'],
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getMySubjectRoles() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getMySubjects() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getProjects() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getProjectById() {
    return checkSchema({
      ['id']: {
        in: ['query', 'body'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  getTZById() {
    return checkSchema({
      ['id']: {
        in: ['query', 'body'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  getTZs() {
    return checkSchema({
      ['offset']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query', 'body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query', 'body'],
        optional: true
      },
      ['filters']: {
        in: ['query', 'body'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  checkAccessToWSO2Services() {
    return checkSchema({
      ['owner']: {
        in: ['params'],
        isString: true
      },
      ['service']: {
        in: ['params'],
        isString: true
      },
      ['endpoint']: {
        in: ['params'],
        isString: true
      },
      ['caller']: {
        in: ['params'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  getOrganizationsWithWSO2ServicesAccess() {
    return checkSchema({
      ['owner']: {
        in: ['params'],
        isString: true
      },
      ['service']: {
        in: ['params'],
        isString: true
      },
      ['endpoint']: {
        in: ['params'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  getMethodsAndOrganizationsWithWSO2ServicesAccess() {
    return checkSchema({
      ['owner']: {
        in: ['params'],
        isString: true
      },
      ['service']: {
        in: ['params'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  getMethodsServicesAndOrganizationsWithWSO2ServicesAccess() {
    return checkSchema({
      ['owner']: {
        in: ['params'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  getCollectiveOrganizationReports() {
    return checkSchema({
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query'],
        optional: true
      },
      ['filters']: {
        in: ['query'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getCopyrightUsingReports() {
    return checkSchema({
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query'],
        optional: true
      },
      ['filters']: {
        in: ['query'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getCopyrightOwnerReports() {
    return checkSchema({
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort']: {
        in: ['query'],
        optional: true
      },
      ['filters']: {
        in: ['query'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  createNazkReport() {
    return checkSchema({
      ['id']: {
        in: ['body'],
        isString: true
      },
      ['results.*']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          }
        }
      }
    });
  }

  /**
   * Schema.
   */
  getNazkReports() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true
      },
      ['rule_number']: {
        in: ['query'],
        optional: true,
        isInt: true
      },
      ['register_code']: {
        in: ['query'],
        optional: true,
        isString: true
      }
    });
  }
}

module.exports = CustomValidator;
