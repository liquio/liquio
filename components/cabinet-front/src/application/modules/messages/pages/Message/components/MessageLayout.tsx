import React, { Suspense } from 'react';
import { Chip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import LeftSidebarLayoutRaw, { Content } from 'layouts/LeftSidebar';
import humanDateFormat from 'helpers/humanDateFormat';
import ProgressLineRaw from 'components/Preloader/ProgressLine';
import Preloader from 'components/Preloader';
import { ReactComponent as CalendarIcon } from './../assets/icon.svg';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ProgressLine = ProgressLineRaw as unknown as React.ComponentType<Record<string, unknown>>;

const SmartMessage = React.lazy(() =>
  import('modules/messages/pages/Message/components/SmartMessage')
);
const Attachments = React.lazy(() =>
  import('modules/messages/pages/Message/components/Attachments')
);

type AppTheme = Theme & {
  MessageLayout?: { borderRadius?: number; fontWeight?: number };
  borderColor?: string;
  colorLink?: string;
};

const styles = (theme: AppTheme) => ({
  wrapper: {
    marginTop: 12,
    borderRadius: theme?.MessageLayout?.borderRadius || 8,
    borderTop: `1px solid ${theme?.borderColor || theme?.palette?.divider}`,
    borderRight: `1px solid ${theme?.borderColor || theme?.palette?.divider}`,
    borderLeft: `1px solid ${theme?.borderColor || theme?.palette?.divider}`,
    background: theme?.palette?.background?.paper,
    display: 'flex',
    padding: '14px 24px',
    alignItems: 'center',
    gap: '10px',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0
  },
  chip: {
    border: 'none'
  },
  icon: {
    position: 'relative' as const,
    right: 7
  },
  label: {
    fontWeight: theme?.MessageLayout?.fontWeight || 500,
    fontSize: '14px',
    fontStyle: 'normal' as const,
    lineHeight: '21px',
    letterSpacing: '0.1px',
    padding: 0,
    paddingLeft: 14
  },
  paper: {
    display: 'flex',
    padding: '24px',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '16px',
    border: `1px solid ${theme?.borderColor || theme?.palette?.divider}`,
    background: theme?.palette?.background?.paper,
    borderBottomLeftRadius: theme?.MessageLayout?.borderRadius || 8,
    borderBottomRightRadius: theme?.MessageLayout?.borderRadius || 8,
    '& a': {
      color: theme?.colorLink
    }
  }
});

interface MessageLike {
  createdAt?: string;
  fullMessage?: string;
  meta?: { attachments?: unknown[] };
}

interface MessageLayoutProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  location: unknown;
  title: string;
  loading?: boolean;
  message?: MessageLike | null;
}

const MessageLayout = ({ t, classes, location, title, loading = false, message = null }: MessageLayoutProps) => (
  <LeftSidebarLayout
    location={location}
    title={title}
    loading={loading}
    breadcrumbs={[
      {
        label: t('Messages'),
        link: '/messages'
      },
      {
        label: title
      }
    ]}
  >
    <Content maxWidth={820}>
      {message ? (
        <Suspense fallback={<ProgressLine loading={true} />}>
          <div className={classes.wrapper}>
            <Chip
              icon={<CalendarIcon />}
              label={t('CreatedAt', {
                time: humanDateFormat(message.createdAt as string)
              })}
              className={classes.chip}
              classes={{
                icon: classes.icon,
                label: classes.label
              }}
              variant="outlined"
            />
          </div>
          <div className={classes.paper}>
            <SmartMessage template={message.fullMessage as string} message={message as unknown as Record<string, unknown>} />
            <Attachments attachments={message?.meta?.attachments as never} />
          </div>
        </Suspense>
      ) : (
        <Preloader />
      )}
    </Content>
  </LeftSidebarLayout>
);

export default withStyles(styles)(MessageLayout as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
