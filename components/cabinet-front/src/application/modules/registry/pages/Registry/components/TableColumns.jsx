export default (t) => ({
  columns: [
    {
      name: 'data',
      title: t('Name'),
      sortingEnabled: true
    },
    {
      name: 'createdBy',
      title: t('CreatedBy'),
      sortingEnabled: true
    },
    {
      name: 'meta.person.id',
      title: t('UserId'),
      sortingEnabled: true
    },
    {
      name: 'meta.person.name',
      title: t('UserPIB'),
      sortingEnabled: true
    },
    {
      name: 'createdAt',
      title: t('CreatedAt'),
      sortingEnabled: true
    },
    {
      name: 'updatedBy',
      title: t('UpdatedBy'),
      sortingEnabled: true
    },
    {
      name: 'updatedAt',
      title: t('UpdatedAt'),
      sortingEnabled: true,
      dateFormat: 'DD.MM.YYYY HH:mm:ss'
    }
  ],
  tableColumnExtensions: [
    { columnName: 'createdBy', align: 'left' },
    { columnName: 'createdAt', align: 'left' },
    { columnName: 'updatedBy', align: 'left' },
    { columnName: 'updatedAt', align: 'left' },
    { columnName: 'meta.person.id', align: 'left' },
    { columnName: 'meta.person.name', align: 'left' }
  ],
  columnWidths: [
    { columnName: 'data', width: 640 },
    { columnName: 'createdBy', width: 240 },
    { columnName: 'createdAt', width: 240 },
    { columnName: 'updatedBy', width: 240 },
    { columnName: 'updatedAt', width: 240 },
    { columnName: 'meta.person.id', width: 260 },
    { columnName: 'meta.person.name', width: 400 }
  ],
  columnOrder: [
    'data',
    'createdBy',
    'meta.person.id',
    'meta.person.name',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ],
  hiddenColumns: [
    'createdBy',
    'meta.person.id',
    'meta.person.name',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ],
  customColumns: []
});
