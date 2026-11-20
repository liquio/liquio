import { ReactNode } from 'react';

interface ElementWrapperProps {
  wrapperClass?: string | null;
  children: ReactNode;
}

const ElementWrapper = ({ wrapperClass = null, children }: ElementWrapperProps) => {
  if (!wrapperClass) {
    return children;
  }

  return <div className={wrapperClass}>{children}</div>;
};

export default ElementWrapper;
