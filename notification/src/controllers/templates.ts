import { Router } from 'restify-router';
import { TemplatesModel } from '../models/templates';
import { checkAuth } from './auth';

const routerInstance = new Router();
const templatesModel = new TemplatesModel();
const Templates = templatesModel.Templates;

export class Template {
  log: any;

  constructor(server: any) {
    this.log = global.log;
    this.registerRoutes();
    return routerInstance.applyRoutes(server) as any;
  }

  registerRoutes() {
    routerInstance.get('/template', this.getTemplates.bind(this));
    routerInstance.post('/template', checkAuth, this.addTemplate.bind(this));
    routerInstance.put('/template/:template_id', checkAuth, this.changeTemplate.bind(this));
    routerInstance.del('/template/:template_id', checkAuth, this.deleteTemplate.bind(this));
    routerInstance.post('/prepareMessageByTemplateId', this.prepareMessage.bind(this));
    routerInstance.post('/import/template', checkAuth, this.importTemplates.bind(this));
  }

  async getTemplates(req: any, res: any) {
    let result;
    try {
      const { template_id, template_ids } = req?.query || {};
      if (template_id && template_ids) {
        return res.send(400, { message: 'Only one of params template_id or template_ids can be passed.' });
      }
      const filters: any = {};
      if (template_id) filters['template_id'] = Number(template_id);
      if (template_ids) filters['template_id'] = { $in: template_ids.map(Number) };

      result = await Templates.findAll({
        where: filters,
      });
    } catch (e: any) {
      return res.send(500, { message: e.message });
    }

    if (result.length == 0) return res.send([]);

    const arr = result.map(async (v: any) => {
      const paramsFromTpl = v.text.match(new RegExp('\\${' + '\\w{1,}}', 'igm'));
      let params;
      if (paramsFromTpl) params = paramsFromTpl.map((v: any) => v.replace(/[${}]/g, ''));
      return {
        template_id: v.template_id,
        type: v.type,
        text: v.text,
        title: v.title,
        params,
      };
    });
    let response: any = await Promise.all(arr);
    if (req.query.template_id) response = response[0];
    res.send(response);
  }

  async deleteTemplate(req: any, res: any) {
    if (!req.params.template_id || req.params.template_id.trim() == '') {
      return res.send(400, { message: 'Template id empty' });
    }

    try {
      await Templates.destroy({
        where: {
          template_id: req.params.template_id,
        },
        individualHooks: true,
      });
    } catch (e: any) {
      return res.send(500, { message: e.message });
    }

    res.send();
  }

  async addTemplate(req: any, res: any) {
    if (!req.body.type || req.body.type.trim() == '' || (req.body.type && req.body.type != 'sms' && req.body.type != 'email')) {
      return res.send(400, { message: 'Type must be \'sms\' or \'email\'' });
    }
    if (!req.body.text || req.body.text.trim() == '') {
      return res.send(400, { message: 'Text id empty' });
    }

    try {
      const result = await Templates.create({ ...req.body });
      if (!result) {
        this.log.save('template-create-null-result', { body: req.body }, 'error');
        return res.send(500, { message: 'Failed to create template - no result returned' });
      }
      this.log.save('template-create-success', { templateId: result.template_id, type: result.type, title: result.title }, 'info');
      res.send(result);
    } catch (e: any) {
      this.log.save('template-create-error', { error: e.message, body: req.body }, 'error');
      return res.send(500, { message: e.message });
    }
  }

  async changeTemplate(req: any, res: any) {
    if (!req.body.type || req.body.type.trim() == '' || (req.body.type && req.body.type != 'sms' && req.body.type != 'email')) {
      return res.send(400, { message: 'Type must be \'sms\' or \'email\'' });
    }
    if (!req.body.text || req.body.text.trim() == '') {
      return res.send(400, { message: 'Text id empty' });
    }
    if (!req.params.template_id || req.params.template_id.trim() == '') {
      return res.send(400, { message: 'Template id empty' });
    }

    try {
      const result = await Templates.update(
        { ...req.body },
        { where: { template_id: req.params.template_id }, individualHooks: true, returning: true },
      );
      if (!result || result.length === 0) {
        this.log.save('template-update-no-rows', { templateId: req.params.template_id, body: req.body }, 'warn');
        return res.send(404, { message: 'Template not found' });
      }
      this.log.save('template-update-success', { templateId: req.params.template_id, type: result[1][0].type, title: result[1][0].title }, 'info');
      res.send(result);
    } catch (e: any) {
      this.log.save('template-update-error', { error: e.message, templateId: req.params.template_id }, 'error');
      return res.send(500, { message: e.message });
    }
  }

  async prepareMessage(req: any, res: any) {
    if (!req.body.template_id || req.body.template_id == 0) {
      return res.send(400, { message: 'Template id empty' });
    }
    if (isNaN(req.body.template_id)) {
      return res.send(400, { message: 'Template id must be a number' });
    }
    if (!req.body.params || Object.keys(req.body.params).length == 0) {
      return res.send(400, { message: 'Params empty' });
    }

    let template: any;
    try {
      template = await Templates.findOne({
        where: { template_id: req.body.template_id },
      });
    } catch (e: any) {
      return res.send(500, { message: e.message });
    }
    if (template == null) return res.send(404, { message: 'Template not found' });

    const params = req.body.params;

    const paramsFromTpl = template.text.match(new RegExp('\\${' + '\\w{1,}}', 'igm'));
    const paramsKeys = Object.keys(params);
    if (paramsFromTpl != null) {
      for (const tplParam of paramsFromTpl) {
        const el = tplParam.replace(/\W/gim, '');
        if (paramsKeys.includes(el) == false) {
          return res.send(400, { message: `Param ${el} required for this template` });
        }
        template.text = template.text.replace(new RegExp('\\${' + el + '}', 'igm'), params[el].toString());
      }
    }
    res.send({ message: template.text });
  }

  async importTemplates(req: any, res: any) {
    const { dataToImport, rewriteTemplateIds } = req.body;
    const transaction = await templatesModel.sequelize.transaction();

    try {
      const importingTemplateIds = dataToImport.map(({ template_id }: any) => template_id);

      this.log.save('import-message-templates|start', {
        importingTemplateIds,
        rewriteTemplateIds,
      });

      const existingTemplates = await Templates.findAll();
      const existingTemplateIds = existingTemplates.map(({ template_id }: any) => template_id);

      // If all importing templates don't exist.
      if (importingTemplateIds.every((templateId: any) => !existingTemplateIds.includes(templateId))) {
        const createdTemplates = await Templates.bulkCreate(dataToImport);

        this.log.save('import-message-templates|imported|importing-templates-don\'t-exist', {
          createdTemplatesCount: createdTemplates?.length || 0,
        });

        return res.send({ createdTemplatesCount: createdTemplates?.length || 0 });
      }

      // If template with id isn't exist - create new template with defined id.
      const templateIdsToCreateWithDefinedId = importingTemplateIds.filter((templateId: any) => !existingTemplateIds.includes(templateId));

      // If template with id exists and we MUST REWRITE this template - update existing template by new text, type and title.
      const templateIdsToUpdate = importingTemplateIds.filter(
        (templateId: any) => existingTemplateIds.includes(templateId) && rewriteTemplateIds.includes(templateId),
      );
      if (templateIdsToUpdate.length !== rewriteTemplateIds.length) {
        return res.send(400, { message: 'Passed incorrect rewriteTemplateIds.' });
      }

      // If template with id exists and we MUSTN'T REWRITE this template - create new template with new id but with passed text, type and title.
      const templateIdsToCreateWithNewId = importingTemplateIds.filter(
        (templateId: any) => existingTemplateIds.includes(templateId) && !rewriteTemplateIds.includes(templateId),
      );

      this.log.save('import-message-templates|params-to-create-and-update-defined', {
        importingTemplateIds,
        existingTemplateIds,
        rewriteTemplateIds,
        templateIdsToCreateWithDefinedId,
        templateIdsToUpdate,
        templateIdsToCreateWithNewId,
      });

      const createdTemplatesWithDefinedId = await Templates.bulkCreate(
        dataToImport
          .filter((template: any) => templateIdsToCreateWithDefinedId.includes(template.template_id))
          .map(({ template_id, type, text, title }: any) => ({ template_id, type, text, title })),
        {
          individualHooks: true,
          transaction,
        },
      );

      const recordsToUpdate = dataToImport
        .filter((template: any) => templateIdsToUpdate.includes(template.template_id))
        .map(({ template_id, type, text, title }: any) => ({ template_id, type, text, title }));

      const updatedTemplates = await Promise.all(
        recordsToUpdate.map((template: any) => {
          return Templates.update(
            { ...template },
            {
              where: { template_id: template.template_id },
              individualHooks: true,
              transaction,
            },
          );
        }),
      );
      const createdTemplatesWithNewId = await Templates.bulkCreate(
        dataToImport
          .filter((template: any) => templateIdsToCreateWithNewId.includes(template.template_id))
          .map(({ type, text, title }: any) => ({ type, text, title })), // Don't define template_id field.
        {
          individualHooks: true,
          transaction,
        },
      );

      await transaction.commit();

      this.log.save('import-message-templates|imported|importing-templates-exist', {
        createdTemplatesCount: (createdTemplatesWithDefinedId?.length || 0) + (createdTemplatesWithNewId?.length || 0),
        updatedTemplatesCount: updatedTemplates?.length || 0,
      });

      return res.send({
        createdTemplatesCount: (createdTemplatesWithDefinedId?.length || 0) + (createdTemplatesWithNewId?.length || 0),
        updatedTemplatesCount: updatedTemplates?.length || 0,
      });
    } catch (error: any) {
      await transaction.rollback();
      this.log.save('import-message-templates|error', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      return res.send(500);
    }
  }
}
