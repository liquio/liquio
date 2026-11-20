import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';

export const type = 'Element';

export default {
  type,
  group: 'Containers',
  Icon: ViewColumnOutlinedIcon,
  isContainer: true,
  defaultData: {
    type: 'object',
    description: 'Група',
    control: 'form.group',
    blockDisplay: true,
    required: [],
    properties: {},
  },
};
