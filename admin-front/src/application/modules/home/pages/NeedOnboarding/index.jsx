import React from 'react';

import ServiceMessage from 'components/Auth/ServiceMessage';

const NeedOnboarding = () => (
  <ServiceMessage canSwitchUser={true} error={new Error('NeedOnboardingFirst')} />
);

export default NeedOnboarding;
