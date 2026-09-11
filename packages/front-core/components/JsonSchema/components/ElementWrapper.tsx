import { ReactNode } from 'react';

interface ElementWrapperProps {
  wrapperClass?: string | null;
  children: ReactNode;
}

const ElementWrapper = ({ wrapperClass, children }: ElementWrapperProps) => {
  if (!wrapperClass) {
    return children;
  }

  return <div className={wrapperClass}>{children}</div>;
};

ElementWrapper.defaultProps = {
  wrapperClass: null
};

export default ElementWrapper;
