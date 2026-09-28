import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

export const type = 'Element';
export const group = 'ElementBlocks';

export default {
  type,
  group,
  snippet: 'Atu',
  Icon: PersonOutlineIcon,
  defaultData: {
    type: 'object',
    description: '',
    control: 'register',
    multiple: false,
    allVisibleRequired: true,
    properties: {
      region: {
        keyId: 408,
        description: 'Область, м. Київ або м. Севастополь',
      },
      district: {
        keyId: 410,
        description: 'Місто або район',
        sample:
          "<div style='background: #FFF4D7; padding: 10px 15px 10px 15px'>Назва має бути актуальною (враховуючи перейменування)</div>",
      },
      city: {
        keyId: 411,
        description: 'Село, селище, район міста',
        sample:
          "<div style='background: #FFF4D7; padding: 10px 15px 10px 15px'>Назва має бути актуальною (враховуючи перейменування)</div>",
      },
    },
    required: [],
  },
  street: {
    description: '',
    control: 'form.group',
    blockDisplay: false,
    outlined: false,
    properties: {
      streetType: {
        type: 'string',
        width: '60%',
        description: 'Тип вулиці',
        options: [
          {
            id: 'вулиця',
            name: 'вулиця',
          },
          {
            id: 'провулок',
            name: 'провулок',
          },
          {
            id: 'площа',
            name: 'площа',
          },
          {
            id: 'проспект',
            name: 'проспект',
          },
          {
            id: 'бульвар',
            name: 'бульвар',
          },
          {
            id: 'тупік',
            name: 'тупік',
          },
          {
            id: 'узвіз',
            name: 'узвіз',
          },
          {
            id: 'набережна',
            name: 'набережна',
          },
          {
            id: 'шосе',
            name: 'шосе',
          },
          {
            id: 'мікрорайон',
            name: 'мікрорайон',
          },
          {
            id: 'житловий комплекс',
            name: 'житловий комплекс',
          },
          {
            id: 'жилий масив',
            name: 'жилий масив',
          },
          {
            id: 'інше',
            name: 'інше',
          },
        ],
      },
      streetName: {
        type: 'string',
        description: 'Назва вулиці',
        checkValid: [
          {
            isValid:
              "(propertyValue, stepValue, documentValue) => /^[-'‘’ А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9]+$/.test(propertyValue)",
            errorText:
              'Може містити тільки українські літери, цифри, дефіс та пробіл',
          },
          {
            isValid:
              "(propertyValue, stepValue, documentValue) => propertyValue && propertyValue !== '-' && propertyValue !== '–' && propertyValue !== '—' && propertyValue !== '\\'' &&  propertyValue !== ' '",
            errorText: 'Має містити букви',
          },
        ],
      },
    },
    required: [],
  },
  building: {
    description: '',
    control: 'form.group',
    blockDisplay: false,
    outlined: false,
    properties: {
      building: {
        type: 'string',
        description: 'Будинок',
        checkValid: [
          {
            isValid:
              '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length <= 10',
            errorText: 'Може містити не більше, ніж 10 символів',
          },
        ],
      },
      korpus: {
        type: 'string',
        description: 'Корпус',
        checkValid: [
          {
            isValid:
              '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length <= 10',
            errorText: 'Може містити не більше, ніж 10 символів',
          },
        ],
      },
    },
    required: [],
  },

  apt: {
    description: '',
    control: 'form.group',
    blockDisplay: false,
    outlined: false,
    properties: {
      apt: {
        type: 'string',
        description: 'Номер квартири',
        checkValid: [
          {
            isValid:
              '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length <= 10',
            errorText: 'Може містити не більше, ніж 10 символів',
          },
        ],
      },
      index: {
        type: 'string',
        description: 'Індекс',
        sample:
          "<div style='display: inline-flex; background: #FFF4D7; padding: 10px 15px 10px 15px'>Дізнатися свій індекс можна&nbsp;<a href='https://ukrposhta.ua/dovidka/indeksi/' target='_blank' style='color:#000000;'>тут</a></div></div>",
        checkValid: [
          {
            isValid:
              '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 5',
            errorText: 'Має містити 5 цифр',
          },
        ],
        mask: '99999',
      },
    },
    required: [],
  },
};
