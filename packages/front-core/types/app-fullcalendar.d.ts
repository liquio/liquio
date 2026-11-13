// Fallback ambient declarations for apps (e.g. admin-front) that don't have
// `@fullcalendar/*` installed at all — `EventsCalendar` is a cabinet-front-only
// feature (booking/appointment slots), but its front-core file is still globbed
// by every app's tsconfig. Wherever an app actually has these packages
// installed (cabinet-front), the real shipped types take priority over these
// declarations; this only fills in the gap where the package is entirely absent.
declare module '@fullcalendar/react' {
  import { ComponentType } from 'react';

  interface FullCalendarProps {
    plugins?: unknown[];
    themeSystem?: string;
    initialView?: string;
    locales?: unknown;
    locale?: string;
    editable?: boolean;
    dayMaxEvents?: boolean | number;
    selectable?: boolean;
    selectMirror?: boolean;
    events?: unknown[];
    headerToolbar?: { left?: string; center?: string; right?: string } | false;
    eventClick?: (info: { event: Record<string, unknown> }) => void;
    eventContent?: (info: { event: Record<string, unknown>; col?: number; cell?: unknown }) => unknown;
    contentHeight?: number | string;
    [key: string]: unknown;
  }

  const FullCalendar: ComponentType<FullCalendarProps>;
  export default FullCalendar;
}

declare module '@fullcalendar/daygrid' {
  const plugin: unknown;
  export default plugin;
}

declare module '@fullcalendar/timegrid' {
  const plugin: unknown;
  export default plugin;
}

declare module '@fullcalendar/interaction' {
  const plugin: unknown;
  export default plugin;
}

declare module '@fullcalendar/core/locales/uk' {
  const locale: unknown;
  export default locale;
}
