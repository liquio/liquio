import { renderDecrypted } from './rule_to_show';

const DEFAULT_RULE = "(decryptedBase64) => Buffer.from(decryptedBase64, 'base64').toString('utf8');";
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

describe('renderDecrypted', () => {
  it('renders the default rule as utf8 text', () => {
    expect(renderDecrypted(DEFAULT_RULE, b64('Привіт, world'))).toBe('Привіт, world');
  });

  it('renders a custom pure-function rule', () => {
    expect(renderDecrypted('(x) => x.toUpperCase()', 'abc')).toBe('ABC');
  });

  it('does not expose process', () => {
    expect(() => renderDecrypted('(x) => process.exit(1)', 'abc')).toThrow();
  });

  it('does not expose require', () => {
    expect(() => renderDecrypted("(x) => require('fs').readFileSync('/etc/passwd', 'utf8')", 'abc')).toThrow();
  });

  it('blocks constructor escapes', () => {
    const rule = "(x) => [].filter.constructor('return process.pid')()";
    let result: any;
    try {
      result = renderDecrypted(rule, 'abc');
    } catch {
      result = undefined;
    }
    expect(result).not.toBe(process.pid);
  });

  it('rejects non-arrow rules', () => {
    expect(() => renderDecrypted('process.pid', 'abc')).toThrow();
  });

  it('rejects oversized rules', () => {
    expect(() => renderDecrypted(`(x) => x /*${'a'.repeat(5000)}*/`, 'abc')).toThrow();
  });
});
