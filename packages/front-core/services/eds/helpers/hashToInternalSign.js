import edsService from 'services/eds';

export default async ({ internal, signature, data, dataType, ...rest }) => {
  if (!internal) {
    return {
      ...rest,
      signature,
    };
  }

  const signer = edsService.getFileKeySigner();
  const b64Signature = await signer.execute('Base64Decode', signature);
  const internalSignature = await signer.execute(
    'HashToInternal',
    b64Signature,
    dataType === 'dataExternal' ? null : data,
  );

  return {
    ...rest,
    signature: internalSignature,
  };
};
