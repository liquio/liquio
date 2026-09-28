import React from 'react';
import objectPath from 'object-path';
import classNames from 'classnames';
import moment from 'moment';
import { translate, Translate } from 'react-translate';
import { Typography, Button, Fade, Divider } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import ExpansionPaper from 'components/ExpansionPaper';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import evaluate from 'helpers/evaluate';

const styles = {
  heading: {
    fontSize: 20,
    lineHeight: '24px',
    letterSpacing: '-0.02em',
    marginBottom: 40,
  },
  subHeading: {
    fontSize: 24,
    lineHeight: '28px',
    letterSpacing: '-0.02em',
    marginBottom: 40,
  },
  expendHeading: {
    fontSize: 16,
    lineHeight: '24px',
    letterSpacing: '-0.02em',
    fontWeight: 300,
  },
  icon: {
    fontSize: 48,
    marginBottom: 25,
  },
  chipWrapper: {
    display: 'flex',
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginTop: 10,
    marginBottom: 10,
  },
  chip: {
    border: '2px solid #000000',
    boxSizing: 'border-box' as const,
    borderRadius: 50,
    marginRight: 15,
    marginBottom: 15,
    padding: 2,
    cursor: 'pointer',
    position: 'relative' as const,
    '&:hover': {
      border: '2px solid transparent',
      boxShadow: 'none',
      backgroundSize: '200% 300%',
      backgroundImage:
        'linear-gradient(217deg,rgba(255,0,0,.8),rgba(255,0,0,0) 70.71%),linear-gradient(127deg,rgba(0,0,255,.8),rgba(0,0,255,0) 70.71%),linear-gradient(336deg,rgba(0,255,0,.8),rgba(0,255,0,0) 70.71%)',
    },
  },
  chipContent: {
    borderRadius: 50,
    padding: '8px 16px',
    backgroundColor: '#fff',
    lineHeight: '24px',
    fontSize: 16,
  },
  active: {
    color: '#fff',
    cursor: 'initial',
    background: '#000',
    pointerEvents: 'none' as const,
  },
  expendButton: {
    marginBottom: 32,
    marginTop: 25,
    position: 'relative' as const,
    left: -8,
  },
  mt70: {
    marginTop: 70,
  },
  mb54: {
    marginBottom: 54,
  },
};

interface TimeSlot {
  status?: string | number;
  timeStart: string;
}

interface DaySlots {
  date: string;
  times?: TimeSlot[];
}

interface TimeValue {
  date?: string;
  day?: string;
}

interface TimeSlotsProps extends WithStyles<typeof styles> {
  t: Translate;
  description?: string | null;
  onChange: (value: TimeValue) => void;
  value?: TimeValue | null;
  sample?: string | null;
  required?: boolean;
  error?: unknown;
  width?: string | number | null;
  noMargin?: boolean;
  maxWidth?: string | number | null;
  dataSorce?: string | null;
  dateSorce?: string | null;
  rootDocument: { data: Record<string, unknown> };
  hidden?: boolean;
  checkActive?: string | false;
}

const TimeSlots = (props: TimeSlotsProps) => {
  const {
    t,
    description = null,
    onChange,
    value = null,
    sample = null,
    required,
    error = null,
    width = null,
    noMargin,
    maxWidth = null,
    dataSorce = null,
    dateSorce = null,
    rootDocument,
    classes,
    hidden,
    checkActive = false,
  } = props;

  const [opened, toggleOpened] = React.useState(!!value);

  const dateSourceValue = objectPath.get(rootDocument.data, dateSorce as string) as string;
  const dataSourceValue = objectPath.get(rootDocument.data, dataSorce as string) as DaySlots[];

  if (!dataSourceValue) return null;

  const timeList = dataSourceValue
    .map(({ date, times }) => {
      const day = moment(date).format('YYYY-MM-DD');
      const dayOfWeek = moment(date).format('dddd');
      const dayStr = moment(date).format('DD MMMM YYYY');

      const toPrint = `${dayOfWeek}, ${dayStr}`;

      const filterActive = (times || []).filter(({ status, timeStart }) => {
        const evaluated = checkActive
          ? evaluate(checkActive, `${day}T${timeStart}:00`, rootDocument.data)
          : false;
        return Number(status) || evaluated;
      });

      return {
        toPrint,
        day,
        times: filterActive,
      };
    })
    .filter(Boolean)
    .filter(({ times }) => times.length);

  const timeValuesToday = timeList.filter(
    ({ day }) =>
      moment(day, 'YYYY-MM-DD').format('DD.MM.YYYY') === dateSourceValue,
  );
  const timeValuesFuture = timeList.filter(
    ({ day }) =>
      moment(day, 'YYYY-MM-DD').format('DD.MM.YYYY') !== dateSourceValue,
  );

  const renderChip = ({ timeStart }: TimeSlot, day: string) => {
    const valueToSave = `${day}T${timeStart}:00`;

    return (
      <div
        key={valueToSave}
        onClick={() =>
          onChange({
            date: valueToSave,
            day: moment(valueToSave).format('dddd'),
          })
        }
        className={classNames({
          [classes.chip]: true,
          [classes.active]: valueToSave === value?.date,
        })}
      >
        <div
          className={classNames({
            [classes.chipContent]: true,
            [classes.active]: valueToSave === value?.date,
          })}
        >
          {timeStart}
        </div>
      </div>
    );
  };

  if (hidden) return null;

  return (
    <ElementContainer
      bottomSample={true}
      width={width}
      maxWidth={maxWidth}
      noMargin={noMargin}
      error={error}
      sample={sample as string}
      required={required}
    >
      {timeList.length ? (
        <>
          {timeValuesToday.length ? (
            <>
              <Typography className={classes.heading}>{description}</Typography>
              {timeValuesToday.map(({ toPrint, times, day }) => (
                <div key={toPrint}>
                  <div className={classes.chipWrapper}>
                    {times.map((item) => renderChip(item, day))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <Typography className={classes.icon}>{'🤷‍♂️'}</Typography>
              <Typography className={classes.heading}>
                {t('NoFreeSlots')}
              </Typography>
            </>
          )}

          {!timeValuesToday.length && timeValuesFuture.length ? (
            <>
              <Typography
                className={classNames(classes.subHeading, classes.mt70)}
              >
                {t('FreeSlots')}
              </Typography>

              <Divider />

              {timeValuesFuture.map(({ toPrint, times, day }) => (
                // `classes.mt54` doesn't exist (the defined key is `mb54`) — this has
                // always been `className={undefined}`, a no-op. Preserved as-is.
                <div key={toPrint} className={(classes as Record<string, string>).mt54}>
                  <ExpansionPaper
                    title={toPrint}
                    defaultExpanded={
                      moment(value?.date).format('YYYY-MM-DD') === day
                    }
                  >
                    <div className={classes.chipWrapper}>
                      {times.map((item) => renderChip(item, day))}
                    </div>
                  </ExpansionPaper>

                  <Divider />
                </div>
              ))}
            </>
          ) : (
            <>
              {timeValuesFuture.length ? (
                <>
                  <Button
                    className={classes.expendButton}
                    onClick={() => toggleOpened(!opened)}
                    aria-label={t('FreeSlots')}
                  >
                    <Typography className={classes.expendHeading}>
                      {t('FreeSlots')}
                    </Typography>

                    {opened ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                  </Button>

                  {opened ? (
                    <Fade in={true}>
                      <div className={classes.mb54}>
                        <Divider />

                        {timeValuesFuture.map(({ toPrint, times, day }) => (
                          <div key={toPrint}>
                            <ExpansionPaper
                              title={toPrint}
                              defaultExpanded={
                                moment(value?.date).format('YYYY-MM-DD') === day
                              }
                            >
                              <div className={classes.chipWrapper}>
                                {times.map((item) => renderChip(item, day))}
                              </div>
                            </ExpansionPaper>

                            <Divider />
                          </div>
                        ))}
                      </div>
                    </Fade>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </>
      ) : (
        <>
          <Typography className={classes.icon}>{'🤷‍♂️'}</Typography>
          <Typography className={classes.heading}>
            {t('NoFreeSlotsAll')}
          </Typography>
        </>
      )}
    </ElementContainer>
  );
};

const translated = translate('Elements')(TimeSlots);
const styled = withStyles(styles)(translated);
export default styled;
