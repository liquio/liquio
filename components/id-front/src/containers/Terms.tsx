import React from 'react';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import { makeStyles } from '@mui/styles';
import type { Theme } from '@mui/material/styles';
import setComponentsId from 'helpers/setComponentsId';
import renderHTML from 'helpers/renderHTML';
import Layout from 'layouts/fullPage';
import Scrollbar from 'components/Scrollbar';

// `outlineColor` is a custom key of the app theme (themes/bpmn.ts), not part of MUI's `Theme`.
const useStyles = makeStyles((theme: Theme & { outlineColor?: string }) => ({
  root: {
    padding: 40,
    '&:focus-visible': {
      outline: `3px solid ${theme.outlineColor}`,
      outlineOffset: -3,
    },
    '& .list': {
      listStyleType: 'none',
      paddingLeft: 0,
    },
  },
}));

interface TermsProps {
  setId?: (elementName: string) => string;
  t: Translate;
}

const Terms = ({ setId = setComponentsId('terms'), t }: TermsProps) => {
  const classes = useStyles();

  return (
    <Scrollbar>
      <Layout setId={setId}>
        <div className={classes.root} tabIndex={0}>
          {renderHTML(t('TERMS_BODY'))}
        </div>
      </Layout>
    </Scrollbar>
  );
};

export default translate('Terms')(Terms);
