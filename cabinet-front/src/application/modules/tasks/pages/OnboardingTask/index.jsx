import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import TaskPage from 'modules/tasks/pages/Task';

const OnboardingTaskPage = ({ onboardingTaskId, ...props }) => (
  <TaskPage {...props} isOnboarding={true} taskId={onboardingTaskId} rootPage="/tasks/onBoarding" />
);

OnboardingTaskPage.propTypes = {
  onboardingTaskId: PropTypes.string.isRequired
};

const mapStateToProps = ({
  auth: {
    info: { onboardingTaskId }
  }
}) => ({ onboardingTaskId });

export default connect(mapStateToProps)(OnboardingTaskPage);
