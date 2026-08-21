import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import { MessangerModel } from '../models/smsGate/messangerModel';

const { conf, adminStaticDir } = global as any;

const router = Router();
const hmac = crypto.createHmac('sha256', conf.adminConfig.password).update(conf.adminConfig.login).digest('hex');

export class StaticRoutes extends MessangerModel {
  constructor(app: any) {
    super();
    this.registerRoutes();
    app.use(router);
  }

  buildAdminView(urlName: any, fileName: any) {
    router.get(
      urlName,
      this.getAdminView.bind(this),
      (req: any, res: any) => res.sendFile(path.join(adminStaticDir, fileName)),
    );
  }

  registerRoutes() {
    this.buildAdminView('/admin', 'index.html');
    this.buildAdminView('/admin/queue', 'queue.html');
    this.buildAdminView('/admin/logs', 'logs.html');
    this.buildAdminView('/admin/subscribe', 'subscribe.html');
    this.buildAdminView('/admin/navbar', 'navbar.html');
    router.get('/admin/login', (req: any, res: any) => res.sendFile(path.join(__dirname, '..', 'admin', 'login.html')));
    router.post('/admin/login', this.adminLogin.bind(this));
    router.get('/admin/logout', this.adminLogout.bind(this));
    router.get('/admin/api/queue', this.getAdminView.bind(this), this.SMSQueue.bind(this));
    router.get('/admin/api/queue/clear/:sms_id', this.getAdminView.bind(this), this.SMSQueueClear.bind(this));
    router.get('/admin/api/queue/resend', this.getAdminView.bind(this), this.resendSMS.bind(this));
    router.get('/admin/api/queue/resend/:sms_id', this.getAdminView.bind(this), this.resendSMS.bind(this));
    router.get('/admin/api/queue/count', this.getAdminView.bind(this), this.SMSQueueCounter.bind(this));
    router.get('/admin/api/log', this.getAdminView.bind(this), this.SMSLog.bind(this));
  }

  getAdminView(req: any, res: any, next: any) {
    const { cookies } = req;
    if ('myCookie' in cookies && cookies.myCookie == hmac) return next();
    else res.redirect('/admin/login');
  }

  adminLogin(req: any, res: any) {
    const bodyHmac = crypto.createHmac('sha256', req.body.pass).update(req.body.login).digest('hex');

    if (bodyHmac == hmac) {
      // restify's res.setCookie maxAge is in seconds; express's res.cookie maxAge is in milliseconds.
      res.cookie('myCookie', hmac, {
        path: '/admin',
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
      });
      res.redirect('/admin');
    } else {
      res.send(400, { error: 'login or pass not valid' });
    }
  }

  adminLogout(req: any, res: any) {
    res.clearCookie('myCookie');
    res.redirect('/admin');
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
