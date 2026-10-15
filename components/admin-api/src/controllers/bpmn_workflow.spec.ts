import { EventEmitter } from 'events';

import { matchedData } from 'express-validator';

import { BpmnWorkflowController } from './bpmn_workflow';

jest.mock('express-validator', () => ({ matchedData: jest.fn() }));
jest.mock('../businesses/bpmn_workflow', () => ({ BpmnWorkflowBusiness: jest.fn() }));
jest.mock('../businesses/workflow', () => ({ WorkflowBusiness: jest.fn() }));

const MAX = 100;

describe('BpmnWorkflowController.import', () => {
  let controller: BpmnWorkflowController;
  let business: Record<string, jest.Mock>;
  let res: any;

  const makeReq = (headers: Record<string, string> = {}) => {
    const req: any = new EventEmitter();
    req.headers = headers;
    req.connection = { remoteAddress: '127.0.0.1' };
    req.destroy = jest.fn();
    req.pause = jest.fn();
    return req;
  };
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    (BpmnWorkflowController as any).singleton = undefined;
    (global as any).log = { save: jest.fn() };
    controller = new BpmnWorkflowController({ bpmnImport: { maxBytes: MAX } });
    business = { import: jest.fn().mockResolvedValue(true) };
    (controller as any).bpmnWorkflowBusiness = business;
    res = { status: jest.fn().mockReturnThis(), send: jest.fn(), setHeader: jest.fn(), req: { originalUrl: '/x', method: 'POST' } };
    (matchedData as jest.Mock).mockReturnValue({});
  });

  afterEach(() => {
    delete (global as any).log;
  });

  it('imports a body below the cap', async () => {
    const req = makeReq();
    const promise = controller.import(req, res);
    req.emit('data', Buffer.from('{"a":'));
    req.emit('data', Buffer.from('1}'));
    req.emit('end');
    await promise;

    expect(business.import).toHaveBeenCalledWith({ a: 1 }, false, expect.any(Object), false);
    expect(req.destroy).not.toHaveBeenCalled();
  });

  it('rejects with 413 when streamed data exceeds the cap, without calling business', async () => {
    const req = makeReq();
    const promise = controller.import(req, res);
    req.emit('data', Buffer.alloc(60));
    req.emit('data', Buffer.alloc(60));
    await promise;
    req.emit('data', Buffer.alloc(60));

    expect(res.status).toHaveBeenCalledWith(413);
    expect(business.import).not.toHaveBeenCalled();
    expect(req.destroy).toHaveBeenCalled();
  });

  it('rejects early with 413 on oversized Content-Length without reading the body', async () => {
    const req = makeReq({ 'content-length': String(MAX + 1) });
    await controller.import(req, res);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(business.import).not.toHaveBeenCalled();
    expect(req.listenerCount('data')).toBe(0);
  });

  it('responds 400 on invalid JSON', async () => {
    const req = makeReq();
    const promise = controller.import(req, res);
    req.emit('data', Buffer.from('{not json'));
    req.emit('end');
    await promise;
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(business.import).not.toHaveBeenCalled();
  });
});
