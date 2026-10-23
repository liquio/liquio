import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import StringElement from '../basic/StringElement';

export default {
  ...StringElement,
  group: 'TextFields',
  snippet: 'Unzr',
  Icon: PersonOutlineIcon,
  defaultData: {
    ...StringElement.defaultData,
    description: 'УНЗР',
    maxWidth: 346,
    mask: '99999999-99999',
    checkValid: [
      {
        isValid:
          '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length && (propertyValue.length === 14)',
        errorText: 'Номер має містити 14 цифр',
      },
    ],
    sample:
      '<div style="background: #FFF4D7; color:#000; padding: 5px 10px 5px 10px; line-height: 16px;font-family:e-Ukraine; font-size: 12px; margin-top: -5px;">УНЗР є на ID-картці та в біометричному закордонному паспорті</div>',
  },
};
