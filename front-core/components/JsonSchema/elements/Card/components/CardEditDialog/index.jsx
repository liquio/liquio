import React from 'react';
import { useTranslate } from 'react-translate';
import objectPath from 'object-path';

import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Toolbar,
  Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import CloseIcon from '@mui/icons-material/Close';

import { SchemaForm, ChangeEvent } from 'components/JsonSchema';
import diff from 'helpers/diff';

const withStyles = makeStyles({
  heading: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  paper: {
    maxWidth: '688px !important',
    maxHeight: 'none',
  },
  button: {
    marginTop: 20,
  },
});

const CardEditDialog = ({
  recoverData,
  schema: { description, ...schema },
  ...props
}) => {
  const t = useTranslate('Elements');
  const classes = withStyles();

  const handleClose = React.useCallback(() => {
    if (diff(props.rootDocument.data, recoverData)) {
      objectPath.set(
        recoverData,
        [props.stepName].concat(props.path, 'open'),
        false,
      );
      return props.actions.setValues(recoverData);
    }
    props.onChange.bind(null, 'open')(new ChangeEvent(false, true));
  }, [
    props.onChange,
    props.actions,
    props.rootDocument.data,
    recoverData,
    props.path,
    props.stepName,
  ]);

  const handleSave = React.useCallback(async () => {
    const valid = await props.actions.validatePath(props.path);

    if (!valid) {
      return;
    }
    props.onChange.bind(null, 'open')(new ChangeEvent(false, true));
  }, [props.onChange, props.actions, props.path]);

  return (
    <Dialog
      fullWidth={true}
      scroll="body"
      open={!!props.value?.open}
      onClose={handleClose}
      classes={{ paper: classes.paper }}
    >
      <DialogTitle>
        <Toolbar disableGutters={true}>
          <Typography variant="h6" className={classes.heading}>
            {description}
          </Typography>
          <Button onClick={handleClose} aria-label={t('Close')}>
            <CloseIcon />
          </Button>
        </Toolbar>
      </DialogTitle>
      <DialogContent className={classes.content}>
        <SchemaForm
          {...props}
          // usedInTable={false}
          userInCard={true}
          noMargin={false}
          useOwnContainer={false}
          className="popup-element"
          schema={{ ...schema, type: 'object' }}
        />
        <Button
          color="primary"
          variant="contained"
          onClick={handleSave}
          className={classes.button}
          aria-label={schema.saveText || t('Done')}
        >
          {schema.saveText || t('Done')}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CardEditDialog;
