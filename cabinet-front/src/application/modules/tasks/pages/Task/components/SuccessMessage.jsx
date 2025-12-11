import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { history } from 'store';
import { requestNextTask } from 'application/actions/task';
import Preloader from 'components/Preloader';
import SuccessMessageLayout from 'modules/tasks/pages/Task/components/SuccessMessageLayout';
import evaluate from 'helpers/evaluate';

const LOAD_NEXT_TASK_INTERVAL = 1000;

const SuccessMessage = ({
  actions,
  taskId,
  finalScreen,
  rootPath,
  forceRedirect,
  doNotLoadNextTask,
  task,
  showNextTaskButton
}) => {
  const [iteration, setIteration] = React.useState(1);
  const [nextTasks, setNextTasks] = React.useState(null);
  const [timer, setTimer] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const isRedirecting = () => {
      if (!forceRedirect) return false;

      if (typeof forceRedirect === 'string') {
        const redirecting = evaluate(forceRedirect, task?.document?.data);

        if (redirecting instanceof Error) return false;

        return redirecting;
      }

      return forceRedirect;
    };

    const loadNextTask = async () => {
      setLoading(true);

      const tasks = await actions.requestNextTask(taskId);

      setLoading(false);

      if (tasks && tasks.length) {
        const redirecting = isRedirecting();

        if (redirecting) {
          history.replace(`${rootPath}/${tasks[0].id}`);
          return;
        }

        setNextTasks(tasks);
        return;
      }

      if (iteration === 10) {
        return;
      }

      setIteration(iteration + 1);
    };

    if (!doNotLoadNextTask) {
      setTimeout(loadNextTask, LOAD_NEXT_TASK_INTERVAL * iteration);
    }
  }, [actions, doNotLoadNextTask, forceRedirect, iteration, rootPath, taskId, task]);

  React.useEffect(() => {
    const timerListener = setTimeout(() => {
      setTimer(timer + 1);
    }, 1000);

    if (timer > 5) clearTimeout(timerListener);

    return () => clearTimeout(timerListener);
  });

  if (timer < 5 && forceRedirect && !finalScreen) {
    return <Preloader flex={true} />;
  }

  return (
    <SuccessMessageLayout
      loading={loading}
      rootPath={rootPath}
      nextTasks={nextTasks}
      finalScreen={finalScreen}
      task={task}
      showNextTaskButton={showNextTaskButton}
    />
  );
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestNextTask: bindActionCreators(requestNextTask, dispatch)
  }
});

const translated = translate('TaskPage')(SuccessMessage);
export default connect(null, mapDispatchToProps)(translated);
