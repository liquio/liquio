import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { makeStyles } from '@mui/styles';
import setComponentsId from 'helpers/setComponentsId';
import renderHTML from 'helpers/renderHTML';
import Layout from 'layouts/fullPage';
import Scrollbar from 'components/Scrollbar';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: 40,
    '&:focus-visible': {
      outline: `3px solid ${theme.outlineColor}`,
      outlineOffset: -3,
    },
    '& .list': {
      listStyleType: 'none',
      paddingLeft: 0,
    },
  },
}));

const Terms = ({ setId, t }) => {
  const classes = useStyles();

  return (
    <Scrollbar>
      <Layout setId={setId}>
        <div className={classes.root} tabIndex={0}>
          {renderHTML(t('TERMS_BODY'))}
        </div>
      </Layout>
    </Scrollbar>
  );
};

Terms.propTypes = {
  setId: PropTypes.func,
  t: PropTypes.func.isRequired,
};

Terms.defaultProps = {
  setId: setComponentsId('terms'),
};

export default translate('Terms')(Terms);
