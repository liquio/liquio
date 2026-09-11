import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
// import Scrollbar from 'components/Scrollbar';
import CodeEditDialog from 'components/CodeEditDialog';

import { Tooltip, IconButton } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

const styles = {
  root: {
    height: 200,
    width: 600,
    backgroundColor: '#141414',
    color: '#F8F8F8',
    cursor: 'pointer',
  },
};

const JsonExpand = ({ t, value }) => {
  const [open, setOpen] = React.useState(false);
  const stringValue = JSON.stringify(value, null, 4);

  return (
    <>
      <Tooltip title={t('WorkflowLogDetails')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <RemoveRedEyeIcon />
        </IconButton>
      </Tooltip>
      {/* <div className={classes.root} onClick={() => setOpen(true)}>
            <Scrollbar><pre>{stringValue}</pre></Scrollbar>
        </div> */}
      <CodeEditDialog
        open={open}
        onClose={() => setOpen(false)}
        value={stringValue || ''}
        readOnly={true}
      />
    </>
  );
};

JsonExpand.propTypes = {
  classes: PropTypes.object.isRequired,
  value: PropTypes.object,
};

JsonExpand.defaultProps = {
  value: {},
};

const translated = translate('ProcessesListPage')(JsonExpand);
export default withStyles(styles)(translated);
