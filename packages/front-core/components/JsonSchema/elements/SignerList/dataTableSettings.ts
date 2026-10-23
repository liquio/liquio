import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

import SignerTableToolbar from './components/SignerTableToolbar';

interface Signer {
  id: string | number;
  name?: string;
  [key: string]: unknown;
}

export default ({ t, editMode, value, users, search }: {
  t: (key: string) => string;
  editMode?: boolean;
  value?: Record<string, Signer> | null;
  users: Signer[];
  search: string;
}) => {
  const controls = {
    pagination: false,
    toolbar: true,
    search: editMode,
    header: false,
    refresh: false,
    switchView: false,
  };

  const filter = ({ name }: Signer) => new RegExp(search, 'gi').test(name as string);

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
        // `.map(capitalizeFirstLetter)` implicitly passes the word index as the
        // `onlyFirst` argument — the first word gets the hyphen-aware/lowercasing
        // path, every later word gets "capitalize only the first char" instead.
        // Preserved exactly (see JsonSchema/helpers/getFormElementName.ts).
        render: (name: string) => name.split(' ').map((part, index) => capitalizeFirstLetter(part, index as unknown as boolean)).join(' '),
      },
    ],
  };
};
