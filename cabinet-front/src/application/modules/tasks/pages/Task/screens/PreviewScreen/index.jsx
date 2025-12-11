import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { history } from 'store';
import { useTranslate } from 'react-translate';

import checkAccess from 'helpers/checkAccess';
import PreviewScreenLayout from 'modules/tasks/pages/Task/screens/PreviewScreen/components/PreviewScreenLayout';
import propsToData from 'modules/tasks/pages/Task/helpers/propsToData';
import pdfRequired from 'modules/tasks/pages/Task/helpers/pdfRequired';
import signRequired from 'modules/tasks/pages/Task/helpers/signRequired';

const PreviewScreen = (props) => {
  const {
    importActions,
    handleFinish,
    getRootPath,
    setTaskScreen,
    screens,
    actions,
    backToEdit,
    busy,
    setBusy,
    userUnits,
    userInfo,
    documents,
    fileStorage
  } = props;

  const t = useTranslate('TaskPage');
  const [storeEventError, setStoreEventError] = React.useState({});
  const { task, template, steps, finished } = propsToData(props);
  const { signerUsers, performerUnits } = task;
  const showSignerList = signRequired(template, task) && signerUsers && !!signerUsers.length;
  const isUserUnitHead = checkAccess({ isUserUnitHead: performerUnits }, userInfo, userUnits);
  const { attachments } = documents[task && task.documentId] || {};

  React.useEffect(() => {
    const warningText = `${t('LostPageConfirmation')} ${t('LostPageConfirmationText')}`;
    const triggerEvents = !finished && !signerUsers.includes(userInfo.userId);
    let shown = false;

    const onUnload = (event) => {
      event.preventDefault();
      event.returnValue = warningText;
      return warningText;
    };

    const onBlur = () => {
      if (document.hidden && !shown) {
        alert(warningText);
        shown = true;
      }
    };

    const unbindEvents = () => {
      window.removeEventListener('beforeunload', onUnload, true);
      window.removeEventListener('visibilitychange', onBlur, true);
    };

    const bindEvents = () => {
      unbindEvents();
      window.addEventListener('beforeunload', onUnload, true);
      window.addEventListener('visibilitychange', onBlur, true);
    };

    if (triggerEvents) bindEvents();

    return () => {
      unbindEvents();
    };
  }, [finished, signerUsers, userInfo, t, importActions]);

  const handleFinishAction = async (rawCall) => {
    if (!handleFinish) return;

    const result = await handleFinish(rawCall);

    if (result instanceof Error) {
      setStoreEventError(result);
    }
  };

  const handleSetStep = async (step) => {
    if (!steps[step]) return;

    setTaskScreen(screens.EDIT);

    history.replace(getRootPath() + `/${steps[step]}`);
  };

  return (
    <>
      <PreviewScreenLayout
        task={task}
        template={template}
        storeEventError={storeEventError}
        busy={busy}
        setBusy={setBusy}
        handleFinish={handleFinishAction}
        backToEdit={backToEdit}
        pdfRequired={pdfRequired(template, task)}
        isUserUnitHead={isUserUnitHead}
        showSignerList={showSignerList}
        steps={steps}
        attachments={attachments}
        fileStorage={fileStorage}
        actions={actions}
        screens={screens}
        setTaskScreen={setTaskScreen}
        handleSetStep={handleSetStep}
      />
    </>
  );
};

PreviewScreen.propTypes = {
  backToEdit: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  setBusy: PropTypes.func.isRequired,
  userUnits: PropTypes.array.isRequired,
  userInfo: PropTypes.object.isRequired,
  handleFinish: PropTypes.func.isRequired,
  fileStorage: PropTypes.object
};

PreviewScreen.defaultProps = {
  fileStorage: {}
};

const mapStateToProps = ({ task: { documents }, files: { list }, auth: { userUnits, info } }) => ({
  userUnits,
  userInfo: info,
  documents,
  fileStorage: list
});

export default connect(mapStateToProps, null)(PreviewScreen);
