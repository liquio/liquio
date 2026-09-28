/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import Header from 'core/layouts/components/Header';
import ImportantMessages from 'layouts/components/ImportantMessages';

export default ({ title, open, backButton, onDrawerToggle }: any) => (
  <>
    <Header open={open} title={title} backButton={backButton} onDrawerToggle={onDrawerToggle} />
    <ImportantMessages />
  </>
);
