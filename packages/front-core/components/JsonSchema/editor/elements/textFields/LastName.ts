import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import StringElement from '../basic/StringElement';

export default {
  ...StringElement,
  group: 'TextFields',
  snippet: 'LastName',
  Icon: PersonOutlineIcon,
  defaultData: {
    ...StringElement.defaultData,
    description: 'Прізвище',
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
};
