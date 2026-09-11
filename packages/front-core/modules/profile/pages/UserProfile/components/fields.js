const fields = ({ EmailInput, PhoneInput, showMiddleName = true }) => ({
  isLegal: [
    {
      key: 'companyName',
      name: 'company_name',
      label: 'CompanyNameInputLabel',
      disabled: true,
    },
    { key: 'email', Component: EmailInput, changed: 'email' },
    { key: 'phone', Component: PhoneInput, changed: 'phone' },
    { key: 'edrpou', label: 'EDRPOUInputLabel', disabled: true },
    {
      key: 'address',
      label: 'LegalAddress',
      maxLength: 255,
      helperText: 'AddressHelper',
    },
  ],
  notIsLegal: [
    { key: 'lastName', label: 'LastNameInputLabel', disabled: true },
    { key: 'firstName', label: 'FirstNameInputLabel', disabled: true },
    ...(showMiddleName
      ? [{ key: 'middleName', label: 'MiddleNameInputLabel', disabled: true }]
      : []),
    { key: 'email', Component: EmailInput, changed: 'email' },
    { key: 'phone', Component: PhoneInput, changed: 'phone' },
    {
      key: 'cyrillicIpnPassport',
      label: 'IpnInputLabel',
      disabled: true,
      helperText: 'IpnInputHelper',
    },
    {
      key: 'address',
      label: 'Address',
      placeholder: 'AddressPlaceholder',
      maxLength: 255,
      helperText: 'AddressHelper',
    },
  ],
});

export default fields;
