import React from 'react';
import EventCalendar from './eventCalendar';
import SlotCalendar from './slotCalendar';

const EventsCalendar = (props: Record<string, unknown>) => {
  const access = props.view === 'slot';
  const Calendar = access ? SlotCalendar : EventCalendar;

  return <Calendar {...(props as unknown as { onChange: (event: unknown) => void; rootDocument: { data: Record<string, unknown> } })} />;
};

export default EventsCalendar;
