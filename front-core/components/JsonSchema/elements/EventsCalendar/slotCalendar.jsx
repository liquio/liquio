import React from 'react';
import PropTypes from 'prop-types';
import { useTranslate } from 'react-translate';
import moment from 'moment';
import { useDispatch , useSelector } from 'react-redux';
import objectPath from 'object-path';
import {
  Button,
  Typography,
  IconButton,
  Modal,
  Grid
} from '@mui/material';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { requestRegisterKeyRecords } from 'application/actions/registry';
import { ChangeEvent } from 'components/JsonSchema';
import processList from 'services/processList';
import evaluate from 'helpers/evaluate';
import eventStyleTypes from './eventStyleTypes';
import Scrollbar from 'components/Scrollbar';
import MobileDetect from 'mobile-detect';
import classNames from 'classnames';
import { ReactComponent as Point } from './assets/point.svg';
import { ReactComponent as ArrowLeft } from './assets/Arrow_left.svg';
import { ReactComponent as ArrowRight } from './assets/Arrow_right.svg';
import { ReactComponent as MarkSelect } from './assets/mark_select.svg';
import { ReactComponent as CalendarCancel } from './assets/Calendar_cancel.svg';
import { ReactComponent as BigFair } from './assets/fair_148x148.svg';
import { ReactComponent as SmallFair } from './assets/fair_80x80.svg';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { makeStyles } from '@mui/styles';
import storage from 'helpers/storage';

const useStyles = makeStyles((theme) => ({
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
  fixedDaysNavigation: {
    position: 'fixed',
    top: 149,
    right: 14,
    height: 32,
  },
  scrollBarFixed: {
    position: 'fixed',
    left: 0,
    top: 70,
    zIndex: 1291,
    width: '100%',
    paddingLeft: 16,
    paddingRight: 16,
    background: '#FFF',
    paddingTop: 16,
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
  },
  navigationWrapper: {
    display: 'flex',
    clear: 'both',
    alignItems: 'center',
    '& .ps__thumb-x': {
      backgroundColor: '#000',
      opacity: 1,
    },
    '& .ps__rail-x.ps--clicking .ps__thumb-x': {
      backgroundColor: '#000',
      opacity: 1,
    },
    '& .ps__rail-x:hover > .ps__thumb-x': {
      backgroundColor: '#000',
      opacity: 1,
    },
  },
  dayItem: {
    padding: '10px 19px',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '8px',
    background: '#F1F1F1',
    marginRight: 8,
    cursor: 'pointer',
    border: '2px solid #F1F1F1',
    textTransform: 'capitalize',
    width: 130,
    [theme.breakpoints.down('sm')]: {
      width: 'unset',
      maxWidth: 120,
      padding: '6px 8px',
    },
  },
  active: {
    border: '2px solid #0068FF',
    background: '#0068FF',
    cursor: 'default',
    color: '#fff',
    '& $headline': {
      color: '#fff',
    },
    '& $headDate': {
      color: '#fff',
    },
  },
  headline: {
    fontSize: 16,
    lineHeight: '24px',
    color: '#000000',
    fontWeight: '400',
    textAlign: 'center',
    [theme.breakpoints.down('sm')]: {
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: '-0.26px',
    },
  },
  headDate: {
    fontSize: 16,
    lineHeight: '24px',
    color: '#000000',
    fontWeight: '700',
    textAlign: 'center',
    [theme.breakpoints.down('sm')]: {
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: '-0.26px',
    },
  },
  daysNavigation: {
    position: 'absolute',
    right: 0,
    bottom: -19,
    zIndex: 1291,
    [theme.breakpoints.down('sm')]: {
      bottom: -9,
    },
  },
  scheduleContainerWrapper: {
    display: 'flex',
    paddingBottom: 15,
  },
  scheduleContainerWrapperFixed: {
    marginBottom: 15,
  },
  arrowButtonLeft: {
    height: 40,
    width: 40,
    padding: 0,
    paddingBottom: 15,
    marginLeft: -10,
    '&&:hover': {
      backgroundColor: 'transparent',
      color: '#000'
    },
  },
  arrowButton: {
    height: 40,
    width: 40,
    padding: 0,
    paddingBottom: 15,
    '&&:hover': {
      backgroundColor: 'transparent',
      color: '#000'
    },
  },
  slotItem: {
    padding: theme.spacing(2),
    margin: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#F2F7FF',
    },
    [theme.breakpoints.down('sm')]: {
      padding: '3px 8px 11px 8px'
    },
  },
  slotItemActive:{
    border: '1px solid #0068FF',
  },
  slotItemChosen: {
    border: '1px solid #0068FF',
    backgroundColor: '#E5F0FF',
    color: '#0068FF'
  },
  slotItemDisabled: {
    color: '#444444',
    cursor: 'default',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  slotHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  slotDetails: {
    marginBottom: theme.spacing(1),
  },
  activeHeadline: {
    fontWeight: '400',
    fontSize: 18,
    lineHeight: '24px',
    marginBottom: 16,
    marginTop: 24,
    marginLeft: 10,
  },
  activeHeadlineDay: {
    fontWeight: '700',
  },
  slotAddressTittleChoosen: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: '20px',
    color: '#0068FF',
  },
  slotAddressTittle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: '20px',
  },
  slotAddressDiscription:{
    marginLeft: 40,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: '18px',
    [theme.breakpoints.down('sm')]: {
      marginLeft: 40
    },
  },
  slotDetails: {
    marginLeft: 32,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: '18px',
    [theme.breakpoints.down('sm')]: {
      marginLeft: 16,
      marginRight: 16,
      lineHeight: '20px',
    },
  },
  slotDetailsText: {
    marginTop: 8,
    marginLeft: 8,
    [theme.breakpoints.down('sm')]: {
      marginTop: 0,
      marginLeft: 0,
    }
  },
  slotDetailsDiscription: {
    marginTop: 8,
  },
  slotAddressDiscriptionChosen: {
    color: '#0068FF',
    [theme.breakpoints.down('sm')]: {
      marginTop: -8,
    }
  },
  separator: {
    marginTop: 16,
    marginLeft: 8,
    borderBottom: '1px solid #E1E7F3',
    [theme.breakpoints.down('sm')]: {
      marginLeft: 0,
    },
  },
  slotActions: {
    marginTop: 16,
    marginLeft: 8,
    display: 'flex',
    [theme.breakpoints.down('sm')]: {
      marginBottom: 45,
      marginLeft: 0,
    },

  },
  primaryButton: {
    backgroundColor: '#0068FF',
    color: '#FFFFFF',
    padding: '8px 24px',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: '20px',
    fontWeight: 500,
    width: 121,
    height: 40,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    '&:hover': {
      backgroundColor: '#0056cc',
    },
    margin: theme.spacing(1),
    marginLeft: 0,
    [theme.breakpoints.down('sm')]: {
      width: 168,
    },
  },
  outlinedButton: {
    color: '#0068FF',
    border: '1px solid #0068FF',
    padding: '8px 24px',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: '20px',
    fontWeight: 500,
    width: 104,
    height: 40,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    '&:hover': {
      borderColor: '#0056cc',
      backgroundColor: '#f0f0f0',
    },
    margin: theme.spacing(1),
    [theme.breakpoints.down('sm')]: {
      width: 168,
    },
  },
  cancelButton: {
    backgroundColor: '#B01038',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 24px',
    margin: theme.spacing(1),
    marginLeft: 0,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: '20px',
    textTransform: 'none',
    height: 40,
    '&:hover': {
      backgroundColor: '#900'
    },
    [theme.breakpoints.down('sm')]: {
      width: 184,
      padding: '8px 15px 8px 12px',
    },
  },
  deleteText: {
    width: 56,
    height: 20,
    marginLeft: 'auto',
    fontFamily: 'Daikon',
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 14,
    lineHeight: '20px',
    textDecorationLine: 'underline',
    color: '#0068FF',
    cursor: 'pointer',
    [theme.breakpoints.down('sm')]: {
      marginTop: 8,
      marginLeft: 40,
    },
  },
  point: {
    minWidth: 24,
  },
  dialogPaper: {
    margin: 0,
    width: '100%',
    borderRadius: 0
  },
  dialogContent: {
    padding: theme.spacing(2),
  },
  slotHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
  },
  modal: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  paper: {
    backgroundColor: '#F0F2F4',
    width: '100%',
    maxWidth: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingTop: 16,
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '16px 16px 24px 16px',
    '& > button:nth-of-type(1)': {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      display: 'flex',
      justifyContent: 'flex-start',
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    },
    '& > button:nth-of-type(2)': {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      display: 'flex',
      justifyContent: 'flex-start',
    },
  },
  download: {
    backgroundColor: '#fff',
    color: '#000',
    boxShadow: 'none',
    '&:active': {
      backgroundColor: 'transparent',
    },
    '&:hover': {
      backgroundColor: '#fff',
    },
  },
  closeIcon: {
    marginRight: 10,
    color: '#000',
  },
  buttonIcon: {
    marginRight: 10,
  },
  notFoundContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  notFoundTittle: {
    fontWeight: '700',
    fontSize: 18,
    lineHeight: '24px',
  },
  notFoundDiscription: {
    fontWeight: '400',
    fontSize: 14,
    lineHeight: '20px',
  }
}));


const SlotCalendar = ({
  description,
  sample,
  required,
  error,
  keyId,
  onChange,
  value,
  filters,
  rootDocument,
  dateFormat,
  startDateField,
  endDateField,
  eventTitle,
  additionalFilter,
  stepName,
  path,
  typography,
  readOnly,
  limit,
  showAllDays
}) => {
  const [events, setEvents] = React.useState([]);
  const [days, setDays] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [activeEvent, setActiveEvent] = React.useState({});
  const [fixedDaysNavigation, setFixedDaysNavigation] = React.useState(false);
  const [activeDay, setActiveDay] = React.useState(() => {return moment().format('DD.MM.YYYY')});
  const [activeSlotId, setActiveSlotId] = React.useState(null);
  const [showLeftArrow, setShowLeftArrow] = React.useState(false);
  const [showRightArrow, setShowRightArrow] = React.useState(false);
  const scrollBarRef = useSelector((state) => state?.app?.calendarScrollBarRef);
  const scrollTimeoutRef = React.useRef(null);
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = useTranslate('EventsCalendar');
  const navigationRef = React.useRef(null);
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    return !!md.mobile();
  });
  const getUniqueDays = (slots) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const uniqueDates = new Set();
    slots.forEach(slot => {
      const date = slot?.start ? moment(slot.start).format('YYYY-MM-DD') : null;

      if (date) {
        const slotDate = new Date(date);
        if (showAllDays || slotDate >= today) {
          uniqueDates.add(date);
        }
      }
    });
  
    const sortedDates = Array.from(uniqueDates).sort((a, b) => new Date(a) - new Date(b));
    return sortedDates;
  }
  React.useEffect(() => {
    if (!isMobile) return;

    let togglePosition = 0;

    const toggleClass = () => {
      try {
        if (navigationRef?.current) {
          const rect = navigationRef.current.getBoundingClientRect();

          if (rect.top <= 16 && !togglePosition) {
            togglePosition = window.scrollY;
          }

          if (!togglePosition) return;

          setFixedDaysNavigation(window.scrollY > togglePosition);
        }
      } catch (e) {
        console.error('toggleClass', e);
      }
    };

    window.addEventListener('scroll', toggleClass);

    return () => {
      window.removeEventListener('scroll', toggleClass);
    };
  }, [navigationRef, classes, isMobile]);

  const checkArrowVisibility = () => {
    const container = scrollBarRef?._container;
    if (container) {
      const isOverflowing = container.scrollWidth > container.clientWidth;
      const isScrolledToLeft = container.scrollLeft > 0;
      const isScrolledToRight = container.scrollLeft < (container.scrollWidth - container.clientWidth - 1);
      setShowLeftArrow(isScrolledToLeft);
      setShowRightArrow(isOverflowing && isScrolledToRight);
    }
  };

  React.useEffect(() => {
    const container = scrollBarRef?.current?._container || scrollBarRef?._container;
  
    const onScroll = () => {
      clearTimeout(scrollTimeoutRef.current);

      scrollTimeoutRef.current = setTimeout(checkArrowVisibility, 20);
    };

    if (container) {
      container.addEventListener('scroll', onScroll);
    }
  
    return () => {
      if (container) {
        container.removeEventListener('scroll', onScroll);
      }
      clearTimeout(scrollTimeoutRef.current);
    };
  }, [scrollBarRef]);
  
  

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
    const generateDays = getUniqueDays(result);
    setDays(generateDays);
    checkArrowVisibility()
    focusActiveItem()
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

  const handleSelectSlot = (slot) => {
    if (readOnly) return;
    setActiveSlotId(activeSlotId === slot.id ? null : slot.id);
    const eventData = {
      id: slot.id,
      start: slot.start,
      end: slot.end,
      title: slot.title,
      allDay: slot.allDay,
      backgroundColor: slot.backgroundColor,
      borderColor: slot.borderColor,
      textColor: slot.textColor,
      extendedProps: { ...slot }
    };
    setActiveEvent(eventData);
  };

  const handleChange = React.useCallback(() => {
    setOpen(false);
    setActiveSlotId(null);
    onChange(new ChangeEvent(activeEvent, true));
  }, [onChange, activeEvent]);

  const handleDelete = React.useCallback(() => {
    setOpen(false);
    setActiveSlotId(null);
    onChange(new ChangeEvent(null, true));
  }, [onChange]);

  const prepareSlots = React.useCallback(
    (active) => {
      const closestDay =
        days.find((d) => moment(d).isSameOrAfter(moment(active), 'day')) ||
        active;

      const day = moment(closestDay).format('DD.MM.YYYY');

      setActiveDay(day);

      storage.setItem('activeDay', day);
    },
    [
      days,
    ],
  );

  const focusActiveItem = React.useCallback(() => {
    if (!scrollBarRef?._container) return;

    const activeDayItem = scrollBarRef._container.querySelector(
      `.${classes.active}`,
    );

    if (!activeDayItem) return;

    const itemsBeforeActive = Array.from(
      scrollBarRef._container.querySelectorAll(`.${classes.dayItem}`),
    ).filter((item) => {
      if (!item) return false;
      return (
        item.getBoundingClientRect().left <
        activeDayItem.getBoundingClientRect().left
      );
    });

    const itemWidth = activeDayItem.getBoundingClientRect().width;

    const scrollPosition = itemsBeforeActive.length * itemWidth - itemWidth;

    scrollBarRef._container.scrollLeft = scrollPosition;
  }, [classes, scrollBarRef]);

  const ScrollBarWrapper = React.useCallback(
    ({ children }) => (
      <Scrollbar
        className={classNames({
          [classes.scheduleContainerWrapper]: true,
          [classes.scheduleContainerWrapperFixed]: fixedDaysNavigation,
        })}
        saveRef={'calendarScrollBarRef'}
      >
        {children}
      </Scrollbar>
    ),
    [classes, fixedDaysNavigation],
  );

  React.useEffect(() => {
    if (days.length && !activeDay) {
      prepareSlots(
        storage.getItem('activeDay')
          ? moment(storage.getItem('activeDay'), 'DD.MM.YYYY').format(
              'YYYY-MM-DD',
            )
          : moment().format('YYYY-MM-DD'),
      );
    }
  }, []);

  const handleMouseDown = (direction) => {
    const step = direction === 'right' ? 50 : -50;
    const doScroll = () => {
      if (scrollBarRef) {
        const container = scrollBarRef._container;
        if (container) {
          container.scrollLeft += step;
          checkArrowVisibility();
        }
      }
    };
  
    doScroll();
  };

  const activeDayMoment = moment(activeDay, 'DD.MM.YYYY');
  const filteredSlots = events.filter(slot =>
    moment(slot.start).isSame(activeDayMoment, 'day')
  );
  const SlotModal = ({ slot, itemChosen }) => {
    const classes = useStyles();
  
    return (
      <Modal
        open={open && slot.id === activeSlotId}
        onClose={() => setOpen(false)}
        className={classes.modal}
      >
        <div className={classes.paper}>
          <Grid container justifyContent="flex-end">
            <IconButton
              className={classes.closeIcon}
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </IconButton>
          </Grid>
          <div className={classes.slotHeader}>
              <>
                <Point className={classes.point}/>
                <Typography variant="body1" className={classes.slotAddressTittle}>{slot.address}</Typography>
              </>
          </div>
          <div className={classes.slotDetails}>
            <Typography variant="body1" className={classes.slotDetailsDiscription}>{t('fairDate')}</Typography>
            <Typography variant="body1" className={classes.slotDetailsText}>{moment(slot.date_release).format('DD MMMM YYYY')}</Typography>
            <Typography variant="body1" className={classes.slotDetailsDiscription}>{t('organizerName')}</Typography>
            <Typography variant="body1" className={classes.slotDetailsText}>{slot.organizer}</Typography>
            <Typography variant="body1" className={classes.slotDetailsDiscription}>{t('organizerPhone')}</Typography>
            <Typography variant="body1" className={classes.slotDetailsText}>{slot.orgnzr_phone_number}</Typography>
            <div className={classes.separator}></div> 
            <div className={classes.slotActions}>
              {itemChosen ? (
              <Button variant="contained" className={classes.cancelButton} startIcon={<CalendarCancel />} onClick={handleDelete}>{t('cancelChoiceBtn')}</Button>
              ) : (
              <Button variant="contained" className={classes.primaryButton} startIcon={<CheckIcon />} onClick={handleChange}>{t('choiceBtn')}</Button>
              )}
              <Button variant="outlined" className={classes.outlinedButton} onClick={() => setOpen(false)}>{t('Close')}</Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  const handleOpenModal = (slot) => {
    if (isMobile) {
      handleSelectSlot(slot);
      setOpen(slot.id);
    } else {
      handleSelectSlot(slot);
    }
  };

  const SlotItem = ({ slot, isActive }) => {
    const classes = useStyles();
    const itemChosen = value?.id === slot?.id;
    const handleClick = () => {
      handleOpenModal(slot);
    };
  
    return (
      <div 
        className={classNames({
          [classes.slotItem]: true,
          [classes.slotItemDisabled]: value?.id && !itemChosen,
          [classes.slotItemActive]: !isMobile && isActive,
          [classes.slotItemChosen]: itemChosen && !isActive,
        })}
        onClick={(itemChosen || value?.id) && !isMobile ? null : handleClick}
      >
        <div className={classes.slotHeader}>
          {itemChosen ? (
            <>
              <MarkSelect className={classes.point}/> 
              <Typography variant="body1" className={classes.slotAddressTittleChoosen}>{slot.address}</Typography>
              {!isMobile ? (<Typography variant="body1" className={classes.deleteText} onClick={handleClick}>{t('changeSlotBtn')}</Typography>) : null}
            </>
          ) : (
            <>
              <Point className={classes.point}/>
              <Typography variant="body1" className={classes.slotAddressTittle}>{slot.address}</Typography>
            </>
          )}
        </div>
      {isActive && !isMobile ? (
        <>
          <div className={classes.slotDetails}>
            <Typography variant="body1" className={classes.slotDetailsText}>{t('fairDate')} {moment(slot.date_release).format('DD MMMM YYYY')}</Typography>
            <Typography variant="body1" className={classes.slotDetailsText}>{t('organizerName')} {slot.organizer}</Typography>
            <Typography variant="body1" className={classes.slotDetailsText}>{t('organizerPhone')} {slot.orgnzr_phone_number}</Typography>
            <div className={classes.separator}></div> 
            <div className={classes.slotActions}>
              {itemChosen ? (
              <Button variant="contained" className={classes.cancelButton} startIcon={<CalendarCancel />} onClick={handleDelete}>{t('cancelChoiceBtn')}</Button>
              ) : (
              <Button variant="contained" className={classes.primaryButton} startIcon={<CheckIcon />} onClick={handleChange}>{t('choiceBtn')}</Button>
              )}
              <Button variant="outlined" className={classes.outlinedButton} onClick={handleClick}>{t('Close')}</Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <Typography variant="body1" className={classNames({[classes.slotAddressDiscription]: true, [classes.slotAddressDiscriptionChosen]: itemChosen})} >{t('fairAddress')}</Typography>
          {isMobile && itemChosen ? (<Typography variant="body1" className={classes.deleteText} onClick={handleClick}>{t('changeSlotBtn')}</Typography>) : null}
        </>
      )}
      <SlotModal itemChosen={itemChosen} handleClose={handleClose} slot={slot} isActive={isActive} />
      </div>
    );
  };

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
        <>
          <div
            ref={scrollBarRef}
            className={classNames({
              [classes.navigationWrapper]: true,
              [classes.scrollBarFixed]: fixedDaysNavigation,
            })}
          >
            {showLeftArrow && (
              <IconButton
                onMouseDown={() => handleMouseDown('left')}
                className={classes.arrowButtonLeft}
              >
                <ArrowLeft />
              </IconButton>
            )}
            <ScrollBarWrapper>
              {days.map((day) => {
                const currentDay = moment(day);
                return (
                  <div
                    key={crypto.randomUUID()}
                    className={classNames({
                      [classes.dayItem]: true,
                      [classes.active]: activeDay === currentDay.format('DD.MM.YYYY'),
                    })}
                    onClick={() => prepareSlots(day)}
                  >
                    <div className={classes.headDate}>{currentDay.format('DD.MM.YYYY')}</div>
                    <div className={classes.headline}>{currentDay.format('dddd')}</div>
                  </div>
                );
              })}
            </ScrollBarWrapper>
            {showRightArrow && (
              <IconButton
                onMouseDown={() => handleMouseDown('right')}
                className={classes.arrowButton}
              >
                <ArrowRight />
              </IconButton>
            )}
          </div>

          <div className={classes.activeHeadline}>
            <span className={classes.activeHeadlineDay}>{moment(activeDay, 'DD.MM.YYYY').format('D MMMM YYYY р.,')}</span> {moment(activeDay, 'DD.MM.YYYY').format('dddd')}
          </div>
        </>
        <div className={classes.slotsContainer}>
          {filteredSlots.length ? filteredSlots.map((slot) => (
            <SlotItem
              key={slot.id}
              slot={slot}
              isActive={slot.id === activeSlotId}
            />
          )) : (
            <div className={classes.notFoundContainer}>
              {isMobile ? <SmallFair /> : <BigFair />}
              <Typography variant="body1" className={classes.notFoundTittle}>{t('notFoundTittle')}</Typography>
              <Typography variant="body1" className={classes.notFoundDiscription}>{t('notFoundDiscription')}</Typography>
            </div>
          )}
        </div>
    </ElementContainer>
  );
};

SlotCalendar.propTypes = {
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
  showAllDays: PropTypes.bool,
};

SlotCalendar.defaultProps = {
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
  showAllDays: false,
};

export default SlotCalendar;
