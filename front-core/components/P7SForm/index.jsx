import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { translate } from 'react-translate';
import { Tabs, Tab } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import setComponentsId from 'helpers/setComponentsId';
import dbStorage from 'helpers/indexedDB';
import FileKeySignForm from './FileKeySignForm';

const styles = (theme) => ({
  tab: {
    fontSize: 16,
    color: '#444444',
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      margin: 0,
      padding: 0,
      '&:not(:last-child)': {
        marginRight: 10
      }
    }
  },
  tabsRoot: {
    [theme.breakpoints.down('md')]: {
      margin: '0!important'
    }
  },
  containerXs: {
    [theme.breakpoints.down('md')]: {
      padding: '0!important',
      justifyContent: 'space-between'
    }
  },
  tabsWrapper: {
    marginBottom: 10
  }
});

const P7SForm = ({ t, classes, setId, template, ...rest }) => {
  const [tab, setTab] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  const signMethods = template?.jsonSchema?.signMethods || [
    'file-key',
  ];

  const forms = React.useMemo(() => {
    const forms = [];
    if (rest.onSelectKey) {
      forms.push({
        id: 'file-key',
        name: t('FileKeySignMethod'),
        component: FileKeySignForm
      });
    }

    if (signMethods.length) {
      return forms.filter((form) => signMethods.includes(form.id));
    }

    return forms;
  }, [rest.onSelectKey, t, signMethods]);

  const selectedForm = forms[tab];
  return (
    <>
      <Tabs
        value={tab}
        disabled={busy}
        onChange={async (event, value) => {
          await dbStorage.clear();
          setTab(value);
        }}
        indicatorColor="primary"
        textColor="primary"
        id={setId('tabs')}
        className={classes.tabsWrapper}
        classes={{
          flexContainer: classNames(classes.tabsContainer, classes.containerXs),
          root: classes.tabsRoot
        }}
      >
        {forms.map((form) => (
          <Tab
            key={form.id}
            disabled={busy}
            label={form.name}
            id={setId(`tab-${form.id}`)}
            className={classNames(classes.tab, classes.tabButton)}
            tabIndex={0}
          />
        ))}
      </Tabs>

      {selectedForm.component ? (
        <selectedForm.component
          {...rest}
          template={template}
          busy={busy}
          setBusy={setBusy}
          setId={(elementName) => setId(`${selectedForm.id}-${elementName}`)}
        />
      ) : null}
    </>
  );
};

P7SForm.propTypes = {
  setId: PropTypes.func,
  t: PropTypes.func.isRequired,
  onSelectKey: PropTypes.func.isRequired
};

P7SForm.defaultProps = {
  setId: setComponentsId('sign-form')
};

const styled = withStyles(styles)(P7SForm);
export default translate('SignForm')(styled);
