import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import StringElement from '../basic/StringElement';

export default {
  ...StringElement,
  group: 'Passport',
  snippet: 'PassportIssurer',
  Icon: BusinessOutlinedIcon,
  defaultData: {
    ...StringElement.defaultData,
    description: 'Ким виданий',
    checkValid: [
      {
        isValid:
          '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length >= 10',
        errorText: 'Має містити не менше 10 символів',
      },
      {
        isValid:
          "(propertyValue, stepValue, documentValue) => /^[АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя0-9№/ ,.\\-'’\"]{10,}$/.test(propertyValue)",
        errorText:
          'Може містити тільки українські літери, цифри, знак №, та знаки пунктуації',
      },
      {
        isValid:
          '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length <= 255',
        errorText: 'Може містити не більше, ніж 255 символів',
      },
    ],
  },
};
