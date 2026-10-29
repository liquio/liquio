import { TestApp } from './test-app';

const BODY = 'soapenv:Envelope.soapenv:Body.0';
const CLAIM = `${BODY}.ext:claimStatus`;

// ExternalServicesBusiness: SOAP body helpers and the certificate result status flow with model spies.
describe('External services business', () => {
  let app: TestApp;
  const business = () => (global as any).businesses.externalServices;
  const models = () => (global as any).models;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  const claimBody = (claim: any) => ({ 'soapenv:Envelope': { 'soapenv:Body': [{ 'ext:claimStatus': [claim] }] } });

  describe('soap helpers', () => {
    it('maps namespaces of a request body', () => {
      const body = {
        'soapenv:Envelope': {
          $: { 'xmlns:s': 'urn:s', 'xmlns:h': 'urn:h', 's:other': 'x' },
          'soapenv:Body': [{ claimStatus: [{ workflowId: ['w'], 'h:item': [{ nested: ['n'] }] }], list: [{ a: ['1'] }] }],
        },
      };
      const mapped = business().mapBodyNamespaces(body);
      expect(mapped['soapenv:Envelope'].$['xmlns:ext']).toBe('ext');
      expect(JSON.stringify(mapped)).toContain('ext:claimStatus');
      expect(JSON.stringify(mapped)).toContain('xro:item');
      expect(business().mapChildNamespaces('text')).toBe('text');
    });

    it('prepares and clears an xml response', () => {
      const request = {
        'soapenv:Envelope': {
          $: { 'xmlns:iden': 'urn:iden' },
          'soapenv:Header': [{ 'xro:client': [{ 'id:xroadInstance': ['client-instance'], 'id:serviceVersion': ['1'] }], 'xro:service': [{}] }],
          'soapenv:Body': [{ 'ext:claimStatus': [{}] }],
        },
      };
      const ok = business().prepareObjectForXmlResponse(request, { id: 'w1' });
      expect(JSON.stringify(ok)).toContain('"ext:workflowId":"w1"');
      expect(JSON.stringify(ok)).toContain('"ext:requestReceiveStatus":"0"');
      expect(ok['soapenv:Envelope'].$['xmlns:id']).toBe('urn:iden');
      const fault = business().prepareObjectForXmlResponse(request, { id: 'w1' }, 5, 'details');
      expect(JSON.stringify(fault)).toContain('"ext:requestReceiveStatus":"1"');
      expect(JSON.stringify(business().prepareObjectForXmlResponse(request, { id: 'w1' }, 0, 'only details'))).toContain('only details');
      const cleared = business().clearXmlRequestObjectForResponse(request);
      expect(cleared['soapenv:Envelope']['soapenv:Body'][0]).toEqual({});
      const withBody = business().setXmlResponseBody(request, { plain: ['x'] });
      expect(JSON.stringify(withBody)).toContain('ext:plain');
    });

    it('reads values of a claim status body', () => {
      const body = claimBody({
        'ext:workflowId': ['wf-1|1700000000'],
        'ext:TypeService': ['type'],
        'ext:RequestId': ['req'],
        'ext:ServiceId': ['svc'],
        'ext:ServiceSt': ['st'],
        'ext:ArDate': ['ar'],
        'ext:LastFaultData': ['fault'],
        'ext:CeDate': ['ce'],
        'ext:ServiceDateRequest': ['dr'],
        'ext:ServiceDateAnswer': ['da'],
        'ext:serviceProcessingStatus': ['7'],
        'ext:serviceProcessingResult': ['result'],
        'ext:serviceProcessingFaultCode': [{ $: { nil: 'true' } }],
      });
      expect(business().fetchBodyWorkflowId(body)).toBe('wf-1|1700000000');
      expect(business().fetchWorkflowId(body)).toBe('wf-1');
      expect(business().fetchTimestamp(body)).toBe('1700000000');
      expect(business().fetchTypeService(body)).toBe('type');
      expect(business().fetchRequestId(body)).toBe('req');
      expect(business().fetchServiceId(body)).toBe('svc');
      expect(business().fetchServiceSt(body)).toBe('st');
      expect(business().fetchArDate(body)).toBe('ar');
      expect(business().fetchLastFaultData(body)).toBe('fault');
      expect(business().fetchCeDate(body)).toBe('ce');
      expect(business().fetchServiceDateRequest(body)).toBe('dr');
      expect(business().fetchServiceDateAnswer(body)).toBe('da');
      expect(business().fetchServiceProcessingStatus(body)).toBe(7);
      expect(business().fetchServiceProcessingResult(body)).toBe('result');
      expect(business().fetchServiceProcessingFaultCode(body)).toBeNull();
      const empty = {};
      expect(business().fetchWorkflowId(empty)).toBeUndefined();
      expect(business().fetchTimestamp(empty)).toBeUndefined();
      expect(business().fetchRequestId(empty)).toBeNull();
      expect(business().fetchServiceId(empty)).toBeNull();
      expect(business().fetchServiceProcessingResult(empty)).toBeNull();
      expect(CLAIM).toContain('claimStatus');
    });

    it('finds the status task template and the workflow', async () => {
      const config = (global as any).config;
      config.external_services = { ...config.external_services, trembitaStatusTaskTemplateIds: { 5: 77 } };
      expect(business().getTaskTemplateIdByWorkflowTemplateId(5)).toBe(77);
      jest.spyOn(models().workflow, 'findById').mockResolvedValue({ id: 'w' } as any);
      expect(await business().fetchWorkflowByWorkflowId('w')).toEqual({ id: 'w' });
    });
  });

  describe('certResultSetStatus', () => {
    const request = { externalServiceUser: 'ext-user', requestId: 'req-1', parsedResultData: { P7S: 'p7s', certNum: '42' } };
    const document = { id: 'doc-1', data: { calculated: { taskTemplateIdToReceiveStatus: 9 } } };
    const run = (extra: any = {}) => business().certResultSetStatus({ ...request, ...extra });

    const happy = () => {
      jest.spyOn(models().document, 'getByExternalId').mockResolvedValue(document as any);
      jest.spyOn(models().task, 'findByDocumentId').mockResolvedValue({ id: 't-src', workflowId: 'wf' } as any);
      jest
        .spyOn(models().task, 'findDocumentByWorkflowIdAndTaskTemplateIds')
        .mockResolvedValue({ task: { id: 't-target' }, document: { id: 'doc-target' } } as any);
      jest.spyOn(business().eds, 'getSignatureInfo').mockResolvedValue({ content: Buffer.from('%PDF').toString('base64') } as any);
      jest.spyOn(business().storageService.provider, 'uploadFileFromStream').mockResolvedValue({ id: 'cert-file' } as any);
      jest.spyOn(models().document, 'addDocumentFile').mockResolvedValue(undefined as any);
      jest.spyOn((global as any).businesses.document, 'updateByExternalService').mockResolvedValue(undefined as any);
      jest.spyOn(models().workflow, 'setNumber').mockResolvedValue(undefined as any);
      jest.spyOn((global as any).businesses.task, 'setStatusFinished').mockResolvedValue({ id: 't-target' } as any);
      jest.spyOn((global as any).businesses.userInbox, 'sendToInboxesIfNeedIt').mockResolvedValue(undefined as any);
      jest.spyOn(models().document, 'setStatusFinal').mockResolvedValue(true as any);
      return jest.spyOn((global as any).messageQueue, 'produce').mockResolvedValue(undefined as any);
    };

    it('stores the certificate, finishes the task and notifies the queue', async () => {
      const produce = happy();
      await run();
      expect(produce).toHaveBeenCalledWith({ workflowId: 'wf', taskId: 't-target' });
      expect(models().workflow.setNumber).toHaveBeenCalledWith('wf', '42');
    });

    it('rejects an unknown request, task, workflow or status template', async () => {
      happy();
      jest.spyOn(models().document, 'getByExternalId').mockResolvedValueOnce(undefined as any);
      await expect(run()).rejects.toThrow("Can't find document");
      jest.spyOn(models().task, 'findByDocumentId').mockResolvedValueOnce(undefined as any);
      await expect(run()).rejects.toThrow("Can't find task");
      jest.spyOn(models().task, 'findByDocumentId').mockResolvedValueOnce({ id: 't' } as any);
      await expect(run()).rejects.toThrow('Workflow not found');
      jest.spyOn(models().document, 'getByExternalId').mockResolvedValueOnce({ id: 'd', data: {} } as any);
      await expect(run()).rejects.toThrow('taskTemplateIdToReceiveStatus not found');
    });

    it('wraps failures of every step', async () => {
      happy();
      const find = jest.spyOn(models().task, 'findDocumentByWorkflowIdAndTaskTemplateIds');
      find.mockRejectedValueOnce(new Error('db down'));
      await expect(run()).rejects.toThrow('Task to update getting error');
      find.mockResolvedValueOnce({ task: {}, document: { id: 'd' } } as any);
      await expect(run()).rejects.toThrow('Task to update not found');
      find.mockResolvedValueOnce({ task: { id: 't' }, document: {} } as any);
      await expect(run()).rejects.toThrow('Document to update not found');
      jest.spyOn(business().eds, 'getSignatureInfo').mockResolvedValueOnce('not an object' as any);
      await expect(run()).rejects.toThrow("Can't get cert document signature info");
      jest.spyOn(business().storageService.provider, 'uploadFileFromStream').mockRejectedValueOnce(new Error('storage down'));
      await expect(run()).rejects.toThrow('storage down');
      jest.spyOn(models().document, 'addDocumentFile').mockRejectedValueOnce(new Error('db down'));
      await expect(run()).rejects.toThrow('db down');
      jest.spyOn((global as any).businesses.document, 'updateByExternalService').mockRejectedValueOnce(new Error('bad data'));
      await expect(run()).rejects.toThrow('Cannot update document: bad data');
      jest.spyOn(models().workflow, 'setNumber').mockRejectedValueOnce(new Error('db down'));
      await expect(run()).rejects.toThrow('Cannot update workflow number');
      const failure: any = new Error('invalid');
      failure.details = [{ dataPath: '.a', message: 'wrong' }];
      jest.spyOn((global as any).businesses.task, 'setStatusFinished').mockRejectedValueOnce(failure);
      await expect(run()).rejects.toThrow('Cannot commit task');
    });
  });
});
