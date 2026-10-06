import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';

export const type = 'Element';
export const group = 'Register';

export default {
  type,
  group,
  snippet: 'Citizen',
  Icon: PublicOutlinedIcon,
  defaultData: {
    type: 'object',
    control: 'register',
    multiple: false,
    keyId: 29,
    description: 'Громадянство',
    defaultValue: 'code=804',
    sortBy: {
      'data.nameShort': 'asc',
    },
  },
};
