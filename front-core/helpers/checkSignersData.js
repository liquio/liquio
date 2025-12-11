const checkSignersData = (signersArray) => {
  if (
    !signersArray ||
    !Array.isArray(signersArray) ||
    !(signersArray || []).length
  )
    return false;

  let validate = true;

  for (const signer of signersArray) {
    const ipn = signer.ipn;
    const email = signer.email;

    const isIpnCode = typeof ipn === 'string' && ipn.match(/^\d{10}$/);
    const isEdrpouCode = typeof ipn === 'string' && ipn.match(/^\d{8}$/);
    const isPassport =
      typeof ipn === 'string' && ipn.match(/^[А-ЯA-Z]{2}\d{6}$/);
    const isIdCardNumber = typeof ipn === 'string' && ipn.match(/^\d{9}$/);
    const isEmailValid =
      typeof email === 'string' &&
      email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+$/);

    if (
      (!isIpnCode && !isEdrpouCode && !isPassport && !isIdCardNumber) ||
      !isEmailValid
    ) {
      validate = false;
    }
  }

  return validate;
};

export default checkSignersData;
