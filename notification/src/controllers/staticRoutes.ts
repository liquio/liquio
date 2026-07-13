import path from 'node:path';
import crypto from 'node:crypto';
import restify from 'restify';
import { Router } from 'restify-router';
import { MessangerModel } from '../models/smsGate/messangerModel';

const { conf, adminStaticDir } = global as any;

const routerInstance = new Router();
const hmac = crypto.createHmac('sha256', conf.adminConfig.password).update(conf.adminConfig.login).digest('hex');

export class StaticRoutes extends MessangerModel {
  constructor(server: any) {
    super();
    this.registerRoutes();
    return routerInstance.applyRoutes(server) as any;
  }

  buildAdminView(urlName: any, fileName: any) {
    routerInstance.get(
      urlName,
      this.getAdminView.bind(this),
      restify.serveStatic({
        directory: adminStaticDir,
        file: fileName,
      }),
    );
  }

  registerRoutes() {
    this.buildAdminView('/admin', 'index.html');
    this.buildAdminView('/admin/queue', 'queue.html');
    this.buildAdminView('/admin/logs', 'logs.html');
    this.buildAdminView('/admin/subscribe', 'subscribe.html');
    this.buildAdminView('/admin/navbar', 'navbar.html');
    routerInstance.get(
      '/admin/login',
      restify.serveStatic({
        directory: path.join(__dirname, '..', '/admin'),
        file: 'login.html',
      }),
    );
    routerInstance.post('/admin/login', this.adminLogin.bind(this));
    routerInstance.get('/admin/logout', this.adminLogout.bind(this));
    routerInstance.get('/admin/api/queue', this.getAdminView.bind(this), this.SMSQueue.bind(this));
    routerInstance.get('/admin/api/queue/clear/:sms_id', this.getAdminView.bind(this), this.SMSQueueClear.bind(this));
    routerInstance.get('/admin/api/queue/resend', this.getAdminView.bind(this), this.resendSMS.bind(this));
    routerInstance.get('/admin/api/queue/resend/:sms_id', this.getAdminView.bind(this), this.resendSMS.bind(this));
    routerInstance.get('/admin/api/queue/count', this.getAdminView.bind(this), this.SMSQueueCounter.bind(this));
    routerInstance.get('/admin/api/log', this.getAdminView.bind(this), this.SMSLog.bind(this));
  }

  getAdminView(req: any, res: any, next: any) {
    const { cookies } = req;
    if ('myCookie' in cookies && cookies.myCookie == hmac) return next();
    else res.redirect('/admin/login', next);
  }

  adminLogin(req: any, res: any, next: any) {
    const bodyHmac = crypto.createHmac('sha256', req.body.pass).update(req.body.login).digest('hex');

    if (bodyHmac == hmac) {
      res.setCookie('myCookie', hmac, {
        path: '/admin',
        maxAge: 24 * 60 * 60,
        httpOnly: true,
      });
      res.redirect('/admin', next);
    } else {
      res.send(400, { error: 'login or pass not valid' });
    }
  }

  adminLogout(req: any, res: any, next: any) {
    res.clearCookie('myCookie');
    res.redirect('/admin', next);
  }

  async SMSQueue(req: any, res: any, _next: any) {
    const t = await this.getSMSQueue();
    res.send(t);
  }

  async SMSQueueClear(req: any, res: any, _next: any) {
    const t = await this.removeFromQueue(req.params.sms_id != 'undefined' ? req.params.sms_id : false);
    res.send(t);
  }

  async resendSMS(req: any, res: any, _next: any) {
    try {
      const t = await this.retrySendInQueue(req.params.sms_id != 'undefined' ? req.params.sms_id : false);
      res.send(t);
    } catch (e) {
      return res.send(500, e);
    }
  }

  async SMSQueueCounter(req: any, res: any, _next: any) {
    const t = await this.getSMSQueueCounter();
    res.send(t);
  }

  async SMSLog(req: any, res: any, _next: any) {
    const t = await this.getSMSLog(req.query.phone);
    res.send(t);
  }
}
