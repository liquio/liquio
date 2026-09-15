import Signer from 'services/eds/signer';

const getEncodeCert = async (signer: Signer, index: number): Promise<unknown> => {
  const certif = (await signer.execute('EnumOwnCertificates', index)) as { keyUsage?: string } | null;
  if (certif === null) {
    // throw new Error('Ключ не має відповідного сертифікату');
    throw new Error(
      'Сертифікат шифрування відстуній. Зверніться до вашого АЦСК',
    );
  }

  if (certif.keyUsage === 'Протоколи розподілу ключів') {
    return certif;
  }

  return getEncodeCert(signer, index + 1);
};

export default getEncodeCert;
