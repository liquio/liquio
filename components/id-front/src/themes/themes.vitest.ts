import { describe, expect, it } from 'vitest';

import theme, { getTheme } from './index';
import bpmn from './bpmn';

describe('themes', () => {
  it('the default export is the bpmn theme object itself', () => {
    expect(theme).toBe(bpmn);
  });

  it('bpmn has the MUI v4 style sections the app reads', () => {
    expect(bpmn.direction).toBe('ltr');
    expect(bpmn.breakpoints.values.md).toBe(960);
    expect(bpmn.outlineColor).toBe('#0073E6');
    expect(Object.keys(bpmn.overrides).length).toBeGreaterThan(0);
  });

  describe('getTheme', () => {
    it('returns content equal to bpmn without a config', () => {
      expect(getTheme()).toEqual(bpmn);
      expect(getTheme(null)).toEqual(bpmn);
    });

    it('returns a copy, not the bpmn object (lodash/fp merge is immutable)', () => {
      expect(getTheme()).not.toBe(bpmn);
    });

    it('returns content equal to bpmn for the bpmn APP_NAME in any case', () => {
      expect(getTheme({ APP_NAME: 'bpmn' })).toEqual(bpmn);
      expect(getTheme({ APP_NAME: 'BPMN' })).toEqual(bpmn);
    });

    it('ignores an unknown APP_NAME: there is no other theme to merge', () => {
      expect(getTheme({ APP_NAME: 'liquio' })).toEqual(bpmn);
    });

    it('treats an empty APP_NAME as bpmn', () => {
      expect(getTheme({ APP_NAME: '' })).toEqual(bpmn);
    });

    it('does not mutate bpmn', () => {
      const before = JSON.stringify(bpmn);
      getTheme({ APP_NAME: 'liquio' });
      expect(JSON.stringify(bpmn)).toBe(before);
    });
  });
});
