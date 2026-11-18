const mockLog = { save: jest.fn() };
const mockServices: Record<string, any> = {};

jest.mock('./base_service', () => ({
  BaseService: class MockBaseService {
    config: any;
    log = mockLog;
    constructor(config: any) {
      this.config = config;
    }
    service(name: string) {
      return mockServices[name];
    }
  },
}));

import jwt from 'jsonwebtoken';

import { EdsService, SIGN_CHALLENGE_TYPE, SignChallengeSession } from './eds.service';

const SECRET = 'test-secret';

describe('EdsService.checkRandomContentSign', () => {
  let service: EdsService;
  let session: SignChallengeSession;
  let x509: { getSignatureInfo: jest.Mock };
  let redis: { isEnabled: boolean; acquireLock: jest.Mock };

  const signInfo = (content: string) => ({
    subject: { commonName: 'Anna', serialNumber: '123' },
    issuer: { commonName: 'CA' },
    serial: '01',
    signTime: '',
    content: Buffer.from(content).toString(),
    pem: 'PEM',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    session = {};
    x509 = { getSignatureInfo: jest.fn() };
    redis = { isEnabled: false, acquireLock: jest.fn() };
    mockServices.x509 = x509;
    mockServices.redis = redis;
    service = new EdsService({ jwt: { secret: SECRET, expiresIn: 60 } } as any, {} as any, {} as any);
  });

  const issue = () => service.getRandomContentToSign(session);

  it('returns the signer when sign-tool confirms a signature over the issued token', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    const result = await service.checkRandomContentSign(token, 'sig', session);
    expect(result.signer.commonName).toBe('Anna');
  });

  it('rejects when sign-tool rejects a forged signature', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockRejectedValue(new Error('Signature verification failed'));
    await expect(service.checkRandomContentSign(token, 'forged', session)).rejects.toThrow();
  });

  it('rejects when the signed content differs from the issued token', async () => {
    const token = await issue();
    const other = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(other));
    await expect(service.checkRandomContentSign(token, 'sig', session)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ typ: SIGN_CHALLENGE_TYPE, random: 'x' }, SECRET, { expiresIn: -10 });
    x509.getSignatureInfo.mockResolvedValue(signInfo(expired));
    await expect(service.checkRandomContentSign(expired, 'sig', session)).rejects.toThrow();
    expect(x509.getSignatureInfo).not.toHaveBeenCalled();
  });

  it('rejects a replay of an already used token (in-memory store)', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    const copy = structuredClone(session);
    await service.checkRandomContentSign(token, 'sig', session);
    await expect(service.checkRandomContentSign(token, 'sig', copy)).rejects.toThrow();
    expect(mockLog.save).toHaveBeenCalledWith('check-sign-token-replay', {}, 'error');
  });

  it('rejects a replay of an already used token (redis NX lock)', async () => {
    redis.isEnabled = true;
    redis.acquireLock.mockResolvedValueOnce('lock').mockResolvedValueOnce(null);
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    const copy = structuredClone(session);
    await service.checkRandomContentSign(token, 'sig', session);
    await expect(service.checkRandomContentSign(token, 'sig', copy)).rejects.toThrow();
    expect(redis.acquireLock).toHaveBeenCalledTimes(2);
    expect(redis.acquireLock.mock.calls[0][1]).toBeGreaterThan(0);
  });

  it('does not consume the token when verification fails', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockRejectedValueOnce(new Error('bad'));
    await expect(service.checkRandomContentSign(token, 'bad', session)).rejects.toThrow();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await expect(service.checkRandomContentSign(token, 'sig', session)).resolves.toBeDefined();
  });

  it('does not log the token', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await service.checkRandomContentSign(token, 'sig', session);
    expect(JSON.stringify(mockLog.save.mock.calls)).not.toContain(token);
  });

  it('issues a token carrying the sign-challenge type', async () => {
    const token = await issue();
    expect((jwt.decode(token) as jwt.JwtPayload).typ).toBe(SIGN_CHALLENGE_TYPE);
  });

  it.each([
    ['a user JWT', { userId: 'u1', authTokens: { accessToken: 'a' } }],
    ['a JWT with another typ', { typ: 'other', random: 'x' }],
  ])('rejects %s signed with the same secret', async (_name, body) => {
    const token = jwt.sign(body, SECRET, { expiresIn: 60 });
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await expect(service.checkRandomContentSign(token, 'sig', session)).rejects.toThrow('Invalid or expired token.');
    expect(x509.getSignatureInfo).not.toHaveBeenCalled();
    expect(mockLog.save).toHaveBeenCalledWith('check-sign-token-wrong-type', {}, 'error');
    expect(JSON.stringify(mockLog.save.mock.calls)).not.toContain(token);
  });

  it('stores a hashed entry with a future expiry, not the token', async () => {
    const token = await issue();
    expect(session.signChallenges).toHaveLength(1);
    const [entry] = session.signChallenges!;
    expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.hash).not.toBe(token);
    expect(entry.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects a foreign session without consuming the challenge or touching the owner', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await expect(service.checkRandomContentSign(token, 'sig', {})).rejects.toThrow('Invalid or expired token.');
    expect(x509.getSignatureInfo).not.toHaveBeenCalled();
    expect(mockLog.save).toHaveBeenCalledWith('check-sign-token-session-mismatch', { hasSession: true }, 'error');
    expect(session.signChallenges).toHaveLength(1);
    await expect(service.checkRandomContentSign(token, 'sig', session)).resolves.toBeDefined();
  });

  it('removes the entry after a successful check', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await service.checkRandomContentSign(token, 'sig', session);
    expect(session.signChallenges).toBeUndefined();
  });

  it('keeps the entry after a failed signature', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockRejectedValueOnce(new Error('bad'));
    await expect(service.checkRandomContentSign(token, 'bad', session)).rejects.toThrow();
    expect(session.signChallenges).toHaveLength(1);
  });

  it('rejects an undefined session on check and issue', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await expect(service.checkRandomContentSign(token, 'sig', undefined as any)).rejects.toThrow('Invalid or expired token.');
    expect(x509.getSignatureInfo).not.toHaveBeenCalled();
    await expect(service.getRandomContentToSign(undefined as any)).rejects.toThrow('Invalid or expired token.');
    expect(mockLog.save).toHaveBeenCalledWith('get-random-content-to-sign-no-session', {}, 'error');
  });

  it('keeps at most 5 pending challenges per session', async () => {
    const tokens: string[] = [];
    for (let i = 0; i < 6; i++) tokens.push(await issue());
    expect(session.signChallenges).toHaveLength(5);
    x509.getSignatureInfo.mockResolvedValue(signInfo(tokens[0]));
    await expect(service.checkRandomContentSign(tokens[0], 'sig', session)).rejects.toThrow();
    x509.getSignatureInfo.mockResolvedValue(signInfo(tokens[5]));
    await expect(service.checkRandomContentSign(tokens[5], 'sig', session)).resolves.toBeDefined();
  });

  it('prunes expired entries on issue', async () => {
    session.signChallenges = [{ hash: 'old', exp: Math.floor(Date.now() / 1000) - 10 }];
    await issue();
    expect(session.signChallenges).toHaveLength(1);
    expect(session.signChallenges![0].hash).not.toBe('old');
  });

  it('does not log the stored hash', async () => {
    const token = await issue();
    const { hash } = session.signChallenges![0];
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await service.checkRandomContentSign(token, 'sig', session);
    await expect(service.checkRandomContentSign(token, 'sig', {})).rejects.toThrow();
    expect(JSON.stringify(mockLog.save.mock.calls)).not.toContain(hash);
  });
});
