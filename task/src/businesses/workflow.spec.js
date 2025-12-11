const nock = require('nock');

const WorkflowBusiness = require('./workflow');

describe('WorkflowBusiness', () => {
  global.config = {
    workflow: {
      elastic: {
        protocol: 'https',
        host: 'elasticsearch.example.com',
        uri: '/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        template: 'workflow-template-id',
        timeout: 30000
      }
    },
    storage: {
      FileStorage: {
        host: 'localhost',
        port: 3001
      }
    },
    eds: { 
      timeout: 30000, 
      pkcs7: {
        timeout: 30000,
        signToolUrl: 'http://localhost:3004'
      }
    }
  };

  it('should initialize', () => {
    const workflowBusiness = new WorkflowBusiness(global.config);
    expect(workflowBusiness).toBeDefined();
  });

  describe('getAllElasticFiltered', () => {
    let workflowBusiness;
    
    beforeEach(() => {
      // Create fresh instance for each test
      WorkflowBusiness.singleton = null;
      workflowBusiness = new WorkflowBusiness(global.config);
    });

    afterEach(() => {
      // Clean up nock after each test
      nock.cleanAll();
      WorkflowBusiness.singleton = null;
    });

    it('should fetch workflows with default parameters', async () => {
      const mockElasticsearchResponse = {
        hits: {
          total: { value: 2 },
          hits: [
            {
              _id: 'workflow-1',
              _source: {
                createdBy: 'user-1',
                updatedBy: 'user-1',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-02T00:00:00.000Z',
                number: 'WF-001',
                userData: 'test-data',
                isWorkflowContainsErrors: false,
                hasUnresolvedErrors: false,
                workflowStatusId: 1,
                userworkflowTemplate: {
                  id: 'template-1',
                  name: 'Test Template'
                },
                logs: [
                  {
                    type: 'workflow_incoming_message',
                    createdAt: '2023-01-01T00:00:00.000Z',
                    details: '{"sourceRef": "task-1", "targetRef": "task-2"}'
                  }
                ]
              }
            },
            {
              _id: 'workflow-2', 
              _source: {
                createdBy: 'user-2',
                updatedBy: 'user-2',
                createdAt: '2023-01-03T00:00:00.000Z',
                updatedAt: '2023-01-04T00:00:00.000Z',
                number: 'WF-002',
                userData: 'test-data-2',
                isWorkflowContainsErrors: true,
                hasUnresolvedErrors: true,
                workflowStatusId: 2,
                userworkflowTemplate: {
                  id: 'template-2',
                  name: 'Test Template 2'
                },
                logs: []
              }
            }
          ]
        }
      };

      // Mock the Elasticsearch request
      nock('https://elasticsearch.example.com')
        .post('/search')
        .matchHeader('Content-Type', 'application/json')
        .matchHeader('Authorization', 'Bearer test-token')
        .reply(200, mockElasticsearchResponse);

      const params = {
        currentPage: 1,
        perPage: 10,
        sort: {},
        filters: {}
      };

      const result = await workflowBusiness.getAllElasticFiltered(params);

      expect(result).toEqual({
        data: [
          {
            id: 'workflow-1',
            workflowTemplateId: 'template-1',
            workflowTemplate: {
              id: 'template-1',
              name: 'Test Template'
            },
            data: {
              messages: [
                {
                  type: 'in',
                  createdAt: '2023-01-01T00:00:00.000Z',
                  sourceRef: 'task-1',
                  targetRef: 'task-2'
                }
              ]
            },
            createdBy: 'user-1',
            updatedBy: 'user-1',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-02T00:00:00.000Z',
            number: 'WF-001',
            userData: 'test-data',
            isWorkflowContainsErrors: false,
            hasUnresolvedErrors: false,
            workflowStatusId: 1
          },
          {
            id: 'workflow-2',
            workflowTemplateId: 'template-2',
            workflowTemplate: {
              id: 'template-2',
              name: 'Test Template 2'
            },
            data: {
              messages: undefined
            },
            createdBy: 'user-2',
            updatedBy: 'user-2',
            createdAt: '2023-01-03T00:00:00.000Z',
            updatedAt: '2023-01-04T00:00:00.000Z',
            number: 'WF-002',
            userData: 'test-data-2',
            isWorkflowContainsErrors: true,
            hasUnresolvedErrors: true,
            workflowStatusId: 2
          }
        ],
        pagination: {
          total: 2,
          currentPage: 1,
          perPage: 10,
          lastPage: 1
        }
      });
    });

    it('should handle filters correctly', async () => {
      const mockElasticsearchResponse = {
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'workflow-filtered',
              _source: {
                createdBy: 'user-1',
                number: 'WF-FILTERED',
                userworkflowTemplate: { id: 'template-1' },
                logs: []
              }
            }
          ]
        }
      };

      let capturedRequestBody;
      nock('https://elasticsearch.example.com')
        .post('/search')
        .reply(function(uri, requestBody) {
          capturedRequestBody = requestBody;
          return [200, mockElasticsearchResponse];
        });

      const params = {
        currentPage: 1,
        perPage: 5,
        sort: { created_at: 'desc' },
        filters: {
          number: 'WF-FILTERED',
          workflow_template: 'template-1',
          user_data: 'user-1',
          has_errors: true,
          name: 'test workflow',
          workflow_status_id: 1,
          has_unresolved_errors: false,
          type: 'standard',
          createdAt: '2023-01-01'
        }
      };

      await workflowBusiness.getAllElasticFiltered(params);

      expect(capturedRequestBody).toEqual({
        id: 'workflow-template-id',
        params: {
          selected_number: 'WF-FILTERED',
          selected_userworkflowTemplate: 'template-1',
          selected_userId: 'user-1',
          selected_isWorkflowContainsErrors: true,
          selected_search_text: 'test workflow',
          selected_workflowStatusId: 1,
          selected_hasUnresolvedErrors: false,
          type: 'standard',
          selected_createdAt_range_start: '2023-01-01',
          selected_createdAt_range_end: '2023-01-01',
          selected_sort_createdAt: 'desc',
          selected_size: 5,
          selected_from: 0
        }
      });
    });

    it('should handle sort parameters correctly', async () => {
      const mockElasticsearchResponse = {
        hits: { total: { value: 0 }, hits: [] }
      };

      let capturedRequestBody;
      nock('https://elasticsearch.example.com')
        .post('/search')
        .reply(function(uri, requestBody) {
          capturedRequestBody = requestBody;
          return [200, mockElasticsearchResponse];
        });

      const params = {
        currentPage: 2,
        perPage: 20,
        sort: { created_at: 'ASC' }, // Test case conversion
        filters: {}
      };

      await workflowBusiness.getAllElasticFiltered(params);

      expect(capturedRequestBody.params.selected_sort_createdAt).toBe('asc');
      expect(capturedRequestBody.params.selected_size).toBe(20);
      expect(capturedRequestBody.params.selected_from).toBe(20); // (currentPage - 1) * perPage = (2-1) * 20 = 20
    });

    it('should use default sort when no sort parameters provided', async () => {
      const mockElasticsearchResponse = {
        hits: { total: { value: 0 }, hits: [] }
      };

      let capturedRequestBody;
      nock('https://elasticsearch.example.com')
        .post('/search')
        .reply(function(uri, requestBody) {
          capturedRequestBody = requestBody;
          return [200, mockElasticsearchResponse];
        });

      const params = {
        currentPage: 1,
        perPage: 10,
        sort: {}, // Empty sort
        filters: {}
      };

      await workflowBusiness.getAllElasticFiltered(params);

      expect(capturedRequestBody.params.selected_sort_createdAt).toBe('desc');
    });

    it('should handle pagination correctly', async () => {
      const mockElasticsearchResponse = {
        hits: {
          total: { value: 100 },
          hits: []
        }
      };

      nock('https://elasticsearch.example.com')
        .post('/search')
        .reply(200, mockElasticsearchResponse);

      const params = {
        currentPage: 3,
        perPage: 25,
        sort: {},
        filters: {}
      };

      const result = await workflowBusiness.getAllElasticFiltered(params);

      expect(result.pagination).toEqual({
        total: 100,
        currentPage: 3,
        perPage: 25,
        lastPage: 4 // Math.ceil(100 / 25) = 4
      });
    });

    it('should handle different message types correctly', async () => {
      const mockElasticsearchResponse = {
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'workflow-with-messages',
              _source: {
                createdBy: 'user-1',
                userworkflowTemplate: { id: 'template-1' },
                logs: [
                  {
                    type: 'workflow_incoming_message',
                    createdAt: '2023-01-01T10:00:00.000Z',
                    details: '{"action": "start"}'
                  },
                  {
                    type: 'workflow_outgoing_message', // Using 'outgoing' to match the filter
                    createdAt: '2023-01-01T11:00:00.000Z',
                    details: '{"action": "complete"}'
                  },
                  {
                    type: 'other_message_type', // Should be filtered out
                    createdAt: '2023-01-01T12:00:00.000Z',
                    details: '{"action": "ignored"}'
                  }
                ]
              }
            }
          ]
        }
      };

      nock('https://elasticsearch.example.com')
        .post('/search')
        .reply(200, mockElasticsearchResponse);

      const result = await workflowBusiness.getAllElasticFiltered();

      expect(result.data[0].data.messages).toEqual([
        {
          type: 'in',
          createdAt: '2023-01-01T10:00:00.000Z',
          action: 'start'
        },
        {
          type: 'out',
          createdAt: '2023-01-01T11:00:00.000Z',
          action: 'complete'
        }
      ]);
    });

    it('should handle network errors gracefully', async () => {
      nock('https://elasticsearch.example.com')
        .post('/search')
        .replyWithError('Network connection failed');

      const params = {
        currentPage: 1,
        perPage: 10,
        sort: {},
        filters: {}
      };

      await expect(workflowBusiness.getAllElasticFiltered(params)).rejects.toThrow('Network connection failed');
    });

    it('should handle timeout errors', async () => {
      // Mock a connection timeout error
      nock('https://elasticsearch.example.com')
        .post('/search')
        .replyWithError(new Error('connect ETIMEDOUT'));

      const params = {
        currentPage: 1,
        perPage: 10,
        sort: {},
        filters: {}
      };

      await expect(workflowBusiness.getAllElasticFiltered(params)).rejects.toThrow('connect ETIMEDOUT');
    });

    it('should handle HTTP error responses', async () => {
      nock('https://elasticsearch.example.com')
        .post('/search')
        .reply(500, { error: 'Internal Server Error' });

      await expect(workflowBusiness.getAllElasticFiltered()).rejects.toThrow();
    });

    it('should handle empty parameters object', async () => {
      const mockElasticsearchResponse = {
        hits: { total: { value: 0 }, hits: [] }
      };

      let capturedRequestBody;
      nock('https://elasticsearch.example.com')
        .post('/search')
        .reply(function(uri, requestBody) {
          capturedRequestBody = requestBody;
          return [200, mockElasticsearchResponse];
        });

      // Call without parameters
      await workflowBusiness.getAllElasticFiltered();

      expect(capturedRequestBody.params.selected_sort_createdAt).toBe('desc');
      expect(capturedRequestBody.params.selected_size).toBeUndefined();
      expect(capturedRequestBody.params.selected_from).toBeNull(); // (undefined - 1) * undefined = NaN, but JSON.stringify converts NaN to null
    });

    it('should skip unknown filter fields', async () => {
      const mockElasticsearchResponse = {
        hits: { total: { value: 0 }, hits: [] }
      };

      let capturedRequestBody;
      nock('https://elasticsearch.example.com')
        .post('/search')
        .reply(function(uri, requestBody) {
          capturedRequestBody = requestBody;
          return [200, mockElasticsearchResponse];
        });

      const params = {
        filters: {
          number: 'WF-001', // Known field
          unknown_field: 'should be ignored', // Unknown field
          invalid_filter: 'also ignored'
        }
      };

      await workflowBusiness.getAllElasticFiltered(params);

      expect(capturedRequestBody.params.selected_number).toBe('WF-001');
      expect(capturedRequestBody.params.unknown_field).toBeUndefined();
      expect(capturedRequestBody.params.invalid_filter).toBeUndefined();
    });

    it('should skip unknown sort fields', async () => {
      const mockElasticsearchResponse = {
        hits: { total: { value: 0 }, hits: [] }
      };

      let capturedRequestBody;
      nock('https://elasticsearch.example.com')
        .post('/search')
        .reply(function(uri, requestBody) {
          capturedRequestBody = requestBody;
          return [200, mockElasticsearchResponse];
        });

      const params = {
        sort: {
          created_at: 'asc', // Known field
          unknown_sort_field: 'desc' // Unknown field
        }
      };

      await workflowBusiness.getAllElasticFiltered(params);

      expect(capturedRequestBody.params.selected_sort_createdAt).toBe('asc');
      expect(capturedRequestBody.params.unknown_sort_field).toBeUndefined();
    });
  });
});
