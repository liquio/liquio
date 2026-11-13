import { isPublicError, publicError, PublicError } from './public_error';
import ErrorWithDetails from './errors';

describe('public_error', () => {
  it('treats only intentional client errors as public', () => {
    expect(isPublicError(new PublicError('x'))).toBe(true);
    expect(isPublicError(new ErrorWithDetails('x', {}))).toBe(true);
    expect(isPublicError(Object.assign(new Error('x'), { status: 413, expose: true }))).toBe(true);
    expect(isPublicError(Object.assign(new Error('x'), { status: 500, expose: true }))).toBe(false);
    expect(isPublicError(Object.assign(new Error('x'), { status: 400 }))).toBe(false);
    expect(isPublicError(new Error('x'))).toBe(false);
    expect(isPublicError(null)).toBe(false);
  });

  it('returns safe messages', () => {
    expect(publicError(new PublicError('Bad'), 500)).toBe('Bad');
    expect(publicError(new Error('SELECT 1'), 500)).toBe('Internal server error');
    expect(publicError(new Error('SELECT 1'), 403)).toBe('Forbidden');
    expect(publicError('str', 999)).toBe('Internal server error');
  });
});
