import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: StorageOutlinedIcon,
  defaultData: {
    type: 'object',
    description: 'Custom Data Select',
    control: 'custom.data.select',
    handler: 'mvs.registers.get-endpoints-by-user-id',
    payload: undefined,
  },
};
