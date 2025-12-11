import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

import SignerTableToolbar from './components/SignerTableToolbar';

export default ({ t, editMode, value, users, search }) => {
  const controls = {
    pagination: false,
    toolbar: true,
    search: editMode,
    header: false,
    refresh: false,
    switchView: false,
  };

  const filter = ({ name }) => new RegExp(search, 'gi').test(name);

  const values = Object.values(value || {});
  const data = editMode ? users.filter(filter) : values;
  const rowsSelected = editMode ? values.map(({ id }) => id) : [];

  return {
    data,
    search,
    editMode,
    rowsSelected,
    checkable: editMode,
    CustomToolbar: SignerTableToolbar,
    emptyDataText: t('EmptySignerList'),
    controls,
    columns: [
      {
        id: 'name',
        render: (name) => name.split(' ').map(capitalizeFirstLetter).join(' '),
      },
    ],
  };
};
