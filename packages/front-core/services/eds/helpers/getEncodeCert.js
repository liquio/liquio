const getEncodeCert = async (signer, index) => {
  const certif = await signer.execute('EnumOwnCertificates', index);
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
