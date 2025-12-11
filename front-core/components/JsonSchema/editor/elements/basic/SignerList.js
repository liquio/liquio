/* eslint-disable no-template-curly-in-string */
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: ListAltOutlinedIcon,
  defaultData: {
    type: 'array',
    description: 'Підписанти',
    control: 'signer.list',
    calcSigners:
      "(document) => { return [ { firstName: 'Name1', lastName: 'sName1', middleName: 'mName1', ipn: '111111111', email: 'test@example.com' }, { firstName: 'Name2', lastName: 'sName2', middleName: 'mName2', ipn: '4512367896', email: 'test2@example.com' } ]}",
    letterTemplate:
      '(document, firstName, lastName, middleName, ipn, email, signerUrl) => { return `${firstName}{lastName} ${middleName} ${ipn} ${email}, підпишіть документу ${signerUrl}` }',
    letterTitle: "(document) => { return 'Підпишіть документ' }",
    rejectSignLetterTemplate:
      '(document, firstName, lastName, middleName, ipn, email, userId) => { return `${firstName} ${lastName} ${middleName} ${ipn} ${email}` }',
    rejectSignLetterTitle: "(document) => { return 'Rejected sign error.' }",
    cancelSignsLetterTemplate:
      'document, firstName, lastName, middleName, ipn, email) => { return `Організатор відкликав підписантів : ${lastName} ${firstName} ${middleName} ${ipn} ${email}` }',
    cancelSignsLetterTitle:
      "(document) => { return 'Організатор відкликав підписантів' }",
    filters: undefined,
  },
};
