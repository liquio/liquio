import { isPublicError, publicError } from './public_error';

describe('public_error', () => {
  it('treats only exposed client errors as public', () => {
    expect(isPublicError(Object.assign(new Error('x'), { status: 400, expose: true }))).toBe(true);
    expect(isPublicError(Object.assign(new Error('x'), { status: 400 }))).toBe(false);
    expect(isPublicError(Object.assign(new Error('x'), { status: 500, expose: true }))).toBe(false);
    expect(isPublicError(new Error('x'))).toBe(false);
    expect(isPublicError(null)).toBe(false);
  });

  it('returns safe messages', () => {
    expect(publicError(Object.assign(new Error('Bad'), { status: 400, expose: true }), 400)).toBe('Bad');
    expect(publicError(new Error('SELECT 1'), 500)).toBe('Internal server error');
    expect(publicError(new Error('SELECT 1'), 403)).toBe('Forbidden');
    expect(publicError('str', 999)).toBe('Internal server error');
  });
});
