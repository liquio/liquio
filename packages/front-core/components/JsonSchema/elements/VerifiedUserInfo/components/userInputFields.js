import React from 'react';
import { PropTypes } from 'prop-types';
import classNames from 'classnames';
import renderHTML from 'helpers/renderHTML';
import RenderTextField from './renderTextField';
import RenderCitizenshipField from './renderCitizenshipField';
import RenderCountryField from './renderCountryField';
import RenderPlaceField from './renderPlaceField';
import RenderDateFormat from './renderDateFormat';
import RenderRadioFormat from './renderRadioFormat';
import RenderAddressFormat from './renderAddressFormat';
import RenderPassportFormat from './renderPassportFormat';
import RenderUnzrField from './renderUnzrField';

const months = (t) => [
  {
    id: '01',
    name: t('January'),
  },
  {
    id: '02',
    name: t('February'),
  },
  {
    id: '03',
    name: t('March'),
  },
  {
    id: '04',
    name: t('April'),
  },
  {
    id: '05',
    name: t('May'),
  },
  {
    id: '06',
    name: t('June'),
  },
  {
    id: '07',
    name: t('July'),
  },
  {
    id: '08',
    name: t('August'),
  },
  {
    id: '09',
    name: t('September'),
  },
  {
    id: '10',
    name: t('October'),
  },
  {
    id: '11',
    name: t('November'),
  },
  {
    id: '12',
    name: t('December'),
  },
];
const UserInputFields = ({
  t,
  errors,
  fields,
  value,
  path,
  classes,
  actions,
  stepName,
  citizenShipExists,
  handleCallIndexReader,
  readerError,
  handleUpdateField,
  readOnly,
  hiddenFields,
  notRequiredLabel,
}) => {
  const Headline = React.useCallback(() => {
    const personalDataFields = [
      'birthday',
      'gender',
      'address',
      'unzr',
      'phone',
      'email',
      'citizenship',
    ];

    return (
      <>
        {fields.some((field) => personalDataFields.includes(field)) ? (
          <div className={classes.infoBlockHeadline}>{t('personalData')}</div>
        ) : null}
      </>
    );
  }, [fields, classes, t]);

  return (
    <>
      <Headline />

      <RenderDateFormat
        name="birthday"
        fields={fields}
        errors={errors}
        value={value}
        handleUpdateField={handleUpdateField}
        months={months(t)}
        readOnly={readOnly}
      />

      <RenderCountryField
        t={t}
        name="birthdayCountry"
        fields={fields}
        errors={errors}
        value={value}
        keyId={29}
        handleUpdateField={handleUpdateField}
        readOnly={readOnly}
      />

      <RenderPlaceField
        t={t}
        name="birthdayPlace"
        fields={fields}
        errors={errors}
        value={value}
        handleUpdateField={handleUpdateField}
        classes={classes}
        readOnly={readOnly}
      />

      <RenderRadioFormat
        name={'gender'}
        fields={fields}
        errors={errors}
        value={value}
        handleUpdateField={handleUpdateField}
        readOnly={readOnly}
      />

      <RenderCitizenshipField
        t={t}
        name="citizenship"
        fields={fields}
        errors={errors}
        value={value}
        keyId={29}
        handleUpdateField={handleUpdateField}
        citizenShipExists={citizenShipExists}
        readOnly={readOnly}
      />

      <RenderAddressFormat
        name="address"
        fields={fields}
        errors={errors}
        value={value}
        handleUpdateField={handleUpdateField}
        actions={actions}
        path={path}
        stepName={stepName}
        readOnly={readOnly}
        classes={classes}
        notRequiredLabel={notRequiredLabel}
      />

      <RenderTextField
        name="index"
        fields={fields}
        errors={errors}
        value={value}
        handleUpdateField={handleUpdateField}
        sample={`<div style='display: inline-flex; background: #FFF4D7; padding: 10px 15px 10px 15px'><a href='https://index.ukrposhta.ua/find-post-index' target='_blank' style='color:#000000;'>${t(
          'indexSample',
        )}</a></div></div>`}
        maxLength={5}
        pattern={'[0-9]{5}'}
        callBack={handleCallIndexReader}
        readOnly={readOnly}
      />

      {readerError && (
        <div
          className={classNames({
            [classes.attentionWrapperBlock]: true,
            [classes.attentionWrapper]: readerError !== 'indexErrorText',
          })}
        >
          <span role="img" aria-label="shrug" className="info-block-icon">
            {readerError === 'indexErrorText' ? '🤷🏻‍♂' : '☝️'}
          </span>
          <p className={classes.attentionText}>{renderHTML(t(readerError))}</p>
        </div>
      )}

      <RenderTextField
        name="phone"
        fields={fields}
        errors={errors}
        value={value}
        handleUpdateField={handleUpdateField}
        readOnly={readOnly}
      />

      <RenderTextField
        name="email"
        fields={fields}
        errors={errors}
        value={value}
        handleUpdateField={handleUpdateField}
        readOnly={readOnly}
      />

      <RenderPassportFormat
        name="passport"
        classes={classes}
        fields={fields}
        errors={errors}
        value={value}
        handleUpdateField={handleUpdateField}
        months={months(t)}
        hiddenFields={hiddenFields}
        readOnly={readOnly}
      />

      <RenderUnzrField
        t={t}
        name="unzr"
        fields={fields}
        errors={errors}
        value={value}
        handleUpdateField={handleUpdateField}
        readOnly={readOnly}
        actions={actions}
        classes={classes}
      />
    </>
  );
};

UserInputFields.propTypes = {
  t: PropTypes.func.isRequired,
  fields: PropTypes.array.isRequired,
  value: PropTypes.object.isRequired,
  path: PropTypes.array.isRequired,
  classes: PropTypes.object.isRequired,
  errors: PropTypes.array,
  actions: PropTypes.object.isRequired,
  handleCallIndexReader: PropTypes.func.isRequired,
  handleUpdateField: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
};

UserInputFields.defaultProps = {
  errors: [],
  readOnly: false,
};

export default UserInputFields;
