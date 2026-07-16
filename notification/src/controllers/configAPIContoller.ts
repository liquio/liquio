import { Router } from 'express';
import { ConfigsModel } from '../models/configs';
import { checkConfigAuth } from './auth';

const { Configs } = new ConfigsModel();
const router = Router();

export class ConfigsController {
  constructor(app: any) {
    this.registerRoutes();
    app.use('/configs', router);
  }

  registerRoutes() {
    router.get('/', checkConfigAuth, this.getConfig.bind(this));
    router.post('/', checkConfigAuth, this.upsertConfig.bind(this));
    router.put('/:id', checkConfigAuth, this.upsertConfig.bind(this));
    router.delete('/:id', checkConfigAuth, this.deleteConfig.bind(this));
  }

  async getConfig(req: any, res: any, next: any) {
    const { environment } = req.query;
    let query: any = {};
    if (environment) {
      query = {
        where: {
          environment,
        },
      };
    }
    const result = await Configs.findAll(query);
    res.send(result);
    next();
  }

  async upsertConfig(req: any, res: any, next: any) {
    const { id } = req.params;
    const { body } = req;
    const method = req.method;
    let result;
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

  async deleteConfig(req: any, res: any, next: any) {
    const { id } = req.params;
    if (!id) {
      return res.send(400, { message: 'Config ID empty' });
    }
    try {
      await Configs.destroy({
        where: { id },
      });
      res.send();
    } catch (e: any) {
      res.send(500, e.message);
    }
    next();
  }
}
