import { describe, expect, it } from 'vitest';
import getNextVisibleStep from 'modules/tasks/pages/Task/helpers/getNextVisibleStep';

const quiz = { jsonSchema: { properties: { calculated: {}, quizInfo: {}, answersInfo: {} } } };

describe('getNextVisibleStep', () => {
  it('returns the next surviving id from previousSteps', () => {
    expect(
      getNextVisibleStep({ removedStepId: 'b', steps: ['a', 'd'], previousSteps: ['a', 'b', 'c', 'd'] })
    ).toBe('d');
  });

  it('returns undefined when the removed step was last and the template has stepOrders', () => {
    expect(
      getNextVisibleStep({
        removedStepId: 'b',
        steps: ['a'],
        previousSteps: ['a', 'b'],
        template: { jsonSchema: { stepOrders: '() => []', properties: { a: {}, b: {} } } }
      })
    ).toBeUndefined();
  });

  it('falls back to properties order when previousSteps lacks the removed step', () => {
    expect(
      getNextVisibleStep({
        removedStepId: 'quizInfo',
        steps: ['answersInfo'],
        previousSteps: ['x'],
        template: quiz
      })
    ).toBe('answersInfo');
  });

  it('falls back to properties order when nothing after the removed step survives in previousSteps', () => {
    expect(
      getNextVisibleStep({
        removedStepId: 'quizInfo',
        steps: ['answersInfo'],
        previousSteps: ['quizInfo'],
        template: quiz
      })
    ).toBe('answersInfo');
  });

  it('does not fall back with stepOrders', () => {
    expect(
      getNextVisibleStep({
        removedStepId: 'quizInfo',
        steps: ['answersInfo'],
        template: { jsonSchema: { stepOrders: '() => []', properties: quiz.jsonSchema.properties } }
      })
    ).toBeUndefined();
  });

  it('returns undefined for empty steps or unknown removed step', () => {
    expect(getNextVisibleStep({ removedStepId: 'quizInfo', steps: [], template: quiz })).toBeUndefined();
    expect(getNextVisibleStep({ removedStepId: 'zzz', steps: ['answersInfo'], template: quiz })).toBeUndefined();
  });
});
