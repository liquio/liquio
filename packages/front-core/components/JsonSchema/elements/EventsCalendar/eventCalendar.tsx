import React from 'react';
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
import * as registryActions from 'application/actions/registry';
import { ChangeEvent } from 'components/JsonSchema';
import processList from 'services/processList';
import evaluate from 'helpers/evaluate';
import eventStyleTypes from './eventStyleTypes';
import CheckIcon from '@mui/icons-material/Check';

type Dispatch = (action: unknown) => unknown;
const requestRegisterKeyRecords = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterKeyRecords;

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

interface CalendarEvent {
  id: string | number;
  title?: string;
  start?: string;
  extendedProps?: Record<string, unknown>;
  [key: string]: unknown;
}

interface EventCalendarProps {
  description?: string;
  sample?: string;
  required?: boolean;
  error?: string;
  keyId?: number | null;
  onChange: (event: unknown) => void;
  value?: { id?: string | number } | null;
  fieldsToDisplay?: string[];
  filters?: Array<{ name: string; value: string }> | null;
  rootDocument: { data: Record<string, unknown> };
  dateFormat?: string;
  startDateField?: string;
  endDateField?: string;
  eventTitle?: string;
  checkEventActive?: string | null;
  additionalFilter?: string;
  stepName?: string | null;
  path?: Array<string | number>;
  typography?: string;
  readOnly?: boolean;
  translates?: Record<string, string>;
  limit?: number;
}

const EventCalendar = ({
  description = '',
  sample = '',
  required = false,
  error = '',
  keyId = null,
  onChange,
  value = null,
  fieldsToDisplay = ['description', 'address', 'status'],
  filters = null,
  rootDocument,
  dateFormat = 'DD.MM.YYYY',
  startDateField = 'date_release',
  endDateField = 'date_release',
  eventTitle = 'organizer',
  checkEventActive = null,
  additionalFilter = '() => true',
  stepName = null,
  path = [],
  typography,
  readOnly,
  translates = {},
  limit,
}: EventCalendarProps) => {
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeEvent, setActiveEvent] = React.useState<CalendarEvent>({} as CalendarEvent);
  const classes = useStyles();
  const dispatch = useDispatch() as unknown as Dispatch;
  const t = useTranslate('EventsCalendar');

  const getFilters = React.useCallback(() => {
    const filter: Record<string, unknown> = {};

    (filters || []).forEach(({ name, value }) => {
      filter[`data_like[${name}]`] = objectPath.get(rootDocument, value);
    });

    if (limit) filter.limit = limit;

    return filter;
  }, [filters, rootDocument]);

  const fetchData = React.useCallback(async () => {
    const eventName = 'init-calendar' + path.join('-');
    const result = (await processList.hasOrSet(eventName, async () => {
      const events = (await dispatch(
        requestRegisterKeyRecords(keyId, getFilters()),
      )) as Array<{ id: string | number; data: Record<string, unknown> }>;

      const mapEvents = events
        .map(({ id, data: item }) => ({
          ...item,
          id,
          start: moment(item[startDateField] as string, dateFormat).format(),
          end: moment(item[endDateField] as string, dateFormat).format(),
          title: item[eventTitle],
          allDay: item.start === item.end,
          ...eventStyleTypes[item.type as string],
        }))
        .filter((record) =>
          evaluate(
            additionalFilter,
            record,
            value,
            rootDocument.data[stepName as string],
            rootDocument.data,
          ),
        );

      return mapEvents;
    })) as CalendarEvent[];

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
    (clickInfo: { event: CalendarEvent }) => {
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

  const eventChosen = (event: CalendarEvent) => event.id === value?.id;

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

    return isActive as boolean;
  }, [checkEventActive, activeEvent, rootDocument]);

  const renderEventContent = (eventInfo: { event: CalendarEvent }) => {
    const eventData = eventInfo.event.extendedProps as Record<string, unknown>;
    const chosen = eventChosen(eventInfo?.event);

    return (
      <div
        className={`${classes.eventLabel} ${chosen && classes.selected}`}
        style={!chosen ? eventStyleTypes[Number(eventData?.type)] : {}}
      >
        {chosen ? <CheckIcon style={{ width: 15, height: 15 }} /> : null}
        <b>{eventData.timeSince as React.ReactNode}</b>
        <i className={classes.i}>{eventInfo?.event?.title}</i>
      </div>
    );
  };

  const renderFields = () => {
    return fieldsToDisplay
      .filter((field) => (activeEvent?.extendedProps as Record<string, unknown>)?.[field])
      .map((field) => {
        const getText = (text: string) => translates[text] || t(text);

        return (
          <div key={field}>
            <Typography className={classes.popupHeadline}>
              {getText(field)}
            </Typography>
            <Typography className={classes.popupValue}>
              {(activeEvent?.extendedProps as Record<string, unknown>)?.[field] as React.ReactNode}
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
      variant={typography as never}
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
        events={events as never}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        eventClick={handleEventClick as never}
        eventContent={renderEventContent as never}
        contentHeight={contentHeight}
      />

      <Dialog
        open={open}
        onClose={handleClose}
        style={{ zIndex: 10000 }}
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

          {renderFields()}

          {checkEventActive ? (
            <Typography className={classes.popupHeadline}>
              {eventActive() as unknown as React.ReactNode}
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

export default EventCalendar;
