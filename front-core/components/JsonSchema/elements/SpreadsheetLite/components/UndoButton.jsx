import React from 'react';
import { useTranslate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import theme from 'theme';
import { ReactComponent as CancelIcon } from 'assets/img/cancelIcon.svg';
import classNames from 'classnames';

const UndoButton = ({ undo, disabled, classes }) => {
  const t = useTranslate('Elements');

  const { defaultLayout } = theme;

  return (
    <>
      {defaultLayout ? (
        <div className={classes.iconWrapper}>
          <IconButton onClick={undo} disabled={disabled} aria-label={t('Undo')}>
            <CancelIcon
              className={classNames({
                [classes.disabled]: disabled,
              })}
            />
          </IconButton>
          <p
            className={classNames({
              [classes.disabled]: disabled,
              [classes.iconTitle]: true,
            })}
          >
            {t('Сancel')}
          </p>
        </div>
      ) : (
        <Tooltip title={t('Undo')}>
          <IconButton onClick={undo} disabled={disabled} aria-label={t('Undo')}>
            <UndoIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
};

export default UndoButton;
