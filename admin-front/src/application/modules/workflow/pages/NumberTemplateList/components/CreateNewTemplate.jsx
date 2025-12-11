import React from 'react';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { SchemaFormModal } from 'components/JsonSchema';
import promiseChain from 'helpers/promiseChain';
import AddIcon from '@mui/icons-material/Add';
import ImportTemplate from './Actions/ImportTemplate';
import schema from '../variables/temlateSchema';

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover,
    },
    '& svg': {
      fill: theme.buttonBg,
      marginRight: 10,
    },
    '& img': {
      fill: theme.buttonBg,
      marginRight: 10,
    },
  },
}))(Button);

const styles = (theme) => ({
  buttonsWrapper: {
    display: 'flex',
    '& button': {
      flex: 1,
    },
    [theme.breakpoints.down('md')]: {
      width: '100%',
      marginTop: '10px',
    },
  },
});

const CreateNewTemplate = ({ t, actions, classes }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className={classes.buttonsWrapper}>
        <ColorButton
          variant="contained"
          color="primary"
          disableElevation={true}
          onClick={() => setOpen(true)}
        >
          <AddIcon />
          {t('CreateNew')}
        </ColorButton>
        <ImportTemplate actions={actions} ColorButton={ColorButton} />
      </div>
      <SchemaFormModal
        title={t('NewTemplate')}
        open={open}
        schema={schema(t)}
        onClose={() => setOpen(false)}
        onChange={(data) =>
          promiseChain([actions.createNumberTemplate, actions.load], data)
        }
      />
    </>
  );
};

CreateNewTemplate.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
};

const styled = withStyles(styles)(CreateNewTemplate);
const translated = translate('NumberTemplateListPage')(styled);

export default translated;
