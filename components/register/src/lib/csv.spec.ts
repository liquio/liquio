import { escapeCsvCell } from './csv';

describe('escapeCsvCell', () => {
  it.each(['=cmd|"/c calc"!A1', '+1+1', '-1+1', '@SUM(A1)', '\t=1', '\r=1'])('neutralises formula starting value %j', (value) => {
    const cell = escapeCsvCell(value);
    expect(cell.startsWith(`"'`)).toBe(true);
  });

  it('doubles embedded quotes and wraps in quotes', () => {
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
  });

  it('prefixes before quoting', () => {
    expect(escapeCsvCell('=A"1')).toBe(`"'=A""1"`);
  });

  it('keeps newlines and commas inside the quoted cell', () => {
    expect(escapeCsvCell('a,b\nc')).toBe('"a,b\nc"');
  });

  it('does not prefix safe strings', () => {
    expect(escapeCsvCell('hello =x')).toBe('"hello =x"');
  });

  it('does not mangle numbers', () => {
    expect(escapeCsvCell(-5)).toBe('"-5"');
    expect(escapeCsvCell(0)).toBe('"0"');
    expect(escapeCsvCell(1.5)).toBe('"1.5"');
  });

  it('neutralises numeric-looking strings', () => {
    expect(escapeCsvCell('-5')).toBe(`"'-5"`);
  });

  it('renders null and undefined as empty', () => {
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });
});
