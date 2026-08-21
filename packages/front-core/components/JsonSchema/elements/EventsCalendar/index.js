import React from 'react';
import EventCalendar from './eventCalendar';
import SlotCalendar from './slotCalendar';

const EventsCalendar = (props) => {
  const access = props.view === 'slot';
  const Calendar = access ? SlotCalendar : EventCalendar;

  return <Calendar {...props} />;
};

export default EventsCalendar;
