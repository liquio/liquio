import React from 'react';
import classNames from 'classnames';
import { translate } from 'react-translate';
import { Tabs, Tab } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import setComponentsId from 'helpers/setComponentsId';
import dbStorage from 'helpers/indexedDB';
import FileKeySignForm from './FileKeySignForm';

const styles = (theme: Theme) => ({
  tab: {
    fontSize: 16,
    color: theme?.palette?.text?.secondary,
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

interface SignForm {
  id: string;
  name: string;
  component: React.ComponentType<Record<string, unknown>>;
}

interface P7SFormProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  setId?: (element: string) => string;
  template?: { jsonSchema?: { signMethods?: string[] } };
  onSelectKey?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

const P7SForm = ({ t, classes, setId = setComponentsId('sign-form'), template, ...rest }: P7SFormProps) => {
  const [tab, setTab] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  const signMethods = template?.jsonSchema?.signMethods || ['file-key'];

  const forms = React.useMemo(() => {
    const forms: SignForm[] = [];
    if (rest.onSelectKey) {
      forms.push({
        id: 'file-key',
        name: t('FileKeySignMethod'),
        component: FileKeySignForm as unknown as React.ComponentType<Record<string, unknown>>
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
        {...({ disabled: busy } as unknown as Record<string, unknown>)}
        onChange={async (event, value) => {
          await dbStorage.clear();
          setTab(value);
        }}
        indicatorColor="primary"
        textColor="primary"
        id={setId!('tabs')}
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
            id={setId!(`tab-${form.id}`)}
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
          setId={(elementName: string) => setId!(`${selectedForm.id}-${elementName}`)}
        />
      ) : null}
    </>
  );
};

const styled = withStyles(styles)(P7SForm as never);
export default translate('SignForm')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
