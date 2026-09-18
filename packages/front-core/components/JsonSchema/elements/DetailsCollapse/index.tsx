import React from 'react';
import { translate, Translate } from 'react-translate';
import objectPath from 'object-path';
import Details from './components/Details';
import Accordion from './components/Accordion';

interface DetailsCollapseProps {
  t: Translate;
  htmlBlock?: string;
  params?: Record<string, unknown> | null;
  hidden?: boolean;
  rootDocument: { data: Record<string, unknown> };
  collapseText?: string | null;
  openText?: string | null;
  dataMapping: string;
  dataPath?: string | false;
  parentValue?: Record<string, unknown>;
  useParentData?: boolean;
  stepName?: string;
  pure?: boolean;
  accordion?: boolean;
  fullWidth?: boolean;
}

const DetailsCollapse = ({
  htmlBlock = '',
  params = null,
  hidden = false,
  rootDocument,
  collapseText = null,
  openText = null,
  dataMapping,
  dataPath = false,
  parentValue = {},
  useParentData = false,
  stepName = '',
  pure = false,
  accordion = false,
  fullWidth = false,
}: DetailsCollapseProps) => {
  if (hidden) return null;

  if (dataPath) {
    const getDataPath = objectPath.get(rootDocument.data, dataPath) as Array<Record<string, unknown> & { id?: string | number }>;

    if (!getDataPath) return null;

    return (
      <>
        {getDataPath.map((option) => (
          <Accordion
            key={option?.id}
            option={option}
            useParentData={useParentData}
            htmlBlock={htmlBlock}
            params={params}
            parentValue={parentValue}
            rootDocument={rootDocument}
            dataMapping={dataMapping}
            stepName={stepName}
            pure={pure}
            openText={openText}
            fullWidth={fullWidth}
          />
        ))}
      </>
    );
  }

  if (accordion) {
    return (
      <Accordion
        useParentData={useParentData}
        htmlBlock={htmlBlock}
        params={params}
        parentValue={parentValue}
        rootDocument={rootDocument}
        dataMapping={dataMapping}
        stepName={stepName}
        pure={pure}
        openText={openText}
        fullWidth={fullWidth}
      />
    );
  }

  return (
    <Details
      useParentData={useParentData}
      htmlBlock={htmlBlock}
      params={params}
      parentValue={parentValue}
      rootDocument={rootDocument}
      dataMapping={dataMapping}
      stepName={stepName}
      pure={pure}
      collapseText={collapseText}
      openText={openText}
    />
  );
};

export default translate('Elements')(DetailsCollapse);
