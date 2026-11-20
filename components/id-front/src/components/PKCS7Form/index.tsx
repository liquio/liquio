import React from 'react';
import type { ComponentType } from 'react';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';

import setComponentsId from 'helpers/setComponentsId';
import PKCS7SignForm from './PKCS7SignForm';
import type { PKCS7SignFormProps } from './PKCS7SignForm';

interface PKCS7FormProps extends Omit<PKCS7SignFormProps, 'classes' | 'setId'> {
  t: Translate;
  // Nothing wraps this component in `withStyles`, so `classes` is only ever passed by a caller (none does).
  classes?: PKCS7SignFormProps['classes'];
  setId?: (elementName: string) => string;
}

const PKCS7Form = ({ t, classes, setId = setComponentsId('sign-form-pkcs7'), ...rest }: PKCS7FormProps) => {
  // `translate()` types its result without `t`, but this passes `t` explicitly (the HOC then sets its own,
  // for the same namespace). The cast restores the props the component really takes; no runtime change.
  const SignForm = PKCS7SignForm as ComponentType<PKCS7SignFormProps>;

  return (
    <>
      <SignForm {...rest} t={t} classes={classes} setId={(elementName) => setId(`pkcs7-${elementName}`)} />
    </>
  );
};

export default translate('SignForm')(PKCS7Form);
