let { conf, adminStaticDir } = global;
const { MessangerModel } = require('../models/smsGate/messangerModel');

const path = require('path');
let restify = require('restify');
let Router = require('restify-router').Router;
let routerInstance = new Router();
const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', conf.adminConfig.password).update(conf.adminConfig.login).digest('hex');

const StaticRoutes = class extends MessangerModel {
  constructor(server) {
    super();
    this.registerRoutes();
    return routerInstance.applyRoutes(server);
  }

  buildAdminView(urlName, fileName) {
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

  getAdminView(req, res, next) {
    let { cookies } = req;
    if ('myCookie' in cookies && cookies.myCookie == hmac) return next();
    else res.redirect('/admin/login', next);
  }

  adminLogin(req, res, next) {
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

  adminLogout(req, res, next) {
    res.clearCookie('myCookie');
    res.redirect('/admin', next);
  }

  async SMSQueue(req, res, _next) {
    const t = await this.getSMSQueue();
    res.send(t);
  }

  async SMSQueueClear(req, res, _next) {
    const t = await this.removeFromQueue(req.params.sms_id != 'undefined' ? req.params.sms_id : false);
    res.send(t);
  }

  async resendSMS(req, res, _next) {
    try {
      const t = await this.retrySendInQueue(req.params.sms_id != 'undefined' ? req.params.sms_id : false);
      res.send(t);
    } catch (e) {
      return res.send(500, e);
    }
  }

  async SMSQueueCounter(req, res, _next) {
    const t = await this.getSMSQueueCounter();
    res.send(t);
  }

  async SMSLog(req, res, _next) {
    const t = await this.getSMSLog(req.query.phone);
    res.send(t);
  }
};

module.exports = StaticRoutes;
