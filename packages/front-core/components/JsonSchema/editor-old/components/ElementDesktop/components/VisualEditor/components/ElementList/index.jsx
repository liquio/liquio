import React from 'react';
import { makeStyles } from '@mui/styles';
import { useTranslate } from 'react-translate';
import classNames from 'classnames';
import { connect } from 'react-redux';
import Scrollbar from 'components/Scrollbar';
import { withEditor } from 'components/JsonSchema/editor/JsonSchemaProvider';
import StringElement from 'components/JsonSchema/elements/StringElement';
import CollapseButton from './components/CollapseButton';
import GroupedElementList from './components/GroupedElementList';

const withStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '#757575 1px solid',
  },
  divider: {
    margin: '0 4px',
    backgroundColor: '#757575',
  },
  opened: {
    width: 300,
  },
  search: {
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 25,
    marginTop: 10,
  },
});

const ElementList = ({ controlsLibrary }) => {
  const t = useTranslate('JsonSchemaEditor');
  const classes = withStyles();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const { groups, snippets } = controlsLibrary;

  return (
    <div
      className={classNames(classes.root, {
        [classes.opened]: open,
      })}
    >
      <CollapseButton
        open={open}
        title={t('CollapseElements')}
        onClick={() => setOpen(!open)}
      />

      {open ? (
        <div className={classes.search}>
          <StringElement
            description={t('SearchControls')}
            value={search}
            fullWidth={true}
            darkTheme={true}
            required={true}
            variant={'outlined'}
            onChange={setSearch}
            inputProps={{ maxLength: 255 }}
            noMargin={true}
          />
        </div>
      ) : null}

      {open ? (
        <Scrollbar options={{ disableHorizontalScrolling: true }}>
          <GroupedElementList
            groups={groups}
            snippets={snippets}
            search={search}
            visualEditor={true}
            readOnly={true}
          />
        </Scrollbar>
      ) : null}
    </div>
  );
};

export default connect(({ controlsLibrary }) => ({ controlsLibrary }))(
  withEditor(ElementList),
);
