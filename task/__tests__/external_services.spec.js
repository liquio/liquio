const { TestApp } = require('./test-app');

const { prepareFixtures, WORKFLOW_FIXTURES } = require('./fixtures');

describe('External Services', () => {
  let app;

  const token = 'Basic dGVzdDp0ZXN0IC1uCg==';

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    global.config.basic_auth.tokens.push(token);
    global.config.system_task.allowedToUpdateDocumentAndCommit = [token];
    global.config.system_task.tasksTemplateIds = ['31689003'];

    // Insert fixture data into the database
    await prepareFixtures(app);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('should be able to ping the server', async () => {
    await app
      .request()
      .get('/test/ping')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({ data: { message: 'pong', processPid: expect.any(Number) } });
      });
  });

  it('should be able to update a document via REST call', async () => {
    const workflowId = WORKFLOW_FIXTURES[0].id;
    const taskTemplateId = 31689003;

    await app
      .request()
      .post(`/external-services/workflow/${workflowId}/task-template/${taskTemplateId}`)
      .set('Authorization', token)
      .set('Content-Type', 'application/json')
      .send({
        document: {
          status: 6,
          reason: 'Tests are conducted',
        },
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          data: {
            activityLog: [],
            cancellationTypeId: null,
            copyFrom: null,
            createdAt: '2024-05-13T11:17:30.408Z',
            createdBy: 'system',
            data: {},
            deleted: false,
            description: null,
            document: {
              asic: '{"asicmanifestFileId":null,"filesIds":[]}',
              calculatedGetters: [],
              cancellationTypeId: null,
              createdAt: '2024-05-13T11:17:30.432Z',
              createdBy: 'system',
              data: {
                reason: 'Tests are conducted',
                status: 6,
              },
              description: null,
              documentStateId: 1,
              documentTemplate: {
                accessJsonSchema: { inboxes: { workflowCreator: false }, workflowFiles: { workflowCreator: false } },
                additionalDataToSign: null,
                htmlTemplate: expect.any(String),
                id: 31689003,
                jsonSchema: {
                  calcTriggers: [],
                  checkActive: '(documentData) => { return true; }',
                  finalScreen: {
                    subtitle: 'Текст фінального екрану',
                    title: 'Заголовок фінального екрану',
                  },
                  pdfRequired: false,
                  properties: {},
                  signRequired: false,
                  title: 'Назва задачі',
                },
                name: 'Збереження статусу',
              },
              documentTemplateId: 31689003,
              externalId: null,
              fileId: null,
              fileName: null,
              fileType: null,
              id: '6348ec00-111a-11ef-b95e-15b9ffbcc467',
              isFinal: false,
              number: null,
              ownerId: 'system',
              parentId: null,
              updatedAt: expect.any(String),
              updatedBy: 'test',
            },
            documentId: '6348ec00-111a-11ef-b95e-15b9ffbcc467',
            draftExpiredAt: null,
            dueDate: null,
            finished: true,
            finishedAt: expect.any(String),
            id: '63454280-111a-11ef-b95e-15b9ffbcc467',
            isCurrent: true,
            isEntry: false,
            isSystem: false,
            labels: [],
            meta: {
              commitRequestMeta: {},
              isRead: false,
            },
            name: null,
            observerUnits: [],
            onlyForHeads: false,
            performerUnits: [],
            performerUserNames: [],
            performerUsers: ['test'],
            performerUsersIpn: [],
            performerUsersEmail: [],
            requiredPerformerUnits: [],
            signerUserNames: [],
            signerUsers: [],
            tags: [],
            taskTemplateId: 31689003,
            updatedAt: expect.any(String),
            updatedBy: 'test',
            version: '1.0.203',
            workflow: {},
            workflowId: 'a26753f0-1119-11ef-b95e-15b9ffbcc467',
          },
        });
      });
  });

  it('should be able to update a document via SOAP call', async () => {
    const workflowId = WORKFLOW_FIXTURES[1].id;
    const taskTemplateId = 31689003;

    const xRoadInstance = 'SUBSYSTEM';
    const memberClass = 'GOV';
    const memberCode = '000000';
    const subsystemCode = 'SUBSYSTEM';
    const sourceCode = 'null';
    const applicationNumber = 'null';
    const applicationStatusCode = 'null';
    const changeDate = 'null';
    const reason = 'null';

    const soapRequest = `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xroad="http://x-road.eu/xsd/xroad.xsd" xmlns:ext="ext">
        <soap:Header>
          <xroad:protocolVersion>4.0</xroad:protocolVersion>
          <xroad:id>unique-id</xroad:id>
          <xroad:userId>Basic dGVzdDp0ZXN0IC1uCg==</xroad:userId>
          <xroad:service>
            <xroad:xRoadInstance>${xRoadInstance}</xroad:xRoadInstance>
            <xroad:memberClass>${memberClass}</xroad:memberClass>
            <xroad:memberCode>${memberCode}</xroad:memberCode>
            <xroad:subsystemCode>${subsystemCode}</xroad:subsystemCode>
            <xroad:serviceCode>UpdateDocumentAndCommit</xroad:serviceCode>
          </xroad:service>
          <xroad:client>
            <xroad:xRoadInstance>${xRoadInstance}</xroad:xRoadInstance>
            <xroad:memberClass>${memberClass}</xroad:memberClass>
            <xroad:memberCode>${memberCode}</xroad:memberCode>
            <xroad:subsystemCode>${subsystemCode}</xroad:subsystemCode>
          </xroad:client>
        </soap:Header>
        <soap:Body>
          <ext:UpdateDocumentAndCommitIn>
            <ext:workflowId>${workflowId}</ext:workflowId>
            <ext:taskTemplateId>${taskTemplateId}</ext:taskTemplateId>
            <ext:documentDataObject>
              { "result": { "sourceCode": "${sourceCode}", "applicationNumber": "${applicationNumber}", "applicationStatusCode": "${applicationStatusCode}", "changeDate": "${changeDate}", "reason": "${reason}" } }
            </ext:documentDataObject>
          </ext:UpdateDocumentAndCommitIn>
        </soap:Body>
      </soap:Envelope>
    `;

    await app
      .request()
      .post('/external-services/workflow/soap')
      .set('Content-Type', 'application/xml')
      .send(soapRequest)
      .expect(200)
      .expect((response) => {
        expect(response.text).toMatchInlineSnapshot(`
"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ext="ext">
  <soapenv:Header/>
  <soapenv:Body>
    <ext:UpdateDocumentAndCommitOut>
      <ext:task>
        <id>875ae259-d19e-456a-973e-5137e2244146</id>
        <workflowId>e8c65cba-e899-4da8-966b-a308d0169e30</workflowId>
        <documentId>875ae259-d19e-456a-973e-5137e2244146</documentId>
        <finished>true</finished>
        <finishedAt/>
      </ext:task>
    </ext:UpdateDocumentAndCommitOut>
  </soapenv:Body>
</soapenv:Envelope>"
`);
      });
  });

  it('should be able to update a document via SOAP call (with base64 data object)', async () => {
    const workflowId = WORKFLOW_FIXTURES[2].id;
    const taskTemplateId = 31689003;

    const xRoadInstance = 'SUBSYSTEM';
    const memberClass = 'GOV';
    const memberCode = '000000';
    const subsystemCode = 'SUBSYSTEM';
    const sourceCode = 'null';
    const applicationNumber = 'null';
    const applicationStatusCode = 'null';
    const changeDate = 'null';
    const reason = 'null';

    let payload = `{ "result": { "sourceCode": "${sourceCode}", "applicationNumber": "${applicationNumber}", "applicationStatusCode": "${applicationStatusCode}", "changeDate": "${changeDate}", "reason": "${reason}" } }`;
    payload = Buffer.from(payload).toString('base64');

    const soapRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xroad="http://x-road.eu/xsd/xroad.xsd" xmlns:ext="ext">
        <soapenv:Header>
          <xroad:protocolVersion>4.0</xroad:protocolVersion>
          <xroad:id>unique-id</xroad:id>
          <xroad:userId>Basic dGVzdDp0ZXN0IC1uCg==</xroad:userId>
          <xroad:service>
            <xroad:xRoadInstance>${xRoadInstance}</xroad:xRoadInstance>
            <xroad:memberClass>${memberClass}</xroad:memberClass>
            <xroad:memberCode>${memberCode}</xroad:memberCode>
            <xroad:subsystemCode>${subsystemCode}</xroad:subsystemCode>
            <xroad:serviceCode>UpdateDocumentAndCommit</xroad:serviceCode>
          </xroad:service>
          <xroad:client>
            <xroad:xRoadInstance>${xRoadInstance}</xroad:xRoadInstance>
            <xroad:memberClass>${memberClass}</xroad:memberClass>
            <xroad:memberCode>${memberCode}</xroad:memberCode>
            <xroad:subsystemCode>${subsystemCode}</xroad:subsystemCode>
          </xroad:client>
        </soapenv:Header>
        <soapenv:Body>
          <ext:UpdateDocumentAndCommitIn>
            <ext:workflowId>${workflowId}</ext:workflowId>
            <ext:taskTemplateId>${taskTemplateId}</ext:taskTemplateId>
            <ext:documentDataObject>${payload}</ext:documentDataObject>
          </ext:UpdateDocumentAndCommitIn>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
    await app
      .request()
      .post('/external-services/workflow/soap')
      .set('Content-Type', 'application/xml')
      .send(soapRequest)
      .expect(200)
      .expect((response) => {
        expect(response.text).toMatchInlineSnapshot(`
"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ext="ext">
  <soapenv:Header/>
  <soapenv:Body>
    <ext:UpdateDocumentAndCommitOut>
      <ext:task>
        <id>8644dfbf-c590-4aae-b55e-01f33ae86460</id>
        <workflowId>7512ff43-abe4-4e9c-b814-8319d49dc891</workflowId>
        <documentId>8644dfbf-c590-4aae-b55e-01f33ae86460</documentId>
        <finished>true</finished>
        <finishedAt/>
      </ext:task>
    </ext:UpdateDocumentAndCommitOut>
  </soapenv:Body>
</soapenv:Envelope>"
`);
      });
  });
});
