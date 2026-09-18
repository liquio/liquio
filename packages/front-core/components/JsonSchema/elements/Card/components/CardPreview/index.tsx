import React from 'react';
import classNames from 'classnames';
import { useTranslate } from 'react-translate';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Card, CardContent, List, Button, Popover } from '@mui/material';

import { makeStyles } from '@mui/styles';

import { ChangeEvent } from 'components/JsonSchema';
import PropertyList from 'components/JsonSchema/elements/Card/components/CardPreview/PropertyList';
import HtmlTemplate from 'components/JsonSchema/elements/Card/components/CardPreview/HtmlTemplate';
import { JsonSchemaNode } from '../../../../types';

const withStyles = makeStyles({
  root: {
    minWidth: 158,
    border: '3px solid #000000',
    borderRadius: 0,
    '& > button': {
      opacity: '.5',
    },
    '&:hover > button': {
      opacity: 1,
    },
  },
  error: {
    border: '#f44336 1px solid',
  },
  editBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

interface CardPreviewProps {
  hasError?: unknown;
  schema: JsonSchemaNode & { htmlTemplate?: string; editText?: string };
  value?: Record<string, unknown>;
  onChange: (event: unknown) => void;
  setRecoverData: (data: unknown) => void;
  rootDocument: { data: Record<string, unknown> };
  readOnly?: boolean;
  usedInTable?: boolean;
  onCommit?: (value: Record<string, unknown>) => void;
  containerRef: React.RefObject<HTMLElement | null>;
}

const CardPreview = ({
  hasError,
  schema,
  value,
  onChange,
  setRecoverData,
  rootDocument,
  readOnly,
  usedInTable,
  onCommit,
  containerRef,
}: CardPreviewProps) => {
  const t = useTranslate('Elements');
  const classes = withStyles();

  const handeleOpen = React.useCallback(() => {
    setRecoverData(rootDocument.data);
    if (value) {
      (onChange.bind(null, 'open') as (arg: unknown) => void)(new ChangeEvent(true, true));
    } else {
      onChange(new ChangeEvent({ open: true }, true));
    }
  }, [setRecoverData, rootDocument, onChange, value]);

  const cardContent = React.useMemo(
    () => (
      <Card
        variant="outlined"
        className={classNames(classes.root, {
          [classes.error]: !!hasError,
        })}
      >
        <CardContent>
          <List>
            {schema.htmlTemplate ? (
              <HtmlTemplate data={value || {}} template={schema.htmlTemplate} />
            ) : (
              <PropertyList value={value || {}} schema={schema} />
            )}
          </List>
        </CardContent>
        {readOnly ? null : (
          <Button
            onClick={handeleOpen}
            className={classes.editBtn}
            startIcon={<EditOutlinedIcon />}
            aria-label={t(schema.editText || 'Edit')}
          >
            {schema.editText || t('Edit')}
          </Button>
        )}
      </Card>
    ),
    [
      classes.editBtn,
      classes.error,
      classes.root,
      handeleOpen,
      hasError,
      readOnly,
      schema,
      t,
      value,
    ],
  );

  return usedInTable ? (
    <Popover
      open={true}
      anchorEl={containerRef.current}
      onClose={() => onCommit?.(value || {})}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
    >
      {cardContent}
    </Popover>
  ) : (
    cardContent
  );
};

export default CardPreview;
