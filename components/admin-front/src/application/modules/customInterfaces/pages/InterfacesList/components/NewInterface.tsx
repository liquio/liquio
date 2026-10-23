import React from 'react';
import { translate } from 'react-translate';
import { Button } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import InterfaceDialogRaw from 'modules/customInterfaces/pages/InterfacesList/components/InterfaceDialog';

const InterfaceDialog = InterfaceDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

type AppTheme = Theme & {
  buttonBg?: string;
  searchInputBg?: string;
  listHover?: string;
};

export const ColorButton = withStyles((theme: AppTheme) => ({
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
      marginRight: 6,
    },
  },
}))(Button);

interface InterfaceData {
  [key: string]: unknown;
}

interface NewInterfaceProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  onCommit: (data: InterfaceData) => Promise<void>;
}

const NewInterface = ({ t, onCommit }: NewInterfaceProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <ColorButton
        variant="contained"
        color="primary"
        disableElevation={true}
        onClick={() => setOpen(true)}
      >
        <AddIcon />
        {t('NewInterface')}
      </ColorButton>

      <InterfaceDialog
        open={open}
        onCommit={onCommit}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default translate('InterfacesList')(NewInterface as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
