import React from 'react';

import { BPMNViewer } from 'components/BpmnSchema';
import { Divider, Typography } from '@mui/material';

import { makeStyles } from '@mui/styles';

const useStyles = makeStyles({
  root: {
    background: '#fafafa',
    display: 'flex',
    height: '100%',
    flexDirection: 'column' as const,
    alignItems: 'stretch',
    alignContent: 'stretch',
  },
  container: {
    flex: 1,
    position: 'relative' as const,
  },
  label: {
    position: 'absolute' as const,
  },
});

interface SchemaPreviewProps {
  data?: string;
  compare?: string;
  version?: string | number;
  compareVersion?: string | number;
}

const SchemaPreview = ({ data, compare, version, compareVersion }: SchemaPreviewProps) => {
  const classes = useStyles();
  const [viewbox, setViewbox] = React.useState(null);

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        {compare ? (
          <Typography className={classes.label}>{version}</Typography>
        ) : null}
        <BPMNViewer schema={data} viewbox={viewbox} viewboxChange={setViewbox}/>
      </div>
      {compare ? (
        <>
          <Divider />
          <div className={classes.container}>
            <Typography className={classes.label}>{compareVersion}</Typography>
            <BPMNViewer schema={compare} viewbox={viewbox} viewboxChange={setViewbox}/>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default SchemaPreview;
