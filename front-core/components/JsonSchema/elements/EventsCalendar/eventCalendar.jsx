import React from 'react';
import PropTypes from 'prop-types';
import { useTranslate } from 'react-translate';
import moment from 'moment';
import { useDispatch } from 'react-redux';
import objectPath from 'object-path';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import { createUseStyles } from 'react-jss';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ukLocale from '@fullcalendar/core/locales/uk';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { requestRegisterKeyRecords } from 'application/actions/registry';
import { ChangeEvent } from 'components/JsonSchema';
import processList from 'services/processList';
import evaluate from 'helpers/evaluate';
import eventStyleTypes from './eventStyleTypes';
import CheckIcon from '@mui/icons-material/Check';

const styles = {
  calendarWrapper: {
    marginTop: 30,
    marginBottom: 30,
    '& .fc .fc-button-group > .fc-button': {
      backgroundColor: '#fff',
      color: '#000',
      borderColor: '#ddd',
      '&:hover': {
        backgroundColor: '#ddd',
      },
    },
  },
  popupTitle: {
    marginBottom: 5,
    paddingBottom: 0,
    '&>h2': {
      fontSize: 26,
      fontWeight: '600',
      lineHeight: '32px',
    },
  },
  popupHeadline: {
    fontSize: 16,
    lineHeight: '28px',
  },
  popupValue: {
    fontSize: 14,
    lineHeight: '24px',
    marginBottom: 15,
    color: '#6D727C',
  },
  eventLabel: {
    width: '100%',
    borderRadius: 2,
    cursor: 'pointer',
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: 400,
    lineHeight: '16px',
    letterSpacing: '0.4px',
  },
  i: {
    paddingLeft: 3,
  },
  selected: {
    backgroundColor: '#E2EEFF',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 0 0 1px #0068FF',
  },
};

const useStyles = createUseStyles(styles, { name: 'EventsCalendar' });

const EventCalendar = ({
  description,
  sample,
  required,
  error,
  keyId,
  onChange,
  value,
  fieldsToDisplay,
  filters,
  rootDocument,
  dateFormat,
  startDateField,
  endDateField,
  eventTitle,
  checkEventActive,
  additionalFilter,
  stepName,
  path,
  typography,
  readOnly,
  translates,
  limit,
}) => {
  const [events, setEvents] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [activeEvent, setActiveEvent] = React.useState({});
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = useTranslate('EventsCalendar');

  const getFilters = React.useCallback(() => {
    const filter = {};

    (filters || []).forEach(({ name, value }) => {
      filter[`data_like[${name}]`] = objectPath.get(rootDocument, value);
    });

    if (limit) filter.limit = limit;

    return filter;
  }, [filters, rootDocument]);

  const fetchData = React.useCallback(async () => {
    const eventName = 'init-calendar' + path.join('-');
    const result = await processList.hasOrSet(eventName, async () => {
      const events = await dispatch(
        requestRegisterKeyRecords(keyId, getFilters()),
      );

      const mapEvents = events
        .map(({ id, data: item }) => ({
          ...item,
          id,
          start: moment(item[startDateField], dateFormat).format(),
          end: moment(item[endDateField], dateFormat).format(),
          title: item[eventTitle],
          allDay: item.start === item.end,
          ...eventStyleTypes[item.type],
        }))
        .filter((record) =>
          evaluate(
            additionalFilter,
            record,
            value,
            rootDocument.data[stepName],
            rootDocument.data,
          ),
        );

      return mapEvents;
    });

    setEvents(result);
  }, [
    keyId,
    dispatch,
    getFilters,
    dateFormat,
    startDateField,
    endDateField,
    eventTitle,
    additionalFilter,
    rootDocument.data,
    stepName,
    value,
    path,
  ]);

  React.useEffect(() => {
    fetchData();
  }, [keyId, dispatch, fetchData]);

  const handleClose = () => setOpen(false);

  const handleEventClick = React.useCallback(
    (clickInfo) => {
      if (readOnly) return;
      setActiveEvent(clickInfo.event);
      setOpen(true);
    },
    [readOnly],
  );

  const handleChange = React.useCallback(() => {
    onChange(new ChangeEvent(activeEvent, true));
    setOpen(false);
  }, [onChange, activeEvent]);

  const handleDelete = React.useCallback(() => {
    onChange(new ChangeEvent(null, true));
    setOpen(false);
  }, [onChange]);

  const eventChosen = (event) => event.id === value?.id;

  const eventActive = React.useCallback(() => {
    const pastEvent = !moment(activeEvent.start).isAfter(
      moment().subtract(1, 'days'),
    );

    if (!checkEventActive || !activeEvent) {
      return pastEvent;
    }

    const isActive = evaluate(
      checkEventActive,
      pastEvent,
      activeEvent,
      rootDocument.data,
    );

    return isActive;
  }, [checkEventActive, activeEvent, rootDocument]);

  const renderEventContent = (eventInfo) => {
    const eventData = eventInfo.event.extendedProps;
    const chosen = eventChosen(eventInfo?.event);

    return (
      <div
        className={`${classes.eventLabel} ${chosen && classes.selected}`}
        style={!chosen ? eventStyleTypes[Number(eventData?.type)] : {}}
      >
        {chosen ? <CheckIcon style={{ width: 15, height: 15 }} /> : null}
        <b>{eventData.timeSince}</b>
        <i className={classes.i}>{eventInfo?.event?.title}</i>
      </div>
    );
  };

  const renderFields = () => {
    return fieldsToDisplay
      .filter((field) => activeEvent?.extendedProps?.[field])
      .map((field) => {
        const getText = (text) => translates[text] || t(text);

        return (
          <div key={field}>
            <Typography className={classes.popupHeadline}>
              {getText(field)}
            </Typography>
            <Typography className={classes.popupValue}>
              {activeEvent?.extendedProps?.[field]}
            </Typography>
          </div>
        );
      });
  };

  const contentHeight = React.useMemo(() => {
    const windowHeight = window.innerHeight;
    const newContentHeight = windowHeight - 300;
    return newContentHeight;
  }, []);

  return (
    <ElementContainer
      description={description}
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
      maxWidth={'100%'}
      variant={typography}
    >
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        themeSystem={'standard'}
        initialView={'dayGridMonth'}
        locales={ukLocale}
        locale={'uk'}
        editable={false}
        dayMaxEvents={true}
        selectable={true}
        selectMirror={true}
        events={events}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        contentHeight={contentHeight}
      />

      <Dialog
        open={open}
        onClose={handleClose}
        style={{ zIndex: '10000' }}
        fullWidth={true}
        maxWidth={'sm'}
        scroll={'body'}
      >
        <DialogTitle className={classes.popupTitle}>
          {activeEvent?.title}
        </DialogTitle>

        <DialogContent>
          <Typography className={classes.popupHeadline}>
            {t('Start')}
          </Typography>
          <Typography className={classes.popupValue}>
            {moment(activeEvent.start).format('DD MMMM YYYY')}
          </Typography>

          {renderFields(activeEvent.extendedProps)}

          {checkEventActive ? (
            <Typography className={classes.popupHeadline}>
              {eventActive()}
            </Typography>
          ) : null}
        </DialogContent>

        {eventActive() ? (
          <DialogActions>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleClose}
              aria-label={t('Close')}
            >
              {t('Close')}
            </Button>
            {!eventChosen(activeEvent) ? (
              <Button
                color="primary"
                variant="contained"
                onClick={handleChange}
                aria-label={t('Chose')}
              >
                {t('Chose')}
              </Button>
            ) : (
              <Button
                color="primary"
                onClick={handleDelete}
                aria-label={t('Delete')}
              >
                {t('Delete')}
              </Button>
            )}
          </DialogActions>
        ) : null}
      </Dialog>
    </ElementContainer>
  );
};

EventCalendar.propTypes = {
  description: PropTypes.string,
  sample: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  keyId: PropTypes.number,
  fieldsToDisplay: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.object,
  filters: PropTypes.array,
  rootDocument: PropTypes.object.isRequired,
  dateFormat: PropTypes.string,
  startDateField: PropTypes.string,
  checkEventActive: PropTypes.string,
  additionalFilter: PropTypes.string,
  stepName: PropTypes.string,
  endDateField: PropTypes.string,
  eventTitle: PropTypes.string,
  path: PropTypes.array,
  translates: PropTypes.object,
};

EventCalendar.defaultProps = {
  description: '',
  sample: '',
  required: false,
  error: '',
  keyId: null,
  fieldsToDisplay: ['description', 'address', 'status'],
  value: null,
  filters: null,
  dateFormat: 'DD.MM.YYYY',
  startDateField: 'date_release',
  endDateField: 'date_release',
  eventTitle: 'organizer',
  checkEventActive: null,
  additionalFilter: '() => true',
  stepName: null,
  path: [],
  translates: {},
};

export default EventCalendar;
