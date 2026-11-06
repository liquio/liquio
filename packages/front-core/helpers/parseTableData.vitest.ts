import { beforeAll, describe, expect, it } from 'vitest';
import parseTableData from 'helpers/parseTableData';

// jsdom doesn't implement innerText (it's layout-dependent); fall back to textContent for this test.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    configurable: true,
    get() {
      return this.textContent;
    }
  });
});

describe('parseTableData', () => {
  it('extracts rows and cell text from an HTML table', () => {
    const html = '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>';
    expect(parseTableData(html)).toEqual([
      ['a', 'b'],
      ['c', 'd']
    ]);
  });

  it('returns an empty array when there are no rows', () => {
    expect(parseTableData('<div>no table</div>')).toEqual([]);
  });
});
