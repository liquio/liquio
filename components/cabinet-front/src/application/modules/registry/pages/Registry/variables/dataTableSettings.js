import evaluate from 'helpers/evaluate';

const columns = (t, { toString }) => [
  {
    name: t('Name'),
    render: (value, item) => {
      const content = evaluate(toString, item);

      if (content instanceof Error) {
        content.commit({ type: 'registry table' });
        return null;
      }

      return content;
    }
  },
  {
    id: 'createdBy',
    name: t('CreatedBy')
  },
  {
    id: 'updatedBy',
    name: t('UpdatedBy')
  }
];

export default ({ t, selectedKey, actions }) => ({
  actions,
  controls: {
    pagination: false,
    toolbar: true,
    search: false,
    header: true,
    refresh: true,
    switchView: false
  },
  checkable: false,
  columns: columns(t, selectedKey)
});
