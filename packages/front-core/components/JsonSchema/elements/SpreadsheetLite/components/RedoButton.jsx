import React from 'react';
import { useTranslate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import RedoIcon from '@mui/icons-material/Redo';
import theme from 'theme';
import { ReactComponent as RedoBtn } from 'assets/img/redoIcon.svg';
import classNames from 'classnames';

const RedoButton = ({ redo, disabled, classes }) => {
  const t = useTranslate('Elements');

  const { defaultLayout } = theme;

  return (
    <>
      {defaultLayout ? (
        <div className={classes.iconWrapper}>
          <IconButton onClick={redo} disabled={disabled} aria-label={t('Redo')}>
            <RedoBtn
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
            {t('Again')}
          </p>
        </div>
      ) : (
        <Tooltip title={t('Redo')}>
          <IconButton onClick={redo} disabled={disabled} aria-label={t('Redo')}>
            <RedoIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
};

export default RedoButton;
