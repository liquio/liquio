import _ from 'lodash';
import diff from 'deep-diff';
import { useEffect, useMemo } from 'react';

import {
  DataSheetGrid,
  textColumn,
  keyColumn,
} from 'react-datasheet-grid';

import 'react-datasheet-grid/dist/style.css';
import { useTranslate } from 'react-translate';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles({
  lhsColumn: {
    backgroundColor: '#E27D7D70 !important',
  },
  rhsColumn: {
    backgroundColor: '#A4D65E70 !important',
  },
  kindColumn: {
    backgroundColor: '#E2E7F070 !important',
  },
  pathColumn: {
    backgroundColor: '#E2E7F070 !important',
  },
});

const kinds: Record<string, string> = {
  N: 'ModifyTypeNew',
  D: 'ModifyTypeDeleted',
  A: 'ModifyTypeAdded',
  E: 'ModifyTypeEdit',
};

interface DiffTableProps {
  oldValuePath?: string;
  newValuePath?: string;
  include?: string[];
  exclude?: string[];
  onChange: (value: unknown) => void;
  hidden?: boolean;
  value?: unknown[];
  rootDocument: { data: Record<string, unknown> };
}

export const DiffTable = ({
  oldValuePath = '',
  newValuePath = '',
  include: includedPaths = [],
  exclude: excludedPaths = [],
  onChange,
  hidden,
  value: defaultValue,
  rootDocument,
}: DiffTableProps) => {
  const t = useTranslate('Elements');
  const classes = useStyles();

  const oldValue = _.get(rootDocument.data, oldValuePath) as object;
  const newValue = _.get(rootDocument.data, newValuePath) as object;

  const value = useMemo(() => {
    if (!oldValue || !newValue) {
      return [] as Array<Record<string, unknown>>;
    }

    let oldValueFiltered, newValueFiltered;
    if (includedPaths.length) {
      oldValueFiltered = _.pick(oldValue, includedPaths);
      newValueFiltered = _.pick(newValue, includedPaths);
    } else {
      oldValueFiltered = oldValue;
      newValueFiltered = newValue;
    }

    if (excludedPaths.length) {
      oldValueFiltered = _.omit(oldValueFiltered, excludedPaths);
      newValueFiltered = _.omit(newValueFiltered, excludedPaths);
    }

    return (diff(oldValueFiltered, newValueFiltered) || []) as unknown as Array<Record<string, unknown>>;
  }, [oldValue, newValue]);

  useEffect(() => {
    if (diff(value, defaultValue || [])) {
      onChange(value);
    }
  }, [value, defaultValue]);

  const columns = [
    { ...keyColumn('path', textColumn), title: t('Path') },
    { ...keyColumn('lhs', textColumn), title: t('OldValue') },
    { ...keyColumn('rhs', textColumn), title: t('NewValue') },
    { ...keyColumn('kind', textColumn), title: t('Kind') },
  ];

  if (hidden) return null;

  if (!value.length) {
    return <div>{t('NoChanges')}</div>;
  }

  return (
    <DataSheetGrid
      lockRows
      cellClassName={({ columnId }: { columnId?: string }) => (classes as Record<string, string>)[columnId + 'Column']}
      value={value.map((item) => ({ ...item, kind: t(kinds[item.kind as string]) }))}
      columns={columns}
    />
  );
};

export default DiffTable;
