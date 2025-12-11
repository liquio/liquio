import React from 'react';
import { useTranslate } from 'react-translate';
import { Typography } from '@mui/material';

import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import storage from 'helpers/storage';
import { getConfig } from '../../../../core/helpers/configLoader';

const DebugLogs = ({ title, location, loading }) => {
  const t = useTranslate('DebugLogs');
  const ws = React.useRef();
  const { backendUrl } = getConfig();

  React.useEffect(() => {
    if (ws.current) ws.current.close();

    const token = storage.getItem('token');

    const url = backendUrl.replace('https', 'wss');

    ws.current = new WebSocket(`${url}/ws/ws?token=${token}`);

    ws.current.onerror = (event) => console.error('WebSocket error observed:', event);

    ws.current.onmessage = (message) => {
      const packet = JSON.parse(message.data);

      if (packet.info) {
        console.log(packet.info);
      }

      if (packet.error) {
        console.error(packet.error);
      }
    };

    return () => ws.current.close();
  }, []);

  return (
    <LeftSidebarLayout title={t(title)} location={location} loading={loading}>
      <Content>
        <Typography style={{ marginTop: 20 }}>{t('DebugLogsResult')}</Typography>
      </Content>
    </LeftSidebarLayout>
  );
};

const modulePage = asModulePage(DebugLogs);

export default modulePage;
