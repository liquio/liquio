
const { matchedData } = require('express-validator');
const { intersection } = require('lodash');
const Controller = require('./controller');

const PRESERVE_FIELDS_NO_ACCESS = ['description', 'type', 'showEmptyScreen'];
const ACCESS_LIMITED_KEY = 'isAccessLimited';

/**
 * Custom interface controller.
 */
class CustomInterfaceController extends Controller {
  /**
   * Custom interface controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!CustomInterfaceController.singleton) {
      super(config);
      CustomInterfaceController.singleton = this;
    }
    return CustomInterfaceController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const { route } = queryData;
    const unitIds = this.getRequestUserUnitIds(req);

    let customInterfaces;
    try {
      customInterfaces = await models.customInterface.getAll({ route });
    } catch (error) {
      return this.responseError(res, error);
    }

    for (const customInterface of customInterfaces) {
      try {
        const interfaceSchema = JSON.parse(customInterface.interfaceSchema);

        // Apply access control logic only if the access field of the entity is an array
        if (Array.isArray(interfaceSchema.access)) {
          // Check if the user has access to any of the listed units
          if (intersection(interfaceSchema.access, unitIds.all).length === 0) {
            // Remove all fields except permitted ones
            for (const key in interfaceSchema) {
              if (!PRESERVE_FIELDS_NO_ACCESS.includes(key)) {
                delete interfaceSchema[key];

              // Special case for showEmptyScreen: delete 'shown' property
              } else if (key === 'showEmptyScreen') {
                delete interfaceSchema[key].shown;
              }
            }

            // Add a flag to indicate that the access is limited
            interfaceSchema[ACCESS_LIMITED_KEY] = true;

            // Repack the schema back
            customInterface.interfaceSchema = JSON.stringify(interfaceSchema);
          }
        }
      } catch(error) {
        log.save('custom-interface-schema-parse-error', { error: error.toString() }, 'error');
      }
    }

    this.responseData(res, customInterfaces);
  }
}

module.exports = CustomInterfaceController;
