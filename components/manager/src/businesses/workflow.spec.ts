import { WorkflowBusiness } from './workflow';
import { XmlJsConverter } from '../lib/xml_js_converter';

const bpmnXml = (processId: string) =>
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">' +
  `<bpmn2:process id="${processId}" isExecutable="false"><bpmn2:startEvent id="StartEvent_1" /></bpmn2:process>` +
  '</bpmn2:definitions>';

describe('WorkflowBusiness.findSchemaById', () => {
  let workflowBusiness: any;
  let findById: jest.Mock;

  beforeEach(() => {
    global.log = { save: jest.fn() } as any;

    findById = jest.fn();
    workflowBusiness = Object.create(WorkflowBusiness.prototype);
    workflowBusiness.xmlJsConverter = new XmlJsConverter();
    workflowBusiness.workflowTemplateModel = { findById };
    workflowBusiness.bpmnSchemes = [{ id: 1, name: 'cached', schema: { cached: true } }];
  });

  it('returns a cached schema without loading the template', async () => {
    const schema = await workflowBusiness.findSchemaById(1);

    expect(schema).toEqual({ id: 1, name: 'cached', schema: { cached: true } });
    expect(findById).not.toHaveBeenCalled();
  });

  it('loads, parses and caches the schema of a template that is not cached yet', async () => {
    findById.mockResolvedValue({ id: 2, name: 'imported', xmlBpmnSchema: bpmnXml('Process_2'), isActive: true });

    const schema = await workflowBusiness.findSchemaById(2);

    expect(findById).toHaveBeenCalledWith(2);
    expect(schema).toMatchObject({ id: 2, name: 'imported' });
    expect(schema.schema.$.id).toBe('Process_2');
    expect(workflowBusiness.bpmnSchemes.map((item) => item.id)).toEqual([1, 2]);
    expect(global.log.save).toHaveBeenCalledWith('bpmn-schema-loaded-on-demand', { workflowTemplateId: 2 });
  });

  it('serves a schema loaded on demand from the cache next time', async () => {
    findById.mockResolvedValue({ id: 2, name: 'imported', xmlBpmnSchema: bpmnXml('Process_2'), isActive: true });

    await workflowBusiness.findSchemaById(2);
    await workflowBusiness.findSchemaById(2);

    expect(findById).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for an inactive template, like the periodic reload', async () => {
    findById.mockResolvedValue({ id: 3, name: 'inactive', xmlBpmnSchema: bpmnXml('Process_3'), isActive: false });

    expect(await workflowBusiness.findSchemaById(3)).toBeUndefined();
    expect(workflowBusiness.bpmnSchemes.map((item) => item.id)).toEqual([1]);
  });

  it('returns undefined when the template does not exist', async () => {
    findById.mockRejectedValue(new TypeError("Cannot read properties of null (reading 'id')"));

    expect(await workflowBusiness.findSchemaById(4)).toBeUndefined();
    expect(workflowBusiness.bpmnSchemes.map((item) => item.id)).toEqual([1]);
  });

  it('returns undefined and caches nothing for a template with an invalid BPMN schema', async () => {
    findById.mockResolvedValue({ id: 5, name: 'broken', xmlBpmnSchema: '<bpmn2:definitions />', isActive: true });

    expect(await workflowBusiness.findSchemaById(5)).toBeUndefined();
    expect(workflowBusiness.bpmnSchemes.map((item) => item.id)).toEqual([1]);
    expect(global.log.save).toHaveBeenCalledWith('invalid-bpmn-schema', expect.anything());
  });
});
