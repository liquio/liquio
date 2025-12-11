import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { Accordion, AccordionDetails, Toolbar, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import FileNameColumn from 'components/FileDataTable/components/FileNameColumn';
import DownloadFile from 'components/FileDataTable/components/AttachesActions/DownloadFile';
import DownloadP7SFile from 'components/FileDataTable/components/AttachesActions/DownloadP7SFile';
import ShowPreview from 'components/FileDataTable/components/AttachesActions/ShowPreview';
import { humanDateTimeFormat } from 'helpers/humanDateFormat';

const styles = (theme) => ({
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
    color: '#444444',
    [theme.breakpoints.down('md')]: {
      fontSize: 10,
      lineHeight: '14px'
    }
  }
});

const ListTemplate = (props) => {
  const {
    classes,
    fileName,
    updatedAt,
    createdAt,
    fileStorage,
    actions,
    preview,
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

ListTemplate.propTypes = {
  classes: PropTypes.object.isRequired,
  fileName: PropTypes.string,
  updatedAt: PropTypes.string,
  createdAt: PropTypes.string,
  fileStorage: PropTypes.object,
  actions: PropTypes.object,
  preview: PropTypes.bool
};

ListTemplate.defaultProps = {
  fileName: '',
  updatedAt: '',
  createdAt: '',
  fileStorage: {},
  actions: {},
  preview: false
};

const mapStateToProps = ({ files: { list } }) => ({ fileStorage: list });

const styled = withStyles(styles)(ListTemplate);
const translated = translate('ListTemplate')(styled);
export default connect(mapStateToProps)(translated);
