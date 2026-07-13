import { Router } from 'restify-router';
import { CommunicationModel } from '../models/communications';
import { UserSubscribesModel } from '../models/user_subscribes';
import { SettingsModel } from '../models/settings';
import { EventsModel } from '../models/events';
import { checkAuth } from './auth';
import { Auth } from '../models/authServer';

const routerInstance = new Router();
const Communication = new CommunicationModel().Communications;
const Settings = new SettingsModel().Settings;
const { UserSubscribes } = new UserSubscribesModel();
const Events = new EventsModel().Events;

export class Lists extends Auth {
  constructor(server: any) {
    super();
    this.registerRoutes();
    return routerInstance.applyRoutes(server) as any;
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

  async getLists(req: any, res: any, next: any) {
    const query: any = {
      where: {
        enable: true,
      },
    };
    if (req.query.show_all && typeof req.query.show_all == 'string' && req.query.show_all == 'true') {
      delete query.where;
    }

    const result = await Events.findAll({
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

  async addTransport(req: any, res: any, next: any) {
    if (!req.body.name || req.body.name == '') {
      return res.send(400, { message: 'Name empty' });
    }

    const result = await Communication.findOrCreate({
      where: {
        name: req.body.name,
        enable: req.body.enable,
      },
    });
    res.send(result);
    next();
  }

  async getTransport(req: any, res: any, next: any) {
    const result = await Communication.findAll();
    res.send(result);
    next();
  }

  async removeTransport(req: any, res: any, _next: any) {
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

  async addEvents(req: any, res: any, _next: any) {
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
    } catch (e: any) {
      return res.send(500, e.message);
    }
  }

  async updateEvents(req: any, res: any, _next: any) {
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

  async getEvents(req: any, res: any, next: any) {
    const result = await Events.findAll();
    res.send(result);
    next();
  }

  async getUsersByEvent(req: any, res: any, next: any) {
    const { event_id } = req.params;

    if (!event_id) {
      return res.send(400, {
        message: 'Event id empty',
      });
    }

    const result = await Settings.findAll({
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

    const users_id = new Set();
    if (result.length > 0) {
      for (const setting of result) {
        if (setting.user_subscribes.length > 0) {
          for (const user of setting.user_subscribes) {
            users_id.add(user.user_id);
          }
        }
      }
    }

    const users = await this.getUsers(users_id);

    res.send(users);
    next();
  }

  async removeEvents(req: any, res: any, _next: any) {
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

  async addRelation(req: any, res: any, _next: any) {
    if (!!req.body.event_id == false) {
      return res.send(400, { message: 'event_id empty' });
    }
    if (!!req.body.transports == false) {
      return res.send(400, { message: 'transports empty' });
    }

    // console.log(req.body.transports);
    const array = req.body.transports.map(async (el: any) => {
      return await Settings.findCreateFind({
        where: {
          event_id: req.body.event_id,
          communication_id: el.communication_id,
        },
      });
    });
    const incommingArray = await Promise.all(array);
    const arr = incommingArray.map(async (el: any, i: number) => {
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
    const resp = await Promise.all(arr);
    res.send(resp);
  }

  async removeRelation(req: any, res: any, _next: any) {
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

  async getUsers(list_user_id: any) {
    const usersFull = await this.getUsersInfo(list_user_id);
    return usersFull;
  }
}
