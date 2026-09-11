import React from 'react';
import PropTypes from 'prop-types';
import { ImageListItem, Card, Checkbox, Toolbar } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';

import SignatureDetails from 'components/FileDataTable/components/SignatureDetails';
import AttachesActions from './AttachesActions';
import FileNameColumn from './FileNameColumn';
import FilePreview from './FilePreview';

const styles = {
  card: {
    marginRight: 10,
    marginBottom: 10,
    padding: '4px 4px 0',
    width: 199,
    border: 'rgba(0,0,0,0.2) 1px solid',
    background: '#eee'
  },
  toolbar: {
    position: 'inherit',
    padding: 0,
    minHeight: 0
  },
  selected: {
    background: '#feffda'
  },
  grow: {
    flexGrow: 1
  }
};

const DataTableCard = ({
  classes,
  selected,
  selectable,
  onSelect,
  checkable,
  actions,
  fileStorage,
  item
}) => {
  const fileName = item.fileName || item.name || '';
  const meta = item?.meta?.description || null;

  return (
    <ImageListItem cols={2}>
      <Card elevation={0} className={classNames(classes.card, { [classes.selected]: selected })}>
        {checkable ? (
          <Toolbar className={classes.toolbar}>
            <Checkbox checked={selected} disabled={!selectable} onChange={onSelect} />
            <div className={classes.grow} />
            {item.signature ? <SignatureDetails item={item} /> : null}
            {item instanceof File ? null : (
              <AttachesActions item={item} actions={actions} fileStorage={fileStorage} />
            )}
          </Toolbar>
        ) : null}
        <FilePreview file={item} />
        <FileNameColumn
          name={fileName}
          item={item}
          iconSize={16}
          meta={meta}
          extension={fileName.split('.').pop()}
          whiteSpace={true}
        />
      </Card>
    </ImageListItem>
  );
};

DataTableCard.propTypes = {
  selected: PropTypes.bool,
  selectable: PropTypes.bool,
  checkable: PropTypes.bool
};

DataTableCard.defaultProps = {
  selected: false,
  selectable: false,
  checkable: false
};

export default withStyles(styles)(DataTableCard);
