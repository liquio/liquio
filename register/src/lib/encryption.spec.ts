import Encryption from './encryption';

describe('Encryption', () => {
  it('should encrypt and decrypt data', () => {
    const key = 'bladDk3HluhCyeObdsMeMWWPXYIyHnTe';

    const encryption = new Encryption({ key });

    const data = 'Hello, World!';

    const encryptedData = encryption.encrypt(data);

    const decryptedData = encryption.decrypt(encryptedData);

    expect(decryptedData).toBe(data);
  });
});
