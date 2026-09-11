import ListAltIcon from '@mui/icons-material/ListAlt';
import ObjectElement from './ObjectElement';

export const type = 'Step';
export const group = 'Containers';

export default {
  ...ObjectElement,
  type,
  group,
  snippet: 'Step',
  Icon: ListAltIcon,
};
