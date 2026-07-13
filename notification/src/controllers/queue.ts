import { Router } from 'express';
import { MessangerModel } from '../models/smsGate/messangerModel';
import { checkAuth } from './auth';

const router = Router();

export class Queue extends MessangerModel {
  constructor(app: any) {
    super();
    this.registerRoutes();
    app.use('/queue', router);
  }

  registerRoutes() {
    router.get('/', checkAuth, this.SMSQueue.bind(this));
    router.get('/clear', checkAuth, this.SMSQueueClear.bind(this));
    router.get('/clear/:sms_id', checkAuth, this.SMSQueueClear.bind(this));
    router.get('/resend', checkAuth, this.resendSMS.bind(this));
    router.get('/resend/:sms_id', checkAuth, this.resendSMS.bind(this));
    router.get('/count', checkAuth, this.SMSQueueCounter.bind(this));
    router.get('/log', checkAuth, this.SMSLog.bind(this));
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
