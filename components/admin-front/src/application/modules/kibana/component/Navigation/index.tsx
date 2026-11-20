import React, { useState, useEffect, useMemo } from 'react';
import { translate } from 'react-translate';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import NavigationList from 'modules/kibana/component/Navigation/NavigationList';
import NavSubItem from 'layouts/components/Navigator/NavSubItem';
import NavItemContent from 'layouts/components/Navigator/NavItemContent';

type AppTheme = Theme & {
  navigator?: {
    borderBottom?: string;
    navItem?: { linkActiveBg?: string };
  };
};

const styles = (theme: AppTheme) => ({
  categoryWrapper: {
    display: 'block',
  },
  accordionRoot: {
    borderRadius: '0 !important',
    background: 'transparent',
    boxShadow: 'none',
    borderBottom: theme.navigator?.borderBottom,
  },
  accordionRounded: {},
  detailsRoot: {
    display: 'block',
    padding: '0',
  },
  summaryRoot: {
    minHeight: 'auto !important',
    padding: '14px 16px',
    '&:hover': {
      background: theme.navigator?.navItem?.linkActiveBg,
    },
  },
  summaryContent: {
    margin: 0,
  },
  summaryExpanded: {
    margin: '0 !important',
  },
  summaryExpandIcon: {
    marginRight: 0,
    padding: 0,
    width: 32,
    height: 32,
    '& svg': {
      fill: '#fff',
    },
    '&:hover': {
      backgroundColor: 'gray',
    },
  },
});

interface KibanaNavigationProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  icon?: React.ReactNode;
  id: string;
  path: string;
}

const KibanaNavigation = (props: KibanaNavigationProps) => {
  const { t, classes, icon, id, path } = props;

  const [state, setState] = useState(() => {
    const storage = JSON.parse(localStorage.getItem('Navigator') as string) as Record<string, { open: boolean }>;
    return storage[id].open;
  });

  useEffect(() => {
    const storage = JSON.parse(localStorage.getItem('Navigator') as string);

    localStorage.setItem(
      'Navigator',
      JSON.stringify({ ...storage, [id]: { open: state } }),
    );
  }, [state, id]);

  const handleChange = () => setState((open) => !open);

  const menuItemMemoized = useMemo(() => {
    return { title: 'ReportTemplates', id, path };
  }, [id, path]);

  return (
    <li className={classes.categoryWrapper}>
      <Accordion
        classes={{
          root: classes.accordionRoot,
          rounded: classes.accordionRounded,
        }}
        expanded={state}
        onChange={handleChange}
      >
        <AccordionSummary
          classes={{
            root: classes.summaryRoot,
            content: classes.summaryContent,
            expanded: classes.summaryExpanded,
            expandIcon: classes.summaryExpandIcon,
          } as never}
          expandIcon={<ExpandMoreIcon {...({ alt: t('KibanaReports') } as unknown as Record<string, unknown>)} />}
          aria-controls={`panel1a-content-${id}`}
        >
          <NavItemContent t={t} path={path} icon={icon} title="KibanaReports" />
        </AccordionSummary>
        <AccordionDetails
          classes={{
            root: classes.detailsRoot,
          }}
        >
          <NavSubItem t={t} menuItem={menuItemMemoized} />
          <NavigationList />
        </AccordionDetails>
      </Accordion>
    </li>
  );
};

// Preserved from the original: an `access` defaultProp that's never
// destructured/read anywhere in this component (dead weight, not
// introduced here) — this component itself also has zero importers
// anywhere in the repo (confirmed via grep), so this whole file appears
// to be dead code already. The `defaultProps` assignment itself is now
// gone (React 19 dropped `defaultProps` support for function components
// entirely, so it stopped doing anything either way) rather than fixing
// it into a destructured default, since the prop it set was never used.
const translated = translate('KibanaReports')(KibanaNavigation as never);

export default withStyles(styles)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
