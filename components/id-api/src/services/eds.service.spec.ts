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

import { EdsService } from './eds.service';

const SECRET = 'test-secret';

describe('EdsService.checkRandomContentSign', () => {
  let service: EdsService;
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
    x509 = { getSignatureInfo: jest.fn() };
    redis = { isEnabled: false, acquireLock: jest.fn() };
    mockServices.x509 = x509;
    mockServices.redis = redis;
    service = new EdsService({ jwt: { secret: SECRET, expiresIn: 60 } } as any, {} as any, {} as any);
  });

  const issue = () => service.getRandomContentToSign();

  it('returns the signer when sign-tool confirms a signature over the issued token', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    const result = await service.checkRandomContentSign(token, 'sig');
    expect(result.signer.commonName).toBe('Anna');
  });

  it('rejects when sign-tool rejects a forged signature', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockRejectedValue(new Error('Signature verification failed'));
    await expect(service.checkRandomContentSign(token, 'forged')).rejects.toThrow();
  });

  it('rejects when the signed content differs from the issued token', async () => {
    const token = await issue();
    const other = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(other));
    await expect(service.checkRandomContentSign(token, 'sig')).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ random: 'x' }, SECRET, { expiresIn: -10 });
    x509.getSignatureInfo.mockResolvedValue(signInfo(expired));
    await expect(service.checkRandomContentSign(expired, 'sig')).rejects.toThrow();
    expect(x509.getSignatureInfo).not.toHaveBeenCalled();
  });

  it('rejects a replay of an already used token (in-memory store)', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await service.checkRandomContentSign(token, 'sig');
    await expect(service.checkRandomContentSign(token, 'sig')).rejects.toThrow();
  });

  it('rejects a replay of an already used token (redis NX lock)', async () => {
    redis.isEnabled = true;
    redis.acquireLock.mockResolvedValueOnce('lock').mockResolvedValueOnce(null);
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await service.checkRandomContentSign(token, 'sig');
    await expect(service.checkRandomContentSign(token, 'sig')).rejects.toThrow();
    expect(redis.acquireLock).toHaveBeenCalledTimes(2);
    expect(redis.acquireLock.mock.calls[0][1]).toBeGreaterThan(0);
  });

  it('does not consume the token when verification fails', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockRejectedValueOnce(new Error('bad'));
    await expect(service.checkRandomContentSign(token, 'bad')).rejects.toThrow();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await expect(service.checkRandomContentSign(token, 'sig')).resolves.toBeDefined();
  });

  it('does not log the token', async () => {
    const token = await issue();
    x509.getSignatureInfo.mockResolvedValue(signInfo(token));
    await service.checkRandomContentSign(token, 'sig');
    expect(JSON.stringify(mockLog.save.mock.calls)).not.toContain(token);
  });
});
