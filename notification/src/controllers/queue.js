const { MessangerModel } = require('../models/smsGate/messangerModel');
const { checkAuth } = require('./auth');

let Router = require('restify-router').Router;
let routerInstance = new Router();

const Queue = class extends MessangerModel {
  constructor(server) {
    super();
    this.registerRoutes();
    return routerInstance.applyRoutes(server, 'queue');
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

  async SMSQueue(req, res, next) {
    let t = await this.getSMSQueue();
    res.send(t);
  }

  async SMSQueueClear(req, res, next) {
    let t = await this.removeFromQueue(req.params.sms_id != 'undefined' ? req.params.sms_id : false);
    res.send(t);
  }

  async resendSMS(req, res, next) {
    try {
      var t = await this.retrySendInQueue(req.params.sms_id != 'undefined' ? req.params.sms_id : false);
    } catch (e) {
      return res.send(500, e);
    }
    res.send(t);
  }

  async SMSQueueCounter(req, res, next) {
    let t = await this.getSMSQueueCounter();
    res.send(t);
  }

  async SMSLog(req, res, next) {
    let t = await this.getSMSLog(req.query.phone);
    res.send(t);
  }
};

module.exports = Queue;
