import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: PostAddOutlinedIcon,
  defaultData: {
    description: 'Текст',
    type: 'string',
    control: 'Textarea',
    sample: 'Текст підказки',
    hint: '<p>Текст прикладу</p>',
    height: 400,
    htmlMaxLength: undefined,
    htmlMinLength: undefined,
  },
};
