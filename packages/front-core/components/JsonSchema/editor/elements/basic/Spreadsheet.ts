import TableChartIcon from '@mui/icons-material/TableChart';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: TableChartIcon,
  defaultData: {
    type: 'array',
    control: 'spreadsheet',
    description: 'Сніппети',
    headAlign: undefined,
    headFontSize: undefined,
    headers: [
      [
        {
          label: 'Название в панели контролов в редакторе',
          colspan: 3,
        },
        {
          label: 'Код контрола',
          colspan: 2,
        },
      ],
      ['код1', 'код2', 'код3', 'код4', 'код5'],
    ],
    items: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Название в панели контролов в редакторе',
        },
        code: {
          type: 'string',
          description: 'Код контрола',
        },
        description: {
          type: 'number',
          description: 'Опис',
        },
        owner: {
          type: 'number',
          description: 'Відповідальна особа',
        },
        key5: {
          type: 'number',
          description: 'key5',
        },
      },
    },
  },
};
