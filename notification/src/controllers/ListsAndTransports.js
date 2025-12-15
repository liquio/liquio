const CommunicationModel = require('../models/communications');
const SettingsModel = require('../models/user_subscribes');
const UserSubscribesModel = require('../models/user_subscribes');
const EventsModel = require('../models/events');
const { checkAuth } = require('./auth');
const Auth = require('../models/authServer');
let Router = require('restify-router').Router;
let routerInstance = new Router();
const Communication = new CommunicationModel().Communications;
const Settings = new SettingsModel().Settings;
const { UserSubscribes } = new UserSubscribesModel();
const Events = new EventsModel().Events;

const Lists = class extends Auth {
  constructor(server) {
    super();
    this.registerRoutes();
    return routerInstance.applyRoutes(server);
  }

  registerRoutes() {
    routerInstance.get('/eventsAndTransports', this.getLists.bind(this));
    routerInstance.put('/eventsAndTransports', checkAuth, this.addRelation.bind(this));
    routerInstance.del('/eventsAndTransports', checkAuth, this.removeRelation.bind(this));
    routerInstance.get('/transport', checkAuth, this.getTransport.bind(this));
    routerInstance.post('/transport', checkAuth, this.addTransport.bind(this));
    routerInstance.del('/transport', checkAuth, this.removeTransport.bind(this));
    routerInstance.get('/event', checkAuth, this.getEvents.bind(this));
    routerInstance.get('/event/:event_id/users', checkAuth, this.getUsersByEvent.bind(this));
    routerInstance.post('/event', checkAuth, this.addEvents.bind(this));
    routerInstance.put('/event/:event_id', checkAuth, this.updateEvents.bind(this));
    routerInstance.del('/event', checkAuth, this.removeEvents.bind(this));
  }

  async getLists(req, res, next) {
    let query = {
      where: {
        enable: true,
      },
    };
    if (req.query.show_all && typeof req.query.show_all == 'string' && req.query.show_all == 'true') {
      delete query.where;
    }

    let result = await Events.findAll({
      // attributes: [['setting_id','id']],
      ...query,
      order: [['event_id', 'asc']],
      include: [
        {
          ...query,
          model: Settings,
          attributes: [['setting_id', 'id'], 'enable'],
          include: [
            {
              model: Communication,
              // as:"name",
              attributes: ['communication_id', 'name'],
              where: {
                enable: true,
              },
            },
          ],
        },
      ],
    });

    res.send(result);
    next();
  }

  async addTransport(req, res, next) {
    if (!req.body.name || req.body.name == '') {
      return res.send(400, { message: 'Name empty' });
    }

    let result = await Communication.findOrCreate({
      where: {
        name: req.body.name,
        enable: req.body.enable,
      },
    });
    res.send(result);
    next();
  }

  async getTransportData(req, res, _next) {
    let result = await Communication.findAll();
    res.send(result);
  }

  async removeTransport(req, res, _next) {
    if (!!req.query.communication_id == false) {
      return res.send(400, { message: 'communication_id empty' });
    }

    await Communication.destroy({
      where: {
        communication_id: req.query.communication_id,
      },
    });
    res.send();
  }

  async addEvents(req, res, _next) {
    if (!req.body.name || req.body.name == '') {
      return res.send(400, { message: 'Name empty' });
    }

    try {
      const result = await Events.findOrCreate({
        where: {
          name: req.body.name,
          description: req.body.description,
          out_event_id: req.body.out_event_id,
          private: req.body.private,
          enable: req.body.enable,
        },
      });
      res.send(result);
    } catch (e) {
      console.error(e);
      return res.send(500, e.message);
    }
  }

  async updateEvents(req, res, _next) {
    if (!req.body.name || req.body.name == '') {
      return res.send(400, { message: 'Name empty' });
    }
    try {
      const result = await Events.update(req.body, { where: { event_id: req.params.event_id } });
      res.send(result);
    } catch (e) {
      return res.send(500, e);
    }
  }

  async getEvents(req, res, _next) {
    const result = await Events.findAll();
    res.send(result);
  }

  async getUsersByEvent(req, res, _next) {
    const { event_id } = req.params;

    if (!event_id) {
      return res.send(400, {
        message: 'Event id empty',
      });
    }

    let result = await Settings.findAll({
      attributes: [['setting_id', 'id']],
      where: {
        event_id,
      },
      include: [
        {
          model: UserSubscribes,
          attributes: ['user_id'],
        },
      ],
    });

    let users_id = new Set();
    if (result.length > 0) {
      for (let setting of result) {
        if (setting.user_subscribes.length > 0) {
          for (let user of setting.user_subscribes) {
            users_id.add(user.user_id);
          }
        }
      }
    }

    let users = await this.getUsers(users_id);

    res.send(users);
    next();
  }

  async removeEvents(req, res, _next) {
    if (!!req.query.event_id == false) {
      return res.send(400, { message: 'event_id empty' });
    }

    await Events.destroy({
      where: {
        event_id: req.query.event_id,
      },
    });
    res.send();
  }

  async addRelation(req, res, _next) {
    if (!!req.body.event_id == false) {
      return res.send(400, { message: 'event_id empty' });
    }
    if (!!req.body.transports == false) {
      return res.send(400, { message: 'transports empty' });
    }

    // console.log(req.body.transports);
    let array = req.body.transports.map(async (el) => {
      return await Settings.findCreateFind({
        where: {
          event_id: req.body.event_id,
          communication_id: el.communication_id,
        },
      });
    });
    let incommingArray = await Promise.all(array);
    let arr = incommingArray.map(async (el, i) => {
      await Settings.update(
        {
          ...el[0].dataValues,
          ...req.body.transports[i],
        },
        {
          where: {
            setting_id: el[0].dataValues.setting_id,
          },
        },
      );
      return {
        ...el[0].dataValues,
        ...req.body.transports[i],
      };
    });
    let resp = await Promise.all(arr);
    res.send(resp);
  }

  async removeRelation(req, res, _next) {
    if (!!req.query.setting_id == false) {
      return res.send(400, { message: 'setting_id empty' });
    }

    await Settings.destroy({
      where: {
        setting_id: req.query.setting_id,
      },
    });
    res.send();
  }

  async getUsers(list_user_id) {
    try {
      var usersFull = await this.getUsersInfo(list_user_id);
    } catch (e) {
      throw e;
    }
    return usersFull;
  }
};

module.exports = Lists;
