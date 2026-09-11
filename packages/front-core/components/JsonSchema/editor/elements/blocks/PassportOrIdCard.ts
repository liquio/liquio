import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';

export const type = 'Element';
export const group = 'Passport';

export default {
  type,
  group,
  snippet: 'Passport',
  Icon: AssignmentIndOutlinedIcon,
  defaultData: {
    type: 'object',
    control: 'form.group',
    outlined: false,
    blockDisplay: false,
    properties: {
      passportSeries: {
        type: 'string',
        description: 'Серія',
        width: '15%',
        maxLength: 2,
        changeCase: 'toUpperCase',
        checkValid: [
          {
            isValid:
              '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 2',
            errorText: 'Має містити 2 літери',
          },
          {
            isValid:
              '(propertyValue, stepValue, documentValue) => /^[АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя]{2}$/.test(propertyValue)',
            errorText: 'Може містити тільки українські літери',
          },
        ],
      },
      passportNumber: {
        type: 'string',
        description: 'Номер паспорта',
        width: '30%',
        mask: '999999',
        checkValid: [
          {
            isValid:
              '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 6',
            errorText: 'Номер має містити 6 цифр',
          },
        ],
      },
      orText: {
        control: 'text.block',
        width: '5%',
        htmlBlock: "<p style='margin-bottom: 0px; margin-top: 25px'>або</p>",
      },
      idCardNumber: {
        type: 'string',
        description: 'Номер ID-карти',
        width: '50%',
        checkValid: [
          {
            isValid:
              '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 9',
            errorText: 'Номер має містити 9 цифр',
          },
        ],
        mask: '999999999',
      },
    },
  },
};
