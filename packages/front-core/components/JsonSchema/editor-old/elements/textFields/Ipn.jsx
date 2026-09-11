import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import StringElement from '../basic/StringElement';

export default {
  ...StringElement,
  group: 'TextFields',
  snippet: 'Ipn',
  Icon: PersonOutlineIcon,
  defaultData: {
    ...StringElement.defaultData,
    description: 'РНОКПП',
    mask: '9999999999',
    checkValid: [
      {
        isValid:
          "(propertyValue, stepValue, documentValue) => {const ipn = propertyValue;  if ( !(typeof ipn === 'number' || typeof ipn === 'string')) return false; const _ipn = (typeof ipn === 'number') ? '' + ipn : ipn;if (_ipn.length !== 10 || '0456789'.includes(_ipn[0])) return false;const num = Number(_ipn[0]) * (-1) + Number(_ipn[1]) * 5 + Number(_ipn[2]) * 7 + Number(_ipn[3]) * 9 + Number(_ipn[4]) * 4 + Number(_ipn[5]) * 6 + Number(_ipn[6]) * 10 + Number(_ipn[7]) * 5 + Number(_ipn[8]) * 7; const k = num % 11; if ((k === 10 && Number(_ipn[9]) === 0) || Number(_ipn[9]) === k) return true;return false; }",
        errorText: 'Невірно введений номер',
      },
    ],
  },
};
