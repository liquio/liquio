import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import StringElement from '../basic/StringElement';

export default {
  ...StringElement,
  group: 'TextFields',
  snippet: 'Iban',
  Icon: PersonOutlineIcon,
  defaultData: {
    ...StringElement.defaultData,
    description: 'Номер рахунку IBAN',
    mask: 'UA999999999999999999999999999',
    checkValid: [
      {
        isValid:
          '(propertyValue, stepValue, documentValue) => propertyValue && (propertyValue.length === 16 || propertyValue.length === 29)',
        errorText: 'Невірний номер рахунку',
      },
    ],
  },
};
