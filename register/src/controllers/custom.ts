import { matchedData } from 'express-validator';

import { Request, Response } from '../router';
import Controller from './controller';
import RegisterBusiness from '../businesses/register';

/**
 * Records controller.
 */
export default class CustomController extends Controller {
  static singleton: CustomController;

  registerBusiness: RegisterBusiness;

  /**
   * Custom controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!CustomController.singleton) {
      super(config);
      this.registerBusiness = new RegisterBusiness(config);
      CustomController.singleton = this;
    }
    return CustomController.singleton;
  }

  /**
   * Get post code.
   */
  async getPostCode(req: Request, res: Response) {
    // Define params.
    const { regionName, districtName, cityName, streetName, buildingNumber } = {
      ...matchedData(req, { locations: ['query'] })
    };

    let regionIds;
    let cityIds = [];
    let postalCodes = [];

    regionIds = await this.registerBusiness.getRegionId(regionName);
    for (const regionId of regionIds) {
      cityIds = [...cityIds, ...(await this.registerBusiness.getCityId(regionId, districtName, cityName))];
    }
    for (const cityId of cityIds) {
      postalCodes = [...postalCodes, ...(await this.registerBusiness.getPostalCode(cityId, streetName, buildingNumber))];
    }

    const response = {
      regionName,
      districtName,
      cityName,
      streetName,
      buildingNumber,
      regionIds,
      cityIds,
      postalCodes
    };

    // Response.
    this.responseData(res, response);
  }
}
