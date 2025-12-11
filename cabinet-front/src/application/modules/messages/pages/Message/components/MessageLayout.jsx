import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import humanDateFormat from 'helpers/humanDateFormat';
import ProgressLine from 'components/Preloader/ProgressLine';
import Preloader from 'components/Preloader';
import { ReactComponent as CalendarIcon } from './../assets/icon.svg';

const SmartMessage = React.lazy(() =>
  import('modules/messages/pages/Message/components/SmartMessage')
);
const Attachments = React.lazy(() =>
  import('modules/messages/pages/Message/components/Attachments')
);

const styles = (theme) => ({
  wrapper: {
    marginTop: 12,
    borderRadius: theme?.MessageLayout?.borderRadius || 8,
    borderTop: '1px solid #E1E7F3',
    borderRight: '1px solid #E1E7F3',
    borderLeft: '1px solid #E1E7F3',
    background: '#FFF',
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
    position: 'relative',
    right: 7
  },
  label: {
    fontWeight: theme?.MessageLayout?.fontWeight || 500,
    fontSize: '14px',
    fontStyle: 'normal',
    lineHeight: '21px',
    letterSpacing: '0.1px',
    padding: 0,
    paddingLeft: 14
  },
  paper: {
    display: 'flex',
    padding: '24px',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '16px',
    border: '1px solid #E1E7F3',
    background: '#FFF',
    borderBottomLeftRadius: theme?.MessageLayout?.borderRadius || 8,
    borderBottomRightRadius: theme?.MessageLayout?.borderRadius || 8,
    '& a': {
      color: theme?.colorLink
    }
  }
});

const MessageLayout = ({ t, classes, location, title, loading, message }) => (
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
                time: humanDateFormat(message.createdAt)
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
            <SmartMessage template={message.fullMessage} message={message} />
            <Attachments attachments={message?.meta?.attachments} />
          </div>
        </Suspense>
      ) : (
        <Preloader />
      )}
    </Content>
  </LeftSidebarLayout>
);

MessageLayout.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  message: PropTypes.object
};

MessageLayout.defaultProps = {
  loading: false,
  message: null
};

export default withStyles(styles)(MessageLayout);
