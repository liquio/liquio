import type { ReactNode } from 'react';
import { withVirtualization } from 'components/Virtualized';

interface VirtualizedDataProps {
  rowRenderer: (row: unknown, index: number) => ReactNode;
  slicedData: unknown[];
  startIndex: number;
}

const VirtualizedData = ({ rowRenderer, slicedData, startIndex }: VirtualizedDataProps) => {
  return slicedData.map((row, i) => rowRenderer(row, startIndex + i));
};

export default withVirtualization(VirtualizedData as never);
