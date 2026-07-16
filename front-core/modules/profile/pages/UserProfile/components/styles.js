const styles = (theme) => ({
  formControl: {
    position: 'relative',
    margin: 0,
    marginBottom: 24,
    maxWidth: 428,
  },
  button: {
    marginTop: 32,
  },
  dialogContentWrappers: {
    maxWidth: 495,
  },
  dialogContentWrappersSuccess: {
    padding: '56px 81px 56px 81px',
  },
  successText: {
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: 0.5,
    textAlign: 'left',
    marginBottom: 32,
    marginTop: 16,
  },
  successTittle: {
    marginTop: 24,
    fontSize: 32,
    fontWeight: 400,
  },
  codeInputDescription: {
    marginTop: 16,
  },
  linkButton: {
    cursor: 'pointer',
    color: theme?.linksColor || theme?.palette?.primary?.main,
  },
  centeredText: {
    textAlign: 'center',
    fontSize: 24,
    color: theme?.textColorDark || theme?.palette?.text?.primary,
  },
});

export default styles;
