import React from 'react';
import { useSelector } from 'react-redux';
import { useTranslate } from 'react-translate';

import SigningActionLayout from 'modules/tasks/pages/Task/screens/PreviewScreen/components/SigningActionLayout';
import useSigningAction from 'modules/tasks/pages/Task/screens/PreviewScreen/components/useSigningAction';

const SigningAction = (props) => {
  const t = useTranslate('TaskPage');
  const authInfo = useSelector((state) => state.auth.info);
  const pdfDocuments = useSelector((state) => state.files.pdfDocuments);
  const fileList = useSelector((state) => state.files.list);
  const documents = useSelector((state) => state.task.documents);
  const hookProps = {
    ...props,
    t,
    authInfo,
    pdfDocuments,
    documents,
    fileList
  };
  const signingActionProps = useSigningAction(hookProps);

  return <SigningActionLayout {...hookProps} {...signingActionProps} />;
};

export default SigningAction;
