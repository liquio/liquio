import React from 'react';

import setComponentsId from 'helpers/setComponentsId';

interface CustomInputWrapperProps {
  children?: React.ReactNode;
  setId?: (elementName: string) => string;
}

interface CustomInputWrapperState {
  editMode: boolean;
}

export default class CustomInputWrapper extends React.Component<
  CustomInputWrapperProps,
  CustomInputWrapperState
> {
  static defaultProps: Partial<CustomInputWrapperProps> = {
    children: <div />,
    setId: setComponentsId('custom-input-wrap')
  };

  state: CustomInputWrapperState = { editMode: false };

  render() {
    const { editMode } = this.state;
    if (!editMode) {
      return <h4 {...(this.props as unknown as Record<string, unknown>)}>test</h4>;
    }
    return this.props.children;
  }
}
