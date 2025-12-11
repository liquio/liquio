const ConfigsModel = require('../models/configs');
const { checkConfigAuth } = require('./auth');
const { Configs } = new ConfigsModel();
let Router = require('restify-router').Router;
let routerInstance = new Router();

const ConfigsController = class {
  constructor(server) {
    this.registerRoutes();
    return routerInstance.applyRoutes(server, 'configs');
  }

  registerRoutes() {
    routerInstance.get('/', checkConfigAuth, this.getConfig.bind(this));
    routerInstance.post('/', checkConfigAuth, this.upsertConfig.bind(this));
    routerInstance.put('/:id', checkConfigAuth, this.upsertConfig.bind(this));
    routerInstance.del('/:id', checkConfigAuth, this.deleteConfig.bind(this));
  }

  async getConfig(req, res, next) {
    let { environment } = req.query,
      query = {};
    if (environment) {
      query = {
        where: {
          environment,
        },
      };
    }
    let result = await Configs.findAll(query);
    res.send(result);
    next();
  }

  async upsertConfig(req, res, next) {
    let { id } = req.params,
      { body } = req,
      { method } = req.route,
      result;
    if (!body) {
      return res.send(400, { message: 'Empty body' });
    }
    if (id && method.toUpperCase() === 'PUT') {
      try {
        result = await Configs.update(body, {
          where: {
            id,
          },
        });
      } catch (e) {
        return res.send(500, e);
      }
      if (result[0] == 0) return res.send(400, { message: 'Config Id not valid' });
      result = await Configs.findOne({ where: { id } });
    } else if (method.toUpperCase() === 'POST') {
      try {
        result = await Configs.create(body);
      } catch (e) {
        return res.send(500, e);
      }
    }
    res.send(result);
    next();
  }

  async deleteConfig(req, res, next) {
    let { id } = req.params;
    if (!id) {
      return res.send(400, { message: 'Config ID empty' });
    }
    try {
      await Configs.destroy({
        where: { id },
      });
      res.send();
    } catch (e) {
      res.send(500, e.message);
    }
    next();
  }
};

module.exports = ConfigsController;
