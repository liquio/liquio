export const legalSchema = {
  properties: {
    companyName: { type: 'string' },
    edrpou: { type: 'string' },
    phone: { type: 'string', minLength: 12 },
    email: { type: 'string' },
    agreement: { type: 'boolean', const: true },
  },
  required: ['companyName', 'edrpou', 'agreement'].filter(Boolean),
};

export const personSchema = {
  properties: {
    last_name: { type: 'string' },
    first_name: { type: 'string' },
    middle_name: { type: 'string' },
    birthday: { type: 'string' },
    ipn: { type: 'string' },
    phone: { type: 'string', minLength: 12 },
    email: { type: 'string' },
    agreement: { type: 'boolean', const: true },
  },
  required: ['last_name', 'first_name', 'middle_name', 'ipn', 'agreement'].filter(Boolean),
};
