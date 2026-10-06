import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import StringElement from '../basic/StringElement';

export default {
  ...StringElement,
  group: 'TextFields',
  snippet: 'Edrpou',
  Icon: PersonOutlineIcon,
  defaultData: {
    ...StringElement.defaultData,
    description: 'ЄДРПОУ',
    mask: '99999999',
    checkValid: [
      {
        isValid: '(propertyData) => propertyData && propertyData.length === 8',
        errorText: 'Має містити 8 цифр',
      },
    ],
  },
};
