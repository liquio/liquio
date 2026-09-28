import React from 'react';
import MobileDetect from 'mobile-detect';

import TimeLabelRaw from 'components/Label/Time';
import DateFilterHandlerRaw from 'components/DataTable/components/DateFilterHandler';

const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DateFilterHandler = DateFilterHandlerRaw as unknown as React.ComponentType<Record<string, unknown>>;

const md = new MobileDetect(window.navigator.userAgent);
const isMobile = !!md.mobile();

interface MessageRow {
  titleMessage?: string;
  createdAt?: string;
  [key: string]: unknown;
}

const columns = (t: (key: string) => string) => [
  {
    field: 'titleMessage',
    headerName: t('MessageTitle'),
    sortable: false,
    width: isMobile ? window.innerWidth - 220 : 600,
    valueGetter: ({ row: { titleMessage } }: { row: MessageRow }) => titleMessage
  },
  {
    field: 'createdAt',
    headerName: t('createdAt'),
    sortable: false,
    width: isMobile ? 125 : 200,
    valueGetter: ({ row: { createdAt } }: { row: MessageRow }) => createdAt,
    renderCell: ({ row: { createdAt } }: { row: MessageRow }) => <TimeLabel date={createdAt} />
  }
];

interface DataTableSettingsParams {
  t: (key: string) => string;
}

export default ({ t }: DataTableSettingsParams) => ({
  checkable: false,
  controls: {
    customizeColumns: false,
    export: false
  },
  columns: columns(t),
  filterHandlers: {
    from_created_at: (props: Record<string, unknown>) => <DateFilterHandler name={t('FromShort')} {...props} />,
    to_created_at: (props: Record<string, unknown>) => <DateFilterHandler name={t('ToShort')} {...props} />
  }
});
