import PhoneEnabledOutlinedIcon from '@mui/icons-material/PhoneEnabledOutlined';
import StringElement from '../basic/StringElement';

export default {
  ...StringElement,
  group: 'TextFields',
  snippet: 'Phone',
  Icon: PhoneEnabledOutlinedIcon,
  defaultData: {
    ...StringElement.defaultData,
    pattern: '^380[0-9]{9}$',
    description: 'Номер телефона',
    mask: '380999999999',
  },
};
