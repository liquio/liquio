import React from 'react';
import { connect } from 'react-redux';

import TaskPageRaw from 'modules/tasks/pages/Task';

const TaskPage = TaskPageRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface OnboardingTaskPageProps {
  onboardingTaskId: string;
  [key: string]: unknown;
}

const OnboardingTaskPage = ({ onboardingTaskId, ...props }: OnboardingTaskPageProps) => (
  <TaskPage {...props} isOnboarding={true} taskId={onboardingTaskId} rootPage="/tasks/onBoarding" />
);

interface ConnectedState {
  auth: { info: { onboardingTaskId: string } };
}

const mapStateToProps = ({
  auth: {
    info: { onboardingTaskId }
  }
}: ConnectedState) => ({ onboardingTaskId });

export default connect(mapStateToProps)(OnboardingTaskPage as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
