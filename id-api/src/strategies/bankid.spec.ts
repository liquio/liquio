import nodeRSA from 'node-rsa';

import { decryptProfile } from './bankid';

const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIIBVQIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEA9UT7JBc02ATv76Dd
lK7t1q0wFVvYWmI4458x/QhY2qm9BPFW44FF+ja7eK8teAnty6ieBgLWphrdYoZR
NGkQhQIDAQABAkAPlWZvkJnm78le7FWn0MWD0lUvxjok5ADBVagTb6hVnDtyr18M
TjceaJOIQgzym/p43pvkfT9z82dpmedeUC4xAiEA+umAg9gxrgAviMGkgCdJy5tb
iS3UVDmBG6tnMf4IO4sCIQD6PjAKpDGgi6FE3JHbgeCHNWYePqi75Suf9nzBwB6m
LwIhANeTFQKyFgTsTerOjLo6hzGy+hNDV+FBQsb2HgSawJH/AiAu2eHIvEEGW94P
tHQicsiEx/ycgQK6Wwe15UIqTDvwxQIhAPW3KO2VlnXAWXtER6EpiXMHPKLsPt5p
n+iRaYXuGaUT
-----END PRIVATE KEY-----`;

describe('decryptProfile', () => {
  it('should decrypt the profile correctly', () => {
    const privateKey = new nodeRSA();
    privateKey.importKey(privateKeyPem, 'pkcs8-private-pem');

    const encryptedProfile = {
      type: 'bankid',
      signature: 'signature',
      clId: privateKey.encrypt('myId', 'base64'),
      clName: privateKey.encrypt('myName', 'base64'),
      clEmail: privateKey.encrypt('myEmail', 'base64'),
      clPhone: privateKey.encrypt('myPhone', 'base64'),
      addresses: [
        {
          street: privateKey.encrypt('myStreet', 'base64'),
          city: privateKey.encrypt('myCity', 'base64'),
          zip: privateKey.encrypt('012345', 'base64'),
          type: 'home',
        },
      ],
    };
    const decryptedProfile = decryptProfile(privateKey, encryptedProfile);
    expect(decryptedProfile).toEqual({
      clId: 'myId',
      clName: 'myName',
      clEmail: 'myEmail',
      clPhone: 'myPhone',
      addresses: [
        {
          street: 'myStreet',
          city: 'myCity',
          zip: '012345',
        },
      ],
    });
  });
});
