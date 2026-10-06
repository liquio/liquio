/* eslint-disable no-template-curly-in-string */
import { describe, expect, it } from 'vitest';
import getTriggerPaths from 'helpers/getTriggerPaths';

const prop = (path: string) => ({ path, value: 'x', previousValue: undefined });

describe('helpers/getTriggerPaths', () => {
  describe('returns [] for invalid input', () => {
    it('when both arguments are undefined', () => {
      expect(getTriggerPaths(undefined, undefined)).toEqual([]);
    });

    it('when triggers are null', () => {
      expect(getTriggerPaths(null, [])).toEqual([]);
    });

    it('when properties are null', () => {
      expect(getTriggerPaths([], null)).toEqual([]);
    });

    it('when both arrays are empty', () => {
      expect(getTriggerPaths([], [])).toEqual([]);
    });
  });

  it('ignores triggers without readOnly', () => {
    const triggers = [
      { source: 'stringInfo.radio', target: 'stringInfo.result', readOnly: false, calculate: '...' },
      { source: 'stringInfo.radio', target: 'stringInfo.other', calculate: '...' }
    ];
    expect(getTriggerPaths(triggers, [prop('stringInfo.result'), prop('stringInfo.other')])).toEqual([]);
  });

  it('returns the target path of a readOnly source-trigger present in the delta', () => {
    const triggers = [
      { source: 'stringInfo.radio', target: 'stringInfo.result', readOnly: true, calculate: '...' }
    ];
    expect(getTriggerPaths(triggers, [prop('stringInfo.result')])).toEqual(['stringInfo.result']);
  });

  it('does not return a readOnly target that is absent from the delta', () => {
    const triggers = [
      { source: 'stringInfo.radio', target: 'stringInfo.result', readOnly: true, calculate: '...' }
    ];
    expect(getTriggerPaths(triggers, [prop('stringInfo.radio')])).toEqual([]);
  });

  it('works for step-triggers and silent/callBeforePdf-triggers (no source)', () => {
    const triggers = [
      { step: 'stringInfo', target: 'stringInfo.result', readOnly: true, calculate: '...' },
      { callBeforePdf: true, target: 'calculated.result', readOnly: true, calculate: '...' },
      { target: 'calculated.silent', readOnly: true, calculate: '...' }
    ];
    expect(
      getTriggerPaths(triggers, [
        prop('stringInfo.result'),
        prop('calculated.result'),
        prop('calculated.silent')
      ])
    ).toEqual(['stringInfo.result', 'calculated.result', 'calculated.silent']);
  });

  it('matches object/array targets whose delta is split into sub-paths', () => {
    const triggers = [
      { source: 'allStarsInfo.radio', target: 'allStarsInfo.resultObject', readOnly: true, calculate: '...' },
      {
        source: 'allStarsInfo.radio',
        target: 'allStarsInfo.resultArrayOfStrings',
        readOnly: true,
        calculate: '...'
      }
    ];
    expect(
      getTriggerPaths(triggers, [
        prop('allStarsInfo.resultObject.stringOne'),
        prop('allStarsInfo.resultObject.stringTwo'),
        prop('allStarsInfo.resultArrayOfStrings.0'),
        prop('allStarsInfo.resultArrayOfStrings.1')
      ])
    ).toEqual([
      'allStarsInfo.resultObject.stringOne',
      'allStarsInfo.resultObject.stringTwo',
      'allStarsInfo.resultArrayOfStrings.0',
      'allStarsInfo.resultArrayOfStrings.1'
    ]);
  });

  it('resolves ${index} placeholders in the target template', () => {
    const triggers = [
      {
        source: 'indexInfo.resultArray.${index}.date',
        target: 'indexInfo.resultArray.${index}.result',
        readOnly: true,
        calculate: '...'
      }
    ];
    expect(
      getTriggerPaths(triggers, [
        prop('indexInfo.resultArray.0.result'),
        prop('indexInfo.resultArray.1.result'),
        prop('indexInfo.resultArray.0.date')
      ])
    ).toEqual(['indexInfo.resultArray.0.result', 'indexInfo.resultArray.1.result']);
  });

  it('supports an array of targets on one trigger', () => {
    const triggers = [
      {
        source: 'a.b',
        target: ['one.result', 'two.result'],
        readOnly: true,
        calculate: '...'
      }
    ];
    expect(
      getTriggerPaths(triggers, [prop('one.result'), prop('two.result'), prop('three.result')])
    ).toEqual(['one.result', 'two.result']);
  });

  it('does not produce false positives on sibling paths with a shared prefix', () => {
    const triggers = [{ source: 'x', target: 'stringInfo.result', readOnly: true, calculate: '...' }];
    expect(
      getTriggerPaths(triggers, [prop('stringInfo.resultArray'), prop('stringInfo.resultArray.0')])
    ).toEqual([]);
  });

  it('dedupes when several readOnly triggers point at the same delta path', () => {
    const triggers = [
      { source: 'a', target: 'calculated.result', readOnly: true, calculate: '...' },
      { source: 'b', target: 'calculated.result', readOnly: true, calculate: '...' }
    ];
    expect(getTriggerPaths(triggers, [prop('calculated.result')])).toEqual(['calculated.result']);
  });
});
