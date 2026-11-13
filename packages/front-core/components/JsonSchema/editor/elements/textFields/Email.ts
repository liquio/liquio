import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import StringElement from '../basic/StringElement';

export default {
  ...StringElement,
  group: 'TextFields',
  snippet: 'Email',
  Icon: AlternateEmailIcon,
  defaultData: {
    ...StringElement.defaultData,
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$',
    description: 'Електронна пошта',
    useTrim: true,
    checkValid: [
      {
        isValid:
          "(propertyValue) => propertyValue && (propertyValue.toLowerCase().search('@mail.ru') == -1 && propertyValue.toLowerCase().search('@yandex.ru') == -1 && propertyValue.toLowerCase().search('@yandex.ua') == -1 && propertyValue.toLowerCase().search('@ya.ru') == -1 && propertyValue.toLowerCase().search('@ya.ua') == -1 && propertyValue.toLowerCase().search('@mail.ua') == -1 && propertyValue.toLowerCase().search('@bk.ru') == -1 && propertyValue.toLowerCase().search('@list.ru') == -1 && propertyValue.toLowerCase().search('@inbox.ru') == -1)",
        errorText:
          'Адресу в цьому домені для отримання державних послуг використовувати не можна',
      },
    ],
  },
};
