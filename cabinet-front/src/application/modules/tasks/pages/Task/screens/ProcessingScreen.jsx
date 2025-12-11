import React from 'react';
import { translate } from 'react-translate';
import { history } from 'store';

import sleep from 'helpers/sleep';
import Preloader from 'components/Preloader';

const INTERVAL = 5000;

const ProcessingScreen = ({
  t,
  taskId,
  screens,
  documentId,
  setTaskScreen,
  getPDFDocumentDecoded,
  setStartPDFGenerationTime,
  getRootPath
}) => {
  const update = React.useCallback(async () => {
    try {
      const result = await getPDFDocumentDecoded({ documentId });

      if (result instanceof Error) {
        setTaskScreen(screens.EDIT);
        return;
      }

      if (typeof result === 'string' && !(result instanceof Error)) {
        await setStartPDFGenerationTime(taskId, null);
        setTaskScreen(screens.PREVIEW);
        history.push(getRootPath());
        return;
      }

      await sleep(INTERVAL);
      update();
    } catch (e) {
      setTaskScreen(screens.EDIT);
    }
  }, [
    documentId,
    getPDFDocumentDecoded,
    screens.PREVIEW,
    screens.EDIT,
    setStartPDFGenerationTime,
    setTaskScreen,
    taskId,
    getRootPath
  ]);

  React.useEffect(() => {
    update();
  }, [update]);

  return <Preloader flex={true} label={t('LongPDFFileGenetares')} />;
};

export default translate('TaskPage')(ProcessingScreen);
