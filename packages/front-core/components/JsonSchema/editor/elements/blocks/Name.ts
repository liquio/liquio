import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

export const type = 'Element';
export const group = 'ElementBlocks';

export default {
  type,
  group,
  snippet: 'Name',
  Icon: PersonOutlineIcon,
  defaultData: {
    type: 'object',
    blockDisplay: false,
    outlined: false,
    properties: {
      firstName: {
        type: 'string',
        description: "Ім'я",
        width: '50%',
        checkValid: [
          {
            isValid:
              "(propertyValue, stepValue, documentValue) => /^[-'‘’ а-яА-ЯїЇіІєЄґҐ]+$/.test(propertyValue)",
            errorText:
              'Не може містити латинські букви та символи, окрім дефісу та пробілу',
          },
          {
            isValid:
              "(propertyValue, stepValue, documentValue) => propertyValue !== '-' && propertyValue !== '–' && propertyValue !== '—' && propertyValue !== '\\'' &&  propertyValue !== ' '",
            errorText: 'Має містити букви',
          },
        ],
      },
      middleName: {
        type: 'string',
        description: 'По батькові',
        width: '50%',
        checkValid: [
          {
            isValid:
              "(propertyValue, stepValue, documentValue) => /^[-'‘’ а-яА-ЯїЇіІєЄґҐ]+$/.test(propertyValue)",
            errorText:
              'Не може містити латинські букви та символи, окрім дефісу та пробілу',
          },
          {
            isValid:
              "(propertyValue, stepValue, documentValue) => propertyValue !== '-' && propertyValue !== '–' && propertyValue !== '—' && propertyValue !== '\\'' &&  propertyValue !== ' '",
            errorText: 'Має містити букви',
          },
        ],
      },
    },
    control: 'form.group',
    required: [],
  },
};
