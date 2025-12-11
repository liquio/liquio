import React from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useTranslate } from 'react-translate';

import elasticIcon from 'modules/workflow/pages/Journal/assets/elastic.svg';
import { getConfig } from '../../../../../../core/helpers/configLoader';

const useStyles = makeStyles({
  icon: {
    width: 24
  }
});

const ElasticMenu = ({ log }) => {
  const config = getConfig();

  const templateList = [
    {
      name: 'ByTraceId',
      getUrl: (log) => {
        const traceId = log?.details?.data?.traceId;

        if (!traceId) {
          return null;
        }

        return `${config?.elastic?.url}#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-1M,to:now))&_a=(columns:!(message),filters:!(),index:'${config?.elastic?.patternId}',interval:auto,query:(language:kuery,query:'parsed_traceId.keyword%20:%20%22${traceId}%22'),sort:!())`;
      }
    },
    {
      name: 'ByLogId',
      getUrl: (log) => {
        const logId = log?.details?.data?.logId;

        if (!logId) {
          return null;
        }

        return `${config?.elastic?.url}#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-1M,to:now))&_a=(columns:!(message),filters:!(),index:'${config?.elastic?.patternId}',interval:auto,query:(language:kuery,query:'parsed_logId.keyword%20:%20%22${logId}%22'),sort:!())`;
      }
    },
    {
      name: 'ByUserId',
      getUrl: (log) => {
        const userId = log?.details?.data?.queueMessage?.userId;

        if (!userId) {
          return null;
        }

        return `${config?.elastic?.url}#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(message),filters:!(),index:'${config?.elastic?.patternId}',interval:auto,query:(language:kuery,query:'parsed_full_traceMeta.userId.keyword%20:%20%22${userId}%22'),sort:!())`;
      }
    }
  ];

  const t = useTranslate('ProcessesListPage');
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState(false);

  const handleClose = () => setAnchorEl();

  const templates = React.useMemo(
    () =>
      templateList
        .map((template) => ({
          ...template,
          url: template.getUrl(log)
        }))
        .filter(({ url }) => url),
    [log]
  );

  if (!config?.elastic?.url || !templates.length) {
    return null;
  }

  return (
    <>
      <IconButton onClick={({ currentTarget }) => setAnchorEl(currentTarget)} size="large">
        <img className={classes.icon} alt="elastic" src={elasticIcon} />
      </IconButton>
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {templates.map((template, index) => (
          <MenuItem
            key={index}
            onClick={handleClose}
            component="a"
            href={template.url}
            target="_blank"
          >
            {t(template.name)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ElasticMenu;
