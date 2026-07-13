import { Router } from 'restify-router';
import { MessangerModel } from '../models/smsGate/messangerModel';
import { checkAuth } from './auth';

const routerInstance = new Router();

export class Queue extends MessangerModel {
  constructor(server: any) {
    super();
    this.registerRoutes();
    return routerInstance.applyRoutes(server, 'queue') as any;
  }

  registerRoutes() {
    routerInstance.get('/', checkAuth, this.SMSQueue.bind(this));
    routerInstance.get('/clear', checkAuth, this.SMSQueueClear.bind(this));
    routerInstance.get('/clear/:sms_id', checkAuth, this.SMSQueueClear.bind(this));
    routerInstance.get('/resend', checkAuth, this.resendSMS.bind(this));
    routerInstance.get('/resend/:sms_id', checkAuth, this.resendSMS.bind(this));
    routerInstance.get('/count', checkAuth, this.SMSQueueCounter.bind(this));
    routerInstance.get('/log', checkAuth, this.SMSLog.bind(this));
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
