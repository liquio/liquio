import { isPublicError, publicError, PublicError } from './public_error';

describe('publicError', () => {
  it('should pass through PublicError text', () => {
    expect(isPublicError(new PublicError('bad input'))).toBe(true);
    expect(publicError(new PublicError('bad input'), 400)).toBe('bad input');
  });

  it('should not trust expose flags', () => {
    expect(publicError({ expose: true, status: 400, message: 'Unexpected token S in JSON' }, 400)).toBe('Bad Request');
  });

  it('should hide unmarked errors', () => {
    expect(publicError(new Error('select * from links'), 500)).toBe('Internal server error');
    expect(publicError(new Error('select * from links'), 400)).toBe('Bad Request');
  });
});
