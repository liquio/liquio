import path from 'node:path';

import { Router } from 'express';

import { MessangerModel } from '../models/smsGate/messangerModel';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  adminCookieOptions,
  createAdminSession,
  destroyAdminSession,
  isLoginBlocked,
  recordLoginFailure,
  resetLoginFailures,
  verifyAdminCredentials,
  verifyAdminSession,
} from './adminSession';
import { checkAdminCookie, checkSameOrigin } from './auth';

const { adminStaticDir } = global as any;

const router = Router();

const parseSmsId = (value: unknown): number | null => {
  const id = /^[1-9]\d{0,9}$/.test(String(value)) ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
};

export class StaticRoutes extends MessangerModel {
  constructor(app: any) {
    super();
    this.registerRoutes();
    app.use(router);
  }

  buildAdminView(urlName: any, fileName: any) {
    router.get(urlName, this.getAdminView.bind(this), (req: any, res: any) => res.sendFile(path.join(adminStaticDir, fileName)));
  }

  registerRoutes() {
    this.buildAdminView('/admin', 'index.html');
    this.buildAdminView('/admin/queue', 'queue.html');
    this.buildAdminView('/admin/logs', 'logs.html');
    this.buildAdminView('/admin/navbar', 'navbar.html');
    router.get('/admin/login', (req: any, res: any) => res.sendFile(path.join(__dirname, '..', 'admin', 'login.html')));
    router.post('/admin/login', this.adminLogin.bind(this));
    router.get('/admin/logout', this.adminLogout.bind(this));
    router.get('/admin/api/queue', this.getAdminView.bind(this), this.SMSQueue.bind(this));
    // State-changing queue actions: POST only, same-origin and a live admin session (SameSite=Strict cookie).
    const guard = [checkSameOrigin, checkAdminCookie];
    router.post('/admin/api/queue/clear-all', ...guard, this.SMSQueueClearAll.bind(this));
    router.post('/admin/api/queue/clear/:sms_id', ...guard, this.SMSQueueClear.bind(this));
    router.post('/admin/api/queue/resend-all', ...guard, this.resendAllSMS.bind(this));
    router.post('/admin/api/queue/resend/:sms_id', ...guard, this.resendSMS.bind(this));
    router.get('/admin/api/queue/count', this.getAdminView.bind(this), this.SMSQueueCounter.bind(this));
    router.get('/admin/api/log', this.getAdminView.bind(this), this.SMSLog.bind(this));
  }

  getAdminView(req: any, res: any, next: any) {
    if (verifyAdminSession(req)) return next();
    res.redirect('/admin/login');
  }

  adminLogin(req: any, res: any) {
    const ip = String(req.ip || req.socket?.remoteAddress || '');
    if (isLoginBlocked(ip)) {
      return res.send(429, { error: 'too many login attempts' });
    }

    const { login, pass } = req.body || {};
    if (!verifyAdminCredentials(login, pass)) {
      recordLoginFailure(ip);
      return res.send(400, { error: 'login or pass not valid' });
    }

    resetLoginFailures(ip);
    // Drop any session presented with the login request, then issue a fresh id.
    destroyAdminSession(req);
    // restify's res.setCookie maxAge is in seconds; express's res.cookie maxAge is in milliseconds.
    res.cookie(ADMIN_COOKIE_NAME, createAdminSession(), { ...adminCookieOptions(req), maxAge: ADMIN_SESSION_TTL_MS });
    res.redirect('/admin');
  }

  adminLogout(req: any, res: any) {
    destroyAdminSession(req);
    res.clearCookie(ADMIN_COOKIE_NAME, adminCookieOptions(req));
    res.redirect('/admin');
  }

  async SMSQueue(req: any, res: any, _next: any) {
    const t = await this.getSMSQueue();
    res.send(t);
  }

  async SMSQueueClear(req: any, res: any, _next: any) {
    const smsId = parseSmsId(req.params.sms_id);
    if (!smsId) return res.send(400, { code: 'BadRequest', message: 'sms_id must be a positive integer' });
    try {
      res.send(await this.removeFromQueue(smsId));
    } catch (e) {
      return res.send(500, e);
    }
  }

  async SMSQueueClearAll(req: any, res: any, _next: any) {
    if (req.body?.confirm !== true) return res.send(400, { code: 'BadRequest', message: 'confirm: true is required' });
    try {
      res.send(await this.removeAllFromQueue());
    } catch (e) {
      return res.send(500, e);
    }
  }

  async resendSMS(req: any, res: any, _next: any) {
    const smsId = parseSmsId(req.params.sms_id);
    if (!smsId) return res.send(400, { code: 'BadRequest', message: 'sms_id must be a positive integer' });
    try {
      res.send(await this.retrySendInQueue(smsId));
    } catch (e) {
      return res.send(500, e);
    }
  }

  async resendAllSMS(req: any, res: any, _next: any) {
    if (req.body?.confirm !== true) return res.send(400, { code: 'BadRequest', message: 'confirm: true is required' });
    try {
      res.send(await this.retrySendAllInQueue());
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
