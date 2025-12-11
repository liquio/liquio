import React from 'react';
import PropTypes from 'prop-types';
import { FormControl, TextField, Snackbar, Button } from '@mui/material';
import CustomDatePicker from 'components/CustomInput/CustomDatePicker';
import getFields from 'modules/profile/pages/UserProfile/components/fields';
import PhoneInput from './PhoneInput';
import EmailInput from './EmailInput';

const fields = getFields({
  EmailInput,
  PhoneInput,
});

const RenderControl =
  ({
    t,
    classes,
    handleChangePhone,
    handleChangeDate,
    handleChange,
    values,
    handleSave,
  }) =>
  ({
    key,
    name,
    Component,
    changed,
    label,
    placeholder,
    maxDate,
    disabled,
    helperText,
    maxLength,
  }) => {
    return (
      <FormControl
        variant="standard"
        fullWidth={true}
        className={classes.formControl}
        margin="dense"
        key={key}
      >
        {Component && changed !== 'date' ? (
          <Component
            value={values[key]}
            onChange={
              changed === 'phone' && !disabled
                ? handleChangePhone
                : handleChange
            }
            handleSave={handleSave}
          />
        ) : null}
        {changed === 'date' ? (
          <CustomDatePicker
            label={t(label)}
            margin="dense"
            incomingFormat="DD/MM/YYYY"
            onChange={
              changed === 'date' && !disabled
                ? handleChangeDate(key)
                : handleChange
            }
            date={values[key] || ''}
            minDate="01/01/1900"
            maxDate={maxDate}
          />
        ) : null}
        {!changed ? (
          <TextField
            variant="standard"
            disabled={disabled}
            InputLabelProps={placeholder ? { shrink: true } : {}}
            placeholder={placeholder ? t(placeholder) : ''}
            name={name || key}
            label={t(label)}
            value={values[key] || ''}
            onChange={disabled ? undefined : handleChange}
            margin="dense"
            inputProps={{ maxLength }}
            helperText={helperText ? t(helperText) : ''}
          />
        ) : null}
      </FormControl>
    );
  };

const ProfileLayout = ({
  t,
  classes,
  values,
  values: { isLegal },
  saving,
  showNotification,
  handleChange,
  handleChangePhone,
  handleChangeDate,
  handleSave,
  checkboxChange,
}) => {
  const inputs = isLegal ? fields.isLegal : fields.notIsLegal;
  return (
    <>
      {inputs.map(
        RenderControl({
          t,
          classes,
          handleChangePhone,
          handleChangeDate,
          handleChange,
          checkboxChange,
          values,
          handleSave,
        }),
      )}
      <Button
        variant="contained"
        color="primary"
        disabled={saving}
        onClick={handleSave}
        className={classes.button}
      >
        {t('SaveButton')}
      </Button>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={showNotification}
        message={<span>{t('ProfileSaved')}</span>}
      />
    </>
  );
};

ProfileLayout.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  saving: PropTypes.bool.isRequired,

  showNotification: PropTypes.bool,
  handleChangePhone: PropTypes.func.isRequired,
  handleChangeDate: PropTypes.func.isRequired,
  handleSave: PropTypes.func.isRequired,
  handleChange: PropTypes.func.isRequired,
  checkboxChange: PropTypes.func.isRequired,
};

ProfileLayout.defaultProps = {
  showNotification: false,
};

export default ProfileLayout;
