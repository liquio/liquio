import { Writable } from 'stream';

import { BottomBar } from './bottom_bar';

const ESC = '\x1b[';
const CLEAR_LINE = `${ESC}2K`;
const CURSOR_UP = `${ESC}1A`;
const CURSOR_LEFT = `${ESC}1G`;

describe('BottomBar', () => {
  let output: string;
  let stream: Writable;

  beforeEach(() => {
    output = '';
    stream = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
  });

  it('should write log messages ending with a line feed', () => {
    const bar = new BottomBar(stream);

    bar.write('first');
    bar.write('second\n');

    expect(output).toBe(`${CLEAR_LINE}${CURSOR_LEFT}first\n${CLEAR_LINE}${CURSOR_LEFT}second\n`);
  });

  it('should redraw the bottom bar in place', () => {
    const bar = new BottomBar(stream);

    bar.updateBottomBar('Processing 1 of 2...');
    bar.updateBottomBar('Processing 2 of 2...');

    expect(output).toBe(`${CLEAR_LINE}${CURSOR_LEFT}Processing 1 of 2...${CLEAR_LINE}${CURSOR_LEFT}Processing 2 of 2...`);
  });

  it('should print log messages above the bottom bar', () => {
    const bar = new BottomBar(stream);
    bar.updateBottomBar('status');
    output = '';

    bar.write('message');

    expect(output).toBe(`${CLEAR_LINE}${CURSOR_LEFT}message\nstatus`);
  });

  it('should clear every line of a multi-line bottom bar', () => {
    const bar = new BottomBar(stream);
    bar.updateBottomBar('Done!\n');
    output = '';

    bar.write('next');

    expect(output).toBe(`${CLEAR_LINE}${CURSOR_UP}${CLEAR_LINE}${CURSOR_LEFT}next\nDone!\n`);
  });
});
