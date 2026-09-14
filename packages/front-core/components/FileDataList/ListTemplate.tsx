import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { Accordion, AccordionDetails, Toolbar, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import DownloadFileRaw from 'components/FileDataTable/components/AttachesActions/DownloadFile';
import DownloadP7SFileRaw from 'components/FileDataTable/components/AttachesActions/DownloadP7SFile';
import ShowPreviewRaw from 'components/FileDataTable/components/AttachesActions/ShowPreview';
import FileNameColumn from 'components/FileDataTable/components/FileNameColumn';
import { humanDateTimeFormat } from 'helpers/humanDateFormat';

const DownloadFile = DownloadFileRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DownloadP7SFile = DownloadP7SFileRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ShowPreview = ShowPreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme) => ({
  details: {
    padding: 24,
    display: 'block',
    [theme.breakpoints.down('md')]: {
      padding: 20
    }
  },
  toolbar: {
    padding: 0,
    width: '100%'
  },
  grow: {
    display: 'flex',
    justifyContent: 'flex-end',
    flex: '0 1 auto'
  },
  time: {
    fontSize: 14,
    color: theme?.palette?.text?.secondary,
    [theme.breakpoints.down('md')]: {
      fontSize: 10,
      lineHeight: '14px'
    }
  }
});

interface ListTemplateProps {
  classes: Record<string, string>;
  fileName?: string;
  updatedAt?: string;
  createdAt?: string;
  fileStorage?: Record<string, unknown>;
  actions?: { handleDownloadFile?: (...args: unknown[]) => void; [key: string]: unknown };
  preview?: boolean;
  meta?: { description?: string };
  hasP7sSignature?: boolean;
  onPreviewError?: (...args: unknown[]) => void;
  [key: string]: unknown;
}

const ListTemplate = (props: ListTemplateProps) => {
  const {
    classes,
    fileName = '',
    updatedAt = '',
    createdAt = '',
    fileStorage = {},
    actions = {},
    preview = false,
    meta,
    hasP7sSignature,
    onPreviewError
  } = props;

  return (
    <Accordion expanded={true}>
      <AccordionDetails className={classes.details}>
        <Toolbar className={classes.toolbar}>
          <FileNameColumn
            name={fileName}
            extension={fileName.split('.').pop()}
            meta={meta?.description}
          />
          <div className={classes.grow}>
            {preview ? (
              <ShowPreview
                item={props}
                fileStorage={fileStorage}
                handleDownloadFile={actions.handleDownloadFile}
                onPreviewError={onPreviewError}
              />
            ) : null}
            <DownloadFile
              item={props}
              fileStorage={fileStorage}
              handleDownloadFile={actions.handleDownloadFile}
              onPreviewError={onPreviewError}
            />
            {hasP7sSignature ? (
              <DownloadP7SFile
                item={props}
                fileStorage={fileStorage}
                handleDownloadFile={actions.handleDownloadFile}
                onPreviewError={onPreviewError}
              />
            ) : null}
          </div>
        </Toolbar>
        <Typography variant="body2" className={classes.time}>
          {humanDateTimeFormat(updatedAt || createdAt)}
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
};

const mapStateToProps = ({ files: { list } }: { files: { list: Record<string, unknown> } }) => ({
  fileStorage: list
});

const styled = withStyles(styles)(ListTemplate as never);
const translated = translate('ListTemplate')(styled as never);
export default connect(mapStateToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
