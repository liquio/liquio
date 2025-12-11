const { strict: assert } = require('assert');
const Model = require('./model');

describe('Model', () => {
  let model;

  // Mock global.db
  beforeAll(() => {
    global.db = {};
    model = new Model();
  });

  afterAll(() => {
    delete global.db;
  });

  describe('prepareSort', () => {
    it('should handle simple key-value pair', () => {
      const options = {
        created_at: 'asc',
        name: 'desc',
      };

      const sort = model.prepareSort(options);
      assert(Array.isArray(sort));
      assert.deepEqual(sort, [['created_at', 'asc'], ['name', 'desc']]);
    });

    it('should handle nested meta object', () => {
      const options = {
        meta: {
          district: 'asc',
        },
      };

      const sort = model.prepareSort(options);
      assert(Array.isArray(sort));
      assert.deepEqual(sort, [['meta.district', 'asc']]);
    });

    it('should handle mixed nested and flat structure', () => {
      const options = {
        meta: {
          district: 'asc',
        },
        workflow: {
          number: 'desc',
        },
        created_at: 'asc',
        workflow_status_id: 'asc',
      };

      const sort = model.prepareSort(options);
      assert(Array.isArray(sort));
      assert.deepEqual(sort, [
        ['meta.district', 'asc'],
        ['workflow', 'number', 'desc'],
        ['created_at', 'asc'],
        ['workflow_status_id', 'asc'],
      ]);
    });

    it('should handle empty options object', () => {
      const options = {};

      const sort = model.prepareSort(options);
      assert.equal(sort.length, 0);
      assert.deepEqual(sort, []);
    });

    it('should handle non-meta nested object correctly', () => {
      const options = {
        workflow: {
          priority: 'asc',
          number: 'desc'
        },
        workflow_template: {
          name: 'desc',
        },
        tasks: {
          created_at: 'asc'
        }
      };

      const sort = model.prepareSort(options);
      assert(Array.isArray(sort));
      assert.deepEqual(sort, [
        ['workflow', 'priority', 'asc'],
        ['workflow', 'number', 'desc'],
        ['workflowTemplate', 'name', 'desc'],
        ['tasks', 'created_at', 'asc'],
      ]);
    });

    it('should handle various data types', () => {
      const options = {
        meta: {
          enabled: 'desc',
        },
        document: {
          number: 'desc',
        },
      };

      const sort = model.prepareSort(options);
      assert(Array.isArray(sort));
      assert.deepEqual(sort, [
        ['meta.enabled', 'desc'],
        ['document', 'number', 'desc'],
      ]);
    });
  });
});
