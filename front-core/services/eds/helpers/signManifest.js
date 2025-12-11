export default async (manifest, signer, internal = true) => {
  if (Array.isArray(manifest)) {
    const [first, ...rest] = manifest;
    return Promise.all([
      signer.execute('SignData', first, internal),
      ...rest.map((element) => signer.execute('SignHash', element)),
    ]);
  }

  return signer.execute('SignData', manifest, internal);
};
