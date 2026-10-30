import FolderOpenIcon from '@mui/icons-material/FolderOpen';

export const type = 'Element';

export default {
  type,
  group: 'Containers',
  Icon: FolderOpenIcon,
  isContainer: true,
  defaultData: {
    type: 'object',
    description: '',
    sample: '',
    value: '',
    hidden: false,
    required: [],
    properties: {},
  },
};
