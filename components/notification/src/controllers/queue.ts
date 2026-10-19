import { Router } from 'express';

import { MessangerModel } from '../models/smsGate/messangerModel';
import { checkAuth } from './auth';

const router = Router();

const parseSmsId = (value: unknown): number | null => {
  const id = /^[1-9]\d{0,9}$/.test(String(value)) ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
};

export class Queue extends MessangerModel {
  constructor(app: any) {
    super();
    this.registerRoutes();
    app.use('/queue', router);
  }

  registerRoutes() {
    router.get('/', checkAuth, this.SMSQueue.bind(this));
    router.post('/clear-all', checkAuth, this.SMSQueueClearAll.bind(this));
    router.post('/clear/:sms_id', checkAuth, this.SMSQueueClear.bind(this));
    router.post('/resend-all', checkAuth, this.resendAllSMS.bind(this));
    router.post('/resend/:sms_id', checkAuth, this.resendSMS.bind(this));
    router.get('/count', checkAuth, this.SMSQueueCounter.bind(this));
    router.get('/log', checkAuth, this.SMSLog.bind(this));
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
