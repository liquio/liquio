import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import renderHTML from 'helpers/renderHTML';
import classNames from 'classnames';
import { Button, Paper, FormControl, FormHelperText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import EJVError from 'components/JsonSchema/components/EJVError';
import styles from 'components/JsonSchema/elements/SelectFiles/components/styles';

const Layout = ({
  t,
  active,
  sample,
  readOnly,
  error,
  path,
  inputProps,
  classes,
  limits,
  rootProps,
}) => (
  <FormControl
    variant="standard"
    error={!!error}
    id={path.join('-')}
    className={classes.root}
  >
    <Paper
      elevation={1}
      className={classNames({
        [classes.dropZoneActive]: active,
        [classes.errored]: !!error,
      })}
    >
      {!readOnly ? (
        <div {...rootProps} className={classes.dropZone}>
          <div className={classes.raw}>{renderHTML(sample)}</div>
          <input {...inputProps} />
          <div className={classes.uploadButtonContainer}>
            {t('DropFiles')}
            <Button
              className={classes.uploadButton}
              color="primary"
              variant="contained"
              id={path.concat('button').join('-')}
              aria-label={t('SelectFiles')}
            >
              {t('SelectFiles')}
            </Button>
          </div>
          {limits()}
        </div>
      ) : null}
    </Paper>
    {error ? (
      <FormHelperText>
        <EJVError error={error} />
      </FormHelperText>
    ) : null}
  </FormControl>
);

Layout.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  sample: PropTypes.string,
  accept: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  maxSize: PropTypes.number,
  addItem: PropTypes.object,
  path: PropTypes.array,
};

Layout.defaultProps = {
  sample: '',
  accept: '',
  maxSize: null,
  value: null,
  addItem: null,
  path: [],
};

const translated = translate('Elements')(Layout);
const styled = withStyles(styles)(translated);
export default styled;
