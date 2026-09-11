import { connect } from 'react-redux';
import { ComponentType } from 'react';

export default (Component: ComponentType<Record<string, unknown>>) =>
  connect(({ auth: { info, ...rest } }: { auth: Record<string, unknown> & { info: unknown } }) => ({
    ...rest,
    userInfo: info,
  }))(Component as never);
