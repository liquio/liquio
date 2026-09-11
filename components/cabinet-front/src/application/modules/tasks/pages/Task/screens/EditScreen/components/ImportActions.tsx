/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Toolbar, Button } from '@mui/material';

const ImportActions = ({ t, handleImport, importSchema }: any) => {
  const inputEl = React.useRef<HTMLInputElement | null>(null);

  if (!importSchema) {
    return null;
  }

  return (
    <Toolbar>
      <input
        ref={inputEl}
        type="file"
        accept=".xls, .xlsx"
        onChange={({ target: { files } }) => files?.[0] && handleImport(files[0])}
        hidden={true}
        multiple={false}
      />
      <Button color="primary" variant="contained" onClick={() => inputEl.current?.click()}>
        {t('ImportData')}
      </Button>
    </Toolbar>
  );
};

ImportActions.propTypes = {
  t: PropTypes.func.isRequired,
  handleImport: PropTypes.func,
  importSchema: PropTypes.object
};

ImportActions.defaultProps = {
  handleImport: () => null,
  importSchema: null
};

export default translate('TaskPage')(ImportActions as any);
