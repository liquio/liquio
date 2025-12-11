import React from 'react';

import ShowPreview from './ShowPreview';

export default ({ item, actions, fileStorage, darkTheme, GridActionsCellItem }) => (
  <ShowPreview
    item={item}
    fileStorage={fileStorage}
    handleDownloadFile={(actions || {}).handleDownloadFile}
    darkTheme={darkTheme}
    GridActionsCellItem={GridActionsCellItem}
  />
);
