import React from 'react';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import { translate } from 'react-translate';
import { SchemaFormModal } from 'components/JsonSchema';
import promiseChain from 'helpers/promiseChain';
import AddIcon from '@mui/icons-material/Add';
import ImportTemplateRaw from './Actions/ImportTemplate';
import schema from '../variables/temlateSchema';

const ImportTemplate = ImportTemplateRaw as unknown as React.ComponentType<Record<string, unknown>>;

const ColorButton = withStyles((theme: Theme & { buttonBg?: string; searchInputBg?: string; listHover?: string }) => ({
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
}))(Button as never) as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme) => ({
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

interface CreateNewTemplateProps {
  t: (key: string) => string;
  actions: {
    createNumberTemplate: (data: unknown) => Promise<unknown>;
    load: () => void;
    [key: string]: unknown;
  };
  classes: Record<string, string>;
}

const CreateNewTemplate = ({ t, actions, classes }: CreateNewTemplateProps) => {
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
        {...({
          title: t('NewTemplate'),
          open,
          schema: schema(t),
          onClose: () => setOpen(false),
          onChange: (data: unknown) =>
            promiseChain([actions.createNumberTemplate, actions.load] as never, data as never),
        } as unknown as Record<string, unknown>)}
      />
    </>
  );
};

const styled = withStyles(styles)(CreateNewTemplate as never);
const translated = translate('NumberTemplateListPage')(styled as never);

export default translated as unknown as React.ComponentType<Record<string, unknown>>;
