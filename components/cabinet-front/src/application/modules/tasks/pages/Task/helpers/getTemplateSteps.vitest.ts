import { describe, expect, it, vi } from 'vitest';
import getTemplateSteps, { resolveStepCondition } from './getTemplateSteps';

vi.mock('@sentry/browser', () => ({ withScope: vi.fn(), captureException: vi.fn() }));

const makeTask = (data: Record<string, unknown> = {}) => ({ document: { data }, meta: { m: 1 }, activityLog: [] });

describe('getTemplateSteps', () => {
  it('returns [] without a template', () => {
    expect(getTemplateSteps(makeTask(), null, {})).toEqual([]);
  });

  it('returns [] without a task', () => {
    expect(getTemplateSteps(null, { jsonSchema: { properties: { a: {} } } }, {})).toEqual([]);
  });

  it('returns the stepOrders function result', () => {
    const template = { jsonSchema: { stepOrders: '(data) => data.flag ? ["b", "a"] : ["a"]', properties: { a: {}, b: {} } } };
    expect(getTemplateSteps(makeTask({ flag: true }), template, {})).toEqual(['b', 'a']);
  });

  it('returns a literal stepOrders array expression', () => {
    const template = { jsonSchema: { stepOrders: '["b", "a"]', properties: { a: {}, b: {} } } };
    expect(getTemplateSteps(makeTask(), template, {})).toEqual(['b', 'a']);
  });

  it('lists all steps when there is no stepOrders and nothing is hidden', () => {
    const template = { jsonSchema: { properties: { a: {}, b: {}, c: {} } } };
    expect(getTemplateSteps(makeTask(), template, {})).toEqual(['a', 'b', 'c']);
  });

  it('hides a step with a boolean checkStepHidden', () => {
    const template = { jsonSchema: { properties: { a: {}, b: { checkStepHidden: true }, c: {} } } };
    expect(getTemplateSteps(makeTask(), template, {})).toEqual(['a', 'c']);
  });

  it('evaluates a string checkStepHidden with data and authInfo', () => {
    const template = {
      jsonSchema: {
        properties: { a: {}, b: { checkStepHidden: '(data, authInfo) => authInfo.role !== "admin"' }, c: {} }
      }
    };
    expect(getTemplateSteps(makeTask(), template, { role: 'user' })).toEqual(['a', 'c']);
    expect(getTemplateSteps(makeTask(), template, { role: 'admin' })).toEqual(['a', 'b', 'c']);
  });

  it('accepts a literal checkStepHidden expression', () => {
    const template = { jsonSchema: { properties: { a: {}, b: { checkStepHidden: 'true' } } } };
    expect(getTemplateSteps(makeTask(), template, {})).toEqual(['a']);
  });

  it('calls a function checkStepHidden with data, authInfo, meta and activityLog', () => {
    const checkStepHidden = vi.fn(() => true);
    const task = makeTask({ x: 1 });
    const template = { jsonSchema: { properties: { a: {}, b: { checkStepHidden } } } };
    expect(getTemplateSteps(task, template, { u: 1 })).toEqual(['a']);
    expect(checkStepHidden).toHaveBeenCalledWith(task.document.data, { u: 1 }, task.meta, task.activityLog);
  });

  it('cuts the steps after a string checkStepFinal that evaluates to true', () => {
    const template = {
      jsonSchema: { properties: { a: {}, b: { checkStepFinal: '(data) => data.stop' }, c: {} } }
    };
    expect(getTemplateSteps(makeTask({ stop: true }), template, {})).toEqual(['a', 'b']);
    expect(getTemplateSteps(makeTask({ stop: false }), template, {})).toEqual(['a', 'b', 'c']);
  });

  it('cuts the steps after a function checkStepFinal that returns true', () => {
    const template = { jsonSchema: { properties: { a: { checkStepFinal: () => true }, b: {} } } };
    expect(getTemplateSteps(makeTask(), template, {})).toEqual(['a']);
  });

  it('cuts the steps after a boolean checkStepFinal', () => {
    const template = { jsonSchema: { properties: { a: {}, b: { checkStepFinal: true }, c: {} } } };
    expect(getTemplateSteps(makeTask(), template, {})).toEqual(['a', 'b']);
  });

  it('resolveStepCondition returns non-string, non-function conditions as is', () => {
    expect(resolveStepCondition(undefined, makeTask(), {})).toBeUndefined();
  });
});
