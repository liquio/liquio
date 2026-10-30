import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import nock from 'nock';

import { StandardProvider } from '../src/services/event/requester/external_service/providers/standard';
import { TrembitaProvider } from '../src/services/event/requester/external_service/providers/trembita';
import { DecoratorTrembita } from '../src/services/event/requester/external_service/decorators/decorator_trembita';
import { Rmq } from '../src/lib/rmq';
import { FILE_DOCUMENT_TEMPLATE_ID } from '../src/constants/common';
import { TestApp } from './test-app';
import { getConfig } from '../src/lib/context';

const EXT = 'http://ext.test';
const TREMBITA = 'http://trembita.test';

const trembitaConfig = () => ({
  trembitaHeader: {
    client: { objectType: 'SUBSYSTEM', xRoadInstance: 'INST', memberClass: 'GOV', memberCode: '111', subsystemCode: 'SUB' },
    userId: 'fake-user',
    protocolVersion: '4.0',
    service: {
      objectType: 'SERVICE',
      xRoadInstance: 'INST2',
      memberClass: 'GOV2',
      memberCode: '222',
      subsystemCode: 'SUB2',
      serviceCode: 'DefaultService',
      serviceVersion: 'v9',
      soapAction: 'urn:default',
    },
  },
  serviceList: {
    PostPetition: { serviceCode: 'PostPetition', soapAction: 'urn:pp' },
    PostPetition8: { serviceCode: 'PostPetition8', soapAction: 'urn:pp8' },
    NoAction: { serviceCode: 'NoAction' },
  },
});

const envelope = (body: string, ns = 'SOAP-ENV') => `junk<${ns}:Envelope><${ns}:Body>${body}</${ns}:Body></${ns}:Envelope>junk`;

describe('Group C - external service providers', () => {
  let app: TestApp;
  let originalTrembita: any;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
    originalTrembita = getConfig().requester.externalService.trembita;
  });
  afterAll(async () => {
    getConfig().requester.externalService.trembita = originalTrembita;
    await TestApp.afterAll(app);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    nock.cleanAll();
    await TestApp.afterEach(app);
  });
  beforeEach(async () => {
    await TestApp.beforeEach(app);
    getConfig().requester.externalService.trembita = trembitaConfig();
  });

  describe('StandardProvider', () => {
    let provider: StandardProvider;
    let filestorage: any;
    let documentModel: any;
    const discovery = {
      rest: { url: `${EXT}/api`, authorization: 'Bearer fake', requestTimeout: 2000 },
      retry: { url: `${EXT}/retry`, authorization: 'Bearer fake', requestTimeout: 2000, retriesAfter: [1, 1] },
      rmq: { amqpConnection: 'amqp://fake', event: 'evt', readingQueueName: 'rq', writingQueueName: 'wq' },
      rmqDecorated: { rmqDecorator: { use: true, url: 'http://dec.test', token: 'fake' }, event: 'evt2' },
      empty: {},
    };

    beforeEach(() => {
      StandardProvider.singleton = undefined as any;
      provider = new StandardProvider(discovery);
      filestorage = {
        uploadFileFromStream: jest.fn(async (_s, name, description, contentType) => ({ id: 'f1', name, description, contentType })),
        addP7sSignature: jest.fn(async () => undefined),
      };
      documentModel = { create: jest.fn(async (v) => ({ id: 'saved-doc', ...v })) };
    });

    const send = (service: string, extra: any = {}, isTest = false) =>
      provider.send({ body: { a: 1 }, destination: { service }, documentId: 'd1', eventId: 'e1', ...extra }, isTest, { filestorage, documentModel });

    it('is a singleton and uses the config as discovery', () => {
      expect(new StandardProvider({ other: {} })).toBe(provider);
      expect(provider.externalServiceDiscovery).toBe(discovery);
    });

    it('reads discovery from providersConfigPath', () => {
      const file = path.join(os.tmpdir(), `std-providers-c-${process.pid}.json`);
      fs.writeFileSync(file, JSON.stringify({ externalServiceDiscovery: { svc: { url: 'http://x.test' } } }));
      try {
        StandardProvider.singleton = undefined as any;
        const p = new StandardProvider({ providersConfigPath: file });
        expect(p.externalServiceDiscovery).toEqual({ svc: { url: 'http://x.test' } });
      } finally {
        fs.unlinkSync(file);
      }
    });

    it('getProvidersConfig logs and returns undefined for a missing file', () => {
      expect(provider.getProvidersConfig('/nonexistent/providers.json')).toBeUndefined();
      expect(app.log.logs.find((l) => l.type === 'standard-providers-config-definition-error')).toBeDefined();
    });

    it('getProviderConfig: fails when discovery is disabled or the service is unknown', () => {
      expect(() => provider.getProviderConfig('missing')).toThrow('External services discovery not contain information about needed service.');
      StandardProvider.singleton = undefined as any;
      const disabled = new StandardProvider();
      expect(() => disabled.getProviderConfig('x')).toThrow('External services discovery disabled.');
    });

    it('send: fails for a service without url or amqp', async () => {
      await expect(send('empty')).rejects.toThrow('Custom provider type not defined.');
      expect(app.log.logs.find((l) => l.type === 'standard-provider-method-error')).toBeDefined();
    });

    it('send REST: appends the external id', async () => {
      const scope = nock(EXT)
        .post('/api', { a: 1 })
        .matchHeader('authorization', 'Bearer fake')
        .reply(200, { data: { id: 'ext-1' } });
      const response = await send('rest');
      expect(response.externalIdToSave).toEqual({ documentId: 'd1', eventId: 'e1', externalId: 'ext-1' });
      expect(scope.isDone()).toBe(true);
    });

    it('send REST: accepts isSuccess without data id', async () => {
      nock(EXT).post('/api').reply(200, { isSuccess: true });
      const response = await send('rest');
      expect(response.externalIdToSave).toEqual({ documentId: 'd1', eventId: 'e1', externalId: undefined });
    });

    it('send REST: rejects a response without id or success flag', async () => {
      nock(EXT).post('/api').reply(200, { something: 1 });
      await expect(send('rest')).rejects.toThrow('Response should be with data identifier at "data.id" or success indicator at "isSuccess".');
    });

    it('send REST: returns the raw response in test mode', async () => {
      nock(EXT).post('/api').reply(200, { anything: true });
      expect(await send('rest', {}, true)).toEqual({ anything: true });
    });

    it('send REST: retries after failures and joins error messages when all fail', async () => {
      nock(EXT).post('/retry').times(3).reply(500, {});
      const error: any = await send('retry').catch((e) => e);
      expect(error.message).toBe(Array(3).fill('Request failed with status code 500').join('|'));
      expect(app.log.logs.find((l) => l.type === 'send-to-standard-provider|all|exception')).toBeDefined();
    });

    it('send REST: succeeds on a retry', async () => {
      nock(EXT).post('/retry').reply(503, {});
      nock(EXT)
        .post('/retry')
        .reply(200, { data: { id: 'ext-2' } });
      const response = await send('retry');
      expect(response.externalIdToSave.externalId).toBe('ext-2');
    });

    it('send REST: saves a response file as a document and masks content', async () => {
      const file = { name: 'a.txt', description: 'desc', contentType: 'text/plain', content: Buffer.from('hi').toString('base64') };
      nock(EXT)
        .post('/api')
        .reply(200, { data: { id: 'ext-3' }, file });
      const response = await send('rest');
      expect(documentModel.create).toHaveBeenCalledWith({
        documentTemplateId: FILE_DOCUMENT_TEMPLATE_ID,
        fileId: 'f1',
        fileName: 'a.txt',
        fileType: 'text/plain',
      });
      expect(response.savedDocument).toMatchObject({ id: 'saved-doc' });
      expect(response.file.content).toBe('***');
    });

    it('send REST: keeps file content when saveBase64Logs is set', async () => {
      const content = Buffer.from('hi').toString('base64');
      nock(EXT)
        .post('/api')
        .reply(200, { data: { id: 'ext-4' }, file: { name: 'a', contentType: 't', content } });
      const response = await send('rest', { saveBase64Logs: true });
      expect(response.file.content).toBe(content);
    });

    it('send REST: logs and rethrows a response file error', async () => {
      nock(EXT)
        .post('/api')
        .reply(200, { data: { id: 'ext-5' }, file: { name: 'a' } });
      await expect(send('rest')).rejects.toThrow('Response file is not valid.');
      expect(app.log.logs.find((l) => l.type === 'standard-provider-rest-response-file-error')).toBeDefined();
    });

    describe('saveDocument', () => {
      const file = { name: 'n', description: 'd', contentType: 'text/plain', content: Buffer.from('x').toString('base64') };

      it.each([[{ ...file, name: undefined }], [{ ...file, contentType: undefined }], [{ ...file, content: undefined }], [undefined]])(
        'rejects an invalid file %#',
        async (bad) => {
          await expect(provider.saveDocument({ file: bad, filestorage, documentModel })).rejects.toThrow('Response file is not valid.');
        },
      );

      it('fails when upload returns nothing', async () => {
        filestorage.uploadFileFromStream.mockResolvedValue(undefined);
        await expect(provider.saveDocument({ file, filestorage, documentModel })).rejects.toThrow('File upload error.');
      });

      it('fails when file info is incomplete', async () => {
        filestorage.uploadFileFromStream.mockResolvedValue({ id: 'f' });
        await expect(provider.saveDocument({ file, filestorage, documentModel })).rejects.toThrow('File info is not valid.');
      });

      it('logs and rethrows document create errors', async () => {
        documentModel.create.mockRejectedValue(new Error('db'));
        await expect(provider.saveDocument({ file, filestorage, documentModel })).rejects.toThrow('db');
        expect(app.log.logs.find((l) => l.type === 'standard-provider-create-document-error')).toBeDefined();
      });

      it('adds the p7s signature', async () => {
        await provider.saveDocument({ file: { ...file, p7sContent: 'p7s' }, filestorage, documentModel });
        expect(filestorage.addP7sSignature).toHaveBeenCalledWith('f1', 'p7s');
      });

      it('fails when the created document has no id', async () => {
        documentModel.create.mockResolvedValue({});
        await expect(provider.saveDocument({ file, filestorage, documentModel })).rejects.toThrow('Can not save document.');
      });
    });

    describe('RMQ', () => {
      const okResponse = () => ({ payload: { response: { output: [{ success: true }], document: 'BASE64' } } });
      let sendRequest: jest.SpyInstance;
      let sendDecorated: jest.SpyInstance;

      beforeEach(() => {
        jest.spyOn(Rmq.prototype, 'init').mockResolvedValue(undefined as any);
        sendRequest = jest.spyOn(Rmq.prototype, 'sendRequestAndWaitResponse').mockResolvedValue(okResponse() as any);
        sendDecorated = jest.spyOn(Rmq.prototype, 'sendRequestAndWaitResponseViaDecorator').mockResolvedValue(okResponse() as any);
      });

      it('sends via rmq and returns the response', async () => {
        const response = await send('rmq', { body: { data: { x: 1 } } });
        expect(sendRequest).toHaveBeenCalledWith(expect.any(String), { x: 1 }, 'evt');
        expect(response.payload.response.output[0].success).toBe(true);
      });

      it('sends via the rmq decorator', async () => {
        await send('rmqDecorated');
        expect(sendDecorated).toHaveBeenCalledWith(
          expect.objectContaining({ request: { a: 1 }, event: 'evt2', rmqDecoratorUrl: 'http://dec.test', rmqDecoratorToken: 'fake' }),
        );
      });

      it('fails when the response is empty', async () => {
        sendRequest.mockResolvedValue(undefined as any);
        const error: any = await send('rmq').catch((e) => e);
        expect(error.message).toBe('Response not defined.');
        expect(error.details).toMatchObject({ request: { a: 1 }, event: 'evt' });
      });

      it('fails when the response is not successful', async () => {
        sendRequest.mockResolvedValue({ payload: { response: { output: [{ success: false }] } } } as any);
        const error: any = await send('rmq').catch((e) => e);
        expect(error.message).toBe('Invalid response.');
        expect(error.details.payload.response.output[0].success).toBe(false);
      });

      it('applies the response decorator and the response file extractor', async () => {
        StandardProvider.singleton = undefined as any;
        provider = new StandardProvider({
          rmqFile: {
            amqpConnection: 'amqp://fake',
            event: 'evt',
            responseDecorator: '(r) => ({ ...r, decorated: true })',
          },
        });
        const responseFile = '(r) => ({ name: "n", contentType: "application/pdf", content: r.payload.response.document })';
        const response = await send('rmqFile', { responseFile });
        expect(response.decorated).toBe(true);
        expect(response.savedDocument.id).toBe('saved-doc');
        expect(response.payload.response.document).toBe('***');
      });

      it('keeps the document when saveBase64Logs is set and skips a null file', async () => {
        const kept: any = await send('rmq', { responseFile: '(r) => r.payload.response.document', saveBase64Logs: true }).catch((e) => e);
        expect(kept.message).toBe('Response file is not valid.');
        const response: any = await send('rmq', { responseFile: '(r) => null', saveBase64Logs: true });
        expect(response.savedDocument).toBeUndefined();
        expect(response.payload.response.document).toBe('BASE64');
      });
    });
  });

  describe('TrembitaProvider', () => {
    let provider: TrembitaProvider;
    const sendData = (service: string, soapMessage = '<x/>') => ({
      service,
      transformedData: { workflowId: 'w1', documentId: 'd1', soapMessage, soapMessageForLog: '<masked/>', fileIdFromEvent: 'f1' },
    });

    beforeEach(() => {
      TrembitaProvider.singleton = undefined as any;
      provider = new TrembitaProvider({ trembitaUrl: `${TREMBITA}/soap`, timeout: 2000, debug: false });
    });

    it('is a singleton with defaults', () => {
      expect(new TrembitaProvider({ trembitaUrl: 'http://other' })).toBe(provider);
      TrembitaProvider.singleton = undefined as any;
      const defaults = new TrembitaProvider();
      expect(defaults.timeout).toBe(20000);
      expect(defaults.debug).toBe(false);
    });

    it('getTrembitaConfig: picks the service or default config and validates soap action', () => {
      expect(provider.getTrembitaConfig('PostPetition').serviceConfig.soapAction).toBe('urn:pp');
      expect(provider.getTrembitaConfig('unknown').serviceConfig.soapAction).toBe('urn:default');
      expect(() => provider.getTrembitaConfig('NoAction')).toThrow('Trembita provider. Service soap action not defined.');
      delete getConfig().requester.externalService.trembita.trembitaHeader.service;
      expect(() => provider.getTrembitaConfig('unknown')).toThrow('Trembita provider. Service config not defined.');
    });

    it('prepareResponseSoapMessage: normalizes prefixes and trims around the envelope', async () => {
      const out = await provider.prepareResponseSoapMessage('aa<soapenv:Envelope>1</soapenv:Envelope>bb');
      expect(out).toBe('<s:Envelope>1</s:Envelope>');
      expect(await provider.prepareResponseSoapMessage(envelope('x'))).toBe('<s:Envelope><s:Body>x</s:Body></s:Envelope>');
    });

    it('convertXmlToJsObject: parses xml and rejects invalid xml', async () => {
      expect(await provider.convertXmlToJsObject('<a><b>1</b></a>')).toEqual({ a: { b: ['1'] } });
      await expect(provider.convertXmlToJsObject('<a><b></a>')).rejects.toThrow();
    });

    it('send: PetitionExchange done', async () => {
      const scope = nock(TREMBITA)
        .post('/soap', '<x/>')
        .matchHeader('soapaction', 'urn:pp')
        .matchHeader('content-type', 'text/xml')
        .reply(200, envelope('<PetitionExchangeAnswer><done>true</done></PetitionExchangeAnswer>'));
      const result = await provider.send(sendData('PostPetition'));
      expect(result.isDone).toBe(true);
      expect(result.request).toBeUndefined();
      expect(result.response).toContain('<done>true</done>');
      expect(scope.isDone()).toBe(true);
    });

    it('send: PetitionExchange not done gives isDone true with a false flag (any param counts)', async () => {
      nock(TREMBITA).post('/soap').reply(200, envelope('<PetitionExchangeAnswer><done>false</done></PetitionExchangeAnswer>'));
      const result = await provider.send(sendData('unknown'));
      expect(result.isDone).toBe(true);
    });

    it('send: listMethods response is done', async () => {
      nock(TREMBITA).post('/soap').reply(200, envelope('<xro:listMethodsResponse><x>1</x></xro:listMethodsResponse>', 'soapenv'));
      expect((await provider.send(sendData('unknown'))).isDone).toBe(true);
    });

    it('send: unknown answer is not done', async () => {
      nock(TREMBITA).post('/soap').reply(200, envelope('<Other/>'));
      expect((await provider.send(sendData('unknown'))).isDone).toBe(false);
    });

    it('send: invalid xml is logged and treated as an empty answer', async () => {
      nock(TREMBITA).post('/soap').reply(200, '<s:Envelope><broken></s:Envelope>');
      expect((await provider.send(sendData('unknown'))).isDone).toBe(false);
      expect(app.log.logs.find((l) => l.type === 'send-to-trembita|parse-response-error')).toBeDefined();
    });

    it('send: PostPetition fault throws with masked details', async () => {
      nock(TREMBITA).post('/soap').reply(200, envelope('<s:Fault><faultstring>bad</faultstring></s:Fault>', 's'));
      const error: any = await provider.send(sendData('PostPetition')).catch((e) => e);
      expect(error.message).toContain('s:Fault');
      expect(error.details.requestOptions.body).toBe('***');
      expect(error.details.requestOptions.data).toBe('<x/>');
    });

    it('send: PostPetition8 with non zero FaultCode throws, with zero is fine', async () => {
      nock(TREMBITA).post('/soap').reply(200, envelope('<PetitionExchangeExpAnswer/>'));
      const empty: any = await provider.send(sendData('PostPetition8')).catch((e) => e);
      expect(empty).toBeInstanceOf(Error);
      nock(TREMBITA)
        .post('/soap')
        .reply(200, envelope('<PetitionExchangeExpAnswer/><PetitionExchangeAnswer><done>true</done></PetitionExchangeAnswer>'));
      await expect(provider.send(sendData('PostPetition8'))).rejects.toThrow();
    });

    it('send: debug mode returns and logs the request and exposes it in errors', async () => {
      TrembitaProvider.singleton = undefined as any;
      const debug = new TrembitaProvider({ trembitaUrl: `${TREMBITA}/soap`, timeout: 2000, debug: true });
      nock(TREMBITA).post('/soap').reply(200, envelope('<PetitionExchangeAnswer><done>true</done></PetitionExchangeAnswer>'));
      const result = await debug.send(sendData('unknown'));
      expect(result.request).toMatchObject({ url: `${TREMBITA}/soap`, method: 'POST', data: '<x/>' });
      nock(TREMBITA).post('/soap').reply(200, envelope('<s:Fault><faultstring>bad</faultstring></s:Fault>', 's'));
      const error: any = await debug.send(sendData('PostPetition')).catch((e) => e);
      expect(error.details.requestOptions.data).toBe('<x/>');
      expect(error.details.requestOptions.body).toBeUndefined();
    });

    it('send: cuts a huge soap message in debug logs', async () => {
      TrembitaProvider.singleton = undefined as any;
      const debug = new TrembitaProvider({ trembitaUrl: `${TREMBITA}/soap`, timeout: 2000, debug: true });
      const big = 'a'.repeat(100e3);
      nock(TREMBITA).post('/soap').reply(200, envelope('<Other/>'));
      await debug.send(sendData('unknown', big));
      const log = app.log.logs.find((l) => l.type === 'send-to-trembita|request-options');
      expect(JSON.stringify(log)).toContain('<...cut>');
    });

    it('send: propagates http errors', async () => {
      nock(TREMBITA).post('/soap').reply(500, 'err');
      await expect(provider.send(sendData('unknown'))).rejects.toThrow('500');
    });
  });

  describe('DecoratorTrembita', () => {
    const decorator = () => new DecoratorTrembita();
    const baseData = (extra: any = {}): any => ({
      documentTemplateId: 7,
      workflowId: 'wf-1',
      document: { id: 'doc-1', data: { data: { name: 'Ivan' } }, fileId: 'file-1' },
      documents: [],
      service: 'PostPetition',
      ...extra,
    });
    const decode = (soap: string) => JSON.parse(Buffer.from(/<drac:asicBase64>(.*)<\/drac:asicBase64>/.exec(soap)![1], 'base64').toString('utf8'));

    it('builds a soap message with header and body values', async () => {
      const { transformedData, service } = await decorator().transform(baseData());
      expect(service).toBe('PostPetition');
      expect(transformedData).toMatchObject({ documentTemplateId: 7, workflowId: 'wf-1', documentId: 'doc-1', sendFileFromEventKeyName: undefined });
      const soap: string = transformedData.soapMessage;
      expect(soap).toContain('<iden:serviceCode>PostPetition</iden:serviceCode>');
      expect(soap).toContain('<xro:userId>fake-user</xro:userId>');
      expect(soap).toContain('<iden:memberCode>111</iden:memberCode>');
      expect(soap).toMatch(/<drac:workflowId>wf-1\|\d+<\/drac:workflowId>/);
      expect(soap).toContain('<drac:documentId>doc-1</drac:documentId>');
      expect(decode(soap)).toEqual({ name: 'Ivan', sign: undefined });
    });

    it('uses plain document data when it has no data wrapper', async () => {
      const { transformedData } = await decorator().transform(baseData({ document: { id: 'd', data: { name: 'Plain' } } }));
      expect(decode(transformedData.soapMessage).name).toBe('Plain');
    });

    it('sends the p7s of the document file', async () => {
      const filestorage = { getP7sSignature: jest.fn(async () => ({ p7s: 'P7S-1' })) };
      const { transformedData } = await decorator().transform(baseData({ sendFile: true, filestorage }));
      expect(filestorage.getP7sSignature).toHaveBeenCalledWith('file-1');
      expect(decode(transformedData.soapMessage).sign).toBe('P7S-1');
    });

    it('sends the p7s of another document selected by template id and tolerates missing p7s info', async () => {
      const filestorage = { getP7sSignature: jest.fn(async () => undefined) };
      const documents = [{ documentTemplateId: 5, fileId: 'file-5' }];
      const { transformedData } = await decorator().transform(baseData({ sendFile: 5, documents, filestorage }));
      expect(filestorage.getP7sSignature).toHaveBeenCalledWith('file-5');
      expect(decode(transformedData.soapMessage).sign).toBe('');
    });

    it('sends marked attachments as electronic documents', async () => {
      const documentAttachmentModel = {
        getByDocumentId: jest.fn(async () => [
          { link: 'l1', meta: { isSend: true, type: 'T1', description: 'D1' } },
          { link: 'l2', meta: { isSend: false } },
          { link: 'l3', meta: { isSend: true } },
        ]),
      };
      const filestorage = { downloadFileWithoutStream: jest.fn(async (link: string) => Buffer.from(`content-${link}`)) };
      const { transformedData } = await decorator().transform(
        baseData({
          documents: [{ id: 'att-doc', documentTemplateId: 9 }],
          attachments: { needSend: true, documentTemplateId: 9 },
          documentAttachmentModel,
          filestorage,
        }),
      );
      expect(documentAttachmentModel.getByDocumentId).toHaveBeenCalledWith('att-doc');
      expect(filestorage.downloadFileWithoutStream).toHaveBeenCalledTimes(2);
      expect(decode(transformedData.soapMessage).fileselectronicdocuments).toEqual([
        { descriptionelDocType: 'T1', nameelDocFileName: 'D1', fileContentelDocument: Buffer.from('content-l1').toString('base64') },
        { descriptionelDocType: undefined, nameelDocFileName: undefined, fileContentelDocument: Buffer.from('content-l3').toString('base64') },
      ]);
    });

    it('fails when an attachment cannot be downloaded', async () => {
      const documentAttachmentModel = { getByDocumentId: jest.fn(async () => [{ link: 'l1', meta: { isSend: true } }]) };
      const filestorage = {
        downloadFileWithoutStream: jest.fn(async () => {
          throw new Error('nope');
        }),
      };
      await expect(
        decorator().transform(
          baseData({
            documents: [{ id: 'a', documentTemplateId: 9 }],
            attachments: { needSend: true, documentTemplateId: 9 },
            documentAttachmentModel,
            filestorage,
          }),
        ),
      ).rejects.toThrow('Trembita decorator error. Cannot download all attachments from filestorage.');
    });

    describe('file from event', () => {
      const eventModel = (savedDocument: any) => ({
        getLastByWorkflowIdAndTemplateId: jest.fn(async () => ({ data: { result: { saveDocument: { savedDocument } } } })),
      });
      const filestorage = () => ({ downloadFileWithoutStream: jest.fn(async () => Buffer.from('event-file')) });
      const options = { needSendFileFromEvent: '(document) => true' };

      it('puts the event file under a plain key', async () => {
        const em = eventModel({ fileId: 'ev-file' });
        const { transformedData } = await decorator().transform(
          baseData({ options, sendFileFromEvent: { eventTemplateId: 3, keyName: 'attach' }, eventModel: em, filestorage: filestorage() }),
        );
        expect(em.getLastByWorkflowIdAndTemplateId).toHaveBeenCalledWith('wf-1', 3);
        expect(decode(transformedData.soapMessage).attach).toBe(Buffer.from('event-file').toString('base64'));
        expect(transformedData.fileIdFromEvent).toBe('ev-file');
        expect(transformedData.sendFileFromEventKeyName).toBe('attach');
      });

      it('puts the event file under a nested key', async () => {
        const { transformedData } = await decorator().transform(
          baseData({
            options,
            sendFileFromEvent: { eventTemplateId: 3, keyName: 'a.b' },
            eventModel: eventModel({ fileId: 'ev-file' }),
            filestorage: filestorage(),
          }),
        );
        expect(decode(transformedData.soapMessage).a.b).toBe(Buffer.from('event-file').toString('base64'));
      });

      it('fails when the event has no saved file id', async () => {
        await expect(
          decorator().transform(
            baseData({ options, sendFileFromEvent: { eventTemplateId: 3, keyName: 'k' }, eventModel: eventModel({}), filestorage: filestorage() }),
          ),
        ).rejects.toThrow('Cannot get saved document file id.');
      });

      it('ignores the event file when the condition is false or options are empty', async () => {
        const falsy = await decorator().transform(baseData({ options: { needSendFileFromEvent: '(document) => false' } }));
        expect(falsy.transformedData.fileIdFromEvent).toBeUndefined();
        const empty = await decorator().transform(baseData({ options: {} }));
        expect(empty.transformedData.fileIdFromEvent).toBeUndefined();
      });
    });

    it('fillSoapMessage and getTrembitaConfig use the default service when none is listed', () => {
      const soap = decorator().fillSoapMessage('B64', 'doc', 123, 'wf', 'unknown');
      expect(soap).toContain('<iden:serviceCode>DefaultService</iden:serviceCode>');
      expect(soap).toContain('<xro:id>123</xro:id>');
      expect(soap).toContain('<drac:asicBase64>B64</drac:asicBase64>');
      delete getConfig().requester.externalService.trembita.trembitaHeader.service;
      expect(() => decorator().getTrembitaConfig('unknown')).toThrow('Trembita provider. Service config not defined.');
    });
  });
});
