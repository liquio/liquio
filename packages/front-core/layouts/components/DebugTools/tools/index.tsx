import React from 'react';

const AuthTools = React.lazy(() => import('./AuthTools'));
const EDSFormTest = React.lazy(() => import('./EDSFormTest'));
const EDSSignVerify = React.lazy(() => import('./EDSSignVerify'));
const Curator = React.lazy(() => import('./Curator'));
const CustomInterfaceCheck = React.lazy(() => import('./CustomInterfaceCheck'));
const HashToInternal = React.lazy(() => import('./HashToInternal'));
const VerifyHash = React.lazy(() => import('./VerifyHash'));
const ExternalReaderMocks = React.lazy(() => import('./ExternalReaderMocks'));

export default {
  ExternalReaderMocks: (template: unknown) => (
    <ExternalReaderMocks template={template as never} />
  ),
  AuthTools: <AuthTools />,
  EDSFormTest: <EDSFormTest />,
  EDSSignVerify: <EDSSignVerify />,
  Curator: <Curator />,
  CustomInterfaceCheck: <CustomInterfaceCheck />,
  HashToInternal: <HashToInternal />,
  VerifyHash: <VerifyHash />,
};
