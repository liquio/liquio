const Pkcs7EdsProvider = require('./pkcs7');

describe('Pkcs7EdsProvider.getSignatureInfo', () => {
  beforeEach(() => {
    global.log = {
      save: jest.fn(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extracts short numeric serialNumber as signer DRFO', async () => {
    const provider = new Pkcs7EdsProvider({});

    jest.spyOn(provider, '_callSignTool').mockResolvedValue({
      subject: {
        serialNumber: '1000',
        commonName: 'Test User',
      },
      issuer: {},
      serial: 'cert-serial',
      signTime: '2026-05-14T14:08:46.322Z',
      content: Buffer.from('signed-content').toString('base64'),
      pem: 'mock-pem',
    });

    const signature = `MII${'A'.repeat(120)}`;
    const info = await provider.getSignatureInfo(signature);

    expect(info).toBeTruthy();
    expect(info.signer.ipn.DRFO).toBe('1000');
    expect(info.signer.ipn.EDRPOU).toBeNull();
  });

  it('extracts non-numeric personIdentifier as signer DRFO', async () => {
    const provider = new Pkcs7EdsProvider({});

    jest.spyOn(provider, '_callSignTool').mockResolvedValue({
      subject: {
        personIdentifier: 'TESTIDENTIFIER01',
      },
      issuer: {},
      serial: 'cert-serial',
      signTime: '2026-05-14T14:08:46.322Z',
      content: Buffer.from('signed-content').toString('base64'),
      pem: 'mock-pem',
    });

    const signature = `MII${'A'.repeat(120)}`;
    const info = await provider.getSignatureInfo(signature);

    expect(info).toBeTruthy();
    expect(info.signer.ipn.DRFO).toBe('TESTIDENTIFIER01');
    expect(info.signer.ipn.EDRPOU).toBeNull();
  });

  it('extracts both DRFO and EDRPOU from serialNumber pair', async () => {
    const provider = new Pkcs7EdsProvider({});

    jest.spyOn(provider, '_callSignTool').mockResolvedValue({
      subject: {
        serialNumber: '1234567890-87654321',
      },
      issuer: {},
      serial: 'cert-serial',
      signTime: '2026-05-14T14:08:46.322Z',
      content: Buffer.from('signed-content').toString('base64'),
      pem: 'mock-pem',
    });

    const signature = `MII${'A'.repeat(120)}`;
    const info = await provider.getSignatureInfo(signature);

    expect(info).toBeTruthy();
    expect(info.signer.ipn.DRFO).toBe('1234567890');
    expect(info.signer.ipn.EDRPOU).toBe('87654321');
  });
});
