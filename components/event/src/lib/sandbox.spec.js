const debug = require('debug')('test:log');

const Sandbox = require('./sandbox');

global.log = {
  save: jest.fn().mockImplementation(debug),
};

describe('Sandbox', () => {
  const config = {};

  it('should execute a simple code', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('1 + 1');
    expect(result).toBe(2);
  });

  it('should execute a code with arguments', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs('(a, b) => a + b', [1, 2]);
    expect(result).toBe(3);
  });

  it('should return the default value if code is empty', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('', { defaultValue: 42 });
    expect(result).toBe(42);
  });

  it('should cleanup comments and trim code', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('\n/* comment */\n 1 + 1 // comment');
    expect(result).toBe(2);
  });

  it('should check for arrow functions and return raw string if not', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs('1 + 1', [], { checkArrow: true });
    expect(result).toBe('1 + 1');
  });

  it('should check for arrow functions and return evaluated code if found', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval(' (a, b) => a + b', { checkArrow: true });
    expect(result).toBeInstanceOf(Function);
    expect(result(1, 2)).toBe(3);
  });

  it('should transform functions to async', async () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs('(a) => test(a)', [42], {
      isAsync: true,
      global: { test: async (a) => a + 1 },
    });
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe(43);
  });

  it('should prevent access to global reference', () => {
    global.test = 'test';
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('Object.keys(global)');
    expect(result).toEqual([]);
    sandbox.eval('global.test = "test2"');
    expect(global.test).toBe('test');

    // Warning: Predefined globals are not protected.
    sandbox.eval('fetch = function() { return "fetch" }');
    expect(fetch()).toBe('fetch');
  });

  it('should use default globals', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('getMd5Hash("test")');
    expect(result).toBe('098f6bcd4621d373cade4e832627b4f6');
  });

  it('should override globals if needed', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('Object.keys(global)', {
      global: { global: { a: 1 } },
    });
    expect(result).toEqual(['a']);
  });

  it('should eval some real business process examples', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs(
      `(documents) => {
        const unit = documents
          ?.find((item => item?.documentTemplateId === 988071001))
          ?.data
          ?.calculated
          ?.moderatorUnitIds;
        return unit || []
      };`,
      [
        [
          {
            documentTemplateId: 988071001,
            data: {
              calculated: {
                moderatorUnitIds: [1, 2, 3],
              },
            },
          },
        ],
      ],
    );
    expect(result).toEqual([1, 2, 3]);
  });

  it('should throw an error if code is not a string', () => {
    const sandbox = new Sandbox(config);

    expect(() =>
      sandbox.evalWithArgs(undefined, undefined, { throwOnUndefined: true }),
    ).toThrow('Sandbox error: "Code is undefined"');

    expect(() =>
      sandbox.evalWithArgs(undefined, undefined, {
        throwOnUndefined: true,
        meta: { fn: 'testFn' },
      }),
    ).toThrow('Sandbox error: "Code is undefined" in testFn');

    expect(() =>
      sandbox.evalWithArgs(undefined, undefined, {
        throwOnUndefined: true,
        meta: { fn: 'testFn', caller: 'testCaller' },
      }),
    ).toThrow(
      'Sandbox error: "Code is undefined" in testFn called by testCaller',
    );
  });

  it('should not work with a plain string without checkArrow', () => {
    const sandbox = new Sandbox(config);

    expect(() =>
      sandbox.evalWithArgs(
        'Витяг з Єдиного державного реєстру ветеранів війни',
        [],
      ),
    ).toThrow('Sandbox error: "Unexpected token (1:6)"');
  });

  it('should work with a plain string with checkArrow', () => {
    const sandbox = new Sandbox(config);

    const result = sandbox.evalWithArgs(
      'Витяг з Єдиного державного реєстру ветеранів війни',
      [],
      { checkArrow: true },
    );

    expect(result).toBe('Витяг з Єдиного державного реєстру ветеранів війни');
  });

  it('should work with a quoted string', () => {
    const sandbox = new Sandbox(config);

    const result = sandbox.evalWithArgs(
      '"Витяг з Єдиного державного реєстру ветеранів війни"',
      [],
    );

    expect(result).toBe('Витяг з Єдиного державного реєстру ветеранів війни');
  });

  it('should handle syntax errors', () => {
    const sandbox = new Sandbox(config);

    expect(() =>
      sandbox.evalWithArgs(
        '(documents, events) => { return \'Тестовий юніт; }',
        [],
      ),
    ).toThrow(
      'Sandbox error: "Unterminated string constant (1:32)"\n  (documents, events) => { return \'Тестовий юніт; }',
    );
  });

  it('should automatically add "async" to functions if isAsync is true', () => {
    const sandbox = new Sandbox(config);

    const result = sandbox.evalWithArgs('(a) => await test(a)', [42], {
      isAsync: true,
      global: { test: async (a) => a + 1 },
    });
    expect(result).toBeInstanceOf(Promise);

    return expect(result).resolves.toBe(43);
  });

  it('should correctly strip comments and trim code', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs(
      '\n/* comment */\n() => 1 + 1 // comment',
      [],
      { checkArrow: true },
    );
    expect(result).toBe(2);
  });

  describe('globalFunctions', () => {
    let sandbox;

    it('should query for workflow templates', async () => {
      sandbox = new Sandbox(config);

      const models = {
        models: {
          workflowTemplate: {
            model: {
              findAll: jest.fn().mockResolvedValue([
                { id: 1, data: { globalFunctions: 'invalid' } },
                { id: 2, data: { globalFunctions: {} } },
                {
                  id: 3,
                  data: {
                    globalFunctions: { testFunc: '(value) => `test-${value}`' },
                  },
                },
              ]),
            },
          },
        },
      };

      await sandbox.init(models);

      expect(sandbox).toBeDefined();
    });

    it('should use global functions from workflow templates', () => {
      const result = sandbox.evalWithArgs(
        '() => $.workflow.testFunc("value")',
        [],
        { workflowTemplateId: 3 },
      );
      expect(result).toBe('test-value');
    });

    it('should throw an error if global functions are not defined for the workflow template', () => {
      expect(() =>
        sandbox.evalWithArgs('() => $.workflow.testFunc("value")', [], {
          workflowTemplateId: 1,
        }),
      ).toThrow('Sandbox error: "$.workflow.testFunc is not a function"');
    });

    it('should throw an error if a particular function is not defined in global functions', () => {
      expect(() =>
        sandbox.evalWithArgs('() => $.workflow.nonExistentFunc("value")', [], {
          workflowTemplateId: 3,
        }),
      ).toThrow(
        'Sandbox error: "$.workflow.nonExistentFunc is not a function"',
      );
    });
  });

  it('should handle async embeds', async () => {
    const sandbox = new Sandbox(config);

    async function plinkFromFilestorageAttach(attach) {
      // Simulate a function that processes an attachment and returns a link.
      if (!attach || !attach.link || !attach.name || !attach.type) {
        log.save('plink-from-filestorage-attach-params-error', {
          attach: attach || null,
        });
        return;
      }

      // Simulate delay for async operation.
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate processing the attachment and returning a link.
      return `https://filestorage.example.com/${attach.id}`;
    }

    const EVAL_GLOBALS = {
      plinkFromFilestorageAttach,
    };

    const result = await sandbox.evalWithArgs(
      'async (documents) => { const installationInfo = documents?.find( (item) => item.documentTemplateId === 161323001 )?.data?.installationInfo; const { environmentalImpactAssessment, crossborderImpactAssessment, potentialCrossborderImpact, confirmingAuthorityDocs, schemeProduction, decisionCrossborderDocs, installationDecommissioningApplication, ...rest } = installationInfo || {}; return { ...rest, activitiesType: rest?.activitiesType?.map((item) => item?.name), dateOfDecision: `${rest?.dateOfDecision?.day || \'\'}.${ rest?.dateOfDecision?.month || \'\' }.${rest?.dateOfDecision?.year || \'\'}`, crossborderCountry: rest?.crossborderCountry?.map( (country) => country?.label ), potentialCrossborderCountry: rest?.crossborderCountry?.map( (potentialCountry) => potentialCountry?.label ), confirmingAuthorityDocs: await Promise.all((confirmingAuthorityDocs || []).map(async (attach) => plinkFromFilestorageAttach(attach) )), schemeProduction: await Promise.all((schemeProduction || []).map(async (attach) => plinkFromFilestorageAttach(attach) )), decisionCrossborderDocs: await Promise.all((decisionCrossborderDocs || []).map(async (attach) => plinkFromFilestorageAttach(attach) )), installationDecommissioningApplication: await Promise.all(( installationDecommissioningApplication || [] ).map(async (attach) => plinkFromFilestorageAttach(attach))), }; };',
      [
        [
          {
            documentTemplateId: 161323001,
            data: {
              installationInfo: { installationDecommissioningApplication: [1] },
            },
          },
        ],
      ],
      { isAsync: true, global: EVAL_GLOBALS },
    );

    expect(result).toEqual({
      installationDecommissioningApplication: [undefined],
      activitiesType: undefined,
      confirmingAuthorityDocs: [],
      crossborderCountry: undefined,
      dateOfDecision: '..',
      decisionCrossborderDocs: [],
      potentialCrossborderCountry: undefined,
      schemeProduction: [],
    });
  });

  it('should handle async embeds', async () => {
    const sandbox = new Sandbox(config);

    async function plinkFromFilestorageAttach(attach) {
      // Simulate a function that processes an attachment and returns a link.
      if (!attach || !attach.link || !attach.name || !attach.type) {
        log.save('plink-from-filestorage-attach-params-error', {
          attach: attach || null,
        });
        return;
      }

      // Simulate delay for async operation.
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate processing the attachment and returning a link.
      return `https://filestorage.example.com/${attach.id}`;
    }

    const EVAL_GLOBALS = {
      plinkFromFilestorageAttach,
    };

    const result = await sandbox.evalWithArgs(
      'async (documents) => { const installationInfo = documents?.find( (item) => item.documentTemplateId === 161323001 )?.data?.installationInfo; const { environmentalImpactAssessment, crossborderImpactAssessment, potentialCrossborderImpact, confirmingAuthorityDocs, schemeProduction, decisionCrossborderDocs, installationDecommissioningApplication, ...rest } = installationInfo || {}; return { ...rest, activitiesType: rest?.activitiesType?.map((item) => item?.name), dateOfDecision: `${rest?.dateOfDecision?.day || \'\'}.${ rest?.dateOfDecision?.month || \'\' }.${rest?.dateOfDecision?.year || \'\'}`, crossborderCountry: rest?.crossborderCountry?.map( (country) => country?.label ), potentialCrossborderCountry: rest?.crossborderCountry?.map( (potentialCountry) => potentialCountry?.label ), confirmingAuthorityDocs: await Promise.all((confirmingAuthorityDocs || []).map(async (attach) => plinkFromFilestorageAttach(attach) )), schemeProduction: await Promise.all((schemeProduction || []).map(async (attach) => plinkFromFilestorageAttach(attach) )), decisionCrossborderDocs: await Promise.all((decisionCrossborderDocs || []).map(async (attach) => plinkFromFilestorageAttach(attach) )), installationDecommissioningApplication: await Promise.all(( installationDecommissioningApplication || [] ).map(async (attach) => plinkFromFilestorageAttach(attach))), }; };',
      [
        [
          {
            documentTemplateId: 161323001,
            data: {
              installationInfo: { installationDecommissioningApplication: [1] },
            },
          },
        ],
      ],
      { isAsync: true, global: EVAL_GLOBALS },
    );

    expect(result).toEqual({
      installationDecommissioningApplication: [undefined],
      activitiesType: undefined,
      confirmingAuthorityDocs: [],
      crossborderCountry: undefined,
      dateOfDecision: '..',
      decisionCrossborderDocs: [],
      potentialCrossborderCountry: undefined,
      schemeProduction: [],
    });
  });
});
