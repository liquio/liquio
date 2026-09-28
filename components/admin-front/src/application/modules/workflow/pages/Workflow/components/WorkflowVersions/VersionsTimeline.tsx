import React from 'react';
import moment from 'moment';
import { useTranslate } from 'react-translate';

import { humanDateTimeFormat } from 'helpers/humanDateFormat';

import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';

import EmptyResults from 'modules/workflow/pages/Workflow/components/WorkflowVersions/EmptyResults';
import { Card, CardHeader, Checkbox, Chip } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import CheckBoxOutlineBlankOutlinedIcon from '@mui/icons-material/CheckBoxOutlineBlankOutlined';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';

type AppTheme = Theme & {
  navigator?: { sidebarBg?: string };
  borderColor?: string;
  buttonHoverBg?: string;
};

const withStyles = makeStyles((theme: AppTheme) => ({
  card: {
    cursor: 'pointer',
    marginBottom: 20,
    backgroundColor: theme.navigator?.sidebarBg,
    boxShadow: 'none',
    border: `1px solid ${theme.borderColor}`,
    '&:hover': {
      backgroundColor: theme.buttonHoverBg,
      '& *': {
        color: theme.palette.primary.main,
      },
    },
  },
  chip: {
    '& span': {
      color: '#fff',
    },
  },
  checkbox: {
    '& svg': {
      fill: theme.palette.primary.main,
    },
  },
  chipOutlined: {
    borderColor: theme.palette.primary.main,
    '& span': {
      color: theme.palette.primary.main,
    },
  },
  chipContained: {
    marginRight: 8,
    cursor: 'inherit',
    '& span': {
      color: '#000!important',
    },
  },
}));

interface VersionItem {
  version?: string | number;
  createdAt?: string;
  isCurrentVersion?: boolean;
  meta?: { name?: string };
}

interface VersionsTimelineProps {
  data: VersionItem[];
  error?: unknown;
  loading?: boolean;
  onClick?: (version: string | number | undefined) => void;
  selection?: Array<string | number>;
  setSelection?: (selection: Array<string | number>) => void;
  // Passed by WorkflowVersionsDialog.tsx but never destructured/used here —
  // same harmless-unused-prop pattern seen elsewhere in this migration.
  onRevert?: (version: string | number | undefined) => void;
}

const VersionsTimeline = ({
  data,
  error,
  loading,
  onClick,
  selection = [],
  setSelection,
}: VersionsTimelineProps) => {
  const classes = withStyles();
  const t = useTranslate('WorkflowAdminPage');

  React.useEffect(() => {
    setSelection && setSelection([]);
  }, [data, setSelection]);

  const onCheckboxClick = React.useCallback(
    (version: string | number | undefined) => (e: React.MouseEvent) => {
      e.stopPropagation();

      if (selection.includes(version as never)) {
        return setSelection?.(selection.filter((ver) => ver !== version));
      }
      setSelection?.(selection.concat(version as never).sort().reverse());
    },
    [selection, setSelection],
  );

  if (loading) {
    return <Preloader flex={true} />;
  }

  if (error) {
    return <ErrorScreen darkTheme={true} error={error} />;
  }

  if (!data.length) {
    return <EmptyResults />;
  }

  // `root` was never declared in this file's own styles object in the original either — always undefined, harmless.
  return (
    <div className={(classes as { root?: string }).root}>
      {data.map((version, index) => (
        <Card
          key={index}
          className={classes.card}
          onClick={() => onClick && onClick(version.version)}
        >
          <CardHeader
            avatar={
              setSelection ? (
                <Checkbox
                  checked={selection.includes(version.version as never)}
                  onClick={onCheckboxClick(version.version)}
                  inputProps={{ 'aria-label': version.version as never }}
                  classes={{
                    checked: classes.checkbox,
                  }}
                  icon={<CheckBoxOutlineBlankOutlinedIcon />}
                  checkedIcon={<CheckBoxOutlinedIcon />}
                />
              ) : null
            }
            title={version.version}
            className={classes.chip}
            subheader={
              moment(version.createdAt).fromNow() +
              ' (' +
              humanDateTimeFormat(version.createdAt as string) +
              ')'
            }
            action={
              <>
                {version.isCurrentVersion ? (
                  <Chip
                    size="small"
                    color="primary"
                    label={t('Current')}
                    className={classes.chipContained}
                  />
                ) : null}
                {version?.meta?.name ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={version?.meta?.name}
                    style={{ cursor: 'inherit' }}
                    className={classes.chipOutlined}
                  />
                ) : null}
              </>
            }
          />
        </Card>
      ))}
    </div>
  );
};

export default VersionsTimeline;
