import WebIcon from '@mui/icons-material/Web';

export default {
  type: 'Element',
  group: 'Containers',
  Icon: WebIcon,
  defaultData: {
    type: 'object',
    control: 'modal',
    description: 'description',
    sample: 'sample',
    actionText: undefined,
    properties: {
      about: {
        description: undefined,
        control: 'text.block',
        htmlBlock:
          "<p style='font-size: 20px; line-height: 24px; margin-bottom:10px; margin-top: 10px;'>Оберіть спосіб оплати</p>",
      },
    },
    htmlBlock:
      "<p style='font-size: 20px; line-height: 24px; margin-bottom:20px; margin-top: 30px;'>htmlBlock here</p>",
  },
};
