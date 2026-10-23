import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import ObjectElement from './ObjectElement';

export const type = 'Step';
export const group = 'Containers';

export default {
  ...ObjectElement,
  type,
  group,
  Icon: AttachFileOutlinedIcon,
  defaultData: {
    type: 'object',
    description: 'Документи',
    control: 'preview.document',
    documentTemplateIds: [4],
  },
};
