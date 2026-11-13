import React from 'react';
import classNames from 'classnames';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

import DataTable from 'components/DataTable';
import evaluate from 'helpers/evaluate';
import arrayUnique from 'helpers/arrayUnique';
import diff from 'helpers/diff';

const styles = {
  root: {
    display: 'block',
    maxWidth: 640,
    marginTop: 5,
    marginBottom: 40,
  },
  fieldset: {
    top: -5,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    padding: '0 8px',
    overflow: 'hidden',
    position: 'absolute' as const,
    borderStyle: 'solid' as const,
    borderWidth: 1,
    borderRadius: 'inherit',
    pointerEvents: 'none' as const,
  },
  legend: {
    transition: 'max-width 100ms cubic-bezier(0.0, 0, 0.2, 1) 50ms',
    width: 'auto',
    height: 11,
    display: 'block',
    padding: 0,
    fontSize: '0.79em',
    maxWidth: 1000,
    textAlign: 'left' as const,
    visibility: 'hidden' as const,
  },
  container: {
    padding: '6px 1px 0',
    position: 'relative' as const,
    borderRadius: 4,
  },
  label: {
    transform: 'translate(-15px, -10px) scale(0.75)',
    color: 'rgba(0, 0, 0, 0.38)',
    zIndex: 1,
    top: 0,
    left: 0,
    position: 'absolute' as const,
  },
};

interface DataMapRow {
  key: unknown;
  value: unknown;
}

interface DataMapProps extends WithStyles<typeof styles> {
  description?: string;
  value?: DataMapRow[];
  rootDocument: { data: Record<string, unknown> };
  keyList: string;
  keyName?: string;
  keyValue: string;
  valueName?: string;
  onChange: (data: DataMapRow[]) => void;
}

const DataMap = ({
  classes,
  description,
  value = [],
  rootDocument,
  keyList,
  keyName,
  keyValue,
  valueName,
  onChange,
}: DataMapProps) => {
  React.useEffect(() => {
    const data = arrayUnique(evaluate(keyList, rootDocument.data) as unknown[]).map(
      (key) => ({
        key: key || '',
        value: evaluate(keyValue, key, rootDocument.data),
      }),
    );

    if (diff(data, value)) {
      onChange(data);
    }
  }, [rootDocument, keyList, keyValue, onChange, value]);

  return (
    <div
      className={classNames('MuiFormControl-root', classes.root)}
      {...({ row: 'false' } as unknown as Record<string, unknown>)}
    >
      <div className="MuiFormControl-root MuiTextField-root">
        <label className={classes.label}>{description}</label>
        <div
          className={classNames(
            'MuiInputBase-root',
            'MuiOutlinedInput-root',
            'Mui-disabled',
            'Mui-disabled',
            'MuiInputBase-formControl',
            'MuiInputBase-adornedStart',
            'MuiOutlinedInput-adornedStart',
            classes.container,
          )}
        >
          <DataTable
            tableProps={{ style: { width: '100%' } }}
            controls={{ toolbar: false, header: true }}
            data={Array.isArray(value) ? value : []}
            columns={[
              {
                id: 'key',
                name: keyName,
              },
              {
                id: 'value',
                name: valueName,
              },
            ]}
          />
          <fieldset
            aria-hidden="true"
            className={classNames(
              classes.fieldset,
              'MuiOutlinedInput-notchedOutline',
            )}
          >
            <legend className={classes.legend}>
              <span>{description}</span>
            </legend>
          </fieldset>
        </div>
      </div>
    </div>
  );
};

export default withStyles(styles)(DataMap);
