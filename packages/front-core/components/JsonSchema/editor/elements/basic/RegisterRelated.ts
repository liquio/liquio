import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  snippet: 'RegisterRelated',
  Icon: StorageOutlinedIcon,
  defaultData: {
    type: 'object',
    control: 'register',
    allVisibleRequired: true,
    multiple: false,
    properties: {
      12: {
        keyId: 12,
        description: 'Опис першого рівня',
        sample: 'Підказки',
      },
      13: {
        keyId: 13,
        description: 'Опис другого рівня',
        sample: 'Підказки 2',
      },
      14: {
        keyId: 14,
        description: 'Опис третього рівня',
        sample: 'Підказки 3',
      },
      15: {
        keyId: 15,
        description: 'Опис четвертого рівня',
        sample: 'Підказки 4',
      },
    },
    description: "Пов'язані",
    additionalFilter: undefined,
    markWhenEmpty: undefined,
    defaultValue: undefined,
    sortBy: undefined,
  },
};
