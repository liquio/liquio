import React from 'react';
import moment from 'moment';
import { useTranslate } from 'react-translate';

import { humanDateTimeFormat } from 'helpers/humanDateFormat';

import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';

import EmptyResults from 'modules/workflow/pages/Workflow/components/WorkflowVersions/EmptyResults';
import { Card, CardHeader, Checkbox, Chip } from '@mui/material';
import { makeStyles } from '@mui/styles';
import CheckBoxOutlineBlankOutlinedIcon from '@mui/icons-material/CheckBoxOutlineBlankOutlined';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';

const withStyles = makeStyles((theme) => ({
  card: {
    cursor: 'pointer',
    marginBottom: 20,
    backgroundColor: theme.navigator.sidebarBg,
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

const VersionsTimeline = ({
  data,
  error,
  loading,
  onClick,
  selection = [],
  setSelection,
}) => {
  const classes = withStyles();
  const t = useTranslate('WorkflowAdminPage');

  React.useEffect(() => {
    setSelection && setSelection([]);
  }, [data, setSelection]);

  const onCheckboxClick = React.useCallback(
    (version) => (e) => {
      e.stopPropagation();

      if (selection.includes(version)) {
        return setSelection(selection.filter((ver) => ver !== version));
      }
      setSelection(selection.concat(version).sort().reverse());
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

  return (
    <div className={classes.root}>
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
                  checked={selection.includes(version.version)}
                  onClick={onCheckboxClick(version.version)}
                  inputProps={{ 'aria-label': version.version }}
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
              humanDateTimeFormat(version.createdAt) +
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
