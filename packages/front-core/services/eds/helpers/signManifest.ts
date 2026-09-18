import Signer from 'services/eds/signer';

export default async (manifest: unknown, signer: Signer, internal = true) => {
  if (Array.isArray(manifest)) {
    const [first, ...rest] = manifest;
    return Promise.all([
      signer.execute('SignData', first, internal),
      ...rest.map((element) => signer.execute('SignHash', element)),
    ]);
  }

  return signer.execute('SignData', manifest, internal);
};
