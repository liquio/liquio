import React from 'react';
import PropTypes from 'prop-types';

import DueDate from 'modules/tasks/pages/Task/components/DueDate';
import HeaderInfo from 'modules/tasks/pages/Task/components/HeaderInfo';
import SignerList from 'modules/tasks/pages/Task/components/SignerList';
import TaskAssign from 'modules/tasks/pages/Task/components/TaskAssign';

const TaskDetails = ({ task, template, showSignerList }) => (
  <HeaderInfo task={task} template={template}>
    <DueDate task={task} template={template} />
    {showSignerList ? <SignerList task={task} /> : null}
    <TaskAssign task={task} template={template} />
  </HeaderInfo>
);

TaskDetails.propTypes = {
  task: PropTypes.object.isRequired,
  template: PropTypes.object.isRequired,
  showSignerList: PropTypes.bool.isRequired
};

export default TaskDetails;
