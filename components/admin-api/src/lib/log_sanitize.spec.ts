import { countOf, toLogUnit, toLogUser } from './log_sanitize';

describe('log_sanitize', () => {
  const user = {
    userId: 'u1',
    email: 'john@example.com',
    ipn: '1234567890',
    name: 'John Doe',
    lastName: 'Doe',
    firstName: 'John',
    middleName: 'X',
    phone: '+380501112233',
    remoteAddress: '10.0.0.1',
  };

  it('toLogUser keeps identifiers only', () => {
    const result = toLogUser(user);
    expect(result).toEqual({ userId: 'u1', remoteAddress: '10.0.0.1' });
    expect(JSON.stringify(result)).not.toMatch(/example\.com|1234567890|John|380501112233/);
  });

  it('toLogUser handles empty input', () => {
    expect(toLogUser(undefined)).toBeUndefined();
    expect(toLogUser({})).toEqual({});
  });

  it('toLogUnit replaces IPN lists, requested members and tokens with counts', () => {
    const unit = {
      id: 1,
      heads: ['u1'],
      headsIpn: ['111', '222'],
      membersIpn: ['333'],
      requestedMembers: [{ ipn: '444', firstName: 'A' }],
      allowTokens: ['secret'],
    };
    const result = toLogUnit([unit])[0];
    expect(result).toEqual({ id: 1, heads: ['u1'], headsIpnCount: 2, membersIpnCount: 1, requestedMembersCount: 1, allowTokensCount: 1 });
    expect(JSON.stringify(result)).not.toMatch(/111|333|444|secret/);
  });

  it('countOf returns list length or 0', () => {
    expect(countOf(['a', 'b'])).toBe(2);
    expect(countOf(undefined)).toBe(0);
  });
});
