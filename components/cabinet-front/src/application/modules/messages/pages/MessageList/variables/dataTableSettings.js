import React from 'react';
import MobileDetect from 'mobile-detect';

import TimeLabel from 'components/Label/Time';
import DateFilterHandler from 'components/DataTable/components/DateFilterHandler';

const md = new MobileDetect(window.navigator.userAgent);
const isMobile = !!md.mobile();

const columns = (t) => [
  {
    field: 'titleMessage',
    headerName: t('MessageTitle'),
    sortable: false,
    width: isMobile ? window.innerWidth - 220 : 600,
    valueGetter: ({ row: { titleMessage } }) => titleMessage
  },
  {
    field: 'createdAt',
    headerName: t('createdAt'),
    sortable: false,
    width: isMobile ? 125 : 200,
    valueGetter: ({ row: { createdAt } }) => createdAt,
    renderCell: ({ row: { createdAt } }) => <TimeLabel date={createdAt} />
  }
];

export default ({ t }) => ({
  checkable: false,
  controls: {
    customizeColumns: false,
    export: false
  },
  columns: columns(t),
  filterHandlers: {
    from_created_at: (props) => <DateFilterHandler name={t('FromShort')} {...props} />,
    to_created_at: (props) => <DateFilterHandler name={t('ToShort')} {...props} />
  }
});
