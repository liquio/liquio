import { Sandbox, appendTraceMeta, runInAsyncLocalStorage } from '@liquio/back-core';

import { DocumentValidatorService } from './index';
import { Keywords } from './keywords';

// Suppress missing log references in validation keywords
global.log = { save: jest.fn() } as any;

describe('DocumentValidatorService.check', () => {
  beforeEach(() => {
    global.config = {
      register: {
        server: 'testserver',
        port: 'testport',
        token: 'testtoken',
        timeout: 1000,
      },
    };
    new Sandbox(global.config);
    Keywords.init();
  });
  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('should return no errors for simple valid object schema', async () => {
    const simpleSchema = {
      type: 'object',
      properties: {
        foo: { type: 'number' },
      },
      required: ['foo'],
    };
    const service = new DocumentValidatorService(simpleSchema, {}, {});
    const errors = await service.check({ foo: 42 }, false);
    expect(errors).toEqual([]);
  });

  test('should return no errors for nested valid object schema', async () => {
    const nestedSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: { type: 'string' },
          },
          required: ['b'],
        },
      },
      required: ['a'],
    };
    const service = new DocumentValidatorService(nestedSchema, {}, {});
    const errors = await service.check({ a: { b: 'value' } }, false);
    expect(errors).toEqual([]);
  });
});

describe('DocumentValidatorService.check with workflow template global functions', () => {
  const schema = {
    type: 'object',
    properties: {
      step1: {
        type: 'object',
        properties: {
          fieldA: { type: 'string', checkValid: '(value) => $.workflow.isOk(value)' },
          fieldB: { type: 'string', checkValid: '(value) => value === "ok"', hidden: '(document) => $.workflow.isHidden(document)' },
        },
      },
    },
  };

  // Run `fn` inside an async local storage whose trace meta carries `workflowTemplateId`, as the
  // businesses do once they have looked the document/task up.
  const withWorkflowTemplateId = <T>(workflowTemplateId: number, fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      runInAsyncLocalStorage(() => {
        appendTraceMeta({ workflowTemplateId });
        fn().then(resolve, reject);
      });
    });

  beforeEach(() => {
    global.config = {
      register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 },
    };
    const sandbox = new Sandbox(global.config);
    sandbox.updateWorkflowTemplateFunctions(3, {
      isOk: '(value) => value === "ok"',
      isHidden: '(document) => document.step1.fieldA === "ok"',
    });
    Keywords.init();
  });

  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('resolves $.workflow functions in keywords and hidden through the shared sandbox', async () => {
    const service = new DocumentValidatorService(schema, {}, {});
    const errors = await withWorkflowTemplateId(3, () => service.check({ step1: { fieldA: 'ok', fieldB: 'bad' } }, false));
    expect(errors).toEqual([]);
  });

  test('reports a keyword error computed by a $.workflow function', async () => {
    const service = new DocumentValidatorService(schema, {}, {});
    const errors = await withWorkflowTemplateId(3, () => service.check({ step1: { fieldA: 'bad' } }, false));
    expect(errors).toEqual([expect.objectContaining({ dataPath: 'step1.fieldA', message: 'checkValid error.' })]);
  });
});
